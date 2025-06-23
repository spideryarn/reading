# Core Tool Registry Implementation

**Note**: This planning document has been split into focused stages:
- **250614b** (this doc): Core registry + migrate all tools
- **250614c**: Command palette dynamic generation  
- **250614d**: Tool execution framework
- **250614e**: LLM function calling integration

## Goal

Implement a simple, clean tool registry that:
- Provides type-safe tool registration and discovery
- Migrates all existing tools to avoid "limbo state"
- Maintains current functionality with zero user-facing changes
- Sets foundation for command palette and execution improvements

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
- `docs/reference/COMMAND_PALETTE_KEYBOARD_INTERFACE.md` - Command palette implementation
- `docs/reference/UNIFIED_LEFT_PANE_TABBED_NAVIGATION.md` - Tab system architecture
- `components/command-palette.tsx` - Current hardcoded command implementation
- `planning/finished/250614a_tool_url_state_management.md` - URL state integration (completed - see implementation debrief)
- `planning/finished/250615a_url_state_single_source_of_truth.md` - URL as single source of truth (completed)
- `planning/250614e_llm_tool_function_calling.md` - LLM integration (depends on this)

## Principles & Key Decisions

1. **Simplicity first** - Basic Map-based registry, no over-engineering
2. **All tools migrated** - Avoid dual systems or partial migration
3. **Type-safe interfaces** - Leverage TypeScript and Zod validation
4. **Test isolation** - Include resetRegistryForTests() from the start
5. **Dev-time guards** - UNREGISTERED_TOOL_GUARD for early warnings
6. **Components separate** - Tool metadata in registry, components imported separately
7. **Zero user impact** - Pure refactoring, functionality unchanged

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

### Stage: Test infrastructure
- [ ] Create `lib/tools/testing/registry-test-utils.ts`
  - [ ] resetRegistryForTests() function
  - [ ] createTestRegistry() for isolated testing
  - [ ] mockTool() helper for test tools
- [ ] Update jest.setup.js
  - [ ] Call resetRegistryForTests() in beforeEach
  - [ ] Verify no registry pollution between tests
- [ ] Write registry isolation tests

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

### Stage: Migration of all tools
- [ ] Create tool implementation files:
  - [ ] `lib/tools/implementations/chat.ts`
  - [ ] `lib/tools/implementations/glossary.ts` 
  - [ ] `lib/tools/implementations/search.ts`
  - [ ] `lib/tools/implementations/summary.ts`
  - [ ] `lib/tools/implementations/highlights.ts`
  - [ ] `lib/tools/implementations/metadata.ts`
  - [ ] `lib/tools/implementations/toc-original.ts`
  - [ ] `lib/tools/implementations/toc-ai.ts`
- [ ] Register all tools in `lib/tools/registry-loader.ts`
- [ ] Add UNREGISTERED_TOOL_GUARD checks
- [ ] Test each tool still works correctly

### Stage: Documentation updates
- [ ] Update `docs/reference/TOOL_TEMPLATE_FOR_CREATING_NEW.md`
  - [ ] Add registry registration example
  - [ ] Keep current patterns as primary approach
  - [ ] Note that execution framework coming in 250614d

### Stage: Validation and smoke tests
- [ ] Verify all tools accessible via registry
- [ ] Check no hardcoded tool references remain
- [ ] Confirm command palette still works (hardcoded for now)
- [ ] Test hot reload doesn't cause duplicate registrations
- [ ] Ensure all existing functionality preserved

### Stage: Final review and commit
- [ ] Code review checklist:
  - [ ] All tools migrated
  - [ ] Test utilities in place
  - [ ] No user-facing changes
  - [ ] Types properly exported
- [ ] Update CLAUDE.md if needed
- [ ] Git commit following guidelines

### Stage: Final review
- [ ] Code review focusing on:
  - [ ] API design and extensibility
  - [ ] Type safety and validation
  - [ ] Performance implications
  - [ ] Migration path clarity
- [ ] Update architecture documentation
- [ ] Git commit following guidelines

## Tool Interface Design

### Core Tool Interface (Simplified)

```typescript
interface Tool {
  // Identity & Metadata
  id: string                    // Unique identifier (e.g., 'glossary')
  name: string                  // Display name (e.g., 'Glossary')
  description: string           // For command palette and future use
  category: ToolCategory        // 'analysis' | 'navigation' | 'generation' | 'transform'
  icon: ComponentType          // Phosphor icon component
  
  // UI Integration
  componentPath: string        // Path to lazy-load component
  tabId: string                // ID for tab navigation
  shortcuts?: string[]         // Keyboard shortcuts
  keywords?: string[]          // Additional search terms
  
  // Behavior Configuration
  requiresDocument: boolean    // Can only run with document context
  capabilities?: {
    search?: boolean          // Supports search within tool
    export?: boolean          // Can export data
  }
}

type ToolCategory = 'analysis' | 'navigation' | 'generation' | 'transform'

// Simple registry type
type ToolRegistry = Map<string, Tool>
```

**Note**: Execution logic, caching, and analytics will be added in planning/250614d_tool_execution_framework.md

### Registration Example

```typescript
// lib/tools/implementations/glossary.ts
import { registerTool } from '@/lib/tools/registry'
import { BookOpen } from '@phosphor-icons/react/dist/ssr'

const glossaryTool: Tool = {
  id: 'glossary',
  name: 'Glossary',
  description: 'Extract and display key terms and concepts from the document',
  category: 'analysis',
  icon: BookOpen,
  
  componentPath: '@/components/tools/GlossaryPanel',
  tabId: 'glossary',
  shortcuts: ['Cmd+5', 'Ctrl+5'],
  keywords: ['terms', 'definitions', 'concepts', 'vocabulary'],
  
  requiresDocument: true,
  capabilities: {
    search: true,
    export: true
  }
}

// Register the tool
registerTool(glossaryTool)
```

### Registry Implementation

```typescript
// lib/tools/registry.ts
import type { Tool } from './types'

const toolRegistry = new Map<string, Tool>()
let registryLocked = false

export function registerTool(tool: Tool): void {
  if (registryLocked) {
    throw new Error(`Cannot register tool after initialization: ${tool.id}`)
  }
  
  if (toolRegistry.has(tool.id)) {
    throw new Error(`Tool already registered: ${tool.id}`)
  }
  
  // Validate tool has required fields
  if (!tool.id || !tool.name || !tool.componentPath) {
    throw new Error(`Invalid tool registration: missing required fields`)
  }
  
  toolRegistry.set(tool.id, tool)
}

export function getTool(id: string): Tool | undefined {
  const tool = toolRegistry.get(id)
  
  if (!tool && process.env.NODE_ENV === 'development') {
    console.error(`UNREGISTERED_TOOL_GUARD: Attempted to access unregistered tool: ${id}`)
  }
  
  return tool
}

export function getAllTools(): Tool[] {
  return Array.from(toolRegistry.values())
}

// Lock registry after initial load to prevent late registrations
export function lockRegistry(): void {
  registryLocked = true
}

// Test utilities
export function resetRegistryForTests(): void {
  toolRegistry.clear()
  registryLocked = false
}
```

### Usage Example (Current State)

```typescript
// In unified-left-pane.tsx or similar
import { getTool } from '@/lib/tools/registry'

// Check if tool exists before rendering
const glossaryTool = getTool('glossary')
if (!glossaryTool) {
  console.error('Glossary tool not registered!')
  return null
}

// Component still imported directly for now
// (lazy loading and dynamic imports come later)
import { GlossaryPanel } from '@/components/tools/GlossaryPanel'
```

**Note**: Dynamic command generation will be implemented in planning/250614c_command_palette_dynamic_generation.md

## Migration Strategy

### Single-Phase Migration
1. Implement registry with all test utilities
2. Migrate ALL tools at once to avoid dual systems
3. Keep command palette hardcoded (for now)
4. Zero user-facing changes

This approach avoids "limbo state" and ensures clean architecture from day one.

## Success Criteria

1. All tools registered and accessible via getTool()
2. Registry has test isolation utilities working
3. UNREGISTERED_TOOL_GUARD warns on missing tools
4. Hot reload doesn't cause duplicate registrations
5. All existing functionality preserved
6. Clean foundation for future enhancements

## Risks & Mitigations

1. **Test registry pollution** - resetRegistryForTests() in jest.setup.js
2. **Hot reload issues** - Registry lock after initialization
3. **Missing tools** - UNREGISTERED_TOOL_GUARD dev warnings
4. **Migration effort** - Mechanical but thorough testing needed
5. **Type safety** - Simple types, validation at registration

## Future Considerations

This planning doc focuses only on core registry. See:
- `planning/250614c_command_palette_dynamic_generation.md` - Dynamic commands
- `planning/250614d_tool_execution_framework.md` - Execution and caching
- `planning/250614e_llm_tool_function_calling.md` - LLM integration

## Related Documents

### Prerequisites
- `planning/finished/250614a_tool_url_state_management.md` - URL state (completed)
- `planning/finished/250615a_url_state_single_source_of_truth.md` - URL as SoT (completed)

### Next Steps
- `planning/250614c_command_palette_dynamic_generation.md` - Remove hardcoded commands
- `planning/250614d_tool_execution_framework.md` - Unified execution
- `planning/250614e_llm_tool_function_calling.md` - LLM integration

### Critique
- `planning/critiques/o3__CRITIQUE__OF__250614b_unified_tool_registry_architecture.md` - External review that informed this split