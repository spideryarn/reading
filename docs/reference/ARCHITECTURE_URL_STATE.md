# URL State Management

URL-based state management enables shareable, bookmarkable document views with tool configurations using the nuqs library for type-safe parameter handling.

## See also

- `lib/tools/url-state-types.ts` - URL parameter type definitions and constants
- `lib/tools/url-state.ts` - Core URL state utilities and history management
- `lib/tools/hooks/use-tool-url-state.ts` - React hooks for URL state management
- `lib/tools/url-validation.ts` - Parameter validation and error handling
- `components/url-validation-warning.tsx` - User-facing validation error display
- `lib/contexts/document-communication-context.tsx` - Central state management integration
- `planning/250614a_tool_url_state_management.md` - Implementation planning and decisions
- [nuqs documentation](https://github.com/47ng/nuqs) - Type-safe URL state library

## Principles & Key Decisions

- **Human-readable URLs** - No base64 encoding; important parameters on the left
- **Progressive enhancement** - URL state added to existing tools without breaking changes
- **nuqs v2 integration** - No provider needed for Next.js App Router
- **Push vs Replace history** - Push for significant navigation, replace for UI state changes
- **Single source of truth** - URL is the authoritative source; context mirrors it read-only (as of 2025-06-15)

## URL Parameter Schema

### Base Structure
```
/read/[document-slug]?tab=TOOL&TOOL_PARAMS
```

### Tab Parameter
Controls which tool pane is active in the unified left pane:
- `?tab=original` - Original document view
- `?tab=ai-generated` - AI-generated headings
- `?tab=summary` - Hierarchical summaries
- `?tab=chat` - Chat assistant
- `?tab=glossary` - Document glossary
- `?tab=search` - Search interface
- `?tab=highlights` - Semantic highlights

### Tool-Specific Parameters

#### Glossary
- `?term=TERM` - Highlighted glossary term
- Example: `/read/my-doc?tab=glossary&term=quantum`

#### Search
- `?q=QUERY` - Search query text
- `?type=text|semantic` - Search type (default: text)
- `?case=true|false` - Case sensitivity (default: false)
- Example: `/read/my-doc?tab=search&q=consciousness&type=semantic`

#### Summary
- `?expertise=beginner|intermediate|expert` - User expertise level
- `?length=sentence_or_two|single_short_paragraph|page` - Summary length preference
- Example: `/read/my-doc?tab=summary&expertise=beginner&length=sentence_or_two`

#### Chat
- `?conversation=THREAD_ID` - Persistent conversation thread
- Example: `/read/my-doc?tab=chat&conversation=5a5f283e-10d3-481d-af98-837056312b90`

#### Highlights
- `?highlight=CRITERION` - Semantic highlight criterion
- Example: `/read/my-doc?tab=highlights&highlight=technical+terms`

## Implementation Patterns

### Using URL State Hooks

Each tool has a dedicated hook for managing its URL state:

```typescript
// Search tool
import { useSearchUrlState } from '@/lib/tools/hooks/use-tool-url-state'

function SearchTool() {
  const { 
    searchQuery, 
    searchType, 
    caseSensitive, 
    setSearchQuery,
    setSearchType,
    setCaseSensitive,
    submitSearch 
  } = useSearchUrlState()
  
  // Component uses URL state directly
  return (
    <input 
      value={searchQuery || ''} 
      onChange={e => setSearchQuery(e.target.value)}
    />
  )
}
```

### History Management Strategy

The system uses intelligent push vs replace decisions:

| Action | Strategy | Rationale |
|--------|----------|-----------|
| Tab change | Push | Users expect Back to return to previous tab |
| Search submit | Push | Completed searches are navigation points |
| Search typing | Replace | Don't pollute history with keystrokes |
| Term selection | Push | Specific content navigation |
| UI preferences | Replace | Transient state changes |

### Search Pattern with Debouncing

Search implements a special pattern to handle real-time typing vs deliberate submission:

```typescript
// In use-tool-url-state.ts
const debouncedSetSearch = useMemo(
  () => debounce((query: string) => {
    setState({ q: query }, { history: 'replace' })
  }, 300),
  [setState]
)

const submitSearch = useCallback(() => {
  if (state.q?.trim()) {
    // Use special flag to trigger push history
    setState({ ...state, submitted: true }, { history: 'push' })
    // Remove flag after push
    setState(current => {
      const { submitted, ...rest } = current
      return rest
    }, { history: 'replace' })
  }
}, [state, setState])
```

## Integration with DocumentCommunicationContext

**⚠️ Important (as of 2025-06-15)**: The URL is now the single source of truth for tab state. The context mirrors the URL read-only to prevent infinite render loops.

### URL as Single Source of Truth

To prevent infinite loops from bidirectional synchronization:
- **URL → Context**: Automatic sync (read-only mirror)
- **Context → URL**: Prevented by development guard
- **Navigation**: Use `useNavigateToTab()` hook instead of `actions.setActiveTab()`

```typescript
// CORRECT: Navigate via URL
import { useNavigateToTab } from '@/lib/tools/hooks/use-tool-url-state'

function MyComponent() {
  const navigateToTab = useNavigateToTab()
  
  return (
    <button onClick={() => navigateToTab('summary')}>
      Go to Summary
    </button>
  )
}

// INCORRECT: Will throw error in development
function BadComponent() {
  const { actions } = useDocumentCommunication()
  
  return (
    <button onClick={() => actions.setActiveTab('summary')}> // ❌ Error!
      Go to Summary
    </button>
  )
}
```

### Internal Synchronization

The `useToolUrlState` hook handles the one-way sync:

```typescript
// In use-tool-url-state.ts
useEffect(() => {
  if (urlState.tab && urlState.tab !== contextState.activeTabId) {
    actions.setActiveTab(urlState.tab, true) // true = internal flag
  }
}, [urlState.tab])
```

## Common Patterns

### Auto-loading from URL

Tools automatically load content when URL parameters are present:

```typescript
// In HighlightManagement component
useEffect(() => {
  if (highlightCriterion && highlightCriterion !== criterion) {
    setCriterion(highlightCriterion)
    // Auto-trigger highlight creation
    if (highlightCriterion.trim()) {
      createHighlights(highlightCriterion)
    }
  }
}, [highlightCriterion, criterion, createHighlights])
```

### Clearing URL State

When clearing tool state, also clear URL parameters:

```typescript
const clearHighlights = useCallback(() => {
  // Clear component state
  setHighlights([])
  // Clear URL state
  setHighlight(null)
}, [setHighlight])
```

## Gotchas & Best Practices

1. **Single Source of Truth** - Always navigate tabs via `useNavigateToTab()`, never `actions.setActiveTab()`
2. **React Infinite Loops** - URL is the source of truth; context only mirrors it to prevent loops
3. **Context Hierarchy** - Ensure URL state hooks are called within appropriate React context providers
4. **Map Comparisons** - When syncing Maps to URL state, compare content not references
5. **TypeScript Types** - Use nuqs parsers for type safety instead of manual parsing
6. **Empty States** - Handle null/undefined URL parameters gracefully with defaults

## Limitations

- URL length limits may affect very long search queries or criteria
- Browser history size limits could impact heavy users
- Some special characters require URL encoding

## Migration Guide

### From Local State to URL State

1. Replace `useState` with appropriate URL state hook:
```typescript
// Before
const [searchQuery, setSearchQuery] = useState('')

// After
const { searchQuery, setSearchQuery } = useSearchUrlState()
```

2. Handle null/undefined from URL:
```typescript
// Provide defaults for URL parameters
value={searchQuery || ''}
```

3. Update clear/reset logic to include URL:
```typescript
// Also clear URL when resetting state
const handleClear = () => {
  setLocalState('')
  setUrlParam(null)
}
```

## Implementation Status

**Current Status**: ✅ Production Ready (as of 2025-06-15)

**Completed Features**:
- ✅ Centralized URL state management with single decision matrix
- ✅ Comprehensive parameter validation with error handling
- ✅ Fixed history management logic for mixed parameter updates
- ✅ Clean search API separation (updateSearch vs submitSearch)
- ✅ 74 unit tests with 100% pass rate
- ✅ TypeScript compilation and ESLint compliance

**Key Implementation Details**:
- All URL state changes flow through centralized `setState` function
- Navigation parameters take precedence over search typing in history decisions
- Undefined values properly handled for parameter clearing
- Console logging provides debugging information for validation errors
- Error boundaries prevent crashes from invalid URL parameters

## Validation & Error Handling

The system includes comprehensive validation for all URL parameters:

```typescript
// Automatic validation on URL state changes
const validation = validateUrlState(updates)
if (!validation.isValid) {
  logValidationErrors(validation.errors, 'URL state update')
  // Use sanitized values and show user warning
}
```

**Validation Features**:
- String length limits (queries: 500 chars, terms: 200 chars)
- Type checking (booleans, enums, UUID formats)
- Element ID format validation for scroll positions
- Fallback values for all invalid parameters
- Clear error messages for debugging

## Future Enhancements

- Server-side state storage for complex states exceeding URL limits
- Analytics integration to track URL parameter usage
- Batch URL updates for complex multi-parameter changes
- URL shortening service for sharing very long URLs
- Migration utilities for legacy bookmark formats

## Testing Checklist

When implementing URL state for a tool:
- [x] URL updates when interacting with tool
- [x] Tool loads correctly from bookmarked URL
- [x] Browser back/forward navigation works
- [x] Clearing tool state clears URL
- [x] Special characters handled correctly
- [x] Invalid parameters show appropriate warnings
- [x] History behavior follows navigation vs preference rules
- [x] No infinite render loops (URL as single source prevents this)
- [x] State syncs unidirectionally (URL → Context only)