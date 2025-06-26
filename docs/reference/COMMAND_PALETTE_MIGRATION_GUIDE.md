# Command Palette Migration Guide

## Overview

This guide documents the migration from hardcoded command palette entries to dynamic generation from the unified tool registry. This change provides better maintainability, automatic conflict detection, and enhanced keyword search capabilities.

## What Changed

### Before: Hardcoded Commands
Previously, all tool commands were manually defined in `components/command-palette.tsx`:

```typescript
// OLD: Manual command definitions (removed)
{
  id: 'nav-glossary',
  name: 'Glossary',
  keywords: ['glossary', 'terms', 'definitions'],
  shortcut: [isMac ? '⌘' : 'Ctrl', '5'],
  category: NAVIGATION_CATEGORY,
  action: () => navigateToTab('glossary'),
  icon: BookOpen,
},
{
  id: 'nav-search',
  name: 'Search',
  keywords: ['search', 'find', 'text'],
  shortcut: [isMac ? '⌘' : 'Ctrl', '6'],
  category: NAVIGATION_CATEGORY, 
  action: () => navigateToTab('search'),
  icon: MagnifyingGlass,
}
// ... 8 more hardcoded tool commands
```

### After: Dynamic Generation
Now, all tool commands are generated automatically from the tool registry:

```typescript
// NEW: Dynamic generation (current implementation)
const generateToolCommands = useCallback((): Command[] => {
  const tools = getAllTools()
  const generatedCommands = generateCommandsFromRegistry(tools, {
    getNavigateToTab: () => navigateToTab,
    getCurrentDocument: () => documentSlug ? { id: documentSlug } : null,
    isMac,
  })
  
  return generatedCommands.map(genCmd => ({
    id: genCmd.id,
    name: genCmd.name,
    keywords: genCmd.keywords || undefined,
    shortcut: genCmd.shortcut || undefined,
    category: genCmd.category,
    action: genCmd.action,
    condition: genCmd.condition || undefined,
    icon: genCmd.icon || undefined,
  }))
}, [navigateToTab, documentSlug, isMac])
```

## Benefits of Dynamic Generation

### 1. Zero Hardcoding
- **Before**: 72 lines of hardcoded tool command definitions
- **After**: Single function call generates all commands from registry
- **Result**: Single source of truth for tool metadata

### 2. Automatic Conflict Detection
- **Before**: No validation of duplicate shortcuts or keywords
- **After**: Build-time errors for duplicate shortcuts, warnings for duplicate keywords
- **Result**: Prevents accidentally conflicting keyboard shortcuts

### 3. Enhanced Keyword Search
- **Before**: Manual keyword assignment, easy to miss semantic terms
- **After**: Automatic keyword extraction + manual keywords, semantic discovery
- **Result**: Users can find tools using natural language (e.g., "digest" → Summary)

### 4. Platform Support
- **Before**: Manual ⌘/Ctrl logic in each command definition
- **After**: Automatic platform detection and shortcut transformation
- **Result**: Consistent cross-platform experience

## Migration Impact

### For Tool Developers
**✅ Benefits:**
- Command palette integration automatic when registering tools
- No manual command definitions needed
- Rich keyword support for better discoverability
- Automatic conflict validation

**📝 New Requirements:**
- Must register tools in unified registry
- Should provide meaningful `keywords[]` array in tool definition
- Should follow keyboard shortcut conventions

### For Command Palette Users
**✅ Improvements:**
- Better keyword search (semantic discovery)
- No more hardcoded tool commands maintenance
- Automatic conflict prevention

**🔄 No Breaking Changes:**
- Same keyboard shortcuts
- Same command names and behavior
- Same visual appearance

## Custom Command Patterns

### Non-Tool Commands (Still Manual)
Commands that aren't tools still require manual definition:

```typescript
// App navigation commands (still manual)
{
  id: 'app-documents',
  name: 'Documents List',
  keywords: ['documents', 'list', 'library', 'home'],
  shortcut: [isMac ? '⌘' : 'Ctrl', 'D'],
  category: APP_NAVIGATION_CATEGORY,
  action: () => navigateWithErrorHandling('/read'),
  icon: House,
}

// Document-specific commands (still manual)
{
  id: 'doc-delete',
  name: 'Delete Document', 
  keywords: ['delete', 'remove', 'trash', 'destroy'],
  category: DOCUMENT_ACTIONS_CATEGORY,
  action: handleDeleteCommand,
  icon: Trash,
}
```

### Adding New Tool Commands
To add a new tool command, simply register the tool in the registry:

```typescript
// lib/tools/implementations/new-tool.ts
const newTool: Tool = {
  id: 'new-tool',
  name: 'New Tool',
  description: 'Description for command palette search',
  category: 'analysis',
  icon: ToolIcon,
  
  componentPath: '@/components/tools/NewToolPanel',
  tabId: 'new-tool',
  shortcuts: ['Cmd+9', 'Ctrl+9'], // Will appear in command palette
  keywords: ['semantic', 'terms', 'for', 'discovery'], // Searchable terms
  
  requiresDocument: true,
  // ... other properties
}

registerTool(newTool)
```

The tool will automatically appear in the command palette with:
- Command name: "New Tool"  
- Keyboard shortcut: Cmd/Ctrl+9
- Searchable by: "new", "tool", "semantic", "terms", "for", "discovery"
- Action: Navigate to 'new-tool' tab

## Implementation Details

### Command Generation Process

1. **Registry Scan**: `generateCommandsFromRegistry()` gets all registered tools
2. **Conflict Detection**: Validates no duplicate shortcuts exist across tools
3. **Command Transformation**: Converts each `Tool` to command palette `Command` format
4. **Platform Adaptation**: Transforms shortcuts for current platform (⌘ vs Ctrl)
5. **Integration**: Merges with non-tool commands in command palette

### Keyword Search Enhancement

**Previous keyword search**:
```typescript
// OLD: Limited to manually assigned keywords
keywords: ['search', 'find', 'text']
```

**Current keyword search**:
```typescript
// NEW: Rich keyword support with CommandItem value prop
<CommandItem
  value={[command.name, ...(command.keywords ?? [])].join(' ')}
  // Enables cmdk library to search name + all keywords
/>
```

Tools are now discoverable by:
- Tool name (e.g., "search" → Search tool)
- Explicit keywords (e.g., "find" → Search tool)  
- Semantic terms (e.g., "exact match" → Search tool)

### Error Handling

**Conflict Detection**:
```typescript
// Throws build-time errors for critical conflicts
if (shortcuts.has(shortcut)) {
  throw new Error(
    `Shortcut conflict: "${shortcut}" used by both ` +
    `"${shortcuts.get(shortcut)}" and "${toolId}"`
  )
}

// Logs warnings for non-critical duplicates
if (validation.warnings.length > 0) {
  console.warn(`Tool registration warnings for "${toolId}":`, warnings)
}
```

## Future Enhancements

### Phase 1 (Current)
- ✅ Dynamic tool command generation
- ✅ Conflict detection for shortcuts
- ✅ Enhanced keyword search
- ✅ Platform-specific shortcut handling

### Phase 2 (Planned)
- 🔄 Global keyboard shortcuts (not just command palette)
- 🔄 Dynamic command categories
- 🔄 Plugin-based command extensions
- 🔄 Command analytics and usage tracking

### Phase 3 (Future)
- 🔮 LLM-generated command descriptions
- 🔮 Context-aware command suggestions
- 🔮 Voice command integration
- 🔮 Multi-command workflows

## Troubleshooting

### Tool Not Appearing in Command Palette

**Check tool registration**:
```typescript
import { getTool } from '@/lib/tools/registry'

const tool = getTool('your-tool-id')
if (!tool) {
  console.error('Tool not registered!')
}
```

**Verify command generation**:
```typescript
// Check if tool generates commands
const commands = generateCommandsFromRegistry(getAllTools(), options)
console.log('Generated commands:', commands.map(c => c.id))
```

### Keyword Search Not Working

**Ensure CommandItem has value prop**:
```typescript
<CommandItem
  value={[command.name, ...(command.keywords ?? [])].join(' ')}
  // ↑ Required for keyword search
/>
```

**Check tool keywords**:
```typescript
const tool = getTool('your-tool-id')
console.log('Tool keywords:', tool.keywords)
```

### Shortcut Conflicts

**Check for duplicate shortcuts**:
```typescript
import { detectConflicts } from '@/lib/tools/registry'

const conflicts = detectConflicts()
if (conflicts.shortcuts.size > 0) {
  console.error('Shortcut conflicts:', conflicts.shortcuts)
}
```

**Use unique shortcuts**:
- Follow Cmd/Ctrl+[number] pattern for tools
- Avoid conflicts with browser shortcuts
- Test on both Mac and PC platforms

## Related Documentation

- `docs/reference/ARCHITECTURE_FOR_TOOLS.md` - Tool registry architecture
- `docs/reference/TOOL_TEMPLATE_FOR_CREATING_NEW.md` - New tool creation guide
- `lib/tools/command-generation.ts` - Command generation implementation
- `components/command-palette.tsx` - Current command palette implementation

---

*Last updated: 26 June 2025*  
*Status: ✅ Complete migration guide*  
*Next: Consider global keyboard shortcuts implementation*