# Tool Execution Framework

## Goal

Create a unified execution framework for tools that:
- Provides a clean interface for tool invocation
- Clearly separates server-side API calls from client-side UI
- Integrates seamlessly with URL state management
- Offers typed wrapper functions for better DX
- Includes caching and invalidation strategies

## Context

After implementing the tool registry (250614b) and command palette generation (250614c), we need a standardized way to execute tools. Currently, each tool has its own execution pattern - some call API routes, others manipulate UI state directly. We need consistency and clear boundaries.

## References

- `planning/250614b_unified_tool_registry_architecture.md` - Core registry
- `planning/250614c_command_palette_dynamic_generation.md` - Command generation
- `app/api/*/route.ts` - Existing API endpoints for tools
- `lib/auth/server-auth.ts` - Authentication patterns to preserve
- `lib/tools/hooks/use-tool-url-state.ts` - URL state integration

## Principles & Key Decisions

1. **Server-only execution** - All data operations go through API routes
2. **Type safety** - Typed wrapper functions hide registry internals
3. **Auth preservation** - Maintain existing authentication patterns
4. **URL state respect** - Navigation through navigateToTab()
5. **Clear boundaries** - Explicit separation of concerns
6. **Cache invalidation** - Document-aware caching strategy

## Dependencies

- Completion of 250614b (core tool registry)
- Completion of 250614c (command palette generation)

## Stages & Actions

### Stage: Preparation and sync
- [ ] Run `./scripts/sync-worktrees.ts` to pull latest changes
- [ ] Review existing tool API patterns
- [ ] Document current execution flows

### Stage: Execution framework design
- [ ] Create `lib/tools/executor/types.ts`
  - [ ] Define ExecutionContext interface
  - [ ] Define ExecutionResult types
  - [ ] Add ExecutionOptions for caching
  - [ ] Create ExecutorError class
- [ ] Design execution flow
  - [ ] Client initiates execution
  - [ ] Executor validates parameters
  - [ ] Routes to appropriate API endpoint
  - [ ] Handles response and errors
  - [ ] Updates URL state if needed

### Stage: API endpoint mapping
- [ ] Create `lib/tools/executor/api-registry.ts`
  - [ ] Map tool IDs to API endpoints
  - [ ] Define endpoint interface
  - [ ] Handle authentication requirements
  - [ ] Support both GET and POST methods
- [ ] Document API conventions
  - [ ] Naming patterns (/api/tools/[toolId])
  - [ ] Request/response formats
  - [ ] Error handling standards

### Stage: Core executor implementation
- [ ] Create `lib/tools/executor/executor.ts`
  - [ ] Main executeTool() function
  - [ ] Parameter validation against schemas
  - [ ] API endpoint resolution
  - [ ] Fetch with proper auth headers
  - [ ] Response type validation
  - [ ] Error transformation
- [ ] Add execution context
  - [ ] Current document info
  - [ ] User context
  - [ ] Request metadata
  - [ ] Correlation IDs for debugging

### Stage: Typed wrapper functions
- [ ] Create `lib/tools/executor/wrappers.ts`
  - [ ] generateToolWrappers() function
  - [ ] Type-safe wrapper per tool
  - [ ] IntelliSense support
  - [ ] Usage examples
- [ ] Example wrappers:
  ```typescript
  const tools = generateToolWrappers(registry)
  await tools.glossary.execute({ refresh: true })
  await tools.search.execute({ query: 'AI', type: 'semantic' })
  ```

### Stage: Cache implementation
- [ ] Create `lib/tools/executor/cache.ts`
  - [ ] Cache key generation
  - [ ] TTL management
  - [ ] Document version awareness
  - [ ] Invalidation on document.updated_at
- [ ] Add caching to executor
  - [ ] Check cache before API call
  - [ ] Store successful responses
  - [ ] Handle stale-while-revalidate
  - [ ] Memory limits

### Stage: Navigation integration
- [ ] Update executor for navigation
  - [ ] Handle 'open' action specially
  - [ ] Use navigateToTab() for tab changes
  - [ ] Preserve URL as source of truth
  - [ ] No direct context manipulation
- [ ] Test navigation flows
  - [ ] Command palette → tool open
  - [ ] Direct execution → navigation
  - [ ] URL state updates properly

### Stage: Error handling enhancement
- [ ] Comprehensive error strategy
  - [ ] Network errors
  - [ ] Authentication failures
  - [ ] Validation errors
  - [ ] Rate limiting
  - [ ] API errors
- [ ] User-friendly error messages
  - [ ] Map technical errors to user messages
  - [ ] Provide actionable next steps
  - [ ] Include retry mechanisms

### Stage: Update existing tools
- [ ] Migrate tool implementations
  - [ ] Update glossary to use executor
  - [ ] Update search to use executor
  - [ ] Update summary to use executor
  - [ ] Update all other tools
- [ ] Verify API endpoints unchanged
- [ ] Test each migration thoroughly

### Stage: Developer experience
- [ ] Create `lib/tools/executor/debug.ts`
  - [ ] Execution logging utilities
  - [ ] Performance monitoring
  - [ ] Request/response inspection
  - [ ] Cache hit rate tracking
- [ ] Add development helpers
  - [ ] Mock executor for tests
  - [ ] Execution replay for debugging
  - [ ] Performance profiling

### Stage: Testing
- [ ] Unit tests for executor
  - [ ] Parameter validation
  - [ ] API routing
  - [ ] Cache behavior
  - [ ] Error handling
- [ ] Integration tests
  - [ ] Full execution flows
  - [ ] Auth integration
  - [ ] URL state updates
- [ ] Performance benchmarks
  - [ ] Execution overhead
  - [ ] Cache effectiveness
  - [ ] Memory usage

### Stage: Documentation
- [ ] Create execution guide
- [ ] Document cache strategies
- [ ] API endpoint conventions
- [ ] Migration guide for tools
- [ ] Debugging techniques

### Stage: Final validation
- [ ] All tools use executor
- [ ] Consistent error handling
- [ ] Cache working properly
- [ ] No auth bypasses
- [ ] Git commit following guidelines

## Execution Architecture

```typescript
// Client-side execution
async function executeTool(
  toolId: string,
  params: ToolParams
): Promise<ToolResult> {
  const tool = registry.get(toolId)
  if (!tool) throw new Error(`Unknown tool: ${toolId}`)
  
  // Special handling for navigation
  if (params.action === 'open') {
    const navigateToTab = getNavigateToTab()
    navigateToTab(toolId as TabId)
    return { type: 'navigation', data: { tab: toolId } }
  }
  
  // Validate parameters
  const validated = tool.schema.parse(params)
  
  // Check cache
  const cacheKey = generateCacheKey(toolId, validated)
  const cached = await cache.get(cacheKey)
  if (cached && !isStale(cached)) {
    return cached.data
  }
  
  // Execute via API
  const endpoint = getApiEndpoint(toolId)
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Auth headers added by middleware
    },
    body: JSON.stringify({
      ...validated,
      context: getExecutionContext()
    })
  })
  
  if (!response.ok) {
    throw new ExecutorError(
      'API call failed',
      { status: response.status, toolId }
    )
  }
  
  const result = await response.json()
  
  // Cache successful result
  if (tool.cache?.enabled) {
    await cache.set(cacheKey, result, tool.cache.ttl)
  }
  
  return result
}
```

## Cache Strategy

```typescript
interface CacheEntry {
  data: any
  timestamp: number
  documentVersion: string
  ttl: number
}

function generateCacheKey(
  toolId: string,
  params: any,
  documentId?: string
): string {
  const base = `tool:${toolId}:${documentId || 'global'}`
  const paramHash = hashParams(params)
  return `${base}:${paramHash}`
}

function isStale(entry: CacheEntry): boolean {
  // Check TTL
  if (Date.now() - entry.timestamp > entry.ttl * 1000) {
    return true
  }
  
  // Check document version
  const currentDoc = getCurrentDocument()
  if (currentDoc && entry.documentVersion !== currentDoc.updated_at) {
    return true
  }
  
  return false
}
```

## Success Criteria

1. All tools execute through unified framework
2. Clear server/client boundaries maintained
3. Existing auth patterns preserved
4. Cache improves performance measurably
5. Better error messages for users
6. Typed wrappers improve DX

## Risks & Mitigations

1. **API endpoint changes** - Keep endpoints stable, version if needed
2. **Cache invalidation bugs** - Conservative TTLs, version checking
3. **Auth bypass risk** - Extensive testing, security review
4. **Performance overhead** - Benchmark and optimize hot paths
5. **Migration errors** - Incremental migration with tests

## Related Documents

- `planning/250614b_unified_tool_registry_architecture.md` - Registry foundation
- `planning/250614c_command_palette_dynamic_generation.md` - Command integration  
- `planning/250614e_llm_tool_function_calling.md` - Next step building on this
- `docs/reference/DATABASE_SECURITY.md` - Security patterns to maintain
- `planning/critiques/o3__CRITIQUE__OF__250614b_unified_tool_registry_architecture.md` - External review that informed the split approach