'use client'

// Consolidated Structure Panel component
// Combines functionality from OriginalHeadingsTab and AIGeneratedHeadingsTab
// See planning/250627a_consolidate_headings_tabs_into_structure_tab.md for implementation details

import React, { useState, useEffect, useRef, useCallback, type JSX } from 'react'
import { CircleNotch, TreeStructure, Trash, ArrowRight, Stop } from '@phosphor-icons/react'
import type { DocumentElement } from '@/lib/types/document'
import { useMutation, useActiveMutationType } from '@/lib/context/mutation-context'
import { useDocumentCommunication } from '@/lib/context/document-communication-context'
import { HEADING_ITERATION_CONFIG } from '@/lib/config'
import { generateHeadingMutation, extractHeadingsFromMutation } from '@/lib/services/heading-mutation-generator'
import { HeadingTree, type Heading } from '../heading-tree'
import { Button } from '@/components/ui/button'
import { AlertWithIcon } from '@/components/ui/alert'
import { TooltipOrPopover } from '@/components/ui/tooltip-or-popover'
import { useToolExecutorWithNavigation } from '@/lib/tools/hooks/use-tool-executor-with-navigation'
import type { HeadingOperation } from '@/lib/prompts/templates/headings'
import { HeadingSummaryTooltip, useHeadingSummaryTooltip } from './heading-summary-tooltip'

// Component props interface
interface StructurePanelProps {
  content: string
  elements?: DocumentElement[]
  onHeadingClick?: (headingText: string, headingId?: string) => void
  documentId: string
  markdownContent?: string
  headingVisibility?: Map<string, 'visible' | 'not-visible'>
}

// Heading format for mutation generator - must match lib/services/heading-mutation-generator.ts
interface MutationHeading {
  insertNewBeforeExistingId: string
  html: string
}

// Internal state for tracking the current mode
type StructureMode = 'original' | 'ai-generated'

// State for tracking iteration progress
interface IterationState {
  currentIteration: number
  totalOperations: number
  operations: HeadingOperation[]
  summaries: string[]
  isComplete: boolean
}

// Response types for structure tool
interface StructureGetResponse {
  operations?: HeadingOperation[]
  cached: boolean
  enhancementId?: string | null
  type: string
}

interface StructureIterateResponse {
  operations: HeadingOperation[]
  more_changes_required: boolean
  iteration_summary: string
  safety_check: {
    current_iteration: number
    total_operations_so_far: number
    max_iterations_reached: boolean
  }
  cached?: boolean
}

interface StructureDeleteResponse {
  success: boolean
  deleted: boolean
  documentId: string
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
  const executeToolWithNavigation = useToolExecutorWithNavigation()
  
  // Determine current mode based on mutation state
  const currentMode: StructureMode = activeMutationType === 'insert-headings' ? 'ai-generated' : 'original'
  
  // Shared state
  const [headings, setHeadings] = useState<Heading[]>([])
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const [granularityLevel, setGranularityLevel] = useState(3)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Tooltip state management
  const {
    contentCache,
    loadingStates,
    handleLoadingStateChange,
    handleContentCacheChange
  } = useHeadingSummaryTooltip()
  
  // AI-specific state
  const [isLoadingHeadings, setIsLoadingHeadings] = useState(false)
  const [headingsError, setHeadingsError] = useState<string | null>(null)
  const [enhancementId, setEnhancementId] = useState<string | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)
  const fetchInProgressRef = useRef(false)
  
  // Iteration state
  const [iterationState, setIterationState] = useState<IterationState>({
    currentIteration: 0,
    totalOperations: 0,
    operations: [],
    summaries: [],
    isComplete: false
  })
  const [showIterationControls, setShowIterationControls] = useState(false)
  const [isIterationInProgress, setIsIterationInProgress] = useState(false)
  const [autoIterationStopped, setAutoIterationStopped] = useState(false)

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

  // Helper function to fetch cached headings from database using tool executor
  const fetchCachedHeadings = useCallback(async (documentId: string) => {
    if (fetchInProgressRef.current) {
      console.log('Fetch already in progress, skipping duplicate request')
      return null
    }
    
    fetchInProgressRef.current = true
    
    try {
      const result = await executeToolWithNavigation('structure', 'get', {
        documentId,
        action: 'get'
      })
      
      const data = result.data as StructureGetResponse
      if (data && data.cached) {
        return data
      }
      return null
    } catch (error) {
      console.error('Error fetching cached headings:', error)
      return null
    } finally {
      fetchInProgressRef.current = false
    }
  }, [executeToolWithNavigation])

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
      const convertedHeadings: MutationHeading[] = cachedHeadings.map(h => ({
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

  // Function to stop auto-iteration
  const handleStopAutoIteration = useCallback(() => {
    console.log('[StructurePanel] User manually stopped auto-iteration')
    setAutoIterationStopped(true)
  }, [])

  // New iterative heading generation function
  const generateHeadingsIteratively = useCallback(async () => {
    const attemptId = ++attemptIdRef.current
    console.group(`[StructurePanel] generateHeadingsIteratively attempt #${attemptId}`)
    
    // Prevent concurrent iterations
    if (isIterationInProgress) {
      console.warn('[StructurePanel] Iteration already in progress, skipping duplicate request')
      console.groupEnd()
      return
    }
    
    setIsIterationInProgress(true)
    
    // Quick fail-fast for large documents
    const MAX_ELEMENTS_FOR_HEADINGS_GEN = 8000
    const MAX_HTML_LENGTH_FOR_HEADINGS_GEN = 800_000 // ~800 KB

    if (elements && elements.length > MAX_ELEMENTS_FOR_HEADINGS_GEN) {
      const msg = `Document has ${elements.length.toLocaleString()} elements – AI heading generation is currently limited to ${MAX_ELEMENTS_FOR_HEADINGS_GEN.toLocaleString()} elements.`
      console.error('[StructurePanel] ', msg)
      setHeadingsError(msg)
      setIsLoadingHeadings(false)
      setIsIterationInProgress(false)
      console.groupEnd()
      return
    }
    if (content && content.length > MAX_HTML_LENGTH_FOR_HEADINGS_GEN) {
      const msg = `Document HTML is ${Math.round(content.length / 1024)} KB – exceeds current 800 KB limit for AI heading generation.`
      console.error('[StructurePanel] ', msg)
      setHeadingsError(msg)
      setIsLoadingHeadings(false)
      setIsIterationInProgress(false)
      console.groupEnd()
      return
    }
    
    try {
      // Prepare HTML content
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
        throw new Error('Cannot generate headings: No content or elements available')
      }
      
      // Call iterate action for current iteration
      const result = await executeToolWithNavigation('structure', 'iterate', {
        html_content: htmlWithIds,
        documentId: documentId,
        iteration_count: iterationState.currentIteration,
        previous_iteration_summary: iterationState.summaries[iterationState.summaries.length - 1],
        existing_operations: iterationState.operations,
        total_operations_count: iterationState.totalOperations
      })
      
      const response = result.data as StructureIterateResponse
      if (!response || !response.operations) {
        throw new Error('API returned no operations')
      }
      
      // Check for empty operations (perfect headings case)
      if (response.operations.length === 0) {
        console.log('No operations returned - document headings are already optimal')
        setIterationState(prev => ({
          currentIteration: prev.currentIteration + 1,
          totalOperations: prev.totalOperations,
          operations: prev.operations,
          summaries: [...prev.summaries, response.iteration_summary || 'No changes needed - headings are already well-structured'],
          isComplete: true
        }))
        setIsLoadingHeadings(false)
        setShowIterationControls(false)
        setIsIterationInProgress(false)
        return
      }
      
      // Update iteration state
      setIterationState(prev => ({
        currentIteration: prev.currentIteration + 1,
        totalOperations: response.safety_check.total_operations_so_far,
        operations: [...prev.operations, ...response.operations],
        summaries: [...prev.summaries, response.iteration_summary],
        isComplete: !response.more_changes_required || response.safety_check.max_iterations_reached
      }))
      
      // Apply the new operations to the document
      const legacyHeadings: MutationHeading[] = response.operations
        .filter((op) => (op.action === 'insert' || op.action === 'replace') && op.content)
        .map((op) => ({
          html: `<${op.content!.tag_name}>${op.content!.content}</${op.content!.tag_name}>`,
          insertNewBeforeExistingId: (op.action === 'insert' ? op.insertNewBeforeExistingId : op.targetId) || ''
        }))
      
      if (legacyHeadings.length > 0) {
        const mutation = generateHeadingMutation({
          headings: legacyHeadings,
          documentId: documentId,
          isRegeneration: false
        })
        
        const mutationResult = await applyMutation(mutation)
        
        if (mutationResult.success) {
          const generatedHeadings = extractHeadingsFromMutation(mutation).map(h => ({
            ...h,
            elementId: h.id
          }))
          setHeadings(generatedHeadings)
          setCollapsedIds(new Set())
        } else {
          throw new Error(mutationResult.error || 'Failed to apply mutation')
        }
      }
      
      // Determine if we should automatically continue or show manual controls
      const shouldAutoContinue = HEADING_ITERATION_CONFIG.AUTO_ITERATE_HEADINGS &&
                                 !autoIterationStopped &&
                                 response.more_changes_required &&
                                 !response.safety_check.max_iterations_reached &&
                                 iterationState.currentIteration < HEADING_ITERATION_CONFIG.MAX_ITERATIONS - 1
      
      if (!response.more_changes_required || response.safety_check.max_iterations_reached) {
        // Iteration complete - no more changes needed or limits reached
        setIsLoadingHeadings(false)
        setShowIterationControls(false)
        setIsIterationInProgress(false)
        if (response.safety_check.max_iterations_reached) {
          setHeadingsError('Maximum iterations reached. The document structure has been improved as much as possible within safety limits.')
        }
      } else if (shouldAutoContinue) {
        // Automatically continue to next iteration
        console.log(`[StructurePanel] Auto-continuing to iteration ${iterationState.currentIteration + 1}`)
        // Keep loading state and trigger next iteration automatically
        setTimeout(() => {
          generateHeadingsIteratively()
        }, 500) // Brief pause for UI feedback
      } else {
        // Show manual controls for user to decide
        setIsLoadingHeadings(false)
        setShowIterationControls(true)
        setIsIterationInProgress(false)
      }
      
      console.groupEnd()
    } catch (error) {
      setIsLoadingHeadings(false)
      setIsIterationInProgress(false)
      console.error('Error in generateHeadingsIteratively:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate headings iteratively'
      setHeadingsError(errorMessage)
      console.groupEnd()
    }
  }, [content, elements, documentId, iterationState, applyMutation, executeToolWithNavigation, isIterationInProgress, autoIterationStopped])

  // Public API for manual headings generation (now uses iterative approach)
  const handleGenerateHeadings = async () => {
    setIsLoadingHeadings(true)
    setHeadingsError(null)
    setShowIterationControls(false)
    setAutoIterationStopped(false) // Reset stop flag when starting new generation
    
    // Reset iteration state for new generation
    setIterationState({
      currentIteration: 0,
      totalOperations: 0,
      operations: [],
      summaries: [],
      isComplete: false
    })
    
    try {
      await generateHeadingsIteratively()
      // NOTE: setIsLoadingHeadings(false) is handled inside generateHeadingsIteratively
    } catch (error) {
      console.error('Error generating headings:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate headings'
      setHeadingsError(errorMessage)
      setIsLoadingHeadings(false)
    }
  }
  
  // Handle continuing iteration
  const handleContinueIteration = async () => {
    setIsLoadingHeadings(true)
    setHeadingsError(null)
    setShowIterationControls(false)
    
    try {
      await generateHeadingsIteratively()
    } catch (error) {
      console.error('Error continuing iteration:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to continue iteration'
      setHeadingsError(errorMessage)
      setIsLoadingHeadings(false)
    }
  }
  
  // Handle finishing iteration early
  const handleFinishIteration = () => {
    setShowIterationControls(false)
    setIterationState(prev => ({ ...prev, isComplete: true }))
  }

  // Remove AI headings functionality
  const handleRemoveHeadings = async () => {
    console.log('Removing AI headings...')
    setIsLoadingHeadings(true)
    setHeadingsError(null)
    setShowIterationControls(false)
    
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
        const deleteResult = await executeToolWithNavigation('structure', 'delete', {
          documentId
        })
        
        const deleteData = deleteResult.data as StructureDeleteResponse
        if (!deleteData?.success) {
          console.warn('Failed to delete cached headings')
        }
      }
      
      // Reset iteration state
      setIterationState({
        currentIteration: 0,
        totalOperations: 0,
        operations: [],
        summaries: [],
        isComplete: false
      })
      
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
          const legacyHeadings: Array<{ id_of_after?: string; insertNewBeforeExistingId?: string; html: string }> = cached.operations
            .filter((op: HeadingOperation) => (op.action === 'insert' || op.action === 'replace') && op.content)
            .map((op: HeadingOperation) => ({
              html: `<${op.content!.tag_name}>${op.content!.content}</${op.content!.tag_name}>`,
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
  }, [documentId, hasInitialized, applyCachedHeadings, content, elements, fetchCachedHeadings])

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

  // Create tooltip component instance for current heading context
  const createTooltipHandlers = useCallback((elementId: string) => {
    const tooltipComponent = HeadingSummaryTooltip({
      elementId,
      documentId,
      elements,
      mutatedDocument,
      activeMutationType,
      contentCache,
      loadingStates,
      onLoadingStateChange: handleLoadingStateChange,
      onContentCacheChange: handleContentCacheChange
    })
    
    return {
      getTooltipContent: () => tooltipComponent.getTooltipContent(),
      handleTooltipShow: () => tooltipComponent.handleTooltipShow()
    }
  }, [
    documentId,
    elements,
    mutatedDocument,
    activeMutationType,
    contentCache,
    loadingStates,
    handleLoadingStateChange,
    handleContentCacheChange
  ])

  // Generate tooltip content for HeadingTree
  const getTooltipContent = useCallback((elementId: string): JSX.Element => {
    const { getTooltipContent } = createTooltipHandlers(elementId)
    return getTooltipContent()
  }, [createTooltipHandlers])

  // Handle tooltip show for HeadingTree
  const handleTooltipShow = useCallback((elementId: string) => {
    const { handleTooltipShow } = createTooltipHandlers(elementId)
    handleTooltipShow()
  }, [createTooltipHandlers])

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
            disabled={isLoadingHeadings || isIterationInProgress}
            variant="ghost"
            size="sm"
            className="text-green-600 hover:text-green-800 hover:bg-green-100 ml-auto"
          >
            {isLoadingHeadings ? (
              <>
                <CircleNotch className="animate-spin" size={14} />
                <span className="ml-1">Improving...</span>
              </>
            ) : (
              'Improve headings'
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
            disabled={isLoadingHeadings || isIterationInProgress}
            variant="outline"
            size="full"
            className="mt-3 text-green-600 bg-green-50 border-green-200 hover:bg-green-100"
          >
            Improve document structure
          </Button>
        )}
      </div>
    )
  }

  // Handle loading state - show progress AND current headings
  if (isLoadingHeadings) {
    return (
      <div className="p-4 h-full flex flex-col overflow-y-auto">
        {renderStatusBadge()}
        
        {/* Progress indicator at top - compact with tooltip for details */}
        <div className="flex-shrink-0 mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <TooltipOrPopover
              content={
                iterationState.currentIteration > 0 ? (
                  <div className="max-w-md p-4 text-sm bg-white border border-gray-200 rounded-lg shadow-lg">
                    <div className="space-y-2">
                      <p className="font-medium text-gray-900">
                        Iteration Progress
                      </p>
                      <p className="text-gray-700">
                        Operations so far: {iterationState.totalOperations}
                      </p>
                      {iterationState.summaries.length > 0 && (
                        <p className="text-gray-700">
                          Last change: {iterationState.summaries[iterationState.summaries.length - 1]}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="max-w-md p-4 text-sm bg-white border border-gray-200 rounded-lg shadow-lg">
                    <p className="text-gray-700">
                      Analysing document structure and preparing improvements...
                    </p>
                  </div>
                )
              }
              side="right"
              sideOffset={8}
              showIndicator={false}
              contentClassName="p-0 bg-transparent border-0 shadow-none"
            >
              <div className="flex items-center space-x-3 cursor-help">
                <CircleNotch size={20} className="animate-spin text-blue-500" />
                <span className="text-blue-700 font-medium">
                  {iterationState.currentIteration === 0 
                    ? `Improving headings (Initial analysis)...`
                    : HEADING_ITERATION_CONFIG.AUTO_ITERATE_HEADINGS
                      ? `Auto-improving headings (Iteration ${iterationState.currentIteration + 1})...`
                      : `Improving headings (Iteration ${iterationState.currentIteration + 1})...`
                  }
                </span>
              </div>
            </TooltipOrPopover>
            
            {/* Stop button for auto-iteration */}
            {HEADING_ITERATION_CONFIG.AUTO_ITERATE_HEADINGS && !autoIterationStopped && (
              <Button
                onClick={handleStopAutoIteration}
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 text-xs py-1 px-2 h-6"
              >
                <Stop size={12} className="mr-1" />
                Stop
              </Button>
            )}
          </div>
        </div>

        {/* Show current headings while processing */}
        <div className="flex-1 min-h-0">
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
            disabled={isIterationInProgress}
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
      
      {/* Show iteration controls if needed */}
      {showIterationControls && !isLoadingHeadings && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm space-y-2">
            <p className="font-medium text-blue-900">
              Iteration {iterationState.currentIteration} complete
            </p>
            <p className="text-blue-700">
              {iterationState.operations.length} operations applied • {iterationState.totalOperations} total operations
            </p>
            {iterationState.summaries.length > 0 && (
              <p className="text-blue-600 italic">
                &ldquo;{iterationState.summaries[iterationState.summaries.length - 1]}&rdquo;
              </p>
            )}
            {!HEADING_ITERATION_CONFIG.AUTO_ITERATE_HEADINGS && (
              <p className="text-xs text-gray-600 mb-2">
                Auto-iteration disabled - manual control required
              </p>
            )}
            <div className="flex gap-2 mt-3">
              <Button
                onClick={handleContinueIteration}
                variant="default"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
                disabled={
                  isIterationInProgress ||
                  iterationState.currentIteration >= HEADING_ITERATION_CONFIG.MAX_ITERATIONS
                }
              >
                <ArrowRight size={14} className="mr-1" />
                Continue improving
              </Button>
              <Button
                onClick={handleFinishIteration}
                variant="outline"
                size="sm"
                disabled={isIterationInProgress}
              >
                Finish
              </Button>
            </div>
            <p className="text-xs text-blue-600 mt-2">
              {HEADING_ITERATION_CONFIG.MAX_ITERATIONS - iterationState.currentIteration} iterations remaining
            </p>
            {iterationState.currentIteration >= HEADING_ITERATION_CONFIG.MAX_ITERATIONS && (
              <p className="text-xs text-amber-600 mt-1 font-medium">
                Safety limit reached - Click &ldquo;Finish&rdquo; to complete
              </p>
            )}
          </div>
        </div>
      )}
      
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