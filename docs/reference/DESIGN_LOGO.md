# Logo Animations

✓ Comprehensive logo animation system with shared definitions and random selection for header interactivity.

## See also

- `lib/animations/logo-animations.ts` - Single source of truth for all logo animation definitions
- `components/ui/random-logo-animation.tsx` - Component that randomly selects animations on hover
- `app/design/logoplay/page.tsx` - Visual playground showcasing all logo animations
- `styles/logo-animations.css` - CSS implementations of all logo animations
- `components/app-header.tsx` - Header implementation using RandomLogoAnimation
- `docs/reference/DESIGN_OVERVIEW.md` - General styling and CSS configuration

## Overview

The logo animation system provides delightful hover interactions for the Spideryarn logo throughout the application. The system is designed around **single source of truth** principles to eliminate code duplication and ensure consistency between the visual playground and the live header implementation.

## Architecture

### Shared Animation Registry

All logo animations are defined in `lib/animations/logo-animations.ts` as a single, typed array:

```typescript
export const LOGO_ANIMATIONS: readonly LogoAnimation[] = [
  {
    id: 'highlight-sweep',
    name: 'Highlight Sweep',
    description: 'Highlighter effect sweeps across text like marking important passages',
    cssClass: 'highlight-sweep-animation'
  },
  // ... 14 more animations
] as const
```

This registry serves as the canonical source for:
- Animation metadata (names, descriptions)
- CSS class mappings
- Type definitions
- Random selection pools

### Component Architecture

**RandomLogoAnimation Component** (`components/ui/random-logo-animation.tsx`):
- Wraps any logo implementation
- Picks random animation on each hover
- Applies CSS classes dynamically
- Type-safe with shared definitions

**Logo Playground** (`app/design/logoplay/page.tsx`):
- Visual showcase of all animations
- Data-driven using shared registry
- Includes "Original" reference for comparison
- Automatic updates when animations added/removed

### CSS Implementation

**Shared Styles** (`styles/logo-animations.css`):
- All 15 logo animations with complete keyframes
- Infinite looping during hover
- Optimized for performance
- Globally imported via `app/globals.css`

## Animation Types

The system includes 15 distinct animations categorized by theme:

### Document Processing
- **Highlight Sweep**: Highlighter effect like marking research passages
- **Scanner Line**: OCR-style scanning for document analysis
- **Document Parse**: Hierarchical structure analysis
- **Format Convert**: Document transformation effects

### Text Interaction
- **Elastic Stretch**: Subtle stretching with smooth timing
- **Letter Shuffle**: Random shuffling and reorganization

### Web/Spider Theme
- **Strand Pulse**: Radiating pulses like plucked web strings
- **Web Threading**: Lines connecting logo to letters

### AI Features
- **Entity Highlight**: Sequential highlighting like glossary generation
- **Glossary Builder**: Definition bubbles around letters
- **Semantic Search**: Search pattern highlighting with ID tags
- **Content Cascade**: Intelligent data flow waves
- **Granularity Shift**: Multi-level detail transitions

### Premium Effects
- **Warm Glow Pulse**: Sophisticated orange glow with academic elegance
- **Silk Shimmer Sweep**: Premium gradient shimmer effect

## Usage Patterns

### Adding New Animations

1. **Define the animation** in `lib/animations/logo-animations.ts`:
```typescript
{
  id: 'new-animation',
  name: 'New Animation',
  description: 'Description of the effect',
  cssClass: 'new-animation-class'
}
```

2. **Implement CSS** in `styles/logo-animations.css`:
```css
.new-animation-class .logo-letter {
  animation: newAnimationKeyframes 2s infinite;
}

@keyframes newAnimationKeyframes {
  0% { /* start state */ }
  100% { /* end state */ }
}
```

3. **Test** in both locations:
   - Header: Random selection will automatically include new animation
   - Playground: New item will appear automatically in grid

### Removing Animations

1. **Remove from registry** in `lib/animations/logo-animations.ts`
2. **Clean up CSS** in `styles/logo-animations.css` (optional but recommended)
3. Both implementations update automatically

### Modifying Animations

1. **Update metadata** in registry if changing name/description
2. **Update CSS** for visual changes
3. No component changes needed

## Implementation Details

### Logo Structure Requirements

Animations expect specific CSS classes on logo elements:

```tsx
<div className="animation-class">
  <img className="logo-image" src="/spideryarn-logo.png" />
  <span className="logo-text">
    {"Spideryarn".split("").map((letter, index) => (
      <span key={index} className="logo-letter">{letter}</span>
    ))}
  </span>
</div>
```

### Animation Timing

- **Base duration**: Most animations run 2-3 seconds
- **Hover acceleration**: Faster timing when actively hovering
- **Infinite looping**: Continues while hover persists
- **Staggered letters**: Individual letter delays for wave effects

### Performance Considerations

- **CSS-only animations**: Maximum performance, no JavaScript overhead
- **Single CSS file**: All animations bundled together
- **Tree-shaking friendly**: TypeScript ensures type safety
- **Global styles**: Loaded once, available everywhere

## Key Design Decisions

### Single Source of Truth
Animations defined once in TypeScript registry, consumed by both playground and header component. This eliminates duplication and ensures consistency.

### CSS-First Approach
Pure CSS animations for maximum performance. No React component overhead or JavaScript animation libraries.

### Zero Configuration
Animations work immediately without props or configuration. Each animation is pre-tuned for optimal visual effect.

### Professional Academic Aesthetic
All animations designed to delight without distracting from the serious academic software context.

## Troubleshooting

### Animation Not Appearing
1. Check CSS class name matches registry definition
2. Verify `styles/logo-animations.css` is imported in `globals.css`
3. Ensure logo structure includes required classes (`logo-image`, `logo-text`, `logo-letter`)

### Performance Issues
1. Animations use CSS transforms and opacity for best performance
2. Avoid adding JavaScript-based animations to this system
3. Complex animations are optimized with `will-change` hints where needed

### Visual Inconsistencies
1. All animations share base styles for consistent behavior
2. Letter spacing and font properties inherited from parent
3. Colors use CSS custom properties for theme consistency

## Future Enhancements

Potential improvements while maintaining current architecture:

- **Animation categories**: Group by intensity/professionalism level
- **User preferences**: Remember preferred animation or disable option
- **Seasonal variations**: Special animations for holidays/events
- **Performance metrics**: Monitor animation impact on page performance

## Appendix

### Complete Animation List

Current registry includes 15 animations:
1. Highlight Sweep
2. Scanner Line  
3. Elastic Stretch
4. Warm Glow Pulse
5. Silk Shimmer Sweep
6. Strand Pulse
7. Web Threading
8. Entity Highlight
9. Glossary Builder
10. Document Parse
11. Format Convert
12. Semantic Search
13. Letter Shuffle
14. Content Cascade
15. Granularity Shift

### CSS Architecture

Animation styles organized by complexity:
- **Base styles**: Common properties for all animations
- **Simple effects**: Highlight, scanner, glow
- **Letter animations**: Individual character manipulation
- **Complex effects**: Multi-element choreography
- **Themed animations**: AI/academic feature representations