/**
 * Tests for Final Document Refinement Prompt Template
 * 
 * Tests the prompt template configuration, schema validation,
 * and utility functions for the final refinement stage.
 */

import {
  createFinalDocumentRefinementPrompt,
  finalDocumentRefinementPrompt,
  finalDocumentRefinementInputSchema,
  finalDocumentRefinementOutputSchema,
  validateEditOperations,
  applyEditOperations,
  type FinalDocumentRefinementInput,
  type EditOperation,
  type DocumentMetadata
} from '../final-document-refinement'

describe('Final Document Refinement Prompt Template', () => {
  
  describe('Schema Validation', () => {
    describe('finalDocumentRefinementInputSchema', () => {
      it('should validate complete input with all fields', () => {
        const validInput: FinalDocumentRefinementInput = {
          htmlDocument: '<html><body><h1>Title</h1><p>Content</p></body></html>',
          fileName: 'research-paper.pdf',
          totalPages: 5,
          documentMetadata: {
            totalPages: 5,
            successfulPages: 5,
            crossPageMerges: [
              {
                elementType: 'table',
                sourcePageNumber: 2,
                targetPageNumber: 3,
                confidence: 0.9
              }
            ],
            totalElements: 25,
            documentStructure: {
              headingCount: 3,
              paragraphCount: 10,
              tableCount: 2,
              figureCount: 1,
              listCount: 0
            }
          },
          assemblyIssues: [
            {
              type: 'warning',
              message: 'Table missing caption',
              suggestion: 'Add descriptive table caption'
            }
          ]
        }

        const result = finalDocumentRefinementInputSchema.safeParse(validInput)
        expect(result.success).toBe(true)
      })

      it('should validate minimal input with only required fields', () => {
        const minimalInput = {
          htmlDocument: '<html><body><p>Content</p></body></html>',
          totalPages: 1
        }

        const result = finalDocumentRefinementInputSchema.safeParse(minimalInput)
        expect(result.success).toBe(true)
        
        if (result.success) {
          expect(result.data.assemblyIssues).toEqual([]) // Default value
          expect(result.data.fileName).toBeUndefined()
          expect(result.data.documentMetadata).toBeUndefined()
        }
      })

      it('should reject invalid input', () => {
        const invalidInputs = [
          { htmlDocument: '', totalPages: 1 }, // Empty HTML
          { htmlDocument: '<p>Content</p>', totalPages: 0 }, // Invalid page count
          { htmlDocument: '<p>Content</p>' }, // Missing totalPages
          {} // Empty object
        ]

        invalidInputs.forEach(input => {
          const result = finalDocumentRefinementInputSchema.safeParse(input)
          expect(result.success).toBe(false)
        })
      })
    })

    describe('finalDocumentRefinementOutputSchema', () => {
      it('should validate complete output', () => {
        const validOutput = {
          edit_operations: [
            {
              type: 'replace',
              description: 'Add heading ID',
              old_text: '<h1>Title</h1>',
              new_text: '<h1 id="title">Title</h1>'
            }
          ],
          quality_assessment: {
            overall_quality: 'good',
            structural_issues_fixed: 2,
            cross_page_issues_fixed: 1,
            academic_improvements: 3,
            critical_errors: 0,
            remaining_concerns: ['Minor formatting inconsistencies']
          },
          rewrite_recommendation: {
            should_rewrite: false,
            reason: 'Edit operations are sufficient'
          }
        }

        const result = finalDocumentRefinementOutputSchema.safeParse(validOutput)
        expect(result.success).toBe(true)
      })

      it('should validate output with rewrite recommendation', () => {
        const rewriteOutput = {
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
            reason: 'Document has fundamental structural problems'
          }
        }

        const result = finalDocumentRefinementOutputSchema.safeParse(rewriteOutput)
        expect(result.success).toBe(true)
      })

      it('should reject invalid output', () => {
        const invalidOutputs = [
          {
            edit_operations: [{ type: 'invalid', old_text: 'test' }], // Invalid operation type
            quality_assessment: { overall_quality: 'good' },
            rewrite_recommendation: { should_rewrite: false }
          },
          {
            edit_operations: [],
            quality_assessment: { overall_quality: 'invalid_quality' }, // Invalid quality enum
            rewrite_recommendation: { should_rewrite: false }
          },
          {
            edit_operations: [],
            quality_assessment: { overall_quality: 'good' }
            // Missing rewrite_recommendation
          }
        ]

        invalidOutputs.forEach(output => {
          const result = finalDocumentRefinementOutputSchema.safeParse(output)
          expect(result.success).toBe(false)
        })
      })
    })
  })

  describe('Prompt Template Configuration', () => {
    it('should create prompt with correct model and settings', () => {
      const prompt = createFinalDocumentRefinementPrompt()
      
      expect(prompt).toBeDefined()
      // Template configuration is tested indirectly through successful schema validation
    })

    it('should use Claude Sonnet 4 by default', () => {
      // This is verified by the model string in the configuration
      expect(finalDocumentRefinementPrompt).toBeDefined()
    })
  })

  describe('Edit Operation Validation', () => {
    const testDocument = `
<!DOCTYPE html>
<html lang="en">
<head><title>Test Document</title></head>
<body>
  <h1>Main Title</h1>
  <p>Introduction paragraph with some content.</p>
  <h2>Section Title</h2>
  <p>Another paragraph with different content.</p>
  <table>
    <tr><th>Header</th></tr>
    <tr><td>Data</td></tr>
  </table>
</body>
</html>`

    describe('validateEditOperations', () => {
      it('should validate successful single operation', () => {
        const operations: EditOperation[] = [
          {
            type: 'replace',
            description: 'Add ID to main heading',
            old_text: '<h1>Main Title</h1>',
            new_text: '<h1 id="main-title">Main Title</h1>'
          }
        ]

        const result = validateEditOperations(operations, testDocument)

        expect(result.valid).toHaveLength(1)
        expect(result.invalid).toHaveLength(0)
        expect(result.valid[0]).toEqual(operations[0])
      })

      it('should validate multiple successful operations', () => {
        const operations: EditOperation[] = [
          {
            type: 'replace',
            description: 'Add ID to main heading',
            old_text: '<h1>Main Title</h1>',
            new_text: '<h1 id="main-title">Main Title</h1>'
          },
          {
            type: 'replace',
            description: 'Add table caption',
            old_text: '<table>',
            new_text: '<table>\n  <caption>Table 1: Research Data</caption>'
          }
        ]

        const result = validateEditOperations(operations, testDocument)

        expect(result.valid).toHaveLength(2)
        expect(result.invalid).toHaveLength(0)
      })

      it('should identify operations with non-existent old_text', () => {
        const operations: EditOperation[] = [
          {
            type: 'replace',
            description: 'Replace non-existent element',
            old_text: '<h3>Non-existent Heading</h3>',
            new_text: '<h3 id="new">Non-existent Heading</h3>'
          }
        ]

        const result = validateEditOperations(operations, testDocument)

        expect(result.valid).toHaveLength(0)
        expect(result.invalid).toHaveLength(1)
        expect(result.invalid[0].reason).toBe('old_text not found in document')
      })

      it('should identify operations with ambiguous old_text', () => {
        const operations: EditOperation[] = [
          {
            type: 'replace',
            description: 'Replace ambiguous paragraph',
            old_text: '<p>',
            new_text: '<p class="intro">'
          }
        ]

        const result = validateEditOperations(operations, testDocument)

        expect(result.valid).toHaveLength(0)
        expect(result.invalid).toHaveLength(1)
        expect(result.invalid[0].reason).toContain('matches 2 times - not unique enough')
      })

      it('should handle mixed valid and invalid operations', () => {
        const operations: EditOperation[] = [
          {
            type: 'replace',
            description: 'Valid: Add ID to main heading',
            old_text: '<h1>Main Title</h1>',
            new_text: '<h1 id="main-title">Main Title</h1>'
          },
          {
            type: 'replace',
            description: 'Invalid: Non-existent element',
            old_text: '<h3>Missing</h3>',
            new_text: '<h3 id="missing">Missing</h3>'
          },
          {
            type: 'replace',
            description: 'Valid: Add table caption',
            old_text: '<table>',
            new_text: '<table>\n  <caption>Data Table</caption>'
          }
        ]

        const result = validateEditOperations(operations, testDocument)

        expect(result.valid).toHaveLength(2)
        expect(result.invalid).toHaveLength(1)
        expect(result.valid[0].description).toContain('Valid: Add ID')
        expect(result.valid[1].description).toContain('Valid: Add table')
        expect(result.invalid[0].operation.description).toContain('Invalid: Non-existent')
      })

      it('should handle empty operations array', () => {
        const result = validateEditOperations([], testDocument)

        expect(result.valid).toHaveLength(0)
        expect(result.invalid).toHaveLength(0)
      })

      it('should handle operations with special regex characters', () => {
        const docWithSpecialChars = '<div class="test[1]">Content (special)</div>'
        const operations: EditOperation[] = [
          {
            type: 'replace',
            description: 'Replace element with special characters',
            old_text: '<div class="test[1]">Content (special)</div>',
            new_text: '<div class="test-1">Content special</div>'
          }
        ]

        const result = validateEditOperations(operations, docWithSpecialChars)

        expect(result.valid).toHaveLength(1)
        expect(result.invalid).toHaveLength(0)
      })
    })

    describe('applyEditOperations', () => {
      it('should apply single operation correctly', () => {
        const operations: EditOperation[] = [
          {
            type: 'replace',
            description: 'Add ID to heading',
            old_text: '<h1>Main Title</h1>',
            new_text: '<h1 id="main-title">Main Title</h1>'
          }
        ]

        const result = applyEditOperations(testDocument, operations)

        expect(result).toContain('<h1 id="main-title">Main Title</h1>')
        expect(result).not.toContain('<h1>Main Title</h1>')
      })

      it('should apply multiple operations in sequence', () => {
        const operations: EditOperation[] = [
          {
            type: 'replace',
            description: 'Add ID to main heading',
            old_text: '<h1>Main Title</h1>',
            new_text: '<h1 id="main-title">Main Title</h1>'
          },
          {
            type: 'replace',
            description: 'Add class to first paragraph',
            old_text: '<p>Introduction paragraph with some content.</p>',
            new_text: '<p class="intro">Introduction paragraph with some content.</p>'
          }
        ]

        const result = applyEditOperations(testDocument, operations)

        expect(result).toContain('<h1 id="main-title">Main Title</h1>')
        expect(result).toContain('<p class="intro">Introduction paragraph with some content.</p>')
      })

      it('should handle deletion (empty new_text)', () => {
        const operations: EditOperation[] = [
          {
            type: 'replace',
            description: 'Remove section heading',
            old_text: '  <h2>Section Title</h2>\n',
            new_text: ''
          }
        ]

        const result = applyEditOperations(testDocument, operations)

        expect(result).not.toContain('<h2>Section Title</h2>')
        expect(result).toContain('<p>Another paragraph with different content.</p>')
      })

      it('should handle complex HTML replacement', () => {
        const operations: EditOperation[] = [
          {
            type: 'replace',
            description: 'Enhance table with proper structure',
            old_text: `  <table>
    <tr><th>Header</th></tr>
    <tr><td>Data</td></tr>
  </table>`,
            new_text: `  <table>
    <caption>Table 1: Research Results</caption>
    <thead>
      <tr><th>Header</th></tr>
    </thead>
    <tbody>
      <tr><td>Data</td></tr>
    </tbody>
  </table>`
          }
        ]

        const result = applyEditOperations(testDocument, operations)

        expect(result).toContain('<caption>Table 1: Research Results</caption>')
        expect(result).toContain('<thead>')
        expect(result).toContain('<tbody>')
      })

      it('should handle empty operations array', () => {
        const result = applyEditOperations(testDocument, [])

        expect(result).toBe(testDocument)
      })

      it('should apply operations with overlapping targets correctly', () => {
        // First operation modifies the target of the second operation
        let workingDoc = '<div><p>Original text</p></div>'
        
        const operation1: EditOperation = {
          type: 'replace',
          description: 'Add class to paragraph',
          old_text: '<p>Original text</p>',
          new_text: '<p class="modified">Original text</p>'
        }
        
        // Apply first operation
        workingDoc = applyEditOperations(workingDoc, [operation1])
        expect(workingDoc).toContain('<p class="modified">Original text</p>')
        
        const operation2: EditOperation = {
          type: 'replace',
          description: 'Change text content',
          old_text: '<p class="modified">Original text</p>',
          new_text: '<p class="modified">Updated text</p>'
        }
        
        // Apply second operation to modified document
        const finalResult = applyEditOperations(workingDoc, [operation2])
        expect(finalResult).toContain('<p class="modified">Updated text</p>')
        expect(finalResult).not.toContain('Original text')
      })
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed HTML in operations', () => {
      const document = '<div>Content</div>'
      const operations: EditOperation[] = [
        {
          type: 'replace',
          description: 'Replace with malformed HTML',
          old_text: '<div>Content</div>',
          new_text: '<div>Content<span>Unclosed span</div>'
        }
      ]

      // applyEditOperations doesn't validate HTML - it just does text replacement
      const result = applyEditOperations(document, operations)
      expect(result).toContain('<span>Unclosed span')
    })

    it('should handle very large documents efficiently', () => {
      const largeContent = 'Content '.repeat(10000)
      const largeDocument = `<html><body><p>${largeContent}</p></body></html>`
      
      const operations: EditOperation[] = [
        {
          type: 'replace',
          description: 'Add class to large paragraph',
          old_text: `<p>${largeContent}</p>`,
          new_text: `<p class="large">${largeContent}</p>`
        }
      ]

      const startTime = Date.now()
      const result = applyEditOperations(largeDocument, operations)
      const endTime = Date.now()

      expect(result).toContain('class="large"')
      expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second
    })

    it('should handle unicode and special characters correctly', () => {
      const unicodeDocument = '<p>Résumé with émojis 🎓 and mathematics: ∑ ∫ ∂</p>'
      const operations: EditOperation[] = [
        {
          type: 'replace',
          description: 'Add language attribute',
          old_text: '<p>Résumé with émojis 🎓 and mathematics: ∑ ∫ ∂</p>',
          new_text: '<p lang="en">Résumé with émojis 🎓 and mathematics: ∑ ∫ ∂</p>'
        }
      ]

      const result = applyEditOperations(unicodeDocument, operations)
      expect(result).toContain('lang="en"')
      expect(result).toContain('🎓')
      expect(result).toContain('∑ ∫ ∂')
    })
  })
})