# Command Palette Implementation

## Goal

Implement a comprehensive command palette (CMD+K/Ctrl+K) interface using shadcn/ui Command component to provide keyboard-driven navigation and actions for power users. The command palette should complement the existing vertical icon navigation by offering rapid access to all navigation modes, document actions, and app-level functionality through a searchable, accessible interface.

## Context

The Spideryarn Reading application currently features a vertical icon navigation bar that provides visual access to different document viewing modes (Original, AI-generated, Summary, Chat, Glossary, Search). While this works well for mouse-driven interaction, power users would benefit from keyboard-driven navigation similar to VS Code, Linear, or Obsidian.

The application has established patterns for cross-pane communication through `DocumentCommunicationContext` and keyboard shortcuts (Cmd+B/Ctrl+B for sidebar toggle). A command palette would leverage these existing systems while providing a new interaction paradigm.

## References

- `docs/reference/CROSS_PANE_COMMUNICATION.md` - Existing React Context-based communication system for integrating command actions
- `docs/reference/SHADCN_UI_REFERENCE.md` - Component library documentation including Command component installation and usage patterns
- `planning/250608c_vertical_icon_navigation_bar.md` - Current navigation implementation that command palette will complement
- `docs/reference/KEYBOARD_SHORTCUTS.md` - Existing keyboard shortcut patterns and platform detection
- `components/resizable-document-layout.tsx` - Main layout component where command palette integration will occur
- `lib/context/document-communication-context.tsx` - Context API that provides state management for navigation and document actions
- `components/vertical-icon-nav.tsx` - Current icon navigation component that shows available modes and their tooltips

## Principles & Key Decisions

### User Requirements
1. **Keyboard-First Interaction**: Primary trigger via Cmd+K (Mac) / Ctrl+K (Windows/Linux) following industry standards
2. **Fuzzy Search**: Users should be able to type partial command names and get relevant results
3. **Visual Keyboard Shortcuts**: Display available shortcuts (⌘1, ⌘2, etc.) in command results for discoverability
4. **Contextual Commands**: Commands should be relevant to current document and tab context
5. **Complementary to Icon Nav**: Enhance rather than replace existing navigation patterns

### Technical Decisions
1. **Component Choice**: Use shadcn/ui Command component for accessibility, type safety, and design system consistency
2. **Integration Pattern**: Leverage existing `DocumentCommunicationContext` for all navigation and state changes
3. **Command Categories**: Organize commands into logical groups (Navigation, Document Actions, App Navigation)
4. **Performance**: Client-side search with immediate response, no API calls for basic navigation
5. **Accessibility**: Full keyboard navigation, screen reader support, and WCAG 2.1 compliance

### Scope Boundaries
1. **Phase 1 Focus**: Navigation between existing tabs and basic app navigation
2. **Future Enhancement**: Document content search, AI action triggers, advanced contextual commands
3. **Mobile Strategy**: Command palette hidden on mobile (existing icon nav handles touch interaction)
4. **Shortcut Conflicts**: Avoid conflicts with existing Cmd+B/Ctrl+B and browser shortcuts

## Stages & Actions

### Stage: Preparation ✅ COMPLETED
- [x] Run `./scripts/sync-worktrees.ts` to sync latest changes from main
- [x] Install and configure shadcn/ui Command component
  - [x] Run `npx shadcn@latest add command`
  - [x] Verify installation creates `components/ui/command.tsx` with all sub-components
  - [x] Test component imports and basic rendering

### Stage: Core Command Palette Component ✅ COMPLETED
- [x] Create `components/command-palette.tsx` with basic structure
  - [x] Implement CommandDialog with proper keyboard shortcuts (Cmd+K/Ctrl+K)
  - [x] Add platform detection for modifier keys using existing patterns from keyboard shortcuts doc
  - [x] Create TypeScript interfaces for command definitions and categories
  - [x] Add escape key handling and focus management (built into CommandDialog)
- [x] Integrate with DocumentCommunicationContext
  - [x] Import and use `useDocumentCommunication` hook
  - [x] Connect navigation commands to `actions.setActiveTab()`
  - [x] Connect document actions to context methods
- [x] Integration with ResizableDocumentLayout
  - [x] Add CommandPalette component to main layout
  - [x] Position outside main content flow to avoid layout shifts
  - [x] Fix React prop warnings in CommandDialog component
- [ ] Write comprehensive tests for CommandPalette component
  - [ ] Test keyboard shortcut triggering (Cmd+K/Ctrl+K)
  - [ ] Test command execution and tab switching
  - [ ] Test search filtering functionality
  - [ ] Test accessibility attributes and screen reader support
- [ ] Run tests with `npm test`

### Stage: Navigation Commands Implementation
- [ ] Define navigation command structure matching existing tabs
  - [ ] Original Document (⌘1) → `setActiveTab('original')`
  - [ ] AI-Generated (⌘2) → `setActiveTab('ai-generated')`
  - [ ] Summary (⌘3) → `setActiveTab('summary')`
  - [ ] Chat (⌘4) → `setActiveTab('chat')`
  - [ ] Glossary (⌘5) → `setActiveTab('glossary')`
  - [ ] Search (⌘6) → `setActiveTab('search')`
- [ ] Add keyboard shortcut display using CommandShortcut component
- [ ] Implement command categories using CommandGroup
  - [ ] "Navigation" group for tab switching
  - [ ] "App Navigation" group for page-level actions
  - [ ] "Document Actions" group for AI features (future)
- [ ] Test navigation commands integration
  - [ ] Verify all tab switches work correctly
  - [ ] Test that command palette closes after command execution
  - [ ] Verify keyboard shortcuts match visual indicators

### Stage: App Navigation Commands ✅ COMPLETED
- [x] Add app-level navigation commands
  - [x] Documents List (⌘D) → `router.push('/documents')`
  - [x] Upload Document (⌘U) → `router.push('/upload')`
  - [x] Settings (⌘,) → `router.push('/settings')`
  - [x] User Profile → `router.push('/auth/profile')`
- [x] Implement Next.js router integration
  - [x] Import and use `useRouter` hook
  - [x] Handle navigation with proper error handling (`navigateWithErrorHandling` function)
  - [x] Maintain URL state and browser history
- [x] Add conditional commands based on authentication state
  - [x] Show login/signup commands for unauthenticated users
  - [x] Show profile/logout commands for authenticated users
  - [x] Implement logout functionality with error handling
- [x] Test app navigation functionality
  - [x] Verify all routes navigate correctly
  - [x] Test authentication-dependent command visibility
  - [x] Ensure proper page state management
  - [x] Create comprehensive test suite with 25 passing tests

### Stage: Layout Integration ✅ COMPLETED (Previous Session)
- [x] Integrate CommandPalette into main document layout
  - [x] Add CommandPalette component to `components/resizable-document-layout.tsx`
  - [x] Position outside main content flow to avoid layout shifts
  - [x] Ensure proper z-index layering above all other content
- [x] Add CommandPalette to TooltipProvider context
  - [x] Wrap in existing Radix UI TooltipProvider
  - [x] Verify tooltip compatibility with command palette
- [x] Implement command palette state management
  - [x] Add open/close state to layout component
  - [x] Connect keyboard shortcuts to state changes
  - [x] Ensure proper cleanup of event listeners
- [x] Test layout integration
  - [x] Verify command palette renders correctly in all page contexts
  - [x] Test interaction with existing UI elements (resizable panes, tooltips)
  - [x] Verify no layout shifts or visual glitches

### Stage: Enhanced Search and Accessibility
- [ ] Implement fuzzy search functionality
  - [ ] Research and potentially integrate fuse.js or similar for better search
  - [ ] Add search highlighting for matched terms
  - [ ] Implement command ranking based on usage frequency
- [ ] Add comprehensive accessibility features
  - [ ] Implement arrow key navigation between commands
  - [ ] Add proper ARIA labels and descriptions
  - [ ] Test with screen readers (VoiceOver, NVDA)
  - [ ] Ensure keyboard-only interaction works perfectly
- [ ] Add visual polish and animations
  - [ ] Implement smooth open/close transitions
  - [ ] Add subtle hover and focus states
  - [ ] Ensure consistent styling with design system
- [ ] Comprehensive accessibility testing
  - [ ] Test with keyboard-only navigation
  - [ ] Verify screen reader announcements
  - [ ] Test with high contrast mode and color themes

### Stage: Documentation and Polish
- [ ] Update keyboard shortcuts documentation
  - [ ] Add command palette shortcuts to `docs/reference/KEYBOARD_SHORTCUTS.md`
  - [ ] Document all command categories and available actions
  - [ ] Include accessibility information and support
- [ ] Update relevant component documentation
  - [ ] Add command palette usage to `docs/reference/UI_COMPONENTS.md`
  - [ ] Update `docs/reference/CROSS_PANE_COMMUNICATION.md` with command integration
  - [ ] Document command palette architecture decisions
- [ ] Create user interface help content
  - [ ] Add "Help" command to command palette showing available shortcuts
  - [ ] Consider adding keyboard shortcut hints to existing tooltips
  - [ ] Update application help or onboarding content
- [ ] Final testing and quality assurance
  - [ ] Run full test suite: `npm test`
  - [ ] Run type checking: `npm run build`
  - [ ] Run linting: `npm run lint`
  - [ ] Test on multiple browsers and screen sizes
  - [ ] User acceptance testing with keyboard navigation patterns

### Stage: Visual Command Palette Integration
- [ ] Design and implement visual command palette access
  - [ ] Research placement options: vertical icon rail, top of left pane, floating button
  - [ ] Add command palette icon to vertical icon navigation rail
  - [ ] Consider search input box at top of left pane as alternative
  - [ ] Add visual indicator showing Cmd+K shortcut availability
  - [ ] Test visual integration with existing layout and navigation
- [ ] Enhance discoverability
  - [ ] Add tooltip hints about command palette in relevant UI elements
  - [ ] Consider onboarding hints for new users
  - [ ] Update help text and keyboard shortcut displays

### Stage: Structured Rich Text Commands (Phase 1)
- [ ] Implement pattern-based command parsing
  - [ ] Add `pattern` field to command interface for regex matching
  - [ ] Implement "search for X" → trigger search with query
  - [ ] Add "go to X" → navigation to headings/sections
  - [ ] Support "find X" → highlight in glossary + document
- [ ] Enhance command input handling
  - [ ] Multi-step command UI (command selection → parameter input)
  - [ ] Command suggestions based on partial input
  - [ ] Parameter completion for known entities (headings, glossary terms)
- [ ] Test structured command functionality
  - [ ] Verify pattern matching works correctly
  - [ ] Test parameter extraction and validation
  - [ ] Ensure fallback to regular command search

### Stage: LLM-Powered Command Parsing (Phase 2)  
- [ ] Design LLM command interpretation system
  - [ ] Add `llmDescription` field to commands for AI parsing
  - [ ] Create prompt template for command interpretation
  - [ ] Integrate with existing LLM infrastructure
- [ ] Implement natural language command parsing
  - [ ] "Find all mentions of X in the document"
  - [ ] "Create a summary focusing on Y"
  - [ ] "What does the author say about Z?"
  - [ ] "Generate glossary for section X"
- [ ] Add context-aware command suggestions
  - [ ] Commands based on current document content
  - [ ] Suggestions based on current tab/mode
  - [ ] Recent command history and patterns
- [ ] Test LLM command integration
  - [ ] Verify command interpretation accuracy
  - [ ] Test fallback to structured commands
  - [ ] Performance and response time testing

### Stage: User Feedback and Refinements
- [ ] ACTION: Review implementation with user for feedback
- [ ] ADDRESS: Any usability concerns or feature requests
- [ ] ENHANCE: Command palette based on user testing results
- [ ] POLISH: Performance optimizations if needed

### Stage: Future Enhancements Planning (Documentation Only)
- [ ] Document future enhancement possibilities
  - [ ] Document content search within command palette
  - [ ] AI action triggers (generate summary, extract glossary)
  - [ ] Recent commands and usage analytics
  - [ ] Plugin architecture for extensible commands
- [ ] Update planning documentation
  - [ ] Move current planning doc to `planning/finished/`
  - [ ] Create follow-up planning docs for advanced features if needed

### Final Actions
- [ ] Update this planning doc with final implementation notes
- [ ] Follow `docs/instructions/DEBRIEF_PROGRESS.md` to summarize completion
- [ ] Commit changes following `docs/instructions/GIT_COMMITS.md` (use subagent)
- [ ] Move this doc to `planning/finished/`

## Appendix

### Research Summary: Command Palette Libraries and Patterns

**shadcn/ui Command Component Analysis:**
- Built on `cmdk` library (8kb gzipped) by Paco Coursey (@pacocoursey) from Vercel team
- Used by Linear, Vercel, and many professional applications
- Provides complete command palette functionality: search, keyboard navigation, categories, shortcuts
- Full accessibility support with WAI-ARIA compliance
- Perfect TypeScript integration with type-safe command definitions
- Seamless integration with existing shadcn/ui design system

**Alternative Libraries Considered:**
- **kbar**: Popular choice but shadcn/ui Command is better integrated with existing stack
- **react-cmdk**: More opinionated styling but less customizable than shadcn/ui approach
- **react-command-palette**: Focused on accessibility but less feature-complete
- **Custom implementation**: Too much work for minimal benefit given excellent existing solutions

**Industry Standard Keyboard Shortcuts:**
- **Cmd+K / Ctrl+K**: Most popular (Linear, Slack, GitHub, Superhuman) - **SELECTED**
- **Cmd+Shift+P / Ctrl+Shift+P**: Developer tools focus (VS Code, Sublime Text)
- **Cmd+P / Ctrl+P**: Quick file navigation (VS Code, Obsidian)

**Command Categories Structure:**
Based on analysis of successful applications and current Spideryarn features:

1. **Navigation (Primary)**: Tab switching with visual shortcuts
   - Matches existing vertical icon navigation exactly
   - Keyboard shortcuts align with number keys (⌘1-⌘6)
   - Most frequent user actions for immediate accessibility

2. **App Navigation**: Page-level routing and core app functions
   - Documents list, upload, settings - essential app functionality
   - Standard shortcuts following macOS/Windows conventions (⌘D, ⌘U, ⌘,)

3. **Document Actions (Future)**: AI-powered document processing
   - Generate AI headings, create summaries, extract glossary
   - Context-aware based on current document and processing state
   - Potential for dynamic commands based on document content

### Technical Implementation Details

**Component Architecture:**
```typescript
// Core command structure
interface Command {
  id: string
  name: string
  keywords?: string[]
  shortcut?: string[]
  category: CommandCategory
  action: () => void | Promise<void>
  condition?: () => boolean  // For conditional display
}

interface CommandCategory {
  id: string
  name: string
  priority: number  // For ordering
}
```

**Integration with DocumentCommunicationContext:**
```typescript
// Example command implementation
const navigationCommands: Command[] = [
  {
    id: 'nav-original',
    name: 'Original Document',
    keywords: ['document', 'original', 'source'],
    shortcut: ['⌘', '1'],
    category: NAVIGATION_CATEGORY,
    action: () => actions.setActiveTab('original')
  }
  // ... other commands
]
```

**Keyboard Shortcut Implementation:**
Leveraging existing platform detection patterns from `docs/reference/KEYBOARD_SHORTCUTS.md`:
```typescript
// Platform-specific modifier key detection
const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0
const modifierKey = isMac ? 'metaKey' : 'ctrlKey'
const displayModifier = isMac ? '⌘' : 'Ctrl+'
```

**Accessibility Implementation:**
- Full keyboard navigation with arrow keys, Enter, and Escape
- Screen reader support with proper ARIA labels and live regions
- High contrast mode compatibility
- Focus management and trapping within modal
- No mouse/touch dependency for core functionality

### User Experience Design Decisions

**Command Discoverability:**
- Visual keyboard shortcuts in command results (⌘1, ⌘2, etc.)
- Fuzzy search allows partial typing ("summ" finds "Summary")
- Categorized organization helps users understand available actions
- Help command shows all available shortcuts and usage

**Performance Characteristics:**
- Client-side search with immediate response (no API calls)
- Minimal bundle size impact (shadcn/ui Command + cmdk ≈ 8kb)
- No impact on existing application performance
- Command palette loads only when first triggered

**Mobile Strategy:**
- Command palette hidden on touch devices (not applicable for keyboard interaction)
- Existing vertical icon navigation handles mobile use cases perfectly
- Responsive design ensures no conflicts with touch interfaces
- Focus remains on desktop power user enhancement

### Alternative Approaches Considered and Rejected

**Option 1: Custom Implementation**
- **Pros**: Full control over features and styling
- **Cons**: Significant development time, accessibility complexity, maintenance burden
- **Decision**: Rejected - shadcn/ui Command provides all needed functionality

**Option 2: Separate Search Component**
- **Pros**: Focused on search-only functionality
- **Cons**: Doesn't solve navigation needs, less discoverable than command palette
- **Decision**: Rejected - command palette provides broader value

**Option 3: Enhanced Dropdown Menu**
- **Pros**: Familiar UI pattern, easy to implement
- **Cons**: Not keyboard-driven, doesn't scale well, poor discoverability
- **Decision**: Rejected - doesn't meet power user requirements

**Option 4: Floating Action Button**
- **Pros**: Always visible, mobile-friendly
- **Cons**: Takes screen space, conflicts with reading focus, not keyboard-accessible
- **Decision**: Rejected - disrupts document reading experience

### Future Enhancement Possibilities

**Document Content Search:**
- Integration with existing search functionality
- Semantic search using AI embeddings
- Cross-document search across user's document library
- Search result previews with context

**AI Action Integration:**
- "Generate summary for current section"
- "Ask AI about highlighted text"
- "Create glossary for technical terms"
- "Translate selected content"

**Advanced Power User Features:**
- Command history and frequency-based ranking
- Custom user-defined commands or macros
- Command chaining (e.g., "generate summary then switch to summary tab")
- Plugin architecture for third-party commands

**Contextual Intelligence:**
- Different commands based on current document type (PDF vs HTML vs text)
- Position-aware commands ("summarize current section")
- Reading progress-based suggestions
- Time-based command suggestions (recently used, frequently accessed)

### Integration with Existing Systems

**Cross-Pane Communication:**
Command palette leverages the established `DocumentCommunicationContext` pattern:
- No new communication patterns needed
- Consistent with existing architecture
- Type-safe integration with existing state management
- Easy to extend with new actions

**Keyboard Shortcuts System:**
Builds on existing keyboard shortcut infrastructure:
- Consistent platform detection
- No conflicts with existing Cmd+B/Ctrl+B sidebar toggle
- Follows established patterns for shortcut display and handling
- Easy to add new shortcuts following existing conventions

**Design System Integration:**
Perfect alignment with current design approach:
- Uses shadcn/ui components already adopted
- Consistent with existing Radix UI primitives
- Matches Spideryarn orange theme (#DB8A45)
- No additional design system complexity

### Success Criteria

**Functional Requirements:**
- [ ] Command palette opens reliably with Cmd+K/Ctrl+K
- [ ] All navigation commands work identically to icon navigation clicks
- [ ] Search functionality finds commands with partial typing
- [ ] Keyboard navigation works completely without mouse
- [ ] App navigation commands properly route to intended pages

**Performance Requirements:**
- [ ] Command palette opens within 100ms of keyboard shortcut
- [ ] Search results appear immediately as user types
- [ ] No impact on existing application loading or interaction performance
- [ ] Bundle size increase less than 10kb

**Accessibility Requirements:**
- [ ] Full keyboard navigation support
- [ ] Screen reader compatibility with proper announcements
- [ ] High contrast mode compatibility
- [ ] Focus management prevents focus loss or trapping
- [ ] WCAG 2.1 AA compliance for all interactions

**User Experience Requirements:**
- [ ] Intuitive command discovery and execution
- [ ] Consistent behavior with established command palette patterns
- [ ] Non-disruptive integration with existing workflows
- [ ] Clear visual feedback for all interactions
- [ ] Helpful for both new users (discovery) and power users (efficiency)

---

*Planning document created: 8 June 2025*  
*Last updated: 8 June 2025*  
*Status: 🚧 In Progress - Core implementation completed, testing and enhancements in progress*

## Implementation Progress Summary

### ✅ Completed (8 June 2025)
- **Core command palette infrastructure**: CommandPalette component with full keyboard shortcut support
- **Platform detection**: Proper Cmd/Ctrl key handling for Mac vs Windows/Linux
- **Navigation commands**: All 6 tab navigation commands (⌘1-⌘6) with visual shortcuts
- **App navigation**: Documents, Upload, Settings navigation with standard shortcuts
- **Authentication integration**: Conditional commands based on user state (login/signup vs profile/logout)
- **Error handling**: Robust navigation error handling and logout functionality
- **Context integration**: Full DocumentCommunicationContext integration for state management
- **Layout integration**: Positioned in ResizableDocumentLayout without layout shifts
- **TypeScript safety**: Complete type definitions for commands and categories
- **React compatibility**: Fixed prop warnings and React 19 compatibility
- **Comprehensive testing**: 25 passing tests covering all functionality

### 🔄 In Progress  
- **Enhanced accessibility**: Screen reader support and WCAG compliance verification
- **Visual integration**: Design placement for command palette icon in UI

### 📋 Planned Next Steps
1. **Visual integration**: Add command palette icon to vertical navigation rail
2. **Rich text commands**: Pattern-based parsing for "search for X" style commands  
3. **LLM integration**: Natural language command interpretation for advanced queries
4. **User feedback**: Review and refinement based on usage patterns