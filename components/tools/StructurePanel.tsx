'use client'

// Consolidated Structure Panel component
// Combines functionality from OriginalHeadingsTab and AIGeneratedHeadingsTab
// See docs/planning/250627a_consolidate_headings_tabs_into_structure_tab.md for implementation details

import React, { useState, useEffect, useRef, useCallback, type JSX } from 'react'
import { CircleNotch, TreeStructure, Trash, ArrowRight, Stop } from '@phosphor-icons/react'
import type { DocumentElement } from '@/lib/types/document'
import { useMutation, useActiveMutationType } from '@/lib/context/mutation-context'
import { useDocumentCommunication } from '@/lib/context/document-communication-context'
import { HEADING_ITERATION_CONFIG, HEADING_GRANULARITY_CONFIG } from '@/lib/config'
import { headingOperationsToMutation } from '@/lib/services/heading-operations-mutation'
import { documentElementsToHtml } from '@/lib/utils/document-elements-to-html'
import { extractHeadingsFromMutation } from '@/lib/services/heading-mutation-generator'
import { HeadingTree, type Heading } from '../heading-tree'
import { Button } from '@/components/ui/button'
import { AlertWithIcon } from '@/components/ui/alert'
import { TooltipOrPopover } from '@/components/ui/tooltip-or-popover'
import { useToolExecutorWithNavigation } from '@/lib/tools/hooks/use-tool-executor-with-navigation'
import type { HeadingOperation } from '@/lib/prompts/schemas/headings'
import { HeadingSummaryTooltip, useHeadingSummaryTooltip } from './heading-summary-tooltip'

// Component props interface
interface StructurePanelProps {
  content: string
  elements?: DocumentElement[]
  onHeadingClick?: (headingText: string, headingId?: string) => void
  documentId: string
  markdownContent?: string
  headingVisibility?: Map<string, 'visible' | 'not-visible'>
  /**
   * Indicates that the backend reports AI-generated headings already exist for
   * this document (via `document_enhancements`).  We can then fail loudly if we
   * cannot retrieve them on page load instead of silently falling back to the
   * original structure.  This prop comes from the server-side
   * `getEnhancementFlags()` helper.
   */
  aiHeadingsGenerated?: boolean
}

// Heading format for mutation generator - must match lib/services/heading-mutation-generator.ts
// Currently unused but kept for future mutations that may need this format
// interface MutationHeading {
//   insertNewBeforeExistingId: string
//   html: string
// }

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
  headingVisibility,
  aiHeadingsGenerated: _aiHeadingsGenerated 
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
  const [granularityLevel, setGranularityLevel] = useState<number>(
    HEADING_GRANULARITY_CONFIG.DEFAULT_LEVEL
  )
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
  const [cacheAvailable, setCacheAvailable] = useState<boolean | null>(null)
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
  // Keep a ref in sync with `autoIterationStopped` so that asynchronous logic
  // (particularly the continuation decision at the end of an iteration) can
  // always read the **latest** value even if it changes while an iteration is
  // in-flight.  Using a ref avoids the classic stale-closure bug where the
  // generateHeadingsIteratively callback captures the value that was current
  // at invocation time.
  const autoIterationStoppedRef = useRef(false)
  useEffect(() => {
    autoIterationStoppedRef.current = autoIterationStopped
  }, [autoIterationStopped])

  // Debug/trace helper – incrementing attempt id for each generate call
  const attemptIdRef = useRef(0)

  // Ref to track the auto-iteration continuation timer so we can cancel it if
  // the user stops or removes AI headings before it fires.  This prevents a
  // queued callback from re-triggering iteration after the user thought it
  // was cancelled.
  const autoIterTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Wrapper to conform to HeadingTreeProps signature – avoids passing the
  // SetStateAction dispatcher directly (which also accepts functions).
  const handleGranularityChange = useCallback((level: number) => {
    setGranularityLevel(level)
  }, [])

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

  // Ensure granularityLevel stays within valid bounds whenever the heading set changes.
  // We *only* update the value if the current setting is outside the new bounds so
  // that user-driven changes via the slider are preserved.
  useEffect(() => {
    if (headings.length === 0) return

    // Slider can show at most the deepest heading level available but not less
    // than MIN_LEVEL (configured in HEADING_GRANULARITY_CONFIG).
    const MIN_LEVEL = HEADING_GRANULARITY_CONFIG.MIN_LEVEL
    const maxDepth = Math.max(...headings.map(h => h.level))

    setGranularityLevel((prev) => {
      // Clamp prev into the valid range [MIN_LEVEL, maxDepth]
      if (prev < MIN_LEVEL)
        return Math.min(
          HEADING_GRANULARITY_CONFIG.DEFAULT_LEVEL,
          Math.max(MIN_LEVEL, maxDepth)
        )
      if (prev > maxDepth) return maxDepth
      return prev // keep user selection
    })
  }, [headings])

  // Reset any user-collapsed nodes when the user changes the granularity slider so that
  // they immediately see the effect of their selection.  (Otherwise a previously
  // collapsed parent could hide deeper levels and make the slider appear broken.)
  useEffect(() => {
    setCollapsedIds(new Set())
  }, [granularityLevel])

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

      // 404 => no cached headings
      if (error && typeof error === 'object' && (
          ('status' in (error as any) && (error as any).status === 404) ||
          ('code' in (error as any) && (error as any).code === 'TOOL_CACHE_NOT_FOUND')
        )) {
        return null
      }

      // Enhance error reporting: include correlationId if available
      let errorMessage = 'Unknown error'
      let correlationId = ''

      if (error && typeof error === 'object') {
        if ('message' in (error as any) && typeof (error as any).message === 'string') {
          errorMessage = (error as any).message as string
        }
        if ('correlationId' in (error as any) && typeof (error as any).correlationId === 'string') {
          correlationId = (error as any).correlationId as string
        }
      }

      const decoratedMessage = correlationId ? `${errorMessage} (correlation id: ${correlationId})` : errorMessage
      throw new Error(decoratedMessage)
    } finally {
      fetchInProgressRef.current = false
    }
  }, [executeToolWithNavigation])

  // Helper function to apply cached operations (currently converts them to HTML fragments until heading operations are applied natively)
  const applyCachedOperations = useCallback(async (operations: HeadingOperation[]) => {
    try {
      console.log('Applying cached operations sequentially:', operations.length)

      // -------------------------------------------------------------------
      // Fast-path: If AI headings already exist in current elements (page did
      // not refresh), we can skip re-applying to avoid duplicate IDs.
      // -------------------------------------------------------------------
      const aiHeadingsAlreadyPresent = elements?.some(
        el => el.tag_name.match(/^h[1-6]$/i) && el.attributes?.['data-ai-generated'] === 'true'
      )

      if (aiHeadingsAlreadyPresent) {
        console.log('[StructurePanel] Detected existing AI headings – skipping mutation re-application')
        setIsLoadingHeadings(false)
        return
      }

      // Also short-circuit if a mutation is already active (Hot reload cases)
      if (mutationState.activeMutation?.type === 'insert-headings') {
        console.warn('[StructurePanel] AI headings mutation already active – using it as-is')
        setIsLoadingHeadings(false)
        return
      }

      // -------------------------------------------------------------------
      // NEW: Apply all cached operations in **one batched mutation**.  This
      // avoids validation failures that arose when sequentially applying ops
      // that depend on results of earlier transforms within the same tick.
      // -------------------------------------------------------------------

      const batchedMutation = headingOperationsToMutation({
        documentId,
        operations
      })

      const result = await applyMutation(batchedMutation)

      if (!result.success) {
        throw new Error(result.error || 'Failed to apply cached heading operations')
      }

      // Headings extraction will run via the effect that watches mutatedDocument.
      setCollapsedIds(new Set())
      setIsLoadingHeadings(false)
      console.log('[StructurePanel] Successfully reapplied all cached operations (batched)')
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('[StructurePanel] Error applying cached operations:', errMessage)
      // Set state so the render phase can throw and trigger the ErrorBoundary
      setHeadingsError(`AI headings cache replay failed: ${errMessage}`)
      // Ensure we're not stuck in a loading spinner
      setIsLoadingHeadings(false)
    }
  }, [documentId, applyMutation, mutationState.activeMutation, elements])

  // Manual loader for cached headings
  const handleLoadCachedHeadings = useCallback(async () => {
    try {
      setIsLoadingHeadings(true)
      setHeadingsError(null)

      const cached = await fetchCachedHeadings(documentId)
      if (!cached) {
        setHeadingsError('No pre-generated headings exist in the database to load.')
        return
      }

      if (!cached.operations || cached.operations.length === 0) {
        setHeadingsError('Cached headings payload was empty.')
        return
      }

      setEnhancementId(cached.enhancementId || null)
      await applyCachedOperations(cached.operations)
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error'
      setHeadingsError(`Failed to load pre-generated headings: ${errMsg}`)
    } finally {
      setIsLoadingHeadings(false)
    }
  }, [documentId, fetchCachedHeadings, applyCachedOperations])

  // Function to stop auto-iteration
  const handleStopAutoIteration = useCallback(() => {
    console.log('[StructurePanel] User manually stopped auto-iteration')
    // Cancel any queued auto-continuation that hasn't fired yet
    if (autoIterTimeoutRef.current) {
      clearTimeout(autoIterTimeoutRef.current)
      autoIterTimeoutRef.current = null
    }

    setAutoIterationStopped(true)
    autoIterationStoppedRef.current = true // keep ref in sync immediately
  }, [])

  // Create ref for the generate function before defining it
  const generateIterRef = useRef<() => Promise<void>>(() => Promise.resolve())

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
      if (mutatedDocument && mutatedDocument.length > 0) {
        htmlWithIds = documentElementsToHtml(mutatedDocument)
      } else if (elements && elements.length > 0) {
        htmlWithIds = documentElementsToHtml(elements)
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
      
      // Apply the new operations to the document using direct operation→mutation
      const mutation = headingOperationsToMutation({
        documentId,
        operations: response.operations
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
      
      // Determine if we should automatically continue or show manual controls
      const shouldAutoContinue = HEADING_ITERATION_CONFIG.AUTO_ITERATE_HEADINGS &&
                                 !autoIterationStoppedRef.current &&
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
        // Reset the in-progress flag so the next invocation is allowed
        setIsIterationInProgress(false)
        // Schedule the next iteration but keep a reference so that we can
        // cancel it if the user hits "Stop" or "Remove AI headings" during
        // the 500 ms grace period.
        if (autoIterTimeoutRef.current) {
          clearTimeout(autoIterTimeoutRef.current)
        }
        autoIterTimeoutRef.current = setTimeout(() => {
          autoIterTimeoutRef.current = null // timer has fired
          generateIterRef.current()
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
  }, [content, elements, documentId, iterationState, applyMutation, executeToolWithNavigation, isIterationInProgress, autoIterationStoppedRef, mutatedDocument])

  // ---------------------------------------------------------------------------
  // Ensure the auto-iteration timer always invokes the **latest** version of
  // generateHeadingsIteratively (which closes over the most up-to-date
  // iterationState).  Without this, the scheduled callback can carry a stale
  // reference, causing `iteration_count` sent to the server to freeze on an
  // older value and letting iterations exceed the configured limit.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    generateIterRef.current = generateHeadingsIteratively
  }, [generateHeadingsIteratively])

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
      await generateIterRef.current()
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
      await generateIterRef.current()
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
          // Bubble up as an error so the catch block can surface it in the UI
          throw new Error(revertResult.error || 'Failed to revert existing mutation')
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

  // Automatic cache loading removed – users must click "Load pre-generated headings".
  useEffect(() => {
    return () => {
      fetchInProgressRef.current = false
    }
  }, [])

  // Check once if cached headings exist so we can disable load button if absent
  useEffect(() => {
    (async () => {
      const result = await fetchCachedHeadings(documentId)
      setCacheAvailable(!!result)
    })().catch(() => setCacheAvailable(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId])

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
      ...(elements ? { elements: elements! } : {}),
      ...(mutatedDocument ? { mutatedDocument: mutatedDocument! } : {}),
      ...(activeMutationType ? { activeMutationType } : {}),
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

  // ---------------------------------------------------------------------------
  // Surface errors loudly: bring up a blocking alert and log to console so
  // developers (and Playwright) cannot miss the issue.  This runs only when
  // the error message is first set.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (headingsError) {
      // Extra safety: wrap in setTimeout so that it doesn't block React state
      // batching (especially during render).
      setTimeout(() => {
        console.error('[StructurePanel] Failed to load AI headings:', headingsError)
        if (typeof window !== 'undefined' && window.alert) {
          window.alert(`Failed to load AI headings: ${headingsError}`)
        }
      }, 0)
    }
  }, [headingsError])

  // Immediately surface any fatal headings error to the global error boundary so it cannot be missed.
  if (headingsError) {
    throw new Error(headingsError)
  }

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
        
        {currentMode === 'original' && (
          <Button
            onClick={handleLoadCachedHeadings}
            disabled={isLoadingHeadings || isIterationInProgress || cacheAvailable === false}
            variant="ghost"
            size="sm"
            className="text-blue-600 hover:text-blue-800 hover:bg-blue-100"
          >
            {isLoadingHeadings ? (
              <>
                <CircleNotch className="animate-spin" size={14} />
                <span className="ml-1">Loading…</span>
              </>
            ) : (
              cacheAvailable === false ? 'No cached headings' : 'Load pre-generated headings'
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
              disabled={isLoadingHeadings || isIterationInProgress}
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
                  {autoIterationStoppedRef.current
                    ? 'Finishing current pass…'
                    : iterationState.currentIteration === 0
                      ? 'Improving headings (Initial analysis)…'
                      : HEADING_ITERATION_CONFIG.AUTO_ITERATE_HEADINGS
                        ? `Auto-improving headings (Iteration ${iterationState.currentIteration + 1})…`
                        : `Improving headings (Iteration ${iterationState.currentIteration + 1})…`
                  }
                </span>
              </div>
            </TooltipOrPopover>
            
            {/* Stop button for auto-iteration */}
            {HEADING_ITERATION_CONFIG.AUTO_ITERATE_HEADINGS && !autoIterationStoppedRef.current && (
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
            onGranularityChange={handleGranularityChange}
            headingVisibility={headingVisibility || new Map()}
          />
        </div>
      </div>
    )
  }

  // Handle error state
  if (headingsError) {
    return (
      <div className="p-4 h-full flex flex-col overflow-y-auto">
        {renderStatusBadge()}
        <div className="space-y-4 flex-shrink-0">
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

        {/* Even when an error occurs we still want to show whatever headings we
            currently have so that the user can continue reading or fall back
            to the original structure.  */}
        {headings.length > 0 && (
          <div className="flex-1 min-h-0 mt-4">
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
              onGranularityChange={handleGranularityChange}
              headingVisibility={headingVisibility || new Map()}
            />
          </div>
        )}
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
        onGranularityChange={handleGranularityChange}
        headingVisibility={headingVisibility || new Map()}
      />
    </div>
  )
}