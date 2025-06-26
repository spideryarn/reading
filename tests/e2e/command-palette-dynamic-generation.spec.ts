import { test, expect } from '@playwright/test'

test.describe('Command Palette Dynamic Generation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a working public document for tool context
    await page.goto('/read/test-document-ai-features')
    
    // Wait for document to load
    await expect(page.locator('h1')).toBeVisible({ timeout: 30000 })
  })

  test('should open command palette with Ctrl+K and show dynamically generated tool commands', async ({ page }) => {
    // Initially, command palette dialog should not be visible
    await expect(page.locator('[role="dialog"]')).not.toBeVisible()
    
    // Open command palette with Ctrl+K
    await page.keyboard.press('Control+k')
    
    // Command palette dialog should be visible
    await expect(page.locator('[role="dialog"]')).toBeVisible()
    
    // Should show command input
    await expect(page.locator('[data-slot="command-input"]')).toBeVisible()
    
    // Should show placeholder text
    await expect(page.locator('[data-slot="command-input"]')).toHaveAttribute('placeholder', 'Type a command or search...')
    
    // Should show tool commands from registry (verify at least a few key tools)
    await expect(page.locator('text=Original')).toBeVisible()
    await expect(page.locator('text=Summary')).toBeVisible()
    await expect(page.locator('text=Glossary')).toBeVisible()
    await expect(page.locator('text=AI Chatbot')).toBeVisible()
    
    // Should show keyboard shortcuts for tool commands (Ctrl on headless Linux)
    await expect(page.locator('text=Ctrl+1')).toBeVisible()
    await expect(page.locator('text=Ctrl+3')).toBeVisible()
    await expect(page.locator('text=Ctrl+5')).toBeVisible()
    await expect(page.locator('text=Ctrl+6')).toBeVisible()
  })

  test('should execute tool commands via keyboard shortcuts', async ({ page }) => {
    // Test Ctrl+5 for Glossary (should navigate to glossary tab)
    await page.keyboard.press('Control+5')
    
    // Should navigate to glossary tab
    await expect(page).toHaveURL(/.*tab=glossary.*/)
    
    // Test Ctrl+3 for Summary (should navigate to summary tab)
    await page.keyboard.press('Control+3')
    
    // Should navigate to summary tab
    await expect(page).toHaveURL(/.*tab=summary.*/)
    
    // Test Ctrl+1 for Original (should navigate to original tab)
    await page.keyboard.press('Control+1')
    
    // Should navigate to original tab (or remove tab parameter)
    await expect(page).toHaveURL(/^(?!.*tab=).*$/)
  })

  test('should execute tool commands via command palette search and click', async ({ page }) => {
    // Open command palette
    await page.keyboard.press('Control+k')
    await expect(page.locator('[role="dialog"]')).toBeVisible()
    
    // Search for "glossary"
    await page.fill('[data-slot="command-input"]', 'glossary')
    
    // Should show filtered results
    await expect(page.locator('text=Glossary')).toBeVisible()
    
    // Click on glossary command
    await page.click('text=Glossary')
    
    // Should navigate to glossary tab and close dialog
    await expect(page).toHaveURL(/.*tab=glossary.*/)
    await expect(page.locator('[role="dialog"]')).not.toBeVisible()
  })

  test('should support fuzzy search for tool commands', async ({ page }) => {
    // Open command palette
    await page.keyboard.press('Control+k')
    await expect(page.locator('[role="dialog"]')).toBeVisible()
    
    // Test fuzzy search with partial match "gloss"
    await page.fill('[data-slot="command-input"]', 'gloss')
    
    // Should match "Glossary"
    await expect(page.locator('text=Glossary')).toBeVisible()
    
    // Clear and test another fuzzy search "summ"
    await page.fill('[data-slot="command-input"]', 'summ')
    
    // Should match "Summary"
    await expect(page.locator('text=Summary')).toBeVisible()
    
    // Clear and test search for "chat"
    await page.fill('[data-slot="command-input"]', 'chat')
    
    // Should match "AI Chatbot"
    await expect(page.locator('text=AI Chatbot')).toBeVisible()
  })

  test('should show correct command categories and ordering', async ({ page }) => {
    // Open command palette
    await page.keyboard.press('Control+k')
    await expect(page.locator('[role="dialog"]')).toBeVisible()
    
    // Should show Navigation category first (highest priority from tool registry)
    const categoryHeadings = page.locator('[cmdk-group-heading]')
    await expect(categoryHeadings.first()).toHaveText('Navigation')
    
    // Should show other categories in priority order
    await expect(page.locator('text=App Navigation')).toBeVisible()
    await expect(page.locator('text=Account')).toBeVisible()
  })

  test('should handle conditional command availability correctly', async ({ page }) => {
    // First, test with document context (tools should be available)
    await page.keyboard.press('Control+k')
    await expect(page.locator('[role="dialog"]')).toBeVisible()
    
    // All tools should be visible when document is present
    await expect(page.locator('text=Original')).toBeVisible()
    await expect(page.locator('text=Summary')).toBeVisible()
    await expect(page.locator('text=Glossary')).toBeVisible()
    
    // Close command palette
    await page.keyboard.press('Escape')
    
    // Navigate to home page (no document context)
    await page.goto('/')
    
    // Open command palette again
    await page.keyboard.press('Control+k')
    await expect(page.locator('[role="dialog"]')).toBeVisible()
    
    // Document-requiring tools should not be present or should be disabled
    // (This tests the requiresDocument conditional logic)
    const documentCommands = page.locator('text=Original')
    await expect(documentCommands).not.toBeVisible()
  })

  test('should close command palette with escape key', async ({ page }) => {
    // Open command palette
    await page.keyboard.press('Control+k')
    await expect(page.locator('[role="dialog"]')).toBeVisible()
    
    // Close with escape
    await page.keyboard.press('Escape')
    await expect(page.locator('[role="dialog"]')).not.toBeVisible()
  })

  test('should handle platform-specific shortcuts correctly', async ({ page }) => {
    // This test verifies that the shortcut transformation works correctly
    // On Mac, Cmd+K should work; on other platforms, Ctrl+K should work
    
    // Test opening command palette (should work regardless of platform)
    await page.keyboard.press('Control+k')
    await expect(page.locator('[role="dialog"]')).toBeVisible()
    
    // Verify that shortcuts are displayed correctly for the platform
    // In headless mode, this typically shows Ctrl shortcuts
    const shortcuts = page.locator('kbd')
    const firstShortcut = shortcuts.first()
    
    // Should show appropriate shortcut format (Ctrl+ or ⌘+)
    await expect(firstShortcut).toBeVisible()
  })

  test('should maintain non-tool commands alongside dynamic tool commands', async ({ page }) => {
    // Open command palette
    await page.keyboard.press('Control+k')
    await expect(page.locator('[role="dialog"]')).toBeVisible()
    
    // Should show non-tool commands from static definition
    await expect(page.locator('text=Documents List')).toBeVisible()
    await expect(page.locator('text=Upload Document')).toBeVisible()
    await expect(page.locator('text=Models')).toBeVisible()
    
    // Should also show dynamic tool commands
    await expect(page.locator('text=Original')).toBeVisible()
    await expect(page.locator('text=Summary')).toBeVisible()
    await expect(page.locator('text=Glossary')).toBeVisible()
    
    // Verify that both types work together without conflicts
    await page.fill('[data-slot="command-input"]', 'doc')
    
    // Should match both "Documents List" and potentially document tools
    await expect(page.locator('text=Documents List')).toBeVisible()
  })
})