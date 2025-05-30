/**
 * Hook for auto-scrolling Table of Contents to follow document position
 */

import { useRef, useEffect, useCallback } from 'react'

export interface TocAutoScrollOptions {
  visibleHeadings: Set<string>
  enableAutoScroll?: boolean
  scrollBehavior?: ScrollBehavior
  cooldownDuration?: number
}

/**
 * Custom hook for automatically scrolling the Table of Contents to keep
 * the currently visible heading in view as the user scrolls through the document.
 * 
 * @param containerRef - Ref to the scrollable ToC container
 * @param options - Configuration options for auto-scrolling
 */
export function useTocAutoScroll(
  containerRef: React.RefObject<HTMLElement>,
  { 
    visibleHeadings, 
    enableAutoScroll = true,
    scrollBehavior = 'smooth',
    cooldownDuration = 2000
  }: TocAutoScrollOptions
) {
  const lastManualScrollRef = useRef<number>(0)
  const autoScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Track manual scrolling in the ToC
  const handleManualScroll = useCallback(() => {
    lastManualScrollRef.current = Date.now()
  }, [])
  
  // Check if we're still in cooldown from manual scroll
  const isInCooldown = useCallback(() => {
    return Date.now() - lastManualScrollRef.current < cooldownDuration
  }, [cooldownDuration])
  
  // Auto-scroll to keep visible heading in view
  const performAutoScroll = useCallback(() => {
    if (!containerRef.current || !enableAutoScroll || isInCooldown()) {
      return
    }
    
    // Find the first visible heading element in the ToC
    const visibleHeadingElements = Array.from(visibleHeadings)
      .map(headingId => {
        // Look for heading elements by their ID within the ToC container
        return containerRef.current?.querySelector(`[data-heading-id="${headingId}"]`)
      })
      .filter(Boolean) as HTMLElement[]
    
    if (visibleHeadingElements.length === 0) return
    
    // Get the topmost visible heading (first in document order)
    const targetElement = visibleHeadingElements[0]
    
    // Get container dimensions
    const container = containerRef.current
    const containerRect = container.getBoundingClientRect()
    const elementRect = targetElement.getBoundingClientRect()
    
    // Calculate if element is already reasonably visible
    const elementTop = elementRect.top - containerRect.top
    const containerHeight = containerRect.height
    
    // If element is already in a good position (top third of container), don't scroll
    if (elementTop >= 0 && elementTop < containerHeight * 0.3) {
      return
    }
    
    // Scroll to bring element to top third of container
    const scrollTarget = container.scrollTop + elementTop - (containerHeight * 0.2)
    
    container.scrollTo({
      top: scrollTarget,
      behavior: scrollBehavior
    })
  }, [containerRef, visibleHeadings, enableAutoScroll, isInCooldown, scrollBehavior])
  
  // Set up manual scroll tracking
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    
    container.addEventListener('scroll', handleManualScroll, { passive: true })
    
    return () => {
      container.removeEventListener('scroll', handleManualScroll)
    }
  }, [containerRef, handleManualScroll])
  
  // Perform auto-scroll when visible headings change
  useEffect(() => {
    if (!enableAutoScroll || visibleHeadings.size === 0) return
    
    // Clear any pending auto-scroll
    if (autoScrollTimeoutRef.current) {
      clearTimeout(autoScrollTimeoutRef.current)
    }
    
    // Debounce auto-scroll to avoid jarring movements
    autoScrollTimeoutRef.current = setTimeout(() => {
      performAutoScroll()
    }, 100)
    
    return () => {
      if (autoScrollTimeoutRef.current) {
        clearTimeout(autoScrollTimeoutRef.current)
      }
    }
  }, [visibleHeadings, performAutoScroll, enableAutoScroll])
  
  return {
    isInCooldown: isInCooldown()
  }
}