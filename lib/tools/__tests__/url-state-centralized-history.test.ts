// Tests for centralized history management in URL state
// Ensures consistent history behavior across all URL state changes

import { shouldPushHistory } from '../url-state'
import type { ToolUrlState } from '../url-state-types'

describe('Centralized History Management', () => {
  describe('shouldPushHistory', () => {
    it('should push for tab changes', () => {
      const changes: Partial<ToolUrlState> = { tab: 'search' }
      expect(shouldPushHistory(changes)).toBe(true)
    })

    it('should push for glossary term navigation', () => {
      const changes: Partial<ToolUrlState> = { term: 'example term' }
      expect(shouldPushHistory(changes)).toBe(true)
    })

    it('should push for new chat conversations', () => {
      const changes: Partial<ToolUrlState> = { conversation: '123e4567-e89b-12d3-a456-426614174000' }
      expect(shouldPushHistory(changes)).toBe(true)
    })

    it('should replace for search type preferences', () => {
      const changes: Partial<ToolUrlState> = { type: 'semantic' }
      expect(shouldPushHistory(changes)).toBe(false)
    })

    it('should replace for case sensitivity preferences', () => {
      const changes: Partial<ToolUrlState> = { case: true }
      expect(shouldPushHistory(changes)).toBe(false)
    })

    it('should replace for summary level preferences', () => {
      const changes: Partial<ToolUrlState> = { level: 'detailed' }
      expect(shouldPushHistory(changes)).toBe(false)
    })

    it('should replace for highlight criteria updates', () => {
      const changes: Partial<ToolUrlState> = { highlight: 'technical terms' }
      expect(shouldPushHistory(changes)).toBe(false)
    })

    it('should replace for scroll position updates', () => {
      const changes: Partial<ToolUrlState> = { scroll: 'element-123' }
      expect(shouldPushHistory(changes)).toBe(false)
    })

    it('should replace for multi-dimensional summary parameters', () => {
      const expertiseChanges: Partial<ToolUrlState> = { expertise: 'expert' }
      const lengthChanges: Partial<ToolUrlState> = { length: 'page' }
      
      expect(shouldPushHistory(expertiseChanges)).toBe(false)
      expect(shouldPushHistory(lengthChanges)).toBe(false)
    })

    it('should handle multiple changes with mixed priority', () => {
      // When both push and replace parameters are present, should push
      const mixedChanges: Partial<ToolUrlState> = {
        tab: 'glossary', // Push
        case: true       // Replace
      }
      expect(shouldPushHistory(mixedChanges)).toBe(true)
    })

    it('should handle search query without submitted flag (typing)', () => {
      const typingChanges: Partial<ToolUrlState> = { q: 'search query' }
      expect(shouldPushHistory(typingChanges)).toBe(false)
    })

    it('should handle search query with submitted flag (Enter key)', () => {
      const submissionChanges = { q: 'search query', submitted: true } as any
      expect(shouldPushHistory(submissionChanges)).toBe(true)
    })

    it('should replace for non-user actions', () => {
      const changes: Partial<ToolUrlState> = { tab: 'search' }
      expect(shouldPushHistory(changes, false)).toBe(false)
    })

    it('should handle empty changes', () => {
      const changes: Partial<ToolUrlState> = {}
      expect(shouldPushHistory(changes)).toBe(false)
    })

    it('should handle unknown parameters gracefully', () => {
      const changes = { unknownParam: 'value' } as any
      expect(shouldPushHistory(changes)).toBe(false)
    })
  })

  describe('History decision consistency', () => {
    it('should have consistent behavior for all navigation actions', () => {
      const navigationActions = [
        { tab: 'search' },
        { tab: 'glossary' },
        { tab: 'summary' },
        { term: 'example' },
        { conversation: '123e4567-e89b-12d3-a456-426614174000' }
      ]

      navigationActions.forEach(action => {
        expect(shouldPushHistory(action)).toBe(true)
      })
    })

    it('should have consistent behavior for all preference actions', () => {
      const preferenceActions = [
        { type: 'semantic' },
        { case: true },
        { level: 'detailed' },
        { expertise: 'expert' },
        { length: 'page' },
        { highlight: 'criteria' },
        { scroll: 'element-123' }
      ]

      preferenceActions.forEach(action => {
        expect(shouldPushHistory(action)).toBe(false)
      })
    })

    it('should prioritize navigation over preferences in mixed updates', () => {
      const mixedUpdates = [
        { tab: 'search', type: 'semantic' },
        { term: 'example', case: true },
        { conversation: '123e4567-e89b-12d3-a456-426614174000', level: 'detailed' }
      ]

      mixedUpdates.forEach(update => {
        expect(shouldPushHistory(update)).toBe(true)
      })
    })
  })

  describe('Search submission patterns', () => {
    it('should distinguish between typing and submission', () => {
      const typingUpdate = { q: 'search text' }
      const submissionUpdate = { q: 'search text', submitted: true } as any

      expect(shouldPushHistory(typingUpdate)).toBe(false)
      expect(shouldPushHistory(submissionUpdate)).toBe(true)
    })

    it('should handle empty search queries correctly', () => {
      const clearSearch = { q: '' }
      const clearSubmission = { q: '', submitted: true } as any

      expect(shouldPushHistory(clearSearch)).toBe(false)
      expect(shouldPushHistory(clearSubmission)).toBe(true)
    })

    it('should handle search with other parameters', () => {
      const searchWithType = { q: 'query', type: 'semantic' }
      const searchSubmissionWithType = { q: 'query', type: 'semantic', submitted: true } as any

      expect(shouldPushHistory(searchWithType)).toBe(false)
      expect(shouldPushHistory(searchSubmissionWithType)).toBe(true)
    })
  })

  describe('Edge cases', () => {
    it('should handle null and undefined values', () => {
      const changes: Partial<ToolUrlState> = {
        term: undefined,
        q: null as any,
        tab: 'search'
      }
      expect(shouldPushHistory(changes)).toBe(true)
    })

    it('should handle boolean false values', () => {
      const changes: Partial<ToolUrlState> = {
        case: false
      }
      expect(shouldPushHistory(changes)).toBe(false)
    })

    it('should handle numeric values in string fields', () => {
      const changes = {
        q: 123 as any,
        tab: 'search'
      }
      expect(shouldPushHistory(changes)).toBe(true)
    })

    it('should handle array values', () => {
      const changes = {
        type: ['text', 'semantic'] as any
      }
      expect(shouldPushHistory(changes)).toBe(false)
    })

    it('should handle object values', () => {
      const changes = {
        highlight: { criteria: 'complex' } as any,
        tab: 'search'
      }
      expect(shouldPushHistory(changes)).toBe(true)
    })
  })

  describe('User action context', () => {
    it('should respect isUserAction parameter', () => {
      const userNavigationChange = { tab: 'search' }
      const programmaticNavigationChange = { tab: 'search' }

      expect(shouldPushHistory(userNavigationChange, true)).toBe(true)
      expect(shouldPushHistory(programmaticNavigationChange, false)).toBe(false)
    })

    it('should default to user action when not specified', () => {
      const changes = { tab: 'search' }
      expect(shouldPushHistory(changes)).toBe(true)
      expect(shouldPushHistory(changes, true)).toBe(true)
    })

    it('should handle preference changes with user action context', () => {
      const preferenceChange = { type: 'semantic' }

      expect(shouldPushHistory(preferenceChange, true)).toBe(false)
      expect(shouldPushHistory(preferenceChange, false)).toBe(false)
    })
  })

  describe('Complex scenarios', () => {
    it('should handle rapid sequential changes correctly', () => {
      const changes = [
        { q: 'a' },
        { q: 'ab' },
        { q: 'abc' },
        { q: 'abc', submitted: true }
      ]

      const results = changes.map(change => shouldPushHistory(change as any))
      expect(results).toEqual([false, false, false, true])
    })

    it('should handle tab switching with state preservation', () => {
      const tabWithState = {
        tab: 'search',
        q: 'preserved query',
        type: 'semantic'
      }

      expect(shouldPushHistory(tabWithState)).toBe(true)
    })

    it('should handle clearing all state', () => {
      const clearAll: Partial<ToolUrlState> = {
        tab: undefined,
        term: undefined,
        q: undefined,
        type: undefined,
        case: undefined,
        level: undefined,
        conversation: undefined,
        highlight: undefined,
        scroll: undefined
      }

      expect(shouldPushHistory(clearAll)).toBe(false)
    })

    it('should handle restoration from URL', () => {
      const urlRestoration = {
        tab: 'glossary',
        term: 'example term',
        q: 'search query',
        type: 'semantic',
        case: true
      }

      // URL restoration should typically be programmatic
      expect(shouldPushHistory(urlRestoration, false)).toBe(false)
      // But if treated as user action, should push due to navigation params
      expect(shouldPushHistory(urlRestoration, true)).toBe(true)
    })
  })
})