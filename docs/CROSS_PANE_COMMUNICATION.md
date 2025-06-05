# Cross-Pane Communication Patterns in React

This document provides a comprehensive analysis of patterns for cross-component communication in React applications, specifically for multi-pane interfaces like Spideryarn Reading's document viewer with left navigation pane.

## See also

- `components/unified-left-pane.tsx` - current implementation using custom DOM events
- `components/resizable-document-layout.tsx` - event dispatching from document pane to navigation
- `docs/CODING_PRINCIPLES.md` - simplicity and debugging principles that guide pattern selection
- `docs/ARCHITECTURE.md` - overall application architecture context
- [React Context API Documentation](https://react.dev/reference/react/useContext) - official React context patterns
- [Zustand GitHub](https://github.com/pmndrs/zustand) - lightweight state management library
- [Event-driven architecture patterns](https://martinfowler.com/articles/201701-event-driven.html) - Martin Fowler's analysis of event patterns

## Key Requirements for Our Use Case

Before selecting a communication pattern, we need to clarify these requirements:

### **Communication Types**
- **Document → Navigation**: User clicks in document, highlight corresponding heading in ToC
- **Navigation → Document**: User clicks ToC heading, scroll document to that section  
- **Chat → Document**: Assistant references document sections, need to highlight/scroll
- **Glossary → Document**: Click glossary term, scroll to first occurrence
- **Cross-tab**: Actions in one tab (e.g., Summary) affect another tab (e.g., Original headings)

### **Performance Characteristics**
- **Event frequency**: ✓ **MODERATE FREQUENCY** - User clicks every few seconds (not performance-critical)
- **Data payload size**: Simple IDs and element references
- **Re-render sensitivity**: Low concern - infrequent updates make re-render performance less critical

### **Key State Requirement: Document Position Sync**
- **Cross-tab position awareness**: When user clicks search result → scrolls document → switches to ToC tab, the ToC should be scrolled to match current document position
- **Shared "current document position" state** that persists across tab switches
- **State persistence**: Reset on page reload is fine, but maintain during session
- **Document isolation**: Multiple documents are completely separate (no shared state between documents)

### **Developer Experience Priorities**
- **Debugging ease**: Can we easily trace communication flow? ✓ HIGH PRIORITY
- **Type safety**: Do we need compile-time guarantees? ✓ YES
- **Maintenance burden**: How easy to add new communication patterns? ✓ IMPORTANT
- **External dependencies**: ✓ Open to small, robust, well-suited libraries

## Current Implementation Analysis

**Status**: ✓ Implemented (basic DOM events)

Our current approach uses native DOM custom events:

```typescript
// Dispatching (ResizableDocumentLayout)
window.dispatchEvent(
  new CustomEvent('doc-heading-click', {
    detail: { headingId: nearestHeading.id }
  })
)

// Listening (UnifiedLeftPane)  
window.addEventListener('doc-heading-click', handleDocHeadingClick)
```

**Strengths**:
- ✓ Dead simple implementation
- ✓ Complete decoupling between components
- ✓ Works across any component tree depth
- ✓ Easy to debug with browser DevTools
- ✓ No dependencies or providers required

**Weaknesses**:
- ⚠️ Bypasses React's data flow patterns
- ⚠️ Loose TypeScript typing (`CustomEvent<any>`)
- ⚠️ Manual lifecycle management (addEventListener/removeEventListener)
- ⚠️ Global namespace pollution potential
- ⚠️ Not visible in React DevTools

## Communication Pattern Options

### Option 1: Improved Event Bus Pattern

**Status**: 📋 Planned (evolution of current approach)

Enhance our current pattern with type safety and better developer experience:

```typescript
// eventBus.ts
type EventMap = {
  'heading-click': { headingId: string }
  'glossary-term-click': { term: string }
  'chat-mention': { elementId: string }
  'scroll-to-element': { elementId: string }
}

class TypedEventBus {
  private listeners = new Map<string, Set<Function>>()

  on<K extends keyof EventMap>(
    event: K, 
    callback: (data: EventMap[K]) => void
  ) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
    
    // Auto-cleanup function
    return () => this.listeners.get(event)?.delete(callback)
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]) {
    // Development debugging
    if (process.env.NODE_ENV === 'development') {
      console.log(`[PaneEvent] ${event}:`, data)
    }
    
    this.listeners.get(event)?.forEach(cb => cb(data))
  }
}

export const paneBus = new TypedEventBus()

// React hook wrapper
export function usePaneEvent<K extends keyof EventMap>(
  event: K, 
  handler: (data: EventMap[K]) => void
) {
  useEffect(() => {
    return paneBus.on(event, handler)
  }, [event, handler])
}
```

**Usage**:
```typescript
// Dispatching
paneBus.emit('heading-click', { headingId: 'section-1' })

// Listening  
usePaneEvent('heading-click', ({ headingId }) => {
  // Handle with full type safety
})
```

**Pros**:
- ✓ Type-safe event definitions
- ✓ Easy debugging with console logging
- ✓ Automatic cleanup
- ✓ Minimal migration from current code
- ✓ Can add DevTools integration later
- ✓ Performance: no React re-renders for side-effects

**Cons**:
- ⚠️ Still external to React ecosystem
- ⚠️ Manual lifecycle management
- ⚠️ No built-in state persistence

**Best for**: Side-effect communications (scrolling, highlighting) rather than state updates

### Option 2: React Context Pattern

**Status**: 📋 Planned (alternative approach)

Use React's built-in Context API for communication:

```typescript
// PaneCommunicationContext.tsx
interface PaneCommunicationState {
  activeHeadingId: string | null
  highlightedTerm: string | null
  scrollTarget: string | null
}

interface PaneCommunicationActions {
  setActiveHeading: (id: string | null) => void
  highlightTerm: (term: string | null) => void
  scrollToElement: (id: string) => void
}

const PaneCommunicationContext = createContext<{
  state: PaneCommunicationState
  actions: PaneCommunicationActions
} | null>(null)

export function PaneCommunicationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PaneCommunicationState>({
    activeHeadingId: null,
    highlightedTerm: null,
    scrollTarget: null
  })

  const actions = useMemo(() => ({
    setActiveHeading: (id: string | null) => 
      setState(prev => ({ ...prev, activeHeadingId: id })),
    
    highlightTerm: (term: string | null) =>
      setState(prev => ({ ...prev, highlightedTerm: term })),
      
    scrollToElement: (id: string) =>
      setState(prev => ({ ...prev, scrollTarget: id }))
  }), [])

  return (
    <PaneCommunicationContext.Provider value={{ state, actions }}>
      {children}
    </PaneCommunicationContext.Provider>
  )
}

export function usePaneCommunication() {
  const context = useContext(PaneCommunicationContext)
  if (!context) {
    throw new Error('usePaneCommunication must be used within PaneCommunicationProvider')
  }
  return context
}
```

**Usage**:
```typescript
// In components
const { state, actions } = usePaneCommunication()

// Read state
const isActive = state.activeHeadingId === headingId

// Dispatch actions
actions.setActiveHeading('section-1')
```

**Pros**:
- ✓ Pure React pattern
- ✓ Excellent TypeScript support
- ✓ Visible in React DevTools
- ✓ Built-in to React (no dependencies)
- ✓ Can easily add persistence
- ✓ Integrates with React concurrent features

**Cons**:
- ⚠️ Can cause unnecessary re-renders if not optimized
- ⚠️ Requires provider wrapping
- ⚠️ Need to manage context value stability
- ⚠️ More complex than event bus for simple side-effects

**Best for**: State that multiple components need to read/write

### Option 3: Zustand State Management

**Status**: 📋 Planned (external library option)

Lightweight state management with excellent DX:

```typescript
// paneStore.ts
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface PaneState {
  // State
  activeHeadingId: string | null
  highlightedTerm: string | null
  
  // Actions
  setActiveHeading: (id: string | null) => void
  highlightTerm: (term: string | null) => void
  scrollToHeading: (id: string) => void
}

export const usePaneStore = create<PaneState>()(
  devtools(
    (set, get) => ({
      // Initial state
      activeHeadingId: null,
      highlightedTerm: null,
      
      // Actions
      setActiveHeading: (id) => set({ activeHeadingId: id }),
      
      highlightTerm: (term) => set({ highlightedTerm: term }),
      
      scrollToHeading: (id) => {
        set({ activeHeadingId: id })
        // Side effect: actual scrolling
        const element = document.getElementById(id)
        element?.scrollIntoView({ behavior: 'smooth' })
      }
    }),
    { name: 'pane-communication' }
  )
)

// Selective subscriptions (performance optimization)
export const useActiveHeading = () => usePaneStore(state => state.activeHeadingId)
export const useHighlightedTerm = () => usePaneStore(state => state.highlightedTerm)
```

**Usage**:
```typescript
// Read state (only re-renders when activeHeadingId changes)
const activeHeadingId = useActiveHeading()

// Use actions
const { setActiveHeading, scrollToHeading } = usePaneStore()
```

**Pros**:
- ✓ Tiny bundle size (8kb gzipped)
- ✓ No provider needed
- ✓ Selective subscriptions prevent unnecessary re-renders
- ✓ Excellent DevTools support
- ✓ Built-in persistence options
- ✓ Can combine state + side effects cleanly
- ✓ Great TypeScript experience

**Cons**:
- ⚠️ External dependency
- ⚠️ Another state management paradigm to learn
- ⚠️ Overkill for simple event-driven communication

**Best for**: Complex state with multiple readers/writers, performance-critical apps

### Option 4: Custom Hook with Lifted State

**Status**: 📋 Planned (pure React approach)

Lift communication state to a common parent and pass down:

```typescript
// usePaneCommunication.ts
export function usePaneCommunication() {
  const [communication, setCommunication] = useState({
    activeHeadingId: null as string | null,
    highlightedTerm: null as string | null,
  })
  
  const actions = useMemo(() => ({
    setActiveHeading: (id: string | null) => 
      setCommunication(prev => ({ ...prev, activeHeadingId: id })),
      
    highlightTerm: (term: string | null) =>
      setCommunication(prev => ({ ...prev, highlightedTerm: term })),
      
    scrollToHeading: (id: string) => {
      setCommunication(prev => ({ ...prev, activeHeadingId: id }))
      // Side effect
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    }
  }), [])
  
  return { ...communication, ...actions }
}

// Usage in layout component
const paneComm = usePaneCommunication()

return (
  <div>
    <UnifiedLeftPane 
      activeHeadingId={paneComm.activeHeadingId}
      onHeadingClick={paneComm.scrollToHeading}
    />
    <DocumentPane 
      onElementClick={paneComm.setActiveHeading}
      highlightedTerm={paneComm.highlightedTerm}
    />
  </div>
)
```

**Pros**:
- ✓ Pure React patterns
- ✓ Easy to understand and debug
- ✓ Excellent TypeScript support
- ✓ No external dependencies
- ✓ Visible in React DevTools

**Cons**:
- ⚠️ Prop drilling for deep component trees
- ⚠️ All consumers re-render on any state change
- ⚠️ Can become unwieldy with many communication types

**Best for**: Simple applications with shallow component trees

## Comparison Matrix

| Pattern | Type Safety | Performance | Debug Experience | Learning Curve | Bundle Size |
|---------|-------------|-------------|------------------|----------------|-------------|
| **Current DOM Events** | ⚠️ Weak | ✓ Good | ✓ Good | ✓ Low | ✓ Zero |
| **Improved Event Bus** | ✓ Strong | ✓ Good | ✓ Excellent | ✓ Low | ✓ Minimal |
| **React Context** | ✓ Strong | ⚠️ Moderate | ✓ Good | ⚠️ Medium | ✓ Zero |
| **Zustand** | ✓ Strong | ✓ Excellent | ✓ Excellent | ⚠️ Medium | ✓ Small |
| **Lifted State** | ✓ Strong | ⚠️ Poor | ✓ Good | ✓ Low | ✓ Zero |

## Updated Analysis Based on Requirements

### **Key Insight: You Need State Management, Not Just Events**

Based on your requirement for "overall position in the document maintained across tabs", this is actually a **state management problem** rather than just event communication:

```typescript
// What you need:
const documentState = {
  currentPosition: { elementId: 'section-3', scrollOffset: 150 },
  highlightedTerm: 'consciousness',
  activeSection: 'introduction'
}

// When user clicks search result:
1. Update documentState.currentPosition
2. Scroll document pane
3. When user switches to ToC tab, ToC reads currentPosition and syncs
```

### **This Changes the Recommendation Significantly**

With **moderate frequency communication** + **shared state requirements** + **simplicity priorities**, multiple patterns become viable:

## Updated Decision Framework

### **🎯 RECOMMENDED: React Context**
Now the best fit given moderate frequency:
- ✅ **Perfect performance**: Updates every few seconds won't cause re-render issues
- ✅ **Shared state**: Ideal for "current document position" across tabs  
- ✅ **Pure React**: No external dependencies, follows React patterns
- ✅ **Type safety**: Excellent TypeScript support
- ✅ **Debugging**: Visible in React DevTools
- ✅ **Simplicity**: Built into React, familiar patterns

### **🥈 STRONG ALTERNATIVE: Zustand** 
Still excellent but less necessary:
- ✅ **Selective subscriptions**: Nice optimization but not needed at this frequency
- ✅ **Shared state**: Perfect for "current document position" across tabs  
- ✅ **Side effects + state**: Can combine state updates with scrolling actions
- ✅ **Small dependency**: 8kb, well-maintained
- ⚠️ **Overkill**: More powerful than needed for this use case

### **🥉 VIABLE: Improved Event Bus + Lifted State**
Hybrid approach if avoiding React patterns:
- ✅ **Familiar**: Builds on your current approach
- ⚠️ **More complex**: Need to coordinate two patterns
- ⚠️ **Less cohesive**: State and actions in different systems

### **❌ NOT RECOMMENDED:**
- **Pure Event Bus**: Doesn't solve the shared state requirement
- **Lifted State alone**: Prop drilling becomes unwieldy

## Migration Strategy

### Phase 1: Incremental Improvement (Recommended Start)
Enhance current implementation without architectural changes:

```typescript
// Step 1: Type-safe event helpers
export function emitPaneEvent<T>(name: string, detail: T) {
  if (typeof window !== 'undefined') {
    console.log(`[PaneEvent] ${name}:`, detail) // Easy debugging
    window.dispatchEvent(new CustomEvent(name, { detail }))
  }
}

export function usePaneEvent<T>(
  name: string, 
  handler: (detail: T) => void
) {
  useEffect(() => {
    const listener = (e: CustomEvent<T>) => handler(e.detail)
    window.addEventListener(name, listener as any)
    return () => window.removeEventListener(name, listener as any)
  }, [name, handler])
}
```

**Benefits**:
- ✓ Immediate type safety and debugging improvement
- ✓ Minimal code changes required
- ✓ Can be done incrementally
- ✓ Easy to revert if needed

### Phase 2: Event Bus Evolution (If Needed)
If Phase 1 proves insufficient, migrate to full typed event bus:

```typescript
// Gradual migration: start with one event type
paneBus.on('heading-click', handleHeadingClick)
// Replace: window.addEventListener('doc-heading-click', handleHeadingClick)
```

### Phase 3: State Management (Future)
Only if communication becomes stateful and complex:

```typescript
// Add Zustand for state that needs persistence/sharing
const usePaneStore = create(...)

// Keep event bus for simple side-effects
paneBus.emit('scroll-to-element', { id })
```

## Updated Recommendations

### **🎯 PRIMARY RECOMMENDATION: React Context**

Given moderate frequency + shared state requirements, React Context is now the best fit:

#### **Phase 1: React Context for Document Position State**
```typescript
// DocumentCommunicationContext.tsx
interface DocumentPosition {
  elementId: string | null
  scrollOffset: number
  timestamp: number
}

interface DocumentCommunicationState {
  currentPosition: DocumentPosition | null
  highlightedTerm: string | null
  activeTabId: string
}

interface DocumentCommunicationActions {
  setCurrentPosition: (elementId: string, scrollOffset?: number) => void
  highlightTerm: (term: string | null) => void
  setActiveTab: (tabId: string) => void
  scrollToElement: (elementId: string) => void
}

const DocumentCommunicationContext = createContext<{
  state: DocumentCommunicationState
  actions: DocumentCommunicationActions
} | null>(null)

export function DocumentCommunicationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DocumentCommunicationState>({
    currentPosition: null,
    highlightedTerm: null,
    activeTabId: 'original'
  })

  const actions = useMemo(() => ({
    setCurrentPosition: (elementId: string, scrollOffset = 0) =>
      setState(prev => ({
        ...prev,
        currentPosition: { elementId, scrollOffset, timestamp: Date.now() }
      })),
    
    highlightTerm: (term: string | null) =>
      setState(prev => ({ ...prev, highlightedTerm: term })),
    
    setActiveTab: (tabId: string) =>
      setState(prev => ({ ...prev, activeTabId: tabId })),
    
    scrollToElement: (elementId: string) => {
      // Update state first
      setState(prev => ({
        ...prev,
        currentPosition: { elementId, scrollOffset: 0, timestamp: Date.now() }
      }))
      
      // Then perform side effect
      const element = document.getElementById(elementId)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }), [])

  return (
    <DocumentCommunicationContext.Provider value={{ state, actions }}>
      {children}
    </DocumentCommunicationContext.Provider>
  )
}

export function useDocumentCommunication() {
  const context = useContext(DocumentCommunicationContext)
  if (!context) {
    throw new Error('useDocumentCommunication must be used within DocumentCommunicationProvider')
  }
  return context
}
```

#### **Phase 2: Keep Current Events for Simple Actions**
```typescript
// Keep your current DOM events for simple side-effects
window.dispatchEvent(
  new CustomEvent('highlight-element', { detail: { elementId } })
)

// Use Zustand for shared state
useDocumentStore.getState().setCurrentPosition(elementId)
```

#### **Phase 3: Gradually Replace Events with Store Actions**
Migrate events to store actions as you encounter them.

### **🥈 ALTERNATIVE: Enhanced Event Bus (If avoiding dependencies)**
If you strongly prefer no external dependencies:

```typescript
// Hybrid: Event bus + React state for position
const [documentPosition, setDocumentPosition] = useState(null)

// Event bus for actions
paneBus.emit('scroll-to-element', { elementId })

// React state for position sync across tabs
setDocumentPosition({ elementId, timestamp: Date.now() })
```

### **Implementation Priority**
1. **Start with Zustand** - addresses your core requirements immediately
2. **Implement document position syncing** - solves the cross-tab position problem
3. **Add performance monitoring** - measure impact of frequent updates
4. **Keep current events temporarily** - migrate incrementally

## Implementation Examples

see `components/unified-left-pane.tsx:250` for current event listener implementation
see `components/resizable-document-layout.tsx:158` for current event dispatching

### **Document Position Syncing Example (Zustand)**

Here's how the cross-tab position syncing would work:

```typescript
// documentStore.ts
export const useDocumentStore = create<DocumentState>()(
  devtools(
    (set, get) => ({
      currentPosition: null,
      highlightedTerm: null,
      activeTabId: 'original',
      
      setCurrentPosition: (elementId, scrollOffset = 0) => 
        set({ 
          currentPosition: { 
            elementId, 
            scrollOffset, 
            timestamp: Date.now() 
          } 
        }),
      
      scrollToElement: (elementId) => {
        // Update state
        get().setCurrentPosition(elementId)
        
        // Side effect: actual scrolling
        const element = document.getElementById(elementId)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' })
        }
      }
    }),
    { name: 'document-communication' }
  )
)

// Usage in components
const SearchResults = () => {
  const scrollToElement = useDocumentStore(state => state.scrollToElement)
  
  return (
    <div onClick={() => scrollToElement('section-3')}>
      Search result...
    </div>
  )
}

const TableOfContents = () => {
  const currentPosition = useDocumentStore(state => state.currentPosition)
  
  useEffect(() => {
    // When tab becomes active, sync ToC to current document position
    if (currentPosition?.elementId) {
      scrollTocToElement(currentPosition.elementId)
    }
  }, [currentPosition])
  
  return <div>/* ToC content */</div>
}
```

### **User Journey Example**:
1. User clicks search result → `scrollToElement('section-3')` → document scrolls + state updates
2. User switches to ToC tab → ToC reads `currentPosition.elementId` → ToC scrolls to match
3. User clicks different ToC heading → same pattern, all tabs stay in sync

### Current Event Types in Use

```typescript
// Currently implemented
'doc-heading-click': { headingId: string }

// Potential future events
'glossary-term-click': { term: string, position?: number }
'chat-mention-element': { elementId: string, context: string }
'scroll-to-element': { elementId: string, behavior?: 'smooth' | 'instant' }
'highlight-text': { text: string, className?: string }
'tab-activated': { tabId: string, timestamp: number }
```

## Troubleshooting Common Issues

### Event Bus Pattern
- **Memory leaks**: Always return cleanup functions from event listeners
- **Stale closures**: Use useCallback for event handlers
- **Debug floods**: Add event filtering in development console

### React Context Pattern  
- **Unnecessary re-renders**: Split contexts by update frequency
- **Provider hell**: Use context composition patterns
- **Context value stability**: Memoize context values properly

### State Management Libraries
- **Bundle size**: Use tree-shaking and selective imports
- **Learning curve**: Start with simple patterns, add complexity gradually
- **DevTools**: Ensure proper setup for debugging experience

## Future Evolution Considerations

### Real-time Collaboration
If adding multi-user features:
- **Event bus**: Can easily integrate with WebSocket events
- **State management**: Zustand has good integration with real-time updates
- **Context**: May need additional patterns for conflict resolution

### Plugin Architecture  
For third-party extensions:
- **Event bus**: Easy for plugins to emit/listen to events
- **State management**: Plugins can add their own stores
- **Context**: May require context composition patterns

### Performance at Scale
For large documents or many simultaneous users:
- **Event batching**: Group related events together
- **Selective subscriptions**: Only update components that need changes
- **Virtual scrolling**: May need specialized communication patterns

---

*Document created: 5 June 2025*  
*Status: 📋 Planned - Awaiting requirements clarification and pattern selection*