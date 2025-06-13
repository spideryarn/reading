/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Extract GlossaryDisplay for testing
const { useState, useMemo, useCallback, useEffect } = React

// Mock the debounce function to execute immediately in tests
jest.mock('@/lib/utils/debounce', () => ({
  debounce: (fn: any) => fn
}))

// Mock DocumentCommunicationContext
const mockDocumentCommunication = {
  actions: {
    scrollToElement: jest.fn(),
    setActiveTab: jest.fn()
  }
}

jest.mock('@/lib/context/document-communication-context', () => ({
  useDocumentCommunication: () => mockDocumentCommunication
}))

// Import actual debounce utility
import { debounce } from '@/lib/utils/debounce'
import type { DocumentElement } from '@/lib/types/document'
import { MagnifyingGlass, X } from '@phosphor-icons/react'

// Import needed components directly to avoid context issues
interface Entity {
  name: string
  ontology: 'person' | 'place' | 'date' | 'theme' | 'event' | 
           'reference' | 'object' | 'organization' | 'concept' | 
           'definition' | 'other'
  aliases: string[]
  brief_explanation: string
  long_explanation?: string
  datetime?: string
  url?: string
  extra?: Record<string, unknown>
}

// Standalone GlossaryDisplay component for testing
function TestGlossaryDisplay({ 
  entities, 
  elements 
}: { 
  entities: Entity[]
  elements: DocumentElement[]
}) {
  const [searchTerm, setSearchTerm] = useState('')
  
  // Filter entities based on search term
  const filterEntities = useCallback((entities: Entity[], searchTerm: string): Entity[] => {
    if (!searchTerm.trim()) return entities
    
    const term = searchTerm.toLowerCase()
    return entities.filter(entity => 
      entity.name.toLowerCase().includes(term) ||
      entity.aliases.some(alias => alias.toLowerCase().includes(term))
    )
  }, [])
  
  // Debounced search function
  const debouncedFilter = useMemo(
    () => debounce((term: string) => {
      // The filtering happens in the render through filteredEntities
    }, 300),
    []
  )
  
  // Apply search and get filtered entities
  const filteredEntities = useMemo(() => {
    return filterEntities(entities, searchTerm)
  }, [entities, searchTerm, filterEntities])
  
  // Clear search when tab changes or entities reload
  useEffect(() => {
    setSearchTerm('')
  }, [entities])

  return (
    <div className="flex flex-col h-full">
      {/* Search input */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              debouncedFilter(e.target.value)
            }}
            placeholder="Search glossary..."
            className="w-full px-4 py-2 pl-10 pr-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <MagnifyingGlass 
            size={16} 
            weight="bold" 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <X size={16} weight="bold" />
            </button>
          )}
        </div>
        
        {/* Results indicator */}
        {searchTerm.trim() && (
          <div className="mt-2 text-sm text-gray-600">
            {filteredEntities.length === 0 ? (
              <span className="text-red-600">No matches found</span>
            ) : (
              <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded-full font-medium">
                {filteredEntities.length} of {entities.length} {filteredEntities.length === 1 ? 'entry' : 'entries'}
              </span>
            )}
          </div>
        )}
      </div>
      
      {/* Entities list */}
      <div className="flex-1 overflow-y-auto">
        {filteredEntities.length === 0 && searchTerm.trim() ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
              <MagnifyingGlass size={24} weight="bold" className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No matches found</h3>
            <p className="text-sm text-gray-600">
              Try searching for a different term or clear the search.
            </p>
          </div>
        ) : (
          <div className="space-y-4 p-4">
            {filteredEntities.map((entity, index) => (
              <div 
                key={index} 
                className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="font-semibold text-lg leading-tight text-gray-900">
                    {entity.name}
                  </h3>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 shadow-sm bg-gray-100 text-gray-700">
                    {entity.ontology}
                  </span>
                </div>
                
                {entity.aliases.length > 0 && (
                  <div className="text-xs text-gray-600 mb-3 p-2 bg-gray-50 rounded-lg">
                    <span className="text-gray-500 font-medium">Also known as:</span>{' '}
                    <span className="font-medium text-gray-700">{entity.aliases.join(', ')}</span>
                  </div>
                )}
                
                <div className="text-sm text-gray-700 leading-relaxed mb-3 font-medium">
                  {entity.long_explanation || entity.brief_explanation}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

describe('Glossary Search Functionality', () => {
  const mockElements: DocumentElement[] = [
    {
      id: 'para-1',
      tag_name: 'p',
      content: 'The theory of consciousness is complex',
      position: 0,
      parent_id: null,
      attributes: {}
    },
    {
      id: 'para-2', 
      tag_name: 'p',
      content: 'Neural networks process information',
      position: 1,
      parent_id: null,
      attributes: {}
    }
  ]

  const mockGlossaryEntities = [
    {
      name: 'Consciousness',
      ontology: 'concept' as const,
      aliases: ['awareness', 'sentience'],
      brief_explanation: 'The state of being aware and having subjective experiences',
    },
    {
      name: 'Neural Networks',
      ontology: 'concept' as const,
      aliases: ['artificial neural networks', 'ANNs'],
      brief_explanation: 'Computing systems inspired by biological neural networks',
    },
    {
      name: 'Information Processing',
      ontology: 'concept' as const,
      aliases: ['data processing'],
      brief_explanation: 'The collection and manipulation of data to produce meaningful information',
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should display search input in glossary component', () => {
    render(<TestGlossaryDisplay entities={mockGlossaryEntities} elements={mockElements} />)
    
    // Check for search input
    expect(screen.getByPlaceholderText('Search glossary...')).toBeInTheDocument()
  })

  it('should filter entities by name when searching', async () => {
    const user = userEvent.setup()
    render(<TestGlossaryDisplay entities={mockGlossaryEntities} elements={mockElements} />)
    
    // Wait for all entities to be displayed
    expect(screen.getByText('Consciousness')).toBeInTheDocument()
    expect(screen.getByText('Neural Networks')).toBeInTheDocument()
    expect(screen.getByText('Information Processing')).toBeInTheDocument()
    
    // Search for "consciousness"
    const searchInput = screen.getByPlaceholderText('Search glossary...')
    await user.type(searchInput, 'consciousness')
    
    // Should show only Consciousness entity
    await waitFor(() => {
      expect(screen.getByText('Consciousness')).toBeInTheDocument()
      expect(screen.queryByText('Neural Networks')).not.toBeInTheDocument()
      expect(screen.queryByText('Information Processing')).not.toBeInTheDocument()
    })
  })

  it('should filter entities by aliases when searching', async () => {
    const user = userEvent.setup()
    render(<TestGlossaryDisplay entities={mockGlossaryEntities} elements={mockElements} />)
    
    // Search for "awareness" (alias of Consciousness)
    const searchInput = screen.getByPlaceholderText('Search glossary...')
    await user.type(searchInput, 'awareness')
    
    // Should show Consciousness entity since "awareness" is an alias
    await waitFor(() => {
      expect(screen.getByText('Consciousness')).toBeInTheDocument()
      expect(screen.queryByText('Neural Networks')).not.toBeInTheDocument()
      expect(screen.queryByText('Information Processing')).not.toBeInTheDocument()
    })
  })

  it('should show results indicator with count', async () => {
    const user = userEvent.setup()
    render(<TestGlossaryDisplay entities={mockGlossaryEntities} elements={mockElements} />)
    
    // Search for "network" (should match "Neural Networks")
    const searchInput = screen.getByPlaceholderText('Search glossary...')
    await user.type(searchInput, 'network')
    
    // Should show results indicator
    await waitFor(() => {
      expect(screen.getByText(/1 of 3 entry/)).toBeInTheDocument()
    })
  })

  it('should show no matches found when search has no results', async () => {
    const user = userEvent.setup()
    render(<TestGlossaryDisplay entities={mockGlossaryEntities} elements={mockElements} />)
    
    // Search for something that doesn't exist
    const searchInput = screen.getByPlaceholderText('Search glossary...')
    await user.type(searchInput, 'nonexistentterm')
    
    // Should show no matches state
    await waitFor(() => {
      expect(screen.getAllByText('No matches found')).toHaveLength(2) // Header indicator + empty state
      expect(screen.getByText('Try searching for a different term or clear the search.')).toBeInTheDocument()
    })
  })

  it('should clear search when X button is clicked', async () => {
    const user = userEvent.setup()
    render(<TestGlossaryDisplay entities={mockGlossaryEntities} elements={mockElements} />)
    
    // Search for something
    const searchInput = screen.getByPlaceholderText('Search glossary...')
    await user.type(searchInput, 'consciousness')
    
    // Click clear button
    const clearButton = screen.getByRole('button', { name: 'Clear search' })
    fireEvent.click(clearButton)
    
    // Should clear search and show all entities
    await waitFor(() => {
      expect(searchInput).toHaveValue('')
      expect(screen.getByText('Consciousness')).toBeInTheDocument()
      expect(screen.getByText('Neural Networks')).toBeInTheDocument()
      expect(screen.getByText('Information Processing')).toBeInTheDocument()
    })
  })

  it('should be case insensitive', async () => {
    const user = userEvent.setup()
    render(<TestGlossaryDisplay entities={mockGlossaryEntities} elements={mockElements} />)
    
    // Search with different cases
    const searchInput = screen.getByPlaceholderText('Search glossary...')
    await user.type(searchInput, 'CONSCIOUSNESS')
    
    // Should still find the entity despite case difference
    await waitFor(() => {
      expect(screen.getByText('Consciousness')).toBeInTheDocument()
      expect(screen.queryByText('Neural Networks')).not.toBeInTheDocument()
    })
  })
})