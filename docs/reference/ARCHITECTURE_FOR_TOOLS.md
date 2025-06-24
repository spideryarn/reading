# Tool Architecture Reference

## Overview

This document defines the unified tool architecture for Spideryarn Reading, providing a centralized registry system for all document tools. This architecture replaces the previous hardcoded approach with a type-safe, discoverable system.

## Tool Interface Definition

### Core Tool Interface

```typescript
interface Tool {
  // Identity & Metadata
  id: string                    // Unique identifier (e.g., 'glossary')
  name: string                  // Display name (e.g., 'Glossary')
  description: string           // For command palette and tooltips
  category: ToolCategory        // Categorization for organization
  icon: ComponentType<IconProps> // Phosphor icon component
  
  // UI Integration
  componentPath: string         // Path to lazy-load component
  tabId: TabValue              // ID for tab navigation system
  shortcuts?: string[]         // Keyboard shortcuts (['Cmd+5', 'Ctrl+5'])
  keywords?: string[]          // Additional search terms for command palette
  
  // Behavior Configuration
  requiresDocument: boolean    // Can only run with document context
  autoLoad?: boolean          // Load immediately on tab activation
  capabilities?: ToolCapabilities
  
  // URL State Integration
  urlStateKeys?: (keyof ToolUrlState)[]  // Which URL parameters this tool uses
}
```

### Tool Categories

```typescript
type ToolCategory = 
  | 'navigation'    // Document viewing and navigation (Original, AI-Generated, Summary)
  | 'analysis'      // Content analysis tools (Glossary, Metadata)
  | 'generation'    // AI-powered content generation (Summary, Highlights)
  | 'interactive'   // Interactive interfaces (Chat, Search)
```

### Tool Capabilities

```typescript
interface ToolCapabilities {
  search?: boolean             // Supports internal search
  export?: boolean            // Can export data
  realtime?: boolean          // Updates in real-time
  collaborative?: boolean     // Supports multi-user features
}
```

## Tool Implementation Patterns

### Component Structure

Each tool component should follow this standard structure:

```typescript
// components/tools/ExampleTool.tsx
interface ExampleToolProps {
  document?: DocumentWithContent
  isActive: boolean
  onError?: (error: Error) => void
}

export function ExampleTool({ document, isActive, onError }: ExampleToolProps) {
  // URL state integration
  const { param, setParam } = useExampleUrlState()
  
  // Cross-pane communication
  const { actions } = useDocumentCommunication()
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Tool-specific logic
  const handleAction = useCallback((data: any) => {
    // Perform tool action
    actions.scrollToElement(data.elementId)
    setParam(data.value) // Update URL state
  }, [actions, setParam])
  
  // Standard loading/error UI pattern
  if (isLoading) {
    return <div className="flex items-center gap-2">
      <CircleNotch className="animate-spin" size={16} />
      <span>Loading...</span>
    </div>
  }
  
  if (error) {
    return <div className="text-red-500 flex items-center gap-2">
      <XCircle size={16} />
      <span>{error}</span>
    </div>
  }
  
  return (
    <div className="tool-container">
      {/* Tool content */}
    </div>
  )
}
```

### URL State Integration

Each tool should provide a custom hook for URL state management:

```typescript
// lib/tools/hooks/use-example-url-state.ts
export function useExampleUrlState() {
  const [urlState, setUrlState] = useQueryStates({
    exampleParam: parseAsString,
    exampleFlag: parseAsBoolean.withDefault(false)
  })
  
  return {
    param: urlState.exampleParam,
    flag: urlState.exampleFlag,
    setParam: (value: string) => setUrlState({ exampleParam: value }),
    setFlag: (value: boolean) => setUrlState({ exampleFlag: value }),
    clearState: () => setUrlState({ exampleParam: null, exampleFlag: null })
  }
}
```

### Cross-Pane Communication

All tools use the `DocumentCommunicationContext` for coordination:

```typescript
const { actions, state } = useDocumentCommunication()

// Standard actions available to tools:
actions.scrollToElement(elementId)        // Navigate to document element
actions.highlightText(text)               // Highlight text in document
actions.setActiveElement(elementId)       // Mark element as active
actions.clearHighlights()                 // Clear all highlights
```

## Registry Integration

### Tool Registration

```typescript
// lib/tools/implementations/example.ts
import { registerTool } from '@/lib/tools/registry'
import { MagnifyingGlass } from '@phosphor-icons/react/dist/ssr'

const exampleTool: Tool = {
  id: 'example',
  name: 'Example Tool',
  description: 'Demonstrates tool architecture patterns',
  category: 'analysis',
  icon: MagnifyingGlass,
  
  componentPath: '@/components/tools/ExampleTool',
  tabId: 'example',
  shortcuts: ['Cmd+9', 'Ctrl+9'],
  keywords: ['demo', 'test', 'example'],
  
  requiresDocument: true,
  autoLoad: false,
  capabilities: {
    search: true,
    export: false
  },
  
  urlStateKeys: ['exampleParam', 'exampleFlag']
}

registerTool(exampleTool)
```

### Registry Usage

```typescript
// In components that need tool information
import { getTool, getAllTools } from '@/lib/tools/registry'

// Get specific tool
const glossaryTool = getTool('glossary')
if (!glossaryTool) {
  console.error('Glossary tool not registered!')
  return null
}

// Get all tools in a category
const analysisTools = getAllTools().filter(tool => tool.category === 'analysis')
```

## Command Palette Integration

Tools automatically generate command palette entries:

```typescript
// Auto-generated from tool definition
{
  id: `tool-${tool.id}`,
  name: tool.name,
  shortcut: tool.shortcuts,
  keywords: [
    ...tool.keywords || [],
    tool.name.toLowerCase(),
    ...tool.description.toLowerCase().split(' ').slice(0, 5)
  ],
  category: 'Tools',
  icon: tool.icon,
  action: () => navigateToTab(tool.tabId),
  isAvailable: () => !tool.requiresDocument || !!getCurrentDocument()
}
```

## Current Tool Implementations

### Navigation Tools

| Tool | ID | Description | Shortcuts |
|------|----|----|-----------|
| Original Document | `original` | Document with original headings | `Cmd+1`, `Ctrl+1` |
| AI-Generated Headings | `ai-generated` | Enhanced document with AI headings | `Cmd+2`, `Ctrl+2` |
| Summary | `summary` | Hierarchical document summaries | `Cmd+3`, `Ctrl+3` |

### Interactive Tools

| Tool | ID | Description | Shortcuts |
|------|----|----|-----------|
| Chat | `chat` | AI conversation interface | `Cmd+4`, `Ctrl+4` |
| Search | `search` | Text and semantic search | `Cmd+6`, `Ctrl+6` |

### Analysis Tools

| Tool | ID | Description | Shortcuts |
|------|----|----|-----------|
| Glossary | `glossary` | Key terms and entities | `Cmd+5`, `Ctrl+5` |
| Highlights | `highlights` | Semantic highlighting system | `Cmd+7`, `Ctrl+7` |
| Metadata | `metadata` | Document information panel | `Cmd+8`, `Ctrl+8` |

## Migration Strategy

### Phase 1: Registry Foundation
1. Implement core registry with type definitions
2. Add test utilities and validation
3. Migrate one simple tool (metadata) as proof of concept

### Phase 2: Complete Migration  
1. Create tool implementation files for all existing tools
2. Register all tools in registry loader
3. Update unified pane to use registry for tool discovery

### Phase 3: Dynamic Command Generation
1. Remove hardcoded command palette entries
2. Generate commands dynamically from registry
3. Add conflict detection for shortcuts and keywords

## Standard vs Optional Parameters

### Standard Parameters (All Tools)
- `id`: Required, unique identifier
- `name`: Required, display name
- `description`: Required, for tooltips and search
- `category`: Required, for organization
- `icon`: Required, Phosphor icon component
- `componentPath`: Required, component location
- `tabId`: Required, tab system integration
- `requiresDocument`: Required, dependency specification

### Optional Parameters
- `shortcuts`: Keyboard shortcuts (auto-generated if missing)
- `keywords`: Search terms (extracted from name/description if missing)
- `autoLoad`: Load behavior (defaults to false)
- `capabilities`: Feature flags (defaults to basic capabilities)
- `urlStateKeys`: URL parameters (inferred from hook usage if missing)

## Implementation Examples

### Simple Navigation Tool

```typescript
const originalTool: Tool = {
  id: 'original',
  name: 'Original Document',
  description: 'View document with original headings and structure',
  category: 'navigation',
  icon: Article,
  componentPath: '@/components/tools/OriginalDocument',
  tabId: 'original',
  shortcuts: ['Cmd+1', 'Ctrl+1'],
  requiresDocument: true
}
```

### Complex Analysis Tool

```typescript
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
    export: true,
    realtime: true
  },
  urlStateKeys: ['term']
}
```

### Interactive Tool with Real-time Features

```typescript
const searchTool: Tool = {
  id: 'search',
  name: 'Search',
  description: 'Search document content with text and semantic search',
  category: 'interactive',
  icon: MagnifyingGlass,
  componentPath: '@/components/tools/SearchPanel',
  tabId: 'search',
  shortcuts: ['Cmd+6', 'Ctrl+6'],
  keywords: ['find', 'query', 'search', 'locate'],
  requiresDocument: true,
  capabilities: {
    search: true,
    realtime: true
  },
  urlStateKeys: ['q', 'type', 'case']
}
```

## Testing Considerations

### Registry Testing
- Test tool registration and retrieval
- Verify conflict detection for duplicate IDs/shortcuts
- Test registry reset for test isolation

### Component Testing
- Mock tool registry in component tests
- Test tool loading and error states
- Verify URL state integration

### Integration Testing
- Test full tool workflow (registration → discovery → rendering)
- Verify command palette generation
- Test cross-pane communication

## Error Handling

### Registration Errors
- Duplicate tool IDs
- Invalid component paths
- Missing required fields
- Shortcut conflicts

### Runtime Errors
- Component loading failures
- URL state validation errors
- Cross-pane communication failures

### Development Guards
- `UNREGISTERED_TOOL_GUARD` warnings for missing tools
- Registry lock prevents late registrations
- Type checking for tool definitions

## Performance Considerations

### Lazy Loading
- Components loaded on-demand via `componentPath`
- Registry populated at startup, not runtime
- URL state hooks only active when tool is visible

### Memory Management
- Test registry reset prevents pollution
- Component unmounting clears tool state
- URL state cleanup on navigation

### Bundle Size
- Tool components code-split by default
- Registry metadata minimal (no component code)
- Icon components imported efficiently

## Security Considerations

### Input Validation
- All URL parameters validated against schemas
- Component props type-checked
- Cross-pane actions restricted to safe operations

### Access Control
- `requiresDocument` prevents unauthorized tool access
- Tool capabilities restrict available operations
- Registry validation prevents malicious tool registration

## Future Enhancements

### Dynamic Tool Loading
- Plugin architecture for third-party tools
- Remote tool loading from CDN
- User-installable tool packages

### Tool Composition
- Multi-tool workflows
- Tool-to-tool communication
- Composite tool interfaces

### Analytics Integration
- Tool usage tracking
- Performance monitoring
- Error reporting and aggregation

## Related Documentation

- `docs/reference/TOOL_TEMPLATE_FOR_CREATING_NEW.md` - Tool creation guide
- `docs/reference/COMMAND_PALETTE_KEYBOARD_INTERFACE.md` - Command palette integration
- `docs/reference/UNIFIED_LEFT_PANE_TABBED_NAVIGATION.md` - Tab system architecture
- `docs/reference/ARCHITECTURE_URL_STATE.md` - URL state management
- `docs/reference/CROSS_PANE_COMMUNICATION_MESSAGING_ARCHITECTURE.md` - Inter-pane communication