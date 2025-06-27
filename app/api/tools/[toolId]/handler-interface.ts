/**
 * Interface for tool-specific handlers in the unified API system.
 * 
 * Each tool implements this interface to handle GET, POST, and DELETE
 * operations while maintaining their specific logic and parameters.
 * 
 * @see lib/tools/executor/types.ts for execution context types
 */

import type { ExecutionContext, ToolApiResponse } from '@/lib/tools/executor/types'

/**
 * Parameters for GET operations (query parameters)
 */
export interface GetRequestParams {
  action: 'get' | 'list'
  [key: string]: unknown
}

/**
 * Parameters for DELETE operations (query parameters)
 */
export interface DeleteRequestParams {
  [key: string]: unknown
}

/**
 * Interface that all tool handlers must implement
 */
export interface ToolHandler {
  /**
   * Handle GET requests for retrieving tool data
   * 
   * @param params - Query parameters from the request
   * @param context - Execution context with user/document info
   * @returns Tool-specific response data
   */
  handleGet(
    params: GetRequestParams,
    context: ExecutionContext
  ): Promise<ToolApiResponse>
  
  /**
   * Handle POST requests for executing tool operations
   * 
   * @param action - Action to perform (execute, refresh, etc.)
   * @param parameters - Tool-specific parameters from request body
   * @param context - Execution context with user/document info
   * @returns Tool-specific response data
   */
  handlePost(
    action: string,
    parameters: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<ToolApiResponse>
  
  /**
   * Handle DELETE requests for removing tool data
   * 
   * @param params - Query parameters from the request
   * @param context - Execution context with user/document info
   * @returns Deletion confirmation or result data
   */
  handleDelete(
    params: DeleteRequestParams,
    context: ExecutionContext
  ): Promise<ToolApiResponse>
}

/**
 * Base class for tool handlers with common utilities
 */
export abstract class BaseToolHandler implements ToolHandler {
  protected toolId: string
  
  constructor(toolId: string) {
    this.toolId = toolId
  }
  
  /**
   * Extract document ID from parameters with validation
   */
  protected getDocumentId(parameters: Record<string, unknown>): string {
    const documentId = parameters.documentId
    if (!documentId || typeof documentId !== 'string') {
      throw new Error('documentId is required and must be a string')
    }
    return documentId
  }
  
  /**
   * Validate required parameters
   */
  protected requireParameters(
    parameters: Record<string, unknown>,
    required: string[]
  ): void {
    const missing = required.filter(key => !(key in parameters))
    if (missing.length > 0) {
      throw new Error(`Missing required parameters: ${missing.join(', ')}`)
    }
  }
  
  /**
   * Create standard metadata for responses
   */
  protected createResponseMetadata(extras: Record<string, unknown> = {}) {
    return {
      toolId: this.toolId,
      timestamp: new Date().toISOString(),
      ...extras
    }
  }
  
  // Abstract methods that subclasses must implement
  abstract handleGet(
    params: GetRequestParams,
    context: ExecutionContext
  ): Promise<ToolApiResponse>
  
  abstract handlePost(
    action: string,
    parameters: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<ToolApiResponse>
  
  abstract handleDelete(
    params: DeleteRequestParams,
    context: ExecutionContext
  ): Promise<ToolApiResponse>
}

/**
 * Error class for tool handler errors
 */
export class ToolHandlerError extends Error {
  constructor(
    message: string,
    public readonly status: number = 500,
    public readonly code: string = 'TOOL_HANDLER_ERROR',
    public readonly retryable: boolean = false
  ) {
    super(message)
    this.name = 'ToolHandlerError'
  }
}

/**
 * Helper function to create handler errors with appropriate HTTP status codes
 */
export function createHandlerError(
  message: string,
  type: 'validation' | 'auth' | 'not_found' | 'server' | 'timeout',
  retryable: boolean = false
): ToolHandlerError {
  switch (type) {
    case 'validation':
      return new ToolHandlerError(message, 400, 'TOOL_VALIDATION_FAILED', false)
    case 'auth':
      return new ToolHandlerError(message, 401, 'TOOL_AUTH_FAILED', false)
    case 'not_found':
      return new ToolHandlerError(message, 404, 'TOOL_NOT_FOUND', false)
    case 'timeout':
      return new ToolHandlerError(message, 408, 'TOOL_TIMEOUT', true)
    case 'server':
    default:
      return new ToolHandlerError(message, 500, 'TOOL_SERVER_ERROR', retryable)
  }
}