/**
 * @fileoverview Integration tests for mixed insertion types with precedence validation
 * 
 * These tests verify the precedence rule: before-insertions → original-element → after-insertions
 * when both insert-before and insert-after transforms target the same element.
 */

import { describe, it, expect } from '@jest/globals'
import { DocumentElement } from '../../types/document'
import { MutationEngine } from '../mutation-engine'
import { Mutation } from '../../types/mutation'

/**
 * Creates a test document for mixed insertion testing
 */
function createTestDocumentForMixedInsertions(): DocumentElement[] {
  return [
    {
      id: 'intro-para',
      tag_name: 'p',
      content: 'Introduction paragraph.',
      position: 0
    },
    {
      id: 'target-element',
      tag_name: 'p',
      content: 'This is the target element that will have content inserted both before and after it.',
      position: 1
    },
    {
      id: 'conclusion-para',
      tag_name: 'p',
      content: 'Conclusion paragraph.',
      position: 2
    }
  ]
}

describe('Mixed Insertion Types - Precedence Validation', () => {
  
  describe('Basic Precedence Rule', () => {
    it('should enforce before → original → after precedence for same target', () => {
      const document = createTestDocumentForMixedInsertions()
      
      const mutation: Mutation = {
        id: 'mixed-insertion-test',
        type: 'mixed-insertion',
        forward: [
          // Insert-after transform
          {
            action: 'insert',
            insertNewAfterExistingId: 'target-element',
            content: {
              id: 'after-element',
              tag_name: 'p',
              content: 'This comes AFTER the target'
            }
          },
          // Insert-before transform (should appear first despite being defined second)
          {
            action: 'insert',
            insertNewBeforeExistingId: 'target-element',
            content: {
              id: 'before-element',
              tag_name: 'h2',
              content: 'This comes BEFORE the target'
            }
          }
        ],
        reverse: [
          { action: 'remove', targetId: 'after-element' },
          { action: 'remove', targetId: 'before-element' }
        ]
      }
      
      const result = MutationEngine.applyMutation(document, mutation)
      
      expect(result.success).toBe(true)
      expect(result.document).toBeDefined()
      
      const resultDoc = result.document!
      const orderedElements = resultDoc.sort((a, b) => a.position - b.position)
      
      // Verify precedence: before → original → after
      expect(orderedElements[0].id).toBe('intro-para')
      expect(orderedElements[1].id).toBe('before-element') // Insert-before comes first
      expect(orderedElements[2].id).toBe('target-element') // Original element
      expect(orderedElements[3].id).toBe('after-element')  // Insert-after comes last
      expect(orderedElements[4].id).toBe('conclusion-para')
      
      // Verify content is correct
      expect(orderedElements[1].content).toBe('This comes BEFORE the target')
      expect(orderedElements[3].content).toBe('This comes AFTER the target')
    })
    
    it('should handle multiple before and after insertions with correct precedence', () => {
      const document = createTestDocumentForMixedInsertions()
      
      const mutation: Mutation = {
        id: 'multi-mixed-insertion-test',
        type: 'mixed-insertion',
        forward: [
          // Multiple after insertions
          {
            action: 'insert',
            insertNewAfterExistingId: 'target-element',
            content: { id: 'after-1', tag_name: 'p', content: 'After 1' }
          },
          {
            action: 'insert',
            insertNewAfterExistingId: 'target-element',
            content: { id: 'after-2', tag_name: 'p', content: 'After 2' }
          },
          // Multiple before insertions
          {
            action: 'insert',
            insertNewBeforeExistingId: 'target-element',
            content: { id: 'before-1', tag_name: 'h2', content: 'Before 1' }
          },
          {
            action: 'insert',
            insertNewBeforeExistingId: 'target-element',
            content: { id: 'before-2', tag_name: 'h3', content: 'Before 2' }
          }
        ],
        reverse: [
          { action: 'remove', targetId: 'after-1' },
          { action: 'remove', targetId: 'after-2' },
          { action: 'remove', targetId: 'before-1' },
          { action: 'remove', targetId: 'before-2' }
        ]
      }
      
      const result = MutationEngine.applyMutation(document, mutation)
      
      expect(result.success).toBe(true)
      const resultDoc = result.document!
      const orderedElements = resultDoc.sort((a, b) => a.position - b.position)
      
      // Verify precedence groups
      expect(orderedElements[0].id).toBe('intro-para')
      
      // All before insertions come first (in reverse order due to serial insertion)
      expect(orderedElements[1].content).toBe('Before 2') // Last before insertion
      expect(orderedElements[2].content).toBe('Before 1') // First before insertion
      
      // Original element
      expect(orderedElements[3].id).toBe('target-element')
      
      // All after insertions come last (in reverse order due to serial insertion)
      expect(orderedElements[4].content).toBe('After 2') // Last after insertion
      expect(orderedElements[5].content).toBe('After 1') // First after insertion
      
      expect(orderedElements[6].id).toBe('conclusion-para')
    })
  })
  
  describe('Multi-Target Mixed Insertions', () => {
    it('should handle mixed insertions targeting different elements', () => {
      const document = createTestDocumentForMixedInsertions()
      
      const mutation: Mutation = {
        id: 'multi-target-mixed-test',
        type: 'mixed-insertion',
        forward: [
          // Mixed insertions on target-element
          {
            action: 'insert',
            insertNewBeforeExistingId: 'target-element',
            content: { id: 'target-before', tag_name: 'h2', content: 'Before Target' }
          },
          {
            action: 'insert',
            insertNewAfterExistingId: 'target-element',
            content: { id: 'target-after', tag_name: 'p', content: 'After Target' }
          },
          // Insert before intro (different target)
          {
            action: 'insert',
            insertNewBeforeExistingId: 'intro-para',
            content: { id: 'intro-before', tag_name: 'h1', content: 'Document Title' }
          }
        ],
        reverse: [
          { action: 'remove', targetId: 'target-before' },
          { action: 'remove', targetId: 'target-after' },
          { action: 'remove', targetId: 'intro-before' }
        ]
      }
      
      const result = MutationEngine.applyMutation(document, mutation)
      
      expect(result.success).toBe(true)
      const resultDoc = result.document!
      const orderedElements = resultDoc.sort((a, b) => a.position - b.position)
      
      // Verify structure: intro-before → intro → target-before → target → target-after → conclusion
      expect(orderedElements[0].content).toBe('Document Title')    // intro-before
      expect(orderedElements[1].id).toBe('intro-para')            // original intro
      expect(orderedElements[2].content).toBe('Before Target')    // target-before  
      expect(orderedElements[3].id).toBe('target-element')        // original target
      expect(orderedElements[4].content).toBe('After Target')     // target-after
      expect(orderedElements[5].id).toBe('conclusion-para')       // original conclusion
    })
  })
  
  describe('Complex Precedence Scenarios', () => {
    it('should handle mixed insertions with other mutation types', () => {
      const document = createTestDocumentForMixedInsertions()
      
      const mutation: Mutation = {
        id: 'complex-mixed-test',
        type: 'complex-mixed',
        forward: [
          // Insert before target
          {
            action: 'insert',
            insertNewBeforeExistingId: 'target-element',
            content: { id: 'heading', tag_name: 'h2', content: 'Section Heading' }
          },
          // Replace target content
          {
            action: 'replace',
            targetId: 'target-element',
            content: { 
              id: 'target-element', 
              tag_name: 'p', 
              content: 'Modified target content with enhanced information.' 
            }
          },
          // Insert after target
          {
            action: 'insert',
            insertNewAfterExistingId: 'target-element',
            content: { id: 'summary', tag_name: 'p', content: 'Summary paragraph.' }
          }
        ],
        reverse: [
          { action: 'remove', targetId: 'heading' },
          { 
            action: 'replace', 
            targetId: 'target-element', 
            content: { 
              id: 'target-element', 
              tag_name: 'p', 
              content: 'This is the target element that will have content inserted both before and after it.' 
            }
          },
          { action: 'remove', targetId: 'summary' }
        ]
      }
      
      const result = MutationEngine.applyMutation(document, mutation)
      
      expect(result.success).toBe(true)
      const resultDoc = result.document!
      const orderedElements = resultDoc.sort((a, b) => a.position - b.position)
      
      // Verify structure and content
      expect(orderedElements[0].id).toBe('intro-para')
      expect(orderedElements[1].content).toBe('Section Heading')           // Insert-before
      expect(orderedElements[2].id).toBe('target-element')                 // Modified original
      expect(orderedElements[2].content).toBe('Modified target content with enhanced information.')
      expect(orderedElements[3].content).toBe('Summary paragraph.')        // Insert-after
      expect(orderedElements[4].id).toBe('conclusion-para')
      
      // Verify changes count
      expect(result.changes?.inserted).toBe(2)
      expect(result.changes?.replaced).toBe(1)
    })
    
    it('should maintain precedence across document rebuilds', () => {
      const document = createTestDocumentForMixedInsertions()
      
      // Apply mutation
      const mutation: Mutation = {
        id: 'precedence-rebuild-test',
        type: 'mixed-insertion',
        forward: [
          {
            action: 'insert',
            insertNewAfterExistingId: 'target-element',
            content: { id: 'after-content', tag_name: 'ul', content: 'List after target' }
          },
          {
            action: 'insert',
            insertNewBeforeExistingId: 'target-element',
            content: { id: 'before-content', tag_name: 'h2', content: 'Heading before target' }
          }
        ],
        reverse: [
          { action: 'remove', targetId: 'after-content' },
          { action: 'remove', targetId: 'before-content' }
        ]
      }
      
      const applyResult = MutationEngine.applyMutation(document, mutation)
      expect(applyResult.success).toBe(true)
      
      // Verify positions are correctly assigned
      const appliedDoc = applyResult.document!
      const positions = appliedDoc.map(el => el.position).sort((a, b) => a - b)
      
      // Positions should be sequential: 0, 1, 2, 3, 4
      for (let i = 0; i < positions.length; i++) {
        expect(positions[i]).toBe(i)
      }
      
      // Revert mutation
      const revertResult = MutationEngine.revertMutation(appliedDoc, mutation)
      expect(revertResult.success).toBe(true)
      
      // Verify document is restored and positions are correct
      const revertedDoc = revertResult.document!
      expect(revertedDoc.length).toBe(document.length)
      
      const revertedPositions = revertedDoc.map(el => el.position).sort((a, b) => a - b)
      for (let i = 0; i < revertedPositions.length; i++) {
        expect(revertedPositions[i]).toBe(i)
      }
    })
  })
  
  describe('Semantic Correctness Validation', () => {
    it('should create semantically meaningful document structure', () => {
      const document = createTestDocumentForMixedInsertions()
      
      const mutation: Mutation = {
        id: 'semantic-mixed-test',
        type: 'mixed-insertion',
        forward: [
          // Semantic before: heading introduces content
          {
            action: 'insert',
            insertNewBeforeExistingId: 'target-element',
            content: { 
              id: 'semantic-heading', 
              tag_name: 'h2', 
              content: 'Main Topic',
              attributes: { 'data-ai-generated': 'true' }
            }
          },
          // Semantic after: supplementary content follows
          {
            action: 'insert',
            insertNewAfterExistingId: 'target-element',
            content: { 
              id: 'semantic-note', 
              tag_name: 'aside', 
              content: 'Related information and references.',
              attributes: { 'data-ai-generated': 'true' }
            }
          }
        ],
        reverse: [
          { action: 'remove', targetId: 'semantic-heading' },
          { action: 'remove', targetId: 'semantic-note' }
        ]
      }
      
      const result = MutationEngine.applyMutation(document, mutation)
      
      expect(result.success).toBe(true)
      const resultDoc = result.document!
      const orderedElements = resultDoc.sort((a, b) => a.position - b.position)
      
      // Verify semantic structure
      expect(orderedElements[1].tag_name).toBe('h2')     // Heading introduces section
      expect(orderedElements[2].tag_name).toBe('p')      // Main content
      expect(orderedElements[3].tag_name).toBe('aside')  // Supplementary content
      
      // Verify AI-generated attributes are preserved
      expect(orderedElements[1].attributes?.['data-ai-generated']).toBe('true')
      expect(orderedElements[3].attributes?.['data-ai-generated']).toBe('true')
      
      // Verify semantic flow: intro → heading → content → aside → conclusion
      const expectedFlow = ['intro-para', 'semantic-heading', 'target-element', 'semantic-note', 'conclusion-para']
      for (let i = 0; i < expectedFlow.length; i++) {
        expect(orderedElements[i].id).toBe(expectedFlow[i])
      }
    })
  })
  
  describe('Error Handling in Mixed Insertions', () => {
    it('should fail atomically if any transform is invalid', () => {
      const document = createTestDocumentForMixedInsertions()
      
      const mutation: Mutation = {
        id: 'invalid-mixed-test',
        type: 'mixed-insertion',
        forward: [
          // Valid transform
          {
            action: 'insert',
            insertNewBeforeExistingId: 'target-element',
            content: { id: 'valid-heading', tag_name: 'h2', content: 'Valid Heading' }
          },
          // Invalid transform - nonexistent target
          {
            action: 'insert',
            insertNewAfterExistingId: 'nonexistent-element',
            content: { id: 'invalid-content', tag_name: 'p', content: 'Should not be inserted' }
          }
        ],
        reverse: [
          { action: 'remove', targetId: 'valid-heading' },
          { action: 'remove', targetId: 'invalid-content' }
        ]
      }
      
      const result = MutationEngine.applyMutation(document, mutation)
      
      // Should fail atomically - no changes should be applied
      expect(result.success).toBe(false)
      expect(result.error).toContain('nonexistent-element')
      expect(result.document).toBeUndefined()
      
      // Original document should be unchanged
      expect(document.length).toBe(3)
      expect(document[1].id).toBe('target-element')
    })
  })
})