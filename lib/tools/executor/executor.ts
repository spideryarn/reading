/**
 * Core tool execution framework implementation.
 * 
 * This module provides the main `executeTool()` function that handles dual execution paths:
 * - Server execution for data operations via `/api/tools/[toolId]` API
 * - Local execution for URL state updates and navigation
 * 
 * Key features:
 * - Parameter validation against tool schemas
 * - AbortController support for cancellation
 * - Error transformation from RFC 9457 Problem Details to user-friendly messages
 * - Comprehensive correlation ID tracking for debugging
 * 
 * @see lib/tools/executor/types.ts for type definitions
 * @see lib/tools/executor/execution-flow-design.md for architecture details
 * @see docs/planning/250614d_tool_execution_framework.md for implementation plan
 */

import { 
  getTool,
  type Tool 
} from '@/lib/tools/registry'
import { generateCorrelationId } from '@/lib/services/logger'
import {
  ToolExecutorError,
  ToolTimeoutError,
  ToolAuthenticationError,
  ToolValidationError,
  ToolServerError,
  ToolNotFoundError,
  ToolCacheNotFoundError,
  DEFAULT_TIMEOUTS
} from './types'
import type {
  ToolExecutor,
  ToolExecutionResult,
  ExecutionOptions,
  ExecutionContext,
  ToolApiRequest,
  ToolApiResponse,
  ToolApiErrorResponse,
  ExecutableTool
} from './types'

/**
 * Main tool execution function with dual execution paths
 * 
 * @param toolId - Tool identifier from registry
 * @param action - Action to perform ('execute', 'open', 'refresh')
 * @param parameters - Tool-specific parameters
 * @param options - Execution options (timeout, source, etc.)
 * @returns Promise resolving to execution result
 * 
 * @throws {ToolNotFoundError} If tool is not registered
 * @throws {ToolValidationError} If parameters are invalid
 * @throws {ToolTimeoutError} If operation times out
 * @throws {ToolAuthenticationError} If authentication fails
 * @throws {ToolServerError} If server operation fails
 * @throws {ToolCancelledError} If operation is cancelled
 */
export const executeTool: ToolExecutor = async (
  toolId: string,
  action: string,
  parameters: Record<string, unknown> = {},
  options: ExecutionOptions = {}
): Promise<ToolExecutionResult> => {
  const correlationId = generateCorrelationId()
  
  // Step 1: Validate tool exists in registry
  const tool = getTool(toolId)
  if (!tool) {
    throw new ToolNotFoundError(toolId, { correlationId })
  }
  
  // Step 2: Create execution context
  const context = createExecutionContext(correlationId, options.source || 'direct')
  
  // Step 3: Determine execution path
  const executionType = determineExecutionType(tool, action, options)
  
  try {
    if (executionType === 'local') {
      return await executeLocalTool(tool, action, parameters, context)
    } else {
      return await executeServerTool(tool, action, parameters, options, context)
    }
  } catch (error) {
    // Transform any unhandled errors into proper ToolExecutorError instances
    if (error instanceof ToolExecutorError) {
      throw error
    }
    
    // Log unexpected errors for debugging
    console.error(`Unexpected error in executeTool for ${toolId}:`, error)
    
    throw new ToolServerError(
      error instanceof Error ? error.message : 'Unexpected error during tool execution',
      500,
      {
        toolId,
        correlationId,
        ...(error instanceof Error ? { cause: error } : {})
      }
    )
  }
}

/**
 * Create execution context for the request
 */
function createExecutionContext(
  correlationId: string,
  source: ExecutionContext['request']['source']
): ExecutionContext {
  return {
    request: {
      correlationId,
      timestamp: new Date(),
      source,
      executionType: 'server' // Will be updated by execution path
    }
  }
}

/**
 * Determine whether to use local or server execution
 */
function determineExecutionType(
  tool: Tool,
  action: string,
  options: ExecutionOptions
): 'local' | 'server' {
  // Force execution type if specified in options
  if (options.forceExecutionType) {
    return options.forceExecutionType
  }
  
  // Navigation action ('open') is always local
  if (action === 'open') {
    return 'local'
  }
  
  // Check if tool has execution preferences
  const executableTool = tool as ExecutableTool
  
  // If tool specifies local operations, check if this action is local
  if (executableTool.localOperations?.includes(action)) {
    return 'local'
  }
  
  // If tool specifies server operations, check if this action is server-only
  if (executableTool.serverOperations?.includes(action)) {
    return 'server'
  }
  
  // Default to server execution for data operations
  return 'server'
}

/**
 * Execute tool locally (client-side operations)
 */
async function executeLocalTool(
  tool: Tool,
  action: string,
  parameters: Record<string, unknown>,
  context: ExecutionContext
): Promise<ToolExecutionResult> {
  const startTime = Date.now()
  
  // Update context for local execution
  context.request.executionType = 'local'
  
  // Handle navigation action
  if (action === 'open') {
    return handleNavigationAction(tool, parameters, context, startTime)
  }
  
  // Handle other local operations
  // For now, we don't have specific local handlers implemented
  // This would be extended as we identify more local-only operations
  throw new ToolValidationError(
    [`Local action '${action}' not supported for tool '${tool.id}'`],
    { toolId: tool.id, correlationId: context.request.correlationId }
  )
}

/**
 * Handle navigation action (tool opening)
 * 
 * This function returns a navigation result that can be handled by the caller.
 * The actual navigation is handled by the useToolExecutorWithNavigation hook
 * which processes navigation results and updates the URL state appropriately.
 * 
 * This approach keeps the executor agnostic about navigation specifics while
 * providing the necessary information for navigation to occur.
 */
function handleNavigationAction(
  tool: Tool,
  parameters: Record<string, unknown>,
  context: ExecutionContext,
  startTime: number
): ToolExecutionResult {
  // Return navigation result with all necessary information
  // The actual navigation will be handled by the useToolExecutorWithNavigation hook
  return {
    type: 'navigation',
    data: {
      tab: tool.tabId,
      parameters,
      success: true
    },
    metadata: {
      toolId: tool.id,
      action: 'open',
      executionType: 'local',
      executionTime: Date.now() - startTime,
      correlationId: context.request.correlationId
    }
  }
}

/**
 * Execute tool on server (API operations)
 */
async function executeServerTool(
  tool: Tool,
  action: string,
  parameters: Record<string, unknown>,
  options: ExecutionOptions,
  context: ExecutionContext
): Promise<ToolExecutionResult> {
  const startTime = Date.now()
  
  // Update context for server execution
  context.request.executionType = 'server'
  
  // Step 1: Parameter validation
  if (!options.skipValidation) {
    const validatedParams = await validateParameters(tool, action, parameters)
    parameters = validatedParams
  }
  
  // Step 2: Configure timeout
  const timeout = determineTimeout(tool, action, options)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    // Step 3: Build API request
    const apiRequest: ToolApiRequest = {
      action,
      parameters,
      metadata: {
        correlationId: context.request.correlationId,
        source: context.request.source,
        timestamp: new Date().toISOString()
      }
    }
    
    // Step 4: Determine API endpoint
    const executableTool = tool as ExecutableTool
    const endpoint = `/api/tools/${executableTool.apiEndpoint?.route || tool.id}`
    
    // Step 5: Execute API call
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // Auth cookies are forwarded automatically by the browser
      },
      body: JSON.stringify(apiRequest),
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    // Step 6: Handle response
    if (!response.ok) {
      const problemDetails: ToolApiErrorResponse = await response.json()
      throw mapApiErrorToExecutorError(problemDetails)
    }
    
    const result: ToolApiResponse = await response.json()
    
    return {
      type: 'data',
      data: result,
      metadata: {
        toolId: tool.id,
        action,
        executionType: 'server',
        executionTime: Date.now() - startTime,
        cached: (result as Record<string, unknown>).cached as boolean || false,
        correlationId: context.request.correlationId
      }
    }
    
  } catch (error) {
    clearTimeout(timeoutId)
    
    // Handle abort/timeout error
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ToolTimeoutError(tool.id, timeout, { 
        correlationId: context.request.correlationId 
      })
    }
    
    // Re-throw ToolExecutorError instances
    if (error instanceof ToolExecutorError) {
      throw error
    }
    
    // Handle fetch/network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ToolServerError(
        'Network error - please check your connection and try again',
        0, // No HTTP status for network errors
        { toolId: tool.id, correlationId: context.request.correlationId, cause: error }
      )
    }
    
    // Handle other unexpected errors
    throw new ToolServerError(
      error instanceof Error ? error.message : 'Unexpected server error',
      500,
      {
        toolId: tool.id,
        correlationId: context.request.correlationId,
        ...(error instanceof Error ? { cause: error } : {})
      }
    )
  }
}

/**
 * Validate parameters against tool schema
 */
async function validateParameters(
  tool: Tool,
  action: string,
  parameters: Record<string, unknown>
): Promise<Record<string, unknown>> {
  // For now, we just return parameters as-is
  // In a full implementation, this would:
  // 1. Get validation schema for the tool/action combination
  // 2. Use Zod to validate parameters
  // 3. Return validated/transformed parameters
  // 4. Throw ToolValidationError for invalid parameters
  
  // Basic validation: ensure parameters is an object
  if (parameters === null || typeof parameters !== 'object') {
    throw new ToolValidationError(
      ['Parameters must be a valid object'],
      { toolId: tool.id }
    )
  }
  
  return parameters
}

/**
 * Determine timeout for the operation
 */
function determineTimeout(
  tool: Tool,
  action: string,
  options: ExecutionOptions
): number {
  // Use explicit timeout from options if provided
  if (options.timeout) {
    return options.timeout
  }
  
  const executableTool = tool as ExecutableTool
  
  // Check tool-specific timeout configuration
  if (executableTool.timeouts) {
    // Determine timeout type based on action name patterns
    if (action.includes('ai') || action.includes('generate') || action.includes('analyze')) {
      return executableTool.timeouts.ai || DEFAULT_TIMEOUTS.ai
    }
    
    if (action.includes('upload') || action.includes('process')) {
      return executableTool.timeouts.upload || DEFAULT_TIMEOUTS.upload
    }
    
    if (action.includes('analysis') || action.includes('complex')) {
      return executableTool.timeouts.analysis || DEFAULT_TIMEOUTS.analysis
    }
    
    // Use tool default
    if (executableTool.timeouts.default) {
      return executableTool.timeouts.default
    }
  }
  
  // Use system default
  return DEFAULT_TIMEOUTS.default
}

/**
 * Map API error responses to ToolExecutorError instances
 */
function mapApiErrorToExecutorError(problemDetails: ToolApiErrorResponse): ToolExecutorError {
  const { status, detail, toolId, correlationId } = problemDetails
  const commonOptions = { toolId, correlationId }
  
  switch (status) {
    case 401:
    case 403:
      return new ToolAuthenticationError(detail, commonOptions)
      
    case 400:
    case 422:
      return new ToolValidationError([detail], commonOptions)
      
    case 404:
      if (problemDetails.code === 'STRUCTURE_CACHE_NOT_FOUND') {
        return new ToolCacheNotFoundError(detail, { toolId, correlationId })
      }
      return new ToolNotFoundError(toolId, { correlationId })
      
    case 408:
    case 504:
      return new ToolTimeoutError(toolId, 0, { correlationId })
      
    case 500:
    case 502:
    case 503:
    default:
      return new ToolServerError(detail, status, commonOptions)
  }
}

/**
 * Get user-friendly error message from ToolExecutorError
 * 
 * This transforms technical error details into messages suitable for end users.
 * 
 * @deprecated Use the comprehensive error UI system instead:
 * - Import { showToolError } from '@/lib/tools/executor/error-ui'
 * - Import { transformErrorToMessage } from '@/lib/tools/executor/error-messages'
 * These provide much richer error handling with proper UI integration.
 */
export function getErrorMessage(error: ToolExecutorError): string {
  switch (error.code) {
    case 'TOOL_TIMEOUT':
      return `Operation timed out. ${error.retryable ? 'Please try again.' : 'Please try a different approach.'}`
      
    case 'TOOL_AUTH_FAILED':
      return 'Authentication required. Please sign in and try again.'
      
    case 'TOOL_VALIDATION_FAILED':
      return `Invalid parameters: ${(error as ToolValidationError).validationErrors.join(', ')}`
      
    case 'TOOL_NOT_FOUND':
      return 'Tool not available. Please refresh the page and try again.'
      
    case 'TOOL_SERVER_ERROR':
      return 'Service temporarily unavailable. Please try again later.'
      
    case 'TOOL_CANCELLED':
      return 'Operation was cancelled.'
      
    default:
      return 'An unexpected error occurred. Please try again.'
  }
}

/**
 * Check if an error is retryable
 * 
 * @param error - Error to check
 * @returns True if the error indicates a retryable condition
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof ToolExecutorError) {
    return error.retryable
  }
  return false
}

/**
 * Create a cancellable execution wrapper
 * 
 * This provides a way to cancel tool execution from the UI.
 * 
 * @param executor - Tool executor function
 * @returns Object with execute and cancel methods
 */
export function createCancellableExecution(executor: ToolExecutor) {
  let currentController: AbortController | null = null
  
  return {
    async execute(
      toolId: string,
      action: string,
      parameters?: Record<string, unknown>,
      options?: ExecutionOptions
    ): Promise<ToolExecutionResult> {
      // Cancel any existing execution
      if (currentController) {
        currentController.abort()
      }
      
      // Create new controller for this execution
      currentController = new AbortController()
      
      try {
        const result = await executor(toolId, action, parameters, {
          ...options,
          // Note: We don't directly pass AbortController since the executor
          // creates its own for the fetch operation. In a full implementation,
          // we'd need to coordinate cancellation between UI and execution layers.
        })
        
        currentController = null
        return result
      } catch (error) {
        currentController = null
        throw error
      }
    },
    
    cancel(): void {
      if (currentController) {
        currentController.abort()
        currentController = null
      }
    }
  }
}

/**
 * Default export for convenient importing
 */
export default executeTool