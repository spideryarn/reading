/**
 * Example usage of auto-generated typed wrapper functions.
 * 
 * This file demonstrates how to use the type-safe tool wrappers
 * generated from the registry. It serves as both documentation
 * and a working example for developers.
 * 
 * Note: This is a TypeScript example file for reference.
 * In a real application, you would typically use the wrappers
 * in React components or API routes.
 */

import { getAllTools } from '@/lib/tools/registry'
import { generateToolWrappers } from './wrappers'
import type { ToolExecutionResult } from './types'

/**
 * Example: Generate typed wrappers from the registry
 */
export async function exampleWrapperGeneration() {
  // Get all registered tools
  const registeredTools = getAllTools()
  console.log(`Found ${registeredTools.length} registered tools`)
  
  // Generate type-safe wrappers
  const tools = generateToolWrappers(registeredTools)
  console.log(`Generated wrappers for: ${Object.keys(tools).join(', ')}`)
  
  return tools
}

/**
 * Example: Using the glossary tool wrapper
 */
export async function exampleGlossaryUsage() {
  const tools = await exampleWrapperGeneration()
  
  if (!tools.glossary) {
    console.log('Glossary tool not available')
    return
  }
  
  try {
    // Execute glossary generation (server operation)
    console.log('Executing glossary generation...')
    const result: ToolExecutionResult = await tools.glossary.execute({
      refresh: true,
      includeDefinitions: true
    })
    
    console.log('Glossary result:', result)
    
    // Open glossary tab (local navigation)
    console.log('Opening glossary tab...')
    const navigationResult = await tools.glossary.open({
      term: 'artificial intelligence'
    })
    
    console.log('Navigation result:', navigationResult)
    
    // Refresh glossary data
    console.log('Refreshing glossary...')
    const refreshResult = await tools.glossary.refresh()
    
    console.log('Refresh result:', refreshResult)
    
  } catch (error) {
    console.error('Glossary operation failed:', error)
  }
}

/**
 * Example: Using multiple tools in sequence
 */
export async function exampleMultiToolWorkflow() {
  const tools = await exampleWrapperGeneration()
  
  try {
    // Step 1: Open document structure
    if (tools.structure) {
      console.log('Opening document structure...')
      await tools.structure.open()
    }
    
    // Step 2: Generate summary
    if (tools.summary) {
      console.log('Generating summary...')
      await tools.summary.execute({
        granularity: 'medium',
        includeKeyPoints: true
      })
    }
    
    // Step 3: Extract glossary terms
    if (tools.glossary) {
      console.log('Extracting glossary terms...')
      await tools.glossary.execute({
        refresh: true
      })
    }
    
    // Step 4: Generate highlights
    if (tools.highlights) {
      console.log('Generating highlights...')
      await tools.highlights.execute({
        criteria: 'important-facts'
      })
    }
    
    console.log('Multi-tool workflow completed successfully')
    
  } catch (error) {
    console.error('Multi-tool workflow failed:', error)
  }
}

/**
 * Example: Error handling with typed wrappers
 */
export async function exampleErrorHandling() {
  const tools = await exampleWrapperGeneration()
  
  if (!tools.search) {
    console.log('Search tool not available')
    return
  }
  
  try {
    // This might fail if no document is loaded
    const result = await tools.search.execute({
      query: 'machine learning',
      type: 'semantic'
    })
    
    console.log('Search successful:', result)
    
  } catch (error) {
    // Error handling with proper typing
    if (error instanceof Error) {
      console.error('Search failed:', error.message)
      
      // Handle specific error types
      if (error.message.includes('Authentication')) {
        console.log('Please sign in and try again')
      } else if (error.message.includes('timeout')) {
        console.log('Operation timed out - try again later')
      } else {
        console.log('Please refresh the page and try again')
      }
    }
  }
}

/**
 * Example: Conditional tool execution based on capabilities
 */
export async function exampleConditionalExecution() {
  const tools = await exampleWrapperGeneration()
  const registeredTools = getAllTools()
  
  // Find tools with search capability
  const searchableTools = registeredTools.filter(tool => 
    tool.capabilities?.search && tools[tool.id]
  )
  
  console.log(`Found ${searchableTools.length} tools with search capability`)
  
  // Use each searchable tool
  for (const tool of searchableTools) {
    const wrapper = tools[tool.id]
    if (wrapper) {
      try {
        console.log(`Searching with ${tool.name}...`)
        const result = await wrapper.execute({
          query: 'example search',
          scope: 'current-document'
        })
        console.log(`${tool.name} search result:`, result.metadata)
      } catch (error) {
        console.log(`${tool.name} search failed:`, error)
      }
    }
  }
}

/**
 * Example: Development-time debugging
 */
export async function exampleDebugging() {
  if (process.env.NODE_ENV !== 'development') {
    console.log('Debugging only available in development mode')
    return
  }
  
  const registeredTools = getAllTools()
  const tools = generateToolWrappers(registeredTools)
  
  // Use debug utilities
  const { debugUtils } = await import('./wrappers')
  
  // Log generation report
  debugUtils.logWrapperReport(registeredTools, tools)
  
  // Test individual wrappers
  for (const [toolId, wrapper] of Object.entries(tools)) {
    await debugUtils.testWrapper(toolId, wrapper)
  }
}

/**
 * Example: Custom execution options
 */
export async function exampleCustomOptions() {
  const tools = await exampleWrapperGeneration()
  
  if (!tools.chat) {
    console.log('Chat tool not available')
    return
  }
  
  try {
    // Execute with custom timeout and source tracking
    const result = await tools.chat.execute(
      {
        message: 'Explain the main concepts in this document',
        context: 'full-document'
      },
      {
        timeout: 30000, // 30 seconds
        source: 'api',
        metadata: {
          userAction: 'document-analysis',
          timestamp: new Date().toISOString()
        }
      }
    )
    
    console.log('Chat response:', result)
    
  } catch (error) {
    console.error('Chat operation failed:', error)
  }
}

/**
 * Export all examples for easy testing
 */
export const examples = {
  wrapperGeneration: exampleWrapperGeneration,
  glossaryUsage: exampleGlossaryUsage,
  multiToolWorkflow: exampleMultiToolWorkflow,
  errorHandling: exampleErrorHandling,
  conditionalExecution: exampleConditionalExecution,
  debugging: exampleDebugging,
  customOptions: exampleCustomOptions
}

/**
 * Development helper: Run all examples
 */
export async function runAllExamples() {
  if (process.env.NODE_ENV === 'production') {
    console.log('Examples only run in development mode')
    return
  }
  
  console.log('🚀 Running all wrapper examples...')
  
  const exampleList = Object.entries(examples)
  
  for (const [name, exampleFn] of exampleList) {
    try {
      console.log(`\n📋 Running ${name}...`)
      await exampleFn()
      console.log(`✅ ${name} completed`)
    } catch (error) {
      console.error(`❌ ${name} failed:`, error)
    }
  }
  
  console.log('\n🎉 All examples completed')
}