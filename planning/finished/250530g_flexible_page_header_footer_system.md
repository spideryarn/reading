# Flexible Page Header and Footer System

## Goal

Replace the current rigid global header system with a flexible approach where each page provides its own header content while maintaining consistency. Also migrated Footer from conditional ClientLayout rendering to page-level implementation to resolve hydration mismatch errors. This addresses the header overlap issues currently affecting the design page and tweet thread page, where content gets hidden behind the fixed global header.

### Current Problems
- Fixed global header in `ClientLayout` causes content overlap on pages
- Inconsistent padding workarounds (`pt-16`, `pt-24`, or no padding)
- Pages can't customize header content (titles, actions, navigation)
- Magic numbers tied to header height with no explicit connection
- No clear pattern for handling secondary headers
- Conditional Footer rendering in ClientLayout causes hydration mismatch errors

### Desired Behaviour
- Each page controls its own header content and styling
- Standard `AppHeader` component provides consistency when needed
- Pages can fully customize headers or build completely custom ones
- Landing page and other exceptions can opt out of headers entirely
- No content overlap issues
- Clean, maintainable header height management
- Footer as page-level responsibility to prevent hydration issues

## References

- `app/client-layout.tsx` - Current global header implementation that needs to be modified
- `app/design/page.tsx` - Has both global header overlap and its own sticky secondary header
- `app/documents/[slug]/tweets/page.tsx` - Suffers from header overlap with no compensation
- `docs/CODING_PRINCIPLES.md` - Emphasises simple, debuggable code and fixing root causes
- `docs/ARCHITECTURE.md` - Contains high-level architectural decisions and patterns
- `app/globals.css` - CSS custom properties system for theming

## Principles, Key Decisions

- **Header as Page Responsibility**: Each page provides its own header rather than having a global fixed header
- **Footer as Page Responsibility**: Each page provides its own footer rather than conditional rendering in layout
- **Consistency through Components**: Use shared `AppHeader` and `Footer` components with props for common customizations
- **Flexibility over Rigidity**: Pages can build completely custom headers when needed
- **CSS Custom Properties**: Use CSS variables for header height management instead of magic numbers
- **Simple and Explicit**: You should see the header and footer in the page file (no complex slot/context systems)
- **Easy Exceptions**: Landing page and other special cases can easily opt out
- **Gradual Migration**: Implement incrementally without breaking existing functionality
- **Hydration Safety**: Avoid conditional rendering in layouts that depends on client-side state

## Actions

### Stage: Foundation - Create AppHeader Component and CSS Variables ✅ COMPLETED
- [x] Add CSS custom property for header height to `app/globals.css`
  - [x] Add `--header-height: 4rem;` to `:root` section
  - [x] Add corresponding Tailwind configuration if needed
- [x] Create `components/app-header.tsx` component
  - [x] Support props for: title, backLink, actions, className
  - [x] Include Spideryarn logo and branding
  - [x] Use CSS custom property for height
  - [x] Default to standard styling but allow full customization
- [x] Write tests for AppHeader component
  - [x] Test with different prop combinations
  - [x] Test accessibility and responsive behaviour
- [x] Run tests to ensure new component works correctly
- [x] Git commit this foundational work

### Stage: Update Design Page ✅ COMPLETED
- [x] Remove current padding hack (`pt-16`) from design page
- [x] Replace existing dual header system with single AppHeader
  - [x] Use AppHeader with title="Design Reference" and backLink props
  - [x] Integrate the "Back to App" button into AppHeader actions
- [x] Update sticky secondary header positioning if needed
- [x] Test design page renders correctly without overlap
- [x] Git commit design page updates

### Stage: Update Tweet Thread Page ✅ COMPLETED
- [x] Replace current header implementation in `app/documents/[slug]/tweets/page.tsx`
- [x] Use AppHeader with appropriate title and back navigation
- [x] Test that content no longer overlaps with header
- [x] Verify navigation between document and tweet thread works correctly
- [x] Git commit tweet thread page updates

### Stage: Remove Global Header from ClientLayout ✅ COMPLETED
- [x] Remove fixed header from `app/client-layout.tsx`
- [x] Update any pages that were relying on global header
  - [x] Check `app/page.tsx` (homepage)
  - [x] Check `app/documents/page.tsx` 
  - [x] Check `app/documents/[slug]/page.tsx`
- [x] Remove any remaining padding hacks (`pt-16`, `pt-24`)
- [x] Test all pages render correctly
- [x] Run full test suite to catch any regressions
- [x] Git commit global header removal

### Stage: Footer Implementation (Page-Level) ✅ COMPLETED
- [x] Remove conditional Footer logic from `app/client-layout.tsx`
- [x] Add Footer component directly to pages that need it
  - [x] `app/design/page.tsx` (currently has Footer via ClientLayout)
  - [x] `app/documents/page.tsx` (currently has Footer via ClientLayout)
- [x] Test pages render correctly without hydration mismatch
- [x] Document Footer usage pattern in `docs/UI_COMPONENTS.md`
- [x] Git commit Footer migration to page-level

### Stage: Documentation and Cleanup ✅ COMPLETED
- [x] Update relevant documentation
  - [x] Update `docs/UI_COMPONENTS.md` with AppHeader usage patterns
  - [x] Update `docs/SITE_ORGANISATION_WEBSITE_STRUCTURE.md` if header patterns are documented there
- [x] Review all pages for consistency and best practices
- [x] Run linting and type checking

### Stage: Testing and Verification ✅ COMPLETED
- [x] Manual testing of all pages to verify header behaviour
  - [x] Homepage, documents listing, individual documents, design page, tweet threads
  - [x] All AppHeaders working correctly with no content overlap
  - [x] Navigation and branding consistent across pages
- [x] Check responsive design on different screen sizes
  - [x] Tested desktop (1920x1080, 1280x720), tablet (768x1024), mobile (414x896, 375x667)
  - [x] Excellent responsive behavior with appropriate text truncation
  - [x] All functionality preserved across screen sizes
- [x] Verify accessibility of new header system
  - [x] Good keyboard navigation and semantic HTML structure
  - [x] Proper ARIA labels and heading hierarchy
  - [x] Production-ready accessibility with minor enhancement opportunities

## Implementation Complete ✅

The flexible page header and footer system has been successfully implemented and tested. All planned stages have been completed:

✅ **Foundation**: AppHeader component created with CSS variables  
✅ **Migration**: Design page, tweet thread page, and global header updated  
✅ **Footer**: Moved from ClientLayout to page-level implementation  
✅ **Documentation**: UI_COMPONENTS.md and SITE_ORGANISATION_WEBSITE_STRUCTURE.md updated  
✅ **Testing**: Manual, responsive, and accessibility testing completed  

**Result**: Header overlap issues resolved, flexible page-level headers implemented, consistent Footer pattern established.

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