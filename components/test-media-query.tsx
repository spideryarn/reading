'use client'

import { useMediaQuery } from 'react-responsive'

export function TestMediaQuery() {
  // Viewport detection
  const isMobile = useMediaQuery({ maxWidth: 640 })
  const isTablet = useMediaQuery({ minWidth: 641, maxWidth: 1024 })
  const isDesktop = useMediaQuery({ minWidth: 1025 })
  const isLandscape = useMediaQuery({ maxHeight: 500 })
  
  // Touch capability detection
  const canHover = useMediaQuery({ query: '(hover: hover)' })
  const hasTouch = useMediaQuery({ query: '(pointer: coarse)' })
  const isTouchOnly = useMediaQuery({ query: '(hover: none) and (pointer: coarse)' })
  const isDesktopWithMouse = useMediaQuery({ query: '(hover: hover) and (pointer: fine)' })
  
  // High-DPI screens
  const isRetina = useMediaQuery({ query: '(min-resolution: 2dppx)' })
  
  return (
    <div className="p-4 space-y-4" suppressHydrationWarning>
      <h2 className="text-xl font-bold">Media Query Test Results</h2>
      
      <div className="space-y-2">
        <h3 className="font-semibold">Viewport Detection:</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Mobile (≤640px): <span className={isMobile ? 'text-green-600' : 'text-red-600'}>{String(isMobile)}</span></li>
          <li>Tablet (641-1024px): <span className={isTablet ? 'text-green-600' : 'text-red-600'}>{String(isTablet)}</span></li>
          <li>Desktop (≥1025px): <span className={isDesktop ? 'text-green-600' : 'text-red-600'}>{String(isDesktop)}</span></li>
          <li>Landscape (≤500px height): <span className={isLandscape ? 'text-green-600' : 'text-red-600'}>{String(isLandscape)}</span></li>
        </ul>
      </div>
      
      <div className="space-y-2">
        <h3 className="font-semibold">Touch Capability Detection:</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Can Hover: <span className={canHover ? 'text-green-600' : 'text-red-600'}>{String(canHover)}</span></li>
          <li>Has Touch: <span className={hasTouch ? 'text-green-600' : 'text-red-600'}>{String(hasTouch)}</span></li>
          <li>Touch Only: <span className={isTouchOnly ? 'text-green-600' : 'text-red-600'}>{String(isTouchOnly)}</span></li>
          <li>Desktop with Mouse: <span className={isDesktopWithMouse ? 'text-green-600' : 'text-red-600'}>{String(isDesktopWithMouse)}</span></li>
        </ul>
      </div>
      
      <div className="space-y-2">
        <h3 className="font-semibold">Other Features:</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Retina Display: <span className={isRetina ? 'text-green-600' : 'text-red-600'}>{String(isRetina)}</span></li>
        </ul>
      </div>
      
      <div className="mt-6 p-4 bg-gray-100 rounded">
        <p className="text-sm text-gray-600">
          Test this component in browser DevTools with different device emulation modes to verify touch vs hover detection.
        </p>
      </div>
    </div>
  )
}