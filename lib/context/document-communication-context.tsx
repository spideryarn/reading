'use client'

import { createContext, useContext, useMemo, useState, ReactNode } from 'react'

// Interface for tracking document position
export interface DocumentPosition {
  elementId: string | null
  scrollOffset: number
  timestamp: number
}

// State interface for document communication
export interface DocumentCommunicationState {
  currentPosition: DocumentPosition | null
  highlightedTerm: string | null
  activeTabId: string
}

// Actions interface for document communication
export interface DocumentCommunicationActions {
  setCurrentPosition: (elementId: string, scrollOffset?: number) => void
  highlightTerm: (term: string | null) => void
  setActiveTab: (tabId: string) => void
  scrollToElement: (elementId: string) => void
}

// Combined context type
interface DocumentCommunicationContextType {
  state: DocumentCommunicationState
  actions: DocumentCommunicationActions
}

// Create the context
const DocumentCommunicationContext = createContext<DocumentCommunicationContextType | null>(null)

// Provider component props
interface DocumentCommunicationProviderProps {
  children: ReactNode
}

// Provider component
export function DocumentCommunicationProvider({ children }: DocumentCommunicationProviderProps) {
  // Initialize state
  const [state, setState] = useState<DocumentCommunicationState>({
    currentPosition: null,
    highlightedTerm: null,
    activeTabId: 'original'
  })

  // Create memoized actions to prevent unnecessary re-renders
  const actions = useMemo<DocumentCommunicationActions>(() => ({
    setCurrentPosition: (elementId: string, scrollOffset = 0) => {
      setState(prev => ({
        ...prev,
        currentPosition: { 
          elementId, 
          scrollOffset, 
          timestamp: Date.now() 
        }
      }))
      
      // Log in development for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('[DocumentComm] Position updated:', { elementId, scrollOffset })
      }
    },
    
    highlightTerm: (term: string | null) => {
      setState(prev => ({ ...prev, highlightedTerm: term }))
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[DocumentComm] Term highlighted:', term)
      }
    },
    
    setActiveTab: (tabId: string) => {
      setState(prev => ({ ...prev, activeTabId: tabId }))
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[DocumentComm] Active tab changed:', tabId)
      }
    },
    
    scrollToElement: (elementId: string) => {
      // Update state first
      setState(prev => ({
        ...prev,
        currentPosition: { 
          elementId, 
          scrollOffset: 0, 
          timestamp: Date.now() 
        }
      }))
      
      // Then perform side effect
      const element = document.getElementById(elementId)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        
        // Add highlight effect
        element.setAttribute('data-highlight-target', 'true')
        setTimeout(() => {
          element.removeAttribute('data-highlight-target')
        }, 2000)
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[DocumentComm] Scroll to element:', elementId, element ? 'found' : 'not found')
      }
    }
  }), [])

  // Memoize context value
  const contextValue = useMemo<DocumentCommunicationContextType>(() => ({
    state,
    actions
  }), [state, actions])

  return (
    <DocumentCommunicationContext.Provider value={contextValue}>
      {children}
    </DocumentCommunicationContext.Provider>
  )
}

// Hook to use document communication context
export function useDocumentCommunication() {
  const context = useContext(DocumentCommunicationContext)
  if (!context) {
    throw new Error('useDocumentCommunication must be used within DocumentCommunicationProvider')
  }
  return context
}

// Optional: Convenience hooks for specific parts of state
export function useDocumentPosition() {
  const { state } = useDocumentCommunication()
  return state.currentPosition
}

export function useActiveTab() {
  const { state } = useDocumentCommunication()
  return state.activeTabId
}