# Goal

Adopt shadcn/ui component library to accelerate development speed and improve UI consistency in the Spideryarn Reading prototype, given that all coding is done by Claude AI assistants.

## Context

Currently using raw Tailwind CSS throughout the codebase, which has led to:
- Multiple inconsistent button styles (6-7 variations)
- Repeated UI patterns for loading states, errors, cards
- Long, unwieldy className strings
- Inconsistent spacing and styling choices

User priorities:
- Speed > control
- Getting things working > consistency  
- Expecting to need many more UI patterns over time

## References

- `docs/CODING_PRINCIPLES.md` - Development principles prioritising simplicity and rapid prototyping
- `docs/STYLING.md` - Current CSS and visual styling configuration
- `components/` - Existing components showing current Tailwind usage patterns
- Already using `@radix-ui/react-tooltip` - shadcn/ui is built on Radix UI

## Principles & Key Decisions

1. **Incremental adoption** - Start with high-impact components (buttons, dialogs, loading states) rather than wholesale conversion
2. **Keep Tailwind** - Use shadcn/ui for complex components, raw Tailwind for simple layouts
3. **Copy-paste approach** - Leverage shadcn/ui's philosophy of owning and customising component code
4. **AI-optimised** - Higher-level component abstractions are better for AI code generation than utility classes
5. **Theme consistency** - Customise components to match Spideryarn orange theme (`#DB8A45`)

## Actions

### Stage 1: Research & Setup

- [ ] Research shadcn/ui installation process for Next.js projects
  - Use web search to find latest installation guide
  - Check compatibility with Next.js 15 and React 19
  - Understand the CLI tool and how it works
  - Use a subagent to do a deep dive on relevant examples and best practices, and write up a very detailed reference/guide doc - follow `docs/WRITING_EVERGREEN_DOCS.md` and reference that in this planning doc

- [ ] Create a plan for which components to adopt first
  - Analyse current component usage patterns
  - Identify highest-impact components (most repeated/inconsistent)
  - List components in priority order
- [ ] Update this planning doc with findings

### Stage 2: Initial Installation

- [ ] Install shadcn/ui CLI and dependencies
  - Follow official installation guide
  - Configure for our project structure
  - Set up theme configuration

- [ ] Install first component: Button
  - Use CLI to add Button component
  - Customise theme colours to match Spideryarn orange
  - Test all button variants

- [ ] Git commit: "feat: add shadcn/ui setup with Button component"

### Stage 3: Replace Core Components

- [ ] Replace all button instances with shadcn/ui Button
  - Search for button patterns across codebase
  - Standardise on appropriate variants (primary, secondary, ghost, etc.)
  - Ensure all functionality is preserved

- [ ] Add Dialog component and replace custom modal
  - Install Dialog component
  - Replace `components/dialog.tsx` implementation
  - Update all dialog usages

- [ ] Add loading/spinner components
  - Install appropriate loading components
  - Replace custom loading states
  - Standardise loading UI across app

- [ ] Run all tests and fix any issues
- [ ] Git commit: "refactor: migrate buttons, dialogs, and loading states to shadcn/ui"

### Stage 4: Form Components

- [ ] Install form-related components
  - Input
  - Textarea  
  - Select
  - Checkbox
  - Form (with react-hook-form integration if needed)

- [ ] Update settings dialog with new form components
- [ ] Ensure form validation and error states work correctly
- [ ] Run tests
- [ ] Git commit: "feat: add shadcn/ui form components"

### Stage 5: Documentation & Guidelines
- [ ] Update `CLAUDE.md` with shadcn/ui usage instructions
  - How to add new components
  - When to use shadcn/ui vs raw Tailwind
  - Component customisation patterns

- [ ] Create or update `docs/UI_COMPONENTS.md`
  - List available shadcn/ui components
  - Document any custom modifications
  - Usage examples for common patterns

- [ ] Review with user
  - Show before/after examples
  - Get feedback on the new component system
  - Identify any additional components needed

### Final Stage
- [ ] Update all relevant documentation
- [ ] Ensure all tests pass
- [ ] Final review with user
- [ ] Design refernce/style guide page showing all components

## Appendix

### Current UI Patterns Analysis

Based on codebase analysis, here are the most common UI patterns that would benefit from standardisation:

**Buttons** - Found across multiple components with variations:
- Primary action buttons (blue backgrounds)
- Secondary buttons (gray backgrounds)
- Icon-only buttons (tooltips)
- Disabled states
- Loading states with spinners

**Loading States** - Repeated pattern:
```tsx
<CircleNotch className="animate-spin" size={16} />
<span className="text-sm">Loading...</span>
```

**Error States** - Common error display pattern:
```tsx
className="bg-red-50 border border-red-200 rounded p-3"
```

**Benefits of shadcn/ui for AI Development**

Research findings show that component libraries with semantic APIs are more effective for AI code generation because:
1. Higher-level abstractions reduce ambiguity
2. Component props provide clear intent
3. Pre-built accessibility and edge cases
4. Consistent patterns across the codebase

This aligns with the user's priority of development speed over pixel-perfect control.