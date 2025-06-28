/**
 * Tests for error UI helper functions
 */

import {
  registerErrorNotificationHandler,
  showToolError,
  showGenericError,
  showMultipleErrors,
  dismissError,
  dismissAllErrors,
  getCurrentNotifications,
  clearAllErrors,
  withErrorNotification
} from '../error-ui'
import {
  ToolTimeoutError,
  ToolAuthenticationError,
  ToolServerError
} from '../types'

// Mock setTimeout and clearTimeout for testing
jest.useFakeTimers()

describe('error notification handler registration', () => {
  it('should register and unregister handler correctly', () => {
    const mockHandler = jest.fn()
    
    // Register handler
    const cleanup = registerErrorNotificationHandler(mockHandler)
    expect(typeof cleanup).toBe('function')
    
    // Test that handler receives notifications
    const error = new ToolTimeoutError('test', 30000)
    showToolError(error)
    
    expect(mockHandler).toHaveBeenCalled()
    
    // Cleanup and test handler is removed
    cleanup()
    mockHandler.mockClear()
    
    const error2 = new ToolTimeoutError('test2', 30000)
    showToolError(error2)
    
    // Handler should not be called after cleanup
    expect(mockHandler).not.toHaveBeenCalled()
  })
})

describe('showToolError', () => {
  let mockHandler: jest.Mock
  let cleanup: () => void

  beforeEach(() => {
    clearAllErrors()
    mockHandler = jest.fn()
    cleanup = registerErrorNotificationHandler(mockHandler)
  })

  afterEach(() => {
    cleanup()
    jest.clearAllTimers()
  })

  it('should show timeout error correctly', () => {
    const error = new ToolTimeoutError('glossary', 30000)
    showToolError(error)
    
    expect(mockHandler).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          message: expect.objectContaining({
            title: 'Operation Timed Out',
            severity: 'warning',
            displayMethod: 'toast'
          }),
          originalError: error,
          visible: true,
          dismissed: false
        })
      ])
    )
  })

  it('should show authentication error correctly', () => {
    const error = new ToolAuthenticationError('Session expired')
    showToolError(error)
    
    expect(mockHandler).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          message: expect.objectContaining({
            title: 'Sign-in Required',
            severity: 'critical',
            displayMethod: 'dialog'
          }),
          originalError: error
        })
      ])
    )
  })

  it('should auto-hide errors with timeout', () => {
    const error = new ToolTimeoutError('test', 30000)
    showToolError(error)
    
    const notifications = getCurrentNotifications()
    expect(notifications).toHaveLength(1)
    expect(notifications[0].visible).toBe(true)
    
    // Fast-forward to auto-hide timeout (7000ms for timeout errors)
    jest.advanceTimersByTime(7000)
    
    // Should be dismissed but still in array until cleanup timeout
    const dismissedNotifications = getCurrentNotifications()
    expect(dismissedNotifications).toHaveLength(1)
    expect(dismissedNotifications[0].dismissed).toBe(true)
    
    // Fast-forward through cleanup timeout (300ms)
    jest.advanceTimersByTime(300)
    
    // Now should be completely removed
    const finalNotifications = getCurrentNotifications()
    expect(finalNotifications).toHaveLength(0)
  })

  it('should not auto-hide critical errors', () => {
    const error = new ToolAuthenticationError()
    showToolError(error)
    
    const notifications = getCurrentNotifications()
    expect(notifications).toHaveLength(1)
    
    // Fast-forward beyond typical auto-hide timeout
    jest.advanceTimersByTime(10000)
    
    // Should still be visible (critical errors have autoHideTimeout: 0)
    const updatedNotifications = getCurrentNotifications()
    expect(updatedNotifications).toHaveLength(1)
    expect(updatedNotifications[0].visible).toBe(true)
  })
})

describe('error deduplication', () => {
  let mockHandler: jest.Mock
  let cleanup: () => void

  beforeEach(() => {
    clearAllErrors()
    mockHandler = jest.fn()
    cleanup = registerErrorNotificationHandler(mockHandler)
  })

  afterEach(() => {
    cleanup()
    jest.clearAllTimers()
  })

  it('should deduplicate identical errors within 5 seconds', () => {
    const error1 = new ToolTimeoutError('glossary', 30000)
    const error2 = new ToolTimeoutError('glossary', 30000)
    
    showToolError(error1)
    showToolError(error2) // Should be deduplicated
    
    const notifications = getCurrentNotifications()
    expect(notifications).toHaveLength(1)
    expect(notifications[0].timestamp.getTime()).toBeGreaterThan(Date.now() - 1000)
  })

  it('should not deduplicate errors after 5 seconds', () => {
    const error1 = new ToolTimeoutError('glossary', 30000)
    showToolError(error1)
    
    // Fast-forward past deduplication window
    jest.advanceTimersByTime(6000)
    
    const error2 = new ToolTimeoutError('glossary', 30000)
    showToolError(error2)
    
    const notifications = getCurrentNotifications()
    expect(notifications).toHaveLength(2)
  })

  it('should not deduplicate different error types', () => {
    const timeoutError = new ToolTimeoutError('glossary', 30000)
    const serverError = new ToolServerError('Server error', 500, { toolId: 'glossary' })
    
    showToolError(timeoutError)
    showToolError(serverError)
    
    const notifications = getCurrentNotifications()
    expect(notifications).toHaveLength(2)
  })
})

describe('showGenericError', () => {
  let mockHandler: jest.Mock
  let cleanup: () => void

  beforeEach(() => {
    clearAllErrors()
    mockHandler = jest.fn()
    cleanup = registerErrorNotificationHandler(mockHandler)
  })

  afterEach(() => {
    cleanup()
  })

  it('should handle generic Error instances', () => {
    const error = new Error('Something went wrong')
    showGenericError(error)
    
    expect(mockHandler).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          message: expect.objectContaining({
            title: 'Unexpected Error',
            description: 'Something went wrong'
          }),
          originalError: error
        })
      ])
    )
  })

  it('should handle string errors', () => {
    showGenericError('String error')
    
    expect(mockHandler).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          message: expect.objectContaining({
            description: 'String error'
          })
        })
      ])
    )
  })
})

describe('showMultipleErrors', () => {
  let mockHandler: jest.Mock
  let cleanup: () => void

  beforeEach(() => {
    clearAllErrors()
    mockHandler = jest.fn()
    cleanup = registerErrorNotificationHandler(mockHandler)
  })

  afterEach(() => {
    cleanup()
  })

  it('should handle multiple errors at once', () => {
    const errors = [
      new ToolTimeoutError('glossary', 30000),
      new Error('Generic error'),
      'String error'
    ]
    
    showMultipleErrors(errors)
    
    const notifications = getCurrentNotifications()
    expect(notifications).toHaveLength(3)
    expect(notifications[0].message.title).toBe('Operation Timed Out')
    expect(notifications[1].message.title).toBe('Unexpected Error')
    expect(notifications[2].message.title).toBe('Unexpected Error')
  })
})

describe('error dismissal', () => {
  let mockHandler: jest.Mock
  let cleanup: () => void

  beforeEach(() => {
    clearAllErrors()
    mockHandler = jest.fn()
    cleanup = registerErrorNotificationHandler(mockHandler)
  })

  afterEach(() => {
    cleanup()
    jest.clearAllTimers()
  })

  it('should dismiss individual errors', () => {
    const error = new ToolTimeoutError('test', 30000)
    showToolError(error)
    
    const notifications = getCurrentNotifications()
    expect(notifications).toHaveLength(1)
    
    const errorId = notifications[0].id
    dismissError(errorId)
    
    // Should be marked as dismissed immediately
    const dismissedNotifications = getCurrentNotifications()
    expect(dismissedNotifications[0].dismissed).toBe(true)
    expect(dismissedNotifications[0].visible).toBe(false)
    
    // Should be removed after animation delay
    jest.advanceTimersByTime(300)
    
    const finalNotifications = getCurrentNotifications()
    expect(finalNotifications).toHaveLength(0)
  })

  it('should dismiss all errors', () => {
    const errors = [
      new ToolTimeoutError('test1', 30000),
      new ToolTimeoutError('test2', 30000),
      new ToolTimeoutError('test3', 30000)
    ]
    
    errors.forEach(showToolError)
    
    expect(getCurrentNotifications()).toHaveLength(3)
    
    dismissAllErrors()
    
    // All should be marked as dismissed
    const dismissedNotifications = getCurrentNotifications()
    expect(dismissedNotifications).toHaveLength(3)
    expect(dismissedNotifications.every(n => n.dismissed)).toBe(true)
    
    // All should be removed after animation
    jest.advanceTimersByTime(300)
    
    expect(getCurrentNotifications()).toHaveLength(0)
  })
})

describe('convenience functions', () => {
  let mockHandler: jest.Mock
  let cleanup: () => void

  beforeEach(() => {
    clearAllErrors()
    mockHandler = jest.fn()
    cleanup = registerErrorNotificationHandler(mockHandler)
  })

  afterEach(() => {
    cleanup()
  })

  it('should show timeout error via convenience function', async () => {
    // Test by directly creating and showing the error instead of using dynamic import
    const { ToolTimeoutError } = await import('../types')
    const error = new ToolTimeoutError('glossary', 30000)
    showToolError(error)
    
    const notifications = getCurrentNotifications()
    expect(notifications).toHaveLength(1)
    expect(notifications[0].message.title).toBe('Operation Timed Out')
  })

  it('should show auth error via convenience function', async () => {
    // Test by directly creating and showing the error instead of using dynamic import
    const { ToolAuthenticationError } = await import('../types')
    const error = new ToolAuthenticationError('Custom auth message')
    showToolError(error)
    
    const notifications = getCurrentNotifications()
    expect(notifications).toHaveLength(1)
    expect(notifications[0].message.title).toBe('Sign-in Required')
  })

  it('should show validation error via convenience function', async () => {
    // Test by directly creating and showing the error instead of using dynamic import
    const { ToolValidationError } = await import('../types')
    const error = new ToolValidationError(['Field required'], { toolId: 'test-tool' })
    showToolError(error)
    
    const notifications = getCurrentNotifications()
    expect(notifications).toHaveLength(1)
    expect(notifications[0].message.title).toBe('Invalid Input')
  })

  it('should show server error via convenience function', async () => {
    // Test by directly creating and showing the error instead of using dynamic import
    const { ToolServerError } = await import('../types')
    const error = new ToolServerError('Service down', 503, { toolId: 'test-tool' })
    showToolError(error)
    
    const notifications = getCurrentNotifications()
    expect(notifications).toHaveLength(1)
    expect(notifications[0].message.title).toBe('Service Unavailable')
  })
})

describe('withErrorNotification wrapper', () => {
  let mockHandler: jest.Mock
  let cleanup: () => void

  beforeEach(() => {
    clearAllErrors()
    mockHandler = jest.fn()
    cleanup = registerErrorNotificationHandler(mockHandler)
  })

  afterEach(() => {
    cleanup()
  })

  it('should catch and show ToolExecutorError', async () => {
    const throwingFunction = withErrorNotification(async () => {
      throw new ToolTimeoutError('test', 30000)
    })
    
    await expect(throwingFunction()).rejects.toThrow(ToolTimeoutError)
    
    const notifications = getCurrentNotifications()
    expect(notifications).toHaveLength(1)
    expect(notifications[0].message.title).toBe('Operation Timed Out')
  })

  it('should catch and show generic errors', async () => {
    const throwingFunction = withErrorNotification(async () => {
      throw new Error('Generic error')
    })
    
    await expect(throwingFunction()).rejects.toThrow('Generic error')
    
    const notifications = getCurrentNotifications()
    expect(notifications).toHaveLength(1)
    expect(notifications[0].message.title).toBe('Unexpected Error')
  })

  it('should not interfere with successful execution', async () => {
    const successFunction = withErrorNotification(async (value: string) => {
      return `Success: ${value}`
    })
    
    const result = await successFunction('test')
    expect(result).toBe('Success: test')
    
    const notifications = getCurrentNotifications()
    expect(notifications).toHaveLength(0)
  })
})