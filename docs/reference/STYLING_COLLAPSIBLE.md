# Collapsible Component Styling Guide

Comprehensive guide for implementing consistent expand/collapse functionality across the Spideryarn Reading application.

## See also

- `docs/reference/STYLING_OVERVIEW.md` - Main styling guide including typography, colours, and theme configuration
- `docs/reference/UI_COMPONENTS.md` - shadcn/ui component reference and usage patterns
- `components/dual-summary-sliders.tsx` - Example of responsive collapsible component
- `components/heading-tree.tsx` - Hierarchical collapsible tree navigation implementation
- `components/unified-left-pane.tsx` - Advanced options collapsible pattern
- `components/auth/profile-dropdown.tsx` - Dropdown menu collapsible pattern
- `docs/reference/TOOL_READING_DIFFICULTY.md` - Assessment factors collapsible implementation example

## Principles

- **Visual consistency**: Use standardised Phosphor Icons and colour schemes across all collapsible components
- **Responsive behaviour**: Collapse automatically on small screens to save vertical space
- **Accessibility**: Include proper ARIA labels and keyboard support for screen readers
- **Smooth transitions**: Apply consistent animation timing and easing patterns
- **State clarity**: Clear visual indicators showing expanded/collapsed state

## Icon Patterns

### Primary Pattern: CaretDown with Rotation

**Recommended for most collapsible components:**

```tsx
import { CaretDown } from '@phosphor-icons/react'

<CaretDown 
  size={16} 
  className={`text-gray-500 hover:text-gray-700 transition-transform ${
    isExpanded ? '' : 'rotate-180'
  }`} 
/>
```

**When to use:**
- Simple expand/collapse toggles
- Vertical content sections
- Settings panels
- Filter controls

### Hierarchical Pattern: CaretRight/CaretDown

**For tree-like navigation structures:**

```tsx
import { CaretDown, CaretRight } from '@phosphor-icons/react'

{isExpanded ? (
  <CaretDown size={16} className="text-gray-500 hover:text-gray-700" />
) : (
  <CaretRight size={16} className="text-gray-500 hover:text-gray-700" />
)}
```

**When to use:**
- Table of contents with nested headings
- File explorer interfaces
- Menu navigation with submenus
- Document outline structures

### Vertical Control Pattern: CaretUp/CaretDown

**For simple expand/collapse controls showing the action that will be performed:**

```tsx
import { CaretUp, CaretDown } from '@phosphor-icons/react'

{isExpanded ? (
  <CaretUp size={16} className="text-gray-500" />  // Shows "collapse" action
) : (
  <CaretDown size={16} className="text-gray-500" />  // Shows "expand" action
)}
```

**Important**: The icon shows the **action** that will be performed, not the current state:
- **CaretUp** when expanded → clicking will **collapse**
- **CaretDown** when collapsed → clicking will **expand**

**When to use:**
- Simple expand/collapse toggles
- Slider controls
- Granularity settings
- Detail level toggles
- Configuration options

## Implementation Patterns

### Basic Collapsible Component

```tsx
import { useState } from 'react'
import { CaretUp, CaretDown } from '@phosphor-icons/react'

function CollapsibleSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(true)
  
  return (
    <div className="border border-gray-200 rounded-lg">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium text-gray-900">{title}</span>
        {isExpanded ? (
          <CaretUp size={16} className="text-gray-500 hover:text-gray-700" />
        ) : (
          <CaretDown size={16} className="text-gray-500 hover:text-gray-700" />
        )}
      </button>
      
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  )
}
```

### Responsive Collapsible (Mobile-First)

```tsx
import { useState, useEffect } from 'react'
import { CaretUp, CaretDown } from '@phosphor-icons/react'

function ResponsiveCollapsible({ title, children }: { title: string; children: React.ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(true)
  
  // Responsive behaviour: collapse on small screens
  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)')
    
    const handleScreenChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsExpanded(!e.matches) // Collapse on small screens
    }
    
    handleScreenChange(mediaQuery) // Set initial state
    mediaQuery.addEventListener('change', handleScreenChange)
    
    return () => mediaQuery.removeEventListener('change', handleScreenChange)
  }, [])
  
  return (
    <div className="bg-gray-50 border-b border-gray-200">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-100 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-700">{title}</span>
        {isExpanded ? (
          <CaretUp size={16} className="text-gray-500 hover:text-gray-700" />
        ) : (
          <CaretDown size={16} className="text-gray-500 hover:text-gray-700" />
        )}
      </button>
      
      {isExpanded && (
        <div className="px-3 pb-3 space-y-4">
          {children}
        </div>
      )}
    </div>
  )
}
```

### Hierarchical Tree Node

```tsx
import { useState } from 'react'
import { CaretDown, CaretRight } from '@phosphor-icons/react'

interface TreeNodeProps {
  item: { id: string; title: string; children?: any[] }
  level: number
}

function TreeNode({ item, level }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const hasChildren = item.children && item.children.length > 0
  
  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left p-2 hover:bg-gray-100 rounded"
        style={{ paddingLeft: `${level * 1.5}rem` }}
      >
        {hasChildren ? (
          isExpanded ? (
            <CaretDown size={16} className="text-gray-500 hover:text-gray-700" />
          ) : (
            <CaretRight size={16} className="text-gray-500 hover:text-gray-700" />
          )
        ) : (
          <div className="w-4 h-4" /> // Spacer for alignment
        )}
        <span className="text-sm text-gray-900">{item.title}</span>
      </button>
      
      {isExpanded && hasChildren && (
        <div>
          {item.children.map((child) => (
            <TreeNode key={child.id} item={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  )
}
```

## Visual Design Standards

### Colour Scheme

- **Default state**: `text-gray-500` for icons and secondary text
- **Hover state**: `hover:text-gray-700` for better contrast
- **Active/selected**: `text-gray-900` for primary content
- **Background**: `hover:bg-gray-50` or `hover:bg-gray-100` for interactive areas

### Icon Sizing

- **Standard size**: `size={16}` for most collapsible controls
- **Small controls**: `size={14}` for compact interfaces
- **Large sections**: `size={20}` for prominent toggles

### Animation Standards

- **Transition class**: `transition-transform` for icon rotation
- **Duration**: Default Tailwind timing (150ms)
- **Easing**: Default ease-in-out for smooth motion

### Layout Patterns

- **Full-width buttons**: `w-full flex items-center justify-between` for toggle headers
- **Consistent padding**: `p-3` for standard sections, `px-2 py-1` for compact controls
- **Spacing**: `space-y-4` for expanded content sections

## Responsive Breakpoints

- **Mobile collapse threshold**: `768px` (Tailwind `md:` breakpoint)
- **Auto-collapse behaviour**: Default to collapsed on screens ≤768px
- **User override**: Always allow manual expand/collapse regardless of screen size

## Accessibility Guidelines

### ARIA Attributes

```tsx
<button
  onClick={() => setIsExpanded(!isExpanded)}
  aria-expanded={isExpanded}
  aria-controls="collapsible-content"
  className="w-full flex items-center justify-between p-3"
>
  <span id="collapsible-label">Section Title</span>
  <CaretDown className={`transition-transform ${isExpanded ? '' : 'rotate-180'}`} />
</button>

<div
  id="collapsible-content"
  aria-labelledby="collapsible-label"
  className={isExpanded ? '' : 'hidden'}
>
  {children}
</div>
```

### Keyboard Support

- **Space/Enter**: Toggle expand/collapse state
- **Focus management**: Ensure toggle button is focusable
- **Visual focus**: Include focus-visible styles

```tsx
className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
```

## Current Implementation Examples

### Multi-Summary Sliders ✓

**File**: `components/dual-summary-sliders.tsx`
- Uses CaretDown with rotation pattern
- Responsive auto-collapse on mobile
- Smooth transitions and hover states
- Expertise/length slider controls

### Heading Tree Navigation ✓

**File**: `components/heading-tree.tsx`
- Hierarchical CaretRight/CaretDown pattern
- Tree-like document outline
- Nested level indentation
- Granularity control toggles

### Advanced Search Options ✓

**File**: `components/unified-left-pane.tsx`
- CaretDown with rotation for dropdown
- Search filter controls
- Compact toggle design

### Profile Dropdown ✓

**File**: `components/auth/profile-dropdown.tsx`
- Menu-style collapsible
- Outside click detection
- User account controls

## Migration Notes

### Updating Legacy Implementations

When updating existing collapsible components:

1. **Replace inline SVG** with Phosphor Icons
2. **Add transition classes** for smooth animations
3. **Update colour scheme** to match standards
4. **Include hover states** for better UX
5. **Consider responsive behaviour** for mobile users

### Common Legacy Patterns

- **Inline SVG chevrons** → Replace with `CaretDown` from Phosphor
- **Fixed expand state** → Add responsive auto-collapse
- **Missing transitions** → Add `transition-transform` class
- **Inconsistent sizing** → Standardise to `size={16}`

## Future Enhancements

### Planned Improvements 📋

- **Animation library integration**: Consider Framer Motion for complex animations
- **Keyboard shortcuts**: Add hotkeys for power users
- **Persistence**: Remember expanded state across sessions
- **Accessibility audit**: Comprehensive screen reader testing

### Component Library Integration

- **shadcn/ui Collapsible**: Evaluate official Collapsible component
- **Compound component pattern**: Create reusable CollapsibleSection
- **Theme integration**: Connect to dark mode when implemented