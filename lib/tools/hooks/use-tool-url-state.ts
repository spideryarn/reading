'use client'

// Hook for managing tool URL state with nuqs
// Provides bidirectional sync between URL and DocumentCommunicationContext
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
import { validateUrlState, logValidationErrors, type ValidationError } from '../url-validation'
import { showUrlValidationWarnings } from '@/components/global-url-warnings'
import { debounce } from '@/lib/utils/debounce'
import { throttle } from '@/lib/utils/throttle'

// Parser definitions for nuqs
const tabParser = parseAsStringEnum<TabValue>(TAB_VALUES).withDefault('original')
const searchTypeParser = parseAsStringEnum<SearchType>(SEARCH_TYPES).withDefault('text')
const summaryLevelParser = parseAsStringEnum<SummaryLevel>(SUMMARY_LEVELS)
const expertiseLevelParser = parseAsStringEnum<ExpertiseLevel>(EXPERTISE_LEVELS).withDefault('intermediate')
const lengthLevelParser = parseAsStringEnum<LengthLevel>(LENGTH_LEVELS).withDefault('single_short_paragraph')
const booleanParser = parseAsBoolean.withDefault(false)
const stringParser = parseAsString

// Hook return type
interface UseToolUrlStateReturn {
  state: ToolUrlState
  setState: (updates: Partial<ToolUrlState>) => void
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
  
  // Sync URL tab state to context when URL changes
  // This handles browser navigation (back/forward) and direct URL changes
  useEffect(() => {
    if (urlState.tab && urlState.tab !== contextState.activeTabId) {
      actions.setActiveTab(urlState.tab)
    }
  }, [urlState.tab]) // Remove contextState.activeTabId from deps to prevent loops
  
  // Sync context tab state to URL when context changes
  // This handles programmatic tab changes (clicking tabs)
  useEffect(() => {
    if (contextState.activeTabId && contextState.activeTabId !== urlState.tab) {
      setState({ tab: contextState.activeTabId as TabValue })
    }
  }, [contextState.activeTabId, setState]) // Remove urlState.tab from deps to prevent loops
  
  // Validate initial URL state on mount and URL changes
  useEffect(() => {
    const currentState: ToolUrlState = {
      tab: urlState.tab,
      term: urlState.term || undefined,
      q: urlState.q || undefined,
      type: urlState.type,
      case: urlState.case,
      level: urlState.level || undefined,
      expertise: urlState.expertise || undefined,
      length: urlState.length || undefined,
      conversation: urlState.conversation || undefined,
      highlight: urlState.highlight || undefined,
      scroll: urlState.scroll || undefined
    }
    
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
  
  // Main setState function with history management and validation
  const setState = useCallback((updates: Partial<ToolUrlState>, options?: { forceHistory?: 'push' | 'replace'; skipValidation?: boolean }) => {
    let finalUpdates = updates
    
    // Validate parameters unless explicitly skipped
    if (!options?.skipValidation) {
      const validation = validateUrlState(updates)
      
      if (!validation.isValid) {
        // Log validation errors for debugging
        logValidationErrors(validation.errors, 'URL state update')
        
        // Show user-facing warning
        showUrlValidationWarnings(validation.errors)
        
        // Use sanitized values instead of original updates
        finalUpdates = validation.sanitized
      }
    }
    
    // Use forced history option if provided, otherwise determine from updates
    const shouldPush = options?.forceHistory === 'push' ? true : 
                      options?.forceHistory === 'replace' ? false :
                      shouldPushHistory(finalUpdates)
    
    // Convert undefined values to null for nuqs (null removes the param)
    const nuqsUpdates = Object.entries(finalUpdates).reduce((acc, [key, value]) => {
      acc[key as keyof ToolUrlState] = value === undefined ? null : value
      return acc
    }, {} as Record<keyof ToolUrlState, any>)
    
    setUrlState(nuqsUpdates, {
      history: shouldPush ? 'push' : 'replace'
    })
  }, [setUrlState])
  
  // Debounced search update (300ms)
  const debouncedSetSearch = useMemo(
    () => debounce((query: string) => {
      setState({ q: query || undefined })
    }, 300),
    [setState]
  )
  
  // Throttled scroll update (1000ms)
  const throttledSetScroll = useMemo(
    () => throttle((elementId: string) => {
      setState({ scroll: elementId || undefined })
    }, 1000),
    [setState]
  )
  
  
  // Clear all URL state
  const clearState = useCallback(() => {
    setUrlState({
      tab: 'original',
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
  
  // Combine URL state into single object
  const state: ToolUrlState = useMemo(() => ({
    tab: urlState.tab,
    term: urlState.term || undefined,
    q: urlState.q || undefined,
    type: urlState.type,
    case: urlState.case,
    level: urlState.level || undefined,
    expertise: urlState.expertise,
    length: urlState.length,
    highlight: urlState.highlight || undefined,
    conversation: urlState.conversation || undefined,
    scroll: urlState.scroll || undefined
  }), [urlState])
  
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
    setState({ term: term || undefined })
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
    setState({ q: query || undefined }, { forceHistory: 'push' })
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
    setState({ conversation: conversationId || undefined })
  }, [setState])
  
  return {
    conversationId: state.conversation,
    setConversation
  }
}

export function useHighlightsUrlState() {
  const { state, setState } = useToolUrlState()
  
  const setHighlight = useCallback((criterion: string | null) => {
    setState({ highlight: criterion || undefined })
  }, [setState])
  
  return {
    highlightCriterion: state.highlight,
    setHighlight
  }
}