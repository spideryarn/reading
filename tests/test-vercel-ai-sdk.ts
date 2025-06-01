// Test script to validate Vercel AI SDK integration approach
// This is a standalone test to verify our migration strategy

import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'
import { generateText, streamText } from 'ai'

// Test 1: Basic text generation with Anthropic
async function testAnthropicGeneration() {
  console.log('Testing Anthropic provider...')
  
  try {
    const result = await generateText({
      model: anthropic('claude-3-haiku-20240307'),
      prompt: 'Write a haiku about TypeScript',
      maxTokens: 100,
      temperature: 0,
    })
    
    console.log('Anthropic result:', result.text)
    return true
  } catch (error) {
    console.error('Anthropic test failed:', error)
    return false
  }
}

// Test 2: Basic text generation with Google
async function testGoogleGeneration() {
  console.log('Testing Google provider...')
  
  try {
    const result = await generateText({
      model: google('gemini-1.5-flash'),
      prompt: 'Write a haiku about TypeScript',
      maxTokens: 100,
      temperature: 0,
    })
    
    console.log('Google result:', result.text)
    return true
  } catch (error) {
    console.error('Google test failed:', error)
    return false
  }
}

// Test 3: Provider switching based on environment
async function testProviderSwitching() {
  console.log('Testing provider switching...')
  
  const provider = process.env.LLM_PROVIDER === 'google' ? google : anthropic
  const modelName = process.env.LLM_PROVIDER === 'google' 
    ? 'gemini-1.5-flash' 
    : 'claude-3-haiku-20240307'
  
  try {
    const result = await generateText({
      model: provider(modelName),
      prompt: 'What is 2+2?',
      maxTokens: 50,
      temperature: 0,
    })
    
    console.log(`Provider ${process.env.LLM_PROVIDER || 'anthropic'} result:`, result.text)
    return true
  } catch (error) {
    console.error('Provider switching test failed:', error)
    return false
  }
}

// Test 4: Streaming (important for chat)
async function testStreaming() {
  console.log('Testing streaming...')
  
  try {
    const stream = await streamText({
      model: anthropic('claude-3-haiku-20240307'),
      prompt: 'Count from 1 to 5',
      maxTokens: 100,
      temperature: 0,
    })
    
    let fullText = ''
    for await (const chunk of stream.textStream) {
      fullText += chunk
      process.stdout.write(chunk)
    }
    
    console.log('\nStreaming complete')
    return true
  } catch (error) {
    console.error('Streaming test failed:', error)
    return false
  }
}

// Test 5: Response format compatibility
async function testResponseFormat() {
  console.log('Testing response format...')
  
  try {
    const result = await generateText({
      model: anthropic('claude-3-haiku-20240307'),
      prompt: 'Say hello',
      maxTokens: 50,
      temperature: 0,
    })
    
    console.log('Response properties:')
    console.log('- text:', typeof result.text)
    console.log('- usage:', result.usage)
    console.log('- finishReason:', result.finishReason)
    
    return true
  } catch (error) {
    console.error('Response format test failed:', error)
    return false
  }
}

// Run all tests
async function runTests() {
  console.log('=== Vercel AI SDK Integration Tests ===\n')
  
  const tests = [
    testAnthropicGeneration,
    testGoogleGeneration,
    testProviderSwitching,
    testStreaming,
    testResponseFormat,
  ]
  
  const results = []
  for (const test of tests) {
    const passed = await test()
    results.push(passed)
    console.log('')
  }
  
  console.log('=== Test Summary ===')
  console.log(`Passed: ${results.filter(r => r).length}/${results.length}`)
  
  if (results.every(r => r)) {
    console.log('✅ All tests passed!')
  } else {
    console.log('❌ Some tests failed')
    process.exit(1)
  }
}

// Note: This test file requires the following packages to be installed:
// npm install ai @ai-sdk/anthropic @ai-sdk/google

// To run: 
// ANTHROPIC_API_KEY=your-key GOOGLE_GENERATIVE_AI_API_KEY=your-key npx tsx tests/test-vercel-ai-sdk.ts

runTests().catch(console.error)