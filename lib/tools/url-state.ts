// URL state management utilities for document tools
// Handles URL to state parsing, state to URL generation, and history management

import { ToolUrlState, URL_PARAM_NAMES, PUSH_HISTORY_CHANGES, REPLACE_HISTORY_CHANGES } from './url-state-types'

// Parse URL search params into tool state
export function parseUrlToState(searchParams: URLSearchParams): ToolUrlState {
  const state: ToolUrlState = {}
  
  // Parse each parameter if present
  const tab = searchParams.get(URL_PARAM_NAMES.TAB)
  if (tab) state.tab = tab as ToolUrlState['tab']
  
  const term = searchParams.get(URL_PARAM_NAMES.TERM)
  if (term) state.term = term
  
  const query = searchParams.get(URL_PARAM_NAMES.QUERY)
  if (query) state.q = query
  
  const searchType = searchParams.get(URL_PARAM_NAMES.SEARCH_TYPE)
  if (searchType) state.type = searchType as ToolUrlState['type']
  
  const caseSensitive = searchParams.get(URL_PARAM_NAMES.CASE_SENSITIVE)
  if (caseSensitive) state.case = caseSensitive === 'true'
  
  const summaryLevel = searchParams.get(URL_PARAM_NAMES.SUMMARY_LEVEL)
  if (summaryLevel) state.level = summaryLevel as ToolUrlState['level']
  
  const conversation = searchParams.get(URL_PARAM_NAMES.CONVERSATION)
  if (conversation) state.conversation = conversation
  
  const highlight = searchParams.get(URL_PARAM_NAMES.HIGHLIGHT)
  if (highlight) state.highlight = highlight
  
  const scroll = searchParams.get(URL_PARAM_NAMES.SCROLL)
  if (scroll) state.scroll = scroll
  
  return state
}

// Generate URL search params from tool state
export function stateToUrlParams(state: ToolUrlState): URLSearchParams {
  const params = new URLSearchParams()
  
  // Add each parameter if it has a value
  if (state.tab) params.set(URL_PARAM_NAMES.TAB, state.tab)
  if (state.term) params.set(URL_PARAM_NAMES.TERM, state.term)
  if (state.q) params.set(URL_PARAM_NAMES.QUERY, state.q)
  if (state.type) params.set(URL_PARAM_NAMES.SEARCH_TYPE, state.type)
  if (state.case !== undefined) params.set(URL_PARAM_NAMES.CASE_SENSITIVE, String(state.case))
  if (state.level) params.set(URL_PARAM_NAMES.SUMMARY_LEVEL, state.level)
  if (state.conversation) params.set(URL_PARAM_NAMES.CONVERSATION, state.conversation)
  if (state.highlight) params.set(URL_PARAM_NAMES.HIGHLIGHT, state.highlight)
  if (state.scroll) params.set(URL_PARAM_NAMES.SCROLL, state.scroll)
  
  return params
}

// Determine whether to push or replace history based on changes
export function shouldPushHistory(changes: Partial<ToolUrlState>, isUserAction = true): boolean {
  // If not a user action (e.g., programmatic update), always replace
  if (!isUserAction) return false
  
  // Check if any of the changes should trigger a push
  const changeKeys = Object.keys(changes)
  
  // Special case: search query with submitted flag
  if ('q' in changes && (changes as any).submitted) {
    return true
  }
  
  // Check if any change is in the push set, excluding 'q' which needs special handling
  // Also exclude undefined values which represent clearing parameters
  const hasNavigationChange = changeKeys.some(key => 
    PUSH_HISTORY_CHANGES.has(key) && 
    key !== 'q' && 
    changes[key as keyof ToolUrlState] !== undefined
  )
  
  // If there are navigation parameters (non-search), they take precedence
  if (hasNavigationChange) {
    return true
  }
  
  // Regular search query changes (typing) should not push when no navigation changes
  if ('q' in changes && !(changes as any).submitted) {
    return false
  }
  
  // No push-worthy changes found
  return false
}

// Create a new URL with updated parameters
export function createUrlWithState(
  currentUrl: string,
  changes: Partial<ToolUrlState>,
  options?: { clearOthers?: boolean }
): string {
  const url = new URL(currentUrl)
  const currentParams = new URLSearchParams(url.search)
  
  // Parse current state
  const currentState = parseUrlToState(currentParams)
  
  // Merge with changes
  const newState = options?.clearOthers 
    ? changes 
    : { ...currentState, ...changes }
  
  // Remove null/undefined values (used to clear parameters)
  Object.keys(newState).forEach(key => {
    if (newState[key as keyof ToolUrlState] === null || 
        newState[key as keyof ToolUrlState] === undefined) {
      delete newState[key as keyof ToolUrlState]
    }
  })
  
  // Generate new params
  const newParams = stateToUrlParams(newState)
  
  // Update URL
  url.search = newParams.toString()
  
  return url.toString()
}

// Legacy URL migration adapter
export function migrateLegacyUrl(url: string): string {
  // Handle any legacy URL formats here
  // For now, just return the URL as-is since this is a new feature
  
  // Example of what this might do in the future:
  // - Convert old hash-based parameters to search params
  // - Rename old parameter names to new ones
  // - Convert encoded values to human-readable ones
  
  return url
}

// Validate and sanitize URL state
export function sanitizeUrlState(state: ToolUrlState): ToolUrlState {
  const sanitized: ToolUrlState = {}
  
  // Validate and copy each field
  if (state.tab) {
    // Validate against known tab values
    const validTabs = ['original', 'ai-generated', 'summary', 'chat', 'glossary', 'search', 'highlights', 'metadata']
    if (validTabs.includes(state.tab)) {
      sanitized.tab = state.tab
    }
  }
  
  // String fields - trim and limit length
  if (state.term) {
    sanitized.term = state.term.trim().slice(0, 200)
  }
  
  if (state.q) {
    sanitized.q = state.q.trim().slice(0, 500)
  }
  
  if (state.highlight) {
    sanitized.highlight = state.highlight.trim().slice(0, 200)
  }
  
  if (state.conversation) {
    // Validate conversation ID format (assuming UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (uuidRegex.test(state.conversation)) {
      sanitized.conversation = state.conversation
    }
  }
  
  // Enum fields
  if (state.type && ['text', 'semantic'].includes(state.type)) {
    sanitized.type = state.type
  }
  
  if (state.level && ['brief', 'moderate', 'detailed'].includes(state.level)) {
    sanitized.level = state.level
  }
  
  // Boolean fields
  if (typeof state.case === 'boolean') {
    sanitized.case = state.case
  }
  
  // Scroll position - validate element ID format
  if (state.scroll && /^[a-zA-Z0-9-_]+$/.test(state.scroll)) {
    sanitized.scroll = state.scroll
  }
  
  return sanitized
}

// Handle URL length limits by truncating less important parameters
export function truncateUrlIfNeeded(url: string, maxLength = 2000): string {
  if (url.length <= maxLength) return url
  
  const urlObj = new URL(url)
  const params = new URLSearchParams(urlObj.search)
  
  // Priority order for keeping parameters (most to least important)
  const paramPriority = [
    URL_PARAM_NAMES.TAB,
    URL_PARAM_NAMES.QUERY,
    URL_PARAM_NAMES.TERM,
    URL_PARAM_NAMES.CONVERSATION,
    URL_PARAM_NAMES.SEARCH_TYPE,
    URL_PARAM_NAMES.SUMMARY_LEVEL,
    URL_PARAM_NAMES.CASE_SENSITIVE,
    URL_PARAM_NAMES.HIGHLIGHT,
    URL_PARAM_NAMES.SCROLL
  ]
  
  // Remove parameters in reverse priority order until URL is short enough
  for (let i = paramPriority.length - 1; i >= 0; i--) {
    if (url.length <= maxLength) break
    
    const paramToRemove = paramPriority[i]
    if (params.has(paramToRemove)) {
      params.delete(paramToRemove)
      urlObj.search = params.toString()
      url = urlObj.toString()
    }
  }
  
  // If still too long, truncate the query parameter
  if (url.length > maxLength && params.has(URL_PARAM_NAMES.QUERY)) {
    const query = params.get(URL_PARAM_NAMES.QUERY)
    if (query) {
      const maxQueryLength = query.length - (url.length - maxLength) - 10 // Extra buffer
      if (maxQueryLength > 0) {
        params.set(URL_PARAM_NAMES.QUERY, query.slice(0, maxQueryLength))
      } else {
        // If even truncating won't help, remove the query
        params.delete(URL_PARAM_NAMES.QUERY)
      }
      urlObj.search = params.toString()
      url = urlObj.toString()
    }
  }
  
  return url
}