# Tool Execution Framework - Execution Flow Design

## Overview

This document specifies the execution flow architecture for the unified tool execution framework, implementing the dual execution path strategy identified in Stage 1 analysis.

## Core Architecture

### Dual Execution Paths

```typescript
// High-level execution flow
async function executeTool(
  toolId: string,
  action: 'execute' | 'open' | 'refresh',
  parameters?: Record<string, unknown>,
  options?: ExecutionOptions
): Promise<ToolExecutionResult>

// Decision tree:
if (action === 'open' || tool.preferredExecution === 'local') {
  return executeLocalTool(tool, action, parameters, context)
} else {
  return executeServerTool(tool, action, parameters, options, context)
}
```

### Local Execution Path

**Purpose**: Immediate operations that don't require server processing
- URL state updates
- Tab navigation  
- UI state changes (highlights, filters)
- Client-side search

**Implementation**:
```typescript
async function executeLocalTool(
  tool: ExecutableTool,
  action: string,
  parameters: Record<string, unknown>,
  context: ExecutionContext
): Promise<ToolExecutionResult> {
  // Navigation actions
  if (action === 'open') {
    const { setState } = getUrlStateManager()
    const { navigateToTab } = getNavigationManager()
    
    // Navigate to tool tab
    navigateToTab(tool.tabId)
    
    // Update URL state with parameters
    if (parameters) {
      const urlUpdates = mapParametersToUrlState(tool, parameters)
      setState(urlUpdates)
    }
    
    return {
      type: 'navigation',
      data: { 
        tab: tool.tabId, 
        urlState: parameters 
      },
      metadata: {
        toolId: tool.id,
        action,
        executionType: 'local',
        executionTime: Date.now() - context.request.timestamp.getTime(),
        correlationId: context.request.correlationId
      }
    }
  }
  
  // Other local operations (tool-specific)
  const localHandler = getLocalHandler(tool.id)
  if (localHandler) {
    return localHandler(action, parameters, context)
  }
  
  throw new ToolValidationError([`Local action '${action}' not supported for tool '${tool.id}'`])
}
```

### Server Execution Path

**Purpose**: Operations requiring AI processing, database access, or authentication
- AI/LLM operations
- Data persistence
- Complex analysis
- Authenticated operations

**Implementation**:
```typescript
async function executeServerTool(
  tool: ExecutableTool,
  action: string,
  parameters: Record<string, unknown>,
  options: ExecutionOptions = {},
  context: ExecutionContext
): Promise<ToolExecutionResult> {
  const startTime = Date.now()
  
  // 1. Timeout configuration
  const timeout = options.timeout || 
    tool.timeouts?.[getTimeoutType(action)] || 
    DEFAULT_TIMEOUTS.default
    
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    // 2. Parameter validation
    const validatedParams = await validateParameters(tool, action, parameters)
    
    // 3. Build API request
    const apiRequest: ToolApiRequest = {
      action,
      parameters: validatedParams,
      metadata: {
        correlationId: context.request.correlationId,
        source: context.request.source,
        timestamp: new Date().toISOString()
      }
    }
    
    // 4. Execute API call
    const endpoint = `/api/tools/${tool.apiEndpoint?.route || tool.id}`
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // Auth cookies forwarded automatically by browser
      },
      body: JSON.stringify(apiRequest),
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    // 5. Handle response
    if (!response.ok) {
      const problemDetails: ToolApiErrorResponse = await response.json()
      throw mapApiErrorToExecutorError(problemDetails)
    }
    
    const result = await response.json()
    
    return {
      type: 'data',
      data: result,
      metadata: {
        toolId: tool.id,
        action,
        executionType: 'server',
        executionTime: Date.now() - startTime,
        cached: result.cached || false,
        correlationId: context.request.correlationId
      }
    }
    
  } catch (error) {
    clearTimeout(timeoutId)
    
    if (error.name === 'AbortError') {
      throw new ToolTimeoutError(tool.id, timeout, { 
        correlationId: context.request.correlationId 
      })
    }
    
    throw error
  }
}
```

## Error Handling Strategy

### Error Mapping from API Responses

```typescript
function mapApiErrorToExecutorError(problemDetails: ToolApiErrorResponse): ToolExecutorError {
  const { status, detail, toolId, correlationId } = problemDetails
  
  switch (status) {
    case 401:
    case 403:
      return new ToolAuthenticationError(detail, { toolId, correlationId })
      
    case 400:
    case 422:
      return new ToolValidationError([detail], { toolId, correlationId })
      
    case 404:
      return new ToolNotFoundError(toolId, { correlationId })
      
    case 408:
    case 504:
      return new ToolTimeoutError(toolId, 0, { correlationId })
      
    case 500:
    case 502:
    case 503:
    default:
      return new ToolServerError(detail, status, { toolId, correlationId })
  }
}
```

### User-Friendly Error Messages

```typescript
function getErrorMessage(error: ToolExecutorError): string {
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
```

## Timeout Management

### Per-Tool Timeout Configuration

```typescript
// Registry defines timeout hints
const glossaryTool: ExecutableTool = {
  // ... other properties
  timeouts: {
    ai: 90000,      // 90 seconds for complex LLM operations
    default: 45000  // 45 seconds for other operations
  }
}

// Dynamic timeout calculation
function getTimeoutForOperation(tool: ExecutableTool, action: string, parameters: any): number {
  // Check for operation-specific timeout
  if (action.includes('ai') || action.includes('generate')) {
    return tool.timeouts?.ai || DEFAULT_TIMEOUTS.ai
  }
  
  if (action.includes('upload') || action.includes('process')) {
    return tool.timeouts?.upload || DEFAULT_TIMEOUTS.upload
  }
  
  if (action.includes('analysis') || action.includes('complex')) {
    return tool.timeouts?.analysis || DEFAULT_TIMEOUTS.analysis  
  }
  
  return tool.timeouts?.default || DEFAULT_TIMEOUTS.default
}
```

### User Cancellation for Long Operations

```typescript
// For operations > 10 seconds, show cancellation UI
if (timeout > 10000) {
  showCancellableProgressUI({
    message: `Processing ${tool.name}...`,
    onCancel: () => controller.abort()
  })
}
```

## Integration with Existing Systems

### URL State Management

```typescript
function mapParametersToUrlState(tool: ExecutableTool, parameters: Record<string, unknown>): Partial<ToolUrlState> {
  const updates: Partial<ToolUrlState> = {}
  
  // Tool-specific parameter mapping
  switch (tool.id) {
    case 'glossary':
      if (parameters.term) updates.term = parameters.term as string
      break
      
    case 'search':
      if (parameters.query) updates.q = parameters.query as string
      if (parameters.type) updates.type = parameters.type as SearchType
      break
      
    case 'summary':
      if (parameters.level) updates.level = parameters.level as SummaryLevel
      break
      
    // Add other tools...
  }
  
  return updates
}
```

### Registry Integration

```typescript
// Extended tool registration with execution config
registerTool({
  id: 'glossary',
  name: 'Glossary',
  // ... existing properties
  
  // New execution configuration
  apiEndpoint: {
    route: 'glossary',
    methods: ['GET', 'POST', 'DELETE'],
    cacheable: true,
    requiresAuth: true
  },
  preferredExecution: 'server',
  localOperations: ['open'],
  serverOperations: ['execute', 'refresh'],
  timeouts: {
    ai: 90000,
    default: 45000
  }
})
```

## Security Considerations

### Local Operation Security

```typescript
// Security boundaries for local operations
const ALLOWED_LOCAL_OPERATIONS = {
  navigation: ['open', 'navigate'],
  ui: ['toggle', 'filter', 'highlight'],
  search: ['text-search'] // Only client-side text search
} as const

function validateLocalOperation(tool: ExecutableTool, action: string): boolean {
  const allowedOperations = tool.localOperations || []
  
  if (!allowedOperations.includes(action)) {
    throw new ToolValidationError([`Local operation '${action}' not allowed for tool '${tool.id}'`])
  }
  
  // Ensure no data mutations in local path
  if (action.includes('create') || action.includes('update') || action.includes('delete')) {
    throw new ToolValidationError([`Data mutation operation '${action}' must use server execution`])
  }
  
  return true
}
```

### Parameter Sanitization

```typescript
function validateParameters(
  tool: ExecutableTool, 
  action: string, 
  parameters: Record<string, unknown>
): Promise<Record<string, unknown>> {
  // Use existing Zod schemas from API routes
  const schema = getValidationSchemaForTool(tool.id, action)
  
  if (!schema) {
    return Promise.resolve(parameters)
  }
  
  const result = schema.safeParse(parameters)
  
  if (!result.success) {
    throw new ToolValidationError(
      result.error.errors.map(e => e.message),
      { toolId: tool.id }
    )
  }
  
  return Promise.resolve(result.data)
}
```

## Performance Considerations

### Execution Context Optimization

```typescript
// Lightweight context for local operations
function createLocalExecutionContext(
  correlationId: string,
  source: ExecutionContext['request']['source']
): ExecutionContext {
  return {
    request: {
      correlationId,
      timestamp: new Date(),
      source,
      executionType: 'local'
    }
    // No user/document context for local operations
  }
}

// Full context for server operations
async function createServerExecutionContext(
  correlationId: string,
  source: ExecutionContext['request']['source']
): Promise<ExecutionContext> {
  // Only fetch user/document context when needed
  const [user, document] = await Promise.all([
    getCurrentUser(),
    getCurrentDocument()
  ])
  
  return {
    user,
    document,
    request: {
      correlationId,
      timestamp: new Date(),
      source,
      executionType: 'server'
    }
  }
}
```

## Testing Strategy

### Unit Tests

```typescript
describe('Tool Execution Framework', () => {
  describe('Local Execution', () => {
    it('should navigate to tool tab for open action', async () => {
      const result = await executeTool('glossary', 'open', { term: 'AI' })
      
      expect(result.type).toBe('navigation')
      expect(result.metadata.executionType).toBe('local')
      expect(result.data?.tab).toBe('glossary')
    })
  })
  
  describe('Server Execution', () => {
    it('should call API endpoint for execute action', async () => {
      const result = await executeTool('glossary', 'execute', { refresh: true })
      
      expect(result.type).toBe('data')
      expect(result.metadata.executionType).toBe('server')
      expect(mockFetch).toHaveBeenCalledWith('/api/tools/glossary', expect.any(Object))
    })
  })
  
  describe('Error Handling', () => {
    it('should handle timeout errors appropriately', async () => {
      mockFetch.mockImplementation(() => new Promise(resolve => 
        setTimeout(resolve, 100000) // Never resolves
      ))
      
      await expect(
        executeTool('glossary', 'execute', {}, { timeout: 1000 })
      ).rejects.toThrow(ToolTimeoutError)
    })
  })
})
```

### Integration Tests

```typescript
describe('Tool Execution Integration', () => {
  it('should preserve existing authentication patterns', async () => {
    const result = await executeTool('glossary', 'execute', { documentId: 'test' })
    
    // Verify API was called with proper auth
    expect(mockValidateAuth).toHaveBeenCalled()
    expect(result.metadata.correlationId).toBeDefined()
  })
})
```

This execution flow design preserves existing patterns while providing a unified interface for both local and server operations, with comprehensive error handling and timeout management.