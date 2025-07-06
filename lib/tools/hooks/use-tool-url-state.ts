'use client'

// Hook for managing tool URL state with nuqs
// URL is the single source of truth; DocumentCommunicationContext mirrors it
// See docs/reference/ARCHITECTURE_URL_STATE.md for complete URL state architecture

import { useCallback, useMemo, useEffect } from 'react'
import { useQueryStates, parseAsString, parseAsStringEnum, parseAsBoolean } from 'nuqs'
import { useDocumentCommunication } from '@/lib/context/document-communication-context'
import { 
  TAB_VALUES, 
  SEARCH_TYPES, 
  SUMMARY_LEVELS,
  EXPERTISE_LEVELS,
  LENGTH_LEVELS,
  TabValue,
  SearchType,
  SummaryLevel,
  ExpertiseLevel,
  LengthLevel,
  ToolUrlState
} from '../url-state-types'
import { shouldPushHistory } from '../url-state'
import { validateUrlState, logValidationErrors } from '../url-validation'
import { showUrlValidationWarnings } from '@/components/global-url-warnings'
import { debounce } from '@/lib/utils/debounce'
import { throttle } from '@/lib/utils/throttle'

// Utility: construct a Partial<ToolUrlState>.
// When value is undefined, we include the key with null to explicitly clear the URL parameter.
// This ensures that clearing inputs (e.g., glossary search) actually removes the corresponding
// query parameter instead of leaving the previous value intact.
function buildUpdates<K extends keyof ToolUrlState>(
  key: K,
  value: ToolUrlState[K] | undefined
): Partial<ToolUrlState> {
  return { [key]: value === undefined ? null : value } as Partial<ToolUrlState>
}

// Parser definitions for nuqs
// Cast readonly const arrays to mutable arrays expected by nuqs helper
const tabParser = parseAsStringEnum<TabValue>([...TAB_VALUES] as TabValue[]).withDefault('structure')
const searchTypeParser = parseAsStringEnum<SearchType>([...SEARCH_TYPES] as SearchType[]).withDefault('text')
const summaryLevelParser = parseAsStringEnum<SummaryLevel>([...SUMMARY_LEVELS] as SummaryLevel[])
const expertiseLevelParser = parseAsStringEnum<ExpertiseLevel>([...EXPERTISE_LEVELS] as ExpertiseLevel[]).withDefault('intermediate')
const lengthLevelParser = parseAsStringEnum<LengthLevel>([...LENGTH_LEVELS] as LengthLevel[]).withDefault('single_short_paragraph')
const booleanParser = parseAsBoolean.withDefault(false)
const stringParser = parseAsString

// Type for nuqs-compatible update object
type NuqsUpdateObject = {
  tab?: typeof TAB_VALUES[number] | null
  term?: string | null
  q?: string | null
  type?: typeof SEARCH_TYPES[number] | null
  case?: boolean | null
  level?: typeof SUMMARY_LEVELS[number] | null
  expertise?: typeof EXPERTISE_LEVELS[number] | null
  length?: typeof LENGTH_LEVELS[number] | null
  highlight?: string | null
  conversation?: string | null
  scroll?: string | null
}

// Hook return type
interface UseToolUrlStateReturn {
  state: ToolUrlState
  setState: (updates: Partial<ToolUrlState>, options?: { forceHistory?: 'push' | 'replace'; skipValidation?: boolean }) => void
  setSearch: (query: string) => void
  setScroll: (elementId: string) => void
  clearState: () => void
}

export function useToolUrlState(): UseToolUrlStateReturn {
  const { state: contextState, actions } = useDocumentCommunication()
  
  // Define URL state with nuqs
  const [urlState, setUrlState] = useQueryStates({
    tab: tabParser,
    term: stringParser,
    q: stringParser,
    type: searchTypeParser,
    case: booleanParser,
    level: summaryLevelParser,
    expertise: expertiseLevelParser,
    length: lengthLevelParser,
    highlight: stringParser,
    conversation: stringParser,
    scroll: stringParser
  })
  
  // ---- setState moved up to avoid use-before-define ----
  const setState = useCallback((updates: Partial<ToolUrlState>, options?: { forceHistory?: 'push' | 'replace'; skipValidation?: boolean }) => {
    let finalUpdates = updates
    if (!options?.skipValidation) {
      const validation = validateUrlState(updates)
      if (!validation.isValid) {
        logValidationErrors(validation.errors, 'URL state update')
        showUrlValidationWarnings(validation.errors)
        finalUpdates = validation.sanitized
      }
    }
    const shouldPush = options?.forceHistory === 'push'
      ? true
      : options?.forceHistory === 'replace'
      ? false
      : shouldPushHistory(finalUpdates)
    // Build the updates object with proper typing for nuqs
    const nuqsUpdates: NuqsUpdateObject = {}
    Object.entries(finalUpdates).forEach(([key, value]) => {
      // Type-safe assignment to nuqsUpdates
      ;(nuqsUpdates as Record<string, unknown>)[key] = value === undefined ? null : value
    })
    setUrlState(nuqsUpdates, { history: shouldPush ? 'push' : 'replace' })
  }, [setUrlState])
  // ------------------------------------------------------
  
  // Sync URL tab state to context when URL changes
  // This handles browser navigation (back/forward) and direct URL changes
  useEffect(() => {
    if (urlState.tab && urlState.tab !== contextState.activeTabId) {
      actions.setActiveTab(urlState.tab, true)
    }
  }, [urlState.tab, actions, contextState.activeTabId]) // Include actions and contextState.activeTabId
  
  // Validate initial URL state on mount and URL changes
  useEffect(() => {
    // Build object omitting undefined values to satisfy exactOptionalPropertyTypes
    const currentState: ToolUrlState = (() => {
      const s: ToolUrlState = { tab: urlState.tab }
      if (urlState.term) s.term = urlState.term
      if (urlState.q) s.q = urlState.q
      if (urlState.type !== undefined) s.type = urlState.type
      if (urlState.case !== undefined) s.case = urlState.case
      if (urlState.level) s.level = urlState.level
      if (urlState.expertise) s.expertise = urlState.expertise
      if (urlState.length) s.length = urlState.length
      if (urlState.conversation) s.conversation = urlState.conversation
      if (urlState.highlight) s.highlight = urlState.highlight
      if (urlState.scroll) s.scroll = urlState.scroll
      return s
    })()
    
    const validation = validateUrlState(currentState)
    
    if (!validation.isValid) {
      // Log validation errors for debugging
      logValidationErrors(validation.errors, 'Initial URL validation')
      
      // Show user-facing warning
      showUrlValidationWarnings(validation.errors)
      
      // Apply sanitized values to URL
      setState(validation.sanitized, { skipValidation: true, forceHistory: 'replace' })
    }
  }, [
    urlState.tab, urlState.term, urlState.q, urlState.type, urlState.case,
    urlState.level, urlState.expertise, urlState.length, urlState.conversation,
    urlState.highlight, urlState.scroll, setState
  ])
  
  // Debounced search update (300ms)
  const debouncedSetSearch = useMemo(
    () => debounce((query: string) => {
      setState(buildUpdates('q', query || undefined))
    }, 300),
    [setState]
  )
  
  // Throttled scroll update (1000ms)
  const throttledSetScroll = useMemo(
    () => throttle((elementId: string) => {
      setState(buildUpdates('scroll', elementId || undefined))
    }, 1000),
    [setState]
  )
  
  
  // Clear all URL state
  const clearState = useCallback(() => {
    setUrlState({
      tab: 'structure',
      term: null,
      q: null,
      type: 'text',
      case: false,
      level: null,
      expertise: 'intermediate',
      length: 'single_short_paragraph',
      highlight: null,
      conversation: null,
      scroll: null
    }, {
      history: 'replace'
    })
  }, [setUrlState])
  
  // Build state object omitting undefined to satisfy exactOptionalPropertyTypes
  const state = useMemo<ToolUrlState>(() => {
    const s: ToolUrlState = { tab: urlState.tab }
    if (urlState.term) s.term = urlState.term
    if (urlState.q) s.q = urlState.q
    if (urlState.type !== undefined) s.type = urlState.type
    if (urlState.case !== undefined) s.case = urlState.case
    if (urlState.level) s.level = urlState.level
    if (urlState.expertise) s.expertise = urlState.expertise
    if (urlState.length) s.length = urlState.length
    if (urlState.highlight) s.highlight = urlState.highlight
    if (urlState.conversation) s.conversation = urlState.conversation
    if (urlState.scroll) s.scroll = urlState.scroll
    return s
  }, [urlState])
  
  return {
    state,
    setState,
    setSearch: debouncedSetSearch,
    setScroll: throttledSetScroll,
    clearState
  }
}

// Convenience hooks for specific tools
export function useGlossaryUrlState() {
  const { state, setState } = useToolUrlState()
  
  const setTerm = useCallback((term: string | null) => {
    setState(buildUpdates('term', term || undefined))
  }, [setState])
  
  return {
    term: state.term,
    setTerm
  }
}

export function useSearchUrlState() {
  const { state, setState, setSearch } = useToolUrlState()
  
  // Search typing update (debounced, replace history)  
  const updateSearch = useCallback((query: string) => {
    setSearch(query) // Use the debounced version from useToolUrlState
  }, [setSearch])
  
  // Search submission (immediate, push history)
  const submitSearch = useCallback((query: string) => {
    setState(buildUpdates('q', query || undefined), { forceHistory: 'push' })
  }, [setState])
  
  const setSearchType = useCallback((type: SearchType) => {
    setState({ type })
  }, [setState])
  
  const setCaseSensitive = useCallback((caseSensitive: boolean) => {
    setState({ case: caseSensitive })
  }, [setState])
  
  return {
    query: state.q,
    searchType: state.type || 'text',
    caseSensitive: state.case || false,
    updateSearch, // Typing updates (replaces history)
    submitSearch, // Submission (pushes history)
    setSearchType,
    setCaseSensitive
  }
}

export function useSummaryUrlState() {
  const { state, setState } = useToolUrlState()
  
  const setLevel = useCallback((level: SummaryLevel) => {
    setState({ level })
  }, [setState])
  
  const setExpertiseLevel = useCallback((expertise: ExpertiseLevel) => {
    setState({ expertise })
  }, [setState])
  
  const setLengthLevel = useCallback((length: LengthLevel) => {
    setState({ length })
  }, [setState])
  
  return {
    level: state.level || 'moderate',
    setLevel,
    expertiseLevel: state.expertise || 'intermediate',
    lengthLevel: state.length || 'single_short_paragraph',
    setExpertiseLevel,
    setLengthLevel
  }
}

export function useChatUrlState() {
  const { state, setState } = useToolUrlState()
  
  const setConversation = useCallback((conversationId: string | null) => {
    setState(buildUpdates('conversation', conversationId || undefined))
  }, [setState])
  
  return {
    conversationId: state.conversation,
    setConversation
  }
}

export function useHighlightsUrlState() {
  const { state, setState } = useToolUrlState()
  
  const setHighlight = useCallback((criterion: string | null) => {
    setState(buildUpdates('highlight', criterion || undefined))
  }, [setState])
  
  return {
    highlightCriterion: state.highlight,
    setHighlight
  }
}

// Convenience hook for simple tab navigation via URL (single-source-of-truth)
export function useNavigateToTab() {
  // Call useToolUrlState only once to avoid nested hooks issue
  const { setState } = useToolUrlState()
  const navigate = useCallback((tab: TabValue) => {
    setState({ tab }, { forceHistory: 'push' })
  }, [setState])
  return navigate
}