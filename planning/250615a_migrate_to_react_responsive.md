# Migrate to react-responsive for Enhanced Device Detection

**Date**: 2025-06-15
**Status**: In Progress
**Priority**: Medium
**Related Docs**: 
- `docs/reference/STYLING_MOBILE_PLATFORM_DETECTION.md` - Current mobile detection implementation
- `docs/reference/UNIFIED_LEFT_PANE.md` - ToC tooltip system that needs touch adaptation
- `components/resizable-document-layout.tsx` - Main detection implementation
- `components/heading-tree.tsx` - Tooltip implementation needing touch support

## Summary

Migrate from custom mobile detection to `react-responsive` library to enable touch vs mouse detection and improve device capability handling. This will allow proper adaptation of UI components (especially tooltips) for touch devices.

## Background

### Current State
- Simple width/height-based mobile detection using `window.innerWidth`
- No touch vs mouse detection capability
- Tooltips rely on hover, which doesn't work on touch devices
- Manual resize event handling in multiple components

### Problems
- Cannot differentiate between touch and mouse input
- Tooltips are inaccessible on mobile devices
- Code duplication for device detection logic
- No centralised device state management

### Solution
Adopt `react-responsive` library which provides:
- Touch vs mouse detection via `(hover: hover)` media queries
- Centralised device detection hooks
- Better TypeScript support
- Battle-tested implementation used by 1400+ projects

## Requirements

### Functional Requirements
1. **Touch Detection**: Detect touch vs mouse capabilities to adapt UI behaviors
2. **Centralised State**: Single source of truth for device capabilities
3. **Tooltip Adaptation**: Show info icons for tooltips on touch devices
4. **Responsive Components**: Support declarative responsive rendering
5. **Complete Migration**: Replace all custom detection with library usage

### Technical Requirements
- Install and configure `react-responsive` v10.0.1
- Use library directly without abstraction layers
- Maintain existing breakpoints (640px mobile, 500px landscape)
- Leverage library's TypeScript types

## Design

### Direct Library Usage Pattern
We'll use react-responsive directly in components without creating abstraction layers. This keeps the code simple and leverages the library as intended.

### Basic Usage Examples
```typescript
// In any component that needs device detection
import { useMediaQuery } from 'react-responsive'

function MyComponent() {
  // Viewport detection
  const isMobile = useMediaQuery({ maxWidth: 640 })
  const isLandscape = useMediaQuery({ maxHeight: 500 })
  
  // Touch capability detection
  const canHover = useMediaQuery({ query: '(hover: hover)' })
  const hasTouch = useMediaQuery({ query: '(pointer: coarse)' })
  
  // Use directly in component logic
  return isMobile ? <MobileView /> : <DesktopView />
}
```

### Tooltip Adaptation Pattern
```typescript
// In heading-tree.tsx
import { useMediaQuery } from 'react-responsive'
import { Info } from '@phosphor-icons/react'

function HeadingTree() {
  // Direct media query usage
  const canHover = useMediaQuery({ query: '(hover: hover)' })
  
  // Render appropriate UI based on capabilities
  return (
    <div className="heading-item">
      {canHover ? (
        <Tooltip>
          <TooltipTrigger>{heading.text}</TooltipTrigger>
          <TooltipContent>{summary}</TooltipContent>
        </Tooltip>
      ) : (
        <div className="flex items-center gap-2">
          <span>{heading.text}</span>
          <button 
            onClick={() => showSummaryModal(heading.id)}
            className="touch-info-icon p-1"
            aria-label="Show summary"
          >
            <Info size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
```

### Common Patterns We'll Use
```typescript
// Touch device detection
const isTouchOnly = useMediaQuery({ query: '(hover: none) and (pointer: coarse)' })

// Desktop with mouse
const isDesktopWithMouse = useMediaQuery({ query: '(hover: hover) and (pointer: fine)' })

// High-DPI screens (if needed later)
const isRetina = useMediaQuery({ query: '(min-resolution: 2dppx)' })

// Responsive breakpoints matching our current system
const isMobile = useMediaQuery({ maxWidth: 640 })
const isTablet = useMediaQuery({ minWidth: 641, maxWidth: 1024 })
const isDesktop = useMediaQuery({ minWidth: 1025 })
```

## Implementation Plan

### Stage 1: Setup and Initial Testing ✅
1. Install `react-responsive` package ✅
2. Create a test component to verify media queries work correctly ✅
3. Test touch vs hover detection in browser DevTools ✅
4. Verify SSR compatibility with Next.js ✅

### Stage 2: Migrate ResizableDocumentLayout ✅
1. Replace inline detection with `useMediaQuery` calls ✅
2. Remove manual resize event listeners ✅
3. Update component logic to use library's reactive updates ✅
4. Test auto-collapse behavior ✅

### Stage 3: Adapt Tooltip Components
1. Update `heading-tree.tsx` to use `useMediaQuery` for hover detection
2. Implement info icon pattern for touch devices
3. Add modal/popover for touch-triggered summaries
4. Style info icons with proper touch targets (44px minimum)

### Stage 4: Global Migration
1. Find all mobile detection instances using grep
2. Replace each with direct `useMediaQuery` usage
3. Remove old window.innerWidth checks
4. Update any conditional styling to use library patterns

### Stage 5: Test Updates
1. Run existing tests to identify failures
2. Update test utilities to mock `react-responsive`
3. Add tests for touch detection logic
4. Verify all components work correctly

### Stage 6: Documentation
1. Update `STYLING_MOBILE_PLATFORM_DETECTION.md`
2. Document new patterns and usage
3. Add examples for common scenarios

## Technical Notes

### SSR Handling
`react-responsive` handles SSR automatically with its `defaultMatches` prop. We'll use safe defaults:
```typescript
const isMobile = useMediaQuery({ maxWidth: 640 }, undefined, { defaultMatches: false })
```

### Testing Mock
```typescript
// test-utils/mock-media-query.ts
jest.mock('react-responsive', () => ({
  useMediaQuery: ({ query, maxWidth }) => {
    if (maxWidth === 640) return false // Desktop by default
    if (query === '(hover: hover)') return true
    return false
  }
}))
```

### Performance Considerations
- Media queries are observed, not polled
- React-responsive uses single listener for all queries
- Minimal re-renders due to subscription model

## Success Criteria

1. **Touch Detection Works**: Can differentiate touch vs mouse devices using `(hover: hover)` queries
2. **Tooltips Accessible**: Touch users can access tooltip content via info icons
3. **No Regressions**: All existing responsive behaviors maintained
4. **Tests Pass**: Updated tests cover new functionality
5. **Direct Library Usage**: No unnecessary abstraction layers over react-responsive

## Risks and Mitigations

**Risk**: Breaking existing responsive behavior
**Mitigation**: Thorough testing at each stage, gradual migration

**Risk**: Bundle size increase (~15KB)
**Mitigation**: Library is tree-shakeable, only import what we use

**Risk**: Test complexity increases
**Mitigation**: Create comprehensive mock utilities early

## Future Enhancements

- Add orientation change handling
- Detect reduced motion preferences
- Support dark mode media queries
- Add device capability reporting for analytics