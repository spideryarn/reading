# Mobile and Platform Detection

This document covers the comprehensive device detection and responsive design system in Spideryarn Reading, including mobile detection, platform identification, touch vs hover capabilities, and responsive layout adaptations.

## See also

- `components/resizable-document-layout.tsx` - Main implementation of device detection and responsive layout logic
- `app/globals.css` - CSS responsive utilities and mobile-specific styling classes
- `app/test-mobile/page.tsx` - Test page for mobile layout validation and debugging
- `docs/reference/STYLING_OVERVIEW.md` - General styling configuration and theme settings
- `docs/reference/UI_INTERFACE.md` - Multi-pane layout architecture and responsive design patterns
- `docs/reference/ARCHITECTURE_OVERVIEW.md` - Overall system architecture including responsive design approach
- [CSS Media Queries Level 4](https://www.w3.org/TR/mediaqueries-4/) - Web standards for interaction media features

## Principles and Key Decisions

**Mobile-first responsive design**: The system detects device capabilities and automatically adapts the interface, prioritising touch-friendly experiences on mobile devices while maintaining full functionality on desktop.

**Progressive enhancement approach**: Server-side defaults with client-side detection to prevent layout shifts and hydration mismatches in Next.js SSR environment.

**Multi-breakpoint strategy**: Uses both pixel-based breakpoints (640px, 1024px) and capability-based detection (touch, hover) for comprehensive device adaptation.

## Current Implementation ✓

### Device Detection Logic

The system implements comprehensive device detection in `components/resizable-document-layout.tsx`:

```typescript
// Mobile detection
const isMobile = window.innerWidth <= 640

// Landscape detection  
const isLandscape = window.innerHeight <= 500

// Platform detection (for keyboard shortcuts)
const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
```

**Breakpoints**:
- **Mobile**: ≤640px width
- **Landscape mobile**: ≤500px height  
- **Tablet**: 641px - 1024px width
- **Desktop**: >1024px width

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

**Hydration handling**: Uses `suppressHydrationWarning` to prevent SSR/client detection mismatches.

## Modern Enhancements (Available but Not Implemented)

### Touch vs Hover Detection

Modern CSS Media Queries Level 4 provide capability-based detection:

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

### Enhanced Media Query Hook

Reusable hook for responsive design:

```typescript
'use client'
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState<boolean | null>(null)
  
  useEffect(() => {
    const mediaQueryList = window.matchMedia(query)
    const handleChange = (e: MediaQueryListEvent) => setMatches(e.matches)
    
    mediaQueryList.addEventListener('change', handleChange)
    setMatches(mediaQueryList.matches)
    
    return () => mediaQueryList.removeEventListener('change', handleChange)
  }, [query])
  
  return matches
}
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

### SSR-Safe Detection

**Problem**: `window` object unavailable during server-side rendering
**Solution**: Client-side detection with fallback defaults

```typescript
const [isMobile, setIsMobile] = useState(false) // Safe default

useEffect(() => {
  const checkMobile = () => setIsMobile(window.innerWidth <= 640)
  checkMobile()
  window.addEventListener('resize', checkMobile)
  return () => window.removeEventListener('resize', checkMobile)
}, [])
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

**Missing capabilities**:
- Touch vs hover detection (CSS-only, no JavaScript API)
- Browser detection utilities
- Screen density/DPI detection
- Device orientation lock detection

**Edge cases**:
- Hybrid devices with multiple input methods
- Browser zoom affecting breakpoint detection  
- Device rotation event handling

## Future Enhancements 📋

1. **Implement touch/hover CSS media queries** for better touch UX
2. **Create reusable device detection hooks** to replace inline checks
3. **Add device context provider** for centralised state management
4. **Enhance gesture support** for document navigation
5. **Implement adaptive loading** based on device capabilities

## Status Summary

- Device detection logic ✓
- Responsive CSS utilities ✓  
- Platform-specific features ✓
- Auto-adaptive layouts ✓
- SSR-safe implementation ✓
- Touch vs hover detection 📋
- Enhanced media query hooks 📋
- Device context provider 📋