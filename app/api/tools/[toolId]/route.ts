/**
 * Unified API endpoint for all tool operations.
 * 
 * This endpoint handles execution for all registered tools through a
 * standardized interface while preserving tool-specific logic and parameters.
 * 
 * Route: /api/tools/[toolId]
 * Methods: GET, POST, DELETE
 * 
 * @see lib/tools/executor/types.ts for type definitions
 * @see lib/tools/executor/execution-flow-design.md for architecture
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth/server-auth'
import { createRequestLogger, generateCorrelationId, createTimer } from '@/lib/services/logger'
import { getTool, isRegistryLocked } from '@/lib/tools/registry'
import { initializeToolRegistry } from '@/lib/tools/registry-loader'
import { z } from 'zod'
import type { 
  ToolApiRequest, 
  ToolApiResponse, 
  ToolApiErrorResponse,
  ExecutionContext 
} from '@/lib/tools/executor/types'

// Cache the registry initialization to avoid repeated initialization
let registryInitialized = false

/**
 * Ensure the tool registry is initialized
 */
async function ensureRegistryInitialized(): Promise<void> {
  if (!registryInitialized || !isRegistryLocked()) {
    await initializeToolRegistry()
    registryInitialized = true
  }
}

// Request validation schemas
const UnifiedRequestSchema = z.object({
  action: z.enum(['execute', 'get', 'delete', 'refresh']).default('execute'),
  parameters: z.record(z.unknown()).default({}),
  metadata: z.object({
    correlationId: z.string(),
    source: z.enum(['command-palette', 'keyboard', 'api', 'llm', 'direct']),
    timestamp: z.string()
  }).optional()
})

const GetParamsSchema = z.object({
  action: z.enum(['get', 'list']).default('get'),
  // Tool-specific query parameters will be passed through
}).passthrough() // Allow additional properties to be passed through

/**
 * Create execution context for the request
 */
async function createExecutionContext(
  request: NextRequest,
  correlationId: string,
  toolId: string
): Promise<ExecutionContext> {
  const timer = createTimer()
  
  // Get user context if authenticated
  let user
  try {
    const authResult = await validateAuth(request, { requireAuth: false })
    if (authResult.success) {
      user = {
        id: authResult.user.id,
        email: authResult.user.email || '',
        preferences: {} // Could be expanded later
      }
    }
  } catch (error) {
    // User not authenticated - proceed without user context
  }
  
  // For now, document context would need to be passed in parameters
  // In a full implementation, we might extract documentId from parameters
  // and fetch document context here
  
  return {
    user,
    request: {
      correlationId,
      timestamp: new Date(),
      source: 'api', // Default for direct API calls
      executionType: 'server'
    }
  }
}

/**
 * Create RFC 9457 Problem Details error response
 */
function createErrorResponse(
  error: {
    status: number
    code: string
    message: string
    details?: Record<string, unknown>
    retryable?: boolean
  },
  toolId: string,
  correlationId: string,
  instance: string
): NextResponse<ToolApiErrorResponse> {
  const problemDetails: ToolApiErrorResponse = {
    type: `https://spideryarn.com/problems/${error.code.toLowerCase()}`,
    title: getErrorTitle(error.status),
    status: error.status,
    detail: error.message,
    instance,
    toolId,
    correlationId,
    retryable: error.retryable ?? false,
    ...error.details
  }
  
  return NextResponse.json(problemDetails, { status: error.status })
}

function getErrorTitle(status: number): string {
  switch (status) {
    case 400: return 'Bad Request'
    case 401: return 'Unauthorized'
    case 403: return 'Forbidden'
    case 404: return 'Not Found'
    case 408: return 'Request Timeout'
    case 422: return 'Unprocessable Entity'
    case 429: return 'Too Many Requests'
    case 500: return 'Internal Server Error'
    case 502: return 'Bad Gateway'
    case 503: return 'Service Unavailable'
    case 504: return 'Gateway Timeout'
    default: return 'Unknown Error'
  }
}

/**
 * Route implementations by tool ID
 * Only include handlers that have been implemented
 */
const toolHandlers = {
  metadata: () => import('./handlers/metadata'),
  glossary: () => import('./handlers/glossary'),
  search: () => import('./handlers/search'),
  summary: () => import('./handlers/summary'),
  chat: () => import('./handlers/chat'),
  structure: () => import('./handlers/structure'),
  highlights: () => import('./handlers/highlights')
}

/**
 * GET handler - retrieve tool data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ toolId: string }> }
) {
  const correlationId = generateCorrelationId()
  const { pathname } = new URL(request.url)
  const logger = createRequestLogger('GET /api/tools/[toolId]', correlationId)
  const timer = createTimer()
  
  let toolId = 'unknown'
  try {
    const resolvedParams = await params
    toolId = resolvedParams.toolId
    logger.info('Processing GET request', { toolId })
    
    // Ensure tool registry is initialized
    await ensureRegistryInitialized()
    
    // Validate tool exists
    const tool = getTool(toolId)
    if (!tool) {
      return createErrorResponse(
        {
          status: 404,
          code: 'TOOL_NOT_FOUND',
          message: `Tool '${toolId}' not found in registry`,
          retryable: false
        },
        toolId,
        correlationId,
        pathname
      )
    }
    
    // For GET requests, authentication is optional by default
    // Individual handlers can check context.user and require auth if needed
    // This matches the original tool endpoint behavior
    
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    
    const validation = GetParamsSchema.safeParse(queryParams)
    if (!validation.success) {
      return createErrorResponse(
        {
          status: 400,
          code: 'TOOL_VALIDATION_FAILED',
          message: `Invalid query parameters: ${validation.error.errors.map(e => e.message).join(', ')}`,
          retryable: false
        },
        toolId,
        correlationId,
        pathname
      )
    }
    
    // Load tool handler
    const handlerModule = toolHandlers[toolId as keyof typeof toolHandlers]
    if (!handlerModule) {
      return createErrorResponse(
        {
          status: 501,
          code: 'TOOL_NOT_IMPLEMENTED',
          message: `Handler not implemented for tool '${toolId}'`,
          retryable: false
        },
        toolId,
        correlationId,
        pathname
      )
    }
    
    const handlerExport = await handlerModule()
    const handler = handlerExport.default || handlerExport
    const context = await createExecutionContext(request, correlationId, toolId)
    
    // Execute tool-specific GET logic
    const result = await handler.handleGet(validation.data, context)
    
    logger.info('GET request completed', {
      toolId,
      action: validation.data.action,
      executionTime: timer.elapsed()
    })
    
    return NextResponse.json(result)
    
  } catch (error) {
    logger.error('GET request failed', { error, executionTime: timer.elapsed() })
    
    return createErrorResponse(
      {
        status: 500,
        code: 'TOOL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error',
        retryable: true
      },
      toolId,
      correlationId,
      pathname
    )
  }
}

/**
 * POST handler - execute tool operations
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ toolId: string }> }
) {
  const correlationId = generateCorrelationId()
  const { pathname } = new URL(request.url)
  const logger = createRequestLogger('POST /api/tools/[toolId]', correlationId)
  const timer = createTimer()
  
  let toolId = 'unknown'
  try {
    const resolvedParams = await params
    toolId = resolvedParams.toolId
    logger.info('Processing POST request', { toolId })
    
    // Ensure tool registry is initialized
    await ensureRegistryInitialized()
    
    // Validate tool exists
    const tool = getTool(toolId)
    if (!tool) {
      return createErrorResponse(
        {
          status: 404,
          code: 'TOOL_NOT_FOUND',
          message: `Tool '${toolId}' not found in registry`,
          retryable: false
        },
        toolId,
        correlationId,
        pathname
      )
    }
    
    // Most tools require authentication for POST operations
    const authResult = await validateAuth(request, { requireAuth: true })
    if (!authResult.success) {
      return createErrorResponse(
        {
          status: 401,
          code: 'TOOL_AUTH_FAILED',
          message: 'Authentication required for tool execution',
          retryable: false
        },
        toolId,
        correlationId,
        pathname
      )
    }
    
    // Parse request body
    let requestBody
    try {
      requestBody = await request.json()
    } catch (error) {
      return createErrorResponse(
        {
          status: 400,
          code: 'TOOL_VALIDATION_FAILED',
          message: 'Invalid JSON in request body',
          retryable: false
        },
        toolId,
        correlationId,
        pathname
      )
    }
    
    // Validate request structure
    const validation = UnifiedRequestSchema.safeParse(requestBody)
    if (!validation.success) {
      return createErrorResponse(
        {
          status: 400,
          code: 'TOOL_VALIDATION_FAILED',
          message: `Invalid request format: ${validation.error.errors.map(e => e.message).join(', ')}`,
          retryable: false
        },
        toolId,
        correlationId,
        pathname
      )
    }
    
    const { action, parameters } = validation.data
    
    // Load tool handler
    const handlerModule = toolHandlers[toolId as keyof typeof toolHandlers]
    if (!handlerModule) {
      return createErrorResponse(
        {
          status: 501,
          code: 'TOOL_NOT_IMPLEMENTED',
          message: `Handler not implemented for tool '${toolId}'`,
          retryable: false
        },
        toolId,
        correlationId,
        pathname
      )
    }
    
    const handlerExport = await handlerModule()
    const handler = handlerExport.default || handlerExport
    const context = await createExecutionContext(request, correlationId, toolId)
    
    // Execute tool-specific POST logic
    const result = await handler.handlePost(action, parameters, context)
    
    logger.info('POST request completed', {
      toolId,
      action,
      executionTime: timer.elapsed()
    })
    
    return NextResponse.json(result)
    
  } catch (error) {
    logger.error('POST request failed', { error, executionTime: timer.elapsed() })
    
    return createErrorResponse(
      {
        status: 500,
        code: 'TOOL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error',
        retryable: true
      },
      toolId,
      correlationId,
      pathname
    )
  }
}

/**
 * DELETE handler - remove tool data
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ toolId: string }> }
) {
  const correlationId = generateCorrelationId()
  const { pathname } = new URL(request.url)
  const logger = createRequestLogger('DELETE /api/tools/[toolId]', correlationId)
  const timer = createTimer()
  
  let toolId = 'unknown'
  try {
    const resolvedParams = await params
    toolId = resolvedParams.toolId
    logger.info('Processing DELETE request', { toolId })
    
    // Ensure tool registry is initialized
    await ensureRegistryInitialized()
    
    // Validate tool exists
    const tool = getTool(toolId)
    if (!tool) {
      return createErrorResponse(
        {
          status: 404,
          code: 'TOOL_NOT_FOUND',
          message: `Tool '${toolId}' not found in registry`,
          retryable: false
        },
        toolId,
        correlationId,
        pathname
      )
    }
    
    // DELETE operations always require authentication
    const authResult = await validateAuth(request, { requireAuth: true })
    if (!authResult.success) {
      return createErrorResponse(
        {
          status: 401,
          code: 'TOOL_AUTH_FAILED',
          message: 'Authentication required for tool deletion',
          retryable: false
        },
        toolId,
        correlationId,
        pathname
      )
    }
    
    // Parse query parameters for DELETE
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    
    // Load tool handler
    const handlerModule = toolHandlers[toolId as keyof typeof toolHandlers]
    if (!handlerModule) {
      return createErrorResponse(
        {
          status: 501,
          code: 'TOOL_NOT_IMPLEMENTED',
          message: `Handler not implemented for tool '${toolId}'`,
          retryable: false
        },
        toolId,
        correlationId,
        pathname
      )
    }
    
    const handlerExport = await handlerModule()
    const handler = handlerExport.default || handlerExport
    const context = await createExecutionContext(request, correlationId, toolId)
    
    // Execute tool-specific DELETE logic
    const result = await handler.handleDelete(queryParams, context)
    
    logger.info('DELETE request completed', {
      toolId,
      executionTime: timer.elapsed()
    })
    
    return NextResponse.json(result)
    
  } catch (error) {
    logger.error('DELETE request failed', { error, executionTime: timer.elapsed() })
    
    return createErrorResponse(
      {
        status: 500,
        code: 'TOOL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error',
        retryable: true
      },
      toolId,
      correlationId,
      pathname
    )
  }
}