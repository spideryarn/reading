# UI Components Reference

This document describes the UI component system used in Spideryarn Reading, based on shadcn/ui with custom modifications.

## Overview

The project uses a hybrid approach combining:
- **shadcn/ui components** for interactive, complex UI elements
- **Raw Tailwind CSS** for simple layouts and spacing
- **Custom components** for domain-specific functionality

## Component Library: shadcn/ui

Built on Radix UI primitives with copy-paste philosophy. Components are copied to `components/ui/` and can be fully customised.

### Core Principles
- **Accessible by default** - ARIA compliance, keyboard navigation
- **Customisable** - Full control over styling and behaviour
- **Type-safe** - TypeScript definitions included
- **Theme-consistent** - Unified design system

### Theme Configuration

Primary colour: **Spideryarn Orange** (`#DB8A45`)
- CSS custom property: `hsl(30 62% 57%)`
- Used for primary buttons, focus states, brand elements

## Available Components

### Button (`components/ui/button.tsx`)

**Variants:**
- `default` - Primary action (Spideryarn orange background)
- `destructive` - Dangerous actions (red)
- `outline` - Secondary actions with border
- `secondary` - Subtle actions (grey background)
- `ghost` - Minimal styling, hover effects only
- `link` - Text-only, underlined on hover

**Custom Variants:**
- `orange` - Explicit orange styling
- `warning` - Yellow/amber warning state
- `blue` - Blue accent colour
- `ghost-orange` - Ghost variant with orange hover

**Sizes:**
- `sm` - Small buttons
- `default` - Standard size
- `lg` - Large buttons
- `icon` - Square icon-only buttons
- `icon-sm` - Small icon buttons
- `icon-xs` - Extra small icon buttons
- `full` - Full width buttons

**Usage:**
```tsx
import { Button } from '@/components/ui/button'

<Button variant="default" size="sm">Save</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline" size="icon">
  <Icon size={16} />
</Button>
```

### Alert (`components/ui/alert.tsx`)

Error and warning message display with consistent styling.

**Variants:**
- `default` - Neutral information
- `destructive` - Error states

**Usage:**
```tsx
import { Alert, AlertDescription } from '@/components/ui/alert'

<Alert variant="destructive">
  <AlertDescription>
    Operation failed. Please try again.
  </AlertDescription>
</Alert>
```

### Loading (`components/ui/loading.tsx`)

Standardised loading indicators with spinning animation.

**Variants:**
- `default` - Standard loading state
- `inline` - Inline with text
- `overlay` - Full overlay loading

**Sizes:**
- `sm` - Small spinner (12px)
- `default` - Standard spinner (16px)
- `lg` - Large spinner (24px)

**Usage:**
```tsx
import { Loading } from '@/components/ui/loading'

<Loading variant="default" size="sm" />
<Loading variant="inline" text="Generating summary..." />
```

### Spinner (`components/ui/spinner.tsx`)

Basic animated spinner component using Phosphor CircleNotch icon.

**Usage:**
```tsx
import { Spinner } from '@/components/ui/spinner'

<Spinner size={16} className="text-blue-500" />
```

### Select (`components/ui/select.tsx`)

**Status:** Installed but not currently used (YAGNI principle)

Dropdown selection component based on Radix UI Select primitive.

### Checkbox (`components/ui/checkbox.tsx`)

**Status:** Installed but not currently used (YAGNI principle)

Checkbox input component with proper accessibility.

## Custom Components

### Dialog (`components/dialog.tsx`)

**Status:** Custom implementation retained for API compatibility

The existing custom dialog component is kept because it uses a different API pattern:
- Props: `isOpen`, `onClose`, `title`
- Incompatible with shadcn/ui Dialog patterns

### Tab Container (`components/tab-container.tsx`)

**Status:** Custom implementation, future migration candidate

Reusable tab component for multi-pane interface. Could potentially migrate to shadcn/ui Tabs in the future.

## Installation Guide

### Adding New Components

```bash
# Non-interactive installation (recommended for AI/automation)
printf "\\n" | npx shadcn@latest add [component-name]

# For React 19 compatibility issues
printf "\\n" | npx shadcn@latest add [component-name] --force
```

### Common Components to Consider

**Forms:** Input, Textarea, Form, Label
**Navigation:** Tabs, Breadcrumb, Pagination  
**Layout:** Card, Separator, Sheet
**Feedback:** Toast, Progress, Skeleton
**Data:** Table, DataTable

**Note:** Follow YAGNI principle - only install components when actually needed.

## Best Practices

### When to Use shadcn/ui
- Interactive components requiring state management
- Form elements with validation
- Complex accessibility requirements
- Consistent design system compliance

### When to Use Raw Tailwind
- Simple static layouts
- Basic spacing and typography
- One-off styling needs
- Container and grid systems

### Component Customisation

1. **Theme colours** - Update `app/globals.css` CSS custom properties
2. **Component styling** - Modify copied components in `components/ui/`
3. **Variant additions** - Add new variants to existing components
4. **Size modifications** - Extend size options as needed

### Type Safety

All shadcn/ui components include proper TypeScript definitions:
- Component props are fully typed
- Variant and size options are type-checked
- Integration with existing codebase types

## Testing

Component tests are located in `components/__tests__/`:
- Button component: 5 comprehensive tests covering all variants and interactions
- Focus on user interactions and accessibility
- Jest + React Testing Library setup

## Migration Status

**Completed:**
- ✅ Button - All instances migrated (25+ across 9 files)
- ✅ Loading states - Standardised across application
- ✅ Error states - Using Alert component

**Pending:**
- Dialog - Custom implementation retained for compatibility
- Form components - Will be added when forms are actually needed
- Tab system - Future enhancement candidate

**YAGNI Applied:**
- Select and Checkbox installed but unused until requirements emerge
- Form validation components deferred
- Complex layout components not needed yet

## Related Documentation

- `docs/SHADCN_UI_REFERENCE.md` - Installation and technical reference
- `docs/STYLING.md` - Overall styling configuration and theme
- `planning/250530a_shadcn_ui_adoption.md` - Implementation planning and decisions
- `CLAUDE.md` - Quick reference for AI agents