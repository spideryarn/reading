/**
 * Test edge cases for the mutation system
 * Tests empty documents, missing insertion points, and other edge conditions
 */

import { MutationEngine } from '../lib/services/mutation-engine'
import { generateHeadingMutation } from '../lib/services/heading-mutation-generator'
import type { Mutation } from '../lib/types/mutation'
import type { DocumentElement } from '../lib/types/document'

// Helper to create a test document element
function createElement(overrides: Partial<DocumentElement>): DocumentElement {
  return {
    id: 'test-id',
    document_id: 'doc-123',
    parent_id: null,
    tag_name: 'p',
    content: 'Test content',
    attributes: {},
    position: 0,
    level: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }
}

describe('Mutation System Edge Cases', () => {
  it('should fail with empty document', () => {
    const emptyDoc: DocumentElement[] = []
    const mutation = generateHeadingMutation({
      headings: [{
        id_of_after: 'non-existent',
        html: '<h1>Test Heading</h1>'
      }],
      documentId: 'doc-123'
    })
    
    const result = MutationEngine.applyMutation(emptyDoc, mutation)
    expect(result.success).toBe(false)
  })

  it('should fail with missing insertion point', () => {
    const doc = [
      createElement({ id: 'para-1', content: 'First paragraph' }),
      createElement({ id: 'para-2', content: 'Second paragraph', position: 1 })
    ]
    
    const mutation = generateHeadingMutation({
      headings: [{
        id_of_after: 'para-3', // Does not exist
        html: '<h1>Test Heading</h1>'
      }],
      documentId: 'doc-123'
    })
    
    const result = MutationEngine.applyMutation(doc, mutation)
    expect(result.success).toBe(false)
  })

  it('should throw error for invalid heading HTML', () => {
    expect(() => {
      generateHeadingMutation({
        headings: [{
          id_of_after: 'para-1',
          html: 'Not a valid heading' // Missing HTML tags
        }],
        documentId: 'doc-123'
      })
    }).toThrow()
  })

  it('should handle empty heading content', () => {
    const doc = [createElement({ id: 'para-1' })]
    
    const mutation = generateHeadingMutation({
      headings: [{
        id_of_after: 'para-1',
        html: '<h1></h1>' // Empty heading
      }],
      documentId: 'doc-123'
    })
    
    const result = MutationEngine.applyMutation(doc, mutation)
    expect(result.success).toBe(true)
    expect(result.document).toBeDefined()
  })

  it('should insert multiple headings at same insertion point', () => {
    const doc = [
      createElement({ id: 'para-1', content: 'First paragraph' }),
      createElement({ id: 'para-2', content: 'Second paragraph', position: 1 })
    ]
    
    const mutation = generateHeadingMutation({
      headings: [
        { id_of_after: 'para-1', html: '<h1>Heading 1</h1>' },
        { id_of_after: 'para-1', html: '<h2>Heading 2</h2>' },
        { id_of_after: 'para-1', html: '<h3>Heading 3</h3>' }
      ],
      documentId: 'doc-123'
    })
    
    const result = MutationEngine.applyMutation(doc, mutation)
    expect(result.success).toBe(true)
    expect(result.document!.length).toBe(5)
  })

  it('should fail when reverting non-existent element', () => {
    const doc = [
      createElement({ id: 'para-1' }),
      createElement({ id: 'ai-heading-123', tag_name: 'h1', content: 'AI Heading', position: 1 })
    ]
    
    // Create a mutation that would remove the heading
    const mutation: Mutation = {
      id: 'test-mutation',
      type: 'insert-headings',
      forward: [],
      reverse: [
        { action: 'remove', targetId: 'ai-heading-missing' } // Doesn't exist
      ]
    }
    
    const result = MutationEngine.revertMutation(doc, mutation)
    expect(result.success).toBe(false)
  })
})