// Tests for useToolUrlState hook with development guard verification

import React from 'react'
import { render } from '@testing-library/react'
import { DocumentCommunicationProvider, useDocumentCommunication } from '@/lib/context/document-communication-context'

// Mock nuqs
jest.mock('nuqs', () => ({
  useQueryStates: jest.fn(() => [
    {
      tab: 'original',
      term: null,
      q: null,
      type: 'text',
      case: false,
      level: null,
      expertise: 'intermediate',
      length: 'single_short_paragraph',
      highlight: null,
      conversation: null,
      scroll: null
    },
    jest.fn()
  ]),
  parseAsString: { withDefault: jest.fn(() => ({})) },
  parseAsStringEnum: jest.fn(() => ({ withDefault: jest.fn(() => ({})) })),
  parseAsBoolean: { withDefault: jest.fn(() => ({})) }
}))

// Mock validation utilities
jest.mock('../../url-validation', () => ({
  validateUrlState: jest.fn(() => ({ isValid: true, errors: [], sanitized: {} })),
  logValidationErrors: jest.fn()
}))

// Mock global warnings
jest.mock('@/components/global-url-warnings', () => ({
  showUrlValidationWarnings: jest.fn()
}))

// Mock debounce/throttle
jest.mock('@/lib/utils/debounce', () => ({
  debounce: (fn: any) => fn
}))

jest.mock('@/lib/utils/throttle', () => ({
  throttle: (fn: any) => fn
}))

describe('useToolUrlState - development guard', () => {
  const originalEnv = process.env.NODE_ENV
  
  beforeEach(() => {
    jest.clearAllMocks()
  })
  
  afterEach(() => {
    process.env.NODE_ENV = originalEnv
  })

  it('should throw error when setActiveTab is called directly while URL state is enabled in development', () => {
    // Set to development mode
    process.env.NODE_ENV = 'development'
    
    // Create a test component that calls setActiveTab directly
    function TestComponent() {
      const { actions } = useDocumentCommunication()
      
      // Try to call setActiveTab directly (without internal flag)
      React.useEffect(() => {
        actions.setActiveTab('glossary')
      }, [actions])
      
      return null
    }
    
    // Wrap in provider which has urlStateEnabled=true by default
    const TestWrapper = () => (
      <DocumentCommunicationProvider>
        <TestComponent />
      </DocumentCommunicationProvider>
    )
    
    // Expect the error to be thrown
    expect(() => {
      render(<TestWrapper />)
    }).toThrow('[DocumentComm] setActiveTab called directly while URL-state is enabled. Use navigateToTab() instead.')
  })
  
  it('should throw error when calling setActiveTab("x") with urlStateEnabled===true', () => {
    // This is the specific test case requested in the planning doc
    // Set to development mode
    process.env.NODE_ENV = 'development'
    
    // Create a test component that calls setActiveTab('x') when urlStateEnabled is true
    function TestComponent() {
      const { state, actions } = useDocumentCommunication()
      
      React.useEffect(() => {
        // Verify urlStateEnabled is true (default state)
        expect(state.urlStateEnabled).toBe(true)
        
        // Call setActiveTab('x') - should throw
        actions.setActiveTab('x')
      }, [state, actions])
      
      return null
    }
    
    // Wrap in provider
    const TestWrapper = () => (
      <DocumentCommunicationProvider>
        <TestComponent />
      </DocumentCommunicationProvider>
    )
    
    // Expect the error to be thrown with the specific message
    expect(() => {
      render(<TestWrapper />)
    }).toThrow('[DocumentComm] setActiveTab called directly while URL-state is enabled. Use navigateToTab() instead.')
  })
  
  it('should not throw error when setActiveTab is called with internal flag', () => {
    // Set to development mode
    process.env.NODE_ENV = 'development'
    
    // Create a test component that calls setActiveTab with internal flag
    function TestComponent() {
      const { actions } = useDocumentCommunication()
      
      React.useEffect(() => {
        // This should not throw because internal=true
        actions.setActiveTab('glossary', true)
      }, [actions])
      
      return <div>Success</div>
    }
    
    // Wrap in provider
    const TestWrapper = () => (
      <DocumentCommunicationProvider>
        <TestComponent />
      </DocumentCommunicationProvider>
    )
    
    // Should render without throwing
    const { getByText } = render(<TestWrapper />)
    expect(getByText('Success')).toBeInTheDocument()
  })
  
  it('should not throw error in production mode', () => {
    // Set to production mode
    process.env.NODE_ENV = 'production'
    
    // Create a test component that calls setActiveTab directly
    function TestComponent() {
      const { actions } = useDocumentCommunication()
      
      React.useEffect(() => {
        // Should not throw in production
        actions.setActiveTab('glossary')
      }, [actions])
      
      return <div>Success</div>
    }
    
    // Wrap in provider
    const TestWrapper = () => (
      <DocumentCommunicationProvider>
        <TestComponent />
      </DocumentCommunicationProvider>
    )
    
    // Should render without throwing
    const { getByText } = render(<TestWrapper />)
    expect(getByText('Success')).toBeInTheDocument()
  })
})