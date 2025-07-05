import { test, expect, useAuthentication } from './helpers/test-base'

// Enable authentication for all tests in this file
useAuthentication()

test.describe('Command Palette Basic Debug', () => {
  test('should check basic command palette functionality', async ({ page }) => {
    // Navigate to document page
    await page.goto('/read/test-document-ai-features')
    
    // Wait for document to load
    await expect(page.locator('h1')).toBeVisible({ timeout: 30000 })
    
    // Check console for any command palette related errors
    const consoleLogs: string[] = []
    page.on('console', msg => {
      if (msg.text().includes('Command Palette') || msg.text().includes('tool') || msg.text().includes('registry')) {
        consoleLogs.push(`${msg.type()}: ${msg.text()}`)
      }
    })
    
    // Try to open command palette
    await page.keyboard.press('Control+k')
    
    // Wait a moment for any console logs
    await page.waitForTimeout(1000)
    
    // Check if command dialog appears
    const dialog = page.locator('[role="dialog"]')
    const isDialogVisible = await dialog.isVisible()
    
    // Log results
    console.log('Dialog visible:', isDialogVisible)
    console.log('Console logs:', consoleLogs)
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'command-palette-debug.png' })
    
    // Basic assertion - at least the dialog should appear
    await expect(dialog).toBeVisible()
  })
  
  test('should check tool registry in browser console', async ({ page }) => {
    // Navigate to document page
    await page.goto('/read/test-document-ai-features')
    
    // Wait for page to load
    await expect(page.locator('h1')).toBeVisible({ timeout: 30000 })
    
    // Execute JavaScript to check tool registry
    const registryInfo = await page.evaluate(async () => {
      try {
        // Try to access the tool registry
        const { getAllTools } = await import('/lib/tools/registry.js')
        const tools = getAllTools()
        return {
          success: true,
          toolCount: tools.length,
          toolIds: tools.map(t => t.id),
          error: null
        }
      } catch (error) {
        return {
          success: false,
          toolCount: 0,
          toolIds: [],
          error: error.message
        }
      }
    })
    
    console.log('Registry info:', registryInfo)
    
    // Also check command generation
    const commandInfo = await page.evaluate(async () => {
      try {
        const { getAllTools } = await import('/lib/tools/registry.js')
        const { generateCommandsFromRegistry } = await import('/lib/tools/command-generation.js')
        
        const tools = getAllTools()
        const commands = generateCommandsFromRegistry(tools, {
          getNavigateToTab: () => () => console.log('navigate'),
          getCurrentDocument: () => ({ id: 'test-doc' }),
          isMac: false,
        })
        
        return {
          success: true,
          toolCount: tools.length,
          commandCount: commands.length,
          commandIds: commands.map(c => c.id),
          error: null
        }
      } catch (error) {
        return {
          success: false,
          toolCount: 0,
          commandCount: 0,
          commandIds: [],
          error: error.message
        }
      }
    })
    
    console.log('Command generation info:', commandInfo)
    
    // Verify we can access the registry
    expect(registryInfo.success).toBe(true)
    expect(registryInfo.toolCount).toBeGreaterThan(0)
  })
})