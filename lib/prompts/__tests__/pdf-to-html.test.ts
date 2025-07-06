// Tests for PDF to HTML prompt templates (V2 direct PDF processing)

import fs from 'fs'
import path from 'path'
import { 
  pdfToHtmlDirectPrompt, 
  pdfToHtmlDirectPromptInputSchema,
  createPdfToHtmlPrompt 
} from '../templates/pdf-to-html-direct'

describe('PDF to HTML Direct Prompt Template', () => {
  describe('template configuration', () => {
    it('should have correct name and configuration for direct processing', () => {
      expect(pdfToHtmlDirectPrompt.name).toBe('pdf-to-html-direct')
      expect(pdfToHtmlDirectPrompt.description).toContain('pdf-to-html-direct.njk')
      expect(pdfToHtmlDirectPrompt.modelConfig).toBeDefined()
    })

    it('should use Claude Sonnet 4 with high token limit for multi-page PDFs', () => {
      expect(pdfToHtmlDirectPrompt.modelConfig?.model).toBe('anthropic:claude-sonnet-4:20250514')
      expect(pdfToHtmlDirectPrompt.modelConfig?.temperature).toBe(0) // Deterministic
      expect(pdfToHtmlDirectPrompt.modelConfig?.maxTokens).toBe(64000) // High limit for complex PDFs
    })

    it('should support multiple providers', () => {
      const claudePrompt = createPdfToHtmlPrompt('claude')
      const geminiPrompt = createPdfToHtmlPrompt('gemini')
      
      expect(claudePrompt.modelConfig?.model).toBe('anthropic:claude-sonnet-4:20250514')
      expect(geminiPrompt.modelConfig?.model).toBe('google:gemini-2.5-flash:latest')
    })

    it('should have valid schema for direct PDF input', () => {
      const validInput = {
        pdfBuffer: Buffer.from('%PDF-1.4\ntest content'),
        fileName: 'test.pdf',
        singlePageOnly: false
      }

      expect(() => pdfToHtmlDirectPromptInputSchema.parse(validInput)).not.toThrow()
    })

    it('should reject invalid schema input', () => {
      const invalidInput = {
        pdfBuffer: 'not-a-buffer', // Should be Buffer
        fileName: 'test.pdf'
      }

      expect(() => pdfToHtmlDirectPromptInputSchema.parse(invalidInput)).toThrow()
    })

    it('should handle optional fileName parameter', () => {
      const inputWithoutFileName = {
        pdfBuffer: Buffer.from('%PDF-1.4\ntest'),
        singlePageOnly: true
      }

      expect(() => pdfToHtmlDirectPromptInputSchema.parse(inputWithoutFileName)).not.toThrow()
    })

    it('should default singlePageOnly to false for multi-page processing', () => {
      const inputWithDefaults = {
        pdfBuffer: Buffer.from('%PDF-1.4\ntest')
      }

      const parsed = pdfToHtmlDirectPromptInputSchema.parse(inputWithDefaults)
      expect(parsed.singlePageOnly).toBe(false)
    })
  })

  describe('template file integrity', () => {
    it('should have accessible Nunjucks template file for direct processing', () => {
      const templatePath = path.join(process.cwd(), 'lib/prompts/templates/pdf-to-html-direct.njk')
      
      expect(fs.existsSync(templatePath)).toBe(true)
      
      const templateContent = fs.readFileSync(templatePath, 'utf-8')
      expect(templateContent).toContain('Convert')
      expect(templateContent).toContain('HTML')
      expect(templateContent).toContain('PDF')
    })

    it('should contain instructions for direct PDF processing', () => {
      const templatePath = path.join(process.cwd(), 'lib/prompts/templates/pdf-to-html-direct.njk')
      const templateContent = fs.readFileSync(templatePath, 'utf-8')

      // Check for direct PDF processing instructions
      expect(templateContent.toLowerCase()).toContain('pdf')
      expect(templateContent.toLowerCase()).toContain('semantic')
      expect(templateContent.toLowerCase()).toContain('html')
    })

    it('should specify academic content requirements', () => {
      const templatePath = path.join(process.cwd(), 'lib/prompts/templates/pdf-to-html-direct.njk')
      const templateContent = fs.readFileSync(templatePath, 'utf-8')

      // Check for academic-specific requirements
      expect(templateContent.toLowerCase()).toContain('table')
      expect(templateContent.toLowerCase()).toContain('equation')
      expect(templateContent.toLowerCase()).toContain('semantic')
      expect(templateContent.toLowerCase()).toContain('hierarchical')
    })

    it('should specify proper HTML output requirements', () => {
      const templatePath = path.join(process.cwd(), 'lib/prompts/templates/pdf-to-html-direct.njk')
      const templateContent = fs.readFileSync(templatePath, 'utf-8')

      expect(templateContent).toContain('ONLY the HTML content')
      expect(templateContent).toContain('semantic HTML5')
      expect(templateContent).toContain('well-formed')
    })

    it('should include table preservation requirements', () => {
      const templatePath = path.join(process.cwd(), 'lib/prompts/templates/pdf-to-html-direct.njk')
      const templateContent = fs.readFileSync(templatePath, 'utf-8')

      expect(templateContent.toLowerCase()).toContain('<table>')
      expect(templateContent.toLowerCase()).toContain('<th>')
      expect(templateContent.toLowerCase()).toContain('<td>')
    })

    it('should include mathematical content handling', () => {
      const templatePath = path.join(process.cwd(), 'lib/prompts/templates/pdf-to-html-direct.njk')
      const templateContent = fs.readFileSync(templatePath, 'utf-8')

      expect(templateContent.toLowerCase()).toContain('math')
      expect(templateContent.toLowerCase()).toContain('<sup>')
      expect(templateContent.toLowerCase()).toContain('<sub>')
    })

    it('should specify figure and caption handling', () => {
      const templatePath = path.join(process.cwd(), 'lib/prompts/templates/pdf-to-html-direct.njk')
      const templateContent = fs.readFileSync(templatePath, 'utf-8')

      expect(templateContent.toLowerCase()).toContain('<figure>')
      expect(templateContent.toLowerCase()).toContain('<figcaption>')
    })

    it('should instruct to ignore page elements', () => {
      const templatePath = path.join(process.cwd(), 'lib/prompts/templates/pdf-to-html-direct.njk')
      const templateContent = fs.readFileSync(templatePath, 'utf-8')

      expect(templateContent.toLowerCase()).toContain('page number')
      expect(templateContent.toLowerCase()).toContain('header')
      expect(templateContent.toLowerCase()).toContain('footer')
    })
  })

  describe('template path resolution', () => {
    it('should resolve direct template path correctly', () => {
      expect(pdfToHtmlDirectPrompt.templatePath).toContain('pdf-to-html-direct.njk')
      expect(path.isAbsolute(pdfToHtmlDirectPrompt.templatePath)).toBe(true)
    })
  })

  describe('buffer validation', () => {
    it('should validate PDF buffer content', () => {
      const validPdfBuffer = Buffer.from('%PDF-1.4\n%âãÏÓ\n')
      const invalidBuffer = Buffer.from('Not a PDF')

      const validInput = {
        pdfBuffer: validPdfBuffer,
        singlePageOnly: false
      }

      const invalidInput = {
        pdfBuffer: invalidBuffer,
        singlePageOnly: false
      }

      // Should accept valid PDF buffer
      expect(() => pdfToHtmlDirectPromptInputSchema.parse(validInput)).not.toThrow()
      
      // Schema doesn't validate PDF content, just Buffer type
      expect(() => pdfToHtmlDirectPromptInputSchema.parse(invalidInput)).not.toThrow()
    })

    it('should handle large PDF buffers', () => {
      // Create a larger buffer to simulate real PDF
      const largePdfBuffer = Buffer.alloc(1024 * 1024) // 1MB
      largePdfBuffer.write('%PDF-1.4\n')

      const input = {
        pdfBuffer: largePdfBuffer,
        fileName: 'large-document.pdf',
        singlePageOnly: false
      }

      expect(() => pdfToHtmlDirectPromptInputSchema.parse(input)).not.toThrow()
    })
  })

  describe('error handling', () => {
    it('should reject null or undefined pdfBuffer', () => {
      const nullInput = {
        pdfBuffer: null,
        fileName: 'test.pdf'
      }

      const undefinedInput = {
        fileName: 'test.pdf'
      }

      expect(() => pdfToHtmlDirectPromptInputSchema.parse(nullInput)).toThrow()
      expect(() => pdfToHtmlDirectPromptInputSchema.parse(undefinedInput)).toThrow()
    })

    it('should reject non-Buffer types for pdfBuffer', () => {
      const stringInput = {
        pdfBuffer: 'string content',
        fileName: 'test.pdf'
      }

      const arrayInput = {
        pdfBuffer: [1, 2, 3],
        fileName: 'test.pdf'
      }

      expect(() => pdfToHtmlDirectPromptInputSchema.parse(stringInput)).toThrow()
      expect(() => pdfToHtmlDirectPromptInputSchema.parse(arrayInput)).toThrow()
    })
  })
})