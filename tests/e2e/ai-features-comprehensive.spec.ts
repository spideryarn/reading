import { test, expect, testHelpers, useAuthentication } from './helpers/test-base'

// Enable shared authentication for all tests in this file
useAuthentication()

/**
 * AI Features Comprehensive E2E Test
 *
 * This single spec replaces:
 *   • ai-headings-persistence-refresh.spec.ts
 *   • ai-glossary-comprehensive.spec.ts
 *   • ai-tweet-thread-generation.spec.ts
 *   • glossary-reset-highlight-removal.spec.ts
 *   • (smaller AI-feature micro-tests)
 *
 * Workflow covered:
 * 1. Upload an HTML document with rich content
 * 2. Generate improved headings and verify persistence across refresh
 * 3. Generate glossary entities (with Load-More) and verify deduplication
 * 4. Generate a summary and ensure it appears in the Summary tool
 * 5. Generate a tweet thread and verify correct number of tweets
 *
 * Running this flow exercises the four major AI helpers in realistic order on
 * **one** document, providing broad coverage while avoiding redundant login and
 * upload steps that previously existed in separate specs.
 */

test.describe('AI Features – Headings, Glossary, Summary & Tweet Thread', () => {
  test('complete AI features workflow on a single document', async ({ page }, testInfo) => {
    const workerIndex = testInfo.workerIndex
    // -----------------------------------------------------------------------
    // Phase 1: Document Creation
    // -----------------------------------------------------------------------
    const { documentId, url: documentUrl } = await testHelpers.createTestDocument(page, {
      workerIndex,
      useRichContent: true
    })
    console.log(`📄 Working with document ${documentId}`)

    // Ensure page stable before moving to tools
    await testHelpers.waitForPageStability(page)

    // -----------------------------------------------------------------------
    // Phase 2: Headings – generate and verify persistence
    // -----------------------------------------------------------------------
    await testHelpers.navigateToTab(page, 'Structure')

    const generateHeadingsButton = page.locator('button:has-text("Improve headings")').first()
    const aiEnhancedBadge = page.locator('span:text("AI-enhanced")').first()

    if (await generateHeadingsButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('🔄 Generating AI headings...')
      await generateHeadingsButton.click()
      await expect(aiEnhancedBadge).toBeVisible({ timeout: 180_000 })
    }

    // Capture headings after enhancement
    const enhancedHeadings = await testHelpers.getDocumentHeadings(page)
    console.log(`✅ Headings generated (${enhancedHeadings.length})`)

    // Reload to confirm persistence
    await page.reload()
    await testHelpers.waitForPageStability(page)
    await expect(page).toHaveURL(documentUrl)
    const refreshedHeadings = await testHelpers.getDocumentHeadings(page)
    expect(refreshedHeadings).toEqual(enhancedHeadings)
    console.log('✅ Headings persisted after refresh')

    // -----------------------------------------------------------------------
    // Phase 3: Glossary – generate, load-more, dedupe
    // -----------------------------------------------------------------------
    await testHelpers.navigateToTab(page, 'Glossary')

    const generateGlossaryBtn = page.locator('button:has-text("Generate Glossary")').first()
    await expect(generateGlossaryBtn).toBeVisible()
    console.log('🔄 Generating glossary...')

    await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/tools/glossary') && r.status() === 200, { timeout: 90_000 }),
      generateGlossaryBtn.click()
    ])

    const glossaryEntities = page.locator('[data-testid="glossary-entity"]')
    // Wait for at least one entity to appear
    await glossaryEntities.first().waitFor({ state: 'visible', timeout: 30_000 })
    const initialCount = await glossaryEntities.count()
    expect(initialCount).toBeGreaterThan(0)
    console.log(`✅ Glossary generated with ${initialCount} entities`)

    // Trigger load-more if available
    const loadMore = page.locator('button:has-text("Load More")').first()
    if (await loadMore.isVisible().catch(() => false)) {
      await Promise.all([
        page.waitForResponse(r => r.url().includes('/api/tools/glossary') && r.status() === 200, { timeout: 90_000 }),
        loadMore.click()
      ])
    }

    const entitiesText = await page.locator('[data-testid="entity-name"]').allTextContents()
    expect(new Set(entitiesText).size).toBe(entitiesText.length) // no dups
    console.log(`✅ Glossary deduplicated (${entitiesText.length} total entities)`)  

    // -----------------------------------------------------------------------
    // Phase 4: Summary – generate and verify text
    // -----------------------------------------------------------------------
    await testHelpers.navigateToTab(page, 'Summaries')

    const generateSummaryBtn = page.locator('button:has-text("Generate Summary")').first()
    if (await generateSummaryBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await Promise.all([
        page.waitForResponse(r => r.url().includes('/api/tools/summarise') && r.status() === 200, { timeout: 120_000 }),
        generateSummaryBtn.click()
      ])
    }

    const summaryText = page.locator('[data-testid="summary-text"]')
    await expect(summaryText).toBeVisible({ timeout: 60_000 })
    const summary = await summaryText.textContent()
    expect(summary?.trim().length).toBeGreaterThan(50)
    console.log('✅ Summary generated')

    // -----------------------------------------------------------------------
    // Phase 5: Tweet Thread – generate and verify tweet count
    // -----------------------------------------------------------------------
    await testHelpers.navigateToTab(page, 'Tweet Thread')

    const generateThreadBtn = page.locator('button:has-text("Generate Tweet Thread")').first()
    await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/tools/tweet-thread') && r.status() === 200, { timeout: 120_000 }),
      generateThreadBtn.click()
    ])

    const tweets = page.locator('[data-testid="tweet-item"]')
    await tweets.first().waitFor({ state: 'visible', timeout: 60_000 })
    const tweetCount = await tweets.count()
    expect(tweetCount).toBeGreaterThan(3)
    console.log(`✅ Tweet thread generated with ${tweetCount} tweets`)
  })
}) 