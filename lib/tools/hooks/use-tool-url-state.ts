'use client'

// Hook for managing tool URL state with nuqs
// Provides bidirectional sync between URL and DocumentCommunicationContext

import { useCallback, useMemo, useEffect } from 'react'
import { useQueryStates, parseAsString, parseAsStringEnum, parseAsBoolean } from 'nuqs'
import { useDocumentCommunication } from '@/lib/context/document-communication-context'
import { 
  TAB_VALUES, 
  SEARCH_TYPES, 
  SUMMARY_LEVELS,
  TabValue,
  SearchType,
  SummaryLevel,
  ToolUrlState
} from '../url-state-types'
import { shouldPushHistory } from '../url-state'
import { debounce } from '@/lib/utils/debounce'
import { throttle } from '@/lib/utils/throttle'

// Parser definitions for nuqs
const tabParser = parseAsStringEnum<TabValue>(TAB_VALUES).withDefault('original')
const searchTypeParser = parseAsStringEnum<SearchType>(SEARCH_TYPES).withDefault('text')
const summaryLevelParser = parseAsStringEnum<SummaryLevel>(SUMMARY_LEVELS)
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
      setUrlState({ tab: contextState.activeTabId as TabValue }, {
        history: 'push' // Tab changes should push history
      })
    }
  }, [contextState.activeTabId]) // Remove urlState.tab from deps to prevent loops
  
  // Debounced search update (300ms)
  const debouncedSetSearch = useMemo(
    () => debounce((query: string) => {
      setUrlState({ q: query || null }, {
        history: 'replace' // Typing doesn't push history
      })
    }, 300),
    [setUrlState]
  )
  
  // Throttled scroll update (1000ms)
  const throttledSetScroll = useMemo(
    () => throttle((elementId: string) => {
      setUrlState({ scroll: elementId || null }, {
        history: 'replace' // Scroll position doesn't push history
      })
    }, 1000),
    [setUrlState]
  )
  
  // Main setState function with history management
  const setState = useCallback((updates: Partial<ToolUrlState>) => {
    // Determine history strategy
    const shouldPush = shouldPushHistory(updates)
    
    // Handle special case for search submission
    if ('q' in updates && (updates as any).submitted) {
      // Remove the submitted flag before setting state
      const { submitted, ...cleanUpdates } = updates as any
      setUrlState(cleanUpdates, {
        history: 'push' // Search submission pushes history
      })
      return
    }
    
    // Convert undefined values to null for nuqs (null removes the param)
    const nuqsUpdates = Object.entries(updates).reduce((acc, [key, value]) => {
      acc[key as keyof ToolUrlState] = value === undefined ? null : value
      return acc
    }, {} as Record<keyof ToolUrlState, any>)
    
    setUrlState(nuqsUpdates, {
      history: shouldPush ? 'push' : 'replace'
    })
  }, [setUrlState])
  
  // Clear all URL state
  const clearState = useCallback(() => {
    setUrlState({
      tab: 'original',
      term: null,
      q: null,
      type: 'text',
      case: false,
      level: null,
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
  
  const submitSearch = useCallback((query: string) => {
    setState({ q: query, submitted: true } as any)
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
    setSearch, // Debounced typing update
    submitSearch, // Push history on submit
    setSearchType,
    setCaseSensitive
  }
}

export function useSummaryUrlState() {
  const { state, setState } = useToolUrlState()
  
  const setLevel = useCallback((level: SummaryLevel) => {
    setState({ level })
  }, [setState])
  
  return {
    level: state.level || 'moderate',
    setLevel
  }
}