'use client'

import { useState } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useCanHover } from '@/lib/hooks/use-can-hover'
import { useLongPress } from '@/lib/hooks/use-long-press'

interface TooltipOrPopoverProps {
  children: React.ReactNode
  content: React.ReactNode
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
  side = 'right',
  align = 'start',
  sideOffset = 4,
  showIndicator = true,
  triggerClassName,
  contentClassName,
  className // deprecated
}: TooltipOrPopoverProps) {
  const canHover = useCanHover()
  const [popoverOpen, setPopoverOpen] = useState(false)
  
  const longPressPropsWithActive = useLongPress(() => setPopoverOpen(true), { delay: 500 })
  const { isActive: _longPressActive, ...longPressProps } = longPressPropsWithActive
  
  // Discoverability styling (faint dotted underline matching glossary pattern)
  const indicatorStyle = showIndicator
    ? {
        borderBottom: '1px dotted #DB8A45',
        cursor: 'help',
        transition: 'all 0.2s ease'
      }
    : {}
  
  if (canHover) {
    // Desktop path: Use standard tooltip with hover
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            suppressHydrationWarning
            style={indicatorStyle}
            className={triggerClassName ?? className}
          >
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent 
          side={side} 
          align={align} 
          sideOffset={sideOffset}
          className={contentClassName}
        >
          {content}
        </TooltipContent>
      </Tooltip>
    )
  }
  
  // Touch path: Use popover with long-press trigger
  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <span
          suppressHydrationWarning
          style={indicatorStyle}
          className={triggerClassName ?? className}
          {...longPressProps}
        >
          {children}
        </span>
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