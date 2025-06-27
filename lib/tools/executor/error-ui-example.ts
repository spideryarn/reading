/**
 * Example usage of the tool error UI system
 * 
 * This file demonstrates how to use the new comprehensive error UI system
 * for handling tool execution errors with user-friendly notifications.
 */

import { executeTool } from './executor'
import { showToolError, withErrorNotification } from './error-ui'
import { 
  ToolTimeoutError, 
  ToolAuthenticationError, 
  ToolValidationError,
  ToolServerError 
} from './types'

/**
 * Example 1: Automatic error handling with tool execution
 * 
 * The simplest way to show errors is to wrap your tool execution calls
 * with the withErrorNotification wrapper. This automatically catches
 * and displays any ToolExecutorError instances.
 */
export const executeToolWithErrorUI = withErrorNotification(executeTool)

// Usage:
async function exampleUsage() {
  try {
    const result = await executeToolWithErrorUI('glossary', 'generate', {
      documentId: 'doc-123'
    })
    console.log('Tool executed successfully:', result)
  } catch (error) {
    // Error will be automatically shown to user via UI
    // You can still handle it programmatically if needed
    console.error('Tool execution failed:', error)
  }
}

/**
 * Example 2: Manual error handling
 * 
 * For more control, you can manually catch errors and show them
 * using the showToolError function.
 */
async function manualErrorHandling() {
  try {
    const result = await executeTool('summarise', 'generate', {
      documentId: 'doc-123',
      level: 'detailed'
    })
    return result
  } catch (error) {
    // Check if it's a ToolExecutorError
    if (error instanceof Error && 'code' in error) {
      showToolError(error as any)
    } else {
      // Handle other error types
      console.error('Unexpected error:', error)
    }
    throw error
  }
}

/**
 * Example 3: Programmatic error creation and display
 * 
 * You can also create and show errors programmatically for custom
 * error conditions in your application logic.
 */
export function showCustomErrors() {
  // Show different types of errors
  
  // Timeout error
  const timeoutError = new ToolTimeoutError('chatbot', 60000)
  showToolError(timeoutError)
  
  // Authentication error (will show as modal dialog)
  const authError = new ToolAuthenticationError('Your session has expired')
  showToolError(authError)
  
  // Validation error (will show as inline warning)
  const validationError = new ToolValidationError([
    'Document ID is required',
    'Query must be at least 3 characters'
  ], { toolId: 'search' })
  showToolError(validationError)
  
  // Server error (will show as toast)
  const serverError = new ToolServerError(
    'The summarise service is temporarily unavailable',
    503,
    { toolId: 'summarise' }
  )
  showToolError(serverError)
}

/**
 * Example 4: Error handling in React components
 * 
 * This shows how you might use the error UI system in React components
 * that call tools.
 */
export function useToolWithErrorHandling() {
  return {
    async executeTool(
      toolId: string, 
      action: string, 
      parameters?: Record<string, unknown>
    ) {
      const wrappedExecutor = withErrorNotification(executeTool)
      return await wrappedExecutor(toolId, action, parameters)
    }
  }
}

// React component example (pseudo-code)
/*
export function MyToolComponent() {
  const { executeTool } = useToolWithErrorHandling()
  
  const handleGenerateGlossary = async () => {
    try {
      await executeTool('glossary', 'generate', { documentId: 'doc-123' })
      // Success - user will see the results
    } catch (error) {
      // Error already shown to user via UI notifications
      // Component can handle any additional logic here
    }
  }
  
  return (
    <button onClick={handleGenerateGlossary}>
      Generate Glossary
    </button>
  )
}
*/

/**
 * Example 5: Testing error scenarios
 * 
 * For development and testing, you can trigger different error types
 * to see how they appear to users.
 */
export function testErrorScenarios() {
  // Only run in development
  if (process.env.NODE_ENV !== 'development') {
    return
  }
  
  console.log('Testing error UI scenarios...')
  
  // Test timeout (toast notification)
  setTimeout(() => {
    showToolError(new ToolTimeoutError('test-tool', 30000))
  }, 1000)
  
  // Test validation error (inline notification)
  setTimeout(() => {
    showToolError(new ToolValidationError(['Invalid input format']))
  }, 2000)
  
  // Test server error (toast notification)
  setTimeout(() => {
    showToolError(new ToolServerError('Service temporarily unavailable', 503))
  }, 3000)
  
  // Test auth error (modal dialog)
  setTimeout(() => {
    showToolError(new ToolAuthenticationError('Please sign in to continue'))
  }, 4000)
}

/**
 * Example 6: Integration with existing error handling patterns
 * 
 * This shows how to integrate the new error UI system with existing
 * error handling patterns in the codebase.
 */
export function integrateWithExistingErrorHandling() {
  // Example of updating an existing function to use the new error UI
  
  async function existingFunctionWithBasicErrorHandling() {
    try {
      // Some operation that might fail
      return await executeTool('headings', 'generate', {})
    } catch (error) {
      // Old approach: just log and re-throw
      console.error('Tool execution failed:', error)
      throw error
    }
  }
  
  // Updated approach: add error UI display
  const improvedFunction = withErrorNotification(existingFunctionWithBasicErrorHandling)
  
  return improvedFunction
}

/**
 * Configuration and best practices
 */
export const ERROR_UI_BEST_PRACTICES = {
  // Use automatic error handling for most cases
  recommended: withErrorNotification(executeTool),
  
  // Manual handling for special cases
  manual: showToolError,
  
  // Error types and their display methods:
  errorTypes: {
    timeout: 'toast (orange, 7s auto-hide)', 
    authentication: 'modal dialog (red, manual dismiss)',
    validation: 'inline (orange, 8s auto-hide)',
    server: 'toast (red, 6s auto-hide)',
    notFound: 'toast (red, 5s auto-hide)',
    cancelled: 'toast (blue, 3s auto-hide)'
  },
  
  // When to use each approach:
  guidelines: {
    automaticWrapper: 'For most tool execution calls',
    manualShowError: 'When you need custom error handling logic',
    programmaticErrors: 'For application-specific error conditions',
    testingHelpers: 'During development to test UI behavior'
  }
}