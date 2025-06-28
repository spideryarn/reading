// Tests for DocumentCommunicationContext with URL state enhancements

import React from 'react'
import { render, screen, act } from '@testing-library/react'
import { 
  DocumentCommunicationProvider, 
  useDocumentCommunication,
  useActiveTab,
  useDocumentSlug 
} from '../document-communication-context'

// Test component to access context
function TestConsumer() {
  const { state, actions } = useDocumentCommunication()
  
  return (
    <div>
      <div data-testid="active-tab">{state.activeTabId}</div>
      <div data-testid="highlighted-term">{state.highlightedTerm || 'none'}</div>
      <div data-testid="document-slug">{state.documentSlug || 'none'}</div>
      <div data-testid="url-state-enabled">{String(state.urlStateEnabled)}</div>
      
      <button onClick={() => actions.setActiveTab('glossary')}>
        Set Glossary Tab
      </button>
      <button onClick={() => actions.highlightTerm('test-term')}>
        Highlight Term
      </button>
      <button onClick={() => actions.setUrlStateEnabled(false)}>
        Disable URL State
      </button>
      <button onClick={() => actions.notifyUrlStateChange({ tab: 'search' })}>
        Notify URL Change
      </button>
    </div>
  )
}

// Test component for convenience hooks
function HookTestConsumer() {
  const activeTab = useActiveTab()
  const documentSlug = useDocumentSlug()
  
  return (
    <div>
      <div data-testid="hook-active-tab">{activeTab}</div>
      <div data-testid="hook-document-slug">{documentSlug || 'none'}</div>
    </div>
  )
}

describe('DocumentCommunicationContext', () => {
  const originalConsoleLog = console.log
  
  beforeEach(() => {
    // Mock console.log to avoid noise in tests
    console.log = jest.fn()
  })
  
  afterEach(() => {
    console.log = originalConsoleLog
  })
  
  it('should provide default state values', () => {
    render(
      <DocumentCommunicationProvider>
        <TestConsumer />
      </DocumentCommunicationProvider>
    )
    
    expect(screen.getByTestId('active-tab')).toHaveTextContent('structure')
    expect(screen.getByTestId('highlighted-term')).toHaveTextContent('none')
    expect(screen.getByTestId('document-slug')).toHaveTextContent('none')
    expect(screen.getByTestId('url-state-enabled')).toHaveTextContent('true')
  })
  
  it('should update active tab', () => {
    render(
      <DocumentCommunicationProvider>
        <TestConsumer />
      </DocumentCommunicationProvider>
    )
    
    act(() => {
      screen.getByText('Set Glossary Tab').click()
    })
    
    expect(screen.getByTestId('active-tab')).toHaveTextContent('glossary')
  })
  
  it('should highlight term', () => {
    render(
      <DocumentCommunicationProvider>
        <TestConsumer />
      </DocumentCommunicationProvider>
    )
    
    act(() => {
      screen.getByText('Highlight Term').click()
    })
    
    expect(screen.getByTestId('highlighted-term')).toHaveTextContent('test-term')
  })
  
  it('should toggle URL state', () => {
    render(
      <DocumentCommunicationProvider>
        <TestConsumer />
      </DocumentCommunicationProvider>
    )
    
    expect(screen.getByTestId('url-state-enabled')).toHaveTextContent('true')
    
    act(() => {
      screen.getByText('Disable URL State').click()
    })
    
    expect(screen.getByTestId('url-state-enabled')).toHaveTextContent('false')
  })
  
  it('should handle URL state change notifications', () => {
    const mockLog = console.log as jest.Mock
    
    render(
      <DocumentCommunicationProvider>
        <TestConsumer />
      </DocumentCommunicationProvider>
    )
    
    act(() => {
      screen.getByText('Notify URL Change').click()
    })
    
    // In development mode, it would log the change
    if (process.env.NODE_ENV === 'development') {
      expect(mockLog).toHaveBeenCalledWith('[DocumentComm] URL state changed:', { tab: 'search' })
    }
  })
  
  it('should provide convenience hooks', () => {
    render(
      <DocumentCommunicationProvider>
        <HookTestConsumer />
      </DocumentCommunicationProvider>
    )
    
    expect(screen.getByTestId('hook-active-tab')).toHaveTextContent('structure')
    expect(screen.getByTestId('hook-document-slug')).toHaveTextContent('none')
  })
  
  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error
    console.error = jest.fn()
    
    expect(() => {
      render(<TestConsumer />)
    }).toThrow('useDocumentCommunication must be used within DocumentCommunicationProvider')
    
    console.error = originalError
  })
  
  it('should handle scroll to element', () => {
    // Mock DOM methods
    const mockElement = {
      scrollIntoView: jest.fn(),
      setAttribute: jest.fn(),
      removeAttribute: jest.fn()
    }
    
    const originalGetElementById = document.getElementById
    document.getElementById = jest.fn(() => mockElement as any)
    
    // Component that triggers scroll on mount
    function ScrollTrigger() {
      const { actions } = useDocumentCommunication()
      React.useEffect(() => {
        actions.scrollToElement('test-element')
      }, [actions])
      return null
    }
    
    render(
      <DocumentCommunicationProvider>
        <ScrollTrigger />
      </DocumentCommunicationProvider>
    )
    
    expect(document.getElementById).toHaveBeenCalledWith('test-element')
    expect(mockElement.scrollIntoView).toHaveBeenCalledWith({ 
      behavior: 'smooth', 
      block: 'center' 
    })
    expect(mockElement.setAttribute).toHaveBeenCalledWith('data-highlight-target', 'true')
    
    // Restore original
    document.getElementById = originalGetElementById
  })
})