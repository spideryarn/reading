'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface LongPressOptions {
  delay?: number
}

interface LongPressReturn {
  onPointerDown: (event: React.PointerEvent) => void
  onPointerUp: () => void
  onPointerCancel: () => void
  onPointerMove: (event: React.PointerEvent) => void
  onContextMenu: (event: React.MouseEvent) => void
  isActive: boolean
}

/**
 * Custom hook for handling long-press interactions using pointer events.
 * 
 * Uses pointer events (not touch events) for broader input support including
 * touch, pen, and future input methods. Includes movement cancellation and
 * context menu prevention to provide a robust long-press experience.
 * 
 * @param callback Function to call when long press is triggered
 * @param options Configuration options
 * @returns Event handlers and state for long press interaction
 */
export function useLongPress(
  callback: () => void, 
  options: LongPressOptions = {}
): LongPressReturn {
  const { delay = 500 } = options
  
  const [isActive, setIsActive] = useState(false)
  const timeout = useRef<NodeJS.Timeout>()
  const startPosition = useRef<{ x: number; y: number } | null>(null)
  
  const clear = useCallback(() => {
    if (timeout.current) {
      clearTimeout(timeout.current)
      timeout.current = undefined
    }
    setIsActive(false)
    startPosition.current = null
  }, [])
  
  const start = useCallback((event: React.PointerEvent) => {
    // Only handle primary pointer (first finger/mouse)
    if (!event.isPrimary) return
    
    startPosition.current = { x: event.clientX, y: event.clientY }
    setIsActive(true)
    
    timeout.current = setTimeout(() => {
      callback()
      setIsActive(false)
    }, delay)
  }, [callback, delay])
  
  const checkMovement = useCallback((event: React.PointerEvent) => {
    if (!event.isPrimary) return
    
    if (startPosition.current) {
      const deltaX = Math.abs(event.clientX - startPosition.current.x)
      const deltaY = Math.abs(event.clientY - startPosition.current.y)
      
      // Cancel if moved beyond threshold (10px)
      if (deltaX > 10 || deltaY > 10) {
        clear()
      }
    }
  }, [clear])
  
  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    // Prevent OS long-press context menu when long-press is active
    if (isActive) {
      event.preventDefault()
    }
  }, [isActive])
  
  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timeout.current) {
        clearTimeout(timeout.current)
      }
    }
  }, [])
  
  return {
    onPointerDown: start,
    onPointerUp: clear,
    onPointerCancel: clear,
    onPointerMove: checkMovement,
    onContextMenu: handleContextMenu,
    isActive
  }
}