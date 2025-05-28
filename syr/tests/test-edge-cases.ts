#!/usr/bin/env npx ts-node

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

// Test 1: Empty document
console.log('Test 1: Empty document')
try {
  const emptyDoc: DocumentElement[] = []
  const mutation = generateHeadingMutation({
    headings: [{
      id_of_after: 'non-existent',
      html: '<h1>Test Heading</h1>'
    }],
    documentId: 'doc-123'
  })
  
  const result = MutationEngine.applyMutation(emptyDoc, mutation)
  console.log('❌ Should have failed but succeeded:', result)
} catch (error) {
  console.log('✅ Correctly failed with empty document:', (error as Error).message)
}

// Test 2: Missing insertion point
console.log('\nTest 2: Missing insertion point')
try {
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
  console.log('❌ Should have failed but succeeded:', result)
} catch (error) {
  console.log('✅ Correctly failed with missing insertion point:', (error as Error).message)
}

// Test 3: Invalid heading HTML
console.log('\nTest 3: Invalid heading HTML')
try {
  const mutation = generateHeadingMutation({
    headings: [{
      id_of_after: 'para-1',
      html: 'Not a valid heading' // Missing HTML tags
    }],
    documentId: 'doc-123'
  })
  console.log('❌ Should have failed but created mutation')
} catch (error) {
  console.log('✅ Correctly failed with invalid HTML:', (error as Error).message)
}

// Test 4: Empty heading content
console.log('\nTest 4: Empty heading content')
try {
  const doc = [createElement({ id: 'para-1' })]
  
  const mutation = generateHeadingMutation({
    headings: [{
      id_of_after: 'para-1',
      html: '<h1></h1>' // Empty heading
    }],
    documentId: 'doc-123'
  })
  
  const result = MutationEngine.applyMutation(doc, mutation)
  console.log('✅ Handled empty heading content')
  console.log('  Generated element:', result.document?.[1])
} catch (error) {
  console.log('❌ Failed with empty heading:', (error as Error).message)
}

// Test 5: Multiple headings with same insertion point
console.log('\nTest 5: Multiple headings at same insertion point')
try {
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
  console.log('✅ Successfully inserted multiple headings at same point')
  console.log('  Document length:', result.document?.length)
  console.log('  New headings:', result.document?.slice(1, 4).map(el => el.content))
} catch (error) {
  console.log('❌ Failed with multiple headings:', (error as Error).message)
}

// Test 6: Revert on empty document
console.log('\nTest 6: Revert mutation when heading no longer exists')
try {
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
  console.log('❌ Should have failed but succeeded')
} catch (error) {
  console.log('✅ Correctly failed when reverting non-existent element:', (error as Error).message)
}

console.log('\n✅ All edge case tests completed!')