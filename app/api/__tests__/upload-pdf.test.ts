// Integration tests for PDF upload API endpoint (V2 - direct PDF processing)

import { POST } from '../upload-pdf/route'

// Mock the multimodal prompt execution for direct PDF processing
jest.mock('@/lib/prompts/types', () => ({
  executeMultimodalPrompt: jest.fn(),
  loadMultimodalPromptTemplateFromCaller: jest.fn()
}))

// Mock the direct PDF prompt template
jest.mock('@/lib/prompts/templates/pdf-to-html-direct', () => ({
  pdfToHtmlDirectPrompt: {
    name: 'pdf-to-html-direct',
    schema: { parse: jest.fn() }
  }
}))

describe('/api/upload-pdf (V2 - direct PDF processing)', () => {
  const mockExecutePrompt = require('@/lib/prompts/types').executeMultimodalPrompt

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default successful mock for Claude direct processing
    mockExecutePrompt.mockResolvedValue('<html><body>Converted HTML</body></html>')
  })

  const createFormData = (filename: string, content: Buffer, mimeType: string = 'application/pdf') => {
    const formData = new FormData()
    const file = new File([content], filename, { type: mimeType })
    
    // Mock the arrayBuffer method that Jest's File doesn't have
    ;(file as any).arrayBuffer = jest.fn().mockResolvedValue(content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength))
    
    formData.append('pdf', file)
    return formData
  }

  const createRequest = (formData: FormData): Request => {
    // Create a proper Request mock for testing
    const request = new Request('http://localhost:3000/api/upload-pdf', {
      method: 'POST',
      body: formData
    })
    
    // Add the formData method that Jest doesn't provide by default
    ;(request as any).formData = jest.fn().mockResolvedValue(formData)
    
    return request
  }

  // Helper function to extract response body text in Jest environment
  const getResponseText = (response: any): string => {
    // In Jest, Next.js Response objects have a 'body' property instead of text() method
    return response.body || ''
  }

  describe('successful conversion', () => {
    it('should convert PDF to HTML successfully using direct processing', async () => {
      const pdfContent = Buffer.from('%PDF-1.4\ntest PDF content')
      const formData = createFormData('test.pdf', pdfContent)
      const request = createRequest(formData)

      const response = await POST(request)
      
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8')
      
      const responseText = getResponseText(response)
      expect(responseText).toBe('<html><body>Converted HTML</body></html>')
      
      // Should call direct processing with PDF buffer
      expect(mockExecutePrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'pdf-to-html-direct'
        }),
        expect.objectContaining({
          pdfBuffer: pdfContent,
          fileName: 'test.pdf',
          singlePageOnly: false
        })
      )
    })

    it('should handle PDF within Claude API size limit', async () => {
      const pdfContent = Buffer.alloc(5 * 1024 * 1024) // 5MB - under 32MB limit
      pdfContent.write('%PDF-1.4')
      const formData = createFormData('medium.pdf', pdfContent)
      const request = createRequest(formData)

      const response = await POST(request)
      
      expect(response.status).toBe(200)
      expect(mockExecutePrompt).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          pdfBuffer: pdfContent,
          fileName: 'medium.pdf'
        })
      )
    })
  })

  describe('file validation errors', () => {
    it('should reject requests without PDF file', async () => {
      const formData = new FormData()
      const request = createRequest(formData)

      const response = await POST(request)
      
      expect(response.status).toBe(400)
      const error = getResponseText(response)
      expect(error).toContain('No PDF file provided')
    })

    it('should reject non-PDF files', async () => {
      const textContent = Buffer.from('This is not a PDF')
      const formData = createFormData('document.txt', textContent, 'text/plain')
      const request = createRequest(formData)

      const response = await POST(request)
      
      expect(response.status).toBe(400)
      const error = getResponseText(response)
      expect(error).toContain('File is not a valid PDF')
    })

    it('should reject oversized PDF files (above 32MB Claude limit)', async () => {
      const largePdfContent = Buffer.alloc(35 * 1024 * 1024) // 35MB - over 32MB limit
      largePdfContent.write('%PDF-1.4')
      const formData = createFormData('huge.pdf', largePdfContent)
      const request = createRequest(formData)

      const response = await POST(request)
      
      expect(response.status).toBe(400)
      const error = getResponseText(response)
      expect(error).toContain('PDF file too large (max 32MB for Claude direct processing)')
    })

    it('should accept PDF files at exactly 32MB limit', async () => {
      const maxSizePdfContent = Buffer.alloc(32 * 1024 * 1024) // Exactly 32MB
      maxSizePdfContent.write('%PDF-1.4')
      const formData = createFormData('max-size.pdf', maxSizePdfContent)
      const request = createRequest(formData)

      const response = await POST(request)
      
      expect(response.status).toBe(200)
      expect(mockExecutePrompt).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          pdfBuffer: maxSizePdfContent
        })
      )
    })

    it('should handle PDF validation failures (invalid PDF header)', async () => {
      const pdfContent = Buffer.from('invalid PDF content') // No %PDF header
      const formData = createFormData('invalid.pdf', pdfContent)
      const request = createRequest(formData)

      const response = await POST(request)
      
      expect(response.status).toBe(400)
      const error = getResponseText(response)
      expect(error).toContain('File is not a valid PDF')
    })

    it('should handle empty PDF buffer', async () => {
      const emptyPdfContent = Buffer.alloc(0) // Empty buffer
      const formData = createFormData('empty.pdf', emptyPdfContent)
      const request = createRequest(formData)

      const response = await POST(request)
      
      expect(response.status).toBe(400)
      const error = getResponseText(response)
      expect(error).toContain('PDF file is empty')
    })
  })

  describe('conversion errors', () => {
    it('should handle Claude API failures', async () => {
      mockExecutePrompt.mockRejectedValue(new Error('Claude API error: Model not available'))

      const pdfContent = Buffer.from('%PDF-1.4\ntest content')
      const formData = createFormData('test.pdf', pdfContent)
      const request = createRequest(formData)

      const response = await POST(request)
      
      expect(response.status).toBe(500)
      const error = getResponseText(response)
      expect(error).toContain('Conversion error: Claude API error: Model not available')
    })

    it('should handle rate limit errors with appropriate response', async () => {
      mockExecutePrompt.mockRejectedValue(new Error('API rate limit exceeded'))

      const pdfContent = Buffer.from('%PDF-1.4\ntest content')
      const formData = createFormData('test.pdf', pdfContent)
      const request = createRequest(formData)

      const response = await POST(request)
      
      expect(response.status).toBe(429)
      const error = getResponseText(response)
      expect(error).toContain('API rate limit exceeded. Please try again later.')
    })

    it('should handle authentication errors with appropriate response', async () => {
      mockExecutePrompt.mockRejectedValue(new Error('API key invalid'))

      const pdfContent = Buffer.from('%PDF-1.4\ntest content')
      const formData = createFormData('test.pdf', pdfContent)
      const request = createRequest(formData)

      const response = await POST(request)
      
      expect(response.status).toBe(503)
      const error = getResponseText(response)
      expect(error).toContain('AI service configuration error. Please check API keys.')
    })

    it('should handle timeout errors appropriately', async () => {
      mockExecutePrompt.mockRejectedValue(new Error('Request timeout occurred'))

      const pdfContent = Buffer.from('%PDF-1.4\ntest content')
      const formData = createFormData('test.pdf', pdfContent)
      const request = createRequest(formData)

      const response = await POST(request)
      
      expect(response.status).toBe(504)
      const error = getResponseText(response)
      expect(error).toContain('Request timeout. The PDF may be too complex or the service is busy.')
    })
  })

  describe('direct PDF processing integration', () => {
    it('should pass correct parameters to direct PDF prompt', async () => {
      const pdfContent = Buffer.from('%PDF-1.4\ntest content')
      const formData = createFormData('academic-paper.pdf', pdfContent)
      const request = createRequest(formData)

      await POST(request)

      expect(mockExecutePrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'pdf-to-html-direct'
        }),
        expect.objectContaining({
          pdfBuffer: pdfContent,
          fileName: 'academic-paper.pdf',
          singlePageOnly: false
        })
      )
    })

    it('should handle multi-page PDF with direct processing', async () => {
      const pdfContent = Buffer.from('%PDF-1.4\nmulti-page content')
      const formData = createFormData('multipage.pdf', pdfContent)
      const request = createRequest(formData)

      await POST(request)

      // Should send entire PDF buffer to Claude (it handles multi-page internally)
      expect(mockExecutePrompt).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          pdfBuffer: pdfContent,
          fileName: 'multipage.pdf',
          singlePageOnly: false // Multi-page processing enabled
        })
      )
    })
  })

  describe('response formatting', () => {
    it('should return HTML with correct content type', async () => {
      const expectedHtml = '<!DOCTYPE html><html><head><title>Test</title></head><body>Content</body></html>'
      mockExecutePrompt.mockResolvedValue(expectedHtml)

      const pdfContent = Buffer.from('%PDF-1.4\ntest content')
      const formData = createFormData('test.pdf', pdfContent)
      const request = createRequest(formData)

      const response = await POST(request)
      const html = getResponseText(response)

      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8')
      expect(html).toBe(expectedHtml)
    })

    it('should handle empty HTML responses gracefully', async () => {
      mockExecutePrompt.mockResolvedValue('')

      const pdfContent = Buffer.from('%PDF-1.4\ntest content')
      const formData = createFormData('test.pdf', pdfContent)
      const request = createRequest(formData)

      const response = await POST(request)
      
      expect(response.status).toBe(200)
      const html = getResponseText(response)
      expect(html).toBe('') // Empty response is now valid (Claude might return empty for some PDFs)
    })
  })
})