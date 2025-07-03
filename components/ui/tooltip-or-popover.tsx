'use client'

import { useCallback, useEffect, useId, useRef } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useCanHover } from '@/lib/hooks/use-can-hover'
import { useLongPress } from '@/lib/hooks/use-long-press'
import { useTooltipManager } from '@/lib/context/tooltip-manager'

interface TooltipOrPopoverProps {
  children: React.ReactNode
  content: React.ReactNode
  /** Optional stable id to identify this tooltip instance. If omitted, a React-generated id is used. */
  tooltipId?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  sideOffset?: number
  showIndicator?: boolean
  /**
   * Tailwind classes applied to the trigger span. Alias "className" kept for back-compat.
   */
  triggerClassName?: string
  /**
   * Tailwind classes applied to TooltipContent / PopoverContent. Useful for removing default
   * border/shadow when the supplied content already has its own container styling.
   */
  contentClassName?: string
  /** @deprecated Use triggerClassName instead */
  className?: string
  /**
   * Optional callback when open state changes. Useful for callers that need to
   * start async work only when the tooltip becomes visible (e.g. heading
   * summary fetch).
   */
  onOpenChange?: (open: boolean) => void
}

/**
 * Unified tooltip/popover component that provides consistent tooltip functionality
 * across both desktop (hover) and touch (long-press) devices.
 * 
 * - Desktop with hover capability: Shows standard Radix tooltip on hover
 * - Touch devices: Shows Radix popover on long-press (500ms)
 * - Visual consistency: Popover styled to match tooltip appearance exactly
 * - Discoverability: Optional faint dotted underline (follows glossary pattern)
 * 
 * This replaces all tooltip usage across the app to provide touch-friendly access
 * to tooltip content while maintaining the exact desktop experience.
 */
export function TooltipOrPopover({
  children,
  content,
  tooltipId: propTooltipId,
  side = 'right',
  align = 'start',
  sideOffset = 4,
  showIndicator = true,
  triggerClassName,
  contentClassName,
  className, // deprecated
  onOpenChange
}: TooltipOrPopoverProps) {
  const canHover = useCanHover()

  const { openId, setOpenId } = useTooltipManager()
  const generatedId = useId()
  const tooltipId = propTooltipId ?? generatedId

  const open = openId === tooltipId

  // Notify external caller when open state changes
  useEffect(() => {
    onOpenChange?.(open)
  }, [open, onOpenChange])

  // Remove `isActive` from the handlers so React doesn't pass it to the DOM as an
  // unknown attribute (it is only used for internal state tracking).
  const { isActive: _isActive, ...longPressHandlers } =
    useLongPress(() => setOpenId(tooltipId), { delay: 500 })

  /**
   * Global listeners to dismiss the popover when open.
   * – Pointer down outside (backup in case Radix misses)
   * – Scroll / resize (position invalidated)
   * – Escape key
   */
  useEffect(() => {
    if (!open) return

    const close = () => setOpenId(null)

    // ESC key
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }

    // Scroll / resize – any scroll on the page or viewport resize
    const handleScroll = () => close()
    const handleResize = () => close()

    // Pointer down anywhere outside will be captured by Radix Popover, but we
    // add an extra defensive listener to catch edge cases (e.g. if the element
    // is removed from DOM before Radix's handler runs).
    const handlePointerDown = () => close()

    window.addEventListener('keydown', handleKey)
    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('pointerdown', handlePointerDown)

    return () => {
      window.removeEventListener('keydown', handleKey)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [open, setOpenId])

  // --- Hover delay & click suppression logic -------------------------------
  const hoverDelayMs = 200
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const recentClickUntilRef = useRef<number>(0)

  const clearHoverTimeout = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
  }

  const handlePointerEnter = useCallback(() => {
    if (!canHover) return
    // Ignore if we've just clicked – prevents immediate reopen after click
    if (Date.now() < recentClickUntilRef.current) return

    hoverTimeoutRef.current = setTimeout(() => {
      setOpenId(tooltipId)
    }, hoverDelayMs)
  }, [canHover, hoverDelayMs, setOpenId, tooltipId])

  const handlePointerLeave = useCallback(() => {
    if (!canHover) return
    clearHoverTimeout()
    setOpenId(null)
  }, [canHover, setOpenId])

  // --- Trigger event handling ---------------------------------------------

  const handleFocus = useCallback(() => setOpenId(tooltipId), [setOpenId, tooltipId])
  const handleBlur = useCallback(() => setOpenId(null), [setOpenId])

  // Discoverability styling (faint dotted underline matching glossary pattern)
  const indicatorStyle = showIndicator
    ? {
        borderBottom: '1px dotted #DB8A45',
        cursor: 'help',
        transition: 'all 0.2s ease'
      } as React.CSSProperties
    : ({} as React.CSSProperties)

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Close existing tooltip on click so it doesn't reopen immediately.
    if (e.pointerType === 'mouse') {
      recentClickUntilRef.current = Date.now() + 300 // suppress hover for next 300 ms
      setOpenId(null)
      clearHoverTimeout()
    }
  }, [setOpenId])

  // Avoid property duplication: remove onPointerDown from longPressHandlers, then add merged version.
  const { onPointerDown: lpOnPointerDown, ...restLongPress } = longPressHandlers

  const triggerProps = {
    suppressHydrationWarning: true,
    style: {
      ...indicatorStyle,
      WebkitTouchCallout: 'none', // Suppress iOS long-press system menus
      userSelect: 'none',         // Prevent text selection flash during long-press
    } as React.CSSProperties,
    className: triggerClassName ?? className,
    onPointerEnter: handlePointerEnter,
    onPointerLeave: handlePointerLeave,
    onFocus: handleFocus,
    onBlur: handleBlur,
    onPointerDown: (e: React.PointerEvent) => {
      handlePointerDown(e)
      lpOnPointerDown?.(e)
    },
    ...restLongPress
  }

  // Cleanup timer on unmount
  useEffect(() => clearHoverTimeout, [])

  return (
    <Popover open={open} onOpenChange={(v) => setOpenId(v ? tooltipId : null)}>
      <PopoverTrigger asChild>
        <span {...triggerProps}>{children}</span>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        sideOffset={sideOffset}
        className={contentClassName}
      >
        {content}
      </PopoverContent>
    </Popover>
  )
}