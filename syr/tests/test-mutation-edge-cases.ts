#!/usr/bin/env npx tsx

/**
 * Test edge cases for mutation system
 * Tests empty documents, missing insertion points, and other edge scenarios
 */

import { DocumentElement } from '../lib/types/document'
import { MutationEngine } from '../lib/services/mutation-engine'
import { generateHeadingMutation } from '../lib/services/heading-mutation-generator'

console.log('🧪 Testing Mutation System Edge Cases\n')

// Test 1: Empty document
console.log('📋 Test 1: Empty document')
const emptyDoc: DocumentElement[] = []
const emptyDocMutation = generateHeadingMutation({
  headings: [{
    id_of_after: 'non-existent',
    html: '<h2>Test Heading</h2>'
  }],
  documentId: 'empty-doc'
})

const emptyResult = MutationEngine.applyMutation(emptyDoc, emptyDocMutation)
console.log(`  Result: ${emptyResult.success ? '✅ Success' : '❌ Failed'}`)
if (!emptyResult.success) {
  console.log(`  Error: ${emptyResult.error}`)
}

// Test 2: Missing insertion point
console.log('\n📋 Test 2: Document with missing insertion point')
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
console.log(`  Result: ${missingResult.success ? '✅ Success' : '❌ Failed'}`)
if (!missingResult.success) {
  console.log(`  Error: ${missingResult.error}`)
}

// Test 3: Multiple headings, some valid, some invalid insertion points
console.log('\n📋 Test 3: Mixed valid/invalid insertion points')
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
console.log(`  Result: ${mixedResult.success ? '✅ Success' : '❌ Failed'}`)
if (!mixedResult.success) {
  console.log(`  Error: ${mixedResult.error}`)
  console.log('  This is expected - mutation engine validates all transforms before applying')
}

// Test 4: Document with only headings (no paragraphs to insert after)
console.log('\n📋 Test 4: Document with only headings')
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
console.log(`  Result: ${headingResult.success ? '✅ Success' : '❌ Failed'}`)
if (headingResult.success) {
  console.log(`  Document now has ${headingResult.document.length} elements`)
}

// Test 5: Very large document (performance check)
console.log('\n📋 Test 5: Large document performance')
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

console.log(`  Result: ${largeResult.success ? '✅ Success' : '❌ Failed'}`)
if (largeResult.success) {
  console.log(`  Applied ${manyHeadings.length} headings to ${largeDoc.length} elements`)
  console.log(`  Time taken: ${endTime - startTime}ms`)
  console.log(`  Final document size: ${largeResult.document.length} elements`)
}

// Test 6: Invalid HTML in heading
console.log('\n📋 Test 6: Invalid HTML format')
try {
  const invalidHtmlMutation = generateHeadingMutation({
    headings: [{
      id_of_after: 'para-1',
      html: 'Not valid HTML tags'  // Missing <h> tags
    }],
    documentId: 'test-doc'
  })
  console.log('  ❌ Should have thrown error for invalid HTML')
} catch (error) {
  console.log('  ✅ Correctly rejected invalid HTML:', error.message)
}

console.log('\n✨ Edge case testing complete!')