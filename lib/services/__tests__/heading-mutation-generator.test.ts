import { generateHeadingMutation, extractHeadingsFromMutation } from '../heading-mutation-generator'
import { generateContentBasedId } from '../deterministicId'

// Mock deterministic ID generation for predictable tests
jest.mock('../deterministicId')
const mockedGenerateContentBasedId = generateContentBasedId as jest.MockedFunction<typeof generateContentBasedId>

describe('heading-mutation-generator', () => {
  const mockDocumentId = 'test-doc-123'
  const mockMutationId = 'test-mutation-456'
  
  beforeEach(() => {
    jest.clearAllMocks()
    // Setup deterministic ID generation for predictable tests
    mockedGenerateContentBasedId.mockImplementation((docId, type, content) => {
      return `${type}-${content.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`
    })
  })

  describe('generateHeadingMutation', () => {
    describe('single heading scenarios', () => {
      it('should generate mutation for single heading', () => {
        const headings = [
          { insertNewBeforeExistingId: 'para-123', html: '<h2>Introduction</h2>' }
        ]

        const result = generateHeadingMutation({
          headings,
          documentId: mockDocumentId,
          mutationId: mockMutationId
        })

        expect(result.id).toBe(mockMutationId)
        expect(result.type).toBe('insert-headings')
        expect(result.forward).toHaveLength(1)
        expect(result.reverse).toHaveLength(1)
        
        const forwardTransform = result.forward[0]!
        expect(forwardTransform.action).toBe('insert')
        expect(forwardTransform.insertNewBeforeExistingId).toBe('para-123')
        expect(forwardTransform.content?.tag_name).toBe('h2')
        expect(forwardTransform.content?.content).toBe('Introduction')
      })

      it('should handle different heading levels', () => {
        const headings = [
          { insertNewBeforeExistingId: 'para-1', html: '<h1>Chapter 1</h1>' },
          { insertNewBeforeExistingId: 'para-2', html: '<h3>Subsection</h3>' },
          { insertNewBeforeExistingId: 'para-3', html: '<h6>Deep Heading</h6>' }
        ]

        const result = generateHeadingMutation({
          headings,
          documentId: mockDocumentId,
          mutationId: mockMutationId
        })

        expect(result.forward).toHaveLength(3)
        expect(result.forward[0]!.content?.tag_name).toBe('h1')
        expect(result.forward[1]!.content?.tag_name).toBe('h3')
        expect(result.forward[2]!.content?.tag_name).toBe('h6')
      })
    })

    describe('grouped insertion scenarios - CORE FUNCTIONALITY', () => {
      it('should handle multiple headings targeting same insertion point with precedence ordering', () => {
        const headings = [
          { insertNewBeforeExistingId: 'para-123', html: '<h2>Main Topic</h2>' },
          { insertNewBeforeExistingId: 'para-123', html: '<h3>Subtopic</h3>' }
        ]

        const result = generateHeadingMutation({
          headings,
          documentId: mockDocumentId,
          mutationId: mockMutationId
        })

        expect(result.forward).toHaveLength(2)
        
        // First heading should target original element
        const firstTransform = result.forward[0]!
        expect(firstTransform.insertNewBeforeExistingId).toBe('para-123')
        expect(firstTransform.content?.content).toBe('Main Topic')
        
        // All headings should target the original element (non-chaining approach)
        const secondTransform = result.forward[1]!
        expect(secondTransform.insertNewBeforeExistingId).toBe(firstTransform.content?.id)
        expect(secondTransform.content?.content).toBe('Subtopic')
        
        // Verify precedence creates correct order: H2 → H3 → para-123
        expect(secondTransform.insertNewBeforeExistingId).toMatch(/^heading-/)
      })

      it('should handle three headings targeting same point with correct precedence ordering', () => {
        const headings = [
          { insertNewBeforeExistingId: 'para-xyz', html: '<h2>Chapter</h2>' },
          { insertNewBeforeExistingId: 'para-xyz', html: '<h3>Section</h3>' },
          { insertNewBeforeExistingId: 'para-xyz', html: '<h4>Subsection</h4>' }
        ]

        const result = generateHeadingMutation({
          headings,
          documentId: mockDocumentId,
          mutationId: mockMutationId
        })

        expect(result.forward).toHaveLength(3)
        
        const [first, second, third] = result.forward
        
        // First targets original
        expect(first!.insertNewBeforeExistingId).toBe('para-xyz')
        expect(first!.content?.content).toBe('Chapter')
        
        // Second targets first's ID
        expect(second!.insertNewBeforeExistingId).toBe(first!.content?.id)
        expect(second!.content?.content).toBe('Section')
        
        // Third targets second's ID
        expect(third!.insertNewBeforeExistingId).toBe(second!.content?.id)
        expect(third!.content?.content).toBe('Subsection')
        
        // Verify chain: Chapter → Section → Subsection → para-xyz
        expect(third!.insertNewBeforeExistingId).not.toBe('para-xyz')
        expect(third!.insertNewBeforeExistingId).not.toBe(first!.content?.id)
      })
    })

    describe('mixed scenarios - some grouped, some independent', () => {
      it('should handle mixed insertion points correctly', () => {
        const headings = [
          { insertNewBeforeExistingId: 'para-1', html: '<h2>Topic A</h2>' },
          { insertNewBeforeExistingId: 'para-1', html: '<h3>Topic A Sub</h3>' },
          { insertNewBeforeExistingId: 'para-2', html: '<h2>Topic B</h2>' },
          { insertNewBeforeExistingId: 'para-3', html: '<h2>Topic C</h2>' }
        ]

        const result = generateHeadingMutation({
          headings,
          documentId: mockDocumentId,
          mutationId: mockMutationId
        })

        expect(result.forward).toHaveLength(4)
        
        const [first, second, third, fourth] = result.forward
        
        // First group: para-1 should have chained headings
        expect(first!.insertNewBeforeExistingId).toBe('para-1')
        expect(second!.insertNewBeforeExistingId).toBe(first!.content?.id) // Chains to first heading
        
        // Independent insertions
        expect(third!.insertNewBeforeExistingId).toBe('para-2')
        expect(fourth!.insertNewBeforeExistingId).toBe('para-3')
      })

      it('should handle complex hierarchies with multiple chains', () => {
        const headings = [
          { insertNewBeforeExistingId: 'section-1', html: '<h2>Chapter 1</h2>' },
          { insertNewBeforeExistingId: 'section-1', html: '<h3>Section 1.1</h3>' },
          { insertNewBeforeExistingId: 'section-1', html: '<h4>Subsection 1.1.1</h4>' },
          { insertNewBeforeExistingId: 'section-2', html: '<h2>Chapter 2</h2>' },
          { insertNewBeforeExistingId: 'section-2', html: '<h3>Section 2.1</h3>' }
        ]

        const result = generateHeadingMutation({
          headings,
          documentId: mockDocumentId,
          mutationId: mockMutationId
        })

        expect(result.forward).toHaveLength(5)
        
        const transforms = result.forward
        
        // First chain (section-1): h2 → h3 → h4 → section-1
        expect(transforms[0]!.insertNewBeforeExistingId).toBe('section-1')
        expect(transforms[1]!.insertNewBeforeExistingId).toBe(transforms[0]!.content?.id)
        expect(transforms[2]!.insertNewBeforeExistingId).toBe(transforms[1]!.content?.id)
        
        // Second chain (section-2): h2 → h3 → section-2
        expect(transforms[3]!.insertNewBeforeExistingId).toBe('section-2')
        expect(transforms[4]!.insertNewBeforeExistingId).toBe(transforms[3]!.content?.id)
      })
    })

    describe('edge cases and error handling', () => {
      it('should handle invalid HTML format', () => {
        const headings = [
          { insertNewBeforeExistingId: 'para-123', html: 'Invalid HTML' }
        ]

        expect(() => {
          generateHeadingMutation({
            headings,
            documentId: mockDocumentId,
            mutationId: mockMutationId
          })
        }).toThrow('Invalid heading HTML format: Invalid HTML')
      })

      it('should handle empty headings array', () => {
        const result = generateHeadingMutation({
          headings: [],
          documentId: mockDocumentId,
          mutationId: mockMutationId
        })

        expect(result.forward).toHaveLength(0)
        expect(result.reverse).toHaveLength(0)
        expect(result.metadata.generatedHeadingCount).toBe(0)
      })

      it('should generate mutation ID when not provided', () => {
        const headings = [
          { insertNewBeforeExistingId: 'para-123', html: '<h2>Test</h2>' }
        ]

        const result = generateHeadingMutation({
          headings,
          documentId: mockDocumentId
          // No mutationId provided
        })

        expect(result.id).toMatch(/^ai-headings-\d+$/)
      })

      it('should handle regeneration flag for ID uniqueness', () => {
        const headings = [
          { insertNewBeforeExistingId: 'para-123', html: '<h2>Same Content</h2>' }
        ]

        generateHeadingMutation({
          headings,
          documentId: mockDocumentId,
          isRegeneration: false
        })

        generateHeadingMutation({
          headings,
          documentId: mockDocumentId,
          isRegeneration: true
        })

        // Should call generateContentBasedId with different content for regeneration
        expect(mockedGenerateContentBasedId).toHaveBeenCalledWith(
          mockDocumentId,
          'heading',
          'Same Content:before:para-123'
        )
        
        // For regeneration, should include timestamp in ID generation
        expect(mockedGenerateContentBasedId).toHaveBeenCalledWith(
          mockDocumentId,
          'heading',
          expect.stringMatching(/Same Content:before:para-123:\d+/)
        )
      })
    })

    describe('ID collision detection', () => {
      it('should detect and throw on ID collisions', () => {
        // Mock to return same ID for different inputs (simulate collision)
        mockedGenerateContentBasedId.mockReturnValue('collision-id')
        
        const headings = [
          { insertNewBeforeExistingId: 'para-1', html: '<h2>Heading 1</h2>' },
          { insertNewBeforeExistingId: 'para-2', html: '<h2>Heading 2</h2>' }
        ]

        expect(() => {
          generateHeadingMutation({
            headings,
            documentId: mockDocumentId,
            mutationId: mockMutationId
          })
        }).toThrow(/FATAL: ID collision detected/)
      })
    })

    describe('reverse transforms', () => {
      it('should create correct reverse transforms for removal', () => {
        const headings = [
          { insertNewBeforeExistingId: 'para-1', html: '<h2>Heading 1</h2>' },
          { insertNewBeforeExistingId: 'para-2', html: '<h3>Heading 2</h3>' }
        ]

        const result = generateHeadingMutation({
          headings,
          documentId: mockDocumentId,
          mutationId: mockMutationId
        })

        expect(result.reverse).toHaveLength(2)
        
        result.reverse.forEach((transform, index) => {
          expect(transform.action).toBe('remove')
          expect(transform.targetId).toBe(result.forward[index]!.content?.id)
        })
      })
    })

    describe('metadata generation', () => {
      it('should include correct metadata', () => {
        const headings = [
          { insertNewBeforeExistingId: 'para-1', html: '<h2>Test</h2>' }
        ]

        const result = generateHeadingMutation({
          headings,
          documentId: mockDocumentId,
          mutationId: mockMutationId
        })

        expect(result.metadata).toEqual({
          description: 'AI-generated semantic headings',
          generatedHeadingCount: 1,
          timestamp: expect.any(Number)
        })
      })
    })
  })

  describe('extractHeadingsFromMutation', () => {
    it('should extract heading information from mutation', () => {
      const mutation = {
        id: 'test-mutation',
        type: 'insert-headings' as const,
        forward: [
          {
            action: 'insert' as const,
            insertNewBeforeExistingId: 'para-1',
            content: {
              id: 'heading-1',
              tag_name: 'h2',
              content: 'Chapter 1',
              attributes: {}
            }
          },
          {
            action: 'insert' as const,
            insertNewBeforeExistingId: 'heading-1',
            content: {
              id: 'heading-2',
              tag_name: 'h3',
              content: 'Section 1.1',
              attributes: {}
            }
          }
        ],
        reverse: [],
        metadata: {}
      }

      const result = extractHeadingsFromMutation(mutation)

      expect(result).toEqual([
        { id: 'heading-1', text: 'Chapter 1', level: 2 },
        { id: 'heading-2', text: 'Section 1.1', level: 3 }
      ])
    })

    it('should return empty array for non-heading mutations', () => {
      const mutation = {
        id: 'test-mutation',
        type: 'other-type' as any,
        forward: [],
        reverse: [],
        metadata: {}
      }

      const result = extractHeadingsFromMutation(mutation)
      expect(result).toEqual([])
    })

    it('should handle mutations with mixed transform types', () => {
      const mutation = {
        id: 'test-mutation',
        type: 'insert-headings' as const,
        forward: [
          {
            action: 'insert' as const,
            insertNewBeforeExistingId: 'para-1',
            content: {
              id: 'heading-1',
              tag_name: 'h2',
              content: 'Valid Heading',
              attributes: {}
            }
          },
          {
            action: 'remove' as const,
            targetId: 'some-element'
          },
          {
            action: 'insert' as const,
            insertNewBeforeExistingId: 'para-2',
            // Missing content - should be filtered out
          }
        ],
        reverse: [],
        metadata: {}
      }

      const result = extractHeadingsFromMutation(mutation)
      expect(result).toEqual([
        { id: 'heading-1', text: 'Valid Heading', level: 2 }
      ])
    })
  })
})