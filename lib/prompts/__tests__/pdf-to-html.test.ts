// Tests for PDF to HTML prompt templates (both V1 image-based and V2 direct)

import fs from 'fs'
import path from 'path'
import { pdfToHtmlPrompt, pdfToHtmlPromptInputSchema } from '../templates/pdf-to-html'
import { pdfToHtmlDirectPrompt, pdfToHtmlDirectPromptInputSchema } from '../templates/pdf-to-html-direct'

describe('PDF to HTML Prompt Templates', () => {
  describe('V1 (image-based) template configuration', () => {
    it('should have correct name and configuration', () => {
      expect(pdfToHtmlPrompt.name).toBe('pdf-to-html')
      expect(pdfToHtmlPrompt.description).toContain('pdf-to-html.njk')
      expect(pdfToHtmlPrompt.modelConfig).toBeDefined()
    })

    it('should use Claude 4 Sonnet for maximum accuracy', () => {
      expect(pdfToHtmlPrompt.modelConfig?.model).toBe('anthropic-balanced')
      expect(pdfToHtmlPrompt.modelConfig?.temperature).toBe(0) // Deterministic
      expect(pdfToHtmlPrompt.modelConfig?.maxTokens).toBe(4000) // Allow longer HTML
    })

    it('should have valid schema for multimodal input', () => {
      const validInput = {
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Convert this PDF to HTML' },
              { type: 'image', image: 'base64-image-data' }
            ]
          }
        ]
      }

      expect(() => pdfToHtmlPromptInputSchema.parse(validInput)).not.toThrow()
    })

    it('should reject invalid schema input', () => {
      const invalidInput = {
        messages: [] // Empty messages array
      }

      expect(() => pdfToHtmlPromptInputSchema.parse(invalidInput)).toThrow()
    })
  })

  describe('V1 template file integrity', () => {
    it('should have accessible Nunjucks template file', () => {
      const templatePath = path.join(process.cwd(), 'lib/prompts/templates/pdf-to-html.njk')
      
      expect(fs.existsSync(templatePath)).toBe(true)
      
      const templateContent = fs.readFileSync(templatePath, 'utf-8')
      expect(templateContent).toContain('Convert')
      expect(templateContent).toContain('HTML')
      expect(templateContent).toContain('academic')
    })

    it('should contain academic-specific instructions', () => {
      const templatePath = path.join(process.cwd(), 'lib/prompts/templates/pdf-to-html.njk')
      const templateContent = fs.readFileSync(templatePath, 'utf-8')

      // Check for key academic conversion requirements
      expect(templateContent).toContain('table')
      expect(templateContent).toContain('equation')
      expect(templateContent).toContain('semantic')
      expect(templateContent).toContain('hierarchical')
    })

    it('should specify proper HTML output requirements', () => {
      const templatePath = path.join(process.cwd(), 'lib/prompts/templates/pdf-to-html.njk')
      const templateContent = fs.readFileSync(templatePath, 'utf-8')

      expect(templateContent).toContain('ONLY the HTML content')
      expect(templateContent).toContain('semantic HTML5')
      expect(templateContent).toContain('well-formed')
    })
  })

  describe('V1 multimodal message construction', () => {
    it('should handle single page PDF correctly', () => {
      const singlePageInput = {
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Convert this academic PDF to HTML' },
              { type: 'image', image: 'base64-encoded-pdf-page' }
            ]
          }
        ]
      }

      const parsed = pdfToHtmlPromptInputSchema.parse(singlePageInput)
      expect(parsed.messages).toHaveLength(1)
      expect(parsed.messages[0].content).toHaveLength(2)
    })

    it('should handle multi-page PDF correctly', () => {
      const multiPageInput = {
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Convert this academic PDF to HTML' },
              { type: 'image', image: 'base64-page-1' },
              { type: 'image', image: 'base64-page-2' },
              { type: 'image', image: 'base64-page-3' }
            ]
          }
        ]
      }

      const parsed = pdfToHtmlPromptInputSchema.parse(multiPageInput)
      expect(parsed.messages[0].content).toHaveLength(4) // 1 text + 3 images
      
      const images = parsed.messages[0].content.filter(item => item.type === 'image')
      expect(images).toHaveLength(3)
    })

    it('should validate message structure strictly', () => {
      const invalidMessageStructure = {
        messages: [
          {
            role: 'invalid-role', // Should be 'user' or 'assistant'
            content: [
              { type: 'text', text: 'Convert PDF' }
            ]
          }
        ]
      }

      expect(() => pdfToHtmlPromptInputSchema.parse(invalidMessageStructure)).toThrow()
    })

    it('should require at least one message', () => {
      const noMessages = { messages: [] }
      
      expect(() => pdfToHtmlPromptInputSchema.parse(noMessages)).toThrow()
    })
  })

  describe('V1 template path resolution', () => {
    it('should resolve template path correctly', () => {
      // Test that the loadMultimodalPromptTemplateFromCaller resolved the path
      expect(pdfToHtmlPrompt.templatePath).toContain('pdf-to-html.njk')
      expect(path.isAbsolute(pdfToHtmlPrompt.templatePath)).toBe(true)
    })

    it('should have valid template path that exists', () => {
      expect(fs.existsSync(pdfToHtmlPrompt.templatePath)).toBe(true)
    })
  })

  describe('V1 academic content requirements', () => {
    it('should specify table preservation requirements', () => {
      const templatePath = path.join(process.cwd(), 'lib/prompts/templates/pdf-to-html.njk')
      const templateContent = fs.readFileSync(templatePath, 'utf-8')

      expect(templateContent.toLowerCase()).toContain('<table>')
      expect(templateContent.toLowerCase()).toContain('<th>')
      expect(templateContent.toLowerCase()).toContain('<td>')
    })

    it('should include mathematical content handling', () => {
      const templatePath = path.join(process.cwd(), 'lib/prompts/templates/pdf-to-html.njk')
      const templateContent = fs.readFileSync(templatePath, 'utf-8')

      expect(templateContent.toLowerCase()).toContain('math')
      expect(templateContent.toLowerCase()).toContain('<sup>')
      expect(templateContent.toLowerCase()).toContain('<sub>')
    })

    it('should specify figure and caption handling', () => {
      const templatePath = path.join(process.cwd(), 'lib/prompts/templates/pdf-to-html.njk')
      const templateContent = fs.readFileSync(templatePath, 'utf-8')

      expect(templateContent.toLowerCase()).toContain('<figure>')
      expect(templateContent.toLowerCase()).toContain('<figcaption>')
    })

    it('should instruct to ignore page elements', () => {
      const templatePath = path.join(process.cwd(), 'lib/prompts/templates/pdf-to-html.njk')
      const templateContent = fs.readFileSync(templatePath, 'utf-8')

      expect(templateContent.toLowerCase()).toContain('page number')
      expect(templateContent.toLowerCase()).toContain('header')
      expect(templateContent.toLowerCase()).toContain('footer')
    })
  })

  describe('V2 (direct PDF) template configuration', () => {
    it('should have correct name and configuration for direct processing', () => {
      expect(pdfToHtmlDirectPrompt.name).toBe('pdf-to-html-direct')
      expect(pdfToHtmlDirectPrompt.description).toContain('pdf-to-html-direct.njk')
      expect(pdfToHtmlDirectPrompt.modelConfig).toBeDefined()
    })

    it('should use Claude 4 Sonnet with higher token limit for multi-page PDFs', () => {
      expect(pdfToHtmlDirectPrompt.modelConfig?.model).toBe('anthropic-balanced')
      expect(pdfToHtmlDirectPrompt.modelConfig?.temperature).toBe(0) // Deterministic
      expect(pdfToHtmlDirectPrompt.modelConfig?.maxTokens).toBe(8000) // Higher for multi-page
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

  describe('V2 template file integrity', () => {
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
  })

  describe('V2 template path resolution', () => {
    it('should resolve direct template path correctly', () => {
      expect(pdfToHtmlDirectPrompt.templatePath).toContain('pdf-to-html-direct.njk')
      expect(path.isAbsolute(pdfToHtmlDirectPrompt.templatePath)).toBe(true)
    })

    it('should have valid direct template path that exists', () => {
      expect(fs.existsSync(pdfToHtmlDirectPrompt.templatePath)).toBe(true)
    })
  })

  describe('comparison between V1 and V2 approaches', () => {
    it('should have different input schemas for different processing methods', () => {
      // V1 expects multimodal messages with images
      const v1Input = {
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: 'Convert this PDF' },
            { type: 'image', image: 'base64-image-data' }
          ]
        }]
      }

      // V2 expects direct PDF buffer
      const v2Input = {
        pdfBuffer: Buffer.from('%PDF-1.4\ntest'),
        fileName: 'test.pdf',
        singlePageOnly: false
      }

      expect(() => pdfToHtmlPromptInputSchema.parse(v1Input)).not.toThrow()
      expect(() => pdfToHtmlDirectPromptInputSchema.parse(v2Input)).not.toThrow()
      
      // Cross-validation should fail
      expect(() => pdfToHtmlPromptInputSchema.parse(v2Input)).toThrow()
      expect(() => pdfToHtmlDirectPromptInputSchema.parse(v1Input)).toThrow()
    })

    it('should have higher token limits for V2 to handle multi-page content', () => {
      const v1TokenLimit = pdfToHtmlPrompt.modelConfig?.maxTokens || 0
      const v2TokenLimit = pdfToHtmlDirectPrompt.modelConfig?.maxTokens || 0
      
      expect(v2TokenLimit).toBeGreaterThan(v1TokenLimit)
      expect(v2TokenLimit).toBe(8000) // Specifically 8000 for multi-page processing
    })
  })
})