#!/usr/bin/env node

import { generateHeadingMutation, extractHeadingsFromMutation } from '../lib/services/heading-mutation-generator'

// Test helpers
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

// Test data
const testHeadings = [
  {
    id_of_after: 'para-123',
    html: '<h2>Introduction to Testing</h2>'
  },
  {
    id_of_after: 'para-456',
    html: '<h3>Unit Testing Basics</h3>'
  },
  {
    id_of_after: 'para-789',
    html: '<h2>Advanced Concepts</h2>'
  }
]

console.log(`${colours.blue}Running Heading Mutation Generator Tests${colours.reset}\n`)

test('Generate heading mutation creates valid forward transforms', () => {
  const mutation = generateHeadingMutation({
    headings: testHeadings,
    documentId: 'test-doc-1'
  })
  
  assertEqual(mutation.type, 'insert-headings')
  assertEqual(mutation.forward.length, 3)
  
  // Check first transform
  const firstTransform = mutation.forward[0]
  assertEqual(firstTransform.action, 'insert')
  assertEqual(firstTransform.afterId, 'para-123')
  assertEqual(firstTransform.content?.tag_name, 'h2')
  assertEqual(firstTransform.content?.content, 'Introduction to Testing')
  assertEqual(firstTransform.content?.attributes?.['data-ai-generated'], 'true')
})

test('Generate heading mutation creates valid reverse transforms', () => {
  const mutation = generateHeadingMutation({
    headings: testHeadings,
    documentId: 'test-doc-1'
  })
  
  assertEqual(mutation.reverse.length, 3)
  
  // All reverse transforms should be removals
  mutation.reverse.forEach(transform => {
    assertEqual(transform.action, 'remove')
    assertEqual(typeof transform.targetId, 'string')
    assertEqual(transform.targetId?.length > 0, true)
  })
})

test('Mutation includes proper metadata', () => {
  const mutation = generateHeadingMutation({
    headings: testHeadings,
    documentId: 'test-doc-1'
  })
  
  assertEqual(mutation.metadata?.description, 'AI-generated semantic headings')
  assertEqual(mutation.metadata?.generatedHeadingCount, 3)
  assertEqual(typeof mutation.metadata?.timestamp, 'number')
})

test('Extract headings from mutation returns correct format', () => {
  const mutation = generateHeadingMutation({
    headings: testHeadings,
    documentId: 'test-doc-1'
  })
  
  const extracted = extractHeadingsFromMutation(mutation)
  
  assertEqual(extracted.length, 3)
  assertEqual(extracted[0].text, 'Introduction to Testing')
  assertEqual(extracted[0].level, 2)
  assertEqual(extracted[1].text, 'Unit Testing Basics')
  assertEqual(extracted[1].level, 3)
  assertEqual(extracted[2].text, 'Advanced Concepts')
  assertEqual(extracted[2].level, 2)
})

test('Custom mutation ID is used when provided', () => {
  const mutation = generateHeadingMutation({
    headings: testHeadings,
    documentId: 'test-doc-1',
    mutationId: 'custom-mutation-123'
  })
  
  assertEqual(mutation.id, 'custom-mutation-123')
})

test('Invalid heading HTML throws error', () => {
  let errorThrown = false
  
  try {
    generateHeadingMutation({
      headings: [{
        id_of_after: 'para-123',
        html: '<p>Not a heading</p>'  // Invalid - not a heading tag
      }],
      documentId: 'test-doc-1'
    })
  } catch (error) {
    errorThrown = true
    assertEqual(error instanceof Error, true)
    assertEqual(error.message.includes('Invalid heading HTML format'), true)
  }
  
  assertEqual(errorThrown, true, 'Should throw error for invalid HTML')
})

test('Extract headings handles non-heading mutations gracefully', () => {
  const nonHeadingMutation = {
    id: 'test-1',
    type: 'summarize-paragraphs',
    forward: [],
    reverse: []
  }
  
  const extracted = extractHeadingsFromMutation(nonHeadingMutation)
  assertEqual(extracted.length, 0)
})

// Summary
console.log(`\n${colours.blue}Test Summary:${colours.reset}`)
console.log(`Total tests: ${testCount}`)
console.log(`Passed: ${colours.green}${passCount}${colours.reset}`)
console.log(`Failed: ${colours.red}${testCount - passCount}${colours.reset}`)

process.exit(testCount === passCount ? 0 : 1)