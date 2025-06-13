# Tooltip Styling

Comprehensive guide to tooltip styling patterns and implementations in the Spideryarn Reading application.

## See also

- `components/ui/tooltip.tsx` - shadcn/ui tooltip component implementation
- `docs/reference/STYLING.md` - General styling configuration and patterns
- `docs/reference/SHADCN_UI_REFERENCE.md` - shadcn/ui component reference
- `planning/finished/250526a_ToC_hierarchical_summary_tooltips.md` - Historical decision context for ToC tooltip implementation
- `components/unified-left-pane.tsx` - Search result tooltip implementations
- `components/heading-tree.tsx` - Hierarchical heading tooltip usage
- `components/vertical-icon-nav.tsx` - Navigation tooltip patterns

## Principles, key decisions

- **Radix UI Foundation**: All tooltips use `@radix-ui/react-tooltip` primitives via shadcn/ui
- **Consistent Visual Language**: Two main styling approaches - default orange theme and custom white theme
- **Content-Aware Styling**: Heavy content tooltips use white backgrounds, simple tooltips use primary theme
- **Accessibility First**: Radix UI ensures proper ARIA attributes and keyboard navigation
- **Performance**: Tooltips are positioned with `z-50` to avoid z-index conflicts

## Tooltip Component Architecture

### Base Component (`components/ui/tooltip.tsx`)

The shadcn/ui tooltip component provides the foundation:

```tsx
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'

<Tooltip>
  <TooltipTrigger>Hover me</TooltipTrigger>
  <TooltipContent>
    Tooltip content
  </TooltipContent>
</Tooltip>
```

**Default Styling Features:**
- Background: `bg-primary` (Spideryarn orange `#DB8A45`)
- Text: `text-primary-foreground` (light text on dark background)
- Animation: Fade and zoom transitions with directional slides
- Arrow: Automatic with matching primary colours
- Typography: `text-xs` with balanced text wrapping

## Styling Patterns

### 1. Default Primary Theme ✓

**Usage**: Simple tooltips, icons, navigation elements

```tsx
<TooltipContent>
  Simple tooltip text
</TooltipContent>
```

**Styling Characteristics:**
- Background: `bg-primary` (Spideryarn orange)
- Text: `text-primary-foreground`
- Padding: `px-3 py-1.5`
- Font: `text-xs`
- Border radius: `rounded-md`
- Arrow: `bg-primary fill-primary`

### 2. Content-Heavy White Theme ✓

**Usage**: Search results, document content, detailed information

```tsx
<TooltipContent className="max-w-md text-left bg-white border border-gray-200 rounded-lg shadow-lg p-4">
  <div className="text-xs text-gray-700 leading-relaxed">
    Detailed content...
  </div>
</TooltipContent>
```

**Styling Characteristics:**
- Background: `bg-white`
- Border: `border border-gray-200`
- Shadow: `shadow-lg`
- Padding: `p-4`
- Max width: `max-w-md`
- Text: `text-gray-700`
- Arrow: `fill-gray-200` or `fill-gray-300`

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

Multi-level information hierarchy:

```tsx
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
```

**Typography Hierarchy:**
1. **Title**: `font-semibold text-gray-900 text-sm`
2. **Description**: `text-gray-700 text-sm leading-relaxed`
3. **Meta information**: `text-xs text-gray-500 font-mono`

### Content Tooltips

Rich content with markdown support:

```tsx
<div className="max-w-md p-4 text-sm bg-white border border-gray-200 rounded-lg shadow-lg">
  <div className="prose prose-sm prose-gray max-w-none">
    <MarkdownRenderer content={content} />
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

## Implementation Examples

### Basic Icon Tooltip

```tsx
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Info } from '@phosphor-icons/react'

<Tooltip>
  <TooltipTrigger>
    <Info size={16} />
  </TooltipTrigger>
  <TooltipContent>
    Information about this feature
  </TooltipContent>
</Tooltip>
```

### Content-Rich Tooltip

```tsx
<Tooltip>
  <TooltipTrigger>
    <button>Search Result</button>
  </TooltipTrigger>
  <TooltipContent 
    side="right" 
    className="max-w-md text-left bg-white border border-gray-200 rounded-lg shadow-lg p-4"
    sideOffset={8}
  >
    <div className="text-xs text-gray-700 leading-relaxed">
      <HighlightedSearchText text={content} query={query} />
    </div>
  </TooltipContent>
</Tooltip>
```

### Loading State Tooltip

```tsx
const [isLoading, setIsLoading] = useState(false)

const getTooltipContent = () => {
  if (isLoading) {
    return (
      <div className="max-w-md p-4 text-sm bg-white border border-gray-200 rounded-lg shadow-lg">
        <div className="flex items-center space-x-3">
          <CircleNotch size={16} className="animate-spin text-blue-500" />
          <span className="text-gray-700 font-medium">Loading content...</span>
        </div>
      </div>
    )
  }
  
  return <div>Static content</div>
}
```

## Accessibility Features

### Built-in Accessibility ✓

Radix UI provides comprehensive accessibility:

- **ARIA attributes**: Automatic `aria-describedby`, `role="tooltip"`
- **Keyboard navigation**: ESC to close, focus management
- **Screen reader support**: Proper semantic markup
- **Delay handling**: Configurable `delayDuration` (default: 0ms)

### Custom Accessibility Enhancements

```tsx
<TooltipProvider delayDuration={500}>
  <Tooltip>
    <TooltipTrigger aria-label="Detailed information">
      <Info size={16} />
    </TooltipTrigger>
    <TooltipContent>
      Extended tooltip content
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

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

### 1. Search Result Tooltips

- White background with gray border
- Context-aware content with highlighting
- Right-side positioning with offset
- Maximum width constraint

### 2. Navigation Tooltips

- Structured information (title, description, shortcut)
- Consistent typography hierarchy
- Gray arrow styling
- Compact padding

### 3. Content Generation Tooltips

- Multiple states (loading, error, success)
- AI-generated content rendering
- Markdown support
- Caching for performance

### 4. Icon Tooltips

- Default primary theme
- Minimal content
- Standard positioning
- Quick show/hide

## Future Considerations

### Planned Enhancements 📋

- **Dark mode support**: Extend current patterns for dark theme
- **Mobile optimization**: Touch-friendly tooltip behaviour
- **Performance monitoring**: Track tooltip render performance
- **Content size limits**: Automatic truncation for very long content

### Maintenance Notes

- Update arrow colours when changing tooltip backgrounds
- Test positioning with different viewport sizes
- Verify accessibility when adding new tooltip patterns
- Keep animation durations consistent across the application

## Troubleshooting

### Common Issues

1. **Z-index conflicts**: Ensure `z-50` on tooltip content
2. **Arrow mismatch**: Update arrow `fill-*` class when changing background
3. **Content overflow**: Use `max-w-md` or similar constraints
4. **Animation performance**: Avoid complex animations in tooltip content
5. **Mobile positioning**: Test tooltip positioning on small screens

### Debugging Tips

- Use browser dev tools to inspect Radix UI data attributes
- Check for conflicting CSS that might override tooltip styles
- Verify `TooltipProvider` is properly wrapping tooltip components
- Test keyboard navigation (Tab, ESC) for accessibility compliance