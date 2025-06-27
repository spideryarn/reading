/**
 * Tests for PDF pipeline example
 * 
 * These tests verify the pipeline integration example works correctly.
 */

import { 
  testPipelineIntegration, 
  getPipelineStatus,
  processPageWithAI 
} from '../pdf-pipeline-example'

describe('PDF Pipeline Example', () => {
  describe('testPipelineIntegration', () => {
    it('should successfully validate pipeline integration', async () => {
      const result = await testPipelineIntegration()
      expect(result).toBe(true)
    })
  })

  describe('getPipelineStatus', () => {
    it('should return current pipeline status', () => {
      const status = getPipelineStatus()
      
      expect(status).toEqual({
        mupdfPackageInstalled: true,
        browserOnlyModulesCreated: true,
        pageCountingImplemented: true,
        imageConversionImplemented: true,
        nextSteps: expect.arrayContaining([
          expect.stringContaining('page-to-HTML-fragment'),
          expect.stringContaining('Gemini Flash'),
          expect.stringContaining('assembly'),
          expect.stringContaining('Claude Sonnet')
        ])
      })
    })
  })

  describe('processPageWithAI', () => {
    it('should process page image and return HTML fragment', async () => {
      const mockBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
      
      const result = await processPageWithAI(mockBase64)
      
      expect(typeof result).toBe('string')
      expect(result).toContain('<div class="page-content">')
      expect(result).toContain('<h2>')
      expect(result).toContain('<figure data-bbox=')
    })

    it('should handle processing delay (mocked)', async () => {
      const startTime = Date.now()
      const mockBase64 = 'data:image/png;base64,test'
      
      await processPageWithAI(mockBase64)
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Should take approximately 1000ms due to setTimeout
      expect(duration).toBeGreaterThanOrEqual(900)
      expect(duration).toBeLessThan(1500)
    })
  })
})