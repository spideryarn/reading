// URL state validation utility with clear error reporting
// Follows CODING_PRINCIPLES.md: "raise errors early, clearly & fatally"
// See docs/reference/ARCHITECTURE_URL_STATE.md for URL state architecture

import { ToolUrlState, TAB_VALUES, SEARCH_TYPES, SUMMARY_LEVELS, EXPERTISE_LEVELS, LENGTH_LEVELS } from './url-state-types'

export interface ValidationError {
  parameter: string
  value: unknown
  error: string
  fallback: unknown
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  sanitized: ToolUrlState
}

// UUID format validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Element ID format validation (alphanumeric, hyphens, underscores)
const ELEMENT_ID_REGEX = /^[a-zA-Z0-9-_]+$/

/**
 * Validates URL state parameters and returns sanitized values with error details
 * @param state - The URL state to validate
 * @returns ValidationResult with isValid flag, errors array, and sanitized state
 */
export function validateUrlState(state: ToolUrlState): ValidationResult {
  const errors: ValidationError[] = []
  const sanitized: ToolUrlState = {}

  // Validate tab parameter
  if (state.tab !== undefined) {
    if (typeof state.tab !== 'string' || !TAB_VALUES.includes(state.tab)) {
      errors.push({
        parameter: 'tab',
        value: state.tab,
        error: `Invalid tab "${state.tab}". Must be one of: ${TAB_VALUES.join(', ')}`,
        fallback: 'original'
      })
      sanitized.tab = 'original'
    } else {
      sanitized.tab = state.tab
    }
  }

  // Validate term parameter (glossary term)
  if (state.term != null) {
    if (typeof state.term !== 'string') {
      errors.push({
        parameter: 'term',
        value: state.term,
        error: 'Term must be a string',
        fallback: undefined
      })
    } else if (state.term.length === 0) {
      // Empty string is valid (clears the term)
      delete sanitized.term
    } else if (state.term.length > 200) {
      errors.push({
        parameter: 'term',
        value: state.term,
        error: 'Term is too long (maximum 200 characters)',
        fallback: state.term.slice(0, 200)
      })
      sanitized.term = state.term.slice(0, 200)
    } else {
      sanitized.term = state.term.trim()
    }
  }

  // Validate search query parameter
  if (state.q != null) {
    if (typeof state.q !== 'string') {
      errors.push({
        parameter: 'q',
        value: state.q,
        error: 'Search query must be a string',
        fallback: undefined
      })
    } else if (state.q.length === 0) {
      // Empty string is valid (clears the search)
      delete sanitized.q
    } else if (state.q.length > 500) {
      errors.push({
        parameter: 'q',
        value: state.q,
        error: 'Search query is too long (maximum 500 characters)',
        fallback: state.q.slice(0, 500)
      })
      sanitized.q = state.q.slice(0, 500)
    } else {
      sanitized.q = state.q.trim()
    }
  }

  // Validate search type parameter
  if (state.type != null) {
    if (typeof state.type !== 'string' || !SEARCH_TYPES.includes(state.type)) {
      errors.push({
        parameter: 'type',
        value: state.type,
        error: `Invalid search type "${state.type}". Must be one of: ${SEARCH_TYPES.join(', ')}`,
        fallback: 'text'
      })
      sanitized.type = 'text'
    } else {
      sanitized.type = state.type
    }
  }

  // Validate case sensitivity parameter
  if (state.case != null) {
    if (typeof state.case !== 'boolean') {
      errors.push({
        parameter: 'case',
        value: state.case,
        error: 'Case sensitivity must be a boolean',
        fallback: false
      })
      sanitized.case = false
    } else {
      sanitized.case = state.case
    }
  }

  // Validate summary level parameter (deprecated)
  if (state.level != null) {
    if (typeof state.level !== 'string' || !SUMMARY_LEVELS.includes(state.level)) {
      errors.push({
        parameter: 'level',
        value: state.level,
        error: `Invalid summary level "${state.level}". Must be one of: ${SUMMARY_LEVELS.join(', ')}`,
        fallback: 'moderate'
      })
      sanitized.level = 'moderate'
    } else {
      sanitized.level = state.level
    }
  }

  // Validate expertise level parameter
  if (state.expertise != null) {
    if (typeof state.expertise !== 'string' || !EXPERTISE_LEVELS.includes(state.expertise)) {
      errors.push({
        parameter: 'expertise',
        value: state.expertise,
        error: `Invalid expertise level "${state.expertise}". Must be one of: ${EXPERTISE_LEVELS.join(', ')}`,
        fallback: 'intermediate'
      })
      sanitized.expertise = 'intermediate'
    } else {
      sanitized.expertise = state.expertise
    }
  }

  // Validate length level parameter
  if (state.length != null) {
    if (typeof state.length !== 'string' || !LENGTH_LEVELS.includes(state.length)) {
      errors.push({
        parameter: 'length',
        value: state.length,
        error: `Invalid length level "${state.length}". Must be one of: ${LENGTH_LEVELS.join(', ')}`,
        fallback: 'single_short_paragraph'
      })
      sanitized.length = 'single_short_paragraph'
    } else {
      sanitized.length = state.length
    }
  }

  // Validate conversation ID parameter
  if (state.conversation != null) {
    if (typeof state.conversation !== 'string') {
      errors.push({
        parameter: 'conversation',
        value: state.conversation,
        error: 'Conversation ID must be a string',
        fallback: undefined
      })
    } else if (state.conversation.length === 0) {
      // Empty string is valid (clears the conversation)
      delete sanitized.conversation
    } else if (!UUID_REGEX.test(state.conversation)) {
      errors.push({
        parameter: 'conversation',
        value: state.conversation,
        error: 'Conversation ID must be a valid UUID format',
        fallback: undefined
      })
    } else {
      sanitized.conversation = state.conversation
    }
  }

  // Validate highlight criteria parameter
  if (state.highlight != null) {
    if (typeof state.highlight !== 'string') {
      errors.push({
        parameter: 'highlight',
        value: state.highlight,
        error: 'Highlight criteria must be a string',
        fallback: undefined
      })
    } else if (state.highlight.length === 0) {
      // Empty string is valid (clears highlights)
      delete sanitized.highlight
    } else if (state.highlight.length > 200) {
      errors.push({
        parameter: 'highlight',
        value: state.highlight,
        error: 'Highlight criteria is too long (maximum 200 characters)',
        fallback: state.highlight.slice(0, 200)
      })
      sanitized.highlight = state.highlight.slice(0, 200)
    } else {
      sanitized.highlight = state.highlight.trim()
    }
  }

  // Validate scroll position parameter
  if (state.scroll != null) {
    if (typeof state.scroll !== 'string') {
      errors.push({
        parameter: 'scroll',
        value: state.scroll,
        error: 'Scroll position must be a string',
        fallback: undefined
      })
    } else if (state.scroll.length === 0) {
      // Empty string is valid (clears scroll position)
      delete sanitized.scroll
    } else if (!ELEMENT_ID_REGEX.test(state.scroll)) {
      errors.push({
        parameter: 'scroll',
        value: state.scroll,
        error: 'Scroll position must be a valid element ID (alphanumeric, hyphens, underscores only)',
        fallback: undefined
      })
    } else {
      sanitized.scroll = state.scroll
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  }
}

/**
 * Validates URL length and warns if approaching limits
 * @param url - The URL to check
 * @param maxLength - Maximum allowed URL length (default: 2048)
 * @returns Object with warnings and truncation needed flag
 */
export function validateUrlLength(url: string, maxLength = 2048): {
  isValid: boolean
  warnings: string[]
  needsTruncation: boolean
} {
  const warnings: string[] = []
  
  if (url.length > maxLength) {
    warnings.push(`URL exceeds maximum length (${url.length}/${maxLength} characters)`)
    return {
      isValid: false,
      warnings,
      needsTruncation: true
    }
  }
  
  if (url.length > maxLength * 0.9) {
    warnings.push(`URL is approaching length limit (${url.length}/${maxLength} characters)`)
  }
  
  return {
    isValid: true,
    warnings,
    needsTruncation: false
  }
}

/**
 * Logs validation errors to console for debugging
 * @param errors - Array of validation errors
 * @param context - Context string for the log message
 */
export function logValidationErrors(errors: ValidationError[], context = 'URL validation'): void {
  if (errors.length === 0) return
  
  console.warn(`[${context}] Found ${errors.length} validation error(s):`)
  errors.forEach(error => {
    console.warn(`  - ${error.parameter}: ${error.error}`)
    console.warn(`    Invalid value:`, error.value)
    console.warn(`    Using fallback:`, error.fallback)
  })
}