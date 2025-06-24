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

### Stage: Design documentation ✅ COMPLETED
- [x] Analyze existing tool implementations for common patterns
- [x] Create `docs/reference/ARCHITECTURE_FOR_TOOLS.md`
  - [x] Define Tool interface with all properties
  - [x] Document tool categories (analysis, navigation, generation, interactive)
  - [x] Explain standard vs optional parameters
  - [x] Include examples for different tool types
  - [x] Add migration guide section
- [x] Update `docs/reference/TOOL_TEMPLATE_FOR_CREATING_NEW.md`
  - [x] Add section on new registry system
  - [x] Update examples to show both old and new patterns
  - [x] Include checklist for registry integration

### Stage: Core type definitions ✅ COMPLETED
- [x] Create `lib/tools/types.ts` with Tool interface
  - [x] Core Tool interface with metadata
  - [x] ToolParams for execution context
  - [x] ToolResult for standardized responses
  - [x] ToolCategory enum
  - [x] ToolComponentProps interface
- [x] Create validation schemas using Zod
  - [x] Schema for tool registration
  - [x] Runtime validation helpers
- [x] Write TypeScript tests for type safety

### Stage: Registry implementation ✅ COMPLETED
- [x] Create `lib/tools/registry.ts`
  - [x] Tool registry Map for storage
  - [x] registerTool() function with validation
  - [x] getTool() and getAllTools() accessors
  - [x] Tool discovery utilities
  - [x] Error handling for duplicate registrations
- [x] Create `lib/tools/registry-loader.ts`
  - [x] Auto-discovery pattern (optional)
  - [x] Manual registration helpers
  - [x] Development mode validation
- [x] Write comprehensive tests for registry
- [x] Run tests

### Stage: Test infrastructure ✅ COMPLETED
- [x] Create `lib/tools/testing/registry-test-utils.ts`
  - [x] resetRegistryForTests() function
  - [x] createTestRegistry() for isolated testing
  - [x] mockTool() helper for test tools
- [x] Update jest.setup.js
  - [x] Call resetRegistryForTests() in beforeEach
  - [x] Verify no registry pollution between tests
- [x] Write registry isolation tests

### Stage: Simple tool migration - Glossary ✅ COMPLETED
- [x] Create `lib/tools/implementations/glossary.ts`
  - [x] Implement Tool interface
  - [x] Define Zod schemas for params
  - [x] Migrate execute function
  - [x] Keep existing component reference
- [x] Update tool to use registry
  - [x] Register on app initialization
  - [x] Maintain backwards compatibility
- [x] Test glossary with new architecture
  - [x] Verify existing functionality works
  - [x] Test new standardized execution

### Stage: Migration of all tools ✅ COMPLETED
- [x] Create tool implementation files:
  - [x] `lib/tools/implementations/chat.ts`
  - [x] `lib/tools/implementations/glossary.ts` 
  - [x] `lib/tools/implementations/search.ts`
  - [x] `lib/tools/implementations/summary.ts`
  - [x] `lib/tools/implementations/highlights.ts`
  - [x] `lib/tools/implementations/metadata.ts`
  - [x] `lib/tools/implementations/toc-original.ts`
  - [x] `lib/tools/implementations/toc-ai.ts`
- [x] Register all tools in `lib/tools/registry-loader.ts`
- [x] Add UNREGISTERED_TOOL_GUARD checks
- [x] Test each tool still works correctly

### Stage: Documentation updates ✅ COMPLETED
- [x] Update `docs/reference/TOOL_TEMPLATE_FOR_CREATING_NEW.md`
  - [x] Add registry registration example
  - [x] Keep current patterns as primary approach
  - [x] Note that execution framework coming in 250614d

### Stage: Validation and smoke tests ✅ COMPLETED
- [x] Verify all tools accessible via registry
- [x] Check no hardcoded tool references remain (UI components have expected hardcoded refs for now)
- [x] Confirm command palette still works (hardcoded for now)
- [x] Test hot reload doesn't cause duplicate registrations
- [x] Ensure all existing functionality preserved

### Stage: Final review and commit ✅ COMPLETED
- [x] Code review checklist:
  - [x] All tools migrated
  - [x] Test utilities in place
  - [x] No user-facing changes
  - [x] Types properly exported
- [x] Update CLAUDE.md if needed
- [x] Git commit following guidelines

### Stage: Final review ✅ COMPLETED
- [x] Code review focusing on:
  - [x] API design and extensibility
  - [x] Type safety and validation
  - [x] Performance implications
  - [x] Migration path clarity
- [x] Update architecture documentation
- [x] Git commit following guidelines

## Implementation Summary (2025-06-24)

**STATUS: ✅ COMPLETED SUCCESSFULLY**

The unified tool registry architecture has been fully implemented and all 8 tools successfully migrated. All success criteria have been met:

### ✅ Success Criteria Achieved

1. **All tools registered and accessible via getTool()** - All 8 tools properly registered across 4 categories
2. **Registry has test isolation utilities working** - `resetRegistryForTests()` implemented and working
3. **UNREGISTERED_TOOL_GUARD warns on missing tools** - Development mode warnings active
4. **Hot reload doesn't cause duplicate registrations** - Registry locking prevents duplicates after initialization
5. **All existing functionality preserved** - URL state management and metadata intact
6. **Clean foundation for future enhancements** - Registry ready for command palette generation (planning/250614c)

### 📊 Implementation Results

**Tools Registered**: 8 total tools across 4 categories
- **Analysis**: glossary, metadata (2 tools)
- **Navigation**: toc-original, toc-ai (2 tools)
- **Interactive**: chat, search (2 tools) 
- **Generation**: summary, highlights (2 tools)

**Test Coverage**: 136/136 tests passing (100% success rate)
- 52 registry unit tests
- 5 integration tests  
- 79 additional tool-related tests

**Key Features Implemented**:
- Type-safe tool registration with Zod validation
- Tool discovery with filtering (category, search, capabilities)
- Conflict detection for shortcuts and keywords
- Development mode guards and warnings
- Test isolation utilities
- Comprehensive documentation

### 🔄 Next Steps

This implementation provides the foundation for subsequent planning documents:

1. **planning/250614c_command_palette_dynamic_generation.md** - Remove hardcoded commands, generate from registry
2. **planning/250614d_tool_execution_framework.md** - Unified execution, caching, and analytics
3. **planning/250614e_llm_tool_function_calling.md** - LLM integration with function calling

The registry architecture is production-ready and all tools are discoverable via the centralized system while maintaining existing functionality.

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