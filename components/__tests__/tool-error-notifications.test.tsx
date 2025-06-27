/**
 * Tests for ToolErrorNotifications component
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ToolErrorNotifications } from '../tool-error-notifications'
import {
  showToolError,
  showGenericError,
  dismissError,
  dismissAllErrors,
  clearAllErrors
} from '@/lib/tools/executor/error-ui'
import {
  ToolTimeoutError,
  ToolAuthenticationError,
  ToolValidationError,
  ToolServerError
} from '@/lib/tools/executor/types'

// Mock setTimeout and clearTimeout for testing
jest.useFakeTimers()

// Mock the dialog component to avoid portal rendering issues in tests
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => 
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="dialog-title">{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="dialog-description">{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="dialog-footer">{children}</div>
}))

describe('ToolErrorNotifications', () => {
  beforeEach(() => {
    clearAllErrors()
  })

  afterEach(() => {
    jest.clearAllTimers()
  })

  describe('toast notifications', () => {
    it('should display timeout error as toast', async () => {
      render(<ToolErrorNotifications />)
      
      const error = new ToolTimeoutError('glossary', 30000)
      showToolError(error)
      
      await waitFor(() => {
        expect(screen.getByText('Operation Timed Out')).toBeInTheDocument()
        expect(screen.getByText(/Glossary took longer than expected/)).toBeInTheDocument()
      })
      
      // Should be in toast container (top-right)
      const toastContainer = screen.getByText('Operation Timed Out').closest('.fixed')
      expect(toastContainer).toHaveClass('top-4', 'right-4')
    })

    it('should display server error as toast', async () => {
      render(<ToolErrorNotifications />)
      
      const error = new ToolServerError('Service unavailable', 503, { toolId: 'summarise' })
      showToolError(error)
      
      await waitFor(() => {
        expect(screen.getByText('Service Unavailable')).toBeInTheDocument()
        expect(screen.getByText(/Summarise is currently undergoing maintenance/)).toBeInTheDocument()
      })
    })

    it('should allow dismissing individual toast notifications', async () => {
      render(<ToolErrorNotifications />)
      
      const error = new ToolTimeoutError('test', 30000)
      showToolError(error)
      
      await waitFor(() => {
        expect(screen.getByText('Operation Timed Out')).toBeInTheDocument()
      })
      
      // Find and click dismiss button
      const dismissButton = screen.getByLabelText('Dismiss')
      fireEvent.click(dismissButton)
      
      // Should start fade-out animation
      await waitFor(() => {
        const notification = screen.getByText('Operation Timed Out').closest('.transform')
        expect(notification).toHaveClass('translate-x-full', 'opacity-0')
      })
    })

    it('should show "Dismiss All" button with multiple notifications', async () => {
      render(<ToolErrorNotifications />)
      
      const error1 = new ToolTimeoutError('test1', 30000)
      const error2 = new ToolTimeoutError('test2', 30000)
      
      showToolError(error1)
      showToolError(error2)
      
      await waitFor(() => {
        expect(screen.getByText('Dismiss All')).toBeInTheDocument()
      })
      
      // Click dismiss all
      fireEvent.click(screen.getByText('Dismiss All'))
      
      // Should trigger dismissAllErrors
      await waitFor(() => {
        expect(screen.queryByText('Operation Timed Out')).not.toBeInTheDocument()
      })
    })

    it('should not show "Dismiss All" with single notification', async () => {
      render(<ToolErrorNotifications />)
      
      const error = new ToolTimeoutError('test', 30000)
      showToolError(error)
      
      await waitFor(() => {
        expect(screen.getByText('Operation Timed Out')).toBeInTheDocument()
      })
      
      expect(screen.queryByText('Dismiss All')).not.toBeInTheDocument()
    })
  })

  describe('dialog notifications', () => {
    it('should display authentication error as dialog', async () => {
      render(<ToolErrorNotifications />)
      
      const error = new ToolAuthenticationError('Session expired')
      showToolError(error)
      
      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toBeInTheDocument()
        expect(screen.getByTestId('dialog-title')).toHaveTextContent('Sign-in Required')
        expect(screen.getByTestId('dialog-description')).toHaveTextContent('You need to be signed in')
      })
      
      // Should show action guidance
      expect(screen.getByText('What to do next:')).toBeInTheDocument()
      expect(screen.getByText(/sign in to your account/)).toBeInTheDocument()
    })

    it('should allow closing dialog', async () => {
      render(<ToolErrorNotifications />)
      
      const error = new ToolAuthenticationError()
      showToolError(error)
      
      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toBeInTheDocument()
      })
      
      // Find and click close button
      const closeButton = screen.getByText('Got it')
      fireEvent.click(closeButton)
      
      await waitFor(() => {
        expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
      })
    })
  })

  describe('inline notifications', () => {
    it('should display validation error as inline notification', async () => {
      render(<ToolErrorNotifications />)
      
      const error = new ToolValidationError(['Parameter "query" is required'], { toolId: 'search' })
      showToolError(error)
      
      await waitFor(() => {
        expect(screen.getByText('Invalid Input')).toBeInTheDocument()
        expect(screen.getByText('Parameter "query" is required')).toBeInTheDocument()
      })
      
      // Should be in inline container (top of page)
      const inlineContainer = screen.getByText('Invalid Input').closest('.fixed')
      expect(inlineContainer).toHaveClass('top-0', 'left-0', 'right-0')
    })

    it('should allow dismissing inline notifications', async () => {
      render(<ToolErrorNotifications />)
      
      const error = new ToolValidationError(['Invalid input'])
      showToolError(error)
      
      await waitFor(() => {
        expect(screen.getByText('Invalid Input')).toBeInTheDocument()
      })
      
      // Find and click dismiss button (X icon)
      const dismissButton = screen.getByLabelText('Dismiss')
      fireEvent.click(dismissButton)
      
      await waitFor(() => {
        const notification = screen.getByText('Invalid Input').closest('.transform')
        expect(notification).toHaveClass('-translate-y-full', 'opacity-0')
      })
    })
  })

  describe('error styling', () => {
    it('should apply correct styling for different error severities', async () => {
      render(<ToolErrorNotifications />)
      
      // Critical error (red)
      const authError = new ToolAuthenticationError()
      showToolError(authError)
      
      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toBeInTheDocument()
      })
      
      // Warning error (orange) - need to clear first error
      dismissAllErrors()
      
      const timeoutError = new ToolTimeoutError('test', 30000)
      showToolError(timeoutError)
      
      await waitFor(() => {
        expect(screen.getByText('Operation Timed Out')).toBeInTheDocument()
      })
      
      // Check that it has orange styling
      const toastElement = screen.getByText('Operation Timed Out').closest('.bg-orange-50')
      expect(toastElement).toBeInTheDocument()
    })
  })

  describe('generic error handling', () => {
    it('should handle generic Error instances', async () => {
      render(<ToolErrorNotifications />)
      
      const error = new Error('Something went wrong')
      showGenericError(error)
      
      await waitFor(() => {
        expect(screen.getByText('Unexpected Error')).toBeInTheDocument()
        expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      })
    })

    it('should handle string errors', async () => {
      render(<ToolErrorNotifications />)
      
      showGenericError('String error message')
      
      await waitFor(() => {
        expect(screen.getByText('Unexpected Error')).toBeInTheDocument()
        expect(screen.getByText('String error message')).toBeInTheDocument()
      })
    })
  })

  describe('auto-hide functionality', () => {
    it('should auto-hide toast notifications after timeout', async () => {
      render(<ToolErrorNotifications />)
      
      const error = new ToolTimeoutError('test', 30000)
      showToolError(error)
      
      await waitFor(() => {
        expect(screen.getByText('Operation Timed Out')).toBeInTheDocument()
      })
      
      // Fast-forward to auto-hide timeout (7000ms for timeout errors)
      jest.advanceTimersByTime(7000)
      
      await waitFor(() => {
        expect(screen.queryByText('Operation Timed Out')).not.toBeInTheDocument()
      })
    })

    it('should not auto-hide critical errors', async () => {
      render(<ToolErrorNotifications />)
      
      const error = new ToolAuthenticationError()
      showToolError(error)
      
      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toBeInTheDocument()
      })
      
      // Fast-forward well beyond typical auto-hide timeout
      jest.advanceTimersByTime(10000)
      
      // Should still be visible
      expect(screen.getByTestId('dialog')).toBeInTheDocument()
    })
  })

  describe('multiple error handling', () => {
    it('should handle multiple errors of different types', async () => {
      render(<ToolErrorNotifications />)
      
      const timeoutError = new ToolTimeoutError('test1', 30000)
      const validationError = new ToolValidationError(['Invalid input'])
      const authError = new ToolAuthenticationError()
      
      showToolError(timeoutError)
      showToolError(validationError)
      showToolError(authError)
      
      await waitFor(() => {
        // Toast notification
        expect(screen.getByText('Operation Timed Out')).toBeInTheDocument()
        // Inline notification
        expect(screen.getByText('Invalid Input')).toBeInTheDocument()
        // Dialog notification
        expect(screen.getByTestId('dialog')).toBeInTheDocument()
      })
    })
  })

  describe('accessibility', () => {
    it('should have proper ARIA labels', async () => {
      render(<ToolErrorNotifications />)
      
      const error = new ToolTimeoutError('test', 30000)
      showToolError(error)
      
      await waitFor(() => {
        expect(screen.getByLabelText('Dismiss')).toBeInTheDocument()
      })
    })

    it('should use proper alert role for notifications', async () => {
      render(<ToolErrorNotifications />)
      
      const error = new ToolValidationError(['Invalid input'])
      showToolError(error)
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
    })
  })
})