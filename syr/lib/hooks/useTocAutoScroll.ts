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
    
    
    // Find all visible heading elements in the ToC with their positions
    const visibleHeadingElements = Array.from(visibleHeadings)
      .map(headingId => {
        // Look for heading elements by their ID within the ToC container
        const element = containerRef.current?.querySelector(`[data-heading-id="${headingId}"]`) as HTMLElement
        return element ? { headingId, element } : null
      })
      .filter(Boolean) as { headingId: string; element: HTMLElement }[]
    
    if (visibleHeadingElements.length === 0) {
      return
    }
    
    // Select the most appropriate heading to scroll to
    // Strategy: Find the topmost heading in the ToC (which corresponds to document order)
    let targetHeading = visibleHeadingElements[0]
    
    if (visibleHeadingElements.length > 1) {
      // If multiple headings are visible, choose the topmost one in the ToC
      // (the one with the smallest offsetTop relative to the ToC container)
      targetHeading = visibleHeadingElements.reduce((topmost, current) => {
        const topmostTop = topmost.element.offsetTop
        const currentTop = current.element.offsetTop
        return currentTop < topmostTop ? current : topmost
      })
      
    }
    
    const targetElement = targetHeading.element
    
    
    // Get container dimensions and validate
    const container = containerRef.current
    const containerRect = container.getBoundingClientRect()
    const elementRect = targetElement.getBoundingClientRect()
    
    // Validate that we have valid dimensions
    if (containerRect.height === 0 || elementRect.height === 0) {
      return
    }
    
    // Calculate if element is already reasonably visible
    const elementTop = elementRect.top - containerRect.top
    const containerHeight = containerRect.height
    const elementBottom = elementTop + elementRect.height
    
    
    // If element is already in a good position (top third of container), don't scroll
    if (elementTop >= 0 && elementTop < containerHeight * 0.3) {
      return
    }
    
    // Calculate scroll target - bring element to top 20% of container
    const scrollTarget = container.scrollTop + elementTop - (containerHeight * 0.2)
    
    // Validate scroll target (ensure it's not negative and within bounds)
    const maxScrollTop = container.scrollHeight - containerHeight
    const clampedScrollTarget = Math.max(0, Math.min(scrollTarget, maxScrollTop))
    
    if (clampedScrollTarget !== scrollTarget) {
    }
    
    
    container.scrollTo({
      top: clampedScrollTarget,
      behavior: scrollBehavior
    })
  }, [containerRef, visibleHeadings, enableAutoScroll, isInCooldown, scrollBehavior])
  
  // Set up manual scroll tracking - watch for container ref changes
  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }
    
    container.addEventListener('scroll', handleManualScroll, { passive: true })
    
    return () => {
      container.removeEventListener('scroll', handleManualScroll)
    }
  }, [containerRef.current, handleManualScroll])
  
  // Perform auto-scroll when visible headings change
  useEffect(() => {
    
    if (!enableAutoScroll || visibleHeadings.size === 0) {
      return
    }
    
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
  
  // Debug return with additional info
  const debugInfo = {
    isInCooldown: isInCooldown(),
    hasContainer: !!containerRef.current,
    visibleHeadingsCount: visibleHeadings.size,
    enableAutoScroll
  }
  
  
  return debugInfo
}