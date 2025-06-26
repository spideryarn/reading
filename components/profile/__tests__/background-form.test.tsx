import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { BackgroundForm } from '../background-form'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock fetch
global.fetch = jest.fn()

describe('BackgroundForm', () => {
  const mockPush = jest.fn()
  const mockRefresh = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      refresh: mockRefresh,
    })
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    })
  })

  it('renders the form with initial background', () => {
    render(<BackgroundForm initialBackground="Test background" />)
    
    expect(screen.getByDisplayValue('Test background')).toBeInTheDocument()
    expect(screen.getByText('Background Information')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save background/i })).toBeInTheDocument()
  })

  it('shows keyboard shortcut hint', () => {
    render(<BackgroundForm initialBackground="" />)
    
    expect(screen.getByText(/Press Cmd\+Enter \(Mac\) or Ctrl\+Enter \(Windows\/Linux\) to save/)).toBeInTheDocument()
  })

  it('saves background when Cmd+Enter is pressed', async () => {
    const user = userEvent.setup()
    render(<BackgroundForm initialBackground="" />)
    
    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'New background text')
    
    // Simulate Cmd+Enter (Mac)
    fireEvent.keyDown(textarea, {
      key: 'Enter',
      metaKey: true,
    })

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/profile/background', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          background: 'New background text',
        }),
      })
    })
  })

  it('saves background when Ctrl+Enter is pressed', async () => {
    const user = userEvent.setup()
    render(<BackgroundForm initialBackground="" />)
    
    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'New background text')
    
    // Simulate Ctrl+Enter (Windows/Linux)
    fireEvent.keyDown(textarea, {
      key: 'Enter',
      ctrlKey: true,
    })

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/profile/background', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          background: 'New background text',
        }),
      })
    })
  })

  it('prevents default behavior when keyboard shortcut is pressed', async () => {
    const user = userEvent.setup()
    render(<BackgroundForm initialBackground="" />)
    
    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'Test text')
    
    const keyDownEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      metaKey: true,
      bubbles: true,
      cancelable: true,
    })
    
    const preventDefaultSpy = jest.spyOn(keyDownEvent, 'preventDefault')
    fireEvent(textarea, keyDownEvent)
    
    expect(preventDefaultSpy).toHaveBeenCalled()
  })

  it('does not save when only Enter is pressed without modifier keys', async () => {
    const user = userEvent.setup()
    render(<BackgroundForm initialBackground="" />)
    
    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'Test text')
    
    fireEvent.keyDown(textarea, {
      key: 'Enter',
    })

    // Wait a bit to ensure no API call is made
    await new Promise(resolve => setTimeout(resolve, 100))
    
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('saves background when form is submitted normally', async () => {
    const user = userEvent.setup()
    render(<BackgroundForm initialBackground="" />)
    
    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'New background text')
    
    const saveButton = screen.getByRole('button', { name: /save background/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/profile/background', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          background: 'New background text',
        }),
      })
    })
  })

  it('shows success message after successful save', async () => {
    const user = userEvent.setup()
    render(<BackgroundForm initialBackground="" />)
    
    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'New background text')
    
    fireEvent.keyDown(textarea, {
      key: 'Enter',
      metaKey: true,
    })

    await waitFor(() => {
      expect(screen.getByText('Background updated successfully')).toBeInTheDocument()
    })
  })

  it('respects loading state and disables textarea', async () => {
    // Make fetch hang to test loading state
    ;(global.fetch as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    )
    
    const user = userEvent.setup()
    render(<BackgroundForm initialBackground="" />)
    
    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'Test text')
    
    fireEvent.keyDown(textarea, {
      key: 'Enter',
      metaKey: true,
    })

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText('Saving...')).toBeInTheDocument()
    })
    
    // Textarea should be disabled during loading
    expect(textarea).toBeDisabled()
  })
})