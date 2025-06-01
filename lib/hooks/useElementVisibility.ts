/**
 * Hook for tracking element visibility using Intersection Observer
 */

import { useRef, useCallback, useEffect, useState } from 'react'
import { VISIBILITY_CONFIG } from '@/lib/config'

export interface ElementVisibilityState {
  visibleElements: Set<string>
  observeElement: (element: Element) => void
  unobserveElement: (element: Element) => void
}

/**
 * Custom hook for tracking which elements are visible in the viewport.
 * Uses Intersection Observer API for efficient visibility detection.
 * 
 * @param onVisibilityChange - Optional callback when element visibility changes
 * @returns Object with visible elements set and observe/unobserve functions
 */
export function useElementVisibility(
  onVisibilityChange?: (elementId: string, isVisible: boolean) => void
): ElementVisibilityState {
  const [visibleElements, setVisibleElements] = useState<Set<string>>(new Set())
  const observerRef = useRef<IntersectionObserver | null>(null)
  const pendingUpdatesRef = useRef<Map<string, boolean>>(new Map())
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Process pending visibility updates
  const processPendingUpdates = useCallback(() => {
    const updates = new Map(pendingUpdatesRef.current)
    pendingUpdatesRef.current.clear()

    if (updates.size === 0) return

    setVisibleElements(prev => {
      const next = new Set(prev)
      
      updates.forEach((isVisible, elementId) => {
        if (isVisible) {
          next.add(elementId)
        } else {
          next.delete(elementId)
        }
      })
      
      return next
    })
    
    // Call callbacks separately to avoid setState during render
    updates.forEach((isVisible, elementId) => {
      onVisibilityChange?.(elementId, isVisible)
    })
  }, [onVisibilityChange])

  // Schedule updates with debouncing
  const scheduleUpdate = useCallback(() => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current)
    }

    updateTimeoutRef.current = setTimeout(() => {
      processPendingUpdates()
    }, VISIBILITY_CONFIG.DEBOUNCE_DELAY)
  }, [processPendingUpdates])

  // Intersection Observer callback
  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    entries.forEach(entry => {
      const elementId = entry.target.getAttribute('data-element-id')
      if (!elementId) return

      const isVisible = entry.isIntersecting && 
                       entry.intersectionRatio >= VISIBILITY_CONFIG.THRESHOLD

      // Add to pending updates
      pendingUpdatesRef.current.set(elementId, isVisible)
    })

    // Schedule batched update
    scheduleUpdate()
  }, [scheduleUpdate])

  // Initialize Intersection Observer
  useEffect(() => {
    observerRef.current = new IntersectionObserver(handleIntersection, {
      root: null, // Use viewport as root
      rootMargin: VISIBILITY_CONFIG.ROOT_MARGIN,
      threshold: VISIBILITY_CONFIG.THRESHOLD
    })

    return () => {
      // Cleanup on unmount
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
      observerRef.current?.disconnect()
    }
  }, [handleIntersection])

  // Observe an element
  const observeElement = useCallback((element: Element) => {
    if (!element.hasAttribute('data-element-id')) {
      console.warn('Element must have data-element-id attribute for visibility tracking')
      return
    }
    observerRef.current?.observe(element)
  }, [])

  // Unobserve an element
  const unobserveElement = useCallback((element: Element) => {
    observerRef.current?.unobserve(element)
    
    // Remove from visible set through the debounced update mechanism
    const elementId = element.getAttribute('data-element-id')
    if (elementId) {
      pendingUpdatesRef.current.set(elementId, false)
      scheduleUpdate()
    }
  }, [scheduleUpdate])

  return {
    visibleElements,
    observeElement,
    unobserveElement
  }
}