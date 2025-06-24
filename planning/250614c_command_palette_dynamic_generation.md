# Command Palette Dynamic Generation

## Goal

Replace hardcoded command palette entries with dynamic generation from the tool registry:
- Generate commands automatically from registered tools
- Remove 300+ lines of hardcoded command definitions
- Support conflict detection for shortcuts and keywords
- Maintain accessibility with fuzzy search keywords
- Enable safe rollout with feature flag

## Context

Currently, `components/command-palette.tsx` contains hardcoded definitions for every tool command. After implementing the tool registry (250614b), we can generate these dynamically, creating a single source of truth for tool discovery and invocation.

## References

- `components/command-palette.tsx` - Current hardcoded implementation
- `planning/250614b_unified_tool_registry_architecture.md` - Core registry (prerequisite)
- `lib/tools/registry.ts` - Tool registry to be implemented in 250614b
- `lib/tools/hooks/use-tool-url-state.ts` - URL state integration

## Principles & Key Decisions

1. **Direct replacement** - Replace hardcoded commands directly in branch
2. **Conflict detection** - Fail loudly on duplicate shortcuts or keywords
3. **Accessibility first** - Preserve fuzzy search with explicit keywords
4. **Zero hardcoding** - All commands from registry after migration
5. **E2E testing** - Replace unit tests with comprehensive browser automation
6. **Backwards compatible** - Same user experience, better maintenance

## Dependencies

- Completion of 250614b (core tool registry with all tools migrated)

## Stages & Actions

### Stage: Preparation and sync ✅ COMPLETED
- [x] Run `./scripts/sync-worktrees.ts` to pull latest changes
- [x] Verify all tools are registered (from 250614b completion)
- [x] Review current command palette structure

### Stage: Command generation design ✅ COMPLETED
- [x] Create `lib/tools/command-generation.ts`
  - [x] Define CommandGenerationOptions interface
  - [x] Add ConflictReport type for debugging
  - [x] Design keyword extraction strategy
- [x] Document generation algorithm
  - [x] How to map Tool → Command
  - [x] Shortcut conflict resolution
  - [x] Keyword generation from name/description
  - [x] Category mapping

### Stage: Conflict detection implementation ✅ COMPLETED
- [x] Create conflict detection utilities
  - [x] detectShortcutConflicts() function
  - [x] detectKeywordConflicts() function
  - [x] Development mode warnings
  - [x] Throw errors in production for safety
- [x] Write comprehensive tests
  - [x] Test duplicate shortcuts
  - [x] Test similar keywords
  - [x] Test resolution strategies

### Stage: Command generation implementation
- [ ] Implement generateCommandsFromRegistry()
  - [ ] Transform each tool to command format
  - [ ] Extract keywords from name + description
  - [ ] Map tool.shortcuts to command.shortcut
  - [ ] Generate command.action using navigateToTab()
  - [ ] Handle conditional availability (requiresDocument)
- [ ] Add explicit keywords support
  - [ ] Tool interface enhancement for keywords[]
  - [ ] Fallback to auto-generated keywords
  - [ ] Preserve searchability
- [ ] Test command generation
  - [ ] Verify all tools generate commands
  - [ ] Check keyboard shortcuts work
  - [ ] Test fuzzy search matches

### Stage: Command palette integration
- [ ] Update `components/command-palette.tsx`
  - [ ] Import command generation utilities
  - [ ] Replace hardcoded tool commands with registry generation
  - [ ] Ensure no performance regression
- [ ] Preserve existing functionality
  - [ ] All shortcuts still work
  - [ ] Fuzzy search unchanged
  - [ ] Categories maintained
  - [ ] Icons and descriptions preserved

### Stage: Integration testing
- [ ] Test all tool commands work
  - [ ] Keyboard shortcuts trigger correctly
  - [ ] Navigation uses navigateToTab()
  - [ ] Conditional visibility works
- [ ] Verify conflict detection
  - [ ] Add duplicate shortcut to test
  - [ ] Ensure error is thrown
  - [ ] Remove test duplicate
- [ ] Fuzzy search testing
  - [ ] Search for tool names
  - [ ] Search for keywords
  - [ ] Search for partial matches

### Stage: Remove hardcoded commands
- [ ] Delete all hardcoded tool commands
  - [ ] Keep only non-tool commands (settings, auth, etc.)
  - [ ] Update imports
  - [ ] Remove unused types
- [ ] Update unit tests
  - [ ] Remove hardcoded command tests
  - [ ] Add "registry generates N commands" test
  - [ ] Test command count matches tool count

### Stage: E2E test replacement
- [ ] Create comprehensive command palette E2E test
  - [ ] Test command palette opening (Cmd+K)
  - [ ] Test tool command execution via search
  - [ ] Test keyboard shortcuts for all tools
  - [ ] Test fuzzy search functionality
  - [ ] Test conditional command availability
- [ ] Replace unit tests with E2E coverage
  - [ ] Remove command generation unit tests (30 test cases)
  - [ ] Keep only algorithmic/utility unit tests
  - [ ] Update test documentation
- [ ] Verify comprehensive coverage
  - [ ] All command palette functionality tested via E2E
  - [ ] Real user workflows validated
  - [ ] Integration confidence established

### Stage: Documentation
- [ ] Update command palette documentation
- [ ] Add section to tool creation guide
- [ ] Migration notes for custom commands
- [ ] Update testing documentation

### Stage: Final validation
- [ ] All commands work via registry
- [ ] No hardcoded tool commands remain
- [ ] Performance unchanged
- [ ] Accessibility preserved
- [ ] E2E tests provide comprehensive coverage
- [ ] Git commit following guidelines

## Command Generation Example

```typescript
// lib/tools/command-generation.ts
interface GeneratedCommand {
  id: string
  name: string
  shortcut?: string[]
  keywords: string[]
  category: string
  icon: ComponentType
  action: () => void
  isAvailable: () => boolean
}

export function generateCommandsFromRegistry(
  registry: Map<string, Tool>,
  options: { detectConflicts: boolean } = { detectConflicts: true }
): GeneratedCommand[] {
  const commands: GeneratedCommand[] = []
  const shortcuts = new Map<string, string>() // shortcut -> toolId
  
  for (const [toolId, tool] of registry) {
    // Conflict detection
    if (options.detectConflicts && tool.shortcuts) {
      for (const shortcut of tool.shortcuts) {
        if (shortcuts.has(shortcut)) {
          throw new Error(
            `Shortcut conflict: "${shortcut}" used by both ` +
            `"${shortcuts.get(shortcut)}" and "${toolId}"`
          )
        }
        shortcuts.set(shortcut, toolId)
      }
    }
    
    // Generate command
    commands.push({
      id: `tool-${toolId}`,
      name: tool.name,
      shortcut: tool.shortcuts,
      keywords: [
        ...tool.keywords || [],
        tool.name.toLowerCase(),
        ...tool.description.toLowerCase().split(' ').slice(0, 5)
      ],
      category: 'Tools',
      icon: tool.icon,
      action: () => {
        const navigateToTab = getNavigateToTab()
        navigateToTab(toolId as TabId)
      },
      isAvailable: () => {
        if (tool.requiresDocument) {
          return !!getCurrentDocument()
        }
        return true
      }
    })
  }
  
  return commands
}
```

## Integration Pattern

```typescript
// components/command-palette.tsx
function useCommands() {
  // Generated from registry
  const registryCommands = generateCommandsFromRegistry(toolRegistry, {
    getNavigateToTab: () => navigateToTab,
    getCurrentDocument: () => currentDocument,
    isMac: navigator.platform.includes('Mac')
  })
  return [...registryCommands, ...nonToolCommands]
}
```

## Success Criteria

1. All tool commands generated dynamically from registry
2. Zero hardcoded tool command definitions
3. Shortcuts and fuzzy search work identically to before
4. Conflict detection prevents duplicate shortcuts
5. E2E tests provide comprehensive coverage
6. No performance degradation

## Risks & Mitigations

1. **Missing commands** - Comprehensive E2E testing before removing hardcoded
2. **Shortcut conflicts** - Automated detection with clear errors
3. **Search regression** - Explicit keywords field, extensive E2E testing
4. **Performance impact** - Benchmark before/after, optimize if needed
5. **Rollback difficulty** - Branch-based development allows easy revert

## Progress Journal

### 2025-01-24: Stages 1-2 Completed

**Stage 1 (Preparation and sync)**: Completed successfully
- Synced worktrees with merge conflict resolution (TypeScript casting improvements from main branch)
- Verified 250614b tool registry: 8 tools across 4 categories, 136/136 tests passing
- Analyzed command palette structure: identified lines 147-218 as hardcoded tool commands (perfect 1:1 mapping with registry)

**Stage 2 (Command generation design)**: Completed successfully
- Created comprehensive `lib/tools/command-generation.ts` with full algorithm documentation
- Implemented conflict detection for shortcuts and keywords (fail-fast approach)
- Designed dependency injection pattern for navigation and document context
- Added development mode debugging utilities with validation

**Key Insights**:
- Perfect alignment between existing hardcoded commands and registry tools (same IDs, shortcuts, categories)
- All tools currently map to 'navigation' category in command palette (consistent pattern to maintain)
- Platform-specific shortcut handling (⌘ vs Ctrl) needs proper transformation
- Conflict detection built into generation algorithm rather than separate stage

**Discoveries**:
- Tool registry already has `keywords[]` field - no interface enhancement needed
- Existing `ConflictReport` type in registry - reused rather than duplicated
- `CommandGenerationOptions` in types.ts - enhanced rather than redefined

**Stage 3 (Conflict detection implementation)**: Completed successfully
- Created comprehensive test suite for command generation utilities with 30 test cases
- Verified conflict detection for shortcuts (throws errors) and keywords (logs warnings in dev mode)
- Tested all edge cases: empty shortcuts, platform-specific transformations, keyword extraction
- All conflict detection utilities working properly with fail-fast behavior for critical conflicts
- Tests validate command structure, debug utilities, and error handling patterns

**Next Steps**: Stage 4 command generation is already implemented, need to verify comprehensive functionality

## Related Documents

- `planning/250614b_unified_tool_registry_architecture.md` - Core registry implementation
- `planning/250614d_tool_execution_framework.md` - Next step after this
- `docs/reference/COMMAND_PALETTE.md` - Current documentation to update
- `planning/critiques/o3__CRITIQUE__OF__250614b_unified_tool_registry_architecture.md` - External review that informed the split approach