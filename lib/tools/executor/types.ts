/**
 * Type definitions for the unified tool execution framework.
 * 
 * This module defines the core interfaces for executing tools through a unified
 * execution framework that handles both local operations (URL state, navigation)
 * and server operations (API calls, data processing).
 * 
 * Key Design Principles:
 * - Dual execution paths (local vs server)
 * - Fail immediately and clearly (no retries)
 * - Preserve existing authentication and logging patterns
 * - Type-safe wrapper generation from registry
 * 
 * @see planning/250614d_tool_execution_framework.md for implementation plan
 * @see docs/conversations/250627b_conversation_tool_execution_framework_architecture_decisions.md for design rationale
 */

import type { Tool } from '../types'
import { TOOL_TIMEOUTS } from '../../config'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database-extensions'

/**
 * Execution context provided to tools during execution
 */
export interface ExecutionContext {
  /** Current document information (server execution only) */
  document?: {
    id: string
    title: string
    content?: string
    metadata?: Record<string, unknown>
  }
  
  /** User context (server execution only) */
  user?: {
    id: string
    email: string
    preferences?: Record<string, unknown>
  }
  
  /** Request metadata for correlation and debugging */
  request: {
    correlationId: string
    timestamp: Date
    source: 'command-palette' | 'keyboard' | 'api' | 'llm' | 'direct'
    executionType: 'local' | 'server'
  }
  
  /** URL state at time of execution */
  urlState?: Record<string, unknown>
  
  /** Authenticated Supabase client (server execution only, test environment) */
  supabaseClient?: SupabaseClient<Database>
}

/**
 * Parameters for tool execution
 */
export interface ToolExecutionParams {
  /** Action to perform */
  action: 'execute' | 'open' | 'refresh'
  
  /** Tool-specific parameters */
  parameters?: Record<string, unknown>
  
  /** Execution options */
  options?: ExecutionOptions
}

/**
 * Options for controlling execution behavior
 */
export interface ExecutionOptions {
  /** Timeout in milliseconds (overrides tool default) */
  timeout?: number
  
  /** Request source for tracking */
  source?: ExecutionContext['request']['source']
  
  /** Force execution type (overrides tool preference) */
  forceExecutionType?: 'local' | 'server'
  
  /** Skip parameter validation */
  skipValidation?: boolean
  
  /** Additional metadata to include in context */
  metadata?: Record<string, unknown>
}

/**
 * Result of tool execution
 */
export interface ToolExecutionResult {
  /** Result type */
  type: 'navigation' | 'data' | 'error'
  
  /** Result data (varies by tool and action) */
  data?: unknown
  
  /** Error information if type is 'error' */
  error?: {
    message: string
    code: string
    details?: Record<string, unknown>
    retryable?: boolean
  }
  
  /** Metadata about the execution */
  metadata: {
    toolId: string
    action: string
    executionType: 'local' | 'server'
    executionTime: number
    cached?: boolean
    correlationId: string
    [key: string]: unknown
  }
}

/**
 * Configuration for tool timeouts based on operation type
 */
export interface ToolTimeoutConfig {
  /** Default timeout for standard operations (30s) */
  default: number
  
  /** Timeout for AI/LLM operations (60s) */
  ai: number
  
  /** Timeout for complex analysis operations (120s) */
  analysis: number
  
  /** Timeout for document upload/processing (180s) */
  upload: number
}

/**
 * Error hierarchy for consistent error handling
 */
export abstract class ToolExecutorError extends Error {
  abstract readonly code: string
  abstract readonly retryable: boolean
  readonly correlationId?: string | undefined
  readonly toolId?: string | undefined
  
  constructor(
    message: string, 
    options?: { 
      correlationId?: string
      toolId?: string
      cause?: Error 
    }
  ) {
    super(message)
    this.name = this.constructor.name
    this.correlationId = options?.correlationId
    this.toolId = options?.toolId
    if (options?.cause) {
      this.cause = options.cause
    }
  }
}

/**
 * Tool operation exceeded configured timeout
 */
export class ToolTimeoutError extends ToolExecutorError {
  readonly code = 'TOOL_TIMEOUT'
  readonly retryable = true
  readonly timeout: number
  
  constructor(
    toolId: string, 
    timeout: number, 
    options?: { correlationId?: string }
  ) {
    super(
      `Tool '${toolId}' operation timed out after ${timeout}ms`, 
      { toolId, ...options }
    )
    this.timeout = timeout
  }
}

/**
 * Authentication failures (401/403)
 */
export class ToolAuthenticationError extends ToolExecutorError {
  readonly code = 'TOOL_AUTH_FAILED'
  readonly retryable = false
  
  constructor(
    message: string = 'Authentication required', 
    options?: { correlationId?: string; toolId?: string }
  ) {
    super(message, options)
  }
}

/**
 * Parameter validation failures (400/422)
 */
export class ToolValidationError extends ToolExecutorError {
  readonly code = 'TOOL_VALIDATION_FAILED'
  readonly retryable = false
  readonly validationErrors: string[]
  
  constructor(
    validationErrors: string[], 
    options?: { correlationId?: string; toolId?: string }
  ) {
    super(
      `Parameter validation failed: ${validationErrors.join(', ')}`, 
      options
    )
    this.validationErrors = validationErrors
  }
}

/**
 * Server/API errors (500/502/503/504)
 */
export class ToolServerError extends ToolExecutorError {
  readonly code = 'TOOL_SERVER_ERROR'
  readonly retryable = true
  readonly httpStatus?: number | undefined
  
  constructor(
    message: string, 
    httpStatus?: number,
    options?: { correlationId?: string; toolId?: string; cause?: Error }
  ) {
    super(message, options)
    if (httpStatus !== undefined) {
      this.httpStatus = httpStatus
    }
  }
}

/**
 * Invalid tool IDs (404)
 */
export class ToolNotFoundError extends ToolExecutorError {
  readonly code = 'TOOL_NOT_FOUND'
  readonly retryable = false
  
  constructor(
    toolId: string, 
    options?: { correlationId?: string }
  ) {
    super(`Tool '${toolId}' not found in registry`, { toolId, ...options })
  }
}

/**
 * Operation was cancelled by user or system
 */
export class ToolCancelledError extends ToolExecutorError {
  readonly code = 'TOOL_CANCELLED'
  readonly retryable = false
  
  constructor(
    toolId: string, 
    options?: { correlationId?: string }
  ) {
    super(`Tool '${toolId}' execution was cancelled`, { toolId, ...options })
  }
}

/**
 * API endpoint mapping for unified tool routes
 */
export interface ToolApiEndpoint {
  /** Route path relative to /api/tools/ (e.g., 'glossary') */
  route: string
  
  /** Supported HTTP methods */
  methods: ('GET' | 'POST' | 'DELETE')[]
  
  /** Timeout configuration (inherits from ToolTimeoutConfig if not specified) */
  timeout?: Partial<ToolTimeoutConfig>
  
  /** Whether this endpoint supports caching */
  cacheable?: boolean
  
  /** Whether this endpoint requires authentication */
  requiresAuth?: boolean
}

/**
 * Extended tool interface with execution configuration
 */
export interface ExecutableTool extends Tool {
  /** API endpoint configuration (if tool has server operations) */
  apiEndpoint?: ToolApiEndpoint
  
  /** Preferred execution type hint for developers */
  preferredExecution?: 'local' | 'server' | 'hybrid'
  
  /** Operations that should execute locally */
  localOperations?: string[]
  
  /** Operations that require server execution */
  serverOperations?: string[]
  
  /** Timeout configuration for this tool */
  timeouts?: Partial<ToolTimeoutConfig>
}

/**
 * Registry mapping from tool IDs to API endpoints
 */
export interface ApiEndpointRegistry {
  [toolId: string]: ToolApiEndpoint
}

/**
 * Request format for unified API endpoints
 */
export interface ToolApiRequest {
  /** Action to perform */
  action: string
  
  /** Tool-specific parameters */
  parameters: Record<string, unknown>
  
  /** Request metadata */
  metadata: {
    correlationId: string
    source: ExecutionContext['request']['source']
    timestamp: string
  }
}

/**
 * Response format for successful API calls (direct data, no envelope)
 */
export type ToolApiResponse = Record<string, unknown>

/**
 * Error response format following RFC 9457 Problem Details
 */
export interface ToolApiErrorResponse {
  /** Problem type URI */
  type: string
  
  /** Short summary */
  title: string
  
  /** HTTP status code */
  status: number
  
  /** Detailed explanation */
  detail: string
  
  /** Request instance that caused the problem */
  instance: string
  
  /** Tool that generated the error */
  toolId: string
  
  /** Correlation ID for debugging */
  correlationId: string
  
  /** Whether the operation can be retried */
  retryable: boolean
  
  /** Additional problem-specific fields */
  [key: string]: unknown
}

/**
 * Function signature for tool executor
 */
export type ToolExecutor = (
  toolId: string,
  action: string,
  parameters?: Record<string, unknown>,
  options?: ExecutionOptions
) => Promise<ToolExecutionResult>

/**
 * Function signature for generated tool wrappers
 */
export interface ToolWrapper {
  /** Execute tool with server processing */
  execute: (parameters?: Record<string, unknown>, options?: ExecutionOptions) => Promise<ToolExecutionResult>
  
  /** Open tool (navigation/local operation) */
  open: (parameters?: Record<string, unknown>, options?: ExecutionOptions) => Promise<ToolExecutionResult>
  
  /** Refresh tool data */
  refresh: (parameters?: Record<string, unknown>, options?: ExecutionOptions) => Promise<ToolExecutionResult>
}

/**
 * Type for auto-generated tool wrappers object
 */
export type GeneratedToolWrappers = {
  [K in string]: ToolWrapper
}

/**
 * Configuration for wrapper generation
 */
export interface WrapperGenerationConfig {
  /** Include type definitions in generated code */
  includeTypes?: boolean
  
  /** Generate JSDoc comments for IntelliSense */
  includeDocumentation?: boolean
  
  /** Validation schema for parameters */
  validateParameters?: boolean
}

/**
 * Default timeout configuration
 *
 * Sourced from TOOL_TIMEOUTS in lib/config.ts so that the values are
 * configurable from a single location.
 */
export const DEFAULT_TIMEOUTS: ToolTimeoutConfig = {
  default: TOOL_TIMEOUTS.DEFAULT,
  ai: TOOL_TIMEOUTS.AI,
  analysis: TOOL_TIMEOUTS.ANALYSIS,
  upload: TOOL_TIMEOUTS.UPLOAD
} as const

/**
 * Type guards for error handling
 */
export function isToolExecutorError(error: unknown): error is ToolExecutorError {
  return error instanceof ToolExecutorError
}

export function isRetryableError(error: unknown): boolean {
  return isToolExecutorError(error) && error.retryable
}