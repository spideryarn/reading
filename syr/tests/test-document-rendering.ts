/**
 * Test document rendering with AI headings mutation
 * Tests that the document structure is properly modified when mutations are applied
 */

import { DocumentElement } from '../lib/types/document'
import { MutationEngine } from '../lib/services/mutation-engine'
import { generateHeadingMutation } from '../lib/services/heading-mutation-generator'

// Test document structure
const testDocument: DocumentElement[] = [
  {
    id: 'para-1',
    tag_name: 'p',
    content: 'Introduction paragraph',
    position: 1,
    parent_id: null,
    attributes: {}
  },
  {
    id: 'heading-1', 
    tag_name: 'h2',
    content: 'Original Section 1',
    position: 2,
    parent_id: null,
    attributes: {}
  },
  {
    id: 'para-2',
    tag_name: 'p', 
    content: 'Some content here',
    position: 3,
    parent_id: null,
    attributes: {}
  },
  {
    id: 'para-3',
    tag_name: 'p',
    content: 'More content here',
    position: 4,
    parent_id: null,
    attributes: {}
  }
]

// Simulate AI heading response
const aiHeadingResponse = {
  headings: [
    {
      id_of_after: 'para-1',
      html: '<h2>Background and Context</h2>'
    },
    {
      id_of_after: 'para-2',
      html: '<h3>Key Findings</h3>'
    }
  ]
}

describe('Document Rendering with AI Headings', () => {
  it('should properly modify document structure when mutations are applied', () => {
    // Generate mutation from AI response
    const mutation = generateHeadingMutation({
      headings: aiHeadingResponse.headings,
      documentId: 'test-doc-123'
    })

    // Apply mutation
    const result = MutationEngine.applyMutation(testDocument, mutation)

    expect(result.success).toBe(true)
    
    const mutatedDoc = result.document!
    
    // Check if AI headings are properly marked
    const aiHeadings = mutatedDoc.filter(el => el.attributes?.['data-ai-generated'] === 'true')
    expect(aiHeadings.length).toBe(2)
    
    // Test reverting
    const revertResult = MutationEngine.revertMutation(mutatedDoc, mutation)
    
    expect(revertResult.success).toBe(true)
    const revertedDoc = revertResult.document!
    expect(revertedDoc.length).toBe(testDocument.length)
    
    // Check if back to original
    const isIdentical = revertedDoc.length === testDocument.length &&
      revertedDoc.every(el => testDocument.some(orig => 
        orig.id === el.id && orig.content === el.content
      ))
    
    expect(isIdentical).toBe(true)
  })
})