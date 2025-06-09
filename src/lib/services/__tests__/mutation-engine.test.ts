import { MutationEngine } from '@/lib/services/mutation-engine'
import { generateHeadingMutation } from '@/lib/services/heading-mutation-generator'
import { Mutation } from '@/lib/types/mutation'
import { DocumentElement } from '@/lib/types/document'

describe('MutationEngine', () => {
  // Sample document for testing
  const createTestDocument = (): DocumentElement[] => [
    {
      id: 'doc-1',
      document_id: 'test-doc',
      parent_id: null,
      tag_name: 'h1',
      content: 'Introduction',
      attributes: {},
      position: 1,
      level: 0,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z'
    },
    {
      id: 'para-1',
      document_id: 'test-doc',
      parent_id: null,
      tag_name: 'p',
      content: 'First paragraph',
      attributes: {},
      position: 2,
      level: 0,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z'
    },
    {
      id: 'para-2',
      document_id: 'test-doc',
      parent_id: null,
      tag_name: 'p',
      content: 'Second paragraph',
      attributes: {},
      position: 3,
      level: 0,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z'
    }
  ]

  describe('applyMutation', () => {
    it('should apply insert transforms correctly', () => {
      const document = createTestDocument()
      const mutation: Mutation = {
        id: 'test-mutation-1',
        type: 'insert-headings',
        forward: [{
          action: 'insert',
          afterId: 'para-1',
          content: {
            id: 'ai-heading-1',
            tag_name: 'h2',
            content: 'AI Generated Heading',
            attributes: { 'data-ai-generated': 'true' }
          }
        }],
        reverse: [{
          action: 'remove',
          targetId: 'ai-heading-1'
        }]
      }

      const result = MutationEngine.applyMutation(document, mutation)
      
      expect(result.success).toBe(true)
      expect(result.document).toHaveLength(4)
      expect(result.changes).toEqual({
        inserted: 1,
        replaced: 0,
        removed: 0,
        modified: 0
      })

      const insertedElement = result.document?.find(el => el.id === 'ai-heading-1')
      expect(insertedElement).toBeDefined()
      expect(insertedElement?.tag_name).toBe('h2')
      expect(insertedElement?.content).toBe('AI Generated Heading')
      expect(insertedElement?.attributes?.['data-ai-generated']).toBe('true')
      expect(insertedElement?.position).toBe(3) // Should be after para-1 (position 2)
    })

    it('should apply replace transforms correctly', () => {
      const document = createTestDocument()
      const mutation: Mutation = {
        id: 'test-mutation-2',
        type: 'summarize-paragraphs',
        forward: [{
          action: 'replace',
          targetId: 'para-1',
          content: {
            content: 'Summarized first paragraph'
          },
          originalContent: {
            content: 'First paragraph'
          }
        }],
        reverse: [{
          action: 'replace',
          targetId: 'para-1',
          content: {
            content: 'First paragraph'
          }
        }]
      }

      const result = MutationEngine.applyMutation(document, mutation)
      
      expect(result.success).toBe(true)
      expect(result.document).toHaveLength(3)
      expect(result.changes).toEqual({
        inserted: 0,
        replaced: 1,
        removed: 0,
        modified: 0
      })

      const replacedElement = result.document?.find(el => el.id === 'para-1')
      expect(replacedElement?.content).toBe('Summarized first paragraph')
    })

    it('should apply remove transforms correctly', () => {
      const document = createTestDocument()
      const mutation: Mutation = {
        id: 'test-mutation-3',
        type: 'remove-element',
        forward: [{
          action: 'remove',
          targetId: 'para-1'
        }],
        reverse: [{
          action: 'insert',
          afterId: 'doc-1',
          content: {
            id: 'para-1',
            tag_name: 'p',
            content: 'First paragraph',
            position: 2
          }
        }]
      }

      const result = MutationEngine.applyMutation(document, mutation)
      
      expect(result.success).toBe(true)
      expect(result.document).toHaveLength(2)
      expect(result.changes).toEqual({
        inserted: 0,
        replaced: 0,
        removed: 1,
        modified: 0
      })

      expect(result.document?.find(el => el.id === 'para-1')).toBeUndefined()
      
      // Check that positions were updated
      const para2 = result.document?.find(el => el.id === 'para-2')
      expect(para2?.position).toBe(2) // Should have moved up
    })

    it('should apply modify transforms correctly', () => {
      const document = createTestDocument()
      const mutation: Mutation = {
        id: 'test-mutation-4',
        type: 'modify-attributes',
        forward: [{
          action: 'modify',
          targetId: 'para-1',
          attributes: {
            class: 'highlighted',
            'data-modified': 'true'
          }
        }],
        reverse: [{
          action: 'modify',
          targetId: 'para-1',
          attributes: {}
        }]
      }

      const result = MutationEngine.applyMutation(document, mutation)
      
      expect(result.success).toBe(true)
      expect(result.changes).toEqual({
        inserted: 0,
        replaced: 0,
        removed: 0,
        modified: 1
      })

      const modifiedElement = result.document?.find(el => el.id === 'para-1')
      expect(modifiedElement?.attributes?.class).toBe('highlighted')
      expect(modifiedElement?.attributes?.['data-modified']).toBe('true')
    })

    it('should handle multiple transforms in sequence', () => {
      const document = createTestDocument()
      const mutation: Mutation = {
        id: 'test-mutation-5',
        type: 'complex-mutation',
        forward: [
          {
            action: 'insert',
            afterId: 'para-1',
            content: {
              id: 'ai-heading-1',
              tag_name: 'h2',
              content: 'New Section'
            }
          },
          {
            action: 'replace',
            targetId: 'para-2',
            content: {
              content: 'Updated second paragraph'
            }
          }
        ],
        reverse: [
          {
            action: 'remove',
            targetId: 'ai-heading-1'
          },
          {
            action: 'replace',
            targetId: 'para-2',
            content: {
              content: 'Second paragraph'
            }
          }
        ]
      }

      const result = MutationEngine.applyMutation(document, mutation)
      
      expect(result.success).toBe(true)
      expect(result.document).toHaveLength(4)
      expect(result.changes).toEqual({
        inserted: 1,
        replaced: 1,
        removed: 0,
        modified: 0
      })
    })

    it('should return error for invalid element references', () => {
      const document = createTestDocument()
      const mutation: Mutation = {
        id: 'test-mutation-6',
        type: 'invalid-mutation',
        forward: [{
          action: 'insert',
          afterId: 'non-existent-id',
          content: {
            id: 'new-element',
            content: 'New content'
          }
        }],
        reverse: []
      }

      const result = MutationEngine.applyMutation(document, mutation)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('element not found')
      expect(result.document).toBeUndefined()
    })
  })

  describe('revertMutation', () => {
    it('should revert inserted elements', () => {
      const document = createTestDocument()
      
      // First, add an element
      document.splice(2, 0, {
        id: 'ai-heading-1',
        document_id: 'test-doc',
        parent_id: null,
        tag_name: 'h2',
        content: 'AI Heading',
        attributes: { 'data-ai-generated': 'true' },
        position: 3,
        level: 0,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      })
      
      // Update positions
      document[3].position = 4

      const mutation: Mutation = {
        id: 'test-mutation-7',
        type: 'insert-headings',
        forward: [],
        reverse: [{
          action: 'remove',
          targetId: 'ai-heading-1'
        }]
      }

      const result = MutationEngine.revertMutation(document, mutation)
      
      expect(result.success).toBe(true)
      expect(result.document).toHaveLength(3)
      expect(result.document?.find(el => el.id === 'ai-heading-1')).toBeUndefined()
    })

    it('should revert replaced content', () => {
      const document = createTestDocument()
      
      // First, modify content
      document[1].content = 'Summarized content'

      const mutation: Mutation = {
        id: 'test-mutation-8',
        type: 'summarize-paragraphs',
        forward: [],
        reverse: [{
          action: 'replace',
          targetId: 'para-1',
          content: {
            content: 'First paragraph'
          }
        }]
      }

      const result = MutationEngine.revertMutation(document, mutation)
      
      expect(result.success).toBe(true)
      const revertedElement = result.document?.find(el => el.id === 'para-1')
      expect(revertedElement?.content).toBe('First paragraph')
    })
  })

  describe('validateMutation', () => {
    it('should validate mutation with valid references', () => {
      const document = createTestDocument()
      const mutation: Mutation = {
        id: 'test-mutation-9',
        type: 'valid-mutation',
        forward: [
          {
            action: 'insert',
            afterId: 'para-1',
            content: { id: 'new-1' }
          },
          {
            action: 'replace',
            targetId: 'para-2',
            content: { content: 'new content' }
          }
        ],
        reverse: []
      }

      const validation = MutationEngine.validateMutation(document, mutation)
      
      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should detect invalid element references', () => {
      const document = createTestDocument()
      const mutation: Mutation = {
        id: 'test-mutation-10',
        type: 'invalid-mutation',
        forward: [
          {
            action: 'insert',
            afterId: 'non-existent',
            content: { id: 'new-1' }
          },
          {
            action: 'replace',
            targetId: 'also-non-existent',
            content: { content: 'new content' }
          }
        ],
        reverse: []
      }

      const validation = MutationEngine.validateMutation(document, mutation)
      
      expect(validation.valid).toBe(false)
      expect(validation.errors).toHaveLength(2)
      expect(validation.errors[0]).toContain('non-existent')
      expect(validation.errors[1]).toContain('also-non-existent')
    })
  })

  describe('edge cases', () => {
    it('should handle empty document gracefully', () => {
      const emptyDoc: DocumentElement[] = []
      const mutation: Mutation = {
        id: 'test-mutation-11',
        type: 'insert-headings',
        forward: [{
          action: 'insert',
          afterId: 'any-id',
          content: { id: 'new-1' }
        }],
        reverse: []
      }

      const result = MutationEngine.applyMutation(emptyDoc, mutation)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('element not found')
    })

    it('should handle position updates correctly for siblings', () => {
      const document: DocumentElement[] = [
        {
          id: 'parent-1',
          document_id: 'test-doc',
          parent_id: null,
          tag_name: 'div',
          content: '',
          attributes: {},
          position: 1,
          level: 0,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z'
        },
        {
          id: 'child-1',
          document_id: 'test-doc',
          parent_id: 'parent-1',
          tag_name: 'p',
          content: 'Child 1',
          attributes: {},
          position: 1,
          level: 1,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z'
        },
        {
          id: 'child-2',
          document_id: 'test-doc',
          parent_id: 'parent-1',
          tag_name: 'p',
          content: 'Child 2',
          attributes: {},
          position: 2,
          level: 1,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z'
        },
        {
          id: 'child-3',
          document_id: 'test-doc',
          parent_id: 'parent-1',
          tag_name: 'p',
          content: 'Child 3',
          attributes: {},
          position: 3,
          level: 1,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z'
        }
      ]

      const mutation: Mutation = {
        id: 'test-mutation-12',
        type: 'remove-child',
        forward: [{
          action: 'remove',
          targetId: 'child-2'
        }],
        reverse: []
      }

      const result = MutationEngine.applyMutation(document, mutation)
      
      expect(result.success).toBe(true)
      expect(result.document).toHaveLength(3)
      
      // Check that only siblings had positions updated
      const parent = result.document?.find(el => el.id === 'parent-1')
      const child1 = result.document?.find(el => el.id === 'child-1')
      const child3 = result.document?.find(el => el.id === 'child-3')
      
      expect(parent?.position).toBe(1) // Parent position unchanged
      expect(child1?.position).toBe(1) // Child before removed element unchanged
      expect(child3?.position).toBe(2) // Child after removed element moved up
    })

    it('should handle multiple inserts at same insertion point', () => {
      const document = createTestDocument()
      const mutation: Mutation = {
        id: 'test-mutation-13',
        type: 'multiple-inserts',
        forward: [
          {
            action: 'insert',
            afterId: 'para-1',
            content: {
              id: 'heading-1',
              tag_name: 'h1',
              content: 'Heading 1',
              attributes: { 'data-ai-generated': 'true' }
            }
          },
          {
            action: 'insert',
            afterId: 'para-1',
            content: {
              id: 'heading-2',
              tag_name: 'h2',
              content: 'Heading 2',
              attributes: { 'data-ai-generated': 'true' }
            }
          },
          {
            action: 'insert',
            afterId: 'para-1',
            content: {
              id: 'heading-3',
              tag_name: 'h3',
              content: 'Heading 3',
              attributes: { 'data-ai-generated': 'true' }
            }
          }
        ],
        reverse: [
          { action: 'remove', targetId: 'heading-1' },
          { action: 'remove', targetId: 'heading-2' },
          { action: 'remove', targetId: 'heading-3' }
        ]
      }

      const result = MutationEngine.applyMutation(document, mutation)
      
      expect(result.success).toBe(true)
      expect(result.document).toHaveLength(6)
      expect(result.changes).toEqual({
        inserted: 3,
        replaced: 0,
        removed: 0,
        modified: 0
      })

      // Verify AI-generated headings are properly marked
      const aiHeadings = result.document?.filter(el => el.attributes?.['data-ai-generated'] === 'true')
      expect(aiHeadings).toHaveLength(3)
    })

    it('should fail when trying to revert non-existent element', () => {
      const document = createTestDocument()
      const mutation: Mutation = {
        id: 'test-mutation-14',
        type: 'invalid-revert',
        forward: [],
        reverse: [{
          action: 'remove',
          targetId: 'non-existent-element'
        }]
      }

      const result = MutationEngine.revertMutation(document, mutation)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('non-existent element')
    })

    it('should fail with mixed valid and invalid insertion points', () => {
      const document = createTestDocument()
      const mutation: Mutation = {
        id: 'test-mutation-15',
        type: 'mixed-validity',
        forward: [
          {
            action: 'insert',
            afterId: 'para-1', // exists
            content: {
              id: 'valid-heading',
              tag_name: 'h2',
              content: 'Valid Heading'
            }
          },
          {
            action: 'insert',
            afterId: 'non-existent', // doesn't exist
            content: {
              id: 'invalid-heading',
              tag_name: 'h2',
              content: 'Invalid Heading'
            }
          }
        ],
        reverse: []
      }

      const result = MutationEngine.applyMutation(document, mutation)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('element not found')
    })

    it('should work with document containing only headings', () => {
      const headingsOnlyDoc: DocumentElement[] = [
        {
          id: 'h1-1',
          document_id: 'test-doc',
          parent_id: null,
          tag_name: 'h1',
          content: 'Main Title',
          attributes: {},
          position: 1,
          level: 0,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z'
        },
        {
          id: 'h2-1',
          document_id: 'test-doc',
          parent_id: null,
          tag_name: 'h2',
          content: 'Subtitle',
          attributes: {},
          position: 2,
          level: 0,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z'
        }
      ]

      const mutation: Mutation = {
        id: 'test-mutation-16',
        type: 'heading-after-heading',
        forward: [{
          action: 'insert',
          afterId: 'h1-1',
          content: {
            id: 'new-section',
            tag_name: 'h2',
            content: 'New Section After Title',
            attributes: { 'data-ai-generated': 'true' }
          }
        }],
        reverse: [{
          action: 'remove',
          targetId: 'new-section'
        }]
      }

      const result = MutationEngine.applyMutation(headingsOnlyDoc, mutation)
      
      expect(result.success).toBe(true)
      expect(result.document).toHaveLength(3)
      expect(result.document?.find(el => el.id === 'new-section')).toBeDefined()
    })

    it('should handle complete roundtrip with AI heading verification', () => {
      const document = createTestDocument()
      const mutation: Mutation = {
        id: 'test-mutation-17',
        type: 'ai-heading-roundtrip',
        forward: [
          {
            action: 'insert',
            afterId: 'para-1',
            content: {
              id: 'ai-section-1',
              tag_name: 'h2',
              content: 'Background and Context',
              attributes: { 'data-ai-generated': 'true' }
            }
          },
          {
            action: 'insert',
            afterId: 'para-2',
            content: {
              id: 'ai-section-2',
              tag_name: 'h3',
              content: 'Key Findings',
              attributes: { 'data-ai-generated': 'true' }
            }
          }
        ],
        reverse: [
          { action: 'remove', targetId: 'ai-section-1' },
          { action: 'remove', targetId: 'ai-section-2' }
        ]
      }

      // Apply mutation
      const applyResult = MutationEngine.applyMutation(document, mutation)
      
      expect(applyResult.success).toBe(true)
      expect(applyResult.document).toHaveLength(5)

      // Verify AI headings are properly marked
      const aiHeadings = applyResult.document?.filter(el => el.attributes?.['data-ai-generated'] === 'true')
      expect(aiHeadings).toHaveLength(2)
      expect(aiHeadings?.map(h => h.content)).toEqual(['Background and Context', 'Key Findings'])

      // Revert mutation
      const revertResult = MutationEngine.revertMutation(applyResult.document!, mutation)
      
      expect(revertResult.success).toBe(true)
      expect(revertResult.document).toHaveLength(3)

      // Verify complete restoration to original state
      const isIdentical = revertResult.document?.length === document.length &&
        revertResult.document?.every(el => document.some(orig => 
          orig.id === el.id && 
          orig.content === el.content &&
          orig.tag_name === el.tag_name &&
          orig.position === el.position
        ))
      
      expect(isIdentical).toBe(true)
    })
  })

  describe('heading mutation generator edge cases', () => {
    it('should throw error for invalid heading HTML format', () => {
      expect(() => {
        generateHeadingMutation({
          headings: [{
            id_of_after: 'para-1',
            html: 'Not valid HTML tags'  // Missing <h> tags
          }],
          documentId: 'test-doc'
        })
      }).toThrow('Invalid heading HTML format')
    })

    it('should throw error for malformed heading tags', () => {
      expect(() => {
        generateHeadingMutation({
          headings: [{
            id_of_after: 'para-1',
            html: '<h2>Unclosed heading'  // Missing closing tag
          }],
          documentId: 'test-doc'
        })
      }).toThrow('Invalid heading HTML format')
    })

    it('should handle empty heading content', () => {
      const document = createTestDocument()
      
      const mutation = generateHeadingMutation({
        headings: [{
          id_of_after: 'para-1',
          html: '<h1></h1>'  // Empty heading content
        }],
        documentId: 'test-doc'
      })
      
      const result = MutationEngine.applyMutation(document, mutation)
      expect(result.success).toBe(true)
      
      const insertedHeading = result.document?.find(el => el.content === '')
      expect(insertedHeading).toBeDefined()
      expect(insertedHeading?.tag_name).toBe('h1')
    })

    it('should handle heading content with special characters', () => {
      const document = createTestDocument()
      
      const mutation = generateHeadingMutation({
        headings: [{
          id_of_after: 'para-1',
          html: '<h2>Section with "quotes" & special chars</h2>'
        }],
        documentId: 'test-doc'
      })
      
      const result = MutationEngine.applyMutation(document, mutation)
      expect(result.success).toBe(true)
      
      const insertedHeading = result.document?.find(el => el.content.includes('quotes'))
      expect(insertedHeading).toBeDefined()
      expect(insertedHeading?.content).toBe('Section with "quotes" & special chars')
    })
  })

  describe('performance', () => {
    it('should handle large documents efficiently', () => {
      // Create a document with 1000 elements
      const largeDoc: DocumentElement[] = []
      for (let i = 0; i < 1000; i++) {
        largeDoc.push({
          id: `element-${i}`,
          document_id: 'test-doc',
          parent_id: null,
          tag_name: 'p',
          content: `Paragraph ${i}`,
          attributes: {},
          position: i + 1,
          level: 0,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z'
        })
      }

      const mutation: Mutation = {
        id: 'test-mutation-13',
        type: 'bulk-insert',
        forward: [],
        reverse: []
      }

      // Add 10 transforms
      for (let i = 0; i < 10; i++) {
        mutation.forward.push({
          action: 'insert',
          afterId: `element-${i * 100}`,
          content: {
            id: `ai-heading-${i}`,
            tag_name: 'h2',
            content: `AI Heading ${i}`
          }
        })
      }

      const startTime = Date.now()
      const result = MutationEngine.applyMutation(largeDoc, mutation)
      const endTime = Date.now()

      expect(result.success).toBe(true)
      expect(result.document).toHaveLength(1010)
      expect(endTime - startTime).toBeLessThan(100) // Should complete in under 100ms
    })
  })
})