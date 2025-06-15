# Mobile and Platform Detection

This document covers the comprehensive device detection and responsive design system in Spideryarn Reading, including mobile detection, platform identification, touch vs hover capabilities, and responsive layout adaptations.

## See also

- `components/resizable-document-layout.tsx` - Main implementation with react-responsive
- `components/heading-tree.tsx` - Touch-aware tooltips with info icons for mobile
- `components/test-media-query.tsx` - Test component demonstrating react-responsive capabilities
- `app/globals.css` - CSS responsive utilities and mobile-specific styling classes
- `app/test-mobile/page.tsx` - Test page for mobile layout validation and debugging
- `app/test-responsive/page.tsx` - Test page for react-responsive functionality
- `planning/250615a_migrate_to_react_responsive.md` - Migration planning and implementation details
- `docs/reference/STYLING_OVERVIEW.md` - General styling configuration and theme settings
- `docs/reference/UI_INTERFACE.md` - Multi-pane layout architecture and responsive design patterns
- `docs/reference/ARCHITECTURE_OVERVIEW.md` - Overall system architecture including responsive design approach
- [CSS Media Queries Level 4](https://www.w3.org/TR/mediaqueries-4/) - Web standards for interaction media features
- [react-responsive npm](https://www.npmjs.com/package/react-responsive) - Library documentation

## Principles and Key Decisions

**Mobile-first responsive design**: The system detects device capabilities and automatically adapts the interface, prioritising touch-friendly experiences on mobile devices while maintaining full functionality on desktop.

**Progressive enhancement approach**: Server-side defaults with client-side detection to prevent layout shifts and hydration mismatches in Next.js SSR environment.

**Multi-breakpoint strategy**: Uses both pixel-based breakpoints (640px, 1024px) and capability-based detection (touch, hover) for comprehensive device adaptation.

**React-responsive library**: Migrated from manual window.innerWidth detection to react-responsive (v10.0.1) for reactive, performant media query handling with built-in SSR support.

## Current Implementation ✓

### Device Detection Logic

The system uses **react-responsive** library for reactive device detection across components:

```typescript
import { useMediaQuery } from 'react-responsive'

// Mobile detection
const isMobile = useMediaQuery({ maxWidth: 640 })

// Landscape detection  
const isLandscape = useMediaQuery({ maxHeight: 500 })

// Touch capability detection
const canHover = useMediaQuery({ query: '(hover: hover)' })
const hasTouch = useMediaQuery({ query: '(pointer: coarse)' })
```

**Breakpoints**:
- **Mobile**: ≤640px width
- **Landscape mobile**: ≤500px height  
- **Tablet**: 641px - 1024px width
- **Desktop**: >1024px width

**Implementation locations**:
- `components/resizable-document-layout.tsx` - Main responsive layout with auto-collapse logic
- `components/heading-tree.tsx` - Touch-aware tooltips with info icons for mobile
- `components/test-media-query.tsx` - Test component demonstrating all capabilities

### Responsive Layout Adaptations

The system automatically adapts the multi-pane interface based on device detection:

**Mobile adaptations**:
- Left pane auto-collapses on screens ≤640px
- Simplified navigation with modal-style overlays
- Touch-optimised button sizes and spacing
- Reduced text sizes and compact layouts

**Landscape mobile adaptations**:
- Ultra-compact vertical spacing
- Minimised header heights
- Streamlined navigation elements

### CSS Responsive Utilities

Comprehensive responsive styling system in `app/globals.css`:

```css
/* Mobile-first media queries */
@media (max-width: 640px) {
  .mobile-compact { padding: 0.5rem; }
  .mobile-heading-size { font-size: 1.25rem; }
  .mobile-body-text { font-size: 0.875rem; }
}

/* Landscape mobile optimisation */  
@media (max-height: 500px) {
  .landscape-compact { padding: 0.25rem; }
}

/* Tablet breakpoint */
@media (min-width: 641px) and (max-width: 1024px) {
  /* Tablet-specific styles */
}
```

### Platform-Specific Features

**Keyboard shortcuts**: 
- Mac: ⌘+K for command palette
- Windows/Linux: Ctrl+K for command palette
- Platform detection still uses `navigator.platform` for keyboard shortcuts

**Touch/hover adaptation**:
- Desktop: Hover tooltips using Radix UI
- Touch devices: Info icons with modal dialogs
- Detected via `(hover: hover)` media query

**Hydration handling**: Uses `suppressHydrationWarning` to prevent SSR/client detection mismatches in test components.

## Modern Enhancements (Now Implemented) ✓

### Touch vs Hover Detection

The system now uses react-responsive to leverage CSS Media Queries Level 4 for capability-based detection:

```css
/* Hover-capable devices (mouse/trackpad) */
@media (hover: hover) and (pointer: fine) {
  .hover-only { display: block; }
  .tooltip:hover { opacity: 1; }
}

/* Touch devices */  
@media (pointer: coarse) {
  .touch-target { min-height: 44px; }
  .hover-only { display: none; }
}

/* Devices with any hover capability */
@media (any-hover: hover) {
  /* Styles for hybrid devices */
}
```

**Pointer types**:
- `fine` - Mouse, trackpad, stylus (precise pointing)
- `coarse` - Finger touch (less precise)
- `none` - No pointing device

### React-Responsive Implementation ✓

The system now uses react-responsive for all media query needs:

```typescript
import { useMediaQuery } from 'react-responsive'

// Direct usage in components
const isMobile = useMediaQuery({ maxWidth: 640 })
const isTablet = useMediaQuery({ minWidth: 641, maxWidth: 1024 })
const isDesktop = useMediaQuery({ minWidth: 1025 })

// Touch capability detection  
const canHover = useMediaQuery({ query: '(hover: hover)' })
const hasTouch = useMediaQuery({ query: '(pointer: coarse)' })

// High-DPI detection
const isRetina = useMediaQuery({ query: '(min-resolution: 2dppx)' })
```

### Device Context Provider

Centralised device detection across the application:

```typescript
const DeviceContext = createContext({
  isMobile: false,
  isTablet: false,
  isDesktop: false,
  isTouch: false,
  canHover: false,
  platform: 'unknown' as 'mac' | 'windows' | 'linux' | 'unknown'
})
```

## Implementation Patterns

### SSR-Safe Detection ✓

**Problem**: `window` object unavailable during server-side rendering
**Solution**: react-responsive handles SSR automatically with hydration safety

```typescript
// react-responsive provides SSR-safe detection out of the box
const isMobile = useMediaQuery({ maxWidth: 640 })

// For SSR with specific defaults, use the third parameter
const isMobile = useMediaQuery(
  { maxWidth: 640 }, 
  undefined, 
  { defaultMatches: false } // SSR default value
)
```

### Preventing Layout Shifts

**Hydration warnings**: Use `suppressHydrationWarning` for components that render differently on server vs client

**Progressive enhancement**: Start with mobile-safe defaults, enhance with JavaScript

### Touch-Friendly Interactions

**Minimum touch targets**: 44px minimum for iOS accessibility guidelines
**Touch event handling**: Support both touch and mouse events
**Gesture support**: Implement touch-specific gestures where appropriate

## Browser Support

**Media Queries Level 4**: Near-universal support (97%+ global)
**`matchMedia` API**: Excellent support across all modern browsers
**Touch events**: Well-supported with graceful fallbacks

## Testing and Validation

### Test Mobile Page

`app/test-mobile/page.tsx` provides:
- Mobile layout validation
- Touch interaction testing  
- Responsive breakpoint verification
- Platform detection debugging

### Testing Approach

**Device testing**:
- Physical device testing on iOS/Android
- Browser DevTools device simulation
- Responsive design mode testing

**Capability testing**:
- Touch vs mouse interaction verification
- Hover state behaviour validation
- Keyboard shortcut platform detection

## Current Limitations

**Resolved**:
- ✓ Touch vs hover detection (implemented via react-responsive)
- ✓ Screen density/DPI detection (available via react-responsive)
- ✓ SSR hydration safety (handled by react-responsive)

**Remaining limitations**:
- Browser detection utilities (beyond platform detection)
- Device orientation lock detection
- Battery status or connection speed detection

**Edge cases**:
- Hybrid devices with multiple input methods (partially addressed)
- Browser zoom affecting breakpoint detection  
- Device rotation event handling (reactive but not explicitly tracked)

## Future Enhancements 📋

1. ✓ ~~Implement touch/hover CSS media queries~~ (completed with react-responsive)
2. ✓ ~~Create reusable device detection hooks~~ (using react-responsive directly)
3. **Add device context provider** for centralised state management
4. **Enhance gesture support** for document navigation
5. **Implement adaptive loading** based on device capabilities
6. **Add orientation change handling** for better landscape support
7. **Implement reduced motion preferences** for accessibility

## Status Summary

- Device detection logic ✓ (migrated to react-responsive)
- Responsive CSS utilities ✓  
- Platform-specific features ✓
- Auto-adaptive layouts ✓
- SSR-safe implementation ✓
- Touch vs hover detection ✓ (implemented with react-responsive)
- Enhanced media query hooks ✓ (using react-responsive)
- Device context provider 📋 (future enhancement)
- Touch-aware UI components ✓ (tooltips adapt to touch devices)

## Appendix: Mobile Detection Best Practices Research (2024)

This appendix documents research conducted on 15 June 2025 regarding current best practices for mobile detection in React applications and touch interaction support for UI components.

### React Mobile Detection Best Practices

Based on community research and library analysis, the following approaches are recommended for mobile detection in React applications:

#### 1. Custom useMediaQuery Hook

The most performant approach leverages the `window.matchMedia` API:

```javascript
const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false)
  
  useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    const handleChange = (event) => setMatches(event.matches)
    
    // Set initial value
    setMatches(mediaQuery.matches)
    
    // Listen for changes
    mediaQuery.addEventListener('change', handleChange)
    
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [query])
  
  return matches
}
```

**Key benefits**:
- Observes document for media query changes instead of polling
- Optimised performance using 'change' event
- React 18+ can use `useSyncExternalStore` for better integration

#### 2. Library Options

**react-responsive** (Recommended):
- Version: 10.0.1 (as of 2024)
- 1400+ projects using it in production
- Well-maintained with TypeScript support
- Installation: `npm i react-responsive`

**Material-UI useMediaQuery**:
- Integrated with MUI theme system
- Supports SSR with hydration handling
- Includes testing utilities

#### 3. Common Mobile Detection Patterns

```javascript
// Basic breakpoints
const isMobile = useMediaQuery('(max-width: 768px)')
const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 992px)')
const isDesktop = useMediaQuery('(min-width: 993px)')

// Advanced detection
const isRetina = useMediaQuery('(min-resolution: 2dppx)')
const isPortrait = useMediaQuery('(orientation: portrait)')
const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
```

#### 4. Server-Side Rendering Considerations

For SSR environments like Next.js:

```javascript
const useMediaQuery = (query, defaultMatches = false) => {
  const [matches, setMatches] = useState(defaultMatches)
  
  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') return
    
    const mediaQuery = window.matchMedia(query)
    setMatches(mediaQuery.matches)
    // ... rest of implementation
  }, [query])
  
  return matches
}
```

**Double-render solution**: First render with `defaultMatches` (server value), second render with resolved client value. Trade-off: slower but prevents hydration mismatches.

#### 5. Testing Considerations

- jsdom doesn't support `matchMedia` by default
- Use `css-mediaquery` polyfill for testing
- Mock `window.matchMedia` in test environment

### Touch Interaction Support Research

#### Radix UI Tooltip Limitations

Research into Radix UI tooltip capabilities reveals significant limitations for mobile/touch interfaces:

**Key findings**:
1. **No touch support**: Radix tooltips are designed for hover/focus only (WAI-ARIA compliance)
2. **Expected behaviour**: The Radix team considers lack of touch support as "expected behavior"
3. **No long press**: No built-in support for long press triggers
4. **Mobile incompatibility**: Tooltips won't open on tap/touch events

**Radix team recommendations**:
- Use **Toggletip pattern** for click-based interactions
- Consider **Popover component** for mobile-friendly alternatives
- Implement custom solutions for touch-specific needs

#### Alternative Patterns for Mobile Tooltips

1. **Info Icon Approach** (Recommended):
   - Add visible (i) icon next to interactive elements
   - Tap icon to show information in modal/popover
   - Clear visual affordance for touch users
   - Better accessibility and discoverability

2. **Custom Long Press Implementation**:
   - Requires manual touch event handling
   - Track touch duration with timers
   - Show custom modal/popover (not Radix Tooltip)
   - Complex implementation with potential issues

3. **Hybrid Approach**:
   - Desktop: Hover tooltips with Radix UI
   - Mobile: Tap-based info icons or popovers
   - Detected via media queries or touch capability

### Recommendations for Spideryarn

Based on this research:

1. **Implement custom useMediaQuery hook** for consistent mobile detection
2. **Use info icon pattern** for mobile tooltip alternatives
3. **Consider react-responsive** if more complex responsive logic needed
4. **Avoid Radix tooltips on mobile** - use Popover or Dialog instead
5. **Test with real devices** and browser DevTools device mode

### Resources

- [useHooks useMediaQuery](https://usehooks.com/usemediaquery)
- [Material-UI Media Queries](https://mui.com/material-ui/react-use-media-query/)
- [react-responsive npm](https://www.npmjs.com/package/react-responsive)
- [Radix UI Tooltip Docs](https://www.radix-ui.com/primitives/docs/components/tooltip)
- [Radix UI GitHub Issues #2589](https://github.com/radix-ui/primitives/issues/2589) - Touch support discussion
- [CSS Media Queries Level 4](https://www.w3.org/TR/mediaqueries-4/) - Latest spec