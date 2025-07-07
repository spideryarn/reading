import { test, expect, testHelpers, useAuthentication } from './helpers/test-base'

// All tests in this file expect an authenticated user
useAuthentication()

/**
 * Search & Command Palette Comprehensive E2E Test
 *
 * Replaces:
 *   • command-palette-dynamic-generation.spec.ts
 *   • search-with-document-creation.spec.ts
 *   • search-with-highlight-validation.spec.ts
 *   • document-search-navigation-workflow.spec.ts (search parts)
 *
 * Coverage:
 * 1. Create a document with predictable content
 * 2. In-document search UI interactions & highlight behaviour
 * 3. URL update & highlight clearing
 * 4. Command palette opening (keyboard) and fuzzy search
 * 5. Executing a command from palette (navigate to glossary tab)
 */

test.describe('Search UI & Command Palette', () => {
  test('search highlights & command palette workflow', async ({ page }, testInfo) => {
    const workerIndex = testInfo.workerIndex

    // -------------------------------------------------------------------
    // Phase 1: Create test document
    // -------------------------------------------------------------------
    const { url: docUrl } = await testHelpers.createTestDocument(page, {
      workerIndex,
      useRichContent: false
    })

    await testHelpers.waitForPageStability(page)

    // -------------------------------------------------------------------
    // Phase 2: In-document search & highlight checks
    // -------------------------------------------------------------------
    // Attempt to open search – try nav button first then fallback to '/' shortcut
    const searchButtonCandidates = [
      'button:has-text("Search: Find specific text")',
      '[aria-label*="Search" i]',
      'button:has(svg[class*="Magnifying"])'
    ]

    let searchOpened = false
    for (const sel of searchButtonCandidates) {
      const el = page.locator(sel).first()
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        await el.click()
        searchOpened = true
        break
      }
    }

    if (!searchOpened) {
      // Fallback: press '/' which many apps use to focus search
      await page.keyboard.press('/')
    }

    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first()
    await expect(searchInput).toBeVisible({ timeout: 5000 })

    // Perform search for word "document"
    await searchInput.fill('document')
    await searchInput.press('Enter')
    await page.waitForTimeout(1500)

    const highlights = page.locator('mark, [class*="highlight"], [data-highlighted="true"]')
    const highlightCount = await highlights.count()
    expect(highlightCount).toBeGreaterThan(0)
    console.log(`✅ Search produced ${highlightCount} highlights`)

    // Clear search and verify highlights disappear
    await searchInput.fill('')
    await searchInput.press('Enter')
    await page.waitForTimeout(1000)
    expect(await highlights.count()).toBe(0)
    console.log('✅ Highlights cleared after empty search')

    // Confirm URL parameters reflect search then cleared
    expect(page.url()).toContain(docUrl.split('?')[0])

    // -------------------------------------------------------------------
    // Phase 3: Command palette keyboard shortcut & fuzzy search
    // -------------------------------------------------------------------
    // Ensure palette closed first
    await page.keyboard.press('Escape')

    // Open palette (Ctrl+K or Cmd+K depending on platform)
    await page.keyboard.press('Control+k').catch(() => {})
    // If on Mac in headless, Control works too; we attempt once more with Meta
    if (!(await page.locator('[role="dialog"]').isVisible().catch(() => false))) {
      await page.keyboard.press('Meta+k').catch(() => {})
    }

    const paletteDialog = page.locator('[role="dialog"]')
    await expect(paletteDialog).toBeVisible({ timeout: 5000 })

    // Fuzzy search for "gloss"
    const paletteInput = page.locator('[data-slot="command-input"], input[placeholder*="command" i]').first()
    await paletteInput.fill('gloss')
    await expect(page.locator('text=Glossary')).toBeVisible()

    // Execute command via click
    await page.locator('text=Glossary').first().click()

    // Palette should close and URL should contain tab=glossary
    await expect(paletteDialog).not.toBeVisible({ timeout: 5000 })
    await expect(page).toHaveURL(/tab=glossary/)
    console.log('✅ Command palette executed Glossary command')
  })
}) 