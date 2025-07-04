# shadcn/ui Reference Guide

Comprehensive guide to implementing shadcn/ui component library in the Spideryarn Reading prototype for consistent, AI-optimised UI development.

## See also

- `docs/reference/DESIGN_OVERVIEW.md` - Current CSS and visual styling configuration
- `docs/reference/UI_INTERFACE.md`
- `docs/reference/UI_COMPONENTS.md`
- `docs/reference/DESIGN_MOBILE_PLATFORM_DETECTION.md` - mobile device detection affecting responsive component behavior
- `docs/reference/CODING_PRINCIPLES.md` - Development principles prioritising simplicity and rapid prototyping
- `docs/planning/250530a_shadcn_ui_adoption.md` - Planning document and implementation roadmap
- `components/` - Current component implementations using raw Tailwind
- `app/globals.css` - Tailwind v4 CSS configuration and theme variables
- [shadcn/ui Official Documentation](https://ui.shadcn.com) - Official component library documentation

## Principles & Key Decisions

1. **Incremental Adoption** - Start with high-impact components rather than wholesale conversion
2. **Copy-Paste Philosophy** - Leverage shadcn/ui's approach of owning and customising component code
3. **AI-Optimised Development** - Component abstractions improve AI code generation over utility classes
4. **Tailwind Coexistence** - Use shadcn/ui for complex components, raw Tailwind for simple layouts
5. **Brand Consistency** - Customise components to match Spideryarn orange theme (`#DB8A45`)
6. **Radix UI Foundation** - Built on the same primitives already used (`@radix-ui/react-tooltip`)

## Installation & Setup 🚧

### Prerequisites

**Current Project Stack**:
- Next.js 15 with React 19
- Tailwind CSS v4 
- TypeScript
- Existing `@radix-ui/react-tooltip` dependency

### Installation Process

#### 1. Install shadcn/ui CLI

```bash
# For React 19 compatibility, use canary version
npx shadcn@canary init

# For non-interactive installation with defaults
npx shadcn@latest init -d -y
```

**Configuration Options**:
- **Framework**: Next.js
- **TypeScript**: Yes
- **Tailwind**: Yes (will detect existing v4 setup)
- **CSS Variables**: Yes (recommended for theming)
- **Components Directory**: `components/ui`
- **Utils Location**: `lib/utils`

#### 2. Theme Configuration

The CLI will create/update key files:

**`components.json`** - Component configuration:
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "app/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

**`app/globals.css`** - Updated with shadcn/ui variables:
```css
@import "tailwindcss";

:root {
  /* Existing Spideryarn variables */
  --background: #ffffff;
  --foreground: #171717;
  --spideryarn-orange: #DB8A45;
  
  /* shadcn/ui theme variables */
  --primary: oklch(0.65 0.15 45); /* Spideryarn orange in OKLCH */
  --primary-foreground: oklch(0.98 0.02 45);
  --secondary: oklch(0.96 0.006 106.423);
  --secondary-foreground: oklch(0.15 0 0);
  --muted: oklch(0.961 0.006 106.423);
  --muted-foreground: oklch(0.456 0.006 106.423);
  --accent: oklch(0.961 0.006 106.423);
  --accent-foreground: oklch(0.15 0 0);
  --destructive: oklch(0.627 0.204 29.233);
  --destructive-foreground: oklch(0.988 0.013 106.423);
  --border: oklch(0.898 0.013 106.423);
  --input: oklch(0.898 0.013 106.423);
  --ring: oklch(0.216 0.006 56.043);
  --radius: 0.5rem;
}

@theme inline {
  /* Existing theme configuration */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-spideryarn-orange: var(--spideryarn-orange);
  
  /* shadcn/ui integration */
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  
  /* Font configuration */
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
  --font-trebuchet: 'Trebuchet MS', sans-serif;
}
```

**`lib/utils.ts`** - Utility functions for component styling:
```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

#### 3. Dependencies

shadcn/ui will automatically install required dependencies:
- `class-variance-authority` - For component variants
- `clsx` - For conditional classnames
- `tailwind-merge` - For merging Tailwind classes
- Specific Radix UI primitives per component

## Component Priority & Migration Strategy

### Tier 1: Foundation Components (Immediate Impact) ✅

**Button Component** - Highest priority for standardisation
```bash
npx shadcn@latest add button

# Non-interactive installation
npx shadcn@latest add button -y
```

**Current State**: 7+ button variations across codebase with inconsistent styling:
- Primary actions: `bg-blue-500 text-white rounded hover:bg-blue-600`
- Secondary: `bg-gray-100 text-gray-700 hover:bg-gray-200`
- Loading states: Manual `CircleNotch` spinner integration
- Disabled states: `disabled:bg-gray-400 disabled:cursor-not-allowed`

**Migration Impact**: Standardises all button interactions, reduces 15+ repeated button class combinations

**Dialog Component** - Replace custom modal implementation
```bash
npx shadcn@latest add dialog

# Non-interactive installation
npx shadcn@latest add dialog -y
```

**Current State**: Custom dialog in `components/dialog.tsx` with manual:
- Backdrop clicks and escape key handling
- Body scroll prevention
- Focus management
- Positioning and responsive sizing

**Migration Impact**: Eliminates 75 lines of custom modal code, adds better accessibility

### Tier 2: Loading & Error States (High Impact) 📋

**Components**:
```bash
npx shadcn@latest add alert
npx shadcn@latest add skeleton
npx shadcn@latest add spinner  # If available

# Non-interactive installation
npx shadcn@latest add alert -y
npx shadcn@latest add skeleton -y
```

**Current Patterns**: Repeated throughout codebase:
```tsx
// Loading state
<CircleNotch className="animate-spin" size={16} />
<span className="text-sm">Loading...</span>

// Error state  
<div className="bg-red-50 border border-red-200 rounded p-3 flex items-start gap-2">
  <Warning className="text-red-600 mt-0.5" size={20} weight="bold" />
  <div className="text-sm text-red-800">
    <div className="font-medium mb-1">Operation failed</div>
    <div className="text-xs">{error}</div>
  </div>
</div>
```

**Files Using Pattern**: `table-of-contents.tsx`, `document-viewer.tsx`, `assistant-chat.tsx`, `simple-chat.tsx`, `chat-ui-states.tsx`

### Tier 3: Form Components (Medium Impact) 📋

**Components**:
```bash
npx shadcn@latest add input
npx shadcn@latest add textarea
npx shadcn@latest add label
npx shadcn@latest add select
npx shadcn@latest add form

# Non-interactive installation
npx shadcn@latest add input -y
npx shadcn@latest add textarea -y
npx shadcn@latest add label -y
npx shadcn@latest add select -y
npx shadcn@latest add form -y
```

**Current Usage**: Limited form usage, mainly in:
- Settings dialog configuration
- Chat input fields
- Future document upload forms

### Tier 4: Layout Components (Lower Impact) 📋

**Components**:
```bash
npx shadcn@latest add card
npx shadcn@latest add sheet
npx shadcn@latest add tabs
npx shadcn@latest add collapsible

# Non-interactive installation
npx shadcn@latest add card -y
npx shadcn@latest add sheet -y
npx shadcn@latest add tabs -y
npx shadcn@latest add collapsible -y
```

**Current State**: 
- Tab container already implemented in `components/tab-container.tsx`
- Card-like structures use manual div/styling
- No sheet/drawer components yet

## Component Usage Patterns

### Button Variants

**Primary Actions** (API calls, navigation):
```tsx
<Button variant="default" size="sm">
  Generate new headings
</Button>
```

**Secondary Actions** (UI state changes):
```tsx
<Button variant="outline" size="sm">
  Toggle view
</Button>
```

**Destructive Actions** (dangerous operations):
```tsx
<Button variant="destructive" size="sm">
  Delete document
</Button>
```

**Loading States**:
```tsx
<Button disabled>
  <Spinner className="mr-2 h-4 w-4 animate-spin" />
  Loading...
</Button>
```

### Dialog Patterns

**Settings Dialog Replacement**:
```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button variant="outline">Settings</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Settings</DialogTitle>
    </DialogHeader>
    {/* Form content */}
    <DialogFooter>
      <Button variant="outline" onClick={onClose}>
        Cancel
      </Button>
      <Button onClick={onSave}>
        Save changes
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Alert/Error Display

**Error States**:
```tsx
<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>
    Failed to generate headings. Please try again.
  </AlertDescription>
</Alert>
```

**Success States**:
```tsx
<Alert>
  <CheckCircle className="h-4 w-4" />
  <AlertTitle>Success</AlertTitle>
  <AlertDescription>
    Headings generated successfully.
  </AlertDescription>
</Alert>
```

## Integration with Existing Patterns

### Phosphor Icons Compatibility

shadcn/ui components work seamlessly with Phosphor Icons:

```tsx
import { Button } from "@/components/ui/button"
import { CircleNotch, Warning } from '@phosphor-icons/react'

<Button disabled>
  <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
  Loading...
</Button>
```

### Tooltip Integration

Existing `@radix-ui/react-tooltip` can coexist or be replaced with shadcn/ui tooltips:

```tsx
// Current pattern (keep for complex tooltips)
import * as Tooltip from '@radix-ui/react-tooltip'

// shadcn/ui pattern (use for simple tooltips)
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
```

### Tab Container Migration Path

Current `TabContainer` component can coexist initially:

```tsx
// Phase 1: Keep existing TabContainer
import { TabContainer } from '@/components/tab-container'

// Phase 2: Gradually migrate to shadcn/ui Tabs
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
```

## AI Development Benefits

### Semantic Component APIs

shadcn/ui provides clearer intent through props:

```tsx
// Before: Unclear intent from classes
<button className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400">

// After: Clear semantic intent
<Button variant="default" size="md" disabled>
```

### Consistent Patterns

AI can reliably generate code using established patterns:

```tsx
// Loading button pattern - AI can consistently apply
<Button disabled={isLoading}>
  {isLoading && <Spinner className="mr-2 h-4 w-4 animate-spin" />}
  {isLoading ? "Loading..." : "Generate"}
</Button>
```

### Type Safety

TypeScript definitions improve AI accuracy:

```tsx
// AI understands available variants
type ButtonVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
```

## Customisation Examples

### Spideryarn Orange Variants

Create custom variants matching brand colours:

```tsx
// In components/ui/button.tsx
const buttonVariants = cva(
  // base classes...
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        spideryarn: "bg-spideryarn-orange text-white hover:bg-spideryarn-orange/90",
        // other variants...
      }
    }
  }
)
```

Usage:
```tsx
<Button variant="spideryarn">
  Spideryarn Action
</Button>
```

## Migration Checklist

### Pre-Migration
- [ ] Backup current components
- [ ] Run full test suite
- [ ] Document current button/dialog variations

### Installation
- [ ] Install shadcn/ui CLI with canary flag
- [ ] Configure components.json
- [ ] Update globals.css with theme variables
- [ ] Create lib/utils.ts

### Component Migration
- [ ] Add Button component
- [ ] Add Dialog component  
- [ ] Add Alert component
- [ ] Replace all button instances
- [ ] Replace dialog.tsx usage
- [ ] Replace error/loading states

### Testing & Validation
- [ ] Run `npm run build` - verify TypeScript compilation
- [ ] Run `npm run lint` - verify code quality
- [ ] Run `npm test` - verify functionality
- [ ] Visual regression testing
- [ ] Accessibility testing

### Documentation
- [ ] Update CLAUDE.md with shadcn/ui usage
- [ ] Create component style guide
- [ ] Document custom variants

## Troubleshooting

### Common Issues

**Peer Dependency Warnings** (React 19):
```bash
# Use legacy peer deps flag for npm
npm install --legacy-peer-deps

# Or use pnpm/yarn which handle this better
pnpm install
```

**Tailwind v4 Compatibility**:
- shadcn/ui components use CSS variables compatible with v4
- Ensure `@theme inline` block includes shadcn variables
- Test component styling after installation

**Icon Integration**:
- Phosphor Icons work seamlessly with shadcn/ui
- Use existing icon patterns within new components
- Size and spacing may need adjustment

**Type Conflicts**:
- React 19 may have conflicting types
- Use exact versions in package.json
- Consider using `@types/react@19` explicitly

### Testing Approach

**Component-Level Testing**:
```tsx
import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/button'

test('button renders with correct variant', () => {
  render(<Button variant="destructive">Delete</Button>)
  expect(screen.getByRole('button')).toHaveClass('bg-destructive')
})
```

**Integration Testing**:
- Test button interactions in existing components
- Verify dialog modal behavior
- Ensure error states display correctly

## Future Work 📋

### Planned Components
- **Resizable** - For collapsible panes (see `docs/planning/250530b_collapsible_resizable_panes.md`)
- **Collapsible** - For expand/collapse animations
- **Table** - For data display if needed
- **Command** ✅ - For search/command palette (see `docs/reference/COMMAND_PALETTE_FUZZY_SEARCH_CMDK.md` for implementation details)

### Advanced Features
- **Theme Switching** - Light/dark mode support
- **Component Variants** - Spideryarn-specific styling
- **Animation Library** - Smooth transitions
- **Form Integration** - react-hook-form if needed

### Performance Optimisation
- **Bundle Analysis** - Monitor size impact
- **Tree Shaking** - Ensure unused components excluded
- **Code Splitting** - Lazy load components if beneficial

## Status Summary

- **Research & Planning** ✅ Completed
- **Installation Guide** 🚧 Ready for implementation  
- **Component Priority** ✅ Defined
- **Migration Strategy** ✅ Planned
- **Documentation** ✅ Comprehensive guide created
- **Implementation** 📋 Awaiting Stage 2 execution

This reference provides the foundation for systematic shadcn/ui adoption while maintaining the rapid prototyping approach essential to Spideryarn Reading development.