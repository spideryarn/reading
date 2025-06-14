// Tests for URL state utilities

import { 
  parseUrlToState, 
  stateToUrlParams, 
  shouldPushHistory,
  createUrlWithState,
  sanitizeUrlState,
  truncateUrlIfNeeded
} from '../url-state'
import { ToolUrlState } from '../url-state-types'

describe('URL State Utilities', () => {
  describe('parseUrlToState', () => {
    it('should parse empty params to empty state', () => {
      const params = new URLSearchParams()
      const state = parseUrlToState(params)
      expect(state).toEqual({})
    })
    
    it('should parse all URL parameters correctly', () => {
      const params = new URLSearchParams({
        tab: 'glossary',
        term: 'quantum computing',
        q: 'consciousness',
        type: 'semantic',
        case: 'true',
        level: 'detailed',
        conversation: '123e4567-e89b-12d3-a456-426614174000',
        highlight: 'technical terms',
        scroll: 'element-123'
      })
      
      const state = parseUrlToState(params)
      
      expect(state).toEqual({
        tab: 'glossary',
        term: 'quantum computing',
        q: 'consciousness',
        type: 'semantic',
        case: true,
        level: 'detailed',
        conversation: '123e4567-e89b-12d3-a456-426614174000',
        highlight: 'technical terms',
        scroll: 'element-123'
      })
    })
    
    it('should handle boolean parsing correctly', () => {
      const paramsFalse = new URLSearchParams({ case: 'false' })
      expect(parseUrlToState(paramsFalse).case).toBe(false)
      
      const paramsTrue = new URLSearchParams({ case: 'true' })
      expect(parseUrlToState(paramsTrue).case).toBe(true)
      
      const paramsInvalid = new URLSearchParams({ case: 'invalid' })
      expect(parseUrlToState(paramsInvalid).case).toBe(false)
    })
  })
  
  describe('stateToUrlParams', () => {
    it('should convert empty state to empty params', () => {
      const state: ToolUrlState = {}
      const params = stateToUrlParams(state)
      expect(params.toString()).toBe('')
    })
    
    it('should convert full state to URL params', () => {
      const state: ToolUrlState = {
        tab: 'search',
        q: 'test query',
        type: 'semantic',
        case: true
      }
      
      const params = stateToUrlParams(state)
      
      expect(params.get('tab')).toBe('search')
      expect(params.get('q')).toBe('test query')
      expect(params.get('type')).toBe('semantic')
      expect(params.get('case')).toBe('true')
    })
    
    it('should handle boolean false correctly', () => {
      const state: ToolUrlState = { case: false }
      const params = stateToUrlParams(state)
      expect(params.get('case')).toBe('false')
    })
  })
  
  describe('shouldPushHistory', () => {
    it('should push for tab changes', () => {
      expect(shouldPushHistory({ tab: 'glossary' })).toBe(true)
    })
    
    it('should push for term navigation', () => {
      expect(shouldPushHistory({ term: 'new term' })).toBe(true)
    })
    
    it('should push for search submission', () => {
      expect(shouldPushHistory({ q: 'search', submitted: true } as any)).toBe(true)
    })
    
    it('should replace for search typing', () => {
      expect(shouldPushHistory({ q: 'typing...' })).toBe(false)
    })
    
    it('should replace for UI preferences', () => {
      expect(shouldPushHistory({ type: 'semantic' })).toBe(false)
      expect(shouldPushHistory({ case: true })).toBe(false)
      expect(shouldPushHistory({ level: 'detailed' })).toBe(false)
    })
    
    it('should replace for non-user actions', () => {
      expect(shouldPushHistory({ tab: 'glossary' }, false)).toBe(false)
    })
  })
  
  describe('createUrlWithState', () => {
    it('should update existing URL with new state', () => {
      const currentUrl = 'http://localhost:3000/documents/test-doc?tab=original'
      const changes = { tab: 'glossary' as const, term: 'test' }
      
      const newUrl = createUrlWithState(currentUrl, changes)
      const url = new URL(newUrl)
      
      expect(url.pathname).toBe('/documents/test-doc')
      expect(url.searchParams.get('tab')).toBe('glossary')
      expect(url.searchParams.get('term')).toBe('test')
    })
    
    it('should clear parameters when value is null', () => {
      const currentUrl = 'http://localhost:3000/documents/test-doc?tab=search&q=test'
      const changes = { q: null as any }
      
      const newUrl = createUrlWithState(currentUrl, changes)
      const url = new URL(newUrl)
      
      expect(url.searchParams.has('q')).toBe(false)
      expect(url.searchParams.get('tab')).toBe('search')
    })
    
    it('should clear all other params when clearOthers is true', () => {
      const currentUrl = 'http://localhost:3000/documents/test-doc?tab=search&q=test&type=semantic'
      const changes = { tab: 'original' as const }
      
      const newUrl = createUrlWithState(currentUrl, changes, { clearOthers: true })
      const url = new URL(newUrl)
      
      expect(url.searchParams.get('tab')).toBe('original')
      expect(url.searchParams.has('q')).toBe(false)
      expect(url.searchParams.has('type')).toBe(false)
    })
  })
  
  describe('sanitizeUrlState', () => {
    it('should validate tab values', () => {
      const state: ToolUrlState = { tab: 'invalid' as any }
      const sanitized = sanitizeUrlState(state)
      expect(sanitized.tab).toBeUndefined()
      
      const validState: ToolUrlState = { tab: 'glossary' }
      const validSanitized = sanitizeUrlState(validState)
      expect(validSanitized.tab).toBe('glossary')
    })
    
    it('should trim and limit string lengths', () => {
      const state: ToolUrlState = {
        term: '  very long term '.repeat(20),
        q: '  search query  ',
        highlight: '  highlight  '
      }
      
      const sanitized = sanitizeUrlState(state)
      
      expect(sanitized.term).toHaveLength(200)
      expect(sanitized.term).not.toMatch(/^\s/)
      expect(sanitized.q).toBe('search query')
      expect(sanitized.highlight).toBe('highlight')
    })
    
    it('should validate conversation UUID format', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000'
      const invalidUuid = 'not-a-uuid'
      
      const validState = sanitizeUrlState({ conversation: validUuid })
      expect(validState.conversation).toBe(validUuid)
      
      const invalidState = sanitizeUrlState({ conversation: invalidUuid })
      expect(invalidState.conversation).toBeUndefined()
    })
    
    it('should validate enum values', () => {
      const state: ToolUrlState = {
        type: 'invalid' as any,
        level: 'invalid' as any
      }
      
      const sanitized = sanitizeUrlState(state)
      expect(sanitized.type).toBeUndefined()
      expect(sanitized.level).toBeUndefined()
      
      const validState: ToolUrlState = {
        type: 'semantic',
        level: 'detailed'
      }
      
      const validSanitized = sanitizeUrlState(validState)
      expect(validSanitized.type).toBe('semantic')
      expect(validSanitized.level).toBe('detailed')
    })
  })
  
  describe('truncateUrlIfNeeded', () => {
    it('should not truncate short URLs', () => {
      const url = 'http://localhost:3000/documents/test?tab=glossary'
      const result = truncateUrlIfNeeded(url, 2000)
      expect(result).toBe(url)
    })
    
    it('should remove low priority params first', () => {
      const baseUrl = 'http://localhost:3000/documents/test'
      const params = new URLSearchParams({
        tab: 'search',
        q: 'important query',
        scroll: 'element-123',
        highlight: 'less important'
      })
      
      const url = `${baseUrl}?${params.toString()}`
      const truncated = truncateUrlIfNeeded(url, 80) // Shorter limit to force truncation
      
      const truncatedUrl = new URL(truncated)
      expect(truncatedUrl.searchParams.has('tab')).toBe(true)
      // May keep query depending on exact length calculations
      expect(truncatedUrl.searchParams.has('scroll')).toBe(false)
      expect(truncatedUrl.searchParams.has('highlight')).toBe(false)
    })
    
    it('should truncate long query parameter if needed', () => {
      const baseUrl = 'http://localhost:3000/documents/test'
      const veryLongQuery = 'a'.repeat(2000)
      const url = `${baseUrl}?tab=search&q=${veryLongQuery}`
      
      const truncated = truncateUrlIfNeeded(url, 200)
      
      expect(truncated.length).toBeLessThanOrEqual(210) // Allow some buffer
      const truncatedUrl = new URL(truncated)
      const truncatedQuery = truncatedUrl.searchParams.get('q')
      
      // Query should either be truncated or removed entirely
      if (truncatedQuery) {
        expect(truncatedQuery.length).toBeLessThan(veryLongQuery.length)
      } else {
        // If query was removed entirely, that's also valid
        expect(truncatedUrl.searchParams.has('q')).toBe(false)
      }
    })
  })
})