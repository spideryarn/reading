/**
 * @fileoverview Integration tests for AI headings system with insert-before semantics
 * 
 * These tests verify the complete headings pipeline from mutation generation
 * through application, focusing on the new insert-before behavior and
 * semantic correctness of heading positioning.
 */

import { describe, it, expect } from '@jest/globals'
import { DocumentElement } from '../../types/document'
import { generateHeadingMutation } from '../heading-mutation-generator'
import { MutationEngine } from '../mutation-engine'

/**
 * Creates a test document with typical structure for heading insertion testing
 */
function createTestDocumentForHeadings(): DocumentElement[] {
  return [
    {
      id: 'title-1',
      tag_name: 'h1',
      content: 'Document Title',
      position: 0
    },
    {
      id: 'intro-para',
      tag_name: 'p',
      content: 'This is an introductory paragraph that sets up the document.',
      position: 1
    },
    {
      id: 'section-content-1',
      tag_name: 'p',
      content: 'This paragraph will benefit from a heading before it. It discusses important concepts that need organization.',
      position: 2
    },
    {
      id: 'section-content-2', 
      tag_name: 'p',
      content: 'Another paragraph that would benefit from a subheading. This content is related but distinct.',
      position: 3
    },
    {
      id: 'conclusion-para',
      tag_name: 'p', 
      content: 'This is a concluding paragraph that wraps up the document.',
      position: 4
    }
  ]
}

describe('Headings Integration Tests - Insert-Before Semantics', () => {
  
  describe('Single Heading Insertion', () => {
    it('should insert heading before target element (semantic correctness)', () => {
      const document = createTestDocumentForHeadings()
      
      // Generate mutation to insert H2 before section-content-1
      const mutation = generateHeadingMutation({
        headings: [{
          insertNewBeforeExistingId: 'section-content-1',
          html: '<h2>Key Concepts</h2>'
        }],
        documentId: 'test-doc'
      })
      
      const result = MutationEngine.applyMutation(document, mutation)
      
      expect(result.success).toBe(true)
      expect(result.document).toBeDefined()
      
      const resultDoc = result.document!
      
      // Find the inserted heading
      const insertedHeading = resultDoc.find(el => el.content === 'Key Concepts')
      expect(insertedHeading).toBeDefined()
      expect(insertedHeading?.tag_name).toBe('h2')
      
      // Find the target element
      const targetElement = resultDoc.find(el => el.id === 'section-content-1')
      expect(targetElement).toBeDefined()
      
      // Verify semantic correctness: heading appears BEFORE the content it introduces
      expect(insertedHeading!.position).toBeLessThan(targetElement!.position)
      
      // Verify the heading is positioned directly before the target
      expect(insertedHeading!.position).toBe(targetElement!.position - 1)
    })
    
    it('should maintain correct document structure after heading insertion', () => {
      const document = createTestDocumentForHeadings()
      
      const mutation = generateHeadingMutation({
        headings: [{
          insertNewBeforeExistingId: 'section-content-2',
          html: '<h3>Detailed Analysis</h3>'
        }],
        documentId: 'test-doc'
      })
      
      const result = MutationEngine.applyMutation(document, mutation)
      
      expect(result.success).toBe(true)
      const resultDoc = result.document!
      
      // Verify total element count increased by 1
      expect(resultDoc.length).toBe(document.length + 1)
      
      // Verify all positions are sequential and correct
      const positions = resultDoc.map(el => el.position).sort((a, b) => a - b)
      for (let i = 0; i < positions.length; i++) {
        expect(positions[i]).toBe(i)
      }
      
      // Verify document flow: intro → heading → content → more content → conclusion
      const orderedElements = resultDoc.sort((a, b) => a.position - b.position)
      expect(orderedElements[0].id).toBe('title-1')
      expect(orderedElements[1].id).toBe('intro-para')
      expect(orderedElements[2].id).toBe('section-content-1')
      expect(orderedElements[3].content).toBe('Detailed Analysis') // Inserted heading
      expect(orderedElements[4].id).toBe('section-content-2')
      expect(orderedElements[5].id).toBe('conclusion-para')
    })
  })
  
  describe('Multiple Headings - Chaining Behavior', () => {
    it('should insert multiple headings in correct order when targeting same element', () => {
      const document = createTestDocumentForHeadings()
      
      // Insert multiple headings before the same target element
      const mutation = generateHeadingMutation({
        headings: [
          {
            insertNewBeforeExistingId: 'section-content-1',
            html: '<h2>Main Section</h2>'
          },
          {
            insertNewBeforeExistingId: 'section-content-1', 
            html: '<h3>Subsection</h3>'
          },
          {
            insertNewBeforeExistingId: 'section-content-1',
            html: '<h4>Details</h4>'
          }
        ],
        documentId: 'test-doc'
      })
      
      const result = MutationEngine.applyMutation(document, mutation)
      
      expect(result.success).toBe(true)
      const resultDoc = result.document!
      
      // Find all inserted headings
      const mainSection = resultDoc.find(el => el.content === 'Main Section')
      const subsection = resultDoc.find(el => el.content === 'Subsection')
      const details = resultDoc.find(el => el.content === 'Details')
      const targetElement = resultDoc.find(el => el.id === 'section-content-1')
      
      expect(mainSection).toBeDefined()
      expect(subsection).toBeDefined()
      expect(details).toBeDefined()
      expect(targetElement).toBeDefined()
      
      // Verify correct semantic ordering: H2 → H3 → H4 → target content
      expect(mainSection!.position).toBeLessThan(subsection!.position)
      expect(subsection!.position).toBeLessThan(details!.position)
      expect(details!.position).toBeLessThan(targetElement!.position)
      
      // Verify hierarchy makes semantic sense
      expect(mainSection!.tag_name).toBe('h2')
      expect(subsection!.tag_name).toBe('h3') 
      expect(details!.tag_name).toBe('h4')
    })
    
    it('should handle complex multi-target heading insertion', () => {
      const document = createTestDocumentForHeadings()
      
      // Insert headings before different target elements
      const mutation = generateHeadingMutation({
        headings: [
          {
            insertNewBeforeExistingId: 'section-content-1',
            html: '<h2>First Section</h2>'
          },
          {
            insertNewBeforeExistingId: 'section-content-2',
            html: '<h2>Second Section</h2>'
          },
          {
            insertNewBeforeExistingId: 'conclusion-para',
            html: '<h2>Conclusion</h2>'
          }
        ],
        documentId: 'test-doc'
      })
      
      const result = MutationEngine.applyMutation(document, mutation)
      
      expect(result.success).toBe(true)
      const resultDoc = result.document!
      
      // Verify total count
      expect(resultDoc.length).toBe(document.length + 3)
      
      // Find elements in order
      const orderedElements = resultDoc.sort((a, b) => a.position - b.position)
      
      // Should be: title → intro → h2(First) → content1 → h2(Second) → content2 → h2(Conclusion) → conclusion
      expect(orderedElements[0].id).toBe('title-1')
      expect(orderedElements[1].id).toBe('intro-para')
      expect(orderedElements[2].content).toBe('First Section')
      expect(orderedElements[3].id).toBe('section-content-1')
      expect(orderedElements[4].content).toBe('Second Section')
      expect(orderedElements[5].id).toBe('section-content-2')
      expect(orderedElements[6].content).toBe('Conclusion')
      expect(orderedElements[7].id).toBe('conclusion-para')
      
      // Verify all headings are properly positioned before their content
      const firstSection = orderedElements[2]
      const firstContent = orderedElements[3]
      expect(firstSection.position + 1).toBe(firstContent.position)
      
      const secondSection = orderedElements[4]
      const secondContent = orderedElements[5]
      expect(secondSection.position + 1).toBe(secondContent.position)
    })
  })
  
  describe('Reversal Operations', () => {
    it('should correctly reverse single heading insertion', () => {
      const document = createTestDocumentForHeadings()
      const originalDocumentSnapshot = JSON.parse(JSON.stringify(document))
      
      const mutation = generateHeadingMutation({
        headings: [{
          insertNewBeforeExistingId: 'section-content-1',
          html: '<h2>Temporary Heading</h2>'
        }],
        documentId: 'test-doc'
      })
      
      // Apply mutation
      const applyResult = MutationEngine.applyMutation(document, mutation)
      expect(applyResult.success).toBe(true)
      
      // Reverse mutation
      const reverseResult = MutationEngine.revertMutation(applyResult.document!, mutation)
      expect(reverseResult.success).toBe(true)
      
      // Verify document is restored to original state
      expect(reverseResult.document).toEqual(originalDocumentSnapshot)
    })
    
    it('should correctly reverse chained heading insertions', () => {
      const document = createTestDocumentForHeadings()
      const originalDocumentSnapshot = JSON.parse(JSON.stringify(document))
      
      const mutation = generateHeadingMutation({
        headings: [
          {
            insertNewBeforeExistingId: 'section-content-1',
            html: '<h2>Temp Main</h2>'
          },
          {
            insertNewBeforeExistingId: 'section-content-1',
            html: '<h3>Temp Sub</h3>'
          }
        ],
        documentId: 'test-doc'
      })
      
      // Apply mutation
      const applyResult = MutationEngine.applyMutation(document, mutation)
      expect(applyResult.success).toBe(true)
      expect(applyResult.document!.length).toBe(document.length + 2)
      
      // Reverse mutation  
      const reverseResult = MutationEngine.revertMutation(applyResult.document!, mutation)
      expect(reverseResult.success).toBe(true)
      
      // Verify complete restoration
      expect(reverseResult.document).toEqual(originalDocumentSnapshot)
    })
  })
  
  describe('Error Handling & Edge Cases', () => {
    it('should handle insertion before first element', () => {
      const document = createTestDocumentForHeadings()
      
      const mutation = generateHeadingMutation({
        headings: [{
          insertNewBeforeExistingId: 'title-1', // Insert before the very first element
          html: '<h1>Super Title</h1>'
        }],
        documentId: 'test-doc'
      })
      
      const result = MutationEngine.applyMutation(document, mutation)
      
      expect(result.success).toBe(true)
      const resultDoc = result.document!
      
      // Find the inserted heading
      const superTitle = resultDoc.find(el => el.content === 'Super Title')
      expect(superTitle).toBeDefined()
      expect(superTitle!.position).toBe(0) // Should be the new first element
      
      // Original title should now be at position 1
      const originalTitle = resultDoc.find(el => el.id === 'title-1')
      expect(originalTitle!.position).toBe(1)
    })
    
    it('should handle invalid target element ID gracefully', () => {
      const document = createTestDocumentForHeadings()
      
      const mutation = generateHeadingMutation({
        headings: [{
          insertNewBeforeExistingId: 'non-existent-id',
          html: '<h2>Orphaned Heading</h2>'
        }],
        documentId: 'test-doc'
      })
      
      const result = MutationEngine.applyMutation(document, mutation)
      
      // Should fail gracefully with descriptive error
      expect(result.success).toBe(false)
      expect(result.error).toContain('non-existent-id')
    })
    
    it('should validate heading HTML format', () => {
      expect(() => {
        generateHeadingMutation({
          headings: [{
            insertNewBeforeExistingId: 'section-content-1',
            html: 'Not a heading tag' // Invalid HTML
          }],
          documentId: 'test-doc'
        })
      }).toThrow('Invalid heading HTML format')
    })
  })
  
  describe('Performance & Scalability', () => {
    it('should handle large numbers of headings efficiently', () => {
      const document = createTestDocumentForHeadings()
      
      // Generate 20 headings targeting different elements
      const headings = []
      const targetIds = ['section-content-1', 'section-content-2', 'conclusion-para']
      
      for (let i = 0; i < 20; i++) {
        headings.push({
          insertNewBeforeExistingId: targetIds[i % targetIds.length],
          html: `<h${((i % 3) + 2)}>Generated Heading ${i + 1}</h${((i % 3) + 2)}>`
        })
      }
      
      const startTime = performance.now()
      
      const mutation = generateHeadingMutation({
        headings,
        documentId: 'test-doc'
      })
      
      const result = MutationEngine.applyMutation(document, mutation)
      
      const endTime = performance.now()
      const executionTime = endTime - startTime
      
      expect(result.success).toBe(true)
      expect(executionTime).toBeLessThan(100) // Should complete in under 100ms
      expect(result.document!.length).toBe(document.length + 20)
      
      console.log(`Large heading insertion completed in ${executionTime.toFixed(2)}ms`)
    })
  })
  
  describe('Semantic HTML Structure Validation', () => {
    it('should create semantically correct document structure', () => {
      const document = createTestDocumentForHeadings()
      
      const mutation = generateHeadingMutation({
        headings: [
          {
            insertNewBeforeExistingId: 'section-content-1',
            html: '<h2>Main Topic</h2>'
          },
          {
            insertNewBeforeExistingId: 'section-content-1',
            html: '<h3>Subtopic</h3>'
          }
        ],
        documentId: 'test-doc'
      })
      
      const result = MutationEngine.applyMutation(document, mutation)
      expect(result.success).toBe(true)
      
      const resultDoc = result.document!
      const orderedElements = resultDoc.sort((a, b) => a.position - b.position)
      
      // Verify heading hierarchy makes sense for screen readers and accessibility
      let foundH1 = false
      let foundH2 = false
      let foundH3 = false
      
      for (const element of orderedElements) {
        if (element.tag_name === 'h1') {
          foundH1 = true
          expect(foundH2).toBe(false) // H1 should come before H2
          expect(foundH3).toBe(false) // H1 should come before H3
        } else if (element.tag_name === 'h2') {
          foundH2 = true
          expect(foundH1).toBe(true) // H2 should come after H1
          expect(foundH3).toBe(false) // H2 should come before H3
        } else if (element.tag_name === 'h3') {
          foundH3 = true
          expect(foundH2).toBe(true) // H3 should come after H2
        }
      }
      
      expect(foundH1).toBe(true)
      expect(foundH2).toBe(true)
      expect(foundH3).toBe(true)
    })
  })
})