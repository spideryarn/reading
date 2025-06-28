// URL state type definitions for document tools
// Provides type-safe URL parameter handling with nuqs library
// See docs/reference/ARCHITECTURE_URL_STATE.md for complete URL state architecture

// Tab values - matches the activeTabId values in unified-left-pane.tsx
export const TAB_VALUES = [
  'structure',
  'summary',
  'chat',
  'glossary',
  'search',
  'highlights',
  'tweet-thread',
  'metadata'
] as const

export type TabValue = typeof TAB_VALUES[number]

// Search types for semantic vs text search
export const SEARCH_TYPES = ['text', 'semantic'] as const
export type SearchType = typeof SEARCH_TYPES[number]

// Summary detail levels - deprecated in favor of multi-dimensional summary
export const SUMMARY_LEVELS = ['brief', 'moderate', 'detailed'] as const
export type SummaryLevel = typeof SUMMARY_LEVELS[number]

// Multi-dimensional summary parameters
export const EXPERTISE_LEVELS = ['beginner', 'intermediate', 'expert'] as const
export type ExpertiseLevel = typeof EXPERTISE_LEVELS[number]

export const LENGTH_LEVELS = ['sentence_or_two', 'single_short_paragraph', 'page'] as const
export type LengthLevel = typeof LENGTH_LEVELS[number]

// URL parameter type definitions
export interface ToolUrlState {
  // Tab selection
  tab?: TabValue
  
  // Glossary parameters
  term?: string // Highlighted glossary term
  
  // Search parameters
  q?: string // Search query
  type?: SearchType // Search type (text or semantic)
  case?: boolean // Case sensitive search
  
  // Summary parameters (deprecated single dimension)
  level?: SummaryLevel // Summary detail level
  
  // Multi-dimensional summary parameters
  expertise?: ExpertiseLevel // Expertise level (beginner, intermediate, expert)
  length?: LengthLevel // Summary length (sentence_or_two, single_short_paragraph, page)
  
  // Chat parameters
  conversation?: string // Conversation ID for chat state
  
  // Highlights parameters
  highlight?: string // Highlight criteria/filter
  
  // Scroll position (for preserving view state)
  scroll?: string // Element ID to scroll to
}

// Default values for optional parameters
export const URL_STATE_DEFAULTS: Partial<ToolUrlState> = {
  tab: 'structure',
  type: 'text',
  case: false,
  level: 'moderate'
}

// Parameter validation helpers
export function isValidTabValue(value: string): value is TabValue {
  return TAB_VALUES.includes(value as TabValue)
}

export function isValidSearchType(value: string): value is SearchType {
  return SEARCH_TYPES.includes(value as SearchType)
}

export function isValidSummaryLevel(value: string): value is SummaryLevel {
  return SUMMARY_LEVELS.includes(value as SummaryLevel)
}

// URL parameter names (for consistency)
export const URL_PARAM_NAMES = {
  TAB: 'tab',
  TERM: 'term',
  QUERY: 'q',
  SEARCH_TYPE: 'type',
  CASE_SENSITIVE: 'case',
  SUMMARY_LEVEL: 'level',
  CONVERSATION: 'conversation',
  HIGHLIGHT: 'highlight',
  SCROLL: 'scroll'
} as const

// History management decision matrix
export const PUSH_HISTORY_CHANGES = new Set([
  'tab', // Tab changes are navigation
  'term', // Opening a glossary term
  'q', // Search submissions (when marked as submitted)
  'conversation' // New chat conversations
])

// These changes should replace history instead of pushing
export const REPLACE_HISTORY_CHANGES = new Set([
  'type', // Search type preference
  'case', // Case sensitivity preference
  'level', // Summary detail preference
  'highlight', // Highlight filter preference
  'scroll' // Scroll position
])