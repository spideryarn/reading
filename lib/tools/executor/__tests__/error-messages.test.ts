/**
 * Tests for error message transformation utilities
 */

import {
  transformErrorToMessage,
  getGenericErrorMessage,
  isTemporaryError,
  getRetryDelay
} from '../error-messages'
import {
  ToolTimeoutError,
  ToolAuthenticationError,
  ToolValidationError,
  ToolServerError,
  ToolNotFoundError,
  ToolCancelledError
} from '../types'

describe('transformErrorToMessage', () => {
  describe('timeout errors', () => {
    it('should transform timeout error correctly', () => {
      const error = new ToolTimeoutError('glossary', 30000)
      const message = transformErrorToMessage(error)
      
      expect(message.title).toBe('Operation Timed Out')
      expect(message.description).toContain('Glossary')
      expect(message.description).toContain('30s limit')
      expect(message.retryable).toBe(true)
      expect(message.severity).toBe('warning')
      expect(message.displayMethod).toBe('toast')
      expect(message.autoHideTimeout).toBe(7000)
    })

    it('should handle unknown tool IDs gracefully', () => {
      const error = new ToolTimeoutError('unknown-tool', 15000)
      const message = transformErrorToMessage(error)
      
      expect(message.description).toContain('Unknown Tool')
      expect(message.description).toContain('15s limit')
    })
  })

  describe('authentication errors', () => {
    it('should transform auth error correctly', () => {
      const error = new ToolAuthenticationError()
      const message = transformErrorToMessage(error)
      
      expect(message.title).toBe('Sign-in Required')
      expect(message.description).toBe('You need to be signed in to use this feature')
      expect(message.actionGuidance).toContain('sign in')
      expect(message.retryable).toBe(false)
      expect(message.severity).toBe('critical')
      expect(message.displayMethod).toBe('dialog')
      expect(message.autoHideTimeout).toBe(0)
    })

    it('should handle custom auth error messages', () => {
      const error = new ToolAuthenticationError('Session expired')
      const message = transformErrorToMessage(error)
      
      expect(message.title).toBe('Sign-in Required')
      expect(message.displayMethod).toBe('dialog')
    })
  })

  describe('validation errors', () => {
    it('should transform single validation error', () => {
      const error = new ToolValidationError(['Parameter "query" is required'])
      const message = transformErrorToMessage(error)
      
      expect(message.title).toBe('Invalid Input')
      expect(message.description).toBe('Parameter "query" is required')
      expect(message.retryable).toBe(false)
      expect(message.severity).toBe('warning')
      expect(message.displayMethod).toBe('inline')
    })

    it('should transform multiple validation errors', () => {
      const error = new ToolValidationError([
        'Parameter "query" is required',
        'Parameter "limit" must be a number'
      ])
      const message = transformErrorToMessage(error)
      
      expect(message.title).toBe('Invalid Input')
      expect(message.description).toBe('2 validation errors occurred')
    })
  })

  describe('server errors', () => {
    it('should transform generic server error', () => {
      const error = new ToolServerError('Internal server error', 500, { toolId: 'glossary' })
      const message = transformErrorToMessage(error)
      
      expect(message.title).toBe('Internal Error')
      expect(message.description).toContain('Glossary')
      expect(message.retryable).toBe(true)
      expect(message.severity).toBe('error')
      expect(message.displayMethod).toBe('toast')
    })

    it('should handle service unavailable errors', () => {
      const error = new ToolServerError('Service unavailable', 503, { toolId: 'summarise' })
      const message = transformErrorToMessage(error)
      
      expect(message.title).toBe('Service Unavailable')
      expect(message.description).toContain('maintenance')
      expect(message.actionGuidance).toContain('few minutes')
    })

    it('should handle network errors', () => {
      const error = new ToolServerError('Network error', 0, { toolId: 'chatbot' })
      const message = transformErrorToMessage(error)
      
      expect(message.title).toBe('Connection Error')
      expect(message.description).toBe('Unable to connect to the server')
      expect(message.severity).toBe('warning')
    })
  })

  describe('not found errors', () => {
    it('should transform not found error correctly', () => {
      const error = new ToolNotFoundError('missing-tool')
      const message = transformErrorToMessage(error)
      
      expect(message.title).toBe('Feature Unavailable')
      expect(message.description).toContain('Missing Tool')
      expect(message.retryable).toBe(false)
      expect(message.displayMethod).toBe('toast')
    })
  })

  describe('cancelled errors', () => {
    it('should transform cancelled error correctly', () => {
      const error = new ToolCancelledError('search')
      const message = transformErrorToMessage(error)
      
      expect(message.title).toBe('Operation Cancelled')
      expect(message.description).toContain('Search')
      expect(message.actionGuidance).toBeUndefined()
      expect(message.retryable).toBe(false)
      expect(message.severity).toBe('info')
      expect(message.autoHideTimeout).toBe(3000)
    })
  })

  describe('unknown error types', () => {
    it('should handle unknown error codes', () => {
      const error = new (class extends Error {
        code = 'UNKNOWN_ERROR'
        retryable = false
        toolId = 'test'
      })('Unknown error type')
      
      const message = transformErrorToMessage(error as any)
      
      expect(message.title).toBe('Unexpected Error')
      expect(message.description).toBe('Unknown error type')
      expect(message.severity).toBe('error')
    })
  })
})

describe('getGenericErrorMessage', () => {
  it('should handle Error instances', () => {
    const error = new Error('Something went wrong')
    const message = getGenericErrorMessage(error)
    
    expect(message.title).toBe('Unexpected Error')
    expect(message.description).toBe('Something went wrong')
    expect(message.retryable).toBe(false)
  })

  it('should handle string errors', () => {
    const message = getGenericErrorMessage('String error message')
    
    expect(message.title).toBe('Unexpected Error')
    expect(message.description).toBe('String error message')
  })

  it('should handle unknown error types', () => {
    const message = getGenericErrorMessage({ weird: 'object' })
    
    expect(message.title).toBe('Unexpected Error')
    expect(message.description).toBe('An unexpected error occurred')
  })
  
  it('should handle null/undefined errors', () => {
    const message1 = getGenericErrorMessage(null)
    const message2 = getGenericErrorMessage(undefined)
    
    expect(message1.description).toBe('An unexpected error occurred')
    expect(message2.description).toBe('An unexpected error occurred')
  })
})

describe('isTemporaryError', () => {
  it('should identify timeout errors as temporary', () => {
    const error = new ToolTimeoutError('test', 30000)
    expect(isTemporaryError(error)).toBe(true)
  })

  it('should identify server errors as temporary', () => {
    const error = new ToolServerError('Server error', 500)
    expect(isTemporaryError(error)).toBe(true)
  })

  it('should identify specific server status codes as temporary', () => {
    const error502 = new ToolServerError('Bad gateway', 502)
    const error503 = new ToolServerError('Service unavailable', 503)
    const error504 = new ToolServerError('Gateway timeout', 504)
    
    expect(isTemporaryError(error502)).toBe(true)
    expect(isTemporaryError(error503)).toBe(true)
    expect(isTemporaryError(error504)).toBe(true)
  })

  it('should not identify permanent errors as temporary', () => {
    const authError = new ToolAuthenticationError()
    const validationError = new ToolValidationError(['Invalid input'])
    const notFoundError = new ToolNotFoundError('missing')
    const cancelledError = new ToolCancelledError('test')
    
    expect(isTemporaryError(authError)).toBe(false)
    expect(isTemporaryError(validationError)).toBe(false)
    expect(isTemporaryError(notFoundError)).toBe(false)
    expect(isTemporaryError(cancelledError)).toBe(false)
  })
})

describe('getRetryDelay', () => {
  it('should return appropriate delay for timeout errors', () => {
    const error = new ToolTimeoutError('test', 30000)
    expect(getRetryDelay(error)).toBe(2000)
  })

  it('should return longer delay for service unavailable', () => {
    const error = new ToolServerError('Service unavailable', 503)
    expect(getRetryDelay(error)).toBe(5000)
  })

  it('should return standard delay for other server errors', () => {
    const error = new ToolServerError('Internal error', 500)
    expect(getRetryDelay(error)).toBe(3000)
  })

  it('should return default delay for unknown error types', () => {
    const error = new ToolValidationError(['Invalid'])
    expect(getRetryDelay(error)).toBe(1000)
  })
})

describe('tool display names', () => {
  it('should convert tool IDs to friendly names', () => {
    const errors = [
      new ToolTimeoutError('glossary', 30000),
      new ToolTimeoutError('summarise', 30000),
      new ToolTimeoutError('reading-difficulty', 30000),
      new ToolTimeoutError('unknown-tool-id', 30000)
    ]
    
    const messages = errors.map(transformErrorToMessage)
    
    expect(messages[0].description).toContain('Glossary')
    expect(messages[1].description).toContain('Summarise')
    expect(messages[2].description).toContain('Reading Difficulty')
    expect(messages[3].description).toContain('Unknown Tool Id')
  })
})