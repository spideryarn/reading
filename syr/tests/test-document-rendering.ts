#!/usr/bin/env npx tsx

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

console.log('🧪 Testing Document Rendering with AI Headings\n')

// Generate mutation from AI response
const mutation = generateHeadingMutation({
  headings: aiHeadingResponse.headings,
  documentId: 'test-doc-123'
})

console.log('📄 Original document:')
testDocument.forEach(el => {
  console.log(`  ${el.position}: <${el.tag_name}${el.id ? ` id="${el.id}"` : ''}>${el.content}</${el.tag_name}>`)
})

// Apply mutation
const result = MutationEngine.applyMutation(testDocument, mutation)

if (result.success) {
  console.log('\n✅ Mutation applied successfully!')
  console.log('\n📄 Mutated document:')
  
  const mutatedDoc = result.document
  
  // Sort by position for display
  const sorted = [...mutatedDoc].sort((a, b) => a.position - b.position)
  
  sorted.forEach(el => {
    const aiGenerated = el.attributes?.['data-ai-generated'] ? ' [AI]' : ''
    console.log(`  ${el.position}: <${el.tag_name} id="${el.id}"${aiGenerated}>${el.content}</${el.tag_name}>`)
  })
  
  // Check if AI headings are properly marked
  console.log('\n🔍 Checking AI heading attributes:')
  const aiHeadings = mutatedDoc.filter(el => el.attributes?.['data-ai-generated'] === 'true')
  console.log(`  Found ${aiHeadings.length} AI-generated headings`)
  
  aiHeadings.forEach(h => {
    console.log(`  - ${h.id}: "${h.content}" (position: ${h.position})`)
  })
  
  // Test reverting
  console.log('\n🔄 Testing revert...')
  const revertResult = MutationEngine.revertMutation(mutatedDoc, mutation)
  
  if (revertResult.success) {
    console.log('✅ Revert successful!')
    const revertedDoc = revertResult.document
    console.log(`  Document now has ${revertedDoc.length} elements (original had ${testDocument.length})`)
    
    // Check if back to original
    const isIdentical = revertedDoc.length === testDocument.length &&
      revertedDoc.every(el => testDocument.some(orig => 
        orig.id === el.id && orig.content === el.content
      ))
    
    if (isIdentical) {
      console.log('✅ Document successfully restored to original state!')
    } else {
      console.log('❌ Document differs from original after revert')
    }
  } else {
    console.log('❌ Revert failed:', revertResult.error)
  }
  
} else {
  console.log('\n❌ Mutation failed:', result.error)
}

console.log('\n✨ Test complete!')