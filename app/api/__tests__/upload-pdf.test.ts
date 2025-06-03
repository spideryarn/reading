// Integration tests for PDF upload API endpoint

import { POST } from '../upload-pdf/route'

// Mock the PDF converter
jest.mock('@/lib/utils/pdf-converter', () => ({
  convertPdfToBase64Image: jest.fn(),
  validatePdfBuffer: jest.fn()
}))

// Mock the multimodal prompt execution
jest.mock('@/lib/prompts/types', () => ({
  executeMultimodalPrompt: jest.fn(),
  loadMultimodalPromptTemplateFromCaller: jest.fn()
}))

// Mock the prompt template
jest.mock('@/lib/prompts/templates/pdf-to-html', () => ({
  pdfToHtmlPrompt: {
    name: 'pdf-to-html',
    schema: { parse: jest.fn() }
  }
}))

describe('/api/upload-pdf', () => {
  const mockConvertPdf = require('@/lib/utils/pdf-converter').convertPdfToBase64Image
  const mockValidatePdf = require('@/lib/utils/pdf-converter').validatePdfBuffer
  const mockExecutePrompt = require('@/lib/prompts/types').executeMultimodalPrompt

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default successful mocks
    mockValidatePdf.mockReturnValue({ valid: true })
    mockConvertPdf.mockResolvedValue({
      success: true,
      images: ['base64-image-data'],
      pageCount: 1
    })
    mockExecutePrompt.mockResolvedValue('<html><body>Converted HTML</body></html>')
  })

  const createFormData = (filename: string, content: Buffer, mimeType: string = 'application/pdf') => {
    const formData = new FormData()
    const file = new File([content], filename, { type: mimeType })
    formData.append('pdf', file)
    return formData
  }

  const createRequest = (formData: FormData): Request => {
    return new Request('http://localhost:3000/api/upload-pdf', {
      method: 'POST',
      body: formData
    })
  }

  describe('successful conversion', () => {
    it('should convert PDF to HTML successfully', async () => {
      const pdfContent = Buffer.from('%PDF-1.4\ntest PDF content')
      const formData = createFormData('test.pdf', pdfContent)
      const request = createRequest(formData)

      const response = await POST(request)
      const html = await response.text()

      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('text/html')
      expect(html).toBe('<html><body>Converted HTML</body></html>')
      
      expect(mockValidatePdf).toHaveBeenCalledWith(pdfContent)
      expect(mockConvertPdf).toHaveBeenCalledWith(pdfContent)
      expect(mockExecutePrompt).toHaveBeenCalled()
    })

    it('should handle single-page PDF within size limit', async () => {
      const pdfContent = Buffer.alloc(1024 * 1024) // 1MB
      pdfContent.write('%PDF-1.4')
      const formData = createFormData('small.pdf', pdfContent)
      const request = createRequest(formData)

      const response = await POST(request)
      
      expect(response.status).toBe(200)
      expect(mockValidatePdf).toHaveBeenCalled()
    })
  })

  describe('file validation errors', () => {
    it('should reject requests without PDF file', async () => {
      const formData = new FormData()
      const request = createRequest(formData)

      const response = await POST(request)
      
      expect(response.status).toBe(400)
      const error = await response.text()
      expect(error).toContain('No PDF file provided')
    })

    it('should reject non-PDF files', async () => {
      const textContent = Buffer.from('This is not a PDF')
      const formData = createFormData('document.txt', textContent, 'text/plain')
      const request = createRequest(formData)

      const response = await POST(request)
      
      expect(response.status).toBe(400)
      const error = await response.text()
      expect(error).toContain('Invalid file type')
    })

    it('should reject oversized PDF files', async () => {
      const largePdfContent = Buffer.alloc(3 * 1024 * 1024) // 3MB
      largePdfContent.write('%PDF-1.4')
      const formData = createFormData('large.pdf', largePdfContent)
      const request = createRequest(formData)

      const response = await POST(request)
      
      expect(response.status).toBe(400)
      const error = await response.text()
      expect(error).toContain('File too large')
    })

    it('should handle PDF validation failures', async () => {
      mockValidatePdf.mockReturnValue({ 
        valid: false, 
        error: 'Corrupted PDF file' 
      })

      const pdfContent = Buffer.from('invalid PDF content')
      const formData = createFormData('invalid.pdf', pdfContent)
      const request = createRequest(formData)

      const response = await POST(request)
      
      expect(response.status).toBe(400)
      const error = await response.text()
      expect(error).toContain('Corrupted PDF file')
    })
  })

  describe('conversion errors', () => {
    it('should handle PDF conversion failures', async () => {
      mockConvertPdf.mockResolvedValue({
        success: false,
        error: 'GraphicsMagick not found'
      })

      const pdfContent = Buffer.from('%PDF-1.4\ntest content')
      const formData = createFormData('test.pdf', pdfContent)
      const request = createRequest(formData)

      const response = await POST(request)
      
      expect(response.status).toBe(500)
      const error = await response.text()
      expect(error).toContain('GraphicsMagick not found')
    })

    it('should handle LLM processing failures', async () => {
      mockExecutePrompt.mockRejectedValue(new Error('Claude API error'))

      const pdfContent = Buffer.from('%PDF-1.4\ntest content')
      const formData = createFormData('test.pdf', pdfContent)
      const request = createRequest(formData)

      const response = await POST(request)
      
      expect(response.status).toBe(500)
      const error = await response.text()
      expect(error).toContain('HTML conversion failed')
    })

    it('should provide helpful error messages for system dependency issues', async () => {
      mockConvertPdf.mockResolvedValue({
        success: false,
        error: 'Could not execute GraphicsMagick/ImageMagick: gm "identify" not found'
      })

      const pdfContent = Buffer.from('%PDF-1.4\ntest content')
      const formData = createFormData('test.pdf', pdfContent)
      const request = createRequest(formData)

      const response = await POST(request)
      
      expect(response.status).toBe(500)
      const error = await response.text()
      expect(error).toContain('GraphicsMagick')
    })
  })

  describe('multimodal prompt integration', () => {
    it('should pass correct parameters to multimodal prompt', async () => {
      const pdfContent = Buffer.from('%PDF-1.4\ntest content')
      const formData = createFormData('academic-paper.pdf', pdfContent)
      const request = createRequest(formData)

      await POST(request)

      expect(mockExecutePrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'pdf-to-html'
        }),
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.arrayContaining([
                expect.objectContaining({ type: 'text' }),
                expect.objectContaining({ 
                  type: 'image',
                  image: expect.stringContaining('base64-image-data')
                })
              ])
            })
          ])
        })
      )
    })

    it('should handle multi-page PDF conversion', async () => {
      mockConvertPdf.mockResolvedValue({
        success: true,
        images: ['page1-base64', 'page2-base64'],
        pageCount: 2
      })

      const pdfContent = Buffer.from('%PDF-1.4\nmulti-page content')
      const formData = createFormData('multipage.pdf', pdfContent)
      const request = createRequest(formData)

      await POST(request)

      // Should send all pages to the LLM
      expect(mockExecutePrompt).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.arrayContaining([
                expect.objectContaining({ image: expect.stringContaining('page1-base64') }),
                expect.objectContaining({ image: expect.stringContaining('page2-base64') })
              ])
            })
          ])
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
      const html = await response.text()

      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('text/html')
      expect(html).toBe(expectedHtml)
    })

    it('should handle empty or malformed HTML responses gracefully', async () => {
      mockExecutePrompt.mockResolvedValue('')

      const pdfContent = Buffer.from('%PDF-1.4\ntest content')
      const formData = createFormData('test.pdf', pdfContent)
      const request = createRequest(formData)

      const response = await POST(request)
      
      expect(response.status).toBe(500)
      const error = await response.text()
      expect(error).toContain('Empty HTML response')
    })
  })
})