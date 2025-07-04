# Tooltip Styling

Comprehensive guide to tooltip styling patterns and implementations in the Spideryarn Reading application.

## See also

- `components/ui/tooltip.tsx` - shadcn/ui tooltip component implementation
- `docs/reference/DESIGN_OVERVIEW.md` - General styling system overview
- `docs/reference/DESIGN_COLORS_FONTS.md` - Colour palette and typography system
- `docs/reference/DESIGN_ICONS.md` - Icon usage patterns and conventions
- `docs/reference/DESIGN_SHADCN_UI_REFERENCE.md` - shadcn/ui component reference
- `docs/reference/DESIGN_MOBILE_PLATFORM_DETECTION.md` - Touch device detection and responsive patterns
- `components/ui/tooltip-or-popover.tsx` - Universal touch-friendly tooltip component
- `lib/hooks/use-can-hover.ts` - Device hover capability detection
- `lib/hooks/use-long-press.ts` - Touch long-press interaction hook
- `docs/planning/finished/250526a_ToC_hierarchical_summary_tooltips.md` - Historical decision context for ToC tooltip implementation
- `docs/planning/250616a_tooltip_or_popover_hybrid.md` - TooltipOrPopover implementation planning and testing
- `components/table-of-contents-tabs.tsx` - Default tooltip pattern implementation
- `components/unified-left-pane.tsx` - Search result tooltip implementations
- `components/heading-tree.tsx` - Hierarchical heading tooltip usage
- `components/vertical-icon-nav.tsx` - Navigation tooltip patterns
- `docs/reference/TOOL_READING_DIFFICULTY.md` - Academic level tooltips implementation example

## Principles & key decisions  (2025-06 tooltip overhaul)

The **TooltipOrPopover** component is now the *only* supported way to render tooltips across the application.  Key guarantees:

1. **Universal Device Support** – Desktop hover + focus, touch long-press, pen input – all handled automatically.
2. **Single-tooltip rule** – At most one tooltip can be open at a time (managed by `TooltipManager`).
3. **Predictable timing** – Hover delay ≈ 200 ms, long-press delay ≈ 500 ms.
4. **No pop-back-up after click** – Mouse clicks close the tooltip and suppress hover reopening for 300 ms.
5. **Visual Consistency** – Popover (touch) and Tooltip (hover) share identical styling.
6. **Radix UI Foundation** – Built on Radix `Popover`; hover mode re-uses the same primitive for reduced bundle size.
7. **Accessibility** – ARIA roles, ESC to close, keyboard focus, screen-reader descriptions – all handled by Radix.
8. **Performance-minded** – Lightweight listeners, timers cleaned up on unmount.

Anything outside `TooltipOrPopover` is considered *deprecated* and will be removed in future clean-ups.

## When to Use Which Pattern

**Default Choice**: Use **TooltipOrPopover** for all tooltips to ensure touch device compatibility. This provides clean, consistent styling and follows universal device support patterns.

**Use TooltipOrPopover when:**
- Any tooltip content (this is the universal choice for new development)
- Need touch device support with long-press interaction
- Want consistent cross-device experience
- Following modern accessibility patterns
- Navigation tooltips, content summaries, help text

**Use Direct Tooltip Component when:**
- Legacy components not yet migrated
- Specific desktop-only scenarios (rare)
- Custom tooltip behaviour needed

**Rich Content Override**: 
- Content itself can include custom styling containers for special cases
- ToC summaries use white containers with markdown rendering
- Loading/error states use custom styled containers
- This approach separates content styling from tooltip wrapper styling

**Special State Patterns** (loading, error, dark) are handled by the content itself, not the tooltip wrapper.

## Tooltip Component Architecture

### TooltipOrPopover Component (`components/ui/tooltip-or-popover.tsx`) ✓ **PREFERRED FOR ALL NEW DEVELOPMENT**

**Universal component for cross-device tooltips** (replaces direct tooltip usage for touch compatibility):

```tsx
import { TooltipOrPopover } from '@/components/ui/tooltip-or-popover'

<TooltipOrPopover
  content={<div>Tooltip content</div>}
  side="right"
  align="start"
  sideOffset={4}
  showIndicator={true}
  contentClassName="p-0 bg-transparent border-0 shadow-none"
>
  <button>Trigger element</button>
</TooltipOrPopover>
```

**Key Features:**
- **Cross-device compatibility**: Tooltip on desktop hover, popover on touch long-press
- **Visual consistency**: Identical appearance across devices using same Radix styling
- **Touch accessibility**: 500ms long-press triggers popover on touch devices
- **Device detection**: Uses robust `(hover: hover)` and `(pointer: fine)` media queries via useCanHover hook
- **Discoverability**: Optional faint dotted underline (`showIndicator={true}`) in Spideryarn orange
- **Movement cancellation**: Long-press cancelled if user moves >10px (prevents accidental triggers while scrolling)
- **Context menu prevention**: Blocks OS context menus during long-press interaction
- **Memory safe**: Automatic timer cleanup on component unmount

### Base Component (`components/ui/tooltip.tsx`)

The shadcn/ui tooltip component provides the foundation (used internally by TooltipOrPopover for desktop mode):

```tsx
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'

<Tooltip>
  <TooltipTrigger>Hover me</TooltipTrigger>
  <TooltipContent>
    Tooltip content
  </TooltipContent>
</Tooltip>
```

**Standard Framework Features:**
- Built on Radix UI primitives for accessibility
- Animation: Fade and zoom transitions with directional slides
- Arrow: Automatic positioning with theme-matched colours
- Typography: `text-xs` with balanced text wrapping
- Z-index: `z-50` for proper layering

**Note**: The default styling uses shadcn/ui component defaults for clean, minimal appearance. Rich content can override with custom styling as needed. For cross-device compatibility, use TooltipOrPopover instead of direct tooltip usage.

## Styling Patterns

### 1. Default Clean Theme ✓ (STANDARD)

**Usage**: All tooltips including ToC-heading summaries, navigation tooltips, and detailed information (this is our default)

```tsx
<TooltipContent>
  <div className="max-w-md p-4 text-xs text-gray-700 leading-relaxed bg-white border border-gray-200 rounded-lg shadow-lg">
    Detailed content...
  </div>
</TooltipContent>
```

**Styling Characteristics (Standard Pattern):**
- Uses shadcn/ui default tooltip styling for clean, minimal appearance
- Background: `bg-white`
- Text: `text-gray-700`
- Padding: `p-4` (generous for readability)
- Border: `border border-gray-200`
- Border radius: `rounded-lg`
- Shadow: `shadow-lg`
- Arrow: `fill-gray-200` (matches border)

**For Rich Content (ToC summaries):**
Content returned by `getTooltipContent()` can override styling with custom containers:
```tsx
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown"
import remarkGfm from "remark-gfm"

<div className="max-w-md p-4 text-sm bg-white border border-gray-200 rounded-lg shadow-lg">
  <div className="prose prose-sm prose-gray max-w-none">
    <MarkdownTextPrimitive content={content} remarkPlugins={[remarkGfm]} />
  </div>
</div>
```

### 2. Simple Primary Theme ✓ (Optional)

**Usage**: Extremely brief tooltips (e.g. single-word icon labels) where the primary orange theme is desired.

```tsx
<TooltipContent>
  Simple tooltip text
</TooltipContent>
```

**Styling Characteristics:**
- Background: `bg-primary` (Spideryarn orange, legacy optional)
- Text: `text-primary-foreground` (white text)
- Padding: `px-3 py-1.5`
- Font: `text-xs`
- Border radius: `rounded-md`
- Arrow: `bg-primary fill-primary`

### 3. Loading State Pattern ✓

**Usage**: Async operations, AI content generation

```tsx
<div className="max-w-md p-4 text-sm bg-white border border-gray-200 rounded-lg shadow-lg">
  <div className="flex items-center space-x-3">
    <CircleNotch size={16} className="animate-spin text-blue-500" />
    <span className="text-gray-700 font-medium">Loading...</span>
  </div>
</div>
```

**Styling Characteristics:**
- Spinner: `CircleNotch` with `animate-spin` and `text-blue-500`
- Layout: `flex items-center space-x-3`
- Text: `text-gray-700 font-medium`
- Animation duration: Custom `2s` for slower, more subtle animation

### 4. Error/Warning State Pattern ✓

**Usage**: Failed operations, warnings

```tsx
<div className="max-w-md p-4 text-sm bg-amber-50 border border-amber-200 rounded-lg shadow-lg">
  <div className="flex items-center space-x-3">
    <CircleNotch size={16} className="text-amber-600" />
    <span className="text-amber-800 font-medium">Error message</span>
  </div>
</div>
```

**Styling Characteristics:**
- Background: `bg-amber-50`
- Border: `border-amber-200`
- Icon: `text-amber-600`
- Text: `text-amber-800 font-medium`

### 5. Dark Theme Pattern ✓

**Usage**: Tweet cards, dark UI elements

```tsx
<TooltipContent className="bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg">
  Dark themed content
  <TooltipArrow className="fill-gray-900" />
</TooltipContent>
```

**Styling Characteristics:**
- Background: `bg-gray-900`
- Text: `text-white`
- Padding: `px-2 py-1` (more compact)
- Arrow: `fill-gray-900`

## Typography Patterns

### Navigation Tooltips

Multi-level information hierarchy using TooltipOrPopover component:

```tsx
import { TooltipOrPopover } from '@/components/ui/tooltip-or-popover'

<TooltipOrPopover
  content={
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
      <div className="font-semibold text-gray-900 text-sm mb-1">
        Title
      </div>
      <div className="text-gray-700 text-sm leading-relaxed mb-2">
        Description
      </div>
      <div className="text-xs text-gray-500 font-mono">
        Keyboard shortcut
      </div>
    </div>
  }
  side="right"
  align="center"
  sideOffset={8}
  showIndicator={false}
  contentClassName="p-0 bg-transparent border-0 shadow-none"
>
  <Button>{/* button content */}</Button>
</TooltipOrPopover>
```

**Typography Hierarchy:**
1. **Title**: `font-semibold text-gray-900 text-sm`
2. **Description**: `text-gray-700 text-sm leading-relaxed`
3. **Meta information**: `text-xs text-gray-500 font-mono`

### Content Tooltips

Rich content with markdown support:

```tsx
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown"
import remarkGfm from "remark-gfm"

<div className="max-w-md p-4 text-sm bg-white border border-gray-200 rounded-lg shadow-lg">
  <div className="prose prose-sm prose-gray max-w-none">
    <MarkdownTextPrimitive content={content} remarkPlugins={[remarkGfm]} />
  </div>
</div>
```

**Features:**
- Prose styling: `prose prose-sm prose-gray max-w-none`
- Markdown rendering support
- Constrained width: `max-w-md`

## Positioning Patterns

### Standard Positioning

Most tooltips use consistent positioning:

```tsx
<TooltipContent 
  side="right"
  align="start"
  sideOffset={4}
  className="z-50 max-w-md"
>
```

**Common Properties:**
- **Side**: `"right"` (most common), `"top"`, `"bottom"`, `"left"`
- **Align**: `"start"`, `"center"`, `"end"`
- **Side offset**: `4px` or `8px`
- **Z-index**: `z-50` for proper layering
- **Max width**: `max-w-md` for content readability

### Context-Aware Positioning

Search result tooltips adapt to available space:

```tsx
<TooltipContent 
  side="right" 
  sideOffset={8}
  className="max-w-md text-left"
>
```

## Animation Patterns

### Default Animations ✓

Built into shadcn/ui tooltip:

- **Entry**: `animate-in fade-in-0 zoom-in-95`
- **Exit**: `data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95`
- **Directional slides**: `data-[side=bottom]:slide-in-from-top-2` etc.

### Custom Loading Animations

```tsx
<CircleNotch 
  size={16} 
  className="animate-spin text-blue-500" 
  style={{ animationDuration: '2s' }} 
/>
```

**Custom Properties:**
- Slower rotation: `2s` duration instead of default
- Colour coordination: `text-blue-500` for loading states

### Pulse Animations

```tsx
<div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
```

Used for "hover to load" states.

## Arrow Styling

### Default Arrow (Primary Theme)

```tsx
<TooltipArrow className="bg-primary fill-primary z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" />
```

### Custom Arrow (White Theme)

```tsx
<Tooltip.Arrow 
  className="fill-gray-200" 
  width={12} 
  height={6}
/>
```

**Properties:**
- **Colour**: Matches tooltip background (`fill-gray-200`, `fill-gray-900`)
- **Size**: `12x6` or `size-2.5` (10px)
- **Positioning**: Automatic via Radix UI

## TooltipOrPopover Usage Guide

### Complete API Reference

```tsx
interface TooltipOrPopoverProps {
  children: React.ReactNode          // Trigger element
  content: React.ReactNode           // Tooltip/popover content
  side?: 'top' | 'right' | 'bottom' | 'left'  // Positioning
  align?: 'start' | 'center' | 'end' // Alignment
  sideOffset?: number                // Distance from trigger (default: 4)
  showIndicator?: boolean            // Dotted underline hint (default: true)
  triggerClassName?: string          // CSS classes for trigger wrapper
  contentClassName?: string          // CSS classes for content container
}
```

### Device Detection Behavior

**Desktop (hover-capable devices):**
- Detected via `(hover: hover)` AND `(pointer: fine)` media queries
- Renders standard Radix Tooltip with hover activation
- Focus-based activation also available for keyboard users
- Instant show/hide on hover/focus changes

**Touch devices:**
- Detected when hover/fine-pointer capabilities absent
- Renders Radix Popover with long-press activation
- 500ms delay before popover shows
- Movement >10px cancels long-press (prevents accidental triggers while scrolling)
- Tap outside or scroll away dismisses popover

### Content Styling Patterns

**Option 1: Custom Content Container (Recommended)**
```tsx
<TooltipOrPopover
  content={
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
      <h3 className="font-semibold text-gray-900 mb-2">Title</h3>
      <p className="text-gray-700 text-sm">Description content</p>
    </div>
  }
  contentClassName="p-0 bg-transparent border-0 shadow-none"
  showIndicator={false}
>
  <Button>Trigger</Button>
</TooltipOrPopover>
```

**Option 2: Default Wrapper Styling**
```tsx
<TooltipOrPopover content="Simple tooltip text">
  <Button>Trigger</Button>
</TooltipOrPopover>
```

### Navigation Tooltip Pattern

```tsx
<TooltipOrPopover
  content={
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
      <div className="font-semibold text-gray-900 text-sm mb-1">
        Summary
      </div>
      <div className="text-gray-700 text-sm leading-relaxed mb-2">
        Read hierarchical summaries at different detail levels
      </div>
      <div className="text-xs text-gray-500 font-mono">
        Press Cmd+B to toggle sidebar
      </div>
    </div>
  }
  side="right"
  align="center"
  sideOffset={8}
  showIndicator={false}
  contentClassName="p-0 bg-transparent border-0 shadow-none"
>
  <Button aria-label="Summary: Read hierarchical summaries">
    <BookOpen size={20} />
  </Button>
</TooltipOrPopover>
```

### Search Result Tooltip Pattern

```tsx
<TooltipOrPopover
  content={
    <div className="max-w-md p-4 text-sm bg-white border border-gray-200 rounded-lg shadow-lg">
      <div className="text-gray-600 leading-relaxed">
        Full paragraph context containing the search term with proper highlighting...
      </div>
    </div>
  }
  side="right"
  sideOffset={8}
  showIndicator={false}
  contentClassName="p-0 bg-transparent border-0 shadow-none"
>
  <span className="search-result-snippet">Search result...</span>
</TooltipOrPopover>
```

### Loading State Integration

```tsx
const [isLoading, setIsLoading] = useState(false)
const [content, setContent] = useState('')

const getTooltipContent = () => {
  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
        <div className="flex items-center space-x-3">
          <CircleNotch size={16} className="animate-spin text-blue-500" />
          <span className="text-gray-700 font-medium">Loading...</span>
        </div>
      </div>
    )
  }
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
      <div className="text-gray-700 text-sm leading-relaxed">{content}</div>
    </div>
  )
}

<TooltipOrPopover
  content={getTooltipContent()}
  contentClassName="p-0 bg-transparent border-0 shadow-none"
  onTrigger={() => setIsLoading(true)}
>
  <Button>AI Summary</Button>
</TooltipOrPopover>
```

### Implementation Best Practices

**DO:**
- Use `contentClassName="p-0 bg-transparent border-0 shadow-none"` when content has its own container styling
- Set `showIndicator={false}` for buttons and interactive elements that already have clear affordances
- Provide comprehensive `aria-label` attributes for navigation buttons
- Test on both desktop and touch devices
- Use consistent content styling patterns across similar tooltip types

**DON'T:**
- Nest TooltipOrPopover components
- Use with elements that already have click handlers (may interfere with long-press)
- Forget to handle loading/error states in dynamic content
- Override device detection behavior without good reason
- Use overly complex animations in tooltip content

## Migration Guide

### Migrating from Radix Tooltips to TooltipOrPopover

**Before (old pattern):**
```tsx
import * as Tooltip from '@radix-ui/react-tooltip'

<Tooltip.Provider delayDuration={600}>
  <Tooltip.Root>
    <Tooltip.Trigger asChild>
      <Button>Trigger</Button>
    </Tooltip.Trigger>
    <Tooltip.Portal>
      <Tooltip.Content side="right" className="z-50 max-w-xs">
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          Tooltip content
        </div>
        <Tooltip.Arrow className="fill-gray-200" />
      </Tooltip.Content>
    </Tooltip.Portal>
  </Tooltip.Root>
</Tooltip.Provider>
```

**After (new pattern):**
```tsx
import { TooltipOrPopover } from '@/components/ui/tooltip-or-popover'

<TooltipOrPopover
  content={
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
      Tooltip content
    </div>
  }
  side="right"
  sideOffset={8}
  showIndicator={false}
  contentClassName="p-0 bg-transparent border-0 shadow-none"
>
  <Button>Trigger</Button>
</TooltipOrPopover>
```

**Migration benefits:**
- Touch device compatibility with long-press
- Reduced code complexity
- Consistent cross-device experience
- No need for Provider wrapping

## Implementation Examples

### Cross-Device Content Tooltip (Recommended Pattern)

```tsx
import { TooltipOrPopover } from '@/components/ui/tooltip-or-popover'

<TooltipOrPopover
  content={
    <div className="max-w-md p-4 text-sm bg-white border border-gray-200 rounded-lg shadow-lg">
      <div className="text-xs text-gray-700 leading-relaxed">
        Content summary or detailed information...
      </div>
    </div>
  }
  side="right"
  sideOffset={8}
  showIndicator={true}
  contentClassName="p-0 bg-transparent border-0 shadow-none"
>
  <button>Table of Contents Heading</button>
</TooltipOrPopover>
```

### Simple Icon Tooltip (Cross-Device)

```tsx
import { TooltipOrPopover } from '@/components/ui/tooltip-or-popover'
import { Info } from '@phosphor-icons/react'

<TooltipOrPopover content="Brief information">
  <Info size={16} />
</TooltipOrPopover>
```

## Accessibility Features

### Built-in Accessibility ✓

Radix UI provides comprehensive accessibility for both tooltip and popover modes:

- **ARIA attributes**: Automatic `aria-describedby`, `role="tooltip"` (desktop) and `aria-expanded` (touch)
- **Keyboard navigation**: ESC to close, focus management, Tab navigation through triggers
- **Screen reader support**: Proper semantic markup and content announcements
- **Focus management**: Focus remains on trigger, clear focus indicators
- **Touch accessibility**: 44px minimum touch targets, long-press interaction
- **Device detection**: Appropriate interaction mode based on device capabilities

### Custom Accessibility Enhancements

```tsx
<TooltipOrPopover 
  content="Extended tooltip content"
  showIndicator={true}
>
  <button aria-label="Detailed information">
    <Info size={16} />
  </button>
</TooltipOrPopover>
```

**Accessibility Features:**
- `aria-label` on trigger provides screen reader context
- `showIndicator={true}` adds visual discoverability hint
- Built-in focus management for keyboard users
- Long-press interaction doesn't interfere with assistive technology

## Performance Considerations

### Tooltip Provider Optimization

The shadcn/ui component automatically wraps each tooltip in a provider:

```tsx
function Tooltip({ ...props }) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root {...props} />
    </TooltipProvider>
  )
}
```

### Content Caching

For dynamic content (AI summaries, search results):

```tsx
const [contentCache, setContentCache] = useState<Map<string, string>>(new Map())

const getCachedContent = (key: string) => {
  if (contentCache.has(key)) {
    return contentCache.get(key)
  }
  // Load content async
}
```

## Common Patterns

### 1. ToC Summary Tooltips (Default Standard)

- Light background with subtle grey border (`bg-white border-gray-200`)
- Generous padding for readability (`p-4`)
- Grey arrow pointing to element (`fill-gray-200`)
- AI-generated content with markdown support
- Right-side positioning with offset
- Maximum width constraint (`max-w-md`)

### 2. Search Result Tooltips

- Uses default light theme pattern
- Context-aware content with highlighting
- Same styling as ToC tooltips for consistency

### 3. Navigation Tooltips

- Structured information (title, description, shortcut)
- Uses default light theme pattern
- Consistent typography hierarchy

### 4. Simple Icon Tooltips

- Primary orange theme for brevity
- Minimal content
- Standard positioning
- Quick show/hide

## Future Considerations

### Planned Enhancements 📋

- **Dark mode support**: Extend default light theme for dark mode variants
- **Enhanced touch feedback**: Visual feedback during long-press delay
- **Performance monitoring**: Track tooltip render performance across devices
- **Content size limits**: Automatic truncation for very long content
- **Theme consistency**: Ensure all tooltips follow default light pattern unless specifically required
- **Migration completion**: Complete migration of all legacy tooltips to TooltipOrPopover
- **Glossary tooltip integration**: Migrate complex glossary tooltips to unified system

### Maintenance Notes

- **TooltipOrPopover first**: Use TooltipOrPopover for all new tooltips to ensure touch device compatibility
- **Default styling**: Use standard light theme (`bg-white border-gray-200 shadow-lg p-4`) unless specific requirements dictate otherwise
- **Cross-device testing**: Test on both desktop and touch devices, verify long-press timing
- Update arrow colours when changing tooltip backgrounds (standard: `fill-gray-200`)
- Test positioning with different viewport sizes and orientations
- Verify accessibility when adding new tooltip patterns
- Keep animation durations consistent across the application
- Maintain consistency with ToC tooltip styling as the baseline pattern
- Monitor performance with multiple tooltips on complex pages

## Troubleshooting

### Common Issues

1. **Z-index conflicts**: Ensure `z-50` on tooltip content
2. **Arrow mismatch**: Update arrow `fill-*` class when changing background
3. **Content overflow**: Use `max-w-md` or similar constraints
4. **Animation performance**: Avoid complex animations in tooltip content
5. **Touch device positioning**: Test popover positioning on small screens and various orientations
6. **Long-press interference**: Accidental triggers - adjust movement threshold in `use-long-press.ts` if needed
7. **Hydration warnings**: Use `suppressHydrationWarning` on TooltipOrPopover trigger spans
8. **Device detection issues**: Verify useCanHover hook behavior on mixed-input devices

### Debugging Tips

- Use browser dev tools to inspect Radix UI data attributes for both tooltip and popover modes
- Check for conflicting CSS that might override tooltip styles
- Verify `TooltipProvider` is properly wrapping tooltip components (auto-handled by TooltipOrPopover)
- Test keyboard navigation (Tab, ESC) for accessibility compliance
- Use Chrome DevTools device mode to simulate touch devices
- Test long-press timing (default 500ms) and movement cancellation (10px threshold)
- Check console for device detection and hook cleanup warnings
- Verify visual consistency between desktop tooltip and touch popover modes

## 2025-06 Mobile-Tooltip Reliability Patch  ✅ NEW

> Introduced in planning doc `docs/planning/250629a_mobile_tooltips_fix.md` (shipped June 2025).

Key upgrades:

1. **`useLongPress` hardened** – early `preventDefault`, movement-cancellation & pointer-up cleanup ensure 500 ms long-press is reliable on iOS & Android.
2. **`TooltipManager` context** – global provider tracks `openId`; `TooltipOrPopover` now calls `setOpenId()` internally so **only one tooltip can be open at a time**. Dismisses on pointer-down outside, scroll, resize and ⎋.
3. **Unified implementation** – `TooltipOrPopover` always renders a Radix Popover. Hover/focus instantly opens on devices that can hover; touch devices rely on long-press.
4. **`onOpenChange` hook** – `TooltipOrPopover` exposes `onOpenChange` prop. Callers (e.g. `HeadingTree`) load AI summaries _only when_ the tooltip becomes visible, avoiding unnecessary network calls from stray hover/blur events.
5. **Trigger API unchanged** – previous props remain stable; dotted-underline indicator still optional via `showIndicator`.

### Usage Example (loading summaries on open)

```tsx
<TooltipOrPopover
  content={getTooltipContent(elementId)}
  onOpenChange={(open) => {
    if (open) {
      handleTooltipShow(elementId)
    }
  }}
  side="right"
  align="start"
  sideOffset={4}
  contentClassName="p-0 bg-transparent border-0 shadow-none"
>
  <span>{headingText}</span>
</TooltipOrPopover>
```

No additional changes are required for most existing call-sites – they automatically gain single-tooltip behaviour and touch reliability.