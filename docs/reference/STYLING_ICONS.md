# Icon System and Usage Guide

Comprehensive guide for implementing consistent iconography across the Spideryarn Reading application using the Phosphor Icons library.

## See also

- `docs/reference/STYLING_OVERVIEW.md` - Main styling guide including theme configuration and UI patterns
- `docs/reference/STYLING_COLLAPSIBLE.md` - Icon patterns for expand/collapse functionality
- `docs/reference/UI_COMPONENTS.md` - shadcn/ui components that use icons
- `docs/reference/COMMAND_PALETTE.md` - Command palette icon implementation
- `docs/reference/KEYBOARD_SHORTCUTS.md` - Keyboard shortcut visual indicators
- `components/ui/alert.tsx` - Alert component with contextual icons
- `components/ui/spinner.tsx` - Loading spinner implementation
- `components/command-palette.tsx` - Comprehensive icon usage examples
- `components/vertical-icon-nav.tsx` - Navigation icon patterns

## Principles, key decisions

- **Single icon library**: Phosphor Icons provides comprehensive, consistent iconography across the entire application
- **SSR compatibility**: Next.js server components require special SSR imports for proper rendering
- **Performance optimization**: Icons are tree-shaked and optimized through Next.js configuration
- **Visual consistency**: Standardised sizing, weights, and colour patterns across all UI contexts
- **Semantic clarity**: Icons are chosen to clearly communicate their function and context
- **Accessibility first**: All icons include proper accessibility attributes and semantic meaning

## Icon Library: Phosphor Icons

The project uses Phosphor Icons (`@phosphor-icons/react`) as the exclusive icon library for visual consistency and comprehensive coverage.

### Installation and Configuration

**Next.js Optimization**: Icons are optimized for bundle size through `next.config.ts`:

```javascript
experimental: {
  optimizePackageImports: ["@phosphor-icons/react"],
}
```

**Package**: `@phosphor-icons/react`  
**Documentation**: https://phosphoricons.com/  
**Total Available**: 6,000+ icons across 6 weights

### Icon Weights

Phosphor Icons provides 6 weight variations:

- `thin` - Minimal, delicate lines
- `light` - Subtle, refined appearance  
- `regular` - Default weight (most common)
- `bold` - Emphasized, attention-grabbing
- `fill` - Solid filled version
- `duotone` - Two-tone colour variation

### Basic Usage Patterns

**Standard Import (Client Components):**
```tsx
import { ArrowRight, House, MagnifyingGlass } from '@phosphor-icons/react'

// Default appearance (regular weight, 24px)
<ArrowRight />

// Custom sizing and weight
<House size={32} weight="bold" />

// Custom colour
<MagnifyingGlass size={20} color="#666" />
```

**SSR Import (Server Components):**
```tsx
// For Next.js server components without 'use client'
import { Warning } from "@phosphor-icons/react/dist/ssr/Warning"
import { Info } from "@phosphor-icons/react/dist/ssr/Info"
import { CheckCircle } from "@phosphor-icons/react/dist/ssr/CheckCircle"
```

**SSR Usage Examples:**
- `components/ui/alert.tsx` - Alert icons for server-side rendering
- `components/ui/spinner.tsx` - Loading spinner for server components
- `app/documents/page.tsx` - Server-side document list icons
- `app/auth/profile/page.tsx` - Authentication page icons

## Size Standards

### Primary Size Scale

- **12px** (`size={12}`) - Micro icons in dense interfaces
- **14px** (`size={14}`) - Small controls, compact toggles
- **16px** (`size={16}`) - **Standard size** - Most common for UI controls
- **20px** (`size={20}`) - Prominent controls, alerts, warnings
- **24px** (`size={24}`) - Default Phosphor size, section headers
- **32px** (`size={32}`) - Large feature icons, page headers

### Context-Specific Sizing

**Buttons:**
- Icon-only buttons: `size={16}` or `size={20}`
- Button with text: `size={16}` for consistency
- Large action buttons: `size={20}`

**Navigation:**
- Tab icons: `size={16}` (vertical icon nav)
- Menu items: `size={16}` 
- Breadcrumb navigation: `size={16}`

**Alerts and Status:**
- Error/warning alerts: `size={20}` 
- Inline status indicators: `size={16}`
- Loading spinners: `size={16}` (default), `size={12}` (small)

**Content Areas:**
- Section headers: `size={20}` or `size={24}`
- Content metadata: `size={16}`

## Weight Guidelines

### Weight Selection by Context

**Regular Weight (Default):**
- Standard UI controls and navigation
- Content icons and indicators
- Most common use case

**Bold Weight:**
- Alert icons requiring attention
- Primary action buttons
- Loading spinners for emphasis
- Error states and warnings

**Light Weight:**
- Secondary actions
- Subtle indicators
- Disabled states

**Fill Weight:**
- Active/selected states
- Primary navigation indicators
- Success confirmations

### Implementation Examples

```tsx
// Standard UI element
<MagnifyingGlass size={16} weight="regular" />

// Attention-grabbing alert
<Warning size={20} weight="bold" className="text-red-600" />

// Active navigation state
<House size={16} weight="fill" className="text-blue-600" />

// Subtle secondary action
<ArrowRight size={14} weight="light" className="text-gray-400" />
```

## Colour Patterns

### Standard Colour Scheme

**Default States:**
- Primary icons: `text-gray-600` or `text-gray-700`
- Secondary icons: `text-gray-500`
- Subtle elements: `text-gray-400`

**Interactive States:**
- Hover: `hover:text-gray-700` or `hover:text-gray-800`
- Active/selected: `text-blue-600` or `text-spideryarn-orange`
- Focus: Follow button focus patterns

**Status Colours:**
- Success: `text-green-600`
- Warning: `text-yellow-600` or `text-orange-600`
- Error: `text-red-600`
- Info: `text-blue-600`

### Brand Integration

**Spideryarn Orange (`#DB8A45`):**
- Primary brand elements
- Active navigation states
- Key action buttons
- Logo and branding contexts

**Implementation:**
```tsx
<Robot size={16} className="text-spideryarn-orange" />
```

## Context-Specific Icon Patterns

### Navigation Icons

**Vertical Icon Navigation** (`components/vertical-icon-nav.tsx`):
```tsx
const NAVIGATION_ITEMS = [
  { id: 'original', icon: Article },
  { id: 'ai-generated', icon: Robot },
  { id: 'summary', icon: ListBullets },
  { id: 'chat', icon: ChatCircle },
  { id: 'glossary', icon: BookOpen },
  { id: 'search', icon: MagnifyingGlass },
  { id: 'highlights', icon: HighlighterCircle },
  { id: 'metadata', icon: Tag },
]
```

**Usage Pattern:**
- Size: `size={16}` for consistency
- Weight: `weight="regular"` (default), `weight="fill"` for active state
- Colour: Context-dependent with hover states

### Collapsible Controls

**Primary Pattern - CaretDown with Rotation:**
```tsx
import { CaretDown } from '@phosphor-icons/react'

<CaretDown 
  size={16} 
  className={`text-gray-500 hover:text-gray-700 transition-transform ${
    isExpanded ? '' : 'rotate-180'
  }`} 
/>
```

**Hierarchical Pattern - CaretRight/CaretDown:**
```tsx
import { CaretDown, CaretRight } from '@phosphor-icons/react'

{isExpanded ? (
  <CaretDown size={16} className="text-gray-500 hover:text-gray-700" />
) : (
  <CaretRight size={16} className="text-gray-500 hover:text-gray-700" />
)}
```

**See:** `docs/reference/STYLING_COLLAPSIBLE.md` for comprehensive collapsible icon patterns

### Loading States

**Standard Loading Pattern:**
```tsx
import { CircleNotch } from '@phosphor-icons/react'

// Button loading state
<CircleNotch className="animate-spin" size={16} />

// Standalone spinner
<CircleNotch 
  size={20} 
  weight="bold"
  className="animate-spin text-blue-500"
/>
```

**Spinner Component** (`components/ui/spinner.tsx`):
```tsx
<Spinner size={16} className="text-blue-500" />
```

### Alert and Status Icons

**Alert Component Integration** (`components/ui/alert.tsx`):
```tsx
// Error/Warning
<Warning size={20} weight="bold" className="text-red-600" />

// Success
<CheckCircle size={20} weight="bold" className="text-green-600" />

// Information
<Info size={20} weight="bold" className="text-blue-600" />
```

**Usage in Context:**
```tsx
<Alert variant="destructive">
  <Warning size={20} weight="bold" />
  <AlertDescription>Operation failed</AlertDescription>
</Alert>
```

### Button Icons

**Icon-Only Buttons:**
```tsx
<Button variant="ghost" size="icon">
  <MagnifyingGlass size={16} />
</Button>
```

**Buttons with Text:**
```tsx
<Button variant="default">
  <Upload size={16} className="mr-2" />
  Upload Document
</Button>
```

**Loading Button State:**
```tsx
<Button disabled={isLoading}>
  {isLoading ? (
    <>
      <CircleNotch className="animate-spin mr-2" size={16} />
      Loading...
    </>
  ) : (
    <>
      <Save size={16} className="mr-2" />
      Save Changes
    </>
  )}
</Button>
```

## Animation Patterns

### Rotation Animations

**Collapsible Controls:**
```tsx
<CaretDown className={`transition-transform ${isExpanded ? '' : 'rotate-180'}`} />
```

**Loading Spinners:**
```tsx
<CircleNotch className="animate-spin" />
```

### Hover Transitions

**Standard Pattern:**
```tsx
<ArrowRight className="text-gray-500 hover:text-gray-700 transition-colors" />
```

**Button Integration:**
```tsx
<button className="group">
  <ArrowRight className="group-hover:translate-x-1 transition-transform" />
</button>
```

## Command Palette Icons

The command palette (`components/command-palette.tsx`) demonstrates comprehensive icon usage across different command categories:

### Navigation Commands
- `Article` - Original document view
- `Robot` - AI-generated content  
- `ListBullets` - Summary view
- `ChatCircle` - Chat interface
- `BookOpen` - Glossary
- `MagnifyingGlass` - Search

### Document Actions
- `TwitterLogo` - Tweet thread view
- `FileText` - View original document

### App Navigation  
- `House` - Home/documents list
- `Upload` - Upload document
- `Gear` - Settings

### Account Actions
- `User` - Profile
- `SignIn` - Sign in
- `UserPlus` - Sign up  
- `SignOut` - Sign out

**Implementation Pattern:**
```tsx
<CommandItem onSelect={command.action}>
  {command.icon && <command.icon size={16} className="mr-2" />}
  <span>{command.name}</span>
  {command.shortcut && (
    <CommandShortcut>{command.shortcut.join('+')}</CommandShortcut>
  )}
</CommandItem>
```

## Accessibility Considerations

### ARIA Labels and Semantic Meaning

**Icon-Only Buttons:**
```tsx
<Button variant="ghost" size="icon" aria-label="Search documents">
  <MagnifyingGlass size={16} />
</Button>
```

**Status Icons with Context:**
```tsx
<div role="alert">
  <Warning size={20} className="text-red-600" aria-hidden="true" />
  <span className="sr-only">Error:</span>
  Operation failed
</div>
```

### Screen Reader Support

**Decorative Icons:**
```tsx
<ArrowRight size={16} aria-hidden="true" />
```

**Meaningful Icons:**
```tsx
<Save size={16} aria-label="Save document" />
```

## Performance and Optimization

### Tree Shaking

Icons are automatically tree-shaken through Next.js optimization:
- Only imported icons are included in the bundle
- Individual icon imports prevent full library loading
- SSR imports are optimized separately

### Bundle Size Impact

**Best Practices:**
- Import only required icons
- Use specific imports rather than batch imports
- Consider icon weight selection for bundle optimization

**Example:**
```tsx
// Good - specific imports
import { ArrowRight, Save } from '@phosphor-icons/react'

// Avoid - batch imports
import * as Icons from '@phosphor-icons/react'
```

## Testing Patterns

### Icon Rendering Tests

**Component Tests:**
```tsx
import { render, screen } from '@testing-library/react'
import { Warning } from '@phosphor-icons/react'

test('renders warning icon', () => {
  render(<Warning size={20} data-testid="warning-icon" />)
  expect(screen.getByTestId('warning-icon')).toBeInTheDocument()
})
```

### Accessibility Testing

**ARIA Label Verification:**
```tsx
test('icon button has accessible label', () => {
  render(
    <button aria-label="Close dialog">
      <X size={16} />
    </button>
  )
  expect(screen.getByLabelText('Close dialog')).toBeInTheDocument()
})
```

## Migration Guidelines

### Updating Legacy Icons

**From Inline SVG:**
```tsx
// Before
<svg className="w-4 h-4" viewBox="0 0 24 24">
  <path d="..." />
</svg>

// After  
<ArrowRight size={16} />
```

**From Other Icon Libraries:**
```tsx
// Before (Heroicons example)
import { ChevronDownIcon } from '@heroicons/react/24/outline'

// After
import { CaretDown } from '@phosphor-icons/react'
```

### Consistency Updates

1. **Standardise sizing** - Convert to standard scale (12, 14, 16, 20, 24, 32px)
2. **Update colours** - Apply consistent colour patterns
3. **Add hover states** - Include transition classes
4. **Improve accessibility** - Add ARIA labels and semantic context

## Icon Inventory

### Most Commonly Used Icons

**Navigation & UI:**
- `Article` - Document content
- `Robot` - AI features
- `ListBullets` - Lists and summaries
- `ChatCircle` - Chat interfaces
- `BookOpen` - Glossary and reference
- `MagnifyingGlass` - Search functionality
- `CaretDown`/`CaretRight` - Expand/collapse controls
- `ArrowLeft`/`ArrowRight` - Navigation direction

**Actions & States:**
- `CircleNotch` - Loading states (with `animate-spin`)
- `Warning` - Error and warning alerts
- `CheckCircle` - Success confirmations
- `Info` - Information alerts
- `Upload` - File upload actions
- `Save` - Save operations

**Interface Elements:**
- `House` - Home navigation
- `Gear` - Settings and configuration
- `User` - User profile and account
- `X` - Close actions
- `Plus` - Add/create actions

### Category Distribution

Current usage spans across:
- **39 component files** using Phosphor Icons
- **6 files** using SSR imports for server components
- **25+ distinct icons** in regular use
- **4 primary animation patterns** (spin, rotate, translate, scale)

## Future Enhancements

### Planned Improvements

**Icon System Evolution:**
- Custom icon variants for Spideryarn-specific concepts
- Animated icon states for enhanced feedback
- Icon badge/notification overlay patterns
- Contextual icon themes (dark mode compatibility)

**Performance Optimizations:**
- Icon sprite generation for frequently used icons
- WebP/SVG optimization for custom brand icons
- Progressive loading for icon-heavy interfaces

**Accessibility Enhancements:**
- High contrast mode icon variants
- Motion-reduced animation alternatives
- Enhanced screen reader descriptions
- Keyboard navigation focus indicators

## Status Indicators

✅ **Complete** - Core icon system with Phosphor Icons integration  
✅ **Complete** - SSR compatibility for Next.js server components  
✅ **Complete** - Standard sizing and weight guidelines  
✅ **Complete** - Animation patterns (spin, rotate, transitions)  
✅ **Complete** - Alert and status icon integration  
✅ **Complete** - Command palette icon implementation  
✅ **Complete** - Navigation and collapsible icon patterns  

📋 **Planned** - Dark mode icon adaptations  
📋 **Planned** - Custom Spideryarn icon variants  
📋 **Planned** - Advanced animation library integration  
📋 **Planned** - Icon accessibility audit and enhancements