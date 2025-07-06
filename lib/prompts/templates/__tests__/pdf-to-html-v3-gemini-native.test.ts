import { 
  createPdfToHtmlV3GeminiNativePrompt, 
  pdfToHtmlV3GeminiNativePrompt, 
  pdfToHtmlV3GeminiNativePromptInputSchema,
  pdfToHtmlV3GeminiNativeOutputSchema
} from '../pdf-to-html-v3-gemini-native'

describe('pdf-to-html-v3-gemini-native template', () => {
  describe('Template Configuration', () => {
    it('should load the prompt template successfully', () => {
      // Test that the prompt can be created without errors
      const prompt = createPdfToHtmlV3GeminiNativePrompt()
      expect(prompt).toBeDefined()
      expect(prompt.name).toBe('pdf-to-html-v3-gemini-native')
      expect(prompt.modelConfig?.model).toBe('google:gemini-2.5-pro:latest')
      expect(prompt.modelConfig?.temperature).toBe(0)
      expect(prompt.modelConfig?.maxTokens).toBe(64000)
    })

    it('should have correct default export', () => {
      expect(pdfToHtmlV3GeminiNativePrompt).toBeDefined()
      expect(pdfToHtmlV3GeminiNativePrompt.modelConfig?.model).toBe('google:gemini-2.5-pro:latest')
    })

    it('should use Gemini 2.5 Pro for native PDF processing', () => {
      const prompt = createPdfToHtmlV3GeminiNativePrompt()
      expect(prompt.modelConfig?.model).toBe('google:gemini-2.5-pro:latest')
    })

    it('should have deterministic temperature for coordinate precision', () => {
      const prompt = createPdfToHtmlV3GeminiNativePrompt()
      expect(prompt.modelConfig?.temperature).toBe(0)
    })

    it('should have high token limit for complex PDFs', () => {
      const prompt = createPdfToHtmlV3GeminiNativePrompt()
      expect(prompt.modelConfig?.maxTokens).toBe(64000)
    })
  })

  describe('Schema Validation', () => {
    it('should validate valid input with required fields', () => {
      const validInput = {
        pdfBuffer: Buffer.from('%PDF-1.4\ntest content'),
        singlePageOnly: false
      }
      
      const result = pdfToHtmlV3GeminiNativePromptInputSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('should validate input with optional fileName', () => {
      const validInput = {
        pdfBuffer: Buffer.from('%PDF-1.4\ntest content'),
        fileName: 'academic-paper.pdf',
        singlePageOnly: true
      }
      
      const result = pdfToHtmlV3GeminiNativePromptInputSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('should reject input without pdfBuffer', () => {
      const invalidInput = {
        fileName: 'test.pdf',
        singlePageOnly: false
      }
      
      const result = pdfToHtmlV3GeminiNativePromptInputSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    it('should reject non-Buffer pdfBuffer', () => {
      const invalidInput = {
        pdfBuffer: 'not-a-buffer',
        singlePageOnly: false
      }
      
      const result = pdfToHtmlV3GeminiNativePromptInputSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    it('should default singlePageOnly to false', () => {
      const input = {
        pdfBuffer: Buffer.from('%PDF-1.4\ntest content')
      }
      
      const result = pdfToHtmlV3GeminiNativePromptInputSchema.parse(input)
      expect(result.singlePageOnly).toBe(false)
    })
  })

  describe('Output Schema', () => {
    it('should validate HTML output', () => {
      const validOutput = '<!DOCTYPE html><html><head><title>Test</title></head><body><figure data-bbox="100,200,300,400">Figure 1</figure></body></html>'
      
      const result = pdfToHtmlV3GeminiNativeOutputSchema.safeParse(validOutput)
      expect(result.success).toBe(true)
    })

    it('should reject empty output', () => {
      const invalidOutput = ''
      
      const result = pdfToHtmlV3GeminiNativeOutputSchema.safeParse(invalidOutput)
      expect(result.success).toBe(false)
    })

    it('should have description mentioning 0-1000 scale', () => {
      const description = pdfToHtmlV3GeminiNativeOutputSchema._def.description
      expect(description).toContain('0-1000 scale')
    })
  })

  describe('Template Features', () => {
    it('should be configured for Gemini native PDF capabilities', () => {
      const prompt = createPdfToHtmlV3GeminiNativePrompt()
      expect(prompt.description).toContain('pdf-to-html-v3-gemini-native.njk')
    })

    it('should support multimodal PDF input', () => {
      const schema = pdfToHtmlV3GeminiNativePromptInputSchema.shape
      expect(schema.pdfBuffer).toBeDefined()
    })

    it('should support cost control with singlePageOnly option', () => {
      const schema = pdfToHtmlV3GeminiNativePromptInputSchema.shape
      expect(schema.singlePageOnly).toBeDefined()
    })
  })
})