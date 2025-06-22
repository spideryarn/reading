# Unified Tool Registry Architecture

## Goal

Create a unified tool architecture that:
- Provides consistent interfaces for all document tools (glossary, summary, search, chat, etc.)
- Enables dynamic tool discovery and registration
- Standardizes tool implementation patterns
- Integrates with command palette for keyboard shortcuts
- Lays foundation for future analytics tracking
- Maintains backwards compatibility during migration

## Context

Currently, tools in Spideryarn Reading are implemented independently:
- Each tool has its own component structure and patterns
- Command palette has hardcoded commands for each tool
- No central registry or discovery mechanism
- Inconsistent parameter passing and state management
- Difficult to add new tools or modify existing ones

We need a centralized system that treats tools as first-class citizens with standardized interfaces.

**Update (2025-06-22)**: Since this planning doc was written:
- URL state management has been fully implemented with centralized history management
- URL is now the single source of truth for tab state (no more bidirectional sync)
- All tools have URL state integration (glossary, search, summary, chat, highlights)
- The tool registry architecture remains unimplemented but would integrate well with the existing URL state infrastructure

## References

- `docs/reference/TOOL_TEMPLATE_FOR_CREATING_NEW.md` - Current best practices for tool creation
- `docs/reference/COMMAND_PALETTE.md` - Command palette implementation
- `docs/reference/UNIFIED_LEFT_PANE.md` - Tab system architecture
- `components/command-palette.tsx` - Current hardcoded command implementation
- `planning/250614a_tool_url_state_management.md` - URL state integration (completed - see implementation debrief)
- `planning/finished/250615a_url_state_single_source_of_truth.md` - URL as single source of truth (completed)
- `planning/250614c_llm_tool_function_calling.md` - LLM integration (depends on this)

## Principles & Key Decisions

1. **Use "tool" as the unified term** - Even for navigation and transforms
2. **Gradual migration** - New system coexists with old implementations
3. **Type-safe interfaces** - Leverage TypeScript for tool definitions
4. **Dynamic discovery** - Tools self-register, no hardcoding
5. **Analytics-ready** - Build in tracking points even if no-op initially
6. **Component isolation** - Tools remain independent React components
7. **URL is single source of truth** - Tab navigation must use `navigateToTab()`, never direct context updates (see `planning/finished/250615a_url_state_single_source_of_truth.md`)

## Stages & Actions

### Stage: Preparation and sync
- [ ] Run `./scripts/sync-worktrees.ts` to pull latest changes from main
- [ ] Analyze existing tool implementations for common patterns

### Stage: Design documentation
- [ ] Create `docs/reference/TOOL_ARCHITECTURE.md`
  - [ ] Define Tool interface with all properties
  - [ ] Document tool categories (analysis, navigation, generation, transform)
  - [ ] Explain standard vs optional parameters
  - [ ] Include examples for different tool types
  - [ ] Add migration guide section
- [ ] Update `docs/reference/TOOL_TEMPLATE_FOR_CREATING_NEW.md`
  - [ ] Add section on new registry system
  - [ ] Update examples to show both old and new patterns
  - [ ] Include checklist for registry integration

### Stage: Core type definitions
- [ ] Create `lib/tools/types.ts` with Tool interface
  - [ ] Core Tool interface with metadata
  - [ ] ToolParams for execution context
  - [ ] ToolResult for standardized responses
  - [ ] ToolCategory enum
  - [ ] ToolComponentProps interface
- [ ] Create validation schemas using Zod
  - [ ] Schema for tool registration
  - [ ] Runtime validation helpers
- [ ] Write TypeScript tests for type safety

### Stage: Registry implementation
- [ ] Create `lib/tools/registry.ts`
  - [ ] Tool registry Map for storage
  - [ ] registerTool() function with validation
  - [ ] getTool() and getAllTools() accessors
  - [ ] Tool discovery utilities
  - [ ] Error handling for duplicate registrations
- [ ] Create `lib/tools/registry-loader.ts`
  - [ ] Auto-discovery pattern (optional)
  - [ ] Manual registration helpers
  - [ ] Development mode validation
- [ ] Write comprehensive tests for registry
- [ ] Run tests

### Stage: Tool execution framework
- [ ] Create `lib/tools/executor.ts`
  - [ ] executeTool() function
  - [ ] Parameter validation against schemas
  - [ ] Result type checking
  - [ ] Error boundary for tool failures
  - [ ] Execution context injection
  - [ ] Integration with navigateToTab() for tab navigation
  - [ ] Handle URL state updates via existing hooks
- [ ] Create standard tool actions
  - [ ] 'open' - Activate tool tab/route (uses navigateToTab)
  - [ ] 'execute' - Run tool logic
  - [ ] 'refresh' - Force data refresh
  - [ ] 'close' - Cleanup and close
- [ ] Implement executor navigation handling
  ```typescript
  // When tool returns navigation result
  if (result.type === 'navigation' && result.navigation?.tab) {
    const navigateToTab = getNavigateToTab() // Get from context/hook
    navigateToTab(result.navigation.tab)
  }
  ```
- [ ] Add execution tests

### Stage: Simple tool migration - Glossary
- [ ] Create `lib/tools/implementations/glossary.ts`
  - [ ] Implement Tool interface
  - [ ] Define Zod schemas for params
  - [ ] Migrate execute function
  - [ ] Keep existing component reference
- [ ] Update tool to use registry
  - [ ] Register on app initialization
  - [ ] Maintain backwards compatibility
- [ ] Test glossary with new architecture
  - [ ] Verify existing functionality works
  - [ ] Test new standardized execution

### Stage: Command palette integration
- [ ] Create `lib/tools/command-generation.ts`
  - [ ] generateCommands() from registry
  - [ ] Map tool metadata to commands
  - [ ] Handle keyboard shortcuts
  - [ ] Support conditional visibility
- [ ] Update `components/command-palette.tsx`
  - [ ] Import command generation
  - [ ] Merge generated and legacy commands
  - [ ] Ensure all commands use navigateToTab() for tab changes
  - [ ] Test all shortcuts work
- [ ] Add command generation tests

### Stage: Analytics foundation
- [ ] Create `lib/tools/analytics.ts`
  - [ ] Define AnalyticsEvent interface
  - [ ] Create no-op tracking function
  - [ ] Add tracking points:
    - [ ] Tool opened
    - [ ] Tool executed
    - [ ] Tool error
    - [ ] Custom tool events
  - [ ] Add TODO comments for future implementation
- [ ] Integrate analytics with executor
- [ ] Write tests for analytics calls

### Stage: Complex tool migration - Search
- [ ] Create `lib/tools/implementations/search.ts`
  - [ ] Handle both text and semantic search
  - [ ] Complex parameter schemas
  - [ ] Maintain existing search logic
- [ ] Update search to use registry
- [ ] Test search functionality
- [ ] Verify backwards compatibility

### Stage: Additional tool migrations
- [ ] Create implementation files for:
  - [ ] Summary tool
  - [ ] Chat tool
  - [ ] Highlights tool
  - [ ] Original ToC (navigation example)
  - [ ] AI headings
- [ ] Register all tools
- [ ] Test each migration

### Stage: Developer experience
- [ ] Create `lib/tools/dev-tools.ts`
  - [ ] Registry inspector for debugging
  - [ ] Tool validation utilities
  - [ ] Performance profiling helpers
- [ ] Add development mode warnings
  - [ ] Duplicate registrations
  - [ ] Missing required fields
  - [ ] Schema validation failures
- [ ] Create CLI script for tool scaffolding

### Stage: Documentation and examples
- [ ] Create example tools
  - [ ] Minimal tool example
  - [ ] Complex tool with all features
  - [ ] Navigation tool example
- [ ] Update all existing TOOL_*.md docs
- [ ] Create migration guide with step-by-step instructions
- [ ] Document common patterns and anti-patterns

### Stage: Testing and validation
- [ ] Use subagent for comprehensive testing
  - [ ] All tools work via registry
  - [ ] Command palette integration complete
  - [ ] No regressions in functionality
  - [ ] Performance benchmarks
- [ ] Manual testing of user flows
- [ ] Edge case testing

### Stage: Final review
- [ ] Code review focusing on:
  - [ ] API design and extensibility
  - [ ] Type safety and validation
  - [ ] Performance implications
  - [ ] Migration path clarity
- [ ] Update architecture documentation
- [ ] Git commit following guidelines

## Tool Interface Design

### Complete Tool Interface

```typescript
interface Tool {
  // Identity & Metadata
  id: string                    // Unique identifier (e.g., 'glossary')
  name: string                  // Display name (e.g., 'Glossary')
  description: string           // For command palette and future LLM use
  category: ToolCategory        // 'analysis' | 'navigation' | 'generation' | 'transform'
  icon: ComponentType          // Phosphor icon component
  version: string              // Semver for compatibility
  
  // Execution
  execute: (params: ToolParams) => Promise<ToolResult>
  schema: {
    required: z.ZodSchema      // Required parameters
    optional: z.ZodSchema      // Optional parameters with defaults
  }
  
  // UI Integration
  component?: ComponentType<ToolComponentProps>  // React component
  ui: {
    type: 'tab' | 'route' | 'modal' | 'action'
    route?: string             // For route-based tools
    position?: 'left' | 'right' | 'center'
  }
  shortcuts?: string[]         // Keyboard shortcuts
  
  // Behavior Configuration
  requiresDocument: boolean    // Can only run with document context
  capabilities?: {
    search?: boolean          // Supports search within tool
    export?: boolean          // Can export data
    print?: boolean           // Printable view
  }
  
  // Performance & Analytics
  cache?: {
    enabled: boolean
    ttl: number              // Time to live in seconds
    key?: (params: ToolParams) => string
  }
  analytics?: {
    track: boolean
    events: string[]         // Custom event names
  }
}

interface ToolParams {
  // Standard parameters
  action: 'open' | 'execute' | 'refresh' | 'close'
  context: {
    documentId?: string
    documentContent?: string
    documentSlug?: string
    user?: User
  }
  
  // Tool-specific parameters
  params?: Record<string, any>  // Validated by tool schema
  
  // Metadata
  source?: 'user' | 'command-palette' | 'api' | 'url'
  timestamp?: number
}

interface ToolResult {
  type: 'success' | 'error' | 'navigation' | 'state-change'
  data?: any
  error?: {
    code: string
    message: string
    details?: any
  }
  navigation?: {
    url?: string
    tab?: string  // Executor will use navigateToTab() internally
    external?: boolean
  }
  stateChanges?: Record<string, any>  // For URL state updates
  analytics?: Record<string, any>
}
```

### Registration Example

```typescript
// lib/tools/implementations/glossary.ts
import { registerTool } from '@/lib/tools/registry'
import { GlossaryPanel } from '@/components/tools/GlossaryPanel'
import { BookOpen } from '@phosphor-icons/react'
import { z } from 'zod'

const glossaryTool: Tool = {
  id: 'glossary',
  name: 'Glossary',
  description: 'Extract and display key terms and concepts from the document',
  category: 'analysis',
  icon: BookOpen,
  version: '1.0.0',
  
  schema: {
    required: z.object({
      documentContent: z.string(),
      documentId: z.string()
    }),
    optional: z.object({
      term: z.string().optional(),
      refresh: z.boolean().default(false)
    })
  },
  
  // URL state parameters (integrated with existing URL state system)
  urlState: {
    term: 'string'  // Syncs with ?term= parameter
  },
  
  execute: async (params) => {
    if (params.action === 'open') {
      // NOTE: As of 2025-06-16, use navigateToTab() for tab changes
      // See planning/finished/250615a_url_state_single_source_of_truth.md
      // The executor will handle navigation via URL state
      return {
        type: 'navigation',
        navigation: { tab: 'glossary' }
      }
    }
    
    // Existing glossary logic
    const response = await fetch('/api/glossary', {
      method: 'POST',
      body: JSON.stringify({
        documentId: params.context.documentId,
        documentContent: params.context.documentContent,
        ...params.params
      })
    })
    
    if (!response.ok) {
      return {
        type: 'error',
        error: {
          code: 'GLOSSARY_GENERATION_FAILED',
          message: 'Failed to generate glossary'
        }
      }
    }
    
    return {
      type: 'success',
      data: await response.json()
    }
  },
  
  component: GlossaryPanel,
  ui: { type: 'tab' },
  shortcuts: ['Cmd+5', 'Ctrl+5'],
  requiresDocument: true,
  
  capabilities: {
    search: true,
    export: true
  },
  
  cache: {
    enabled: true,
    ttl: 3600 // 1 hour
  },
  
  analytics: {
    track: true,
    events: ['glossary_opened', 'glossary_generated', 'term_selected']
  }
}

// Register the tool
registerTool(glossaryTool)
```

### Command Generation Example

```typescript
// Generated commands from registry
const generatedCommands = Array.from(toolRegistry.values())
  .filter(tool => tool.shortcuts && tool.shortcuts.length > 0)
  .map(tool => ({
    id: `tool-${tool.id}`,
    name: tool.name,
    icon: tool.icon,
    shortcut: tool.shortcuts,
    description: tool.description,
    category: 'Tools',
    action: async () => {
      // Executor will handle navigation via navigateToTab() internally
      await executeTool(tool.id, {
        action: 'open',
        context: getCurrentContext(),
        source: 'command-palette'
      })
    },
    isAvailable: () => !tool.requiresDocument || !!getCurrentDocument()
  }))
```

## Migration Strategy

### Phase 1: Parallel Systems
1. Implement registry alongside existing tools
2. Migrate one simple tool (Glossary) as proof of concept
3. Ensure no breaking changes to existing functionality

### Phase 2: Gradual Migration
1. Migrate tools one by one
2. Update command palette to use both systems
3. Maintain backwards compatibility throughout

### Phase 3: Cleanup
1. Remove old hardcoded commands
2. Update all documentation
3. Mark old patterns as deprecated

## Success Criteria

1. All existing tools work through the registry
2. Adding new tools requires no changes to core infrastructure
3. Command palette dynamically discovers tool shortcuts
4. No performance degradation
5. Clear migration path for existing tools
6. Type-safe tool definitions with runtime validation

## Risks & Mitigations

1. **Bundle size increase** - Implement lazy loading for tool components
2. **Migration complexity** - Provide clear examples and maintain compatibility
3. **Performance overhead** - Profile registry lookups and optimize hot paths
4. **Type safety gaps** - Use Zod for runtime validation of all inputs
5. **Developer adoption** - Create excellent documentation and tooling
6. **URL state conflicts** - Ensure registry respects URL as single source of truth

## Future Considerations

- ~URL state integration~ ✅ Completed (see `planning/250614a_tool_url_state_management.md` implementation debrief)
- LLM function calling (see `planning/250614c_llm_tool_function_calling.md`)
- Plugin system for third-party tools
- Tool marketplace or sharing mechanism
- Advanced analytics and usage tracking

## Related Documents

- `planning/250614a_tool_url_state_management.md` - URL state that tools can leverage (completed)
- `planning/finished/250615a_url_state_single_source_of_truth.md` - URL as single source of truth (completed)
- `planning/250614c_llm_tool_function_calling.md` - LLM integration built on this registry
- `docs/reference/ARCHITECTURE_URL_STATE.md` - Comprehensive URL state documentation
- `lib/tools/hooks/use-tool-url-state.ts` - Existing URL state hooks to integrate with
- Original unified planning doc (to be deleted): `planning/250613c_unified_tool_architecture_url_state_llm_integration.md`