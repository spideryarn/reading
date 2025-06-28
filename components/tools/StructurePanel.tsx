'use client'

// Consolidated Structure Panel component
// Combines functionality from OriginalHeadingsTab and AIGeneratedHeadingsTab
// See planning/250627a_consolidate_headings_tabs_into_structure_tab.md for implementation details

import React, { useState, useEffect, useRef, useCallback, type JSX } from 'react'
import { CircleNotch, TreeStructure, Trash } from '@phosphor-icons/react'
import type { DocumentElement } from '@/lib/types/document'
import type { GranularityKey } from '@/lib/prompts/templates/summarise'
import { useMutation, useActiveMutationType } from '@/lib/context/mutation-context'
import { useDocumentCommunication } from '@/lib/context/document-communication-context'
import { SUMMARY_CONFIG } from '@/lib/config'
import { generateHeadingMutation, extractHeadingsFromMutation } from '@/lib/services/heading-mutation-generator'
import { HeadingTree, type Heading } from '../heading-tree'
import { Button } from '@/components/ui/button'
import { Loading } from '@/components/ui/loading'
import { AlertWithIcon } from '@/components/ui/alert'
import { MarkdownRenderer } from '@/components/markdown-renderer'
import { TooltipOrPopover } from '@/components/ui/tooltip-or-popover'

// Component props interface
interface StructurePanelProps {
  content: string
  elements?: DocumentElement[]
  onHeadingClick?: (headingText: string, headingId?: string) => void
  documentId: string
  markdownContent?: string
  headingVisibility?: Map<string, 'visible' | 'not-visible'>
}

// Internal state for tracking the current mode
type StructureMode = 'original' | 'ai-generated'

// Tooltip granularity setting
const TOOLTIP_GRANULARITY: GranularityKey = 'single short paragraph'

/**
 * Check if a heading section has sufficient content to generate a meaningful summary.
 */
function hasSufficientContentForSummary(
  elementId: string,
  elements?: DocumentElement[],
  mutatedDocument?: DocumentElement[],
  activeMutationType?: string | null
): boolean {
  const elementsToSearch = (activeMutationType === 'insert-headings' && mutatedDocument) 
    ? mutatedDocument 
    : elements

  if (!elementsToSearch || elementsToSearch.length === 0) {
    return false
  }

  const headingElement = elementsToSearch.find(element => element.id === elementId)
  if (!headingElement) {
    return false
  }

  const headingLevel = parseInt(headingElement.tag_name.substring(1))
  const headingPosition = headingElement.position

  const sectionElements: DocumentElement[] = []
  
  for (let i = 0; i < elementsToSearch.length; i++) {
    const element = elementsToSearch[i]!
    
    if (element.position <= headingPosition) continue
    
    if (element.tag_name.match(/^h[1-6]$/i)) {
      const elementLevel = parseInt(element.tag_name.substring(1))
      if (elementLevel <= headingLevel) {
        break
      }
    }
    
    if (element.content?.trim()) {
      sectionElements.push(element)
    }
  }

  const totalTextContent = sectionElements
    .map(element => element.content)
    .join(' ')
    .trim()
  
  return totalTextContent.length >= SUMMARY_CONFIG.MIN_CONTENT_LENGTH_CHARS
}

/**
 * Generate LLM summary for a heading's hierarchical content.
 */
async function generateHeadingSummary(
  elementId: string,
  documentId: string,
  elements?: DocumentElement[],
  mutatedDocument?: DocumentElement[],
  activeMutationType?: string | null,
  setContentCache?: React.Dispatch<React.SetStateAction<Map<string, string>>>
): Promise<string> {
  const elementsToSearch = (activeMutationType === 'insert-headings' && mutatedDocument) 
    ? mutatedDocument 
    : elements

  if (!elementsToSearch || elementsToSearch.length === 0) {
    return "No content available"
  }

  const headingElement = elementsToSearch.find(element => element.id === elementId)

  if (!headingElement) {
    console.warn(`Heading element not found for ID: ${elementId}`)
    return "Heading not found in elements"
  }

  const headingLevel = parseInt(headingElement.tag_name.substring(1))
  const headingPosition = headingElement.position

  const sectionElements: DocumentElement[] = []
  
  for (let i = 0; i < elementsToSearch.length; i++) {
    const element = elementsToSearch[i]!
    
    if (element.position <= headingPosition) continue
    
    if (element.tag_name.match(/^h[1-6]$/i)) {
      const elementLevel = parseInt(element.tag_name.substring(1))
      if (elementLevel <= headingLevel) {
        break
      }
    }
    
    if (element.content?.trim()) {
      sectionElements.push(element)
    }
  }

  if (sectionElements.length === 0) {
    return "No content found for this section"
  }

  const htmlContent = sectionElements
    .map(element => `<${element.tag_name}>${element.content}</${element.tag_name}>`)
    .join('')

  try {
    const response = await fetch('/api/tools/summary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'execute',
        parameters: {
          content: htmlContent,
          granularity: TOOLTIP_GRANULARITY,
          documentId: documentId,
          sectionId: elementId
        },
        metadata: {
          correlationId: crypto.randomUUID(),
          source: 'direct',
          timestamp: new Date().toISOString()
        }
      }),
    })

    if (!response.ok) {
      throw new Error(`Summary API failed: ${response.status}`)
    }

    const { summary } = await response.json()
    
    if (setContentCache) {
      setContentCache(prev => new Map(prev).set(elementId, summary))
    }
    
    return summary
  } catch (error) {
    console.error('Error generating summary:', error)
    
    const errorMessage = "⚠️ Unable to generate summary. Please try again later."
    
    if (setContentCache) {
      setContentCache(prev => new Map(prev).set(elementId, errorMessage))
    }
    
    return errorMessage
  }
}

/**
 * Consolidated Structure Panel Component
 * Displays document structure with both original and AI-enhanced headings
 */
export function StructurePanel({ 
  content, 
  elements, 
  onHeadingClick, 
  documentId,
  headingVisibility 
}: StructurePanelProps) {
  const { applyMutation, revertMutation, mutationState, document: mutatedDocument } = useMutation()
  const activeMutationType = useActiveMutationType()
  const { state: commState } = useDocumentCommunication()
  
  // Determine current mode based on mutation state
  const currentMode: StructureMode = activeMutationType === 'insert-headings' ? 'ai-generated' : 'original'
  
  // Shared state
  const [headings, setHeadings] = useState<Heading[]>([])
  const [loadingStates, setLoadingStates] = useState<Set<string>>(new Set())
  const [contentCache, setContentCache] = useState<Map<string, string>>(new Map())
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const [granularityLevel, setGranularityLevel] = useState(3)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // AI-specific state
  const [isLoadingHeadings, setIsLoadingHeadings] = useState(false)
  const [headingsError, setHeadingsError] = useState<string | null>(null)
  const [enhancementId, setEnhancementId] = useState<string | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)
  const fetchInProgressRef = useRef(false)

  /**
   * Failsafe timer to ensure the UI never remains indefinitely in a
   * "Generating…" state without surfacing an error. If the loading flag stays
   * stuck for more than FAILSAFE_TIMEOUT_MS the timer will automatically clear
   * the loading state and expose an error to the user.
   */
  const FAILSAFE_TIMEOUT_MS = 120_000 // 2 minutes
  const failsafeTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Whenever loading starts, start/refresh the failsafe timer.
    if (isLoadingHeadings) {
      if (failsafeTimerRef.current) {
        clearTimeout(failsafeTimerRef.current)
      }
      failsafeTimerRef.current = setTimeout(() => {
        console.error('[StructurePanel] Failsafe-timeout fired – headings generation exceeded', FAILSAFE_TIMEOUT_MS, 'ms')
        setIsLoadingHeadings(false)
        setHeadingsError('Timed out — something prevented headings generation from completing. Please try again or check the console for details.')
      }, FAILSAFE_TIMEOUT_MS)
    } else {
      // Loading cleared → cancel timer
      if (failsafeTimerRef.current) {
        clearTimeout(failsafeTimerRef.current)
        failsafeTimerRef.current = null
      }
    }

    return () => {
      if (failsafeTimerRef.current) {
        clearTimeout(failsafeTimerRef.current)
      }
    }
  }, [isLoadingHeadings])

  // Debug/trace helper – incrementing attempt id for each generate call
  const attemptIdRef = useRef(0)

  // Extract headings based on current mode
  useEffect(() => {
    const extractHeadings = () => {
      const elementsToUse = (activeMutationType === 'insert-headings' && mutatedDocument) ? mutatedDocument : elements
      
      if (!elementsToUse) {
        // Fallback to parsing HTML content if no elements available
        const parser = new DOMParser()
        const doc = parser.parseFromString(content, 'text/html')
        const headingElements = doc.querySelectorAll('h1, h2, h3, h4, h5, h6')
        
        const extractedHeadings: Heading[] = []
        
        headingElements.forEach((element, index) => {
          const level = parseInt(element.tagName.substring(1))
          const text = element.textContent?.trim() || ''
          
          let id = element.id
          if (!id) {
            id = `heading-${index}-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
          }
          
          if (text) {
            extractedHeadings.push({ 
              id, 
              text, 
              level,
              elementId: id
            })
          }
        })
        
        setHeadings(extractedHeadings)
      } else {
        // Extract headings from document elements
        const extractedHeadings: Heading[] = elementsToUse
          .filter(el => {
            if (!el.tag_name.match(/^h[1-6]$/i)) return false
            
            const isAiGenerated = el.attributes?.['data-ai-generated'] === 'true'
            
            if (activeMutationType === 'insert-headings') {
              return isAiGenerated
            } else {
              return !isAiGenerated
            }
          })
          .map((el, index) => ({
            id: el.id || `heading-${index}`,
            text: el.content || '',
            level: parseInt(el.tag_name.substring(1)),
            elementId: el.id
          }))
          .filter(h => h.text.length > 0)
        
        setHeadings(extractedHeadings)
      }
    }

    if (content || elements || mutatedDocument) {
      extractHeadings()
    }
  }, [content, elements, mutatedDocument, activeMutationType])

  // Update default granularity based on max depth
  useEffect(() => {
    if (headings.length > 0) {
      const maxDepth = Math.max(...headings.map(h => h.level))
      const newGranularityLevel = Math.min(3, maxDepth)
      if (newGranularityLevel !== granularityLevel) {
        setGranularityLevel(newGranularityLevel)
      }
    }
  }, [headings, granularityLevel])

  // Helper function to fetch cached headings from database
  const fetchCachedHeadings = async (documentId: string) => {
    if (fetchInProgressRef.current) {
      console.log('Fetch already in progress, skipping duplicate request')
      return null
    }
    
    fetchInProgressRef.current = true
    
    try {
      const response = await fetch(`/api/tools/structure?documentId=${documentId}`)
      if (!response.ok) {
        console.error('Failed to fetch cached headings:', response.status)
        return null
      }
      const data = await response.json()
      return data.cached ? data : null
    } catch (error) {
      console.error('Error fetching cached headings:', error)
      return null
    } finally {
      fetchInProgressRef.current = false
    }
  }

  // Helper function to apply cached headings without API call
  const applyCachedHeadings = useCallback(async (cachedHeadings: Array<{ id_of_after?: string; insertNewBeforeExistingId?: string; html: string }>) => {
    try {
      console.log('Applying cached headings:', cachedHeadings)
      
      if (mutationState.activeMutation?.type === 'insert-headings') {
        console.warn('AI headings mutation already active, extracting existing headings')
        const existingHeadings = extractHeadingsFromMutation(mutationState.activeMutation).map(h => ({
          ...h,
          elementId: h.id
        }))
        setHeadings(existingHeadings)
        setIsLoadingHeadings(false)
        return
      }
      
      // Map cached format { id_of_after, html } -> { insertNewBeforeExistingId, html }
      const convertedHeadings = cachedHeadings.map(h => ({
        insertNewBeforeExistingId: h.insertNewBeforeExistingId ?? h.id_of_after ?? '',
        html: h.html
      }))

      const mutation = generateHeadingMutation({
        headings: convertedHeadings,
        documentId: documentId
      })
      
      const result = await applyMutation(mutation)
      
      if (result.success) {
        const generatedHeadings = extractHeadingsFromMutation(mutation).map(h => ({
          ...h,
          elementId: h.id
        }))
        setHeadings(generatedHeadings)
        setCollapsedIds(new Set())
        setIsLoadingHeadings(false)
        
        console.log('Successfully applied cached headings')
      } else {
        throw new Error(result.error || 'Failed to apply cached headings mutation')
      }
    } catch (error) {
      console.error('Error applying cached headings:', error)
      setHeadingsError(`Failed to load cached headings: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setIsLoadingHeadings(false) // FIX: Ensure loading state is cleared on error
    }
  }, [documentId, applyMutation, mutationState.activeMutation])

  // Core headings generation logic
  const generateHeadingsFromAPI = useCallback(async (isRegeneration = false) => {
    const attemptId = ++attemptIdRef.current
    console.group(`[StructurePanel] generateHeadingsFromAPI attempt #${attemptId}`)
    console.log('isRegeneration:', isRegeneration, 'currentMode:', currentMode)

    // ---- QUICK FAIL-FAST MITIGATION FOR LARGE DOCUMENTS -------------------
    const MAX_ELEMENTS_FOR_HEADINGS_GEN = 8000
    const MAX_HTML_LENGTH_FOR_HEADINGS_GEN = 800_000 // ~800 KB

    if (elements && elements.length > MAX_ELEMENTS_FOR_HEADINGS_GEN) {
      console.warn(`[StructurePanel] Element count (${elements.length}) exceeds limit (${MAX_ELEMENTS_FOR_HEADINGS_GEN}). Aborting generation.`)
      const msg = `Document has ${elements.length.toLocaleString()} elements – AI heading generation is currently limited to ${MAX_ELEMENTS_FOR_HEADINGS_GEN.toLocaleString()} elements. Please try a shorter document or split it up.`
      console.error('[StructurePanel] ', msg)
      setHeadingsError(msg)
      setIsLoadingHeadings(false)
      console.groupEnd()
      return
    }
    if (content && content.length > MAX_HTML_LENGTH_FOR_HEADINGS_GEN) {
      const msg = `Document HTML is ${Math.round(content.length / 1024)} KB – exceeds current 800 KB limit for AI heading generation.`
      console.error('[StructurePanel] ', msg)
      setHeadingsError(msg)
      setIsLoadingHeadings(false)
      console.groupEnd()
      return
    }

    try {
      if (mutationState.activeMutation?.type === 'insert-headings' && !isRegeneration) {
        console.warn('AI headings mutation already active, skipping generation')
        const existingHeadings = extractHeadingsFromMutation(mutationState.activeMutation).map(h => ({
          ...h,
          elementId: h.id
        }))
        setHeadings(existingHeadings)
        setIsLoadingHeadings(false)
        setHeadingsError('AI headings are already applied. Remove them first or click "Regenerate" to create a new set.')
        return
      }
      
      // Timeout machinery for fetch – 60 s hard limit
      const HEADINGS_GENERATION_TIMEOUT_MS = 60_000 // 1 minute
      const abortController = new AbortController()
      const timeoutId = setTimeout(() => {
        abortController.abort()
      }, HEADINGS_GENERATION_TIMEOUT_MS)

      try {
        let htmlWithIds = ''
        if (elements && elements.length > 0) {
          htmlWithIds = elements.map(el => {
            const attrs = Object.entries(el.attributes)
              .map(([key, value]) => `${key}="${value}"`)
              .join(' ')
            const attrString = attrs ? ` ${attrs}` : ''
            
            if (el.content) {
              return `<${el.tag_name} id="${el.id}"${attrString}>${el.content}</${el.tag_name}>`
            } else {
              return `<${el.tag_name} id="${el.id}"${attrString} />`
            }
          }).join('\n')
        } else if (content) {
          htmlWithIds = content
        } else {
          const error = new Error('Cannot generate headings: No content or elements available')
          console.error('generateHeadingsFromAPI error:', error)
          throw error
        }
        
        console.log('Sending POST /api/tools/structure with content length:', htmlWithIds.length)
        
        const response = await fetch('/api/tools/structure', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'execute',
            parameters: {
              html_content: htmlWithIds,
              documentId: documentId
            },
            metadata: {
              correlationId: crypto.randomUUID(),
              source: 'direct',
              timestamp: new Date().toISOString()
            }
          }),
          signal: abortController.signal,
        })

        if (!response.ok) {
          const errorText = await response.text()
          const error = new Error(`API failed with status ${response.status}: ${errorText}`)
          console.error('Headings API error:', error)
          throw error
        }

        const data = await response.json()
        console.log('Generate headings response:', data)
        
        if (!data.operations || data.operations.length === 0) {
          const error = new Error('API returned no operations')
          console.error('Empty operations response:', data)
          throw error
        }
        
        // Convert operations to legacy headings format for generateHeadingMutation
        const legacyHeadings = data.operations
          .filter((op: { action: string; content?: { tag_name: string; content: string } }) => (op.action === 'insert' || op.action === 'replace') && op.content)
          .map((op: { action: string; content: { tag_name: string; content: string }; insertNewBeforeExistingId?: string; targetId?: string }) => ({
            html: `<${op.content.tag_name}>${op.content.content}</${op.content.tag_name}>`,
            insertNewBeforeExistingId: op.action === 'insert' ? op.insertNewBeforeExistingId : op.targetId
          }))
        
        const mutation = generateHeadingMutation({
          headings: legacyHeadings,
          documentId: documentId,
          isRegeneration: isRegeneration
        })
        
        const result = await applyMutation(mutation)
        
        if (result.success) {
          const generatedHeadings = extractHeadingsFromMutation(mutation).map(h => ({
            ...h,
            elementId: h.id
          }))
          setHeadings(generatedHeadings)
          setCollapsedIds(new Set())
          setIsLoadingHeadings(false)
        } else {
          setIsLoadingHeadings(false) // FIX: Ensure loading state is cleared on mutation failure
          throw new Error(result.error || 'Failed to apply mutation')
        }
      } catch (error) {
        // CRITICAL FIX: Ensure loading state is always cleared, even on unexpected errors
        setIsLoadingHeadings(false)
        if (error instanceof DOMException && error.name === 'AbortError') {
          console.error('Headings generation timed out after', HEADINGS_GENERATION_TIMEOUT_MS / 1000, 'seconds')
          throw new Error('Timed out: AI headings generation took too long. Please try again later.')
        }
        console.error('Error in generateHeadingsFromAPI:', error)
        throw error // Re-throw to maintain error handling in calling functions
      } finally {
        clearTimeout(timeoutId)
        console.groupEnd()
      }
    } catch (error) {
      // CRITICAL FIX: Ensure loading state is always cleared, even on unexpected errors
      setIsLoadingHeadings(false)
      console.error('Error in generateHeadingsFromAPI:', error)
      throw error // Re-throw to maintain error handling in calling functions
    }
  }, [content, elements, documentId, mutationState.activeMutation, applyMutation, currentMode])

  // Public API for manual headings generation
  const handleGenerateHeadings = async () => {
    setIsLoadingHeadings(true)
    setHeadingsError(null)
    
    try {
      await generateHeadingsFromAPI()
      // NOTE: setIsLoadingHeadings(false) is handled inside generateHeadingsFromAPI on success
    } catch (error) {
      console.error('Error generating headings:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate headings'
      setHeadingsError(errorMessage)
      setIsLoadingHeadings(false)
    }
  }

  // Remove AI headings functionality
  const handleRemoveHeadings = async () => {
    console.log('Removing AI headings...')
    setIsLoadingHeadings(true)
    setHeadingsError(null)
    
    try {
      const activeMutationType = mutationState.activeMutation?.type
      if (activeMutationType === 'insert-headings') {
        console.log('Reverting existing AI headings mutation...')
        const revertResult = await revertMutation()
        if (!revertResult.success) {
          console.warn('Failed to revert existing mutation:', revertResult.error)
        }
        
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      if (enhancementId) {
        console.log('Deleting cached headings enhancement...')
        const deleteResponse = await fetch(`/api/tools/structure?documentId=${documentId}`, {
          method: 'DELETE'
        })
        
        if (!deleteResponse.ok) {
          console.warn('Failed to delete cached headings')
        }
      }
      
      setEnhancementId(null)
      setIsLoadingHeadings(false)
    } catch (error) {
      console.error('Error removing headings:', error)
      setHeadingsError(error instanceof Error ? error.message : 'Failed to remove headings')
      setIsLoadingHeadings(false)
    }
  }

  // Auto-initialize AI headings if available
  useEffect(() => {
    console.log('StructurePanel mounted, documentId:', documentId)
    
    let isCancelled = false
    
    const loadHeadings = async () => {
      if (hasInitialized) {
        return
      }
      // CRITICAL FIX: Remove currentMode === 'original' check that was preventing 
      // cached headings from loading on page refresh
      
      setHasInitialized(true)
      setHeadingsError(null)
      
      try {
        const cached = await fetchCachedHeadings(documentId)
        
        if (isCancelled) {
          if (process.env.NODE_ENV === 'development') {
            console.log('AI headings load cancelled (component unmounted)')
          }
          return
        }
        
        if (cached && cached.operations) {
          if (process.env.NODE_ENV === 'development') {
            console.log('Found cached operations, applying them...')
          }
          setEnhancementId(cached.enhancementId || null)
          
          // Convert operations to legacy headings format for applyCachedHeadings
          const legacyHeadings = cached.operations
            .filter((op: { action: string; content?: { tag_name: string; content: string } }) => (op.action === 'insert' || op.action === 'replace') && op.content)
            .map((op: { action: string; content: { tag_name: string; content: string }; insertNewBeforeExistingId?: string; targetId?: string }) => ({
              html: `<${op.content.tag_name}>${op.content.content}</${op.content.tag_name}>`,
              insertNewBeforeExistingId: op.action === 'insert' ? op.insertNewBeforeExistingId : op.targetId
            }))
          
          await applyCachedHeadings(legacyHeadings)
        } else if (cached && (!Array.isArray(cached.operations) || cached.operations.length === 0)) {
          console.error('[StructurePanel] Cached operations payload invalid or empty:', cached)
          setHeadingsError('Cached AI operations were invalid. Please regenerate.')
          setIsLoadingHeadings(false)
          return
        } else {
          // Don't auto-generate - user must explicitly request
          setIsLoadingHeadings(false)
        }
      } catch (error) {
        console.error('Error in loadHeadings:', error)
        if (!isCancelled) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          setHeadingsError(`Failed to load headings: ${errorMessage}`)
          setIsLoadingHeadings(false)
        }
      }
    }
    
    if ((elements && elements.length > 0) || content) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Content/elements available, checking for cached headings')
      }
      loadHeadings()
    }
    
    return () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('StructurePanel unmounting')
      }
      isCancelled = true
    }
  }, [documentId, hasInitialized, applyCachedHeadings, content, elements])

  const handleHeadingClick = (heading: Heading) => {
    if (onHeadingClick) {
      onHeadingClick(heading.text, heading.id)
    } else {
      const element = document.getElementById(heading.id)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else {
        console.warn(`Element with id "${heading.id}" not found in DOM`)
      }
    }
  }

  const getTooltipContent = useCallback((elementId: string): JSX.Element => {
    const isLoading = loadingStates.has(elementId)
    const cachedContent = contentCache.get(elementId)
    
    if (isLoading) {
      return (
        <div className="max-w-md p-4 text-sm bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="flex items-center space-x-3">
            <CircleNotch size={16} className="animate-spin text-blue-500" style={{ animationDuration: '2s' }} />
            <span className="text-gray-700 font-medium">Summarising contents of this heading...</span>
          </div>
        </div>
      )
    }
    
    if (cachedContent) {
      const isError = cachedContent.startsWith('⚠️')
      
      if (isError) {
        return (
          <div className="max-w-md p-4 text-sm bg-amber-50 border border-amber-200 rounded-lg shadow-lg">
            <div className="flex items-center space-x-3">
              <CircleNotch size={16} className="text-amber-600 flex-shrink-0" />
              <span className="text-amber-800 font-medium">{cachedContent.replace('⚠️ ', '')}</span>
            </div>
          </div>
        )
      }
      
      return (
        <div className="max-w-md p-4 text-sm bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="prose prose-sm prose-gray max-w-none">
            <MarkdownRenderer content={cachedContent} />
          </div>
        </div>
      )
    }
    
    if (hasSufficientContentForSummary(elementId, elements, mutatedDocument, activeMutationType)) {
      return (
        <div className="max-w-md p-4 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <span className="font-medium">Hover to load content...</span>
          </div>
        </div>
      )
    } else {
      return (
        <div className="max-w-md p-4 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            <span className="font-medium italic">Section too short to summarise</span>
          </div>
        </div>
      )
    }
  }, [loadingStates, contentCache, elements, mutatedDocument, activeMutationType])

  const handleTooltipShow = useCallback((elementId: string) => {
    if (!contentCache.has(elementId) && !loadingStates.has(elementId)) {
      if (hasSufficientContentForSummary(elementId, elements, mutatedDocument, activeMutationType)) {
        setLoadingStates(prev => new Set(prev).add(elementId))
        
        generateHeadingSummary(elementId, documentId, elements, mutatedDocument, activeMutationType, setContentCache).finally(() => {
          setLoadingStates(prev => {
            const newSet = new Set(prev)
            newSet.delete(elementId)
            return newSet
          })
        })
      }
    }
  }, [contentCache, loadingStates, elements, mutatedDocument, activeMutationType, documentId])

  const toggleExpanded = (headingId: string) => {
    setCollapsedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(headingId)) {
        newSet.delete(headingId)
      } else {
        newSet.add(headingId)
      }
      return newSet
    })
  }

  // Sync ToC scroll position when document position changes
  useEffect(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
      scrollTimeoutRef.current = null
    }

    if (commState.currentPosition?.elementId && commState.activeTabId === 'structure') {
      scrollTimeoutRef.current = setTimeout(() => {
        const tocElement = document.querySelector(
          `[data-heading-id="${commState.currentPosition!.elementId}"]`
        )
        if (tocElement) {
          ;(tocElement as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' })
          tocElement.classList.add('bg-yellow-100')
          setTimeout(() => tocElement.classList.remove('bg-yellow-100'), 2000)
        }
        scrollTimeoutRef.current = null
      }, 100)
    }

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [commState.currentPosition, commState.activeTabId])

  // Render status badge
  const renderStatusBadge = () => {
    return (
      <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <TreeStructure size={16} className="text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-800">Structure</h3>
          <span 
            className={`text-xs px-2 py-1 rounded-full ${
              currentMode === 'ai-generated' 
                ? 'text-green-700 bg-green-100' 
                : 'text-blue-700 bg-blue-100'
            }`}
            title={
              currentMode === 'ai-generated'
                ? 'Showing AI-enhanced headings'
                : 'Showing original document headings'
            }
          >
            {currentMode === 'ai-generated' ? 'AI-enhanced' : 'Original'}
          </span>
        </div>
        
        {currentMode === 'original' && headings.length > 0 && (
          <Button
            onClick={handleGenerateHeadings}
            disabled={isLoadingHeadings}
            variant="ghost"
            size="sm"
            className="text-green-600 hover:text-green-800 hover:bg-green-100 ml-auto"
          >
            {isLoadingHeadings ? (
              <>
                <CircleNotch className="animate-spin" size={14} />
                <span className="ml-1">Generating...</span>
              </>
            ) : (
              'Generate AI headings'
            )}
          </Button>
        )}
        
        {currentMode === 'ai-generated' && (
          <TooltipOrPopover
            content="Remove AI headings"
            side="top"
            align="center"
            showIndicator={true}
          >
            <Button
              onClick={handleRemoveHeadings}
              variant="ghost"
              size="icon-xs"
              className="text-red-600 hover:text-red-800 hover:bg-red-100 ml-auto"
              disabled={isLoadingHeadings}
            >
              <Trash size={14} />
            </Button>
          </TooltipOrPopover>
        )}
      </div>
    )
  }

  // Handle no headings case
  if (headings.length === 0 && !isLoadingHeadings && !headingsError) {
    return (
      <div className="p-4">
        {renderStatusBadge()}
        <div className="text-sm text-gray-500">
          {currentMode === 'original' 
            ? 'No headings found in document'
            : 'No AI headings available'
          }
        </div>
        {currentMode === 'original' && (
          <Button
            onClick={handleGenerateHeadings}
            disabled={isLoadingHeadings}
            variant="outline"
            size="full"
            className="mt-3 text-green-600 bg-green-50 border-green-200 hover:bg-green-100"
          >
            Generate AI headings
          </Button>
        )}
      </div>
    )
  }

  // Handle loading state
  if (isLoadingHeadings) {
    return (
      <div className="p-4">
        {renderStatusBadge()}
        <Loading text="Generating headings..." spinnerSize={20} />
      </div>
    )
  }

  // Handle error state
  if (headingsError) {
    return (
      <div className="p-4">
        {renderStatusBadge()}
        <div className="space-y-4">
          <AlertWithIcon 
            variant="warning"
            title="Failed to generate headings"
            description={headingsError}
          />
          <Button
            onClick={handleGenerateHeadings}
            variant="outline"
            size="full"
            className="text-green-600 bg-green-50 border-green-200 hover:bg-green-100"
          >
            Try again
          </Button>
        </div>
      </div>
    )
  }

  // Main render with headings
  return (
    <div className="p-4 h-full flex flex-col overflow-y-auto">
      {renderStatusBadge()}
      <HeadingTree
        headings={headings}
        themeColors={{
          hover: 'hover:bg-gray-50',
          text: 'group-hover:text-gray-900',
          levelText: 'text-gray-400 group-hover:text-gray-600',
          levelTextHover: 'group-hover:text-gray-600'
        }}
        onHeadingClick={handleHeadingClick}
        getTooltipContent={getTooltipContent}
        handleTooltipShow={handleTooltipShow}
        collapsedIds={collapsedIds}
        onToggleExpanded={toggleExpanded}
        granularityLevel={granularityLevel}
        onGranularityChange={setGranularityLevel}
        headingVisibility={headingVisibility || new Map()}
      />
    </div>
  )
}