# Flexible Page Header System

## Goal

Replace the current rigid global header system with a flexible approach where each page provides its own header content while maintaining consistency. This addresses the header overlap issues currently affecting the design page and tweet thread page, where content gets hidden behind the fixed global header.

### Current Problems
- Fixed global header in `ClientLayout` causes content overlap on pages
- Inconsistent padding workarounds (`pt-16`, `pt-24`, or no padding)
- Pages can't customize header content (titles, actions, navigation)
- Magic numbers tied to header height with no explicit connection
- No clear pattern for handling secondary headers

### Desired Behaviour
- Each page controls its own header content and styling
- Standard `AppHeader` component provides consistency when needed
- Pages can fully customize headers or build completely custom ones
- Landing page and other exceptions can opt out of headers entirely
- No content overlap issues
- Clean, maintainable header height management

## References

- `app/client-layout.tsx` - Current global header implementation that needs to be modified
- `app/design/page.tsx` - Has both global header overlap and its own sticky secondary header
- `app/documents/[slug]/tweets/page.tsx` - Suffers from header overlap with no compensation
- `docs/CODING_PRINCIPLES.md` - Emphasises simple, debuggable code and fixing root causes
- `docs/ARCHITECTURE.md` - Contains high-level architectural decisions and patterns
- `app/globals.css` - CSS custom properties system for theming

## Principles, Key Decisions

- **Header as Page Responsibility**: Each page provides its own header rather than having a global fixed header
- **Consistency through Components**: Use shared `AppHeader` component with props for common customizations
- **Flexibility over Rigidity**: Pages can build completely custom headers when needed
- **CSS Custom Properties**: Use CSS variables for header height management instead of magic numbers
- **Simple and Explicit**: You should see the header in the page file (no complex slot/context systems)
- **Easy Exceptions**: Landing page and other special cases can easily opt out
- **Gradual Migration**: Implement incrementally without breaking existing functionality

## Actions

### Stage: Foundation - Create AppHeader Component and CSS Variables
- [ ] Add CSS custom property for header height to `app/globals.css`
  - [ ] Add `--header-height: 4rem;` to `:root` section
  - [ ] Add corresponding Tailwind configuration if needed
- [ ] Create `components/app-header.tsx` component
  - [ ] Support props for: title, backLink, actions, className
  - [ ] Include Spideryarn logo and branding
  - [ ] Use CSS custom property for height
  - [ ] Default to standard styling but allow full customization
- [ ] Write tests for AppHeader component
  - [ ] Test with different prop combinations
  - [ ] Test accessibility and responsive behaviour
- [ ] Run tests to ensure new component works correctly
- [ ] Git commit this foundational work

### Stage: Update Design Page
- [ ] Remove current padding hack (`pt-16`) from design page
- [ ] Replace existing dual header system with single AppHeader
  - [ ] Use AppHeader with title="Design Reference" and backLink props
  - [ ] Integrate the "Back to App" button into AppHeader actions
- [ ] Update sticky secondary header positioning if needed
- [ ] Test design page renders correctly without overlap
- [ ] Git commit design page updates

### Stage: Update Tweet Thread Page  
- [ ] Replace current header implementation in `app/documents/[slug]/tweets/page.tsx`
- [ ] Use AppHeader with appropriate title and back navigation
- [ ] Test that content no longer overlaps with header
- [ ] Verify navigation between document and tweet thread works correctly
- [ ] Git commit tweet thread page updates

### Stage: Remove Global Header from ClientLayout
- [ ] Remove fixed header from `app/client-layout.tsx`
- [ ] Update any pages that were relying on global header
  - [ ] Check `app/page.tsx` (homepage)
  - [ ] Check `app/documents/page.tsx` 
  - [ ] Check `app/documents/[slug]/page.tsx`
- [ ] Remove any remaining padding hacks (`pt-16`, `pt-24`)
- [ ] Test all pages render correctly
- [ ] Run full test suite to catch any regressions
- [ ] Git commit global header removal

### Stage: Documentation and Cleanup
- [ ] Update relevant documentation
  - [ ] Update `docs/UI_COMPONENTS.md` with AppHeader usage patterns
  - [ ] Update `docs/SITE_ORGANISATION.md` if header patterns are documented there
- [ ] Create usage examples in design page if helpful
- [ ] Review all pages for consistency and best practices
- [ ] Run linting and type checking
- [ ] Final git commit for documentation

### Stage: Review and Finalize
- [ ] Manual testing of all pages to verify header behaviour
- [ ] Check responsive design on different screen sizes
- [ ] Verify accessibility of new header system
- [ ] User review of changes and header flexibility
- [ ] Move this doc to `planning/finished/` and commit

## Appendix

### Conversation Context
This planning doc captures a detailed discussion about fixing header overlap issues in the Spideryarn Reading application. The conversation revealed that:

1. **Root Cause**: Fixed global header in ClientLayout was too rigid for pages needing custom headers
2. **Current Workarounds**: Pages were using inconsistent padding hacks (`pt-16`, `pt-24`) to avoid content overlap
3. **User Requirements**: Pages need to customize header content (titles, actions) while maintaining consistency
4. **Design Preference**: Option E (Header as Page Responsibility) was chosen for maximum flexibility and simplicity

### Key Technical Details
- Current global header height: `h-16` (64px)
- Affected pages: design page, tweet thread page, potentially others
- Current ClientLayout has fixed header at `top-0` with `z-50`
- Design page has additional sticky header creating complex overlap issues

### Alternative Options Considered

**Option A: CSS Custom Property + Layout Wrapper**
- Define `--header-height` CSS variable and create a `PageLayout` component that all pages use
- Would solve the spacing issue but still rigid - all pages must use the same header structure
- Rejected because it doesn't address the core need for header content customization

**Option B: Route Groups with Different Layouts** 
- `/app/(with-header)/` for pages with global header, `/app/(fullscreen)/` for pages without
- Requires restructuring routes and still doesn't solve header customization within groups
- Rejected for being overly complex and not addressing customization needs

**Option C: Dynamic Layout Component**
- `<Layout hasGlobalHeader={true} hasSecondaryHeader={true}>` with props controlling layout
- Still centralizes header logic and makes exceptions complex to handle
- Rejected for not providing enough flexibility for diverse header needs

**Option D: Slot-based Header System**
- Layout accepts header content as slots/children, e.g. `children.header`
- Complex to implement and debug, not obvious where header content is defined
- Rejected for violating "simple and debuggable" coding principles

**Option F: Context-based Header**
- Pages set header content via React context, layout renders it
- Adds indirection and makes it harder to understand what header will render
- Rejected for making the code less explicit and harder to debug

**Chosen Option E: Header as Page Responsibility**
- Each page provides its own header using shared `AppHeader` component
- Maximum flexibility while maintaining consistency through component defaults
- Simple, explicit, and easy to debug - you see the header definition in the page file