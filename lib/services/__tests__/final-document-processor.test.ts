/**
 * Tests for Final Document Processing Service
 * 
 * Tests the final quality assurance and refinement stage of the
 * vision-based PDF processing pipeline using comprehensive mocking.
 */

import { 
  processFinalDocument, 
  quickFinalProcessing,
  type FinalProcessingConfig 
} from '../final-document-processor'
import { 
  validateEditOperations, 
  applyEditOperations,
  type EditOperation,
  type FinalDocumentRefinementOutput
} from '@/lib/prompts/templates/final-document-refinement'
import { type AssembledDocument } from '../html-assembler'
import { type ValidationResult } from '../html-fragment-validator'

// Mock the prompt template
jest.mock('@/lib/prompts/templates/final-document-refinement', () => {
  const actual = jest.requireActual('@/lib/prompts/templates/final-document-refinement')
  return {
    ...actual,
    finalDocumentRefinementPrompt: {
      runWithRetry: jest.fn()
    }
  }
})

// Mock the logger
jest.mock('@/lib/services/logger', () => ({
  createRequestLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }))
}))

// Access the mocked prompt after module mocking is set up
const mockPrompt = require('@/lib/prompts/templates/final-document-refinement')
const finalDocumentRefinementPrompt = mockPrompt.finalDocumentRefinementPrompt

describe('Final Document Processor', () => {
  
  // Helper function to create mock assembled document
  const createMockAssembledDocument = (overrides: Partial<AssembledDocument> = {}): AssembledDocument => ({
    htmlDocument: `<!DOCTYPE html>
<html lang="en">
<head>
  <title>Academic Paper</title>
</head>
<body>
  <h1>Research Title</h1>
  <p>This is the introduction paragraph.</p>
  <figure data-bbox="0.1,0.2,0.9,0.6">
    <img src="data:image/png;base64,abc123" alt="Research diagram">
    <figcaption>Figure 1: Research methodology</figcaption>
  </figure>
  <table>
    <thead>
      <tr><th>Method</th><th>Result</th></tr>
    </thead>
    <tbody>
      <tr><td>A</td><td>85%</td></tr>
    </tbody>
  </table>
</body>
</html>`,
    documentMetadata: {
      totalPages: 3,
      successfulPages: 3,
      failedPages: [],
      assemblyTimeMs: 1500,
      crossPageMerges: [
        {
          elementType: 'table',
          sourcePageNumber: 2,
          targetPageNumber: 3,
          mergeInstruction: 'table-continues-on-next-page',
          confidence: 0.9
        }
      ],
      totalElements: 15,
      documentStructure: {
        headingCount: 1,
        paragraphCount: 1,
        tableCount: 1,
        figureCount: 1,
        listCount: 0
      }
    },
    assemblyNotes: ['Processing file: research-paper.pdf'],
    warnings: [],
    errors: [],
    success: true,
    ...overrides
  })

  // Helper function to create mock validation result
  const createMockValidationResult = (overrides: Partial<ValidationResult> = {}): ValidationResult => ({
    isValid: true,
    validationTimeMs: 500,
    elementCount: 15,
    contentLength: 250,
    structuralIssues: [
      {
        type: 'warning',
        message: 'Table missing caption',
        element: 'table[0]',
        pageNumber: 2
      }
    ],
    accessibilityIssues: [
      {
        type: 'warning',
        message: 'Image has good alt text',
        element: 'img[0]',
        wcagLevel: 'A'
      }
    ],
    academicIssues: [],
    performanceMetrics: {
      domComplexity: 15,
      nestingDepth: 4,
      duplicateIds: [],
      brokenReferences: []
    },
    summary: {
      totalIssues: 2,
      criticalIssues: 0,
      warningIssues: 2,
      infoIssues: 0
    },
    ...overrides
  })

  // Helper function to create mock AI response
  const createMockAIResponse = (editOperations: EditOperation[] = []): FinalDocumentRefinementOutput => ({
    edit_operations: editOperations,
    quality_assessment: {
      overall_quality: 'good',
      structural_issues_fixed: 2,
      cross_page_issues_fixed: 1,
      academic_improvements: 1,
      critical_errors: 0,
      remaining_concerns: []
    },
    rewrite_recommendation: {
      should_rewrite: false,
      reason: 'Edit operations are sufficient for quality improvement'
    }
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('processFinalDocument', () => {
    it('should successfully process document with edit operations', async () => {
      const assembledDoc = createMockAssembledDocument()
      const validationResult = createMockValidationResult()
      
      const mockEditOperations: EditOperation[] = [
        {
          type: 'replace',
          description: 'Add table caption',
          old_text: '<table>',
          new_text: '<table>\n  <caption>Table 1: Research Results</caption>'
        }
      ]
      
      const mockAIResponse = createMockAIResponse(mockEditOperations)
      
      finalDocumentRefinementPrompt.runWithRetry.mockResolvedValue({
        completion: JSON.stringify(mockAIResponse),
        usage: { totalTokens: 1500 }
      })

      const config: Partial<FinalProcessingConfig> = {
        maxEditOperations: 10,
        enableFallbackRewrite: true,
        validateBeforeApply: true
      }

      const result = await processFinalDocument(assembledDoc, validationResult, config)

      expect(result.success).toBe(true)
      expect(result.appliedOperations).toHaveLength(1)
      expect(result.appliedOperations[0].success).toBe(true)
      expect(result.refinedDocument).toContain('<caption>Table 1: Research Results</caption>')
      expect(result.qualityAssessment.overall_quality).toBe('good')
      expect(result.processingMetadata.aiCallsUsed).toBe(1)
      expect(result.processingMetadata.tokensUsed).toBe(1500)
    })

    it('should handle invalid edit operations gracefully', async () => {
      const assembledDoc = createMockAssembledDocument()
      
      const mockEditOperations: EditOperation[] = [
        {
          type: 'replace',
          description: 'Fix non-existent element',
          old_text: '<nonexistent>element</nonexistent>',
          new_text: '<div>fixed</div>'
        }
      ]
      
      const mockAIResponse = createMockAIResponse(mockEditOperations)
      
      finalDocumentRefinementPrompt.runWithRetry.mockResolvedValue({
        completion: JSON.stringify(mockAIResponse),
        usage: { totalTokens: 800 }
      })

      const result = await processFinalDocument(assembledDoc)

      expect(result.success).toBe(true) // Still successful despite failed operations
      expect(result.appliedOperations).toHaveLength(1)
      expect(result.appliedOperations[0].success).toBe(false)
      expect(result.appliedOperations[0].error).toContain('old_text not found')
      expect(result.warnings).toContain('1 edit operations failed validation')
    })

    it('should handle AI response with rewrite recommendation', async () => {
      const assembledDoc = createMockAssembledDocument()
      
      const mockAIResponse: FinalDocumentRefinementOutput = {
        edit_operations: [],
        quality_assessment: {
          overall_quality: 'needs_improvement',
          structural_issues_fixed: 0,
          cross_page_issues_fixed: 0,
          academic_improvements: 0,
          critical_errors: 5,
          remaining_concerns: ['Document structure is severely malformed']
        },
        rewrite_recommendation: {
          should_rewrite: true,
          reason: 'Document has fundamental structural problems that cannot be fixed with targeted edits'
        }
      }
      
      finalDocumentRefinementPrompt.runWithRetry.mockResolvedValue({
        completion: JSON.stringify(mockAIResponse)
      })

      const result = await processFinalDocument(assembledDoc)

      expect(result.success).toBe(true)
      expect(result.processingMetadata.usedFallbackRewrite).toBe(true)
      expect(result.warnings).toContain('AI recommended complete rewrite, but fallback rewrite is not yet implemented')
    })

    it('should handle AI processing failure with fallback', async () => {
      const assembledDoc = createMockAssembledDocument()
      
      finalDocumentRefinementPrompt.runWithRetry.mockRejectedValue(new Error('AI service unavailable'))

      const config: Partial<FinalProcessingConfig> = {
        enableFallbackRewrite: true
      }

      const result = await processFinalDocument(assembledDoc, undefined, config)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('AI refinement failed: AI service unavailable')
      expect(result.processingMetadata.usedFallbackRewrite).toBe(true)
      expect(result.refinedDocument).toBe(assembledDoc.htmlDocument) // Original document returned
    })

    it('should respect maxEditOperations configuration', async () => {
      const assembledDoc = createMockAssembledDocument()
      
      const mockEditOperations: EditOperation[] = [
        { type: 'replace', description: 'Edit 1', old_text: 'old1', new_text: 'new1' },
        { type: 'replace', description: 'Edit 2', old_text: 'old2', new_text: 'new2' },
        { type: 'replace', description: 'Edit 3', old_text: 'old3', new_text: 'new3' }
      ]
      
      const mockAIResponse = createMockAIResponse(mockEditOperations)
      
      finalDocumentRefinementPrompt.runWithRetry.mockResolvedValue({
        completion: JSON.stringify(mockAIResponse)
      })

      const config: Partial<FinalProcessingConfig> = {
        maxEditOperations: 2,
        validateBeforeApply: false // Skip validation to test limit only
      }

      const result = await processFinalDocument(assembledDoc, undefined, config)

      expect(result.warnings).toContain('Limited edit operations from 3 to 2')
      expect(result.processingMetadata.totalOperationsRequested).toBe(3)
      expect(result.appliedOperations).toHaveLength(2)
    })

    it('should handle malformed AI JSON response', async () => {
      const assembledDoc = createMockAssembledDocument()
      
      finalDocumentRefinementPrompt.runWithRetry.mockResolvedValue({
        completion: 'This is not valid JSON response'
      })

      const result = await processFinalDocument(assembledDoc)

      expect(result.success).toBe(false)
      expect(result.errors[0]).toContain('AI refinement failed')
    })

    it('should parse AI response from markdown code blocks', async () => {
      const assembledDoc = createMockAssembledDocument()
      
      const mockEditOperations: EditOperation[] = [
        {
          type: 'replace',
          description: 'Add heading ID',
          old_text: '<h1>Research Title</h1>',
          new_text: '<h1 id="research-title">Research Title</h1>'
        }
      ]
      
      const mockAIResponse = createMockAIResponse(mockEditOperations)
      
      finalDocumentRefinementPrompt.runWithRetry.mockResolvedValue({
        completion: `Here's the refinement analysis:

\`\`\`json
${JSON.stringify(mockAIResponse)}
\`\`\`

The document quality is good overall.`
      })

      const result = await processFinalDocument(assembledDoc)

      expect(result.success).toBe(true)
      expect(result.appliedOperations).toHaveLength(1)
      expect(result.refinedDocument).toContain('id="research-title"')
    })

    it('should process document without validation result', async () => {
      const assembledDoc = createMockAssembledDocument()
      
      const mockAIResponse = createMockAIResponse([])
      
      finalDocumentRefinementPrompt.runWithRetry.mockResolvedValue({
        completion: JSON.stringify(mockAIResponse)
      })

      const result = await processFinalDocument(assembledDoc) // No validation result

      expect(result.success).toBe(true)
      expect(result.appliedOperations).toHaveLength(0)
    })
  })

  describe('quickFinalProcessing', () => {
    it('should perform basic document cleanup', async () => {
      const assembledDoc = createMockAssembledDocument({
        htmlDocument: `<!DOCTYPE html>
<html>
<body>
  <p></p>
  <div>Content</div><section>Another section</section>
  <p>  </p>
  <div>Final content</div>
</body>
</html>`
      })

      const result = await quickFinalProcessing(assembledDoc)

      expect(result).not.toContain('<p></p>') // Empty paragraphs removed
      expect(result).not.toContain('<p>  </p>') // Whitespace-only paragraphs removed
      expect(result).toContain('<div>Content</div><section>') // Content preserved
      expect(result.length).toBeLessThan(assembledDoc.htmlDocument.length) // Document was cleaned
    })
  })

  describe('Edit Operation Utilities', () => {
    describe('validateEditOperations', () => {
      const testDocument = `<html><body><h1>Title</h1><p>Content</p></body></html>`

      it('should validate successful operations', () => {
        const operations: EditOperation[] = [
          {
            type: 'replace',
            description: 'Add ID to heading',
            old_text: '<h1>Title</h1>',
            new_text: '<h1 id="title">Title</h1>'
          }
        ]

        const result = validateEditOperations(operations, testDocument)

        expect(result.valid).toHaveLength(1)
        expect(result.invalid).toHaveLength(0)
      })

      it('should identify non-existent old_text', () => {
        const operations: EditOperation[] = [
          {
            type: 'replace',
            description: 'Replace non-existent element',
            old_text: '<h2>Nonexistent</h2>',
            new_text: '<h2 id="new">Nonexistent</h2>'
          }
        ]

        const result = validateEditOperations(operations, testDocument)

        expect(result.valid).toHaveLength(0)
        expect(result.invalid).toHaveLength(1)
        expect(result.invalid[0].reason).toBe('old_text not found in document')
      })

      it('should identify non-unique old_text', () => {
        const docWithDuplicates = `<html><body><p>Content</p><p>Content</p></body></html>`
        const operations: EditOperation[] = [
          {
            type: 'replace',
            description: 'Replace ambiguous text',
            old_text: '<p>Content</p>',
            new_text: '<p>Updated Content</p>'
          }
        ]

        const result = validateEditOperations(operations, docWithDuplicates)

        expect(result.valid).toHaveLength(0)
        expect(result.invalid).toHaveLength(1)
        expect(result.invalid[0].reason).toContain('matches 2 times - not unique enough')
      })
    })

    describe('applyEditOperations', () => {
      it('should apply single operation correctly', () => {
        const document = `<html><body><h1>Title</h1></body></html>`
        const operations: EditOperation[] = [
          {
            type: 'replace',
            description: 'Add ID',
            old_text: '<h1>Title</h1>',
            new_text: '<h1 id="title">Title</h1>'
          }
        ]

        const result = applyEditOperations(document, operations)

        expect(result).toBe(`<html><body><h1 id="title">Title</h1></body></html>`)
      })

      it('should apply multiple operations in sequence', () => {
        const document = `<html><body><h1>Title</h1><p>Content</p></body></html>`
        const operations: EditOperation[] = [
          {
            type: 'replace',
            description: 'Add ID to heading',
            old_text: '<h1>Title</h1>',
            new_text: '<h1 id="title">Title</h1>'
          },
          {
            type: 'replace',
            description: 'Add class to paragraph',
            old_text: '<p>Content</p>',
            new_text: '<p class="content">Content</p>'
          }
        ]

        const result = applyEditOperations(document, operations)

        expect(result).toContain('id="title"')
        expect(result).toContain('class="content"')
      })

      it('should handle empty new_text (deletion)', () => {
        const document = `<html><body><h1>Title</h1><p>Remove me</p></body></html>`
        const operations: EditOperation[] = [
          {
            type: 'replace',
            description: 'Remove paragraph',
            old_text: '<p>Remove me</p>',
            new_text: ''
          }
        ]

        const result = applyEditOperations(document, operations)

        expect(result).toBe(`<html><body><h1>Title</h1></body></html>`)
      })
    })
  })
})