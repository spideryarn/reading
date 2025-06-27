# Tool Migration Guide: Individual Routes → Unified API

This guide documents how to migrate existing tool API routes to the unified `/api/tools/[toolId]` structure.

## Overview

We're migrating from individual API routes like `/api/glossary`, `/api/summarise` to a unified structure at `/api/tools/[toolId]` while preserving all existing functionality.

## Migration Pattern

### 1. Handler Structure

Each tool needs a handler file at `app/api/tools/[toolId]/handlers/{toolId}.ts`:

```typescript
import { BaseToolHandler, createHandlerError } from '../handler-interface'

export class ToolNameHandler extends BaseToolHandler {
  constructor() {
    super('tool-id')
  }
  
  async handleGet(params, context) {
    // Migrate GET logic from original route
  }
  
  async handlePost(action, parameters, context) {
    // Migrate POST logic, handle multiple actions
  }
  
  async handleDelete(params, context) {
    // Migrate DELETE logic from original route
  }
}

export default new ToolNameHandler()
```

### 2. HTTP Method Mapping

| Original Pattern | Unified Pattern | Action Parameter |
|------------------|-----------------|------------------|
| `GET /api/tool` | `GET /api/tools/tool` | `action: 'get'` |
| `POST /api/tool` | `POST /api/tools/tool` | `action: 'execute'` |
| `DELETE /api/tool` | `DELETE /api/tools/tool` | N/A (query params) |

### 3. Parameter Handling

**Original (individual routes):**
```typescript
// Direct body parsing
const { content, documentId } = await request.json()
```

**Unified (handler):**
```typescript
// Parameters passed through unified structure
async handlePost(action, parameters, context) {
  const { content, documentId } = parameters
}
```

## Tool-Specific Migration Status

### ✅ Completed: metadata (reading-difficulty)
- **Original**: `/api/reading-difficulty` 
- **New**: `/api/tools/metadata`
- **Handler**: `handlers/metadata.ts`
- **Actions**: `execute` (analyze), `refresh`

### 🚧 In Progress: glossary
- **Original**: `/api/glossary`
- **New**: `/api/tools/glossary`
- **Complex Features**: Entity storage, "Load More" functionality
- **Migration Notes**: Preserve entity management logic

### 📋 Pending: summary
- **Original**: `/api/summarise` + `/api/multi-summarise`
- **New**: `/api/tools/summary`
- **Challenge**: Merge two similar endpoints
- **Actions**: `execute`, `multi-dimensional`, `refresh`

### 📋 Pending: structure (headings)
- **Original**: `/api/headings`
- **New**: `/api/tools/structure`
- **Note**: Tool renamed from "headings" to "structure"

### 📋 Pending: search
- **Original**: `/api/semantic-search`
- **New**: `/api/tools/search`
- **Complex Features**: Query history, element validation

### 📋 Pending: chat
- **Original**: `/api/chat`
- **New**: `/api/tools/chat`
- **Complex Features**: Thread management, streaming responses

## Migration Checklist

For each tool, complete these steps:

### 1. Create Handler File
- [ ] Create `handlers/{toolId}.ts`
- [ ] Extend `BaseToolHandler`
- [ ] Implement `handleGet`, `handlePost`, `handleDelete`

### 2. Preserve Existing Logic
- [ ] Copy validation schemas from original route
- [ ] Preserve authentication patterns
- [ ] Maintain logging and error handling
- [ ] Keep caching behavior (EnhancementService integration)

### 3. Map HTTP Methods
- [ ] GET → `handleGet` with query parameters
- [ ] POST → `handlePost` with action and parameters
- [ ] DELETE → `handleDelete` with query parameters

### 4. Handle Multiple Actions
For tools with multiple POST operations:
- [ ] Use `action` parameter to distinguish operations
- [ ] Map existing operations to action names
- [ ] Preserve parameter compatibility

### 5. Test Migration
- [ ] Unit tests for handler methods
- [ ] Integration tests for API endpoints  
- [ ] Verify existing clients still work
- [ ] Test error handling and edge cases

### 6. Update Tool Registry
- [ ] Add API endpoint configuration to tool registration
- [ ] Configure timeout settings
- [ ] Set execution preferences (local vs server)

## Common Patterns

### Authentication
```typescript
// Preserved in unified handler - context.user is populated if authenticated
if (!context.user) {
  throw createHandlerError('Authentication required', 'auth')
}
```

### Validation
```typescript
const schema = z.object({ /* validation rules */ })
const validation = schema.safeParse(parameters)
if (!validation.success) {
  throw createHandlerError(`Invalid parameters: ${errors}`, 'validation')
}
```

### Caching Integration
```typescript
// Use existing EnhancementService patterns
const cached = await enhancementService.getCachedResult(documentId, 'tool-type')
if (cached) {
  return { ...cached.data, cached: true }
}
```

### AI Operation Logging
```typescript
const aiCallId = await logAIOperation({
  type: 'tool_operation',
  documentId,
  correlationId: context.request.correlationId
})
```

## Error Handling

Use `createHandlerError` for consistent error responses:

```typescript
// Validation error (400)
throw createHandlerError('Invalid parameters', 'validation')

// Authentication error (401)  
throw createHandlerError('Auth required', 'auth')

// Not found error (404)
throw createHandlerError('Resource not found', 'not_found')

// Server error (500) with retry capability
throw createHandlerError('Processing failed', 'server', true)
```

## Backward Compatibility

During migration:

1. **Keep original routes temporarily** with deprecation warnings
2. **Add redirects** for common client usage patterns  
3. **Update frontend clients** to use unified endpoints
4. **Remove original routes** after deprecation period

## Testing Strategy

### Handler Unit Tests
```typescript
import handler from './handlers/tool-name'

describe('ToolNameHandler', () => {
  it('should handle GET requests', async () => {
    const result = await handler.handleGet(params, context)
    expect(result).toMatchObject({ /* expected shape */ })
  })
})
```

### Integration Tests
```typescript
// Test against unified endpoint
const response = await fetch('/api/tools/tool-name', {
  method: 'POST',
  body: JSON.stringify({ action: 'execute', parameters: {} })
})
```

## Next Steps

1. **Priority 1**: Complete glossary migration (most complex)
2. **Priority 2**: Merge summary endpoints  
3. **Priority 3**: Migrate search with complex validation
4. **Priority 4**: Handle chat streaming requirements
5. **Priority 5**: Update tool registry configurations

## Troubleshooting

### Handler Not Loading
- Check `toolHandlers` mapping in main route file
- Verify export default in handler file

### Parameters Not Matching
- Original routes use direct body parsing
- Unified routes use `parameters` object wrapper

### Authentication Issues
- Check tool `requiresDocument` setting
- Verify context.user is populated correctly

### Caching Problems
- Ensure EnhancementService integration is preserved
- Check metadata fields match original format