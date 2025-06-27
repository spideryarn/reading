'use client'

import { createContext, useContext, useMemo, useState, useEffect, ReactNode } from 'react'

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
  documentSlug: string | null
  // URL state synchronization
  // See docs/reference/ARCHITECTURE_URL_STATE.md for URL state integration
  urlStateEnabled: boolean
}

// Actions interface for document communication
export interface DocumentCommunicationActions {
  setCurrentPosition: (elementId: string, scrollOffset?: number) => void
  highlightTerm: (term: string | null | undefined) => void
  setActiveTab: (tabId: string, internal?: boolean) => void
  scrollToElement: (elementId: string) => void
  // URL state synchronization
  setUrlStateEnabled: (enabled: boolean) => void
  notifyUrlStateChange: (changes: Record<string, unknown>) => void
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
  // Extract document slug from URL
  const getDocumentSlug = (): string | null => {
    if (typeof window === 'undefined') return null
    const pathname = window.location.pathname
    const match = pathname.match(/\/read\/([^\/]+)/)
    return match ? match[1] : null
  }

  // Initialize state
  const [state, setState] = useState<DocumentCommunicationState>({
    currentPosition: null,
    highlightedTerm: null,
    activeTabId: 'structure',
    documentSlug: getDocumentSlug(),
    urlStateEnabled: true // Enable URL state by default
  })

  // Update document slug when URL changes
  useEffect(() => {
    const updateDocumentSlug = () => {
      const newSlug = getDocumentSlug()
      setState(prev => ({ ...prev, documentSlug: newSlug }))
    }

    // Listen for navigation changes
    window.addEventListener('popstate', updateDocumentSlug)
    
    // Also check on mount and when pathname might change
    updateDocumentSlug()

    return () => {
      window.removeEventListener('popstate', updateDocumentSlug)
    }
  }, [])

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
    
    highlightTerm: (term: string | null | undefined) => {
      setState(prev => ({ ...prev, highlightedTerm: term ?? null }))
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[DocumentComm] Term highlighted:', term)
      }
    },
    
    setActiveTab: (tabId: string, internal = false) => {
      const urlStateEnabled = state.urlStateEnabled
      // Guard: URL is single source of truth
      if (!internal && urlStateEnabled && process.env.NODE_ENV === 'development') {
        throw new Error('[DocumentComm] setActiveTab called directly while URL-state is enabled. Use navigateToTab() instead.')
      }

      setState(prev => ({ ...prev, activeTabId: tabId }))

      if (process.env.NODE_ENV === 'development') {
        console.log('[DocumentComm] Active tab changed:', tabId, internal ? '(internal)' : '')
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
    },
    
    setUrlStateEnabled: (enabled: boolean) => {
      setState(prev => ({ ...prev, urlStateEnabled: enabled }))
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[DocumentComm] URL state enabled:', enabled)
      }
    },
    
    notifyUrlStateChange: (changes: Record<string, unknown>) => {
      // This is mainly for logging and future extensions
      // The actual URL state is managed by the useToolUrlState hook
      if (process.env.NODE_ENV === 'development') {
        console.log('[DocumentComm] URL state changed:', changes)
      }
    }
  }), [state.urlStateEnabled])

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

export function useDocumentSlug() {
  const { state } = useDocumentCommunication()
  return state.documentSlug
}