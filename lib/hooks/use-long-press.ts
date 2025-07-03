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
  onTouchStart: (event: React.TouchEvent) => void
  onTouchMove: (event: React.TouchEvent) => void
  onTouchEnd: () => void
  isActive: boolean
}

// Movement threshold in pixels before cancelling a pending long-press. Keep small so normal scrolling doesn't accidentally trigger the long-press.
const MOVEMENT_THRESHOLD = 10

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
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startPosition = useRef<{ x: number; y: number } | null>(null)
  
  // Clears any pending timeout and resets state
  const clear = useCallback(() => {
    if (timeout.current !== null) {
      clearTimeout(timeout.current)
      timeout.current = null
    }
    setIsActive(false)
    startPosition.current = null
  }, [])
  
  /**
   * Begin tracking a possible long-press. We use Pointer Events where available but
   * expose Touch events as a fallback for browsers that still don't fully support
   * them (e.g. older iOS WebViews).
   */
  const start = useCallback((event: React.PointerEvent | React.TouchEvent) => {
    // In the rare case this handler is wired to both pointer and touch events the
    // pointer variant should win (so ignore touch if we already have an active pointer)
    if (timeout.current) return

    // For Pointer events guard against secondary buttons
    if ('isPrimary' in event && !(event as React.PointerEvent).isPrimary) return

    // Prevent native long-press actions (text selection / drag scroll / context menu)
    // but only for touch/pen inputs. For mouse clicks we must NOT preventDefault – doing so
    // suppresses the subsequent click event which the icon-buttons rely on.
    if ('preventDefault' in event) {
      if ('pointerType' in event) {
        const pointerType = (event as React.PointerEvent).pointerType
        if (pointerType === 'touch' || pointerType === 'pen') {
          event.preventDefault()
        }
      } else {
        // TouchEvent branch – always prevent default because it's inherently touch.
        event.preventDefault()
      }
    }

    const point = 'clientX' in event
      ? { x: (event as React.PointerEvent).clientX, y: (event as React.PointerEvent).clientY }
      : {
          x: (event as React.TouchEvent).touches[0]?.clientX ?? 0,
          y: (event as React.TouchEvent).touches[0]?.clientY ?? 0
        }

    startPosition.current = point

    // Capture subsequent events so we still receive pointerup even if the user
    // moves outside the original element.
    if ('currentTarget' in event && 'setPointerCapture' in (event.currentTarget as Element) && 'pointerId' in event) {
      // Only capture touch/pen pointers; capturing the mouse pointer steals the subsequent
      // pointerup/click from child elements (e.g. links), breaking normal navigation.
      const ptrType = 'pointerType' in event ? (event as React.PointerEvent).pointerType : 'touch'
      if (ptrType === 'touch' || ptrType === 'pen') {
        try {
          ;(event.currentTarget as Element).setPointerCapture((event as React.PointerEvent).pointerId)
        } catch {
          // Not critical – best effort only.
        }
      }
    }

    setIsActive(true)

    timeout.current = setTimeout(() => {
      callback()
      clear() // Reset active state after firing
    }, delay)
  }, [callback, clear, delay])
  
  const checkMovement = useCallback(
    (event: React.PointerEvent | React.TouchEvent) => {
      if (startPosition.current) {
        const point = 'clientX' in event
          ? { x: (event as React.PointerEvent).clientX, y: (event as React.PointerEvent).clientY }
          : { x: (event as React.TouchEvent).touches[0]?.clientX ?? 0, y: (event as React.TouchEvent).touches[0]?.clientY ?? 0 }

        const deltaX = Math.abs(point.x - startPosition.current.x)
        const deltaY = Math.abs(point.y - startPosition.current.y)

        // Cancel if moved beyond threshold
        if (deltaX > MOVEMENT_THRESHOLD || deltaY > MOVEMENT_THRESHOLD) {
          clear()
        }
      }
    },
    [clear]
  )
  
  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    // Prevent OS long-press context menu when long-press is active
    if (isActive) {
      event.preventDefault()
    }
  }, [isActive])
  
  // --- Touch event fallbacks -------------------------------------------------

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      // Ignore if browser already supports pointer events (will duplicate)
      if (window.PointerEvent) return
      start(e)
    },
    [start]
  )

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (window.PointerEvent) return
      checkMovement(e)
    },
    [checkMovement]
  )

  const onTouchEnd = useCallback(
    () => {
      if (window.PointerEvent) return
      clear()
    },
    [clear]
  )
  
  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timeout.current !== null) {
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
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    isActive
  }
}