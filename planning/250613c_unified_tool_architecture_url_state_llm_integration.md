# Unified Tool Architecture with URL State and LLM Integration

## Goal

Design and implement a unified tool architecture that:
- Provides a consistent interface for all document tools (glossary, summary, search, chat, etc.)
- Enables URL-based state management for shareability and navigation
- Supports LLM function calling for AI-driven tool usage
- Integrates seamlessly with the command palette
- Maintains backwards compatibility while enabling future extensibility

## Context

Currently, tools in Spideryarn Reading are implemented independently without a unified architecture. Each tool has its own component, API route, and state management approach. We need a centralized system that treats tools as first-class citizens, enabling:
- Dynamic tool discovery and registration
- Consistent URL state serialization
- LLM-friendly function interfaces
- Command palette integration
- Analytics tracking

The term "tool" encompasses not just document analysis features (glossary, summary) but also navigation (settings, profile) and document transforms (tweet thread view).

## References

- `docs/reference/TOOL_*.md` - Existing tool documentation showing current patterns
- `docs/reference/COMMAND_PALETTE.md` - Command palette implementation for keyboard navigation
- `docs/reference/CROSS_PANE_COMMUNICATION.md` - DocumentCommunicationContext for state management
- `docs/reference/LLM_PROMPT_TEMPLATES.md` - Nunjucks + Zod template system for AI calls
- `docs/reference/UI_COMPONENTS.md` - Component patterns and shadcn/ui usage
- `docs/reference/UNIFIED_LEFT_PANE.md` - Tab system architecture
- `components/command-palette.tsx` - Current command implementation
- `lib/contexts/document-communication-context.tsx` - Central state management

## Principles & Key Decisions

1. **Use "tool" as the unified term** - Even for navigation and transforms, to harmonize with LLM function calling
2. **Start simple with URL state** - Begin with essential parameters (tab, position), expand gradually
3. **Human-readable URLs** - No base64 encoding; important parameters on the left
4. **Function-first for LLMs** - LLMs prefer function calls over URL generation
5. **Bidirectional state mapping** - URLs and function calls are two representations of the same state
6. **Use nuqs library** - For type-safe URL state management in Next.js App Router
7. **Push vs Replace history** - Push for significant navigation, replace for UI state changes
8. **Performance** - Debounce search (300ms), throttle scroll (1000ms)
9. **Analytics as future capability** - Define tracking points but implement as no-op initially

## Stages & Actions

### Stage: Preparation and sync
- [ ] Run `./scripts/sync-worktrees.ts` to pull latest changes from main

### Stage: Research and design documentation
- [ ] Create `docs/reference/TOOL_ARCHITECTURE.md` documenting the unified tool interface
  - [ ] Define Tool interface with all properties
  - [ ] Document standard vs optional parameters
  - [ ] Include examples for different tool types
  - [ ] Add section on URL state mapping
  - [ ] Add section on LLM function generation
- [ ] Create `docs/reference/TOOL_TEMPLATE.md` as a guide for creating new tools
  - [ ] Step-by-step checklist
  - [ ] Code examples
  - [ ] Testing requirements
- [ ] Update this planning doc with any clarifications from user

### Stage: Core tool infrastructure
- [ ] Install nuqs library: `npm install nuqs`
- [ ] Create `lib/tools/types.ts` with Tool interface definition
  - [ ] Core Tool interface
  - [ ] ToolParams and ToolResult types
  - [ ] ToolCategory enum
  - [ ] URL state configuration types
- [ ] Create `lib/tools/registry.ts` for tool registration
  - [ ] Tool registry Map
  - [ ] Registration function
  - [ ] Validation function
  - [ ] Tool lookup utilities
- [ ] Write tests for tool registry in `lib/tools/__tests__/registry.test.ts`
- [ ] Run tests to ensure registry works correctly

### Stage: URL state management integration
- [ ] Create `lib/tools/url-state.ts` for URL serialization
  - [ ] URL to state parsing
  - [ ] State to URL generation
  - [ ] nuqs schema generation from tools
  - [ ] History management utilities (push vs replace)
- [ ] Create `lib/tools/hooks/use-tool-state.ts` hook
  - [ ] Integrate with nuqs
  - [ ] Bidirectional state sync
  - [ ] Debouncing/throttling logic
- [ ] Write tests for URL state management
- [ ] Run tests

### Stage: Simple tool migration - Glossary
- [ ] Create `lib/tools/implementations/glossary.ts`
  - [ ] Implement Tool interface
  - [ ] Define schema with Zod
  - [ ] Migrate execute function
  - [ ] Configure URL state
- [ ] Update `components/tools/GlossaryPanel.tsx` to use new architecture
- [ ] Register glossary tool in registry
- [ ] Test glossary with new architecture
- [ ] Verify URL state updates correctly

### Stage: DocumentCommunicationContext integration
- [ ] Update `lib/contexts/document-communication-context.tsx`
  - [ ] Add tool execution method
  - [ ] Integrate with URL state hooks
  - [ ] Maintain backwards compatibility
- [ ] Update context tests
- [ ] Run all tests

### Stage: Command palette integration
- [ ] Create `lib/tools/command-generation.ts`
  - [ ] Generate commands from tool registry
  - [ ] Map tool shortcuts
  - [ ] Handle tool-specific parameters
- [ ] Update `components/command-palette.tsx`
  - [ ] Import command generation
  - [ ] Replace hardcoded tool commands
  - [ ] Test all shortcuts still work
- [ ] Test command palette with registered tools

### Stage: Analytics foundation
- [ ] Create `lib/tools/analytics.ts`
  - [ ] Define analytics interface
  - [ ] Implement no-op tracking function
  - [ ] Add TODO comments for future implementation
- [ ] Add analytics calls to tool execution
- [ ] Write tests for analytics integration

### Stage: LLM function generation
- [ ] Create `lib/tools/llm-functions.ts`
  - [ ] Generate OpenAPI schemas from tools
  - [ ] Create function calling wrappers
  - [ ] Type-safe parameter validation
- [ ] Create example LLM integration in `lib/tools/examples/llm-usage.ts`
- [ ] Write tests for schema generation
- [ ] Document LLM usage patterns

### Stage: Complex tool migration - Search
- [ ] Create `lib/tools/implementations/search.ts`
  - [ ] Handle both text and semantic search
  - [ ] Complex URL state (query, type, case sensitivity)
  - [ ] Debounced updates
- [ ] Update search components to use new architecture
- [ ] Test search functionality
- [ ] Verify URL state handles complex parameters

### Stage: Navigation tool - Settings
- [ ] Create `lib/tools/implementations/settings.ts`
  - [ ] Navigation-type tool
  - [ ] No document requirement
  - [ ] Route-based UI
- [ ] Test settings navigation
- [ ] Verify command palette integration

### Stage: Transform tool - Tweet Thread
- [ ] Create `lib/tools/implementations/tweet-thread.ts`
  - [ ] Transform-type tool
  - [ ] Requires document context
  - [ ] Separate route UI
- [ ] Test tweet thread functionality
- [ ] Verify URL handling for transforms

### Stage: Documentation and remaining migrations
- [ ] Use subagent to migrate remaining tools (summary, chat, etc.)
- [ ] Update all TOOL_*.md documentation to reflect new architecture
- [ ] Create migration guide for external developers
- [ ] Update `docs/reference/ARCHITECTURE_OVERVIEW.md` with tool system

### Stage: Testing and validation
- [ ] Use subagent to run comprehensive test suite
- [ ] Test URL shareability across browsers
- [ ] Test command palette with all tools
- [ ] Test history navigation (back/forward)
- [ ] Manual testing of user flows

### Stage: Final review and merge
- [ ] Follow instructions in `docs/instructions/DEBRIEF_PROGRESS.md`
- [ ] Git commit using subagent (follow `docs/instructions/GIT_COMMIT_CHANGES.md`)
- [ ] Review with user
- [ ] Move planning doc to `planning/finished/`
- [ ] Final commit

# Appendix A: Tool Interface Design

## Complete Tool Interface

```typescript
interface Tool {
  // Identity & Metadata
  id: string                    // Unique identifier (e.g., 'glossary')
  name: string                  // Display name (e.g., 'Glossary')
  description: string           // For LLMs and command palette
  category: ToolCategory        // 'analysis' | 'navigation' | 'generation' | 'transform'
  icon: ComponentType          // Phosphor icon component
  
  // Execution
  execute: (params: ToolParams) => Promise<ToolResult>
  schema: {
    required: z.ZodSchema      // Required parameters (Zod schema)
    optional: z.ZodSchema      // Optional parameters with defaults
  }
  
  // UI Integration
  component?: ComponentType<ToolComponentProps>  // React component for tab/modal
  ui: {
    type: 'tab' | 'route' | 'modal' | 'action'
    route?: string             // For route-based tools
  }
  shortcuts?: string[]         // Keyboard shortcuts
  
  // Behavior Configuration
  requiresDocument: boolean    // Can only run in document context
  urlState?: {
    include: boolean          // Should state be in URL?
    params: string[]          // Which params to include
    debounce?: number         // Debounce delay in ms
  }
  cache?: {
    enabled: boolean
    ttl: number              // Time to live in seconds
    key?: (params: ToolParams) => string
  }
  analytics?: {
    track: boolean
    events: string[]         // Event names to track
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
  source?: 'user' | 'command-palette' | 'llm' | 'url'
}

interface ToolResult {
  type: 'success' | 'error' | 'navigation' | 'state-change'
  data?: any
  error?: Error
  navigation?: {
    url?: string
    tab?: string
    scroll?: string
  }
  stateChanges?: Record<string, any>
}
```

# Appendix B: URL State Examples

## State Evolution Examples

### Phase 1 - Simple State
```
/documents/my-doc?tab=summary
/documents/my-doc?tab=glossary&term=quantum
```

### Phase 2 - Rich State
```
/documents/my-doc?tab=summary&section=intro&level=detailed
/documents/my-doc?tab=search&q=blockchain&type=semantic
```

### Phase 3 - Complete State
```
/documents/my-doc?tab=summary&section=intro&level=detailed&highlight=consensus,mining&pane=open
/documents/my-doc?tab=chat&conversation=abc123&message=latest
```

## nuqs Integration Example

```typescript
import { useQueryStates, parseAsString, parseAsStringEnum } from 'nuqs'

const tabValues = ['original', 'ai-generated', 'summary', 'chat', 'glossary', 'search'] as const
const levelValues = ['brief', 'moderate', 'detailed'] as const

export function useDocumentToolState() {
  const [state, setState] = useQueryStates({
    tab: parseAsStringEnum(tabValues).withDefault('original'),
    section: parseAsString,
    q: parseAsString,
    type: parseAsStringEnum(['text', 'semantic']),
    level: parseAsStringEnum(levelValues),
    term: parseAsString,
    highlight: parseAsString,
  })

  // Debounced update for search
  const debouncedSetSearch = useMemo(
    () => debounce((q: string) => setState({ q }), 300),
    [setState]
  )

  return {
    state,
    setState,
    setSearch: debouncedSetSearch,
  }
}
```

# Appendix C: Tool Registration Examples

## Glossary Tool Registration

```typescript
import { GlossaryPanel } from '@/components/tools/GlossaryPanel'
import { FileText } from '@phosphor-icons/react'
import { z } from 'zod'

export const glossaryTool: Tool = {
  id: 'glossary',
  name: 'Glossary',
  description: 'Extract and display key terms and concepts from the document',
  category: 'analysis',
  icon: FileText,
  
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
  
  execute: async (params) => {
    if (params.action === 'open') {
      return {
        type: 'state-change',
        stateChanges: { activeTab: 'glossary' }
      }
    }
    
    // Call glossary API
    const response = await fetch('/api/glossary', {
      method: 'POST',
      body: JSON.stringify(params.params)
    })
    
    return {
      type: 'success',
      data: await response.json()
    }
  },
  
  component: GlossaryPanel,
  ui: { type: 'tab' },
  shortcuts: ['Cmd+5', 'Ctrl+5'],
  requiresDocument: true,
  
  urlState: {
    include: true,
    params: ['term']
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
```

## Settings Navigation Tool

```typescript
export const settingsTool: Tool = {
  id: 'settings',
  name: 'Settings',
  description: 'Application settings and preferences',
  category: 'navigation',
  icon: Gear,
  
  schema: {
    required: z.object({}),
    optional: z.object({
      section: z.string().optional()
    })
  },
  
  execute: async (params) => {
    return {
      type: 'navigation',
      navigation: {
        url: `/settings${params.params?.section ? `#${params.params.section}` : ''}`
      }
    }
  },
  
  ui: { type: 'route', route: '/settings' },
  shortcuts: ['Cmd+,', 'Ctrl+,'],
  requiresDocument: false,
  
  urlState: {
    include: false // Settings have their own URL
  }
}
```

# Appendix D: LLM Function Calling

## Generated LLM Functions

```typescript
// Auto-generated from tool registry
const llmFunctions = [
  {
    name: 'use_glossary_tool',
    description: 'Extract and display key terms and concepts from the document',
    parameters: {
      type: 'object',
      properties: {
        action: { 
          type: 'string', 
          enum: ['open', 'execute', 'refresh'],
          description: 'What action to perform'
        },
        term: { 
          type: 'string',
          description: 'Specific term to highlight (optional)'
        },
        refresh: {
          type: 'boolean',
          description: 'Force refresh of cached data',
          default: false
        }
      },
      required: ['action']
    }
  },
  {
    name: 'navigate_to_settings',
    description: 'Open application settings',
    parameters: {
      type: 'object',
      properties: {
        section: {
          type: 'string',
          description: 'Specific settings section to open'
        }
      }
    }
  }
]
```

## LLM Usage Example

```typescript
// LLM calls function
const result = await callLLMFunction('use_glossary_tool', {
  action: 'execute',
  term: 'quantum computing'
})

// This translates to:
// 1. Tool execution via registry
// 2. URL update: ?tab=glossary&term=quantum+computing
// 3. UI state change
// 4. Analytics tracking
```

# Appendix E: History Management Strategy

## Push vs Replace Decision Matrix

| Action | History Strategy | Rationale |
|--------|-----------------|-----------|
| Tab change | Push | Users expect Back to return to previous tab |
| Search submit | Push | Completed searches are navigation points |
| Search typing | Replace | Don't pollute history with every keystroke |
| Scroll position | Replace | Transient UI state |
| Summary level | Replace | UI preference, not navigation |
| Open glossary term | Push | Specific content navigation |
| Toggle pane | Replace | UI layout preference |
| Document navigation | Push | Major navigation event |

## Implementation Example

```typescript
function updateToolState(tool: Tool, changes: Record<string, any>, options?: { push?: boolean }) {
  const shouldPush = options?.push ?? tool.urlState?.push ?? false
  
  if (shouldPush) {
    router.push(createURL(changes))
  } else {
    router.replace(createURL(changes), { scroll: false })
  }
}
```

# Appendix F: Migration Strategy

## Phase 1: Core Infrastructure (Week 1)
- Tool interface and registry
- URL state management
- Basic tool migration (Glossary)

## Phase 2: Integration (Week 2)
- Command palette integration
- DocumentCommunicationContext updates
- Search and Summary migration

## Phase 3: Advanced Features (Week 3)
- LLM function generation
- Analytics foundation
- Navigation tools

## Phase 4: Completion (Week 4)
- Remaining tool migrations
- Documentation updates
- Testing and validation

## Backwards Compatibility

During migration, both old and new systems will coexist:
1. Tools register with new system but keep old implementations
2. Gradual component updates to use new hooks
3. URL state added without breaking existing URLs
4. Command palette falls back to hardcoded commands if registry fails

---

This comprehensive planning document outlines the path to implementing a unified tool architecture that supports URL state management, LLM integration, and maintains the flexibility to grow with future requirements.


## Appendix - Critique from o3

Below is a pragmatic, “rubber-duck” review of the proposed migration to a unified tool architecture.  I split the feedback into strengths, potential risks / blind spots, and concrete suggestions for tightening the plan.

--------------------------------------------------------------------
STRENGTHS
--------------------------------------------------------------------
1.  Vision & terminology are clear  
    • Using “Tool” as a universal concept (analysis, navigation, transform) keeps the mental model simple.  
2.  Incremental migration path  
    • Side-by-side support for old and new APIs minimises disruption.  
3.  URL state as a first-class concern  
    • Explicit push vs replace matrix shows forethought about UX and browser history.  
4.  Test hooks baked into every stage  
    • Unit tests for registry, URL helpers, etc. reduce the chance of silent breakage later.  
5.  Early groundwork for analytics & LLM integration  
    • Even if analytics is a stub, designing the touch-points now avoids retro-fitting later.  

--------------------------------------------------------------------
RISKS & GAPS
--------------------------------------------------------------------
1.  Scope creep / timeline realism  
    • Weeks 2-4 each contain multiple “Stage: …” blocks that could individually be a week.  
    • Complex tools (chat, semantic search) and LLM function generation will almost certainly uncover edge cases not accounted for.  

2.  Registry auto-generation vs manual curation  
    • You rely on the registry for both runtime tooling and static artefacts (OpenAPI, command palette).  
      – How will tree-shaking or code-splitting affect web-bundling when every tool’s code is imported to build the schema?  
      – Is there a plan to lazy-load tool components to keep the main bundle small?  

3.  URL length & readability tension  
    • Principle 3 discourages base-64 encoding, but semantic-search and chat history could explode query-string size. Consider short IDs plus shared state in localStorage or server-side sessions.  

4.  Debounce logic living inside hook  
    • Debounce ties state management and UX together; risk of hidden magic and race conditions (e.g., multiple hooks on one page).  

5.  Cache invalidation policy  
    • TTL in seconds is hard-coded per tool.  Complex documents or multi-user collaboration will need smarter invalidation (etag, version).  

6.  Analytics placeholders  
    • Even a no-op tracker should define what data is collected. GDPR/CCPA compliance decisions can’t be an after-thought.  

7.  LLM security & cost  
    • Direct call to an LLM via function-calling can leak proprietary document content unless redaction, auth, and rate-limiting are addressed.  
    • Unit tests alone won’t surface token-cost or prompt-injection issues.  

8.  Backwards-compatibility edge cases  
    • Docs with old URLs bookmarked before migration could lose deep-link parameters (e.g., `#term-123`).  Plan should include a migration adapter or redirect logic.  

9.  Command-palette re-implementation  
    • Current palette is likely tuned for performance; rewriting it around dynamic tool registry could introduce latency. Pre-compute static command list at build-time if possible.  

10. End-to-end & visual tests missing  
    • Jest unit tests are good but interactions (scroll push/replace, shortcut collisions, route transitions) need cypress/playwright coverage.  

--------------------------------------------------------------------
CONCRETE SUGGESTIONS
--------------------------------------------------------------------
1.  Tighten the timeline  
    • Split Week 2 (integration) into two checkpoints:  
      a. Registry + hooks + one migrated tool behind a feature flag  
      b. Command-palette + URL state gated separately  

2.  Add a “Performance & Bundle-size” checklist to each stage  
    • For every new file, decide if it belongs in the main bundle or should be lazily imported.  

3.  Formalise a *Capability Matrix* per tool  
    • Columns: requires-doc, uses-LLM, heavy-component, cacheable, analytics, etc.  
    • Lets you sanity-check assumptions before writing code.  

4.  URL state fall-back strategy  
    • Create a `legacyQueryAdapter` that maps old query keys to new ones and logs deprecation warnings.  

5. Introduce feature flags  
    • Put new registry under a Next.js `experimentalToolArch` flag so you can ship incremental slices to production safely.  

6. Security & privacy review gate  
    • After Stage “LLM function generation”, schedule a dedicated P0 gate to run red-team prompts and check for data leakage.  

7. Shared debounce / throttle utilities  
    • Centralise them in `lib/tools/utils.ts` so multiple hooks don’t silently fight each other.  

8. Define analytics schema up front  
    • Even if collection is `noop`, explicitly type each event payload for future enforcement.  

9. Bundle Visual Snapshot tests  
    • Use Storybook or Chromatic to capture before/after UI for migrated components to catch regressions early.  

10. Checkpoint for documentation parity  
    • Before final merge, diff old `TOOL_*.md` vs new docs; CI should fail if any existing public sections disappear without replacement.  

--------------------------------------------------------------------
QUESTIONS FOR CLARIFICATION
--------------------------------------------------------------------
1. Do we anticipate third-party plugins/tools? If yes, how will they register without code changes to the monorepo?  
2. Is nuqs the right abstraction if we later move to React Server Components or a non-Next environment (Electron, React Native)?  
3. What is the rollback strategy if a migrated tool breaks? Can we flip a flag to fall back to the old path instantly?  
4. Will LLM usage be synchronous (blocking UI) or queued/background for large documents?  

--------------------------------------------------------------------
BOTTOM LINE
The plan is thoughtfully structured and demonstrates clear architectural intent, but it is ambitious for a four-week window and under-specifies risk mitigation around performance, privacy, and backwards compatibility.  Addressing the above gaps incrementally—using feature flags, stricter milestones, and adding cross-cutting concerns (performance, security, analytics) earlier—will improve the odds of a smooth migration.
