# Tool Execution Framework

Comprehensive reference guide for the unified tool execution framework in Spideryarn Reading.

## Overview

The Tool Execution Framework provides a standardized way to execute tools through unified API endpoints with consistent authentication, error handling, and debugging support. All 7 tools (glossary, search, summary, chat, structure, highlights, metadata) use this framework.

## Quick Start

### Using Type-Safe Wrappers (Recommended)

```typescript
import { generateToolWrappers } from '@/lib/tools/executor/wrappers'
import { getAllTools } from '@/lib/tools/registry'

// Generate typed wrappers
const tools = generateToolWrappers(getAllTools())

// Execute tools with full type safety
await tools.glossary.execute({ refresh: true })
await tools.search.execute({ query: 'AI', type: 'semantic' })
await tools.summary.execute({ granularity: 'paragraph' })

// Navigate to tools
await tools.structure.open({ headingId: 'section-1' })
await tools.highlights.open({ criterion: 'important concepts' })

// Refresh tool data
await tools.metadata.refresh()
```

### Using Direct Executor

```typescript
import { executeTool } from '@/lib/tools/executor/executor'

// Direct execution with manual parameter typing
const result = await executeTool('glossary', 'execute', {
  refresh: true,
  documentId: 'doc-123'
})

// Navigation
await executeTool('search', 'open', { query: 'AI' })
```

## API Endpoints

### Unified Endpoint Structure

All tools use the unified `/api/tools/[toolId]` endpoint structure:

```
POST /api/tools/glossary     # Execute glossary operations
GET  /api/tools/glossary     # Get cached glossary data
DELETE /api/tools/glossary   # Clear glossary cache

POST /api/tools/search       # Execute search
POST /api/tools/summary      # Generate summaries
POST /api/tools/chat         # Chat operations
POST /api/tools/structure    # Heading generation
POST /api/tools/highlights   # Semantic highlighting
POST /api/tools/metadata     # Document metadata
```

### Request Format

```typescript
// POST request body
{
  "action": "execute" | "get" | "delete",
  "parameters": {
    // Tool-specific parameters
    "query": "search term",
    "documentId": "doc-123"
  },
  "metadata": {
    "correlationId": "req_123",
    "source": "component-name",
    "timestamp": "2025-06-27T16:00:00Z"
  }
}
```

### Response Format

```typescript
// Success (200)
{
  "data": { /* tool-specific response */ },
  "metadata": {
    "correlationId": "req_123",
    "toolId": "glossary",
    "executionTime": 1500,
    "cached": false
  }
}

// Error (4xx/5xx) - RFC 9457 Problem Details
{
  "type": "https://spideryarn.com/errors/document-not-found",
  "title": "Document Not Found",
  "status": 404,
  "detail": "Document with ID 'abc123' does not exist",
  "instance": "/api/tools/glossary",
  "correlationId": "req_123",
  "retryable": false
}
```

## Error Handling

### Error Types

The framework uses a 6-class error hierarchy:

- **ToolTimeoutError**: Operation exceeded timeout
- **ToolAuthenticationError**: Authentication required (401/403)
- **ToolValidationError**: Invalid parameters (400/422)
- **ToolServerError**: API errors (500/502/503/504)
- **ToolNotFoundError**: Invalid tool IDs (404)
- **ToolCancelledError**: User cancellation

### Error UI Integration

```typescript
// Errors are automatically transformed to user-friendly messages
try {
  await tools.glossary.execute({ refresh: true })
} catch (error) {
  // Error automatically displayed via ToolErrorNotifications component
  // No manual error handling needed for UI display
}
```

## Authentication

All tool executions are automatically authenticated using the existing Supabase auth system:

- **Server execution**: Uses `requireAuth()` from `lib/auth/server-auth.ts`
- **Cookie forwarding**: Browser handles auth cookies automatically
- **Auth errors**: Automatically trigger sign-in dialogs

## Debugging

### Debug Mode

```typescript
import { 
  setExecutorDebugMode, 
  getExecutionHistory, 
  printExecutionSummary 
} from '@/lib/tools/executor/debug'

// Enable debug logging
setExecutorDebugMode(true)

// Execute tools (debug info logged automatically)
await tools.search.execute({ query: 'test' })

// View execution history
const history = getExecutionHistory()
console.log(history.slice(-5)) // Last 5 executions

// Print performance summary
printExecutionSummary()
```

### Development Helpers

```typescript
import { 
  MockToolExecutor, 
  enableProfiling, 
  getPerformanceReport 
} from '@/lib/tools/executor/development-helpers'

// Mock executor for testing
const mockExecutor = MockToolExecutor.getInstance()
mockExecutor.configureMock('glossary', 'execute', {
  delay: 500,
  customResponse: { glossaryTerms: [...] }
})

// Performance profiling
enableProfiling()
await tools.summary.execute({ granularity: 'paragraph' })
console.log(generatePerformanceReport())
```

### Browser Console Helpers

In development, global helpers are available:

```javascript
// Debug utilities
window.toolExecutorDebug.enable()
window.toolExecutorDebug.summary()
window.toolExecutorDebug.history({ toolId: 'glossary' })

// Development helpers
window.toolExecutorDev.mock.configure('search', 'execute', { shouldFail: true })
window.toolExecutorDev.profiling.enable()
window.toolExecutorDev.replay.records()
```

## Migration Guide

### For Existing Components

Replace direct API calls with executor usage:

```typescript
// OLD: Direct API call
const response = await fetch('/api/glossary', {
  method: 'POST',
  body: JSON.stringify({ refresh: true })
})

// NEW: Type-safe executor
const result = await tools.glossary.execute({ refresh: true })
```

### For New Tools

1. **Create handler**: Implement `BaseToolHandler` in `/app/api/tools/[toolId]/handlers/`
2. **Register tool**: Add to tool registry with `apiEndpoint` configuration
3. **Update imports**: Tools are auto-discovered via dynamic imports

## Performance

### Execution Overhead

- **Minimal overhead**: ~2-5ms additional latency for validation and routing
- **Caching**: Automatic caching via EnhancementService where applicable
- **Timeout management**: Per-tool timeout configuration (AI: 60s, analysis: 120s)

### Memory Usage

- **Debug mode**: Tracks execution history (last 100 executions)
- **Production**: Minimal memory footprint with automatic cleanup
- **Profiling**: Optional memory usage tracking in development

## Troubleshooting

### Common Issues

**Tool Not Found (404)**
```
Check tool is registered in registry and handler exists in /app/api/tools/[toolId]/handlers/
```

**Authentication Errors (401/403)**
```
Verify user is signed in and has document access permissions
```

**Validation Errors (400/422)**
```
Check parameter types match tool schema in registry
Use debug mode to inspect actual vs expected parameters
```

**Timeout Errors**
```
Check network connectivity and server health
Increase timeout for specific tools if needed
```

### Debug Information

Enable debug mode to get detailed execution information:

```typescript
setExecutorDebugMode(true)

// All executions will log:
// - Request/response bodies
// - Execution timing
// - Error details
// - Correlation IDs for tracing
```

## Architecture

### Dual Execution Paths

- **Server execution**: API routes for data operations (most tools)
- **Local execution**: Client-side URL state updates (navigation, highlights)
- **Smart routing**: Automatic path selection based on tool configuration

### Integration Points

- **URL State**: Seamless integration with nuqs URL state management
- **Authentication**: Preserves existing Supabase auth patterns
- **Error UI**: Integrates with GlobalUrlWarnings for consistent error display
- **Registry**: Auto-discovery of tools via registry system

## API Reference

### Core Functions

- `executeTool(toolId, action, params, options?)`: Direct execution
- `generateToolWrappers(tools)`: Generate typed wrappers
- `setExecutorDebugMode(enabled)`: Toggle debug logging
- `getExecutionHistory(filters?)`: Get execution history
- `printExecutionSummary()`: Print performance summary

### Tool Actions

- `execute`: Perform tool operation (server execution)
- `open`: Navigate to tool tab (local execution)
- `refresh`: Refresh tool data (server execution)

### Options

```typescript
interface ExecutionOptions {
  timeout?: number        // Override default timeout
  source?: string        // Source component for tracking
  abortSignal?: AbortSignal  // Cancellation support
}
```

---

**See Also:**
- `docs/planning/250614d_tool_execution_framework.md` - Complete planning document
- `docs/reference/TOOL_ARCHITECTURE_AND_DEVELOPMENT_GUIDE.md` - Tool architecture and development guide
- `lib/tools/executor/` - Implementation files
- `app/api/tools/[toolId]/` - Unified API handlers
- `docs/reference/TOOL_*.md` - Individual tool documentation