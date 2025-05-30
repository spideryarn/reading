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
- `docs/SHADCN_UI_REFERENCE.md`
- `docs/STYLING.md` - Current CSS and visual styling configuration
- `components/` - Existing components showing current Tailwind usage patterns
- Already using `@radix-ui/react-tooltip` - shadcn/ui is built on Radix UI

## Principles & Key Decisions

1. **Incremental adoption** - Start with high-impact components (buttons, dialogs, loading states) rather than wholesale conversion
2. **Keep Tailwind** - Use shadcn/ui for complex components, raw Tailwind for simple layouts
3. **Copy-paste approach** - Leverage shadcn/ui's philosophy of owning and customising component code
4. **AI-optimised** - Higher-level component abstractions are better for AI code generation than utility classes
5. **Theme consistency** - Customise components to match Spideryarn orange theme (`#DB8A45`)
6. **Search the web if you are unsure about anything**

## Actions

### Stage 1: Research & Setup

- [x] Research shadcn/ui installation process for Next.js projects
  - ✅ Used web search to find latest installation guide
  - ✅ Confirmed compatibility with Next.js 15 and React 19 (requires canary version)
  - ✅ Understood CLI tool and configuration options
  - ✅ Created comprehensive reference guide: `docs/SHADCN_UI_REFERENCE.md`

- [x] Create a plan for which components to adopt first
  - ✅ Analysed current component usage patterns across codebase
  - ✅ Identified highest-impact components (Button, Dialog, Alert)
  - ✅ Created priority order with migration strategy
- [x] Update this planning doc with findings

### Stage 2: Initial Installation

- [x] Install shadcn/ui CLI and dependencies
  - ✅ Successfully ran `npx shadcn@latest init` with React 19 compatibility
  - ✅ Configured project structure with components.json
  - ✅ Set up theme configuration with Spideryarn orange (#DB8A45) as primary

- [x] Install first component: Button
  - ✅ Created Button component at `components/ui/button.tsx`
  - ✅ Installed required dependencies: @radix-ui/react-slot, clsx, tailwind-merge
  - ✅ Customised primary theme colour to Spideryarn orange in OKLCH format
  - ✅ Created comprehensive test suite with 5 passing tests for all variants

- [x] Verification complete
  - ✅ Button component imports and renders correctly
  - ✅ All variants (default, destructive, outline, secondary, ghost) working
  - ✅ All sizes (sm, default, lg, icon) functional  
  - ✅ Event handling and disabled states working
  - ✅ TypeScript compilation successful for shadcn/ui components

- [x] Git commit: "feat: add shadcn/ui foundation with Button component and theme setup" (420ab8a)

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

### Future Stage: Resizable Layout
- [ ] Implement collapsible and resizable panes using shadcn/ui Resizable component
  - See `planning/250530b_collapsible_resizable_panes.md` for detailed implementation plan
  - **Dependency**: Requires completion of Stages 2-3 above (Button, Dialog components working)
  - **Benefit**: Better screen space utilisation and responsive layout for three-pane interface

### Future Stage: Animations for Expand/Collapse
- [ ] Add smooth animations to expand/collapse functionality across the application
  - Install shadcn/ui Collapsible component (built on @radix-ui/react-collapsible)
  - Apply to Table of Contents expand/collapse in `components/heading-tree.tsx`
  - Apply to Document Summary expand/collapse in `components/document-summary.tsx`
  - Apply to any other expand/collapse UI patterns in the codebase
  - **Dependency**: Requires completion of Stage 2 (initial shadcn/ui setup)
  - **Benefit**: Professional, smooth animations with zero custom animation code
  - **Implementation**: Simple wrapper components with built-in height animations
  - See `planning/250529b_table_of_contents_expand_collapse_granularity.md` for ToC context

## Appendix

### Stage 1 Research Findings

**shadcn/ui Compatibility Assessment**:
- ✅ **Next.js 15**: Fully supported via canary release
- ✅ **React 19**: Supported with `--legacy-peer-deps` flag for npm
- ✅ **Tailwind v4**: Compatible, uses CSS variables and modern features
- ✅ **Radix UI**: Perfect compatibility (already using `@radix-ui/react-tooltip`)

**Installation Requirements**:
```bash
npx shadcn@canary init  # For Next.js 15 + React 19 support
```

**Component Priority Analysis** (based on codebase audit):

**Tier 1 - Immediate Impact**:
1. **Button** - 15+ variations across 12 files, highest standardisation benefit
2. **Dialog** - Replace 75-line custom implementation in `components/dialog.tsx`
3. **Alert** - Standardise error/loading states in 5 components

**Tier 2 - High Impact**:
4. **Input/Form** - Future-proof for settings and upload features
5. **Card** - Content containers throughout app
6. **Tabs** - Can replace custom `TabContainer` eventually

**Current UI Patterns Analysis**:

**Buttons** - Found across multiple components with variations:
- Primary action buttons: `bg-blue-500 text-white rounded hover:bg-blue-600`
- Secondary buttons: `bg-gray-100 text-gray-700 hover:bg-gray-200`
- Loading buttons: Manual `CircleNotch` + `disabled:bg-gray-400`
- Icon-only buttons with tooltips

**Loading States** - Repeated pattern in 5 files:
```tsx
<CircleNotch className="animate-spin" size={16} />
<span className="text-sm">Loading...</span>
```

**Error States** - Common pattern in table-of-contents.tsx, document-viewer.tsx:
```tsx
<div className="bg-red-50 border border-red-200 rounded p-3 flex items-start gap-2">
  <Warning className="text-red-600 mt-0.5" size={20} weight="bold" />
  <div className="text-sm text-red-800">
    <div className="font-medium mb-1">Operation failed</div>
    <div className="text-xs">{error}</div>
  </div>
</div>
```

**Custom Components to Replace**:
- `components/dialog.tsx` - 75 lines of modal logic → shadcn/ui Dialog
- `components/tab-container.tsx` - Can migrate to shadcn/ui Tabs eventually

**Benefits of shadcn/ui for AI Development**:

Research findings show component libraries with semantic APIs are more effective for AI code generation:
1. **Higher-level abstractions** reduce ambiguity (`<Button variant="destructive">` vs class strings)
2. **Component props** provide clear intent and type safety
3. **Pre-built accessibility** and edge cases handled automatically
4. **Consistent patterns** across the codebase improve AI pattern recognition
5. **Copy-paste philosophy** allows full customisation while maintaining standards

This aligns perfectly with the user's priority of development speed over pixel-perfect control.

**Key Implementation Notes**:
- Use `npx shadcn@canary init` for React 19 compatibility
- Spideryarn orange (#DB8A45) will be configured as primary theme colour
- Existing Phosphor Icons integrate seamlessly
- Gradual migration path allows testing each component individually