# Global Command Palette Implementation

## Goal

Make the command palette (Cmd+K/Ctrl+K) available on every page in the Spideryarn Reading application, with document-specific functionality either disabled or removed from the command list based on page context.

## Context

Currently, the command palette is only available on document pages (`/documents/[slug]`) because it's integrated within the `ResizableDocumentLayout` component and depends on `DocumentCommunicationContext`. The user wants to extend this functionality to work across all pages in the application for better user experience and consistency.

**User's Original Question:**
> How hard would it be to have the command palette available on every page?
> 
> I suppose the document-specific stuff should be either disabled or removed from the list.

## References

- `components/command-palette.tsx` - Current command palette implementation with document context dependencies
- `components/resizable-document-layout.tsx` - Where CommandPalette is currently integrated and DocumentCommunicationProvider is set up
- `lib/context/document-communication-context.tsx` - Context that provides document-specific actions (setActiveTab, etc.)
- `app/client-layout.tsx` - Global client-side layout where command palette could be integrated
- `docs/planning/250608e_command_palette_implementation.md` - Current command palette planning document with completed app navigation commands

## Principles & Key Decisions

### Current Architecture Analysis

**Document-Specific Commands (Require DocumentCommunicationContext):**
- 6 navigation commands use `actions.setActiveTab()`: Original Document, AI-Generated Document, Summary, Chat, Glossary, Search
- These commands will crash on pages without `DocumentCommunicationProvider`
- Only available on `/documents/[slug]` pages currently

**Global Commands (Work everywhere):**
- App navigation commands use Next.js router: Documents List, Upload Document, Settings
- Account commands use auth context: Profile, Sign In, Sign Up, Sign Out
- These already work globally and don't depend on document context

### Implementation Difficulty: **Moderate** ⚠️

**Easy Parts:**
- Moving CommandPalette component to `ClientLayout` ✅
- App navigation commands already work globally ✅  
- Authentication-dependent commands already work ✅

**Moderate Parts:**
- Making DocumentCommunicationContext usage conditional ⚠️
- Filtering commands based on page context ⚠️
- Testing across all page types ⚠️

### Recommended Approach: Conditional Context Usage

Make DocumentCommunicationContext optional and filter commands based on availability:

```typescript
// In command-palette.tsx
const documentContext = useContext(DocumentCommunicationContext) // Don't use the hook
const isDocumentPage = !!documentContext

const availableCommands = commands.filter(command => {
  // Hide navigation commands on non-document pages  
  if (command.category.id === 'navigation' && !isDocumentPage) {
    return false
  }
  return !command.condition || command.condition()
})
```

**Pros:** 
- Minimal code changes
- Respects existing architecture
- Commands automatically adapt to page context

**Cons:**
- Requires changing from `useDocumentCommunication()` hook to direct context usage

## Stages & Actions

### Stage: Analysis and Requirements Clarification
- [ ] Clarify user requirements for specific implementation details:
  - [ ] Should command palette appear on ALL pages (including auth forms, error pages) or just main app pages?
  - [ ] For document navigation commands on non-document pages, should they be hidden completely, disabled with tooltips, or navigate to recent document?
  - [ ] Should Cmd+1-6 shortcuts work globally (taking users to documents page first) or only on document pages?
  - [ ] Should there be a visual command palette trigger (icon/button) on pages without vertical nav bar?

### Stage: Conditional Context Implementation
- [ ] Modify command palette to use conditional DocumentCommunicationContext
  - [ ] Replace `useDocumentCommunication()` hook with direct `useContext(DocumentCommunicationContext)`
  - [ ] Add `isDocumentPage` detection based on context availability
  - [ ] Implement command filtering logic to hide navigation commands on non-document pages
  - [ ] Test that document pages continue to work as before
- [ ] Update command categories and grouping
  - [ ] Ensure Navigation category is hidden when no navigation commands are available
  - [ ] Verify App Navigation and Account categories display correctly on all page types

### Stage: Global Integration
- [ ] Move CommandPalette integration from ResizableDocumentLayout to ClientLayout
  - [ ] Add CommandPalette component to `app/client-layout.tsx`
  - [ ] Remove CommandPalette from `components/resizable-document-layout.tsx`
  - [ ] Ensure proper z-index and positioning for global usage
- [ ] Test command palette functionality across all page types
  - [ ] Test on home page (`/`)
  - [ ] Test on documents list (`/documents`)
  - [ ] Test on upload page (`/upload`)
  - [ ] Test on auth pages (`/auth/login`, `/auth/signup`, `/auth/profile`)
  - [ ] Test on settings page (`/settings`)
  - [ ] Test on document pages (`/documents/[slug]`) to ensure no regression

### Stage: Keyboard Shortcut Handling
- [ ] Implement global keyboard shortcut behavior
  - [ ] Decide on behavior for Cmd+1-6 shortcuts on non-document pages
  - [ ] Update keyboard event handlers to work consistently across all pages
  - [ ] Test platform-specific shortcuts (Mac vs Windows/Linux) globally
- [ ] Update tests to cover global keyboard shortcut scenarios
  - [ ] Test shortcut behavior on document vs non-document pages
  - [ ] Verify preventDefault behavior works globally

### Stage: Testing and Quality Assurance
- [ ] Update comprehensive test suite for global usage
  - [ ] Modify existing command palette tests to handle conditional context
  - [ ] Add tests for command filtering based on page context
  - [ ] Test error handling when context is unavailable
  - [ ] Verify accessibility attributes work on all page types
- [ ] Performance testing
  - [ ] Verify command palette adds minimal bundle size to all pages
  - [ ] Test that command palette loads efficiently when first triggered
  - [ ] Ensure no performance impact on existing functionality

### Stage: Documentation and Cleanup
- [ ] Update command palette documentation
  - [ ] Update `docs/planning/250608e_command_palette_implementation.md` with global implementation details
  - [ ] Document conditional context usage patterns for future reference
  - [ ] Update `docs/reference/KEYBOARD_SHORTCUTS.md` with global shortcut behavior
- [ ] Update this planning doc with final implementation notes
- [ ] Follow `docs/instructions/DEBRIEF_PROGRESS.md` to summarize completion
- [ ] Commit changes following `docs/instructions/GIT_COMMITS.md` (use subagent)
- [ ] Move this doc to `docs/planning/finished/`

## Appendix

### Alternative Approaches Considered

**Option A: Conditional Context Usage** (Recommended)
- **Pros**: Minimal code changes, respects existing architecture, commands automatically adapt to page context
- **Cons**: Requires changing from `useDocumentCommunication()` hook to direct context usage

**Option B: Move Context Provider Higher**
- **Pros**: No conditional logic needed, commands always available
- **Cons**: Significant refactoring required, introduces unnecessary complexity on pages that don't need document features

**Option C: Page-Specific Integration**
- **Pros**: Fine-grained control per page, no context conflicts
- **Cons**: More integration work, inconsistent availability across pages

### Implementation Complexity Breakdown

**Current Issues:**
- Command palette crashes on non-document pages due to unconditional `useDocumentCommunication()` usage
- 6 out of 13 commands rely on document context that doesn't exist globally
- Commands lack context-aware filtering

**Pages Affected:**
- **With DocumentCommunicationContext**: `/documents/[slug]` pages only
- **Without DocumentCommunicationContext**: `/`, `/documents`, `/upload`, `/auth/*`, `/settings`, `/demo/*`, all other pages

**Technical Requirements:**
- Make `DocumentCommunicationContext` usage conditional in command palette
- Filter commands based on context availability
- Maintain backward compatibility for document pages
- Ensure global keyboard shortcut handling
- Test across all page types for consistent behavior

### User Experience Considerations

1. **Command Consistency**: Users expect Cmd+K to work everywhere once they discover it
2. **Command Relevance**: Document navigation commands are meaningless on upload/auth pages
3. **Discoverability**: Command palette should provide appropriate commands for each page context
4. **Performance**: Adding command palette globally should not impact page load times
5. **Accessibility**: Global command palette must maintain keyboard navigation and screen reader support

### Questions for User Clarification

1. **Scope**: Should command palette appear on ALL pages (including auth forms, error pages) or just main app pages?
2. **Command Strategy**: For document navigation commands on non-document pages, should they be hidden completely, disabled with tooltips, or navigate to recent document?
3. **Keyboard Behavior**: Should Cmd+1-6 shortcuts work globally (taking users to documents page first) or only on document pages?
4. **Visual Integration**: Should there be a visual command palette trigger (icon/button) on pages without vertical nav bar?

---

*Planning document created: 9 June 2025*  
*Status: 📋 Awaiting user requirements clarification before implementation*