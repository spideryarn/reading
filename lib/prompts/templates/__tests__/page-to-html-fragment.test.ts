// Tests for page-to-HTML fragment prompt template

import { 
  pageToHtmlFragmentPromptInputSchema, 
  pageToHtmlFragmentOutputSchema,
  createPageToHtmlFragmentPrompt,
  pageToHtmlFragmentPrompt
} from '../page-to-html-fragment'

describe('Page to HTML Fragment Prompt Template', () => {
  describe('Schema Validation', () => {
    it('should validate valid page input with all required fields', () => {
      const validInput = {
        pageImageBase64: 'base64-encoded-image-data',
        pageNumber: 1,
        totalPages: 10
      }
      
      const result = pageToHtmlFragmentPromptInputSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })
    
    it('should validate input with optional fields', () => {
      const validInputWithOptionals = {
        pageImageBase64: 'base64-encoded-image-data',
        pageNumber: 5,
        totalPages: 20,
        fileName: 'academic-paper.pdf',
        previousPageSummary: 'Previous page discussed methodology',
        documentContext: 'Research paper on machine learning algorithms by Smith et al.'
      }
      
      const result = pageToHtmlFragmentPromptInputSchema.safeParse(validInputWithOptionals)
      expect(result.success).toBe(true)
    })
    
    it('should reject input missing required fields', () => {
      const invalidInput = {
        pageNumber: 1,
        totalPages: 10
        // Missing pageImageBase64
      }
      
      const result = pageToHtmlFragmentPromptInputSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })
    
    it('should reject invalid page numbers', () => {
      const invalidInput = {
        pageImageBase64: 'base64-data',
        pageNumber: 0, // Invalid - must be >= 1
        totalPages: 10
      }
      
      const result = pageToHtmlFragmentPromptInputSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })
    
    it('should reject invalid total pages', () => {
      const invalidInput = {
        pageImageBase64: 'base64-data',
        pageNumber: 1,
        totalPages: 0 // Invalid - must be >= 1
      }
      
      const result = pageToHtmlFragmentPromptInputSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })
    
    it('should reject empty base64 image data', () => {
      const invalidInput = {
        pageImageBase64: '', // Invalid - must be non-empty
        pageNumber: 1,
        totalPages: 10
      }
      
      const result = pageToHtmlFragmentPromptInputSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })
  })
  
  describe('Template Configuration', () => {
    it('should create prompt with Gemini provider by default', () => {
      const prompt = createPageToHtmlFragmentPrompt()
      
      expect(prompt.name).toBe('page-to-html-fragment')
      expect(prompt.templatePath).toContain('page-to-html-fragment.njk')
      expect(prompt.modelConfig?.model).toBe('google:gemini-2.5-flash:latest')
      expect(prompt.modelConfig?.temperature).toBe(0)
      expect(prompt.modelConfig?.maxTokens).toBe(16000)
    })
    
    it('should create prompt with Claude provider when specified', () => {
      const prompt = createPageToHtmlFragmentPrompt('claude')
      
      expect(prompt.modelConfig?.model).toBe('anthropic:claude-sonnet-4:20250514')
    })
    
    it('should create prompt with Gemini provider when specified', () => {
      const prompt = createPageToHtmlFragmentPrompt('gemini')
      
      expect(prompt.modelConfig?.model).toBe('google:gemini-2.5-flash:latest')
    })
    
    it('should have deterministic temperature for academic content', () => {
      const prompt = createPageToHtmlFragmentPrompt()
      
      expect(prompt.modelConfig?.temperature).toBe(0)
    })
    
    it('should have reasonable token limit for page processing', () => {
      const prompt = createPageToHtmlFragmentPrompt()
      
      // Should be moderate limit suitable for individual pages (~8K as per requirements)
      expect(prompt.modelConfig?.maxTokens).toBe(16000)
    })
  })
  
  describe('Default Export', () => {
    it('should export Gemini-optimized prompt by default', () => {
      expect(pageToHtmlFragmentPrompt.modelConfig?.model).toBe('google:gemini-2.5-flash:latest')
      expect(pageToHtmlFragmentPrompt.modelConfig?.temperature).toBe(0)
      expect(pageToHtmlFragmentPrompt.schema).toBe(pageToHtmlFragmentPromptInputSchema)
    })
  })
  
  describe('Output Schema', () => {
    it('should validate HTML fragment output', () => {
      const validOutput = '<div class="page-1"><h2>Introduction</h2><p>This is content.</p></div>'
      
      const result = pageToHtmlFragmentOutputSchema.safeParse(validOutput)
      expect(result.success).toBe(true)
    })
    
    it('should reject empty output', () => {
      const invalidOutput = ''
      
      const result = pageToHtmlFragmentOutputSchema.safeParse(invalidOutput)
      expect(result.success).toBe(false)
    })
  })
  
  describe('Academic Content Requirements', () => {
    it('should include schema fields necessary for academic processing', () => {
      const schema = pageToHtmlFragmentPromptInputSchema.shape
      
      // Check that schema supports academic content features
      expect(schema.pageNumber).toBeDefined()
      expect(schema.totalPages).toBeDefined()
      expect(schema.fileName).toBeDefined()
      expect(schema.previousPageSummary).toBeDefined()
      expect(schema.documentContext).toBeDefined()
    })
    
    it('should support page context for cross-page continuity', () => {
      const inputWithContext = {
        pageImageBase64: 'base64-data',
        pageNumber: 3,
        totalPages: 15,
        previousPageSummary: 'Introduced key concepts and definitions',
        documentContext: 'Academic paper on neural networks'
      }
      
      const result = pageToHtmlFragmentPromptInputSchema.safeParse(inputWithContext)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.previousPageSummary).toBe('Introduced key concepts and definitions')
        expect(result.data.documentContext).toBe('Academic paper on neural networks')
      }
    })
  })
  
  describe('Template Path Resolution', () => {
    it('should resolve template path correctly', () => {
      const prompt = createPageToHtmlFragmentPrompt()
      
      expect(prompt.templatePath).toMatch(/page-to-html-fragment\.njk$/)
    })
  })
})