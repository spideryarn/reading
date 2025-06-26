import { test, expect } from '@playwright/test'

test.describe('Tool Keyboard Shortcuts Testing', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the public document
    await page.goto('http://localhost:3004/read/public-document-1750612994147-gqy7vv')
    await page.waitForLoadState('networkidle')
  })

  test('should test all tool keyboard shortcuts', async ({ page }) => {
    console.log('Testing keyboard shortcuts for all tools...')
    
    // Test Cmd+1 - Original ToC
    console.log('Testing Cmd+1 for Original ToC...')
    await page.keyboard.press('Meta+1')
    await page.waitForTimeout(500)
    let currentUrl = page.url()
    console.log('After Cmd+1:', currentUrl)
    expect(currentUrl).toMatch(/tab=original/)
    
    // Test Cmd+2 - AI ToC  
    console.log('Testing Cmd+2 for AI ToC...')
    await page.keyboard.press('Meta+2')
    await page.waitForTimeout(500)
    currentUrl = page.url()
    console.log('After Cmd+2:', currentUrl)
    expect(currentUrl).toMatch(/tab=ai-generated/)
    
    // Test Cmd+3 - Summary
    console.log('Testing Cmd+3 for Summary...')
    await page.keyboard.press('Meta+3')
    await page.waitForTimeout(500)
    currentUrl = page.url()
    console.log('After Cmd+3:', currentUrl)
    expect(currentUrl).toMatch(/tab=summary/)
    
    // Test Cmd+4 - Chat
    console.log('Testing Cmd+4 for Chat...')
    await page.keyboard.press('Meta+4')
    await page.waitForTimeout(500)
    currentUrl = page.url()
    console.log('After Cmd+4:', currentUrl)
    expect(currentUrl).toMatch(/tab=chat/)
    
    // Test Cmd+5 - Glossary
    console.log('Testing Cmd+5 for Glossary...')
    await page.keyboard.press('Meta+5')
    await page.waitForTimeout(500)
    currentUrl = page.url()
    console.log('After Cmd+5:', currentUrl)
    expect(currentUrl).toMatch(/tab=glossary/)
    
    // Test Cmd+F - Search
    console.log('Testing Cmd+F for Search...')
    await page.keyboard.press('Meta+f')
    await page.waitForTimeout(500)
    currentUrl = page.url()
    console.log('After Cmd+F:', currentUrl)
    expect(currentUrl).toMatch(/tab=search/)
    
    // Test Cmd+H - Highlights
    console.log('Testing Cmd+H for Highlights...')
    await page.keyboard.press('Meta+h')
    await page.waitForTimeout(500)
    currentUrl = page.url()
    console.log('After Cmd+H:', currentUrl)
    expect(currentUrl).toMatch(/tab=highlights/)
    
    // Test Cmd+I - Metadata
    console.log('Testing Cmd+I for Metadata...')
    await page.keyboard.press('Meta+i')
    await page.waitForTimeout(500)
    currentUrl = page.url()
    console.log('After Cmd+I:', currentUrl)
    expect(currentUrl).toMatch(/tab=metadata/)
  })

  test('should verify tab navigation uses navigateToTab correctly', async ({ page }) => {
    console.log('Testing tab navigation behavior...')
    
    // Start with original tab
    await page.keyboard.press('Meta+1')
    await page.waitForTimeout(500)
    let tabIndicator = await page.locator('[role="tab"][aria-selected="true"]').textContent()
    console.log('Active tab after Cmd+1:', tabIndicator)
    
    // Switch to different tab
    await page.keyboard.press('Meta+3')
    await page.waitForTimeout(500)
    tabIndicator = await page.locator('[role="tab"][aria-selected="true"]').textContent()
    console.log('Active tab after Cmd+3:', tabIndicator)
    
    // Verify URL has correct tab parameter
    expect(page.url()).toMatch(/tab=summary/)
  })

  test('should test conditional visibility for document-required tools', async ({ page }) => {
    console.log('Testing conditional visibility...')
    
    // On document page, all tools should work
    await page.keyboard.press('Meta+5')
    await page.waitForTimeout(500)
    expect(page.url()).toMatch(/tab=glossary/)
    
    // Navigate to documents list (no document context)
    await page.goto('http://localhost:3004/read')
    await page.waitForTimeout(1000)
    
    // Try document-requiring shortcuts - they should either not work or fallback gracefully
    await page.keyboard.press('Meta+5')
    await page.waitForTimeout(500)
    
    // Should stay on documents list page (or handle gracefully)
    const currentUrl = page.url()
    console.log('After Cmd+5 on documents list:', currentUrl)
    
    // Test non-document shortcuts should still work
    await page.keyboard.press('Meta+k') // Command palette
    await page.waitForTimeout(500)
    
    // Command palette should be visible
    await expect(page.locator('role=dialog')).toBeVisible()
  })
})