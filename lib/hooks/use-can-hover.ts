'use client'

import { useMediaQuery } from 'react-responsive'

/**
 * Detects if the device has hover and fine pointer capabilities.
 * 
 * Uses CSS Media Queries Level 4 to detect input capabilities:
 * - (hover: hover): Device has hover capability (mouse, trackpad)
 * - (pointer: fine): Device has fine pointer precision (mouse, stylus)
 * 
 * For mixed-input devices (iPad + trackpad, convertibles), this returns true
 * when both capabilities are available, but the component should still provide
 * long-press as a fallback for touch interactions.
 * 
 * @returns boolean indicating if hover tooltips should be used
 */
export function useCanHover(): boolean {
  const hasHover = useMediaQuery({ query: '(hover: hover)' })
  const hasFinePointer = useMediaQuery({ query: '(pointer: fine)' })
  
  // Both conditions must be true for reliable hover support
  return hasHover && hasFinePointer
}