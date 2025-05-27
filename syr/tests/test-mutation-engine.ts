#!/usr/bin/env node

import { DocumentElement } from '../lib/types/document'
import { Mutation } from '../lib/types/mutation'
import { MutationEngine } from '../lib/services/mutation-engine'

// ANSI colour codes for output
const colours = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
}

// Test helpers
let testCount = 0
let passCount = 0

function test(name: string, fn: () => void) {
  testCount++
  try {
    fn()
    console.log(`${colours.green}✓${colours.reset} ${name}`)
    passCount++
  } catch (error) {
    console.log(`${colours.red}✗${colours.reset} ${name}`)
    console.error(`  ${error}`)
  }
}

function assertEqual<T>(actual: T, expected: T, message?: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    )
  }
}

function assertThrows(fn: () => void, expectedError?: string) {
  let thrown = false
  try {
    fn()
  } catch (error) {
    thrown = true
    if (expectedError && error instanceof Error && !error.message.includes(expectedError)) {
      throw new Error(`Expected error containing "${expectedError}", got "${error.message}"`)
    }
  }
  if (!thrown) {
    throw new Error('Expected function to throw')
  }
}

// Sample document for testing
const createTestDocument = (): DocumentElement[] => [
  {
    id: 'title-1',
    document_id: 'doc-1',
    parent_id: null,
    tag_name: 'h1',
    content: 'Test Document',
    attributes: {},
    position: 0,
    level: 0,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'para-1',
    document_id: 'doc-1',
    parent_id: null,
    tag_name: 'p',
    content: 'This is the first paragraph.',
    attributes: {},
    position: 1,
    level: 0,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'para-2',
    document_id: 'doc-1',
    parent_id: null,
    tag_name: 'p',
    content: 'This is the second paragraph.',
    attributes: { class: 'highlight' },
    position: 2,
    level: 0,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  }
]

// Test mutations
const insertHeadingMutation: Mutation = {
  id: 'mutation-1',
  type: 'insert-headings',
  forward: [
    {
      action: 'insert',
      afterId: 'para-1',
      content: {
        id: 'ai-heading-1',
        tag_name: 'h2',
        content: 'AI Generated Section'
      }
    }
  ],
  reverse: [
    {
      action: 'remove',
      targetId: 'ai-heading-1'
    }
  ],
  metadata: {
    description: 'Test AI heading insertion'
  }
}

const replaceParagraphMutation: Mutation = {
  id: 'mutation-2',
  type: 'summarize-paragraphs',
  forward: [
    {
      action: 'replace',
      targetId: 'para-2',
      content: {
        content: 'Summary: Second paragraph about highlights.',
        attributes: { class: 'summary' }
      },
      originalContent: {
        content: 'This is the second paragraph.',
        attributes: { class: 'highlight' }
      }
    }
  ],
  reverse: [
    {
      action: 'replace',
      targetId: 'para-2',
      content: {
        content: 'This is the second paragraph.',
        attributes: { class: 'highlight' }
      }
    }
  ]
}

// Run tests
console.log(`${colours.blue}Running Mutation Engine Tests${colours.reset}\n`)

// Test insert transform
test('Insert transform adds element after specified ID', () => {
  const doc = createTestDocument()
  const result = MutationEngine.applyMutation(doc, insertHeadingMutation)
  
  assertEqual(result.success, true)
  assertEqual(result.document!.length, 4)
  assertEqual(result.document![2].id, 'ai-heading-1')
  assertEqual(result.document![2].content, 'AI Generated Section')
  assertEqual(result.changes!.inserted, 1)
})

test('Insert transform fails with non-existent afterId', () => {
  const doc = createTestDocument()
  const badMutation: Mutation = {
    ...insertHeadingMutation,
    forward: [{
      action: 'insert',
      afterId: 'non-existent',
      content: { id: 'test', content: 'Test' }
    }]
  }
  
  const result = MutationEngine.applyMutation(doc, badMutation)
  assertEqual(result.success, false)
  assertEqual(result.error!.includes('element not found'), true)
})

// Test replace transform
test('Replace transform updates element content', () => {
  const doc = createTestDocument()
  const result = MutationEngine.applyMutation(doc, replaceParagraphMutation)
  
  assertEqual(result.success, true)
  assertEqual(result.document!.length, 3)
  assertEqual(result.document![2].content, 'Summary: Second paragraph about highlights.')
  assertEqual(result.document![2].attributes.class, 'summary')
  assertEqual(result.changes!.replaced, 1)
})

// Test remove transform
test('Remove transform deletes element', () => {
  const doc = createTestDocument()
  const removeMutation: Mutation = {
    id: 'remove-1',
    type: 'test',
    forward: [{ action: 'remove', targetId: 'para-1' }],
    reverse: []
  }
  
  const result = MutationEngine.applyMutation(doc, removeMutation)
  assertEqual(result.success, true)
  assertEqual(result.document!.length, 2)
  assertEqual(result.document!.find(el => el.id === 'para-1'), undefined)
  assertEqual(result.changes!.removed, 1)
})

// Test modify transform
test('Modify transform updates element attributes', () => {
  const doc = createTestDocument()
  const modifyMutation: Mutation = {
    id: 'modify-1',
    type: 'test',
    forward: [{
      action: 'modify',
      targetId: 'para-1',
      attributes: { class: 'modified', 'data-test': 'value' }
    }],
    reverse: []
  }
  
  const result = MutationEngine.applyMutation(doc, modifyMutation)
  assertEqual(result.success, true)
  assertEqual(result.document![1].attributes.class, 'modified')
  assertEqual(result.document![1].attributes['data-test'], 'value')
  assertEqual(result.changes!.modified, 1)
})

// Test mutation reversal
test('Mutation reversal restores original state', () => {
  const doc = createTestDocument()
  
  // Apply mutation
  const applyResult = MutationEngine.applyMutation(doc, insertHeadingMutation)
  assertEqual(applyResult.success, true)
  assertEqual(applyResult.document!.length, 4)
  
  // Revert mutation
  const revertResult = MutationEngine.revertMutation(applyResult.document!, insertHeadingMutation)
  assertEqual(revertResult.success, true)
  assertEqual(revertResult.document!.length, 3)
  assertEqual(revertResult.document!.map(el => el.id), ['title-1', 'para-1', 'para-2'])
})

// Test mutation validation
test('Mutation validation detects invalid references', () => {
  const doc = createTestDocument()
  const invalidMutation: Mutation = {
    id: 'invalid-1',
    type: 'test',
    forward: [
      { action: 'insert', afterId: 'non-existent', content: { content: 'Test' } },
      { action: 'remove', targetId: 'also-non-existent' }
    ],
    reverse: []
  }
  
  const validation = MutationEngine.validateMutation(doc, invalidMutation)
  assertEqual(validation.valid, false)
  assertEqual(validation.errors.length, 2)
})

// Test complex mutation sequence
test('Complex mutation sequence applies correctly', () => {
  const doc = createTestDocument()
  const complexMutation: Mutation = {
    id: 'complex-1',
    type: 'test',
    forward: [
      { action: 'insert', afterId: 'title-1', content: { id: 'new-1', content: 'New paragraph' } },
      { action: 'modify', targetId: 'para-1', attributes: { class: 'updated' } },
      { action: 'replace', targetId: 'para-2', content: { content: 'Replaced content' } }
    ],
    reverse: []
  }
  
  const result = MutationEngine.applyMutation(doc, complexMutation)
  assertEqual(result.success, true)
  assertEqual(result.document!.length, 4)
  assertEqual(result.document![1].id, 'new-1')
  assertEqual(result.document![2].attributes.class, 'updated')
  assertEqual(result.document![3].content, 'Replaced content')
})

// Summary
console.log(`\n${colours.blue}Test Summary:${colours.reset}`)
console.log(`Total tests: ${testCount}`)
console.log(`Passed: ${colours.green}${passCount}${colours.reset}`)
console.log(`Failed: ${colours.red}${testCount - passCount}${colours.reset}`)

// Exit with appropriate code
process.exit(testCount === passCount ? 0 : 1)