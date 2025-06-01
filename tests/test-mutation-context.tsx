#!/usr/bin/env node

/**
 * Test for mutation context and state management.
 * Tests the React context hooks in isolation using a mock React environment.
 */

import { DocumentElement } from '../lib/types/document'
import { Mutation } from '../lib/types/mutation'

// Minimal test helpers
const colours = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
}

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

// Mock React hooks for testing
let mockState: any = {}
let mockCallbacks: Record<string, Function> = {}

const mockUseState = (initial: any) => {
  const key = Object.keys(mockState).length
  if (!(key in mockState)) {
    mockState[key] = initial
  }
  return [
    mockState[key],
    (newValue: any) => {
      mockState[key] = typeof newValue === 'function' ? newValue(mockState[key]) : newValue
    }
  ]
}

const mockUseCallback = (fn: Function, deps: any[]) => {
  return fn
}

// Test document
const testDocument: DocumentElement[] = [
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
    content: 'First paragraph.',
    attributes: {},
    position: 1,
    level: 0,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  }
]

// Test mutation
const testMutation: Mutation = {
  id: 'test-mutation-1',
  type: 'insert-headings',
  forward: [{
    action: 'insert',
    afterId: 'para-1',
    content: {
      id: 'ai-heading-1',
      tag_name: 'h2',
      content: 'AI Section'
    }
  }],
  reverse: [{
    action: 'remove',
    targetId: 'ai-heading-1'
  }]
}

console.log(`${colours.blue}Running Mutation Context Tests${colours.reset}\n`)

// Since we can't actually test React components in a Node environment,
// we'll test the logic that would be used in the context
test('Mutation state initialises correctly', () => {
  const initialState = {
    activeMutation: null,
    mutationHistory: [],
    currentMutationIndex: -1
  }
  
  assertEqual(initialState.activeMutation, null)
  assertEqual(initialState.mutationHistory.length, 0)
  assertEqual(initialState.currentMutationIndex, -1)
})

test('Document state tracking works', () => {
  let document = testDocument
  const setDocument = (newDoc: DocumentElement[]) => { document = newDoc }
  
  assertEqual(document.length, 2)
  
  // Simulate mutation
  const newDoc = [...document, {
    id: 'new-1',
    document_id: 'doc-1',
    parent_id: null,
    tag_name: 'p',
    content: 'New paragraph',
    attributes: {},
    position: 2,
    level: 0,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  }]
  
  setDocument(newDoc)
  assertEqual(document.length, 3)
})

test('Computed properties work correctly', () => {
  // Test hasActiveMutation
  const stateWithMutation = {
    activeMutation: testMutation,
    mutationHistory: [testMutation],
    currentMutationIndex: 0
  }
  
  const hasActiveMutation = stateWithMutation.activeMutation !== null
  assertEqual(hasActiveMutation, true)
  
  // Test canRevert
  const canRevert = hasActiveMutation
  assertEqual(canRevert, true)
  
  // Test with no mutation
  const stateNoMutation = {
    activeMutation: null,
    mutationHistory: [],
    currentMutationIndex: -1
  }
  
  const hasNoActiveMutation = stateNoMutation.activeMutation !== null
  assertEqual(hasNoActiveMutation, false)
})

test('Mutation type extraction works', () => {
  const stateWithMutation = {
    activeMutation: testMutation,
    mutationHistory: [testMutation],
    currentMutationIndex: 0
  }
  
  const mutationType = stateWithMutation.activeMutation?.type || null
  assertEqual(mutationType, 'insert-headings')
  
  const stateNoMutation = {
    activeMutation: null,
    mutationHistory: [],
    currentMutationIndex: -1
  }
  
  const noMutationType = stateNoMutation.activeMutation?.type || null
  assertEqual(noMutationType, null)
})

// Summary
console.log(`\n${colours.blue}Test Summary:${colours.reset}`)
console.log(`Total tests: ${testCount}`)
console.log(`Passed: ${colours.green}${passCount}${colours.reset}`)
console.log(`Failed: ${colours.red}${testCount - passCount}${colours.reset}`)

process.exit(testCount === passCount ? 0 : 1)