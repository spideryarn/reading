/**
 * Test edge cases for mutation system
 * Tests empty documents, missing insertion points, and other edge scenarios
 */

import { DocumentElement } from '../lib/types/document'
import { MutationEngine } from '../lib/services/mutation-engine'
import { generateHeadingMutation } from '../lib/services/heading-mutation-generator'

describe('Additional Mutation Edge Cases', () => {
  it('should fail with empty document', () => {
    const emptyDoc: DocumentElement[] = []
    const emptyDocMutation = generateHeadingMutation({
      headings: [{
        id_of_after: 'non-existent',
        html: '<h2>Test Heading</h2>'
      }],
      documentId: 'empty-doc'
    })

    const emptyResult = MutationEngine.applyMutation(emptyDoc, emptyDocMutation)
    expect(emptyResult.success).toBe(false)
  })

  it('should fail with missing insertion point', () => {
    const docWithContent: DocumentElement[] = [
      {
        id: 'para-1',
        tag_name: 'p',
        content: 'First paragraph',
        position: 1,
        parent_id: null,
        attributes: {}
      },
      {
        id: 'para-2',
        tag_name: 'p',
        content: 'Second paragraph',
        position: 2,
        parent_id: null,
        attributes: {}
      }
    ]

    const missingInsertMutation = generateHeadingMutation({
      headings: [{
        id_of_after: 'para-99', // doesn't exist
        html: '<h2>Orphan Heading</h2>'
      }],
      documentId: 'test-doc'
    })

    const missingResult = MutationEngine.applyMutation(docWithContent, missingInsertMutation)
    expect(missingResult.success).toBe(false)
  })

  it('should fail with mixed valid/invalid insertion points', () => {
    const docWithContent: DocumentElement[] = [
      {
        id: 'para-1',
        tag_name: 'p',
        content: 'First paragraph',
        position: 1,
        parent_id: null,
        attributes: {}
      },
      {
        id: 'para-2',
        tag_name: 'p',
        content: 'Second paragraph',
        position: 2,
        parent_id: null,
        attributes: {}
      }
    ]

    const mixedMutation = generateHeadingMutation({
      headings: [
        {
          id_of_after: 'para-1', // exists
          html: '<h2>Valid Heading 1</h2>'
        },
        {
          id_of_after: 'para-missing', // doesn't exist
          html: '<h2>Invalid Heading</h2>'
        },
        {
          id_of_after: 'para-2', // exists
          html: '<h2>Valid Heading 2</h2>'
        }
      ],
      documentId: 'test-doc'
    })

    const mixedResult = MutationEngine.applyMutation(docWithContent, mixedMutation)
    expect(mixedResult.success).toBe(false)
  })

  it('should work with document containing only headings', () => {
    const headingsOnlyDoc: DocumentElement[] = [
      {
        id: 'h1-1',
        tag_name: 'h1',
        content: 'Main Title',
        position: 1,
        parent_id: null,
        attributes: {}
      },
      {
        id: 'h2-1',
        tag_name: 'h2',
        content: 'Subtitle',
        position: 2,
        parent_id: null,
        attributes: {}
      }
    ]

    const headingAfterHeadingMutation = generateHeadingMutation({
      headings: [{
        id_of_after: 'h1-1',
        html: '<h2>New Section After Title</h2>'
      }],
      documentId: 'heading-doc'
    })

    const headingResult = MutationEngine.applyMutation(headingsOnlyDoc, headingAfterHeadingMutation)
    expect(headingResult.success).toBe(true)
    expect(headingResult.document!.length).toBe(3)
  })

  it('should handle large document efficiently', () => {
    const largeDoc: DocumentElement[] = []
    for (let i = 0; i < 1000; i++) {
      largeDoc.push({
        id: `para-${i}`,
        tag_name: 'p',
        content: `Paragraph ${i} content`,
        position: i + 1,
        parent_id: null,
        attributes: {}
      })
    }

    // Generate many AI headings
    const manyHeadings = []
    for (let i = 0; i < 100; i += 10) {
      manyHeadings.push({
        id_of_after: `para-${i}`,
        html: `<h2>Section ${i / 10 + 1}</h2>`
      })
    }

    const largeMutation = generateHeadingMutation({
      headings: manyHeadings,
      documentId: 'large-doc'
    })

    const startTime = Date.now()
    const largeResult = MutationEngine.applyMutation(largeDoc, largeMutation)
    const endTime = Date.now()

    expect(largeResult.success).toBe(true)
    expect(largeResult.document!.length).toBe(1000 + manyHeadings.length)
    expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second
  })

  it('should reject invalid HTML format', () => {
    expect(() => {
      generateHeadingMutation({
        headings: [{
          id_of_after: 'para-1',
          html: 'Not valid HTML tags'  // Missing <h> tags
        }],
        documentId: 'test-doc'
      })
    }).toThrow()
  })
})