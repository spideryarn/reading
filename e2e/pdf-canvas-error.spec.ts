import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs/promises'

/**
 * E2E test to capture and verify the NODE_MODULE_VERSION error
 * when attempting to upload PDFs with the current canvas-based implementation
 */

// Use authentication from storage state
test.use({ storageState: 'e2e/.auth/user.json' })

test.describe('PDF Canvas Module Error Reproduction', () => {
  test('should capture NODE_MODULE_VERSION error when uploading PDF', async ({ page, request }) => {
    // Navigate to upload page
    await page.goto('/upload')
    
    // Wait for page to load
    await expect(page.getByRole('heading', { name: /upload/i })).toBeVisible()
    
    // Prepare test PDF
    const testPdfPath = path.join(process.cwd(), 'test-fixtures', 'simple-pdf-one-page.pdf')
    let pdfBuffer: Buffer
    
    try {
      pdfBuffer = await fs.readFile(testPdfPath)
    } catch (error) {
      console.error('Test PDF not found. Creating a minimal PDF for testing...')
      // Skip if test PDF doesn't exist - we'll use the API endpoint directly
      test.skip()
      return
    }
    
    // Test via API endpoint directly for more control
    console.log('Testing PDF upload via API endpoint...')
    
    const response = await request.post('/api/upload-pdf', {
      multipart: {
        file: {
          name: 'test-canvas-error.pdf',
          mimeType: 'application/pdf',
          buffer: pdfBuffer
        },
        processingMode: 'ai_mistral_ocr'
      }
    })
    
    // Expect the request to fail with 500 error
    expect(response.status()).toBe(500)
    
    // Get error response
    const errorBody = await response.json()
    console.log('Error response:', JSON.stringify(errorBody, null, 2))
    
    // Verify it's the NODE_MODULE_VERSION error
    expect(errorBody).toHaveProperty('type')
    expect(errorBody).toHaveProperty('detail')
    
    // Check for specific error indicators
    const errorDetail = errorBody.detail || ''
    const isNodeModuleError = errorDetail.includes('NODE_MODULE_VERSION') || 
                              errorDetail.includes('canvas.node') ||
                              errorDetail.includes('createCanvas is not a function')
    
    expect(isNodeModuleError).toBe(true)
    
    // Extract version mismatch details if present
    if (errorDetail.includes('NODE_MODULE_VERSION')) {
      const versionMatch = errorDetail.match(/NODE_MODULE_VERSION (\d+).*NODE_MODULE_VERSION (\d+)/)
      if (versionMatch) {
        console.log(`Canvas module version mismatch detected:`)
        console.log(`  Compiled for: NODE_MODULE_VERSION ${versionMatch[1]}`)
        console.log(`  Runtime needs: NODE_MODULE_VERSION ${versionMatch[2]}`)
      }
    }
    
    // Also check console errors on the page
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })
    
    // Try upload through UI as well
    await page.getByLabel(/choose file|select file|upload/i).setInputFiles(testPdfPath)
    
    // Select AI processing mode
    const aiRadio = page.getByRole('radio', { name: /ai transcription/i })
    if (await aiRadio.isVisible()) {
      await aiRadio.click()
    }
    
    // Click upload button
    await page.getByRole('button', { name: /upload/i }).click()
    
    // Wait for error to appear
    await page.waitForTimeout(3000) // Give time for error to surface
    
    // Check for error messages in UI
    const errorAlert = page.getByRole('alert').or(page.getByText(/error/i))
    if (await errorAlert.isVisible()) {
      const errorText = await errorAlert.textContent()
      console.log('UI Error:', errorText)
    }
    
    // Log any console errors
    if (consoleErrors.length > 0) {
      console.log('Console errors detected:')
      consoleErrors.forEach(err => console.log(' -', err))
    }
  })
  
  test('should verify test-canvas API endpoint reports error correctly', async ({ request }) => {
    // Test the dedicated canvas test endpoint
    const response = await request.get('/api/test-canvas')
    
    expect(response.ok()).toBe(true)
    const result = await response.json()
    
    console.log('Canvas test endpoint result:', JSON.stringify(result, null, 2))
    
    // Verify native module errors are detected
    expect(result).toHaveProperty('napiCanvas')
    expect(result).toHaveProperty('regularCanvas')
    expect(result).toHaveProperty('fallbackPattern')
    
    // At least one should fail with NODE_MODULE_VERSION error
    const hasNodeModuleError = 
      (result.napiCanvas?.error?.includes('NODE_MODULE_VERSION') ?? false) ||
      (result.regularCanvas?.error?.includes('NODE_MODULE_VERSION') ?? false) ||
      (result.fallbackPattern?.error?.includes('NODE_MODULE_VERSION') ?? false)
    
    expect(hasNodeModuleError).toBe(true)
    
    // Log specific failures
    if (!result.napiCanvas?.success) {
      console.log('@napi-rs/canvas error:', result.napiCanvas?.error)
    }
    if (!result.regularCanvas?.success) {
      console.log('canvas error:', result.regularCanvas?.error)
    }
    if (!result.fallbackPattern?.success) {
      console.log('Fallback pattern error:', result.fallbackPattern?.error)
    }
  })
})