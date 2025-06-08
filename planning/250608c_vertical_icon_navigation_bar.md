# Vertical Icon Navigation Bar Implementation

## Goal

Replace the current vertical tab list in the left pane with a space-efficient vertical icon bar navigation system, similar to VSCode's activity bar. This will provide quick visual navigation between different tools while maximising content space and scaling better as new features are added.

## Context

Currently, the unified left pane displays navigation options as a vertical list of text tabs (Original, AI-generated, Summary, Chat, Glossary, Search). This is becoming unwieldy as more features are added, and doesn't scale well for future additions like metadata views and tweet threads.

## References

- `docs/reference/UNIFIED_LEFT_PANE.md` - Current left pane architecture and features
- `docs/reference/UI_COMPONENTS.md` - Available UI components and patterns
- `docs/reference/STYLING.md` - Phosphor icons usage and styling guidelines
- `docs/reference/CROSS_PANE_COMMUNICATION.md` - State management for pane interactions
- `components/unified-left-pane.tsx` - Current implementation to be modified
- `components/tab-container.tsx` - Existing tab container that may be reused/modified

## Principles & Key Decisions

### User Requirements
1. **Vertical icon bar** positioned on the far left edge of screen
2. **Nice tooltips** using existing Radix UI library with:
   - Bold tool name
   - One-sentence description underneath
3. **Future-proofing considerations**:
   - Scrollable rail for overflow
   - Hover expansion to show text labels
   - Mobile hamburger menu (later)
   - Command palette integration (much later)

### Design Decisions
1. **Icon selection**: Use Phosphor icons with duotone weight for consistency
2. **Width**: 48-60px for icon rail (similar to VSCode)
3. **Tooltip delay**: 600ms (consistent with existing tooltips)
4. **Active state**: Spideryarn orange highlight (#DB8A45)
5. **Maintain existing functionality**: Document position persistence, keyboard shortcuts

## Stages & Actions

### Stage: Preparation
- [x] Run `./scripts/sync-worktrees.ts` to sync latest changes from main
- [x] Research and document icon choices for each navigation mode

### Stage: Create Icon Navigation Component
- [ ] Create `components/vertical-icon-nav.tsx` with basic structure
  - [ ] Define TypeScript interfaces for navigation items
  - [ ] Implement icon button rendering with Phosphor icons
  - [ ] Add active state styling with Spideryarn orange
- [ ] Write tests for `VerticalIconNav` component in `components/__tests__/vertical-icon-nav.test.tsx`
  - [ ] Test icon rendering
  - [ ] Test active state changes
  - [ ] Test click handlers
- [ ] Run tests with `npm test`

### Stage: Implement Tooltips
- [ ] Add Radix UI Tooltip to each icon
  - [ ] Configure 600ms delay
  - [ ] Style tooltips with bold title and description
  - [ ] Position tooltips to the right of icons
- [ ] Update tests to verify tooltip content and behaviour
- [ ] Run tests

### Stage: Integrate with Unified Left Pane
- [ ] Modify `components/resizable-document-layout.tsx` to show VerticalIconNav when left pane is collapsed
- [ ] Replace the existing expand button with the icon navigation rail when collapsed
- [ ] Keep existing text tabs when left pane is expanded (Option 2 approach)
- [ ] Connect icon clicks to existing tab switching logic via DocumentCommunicationContext
- [ ] Ensure keyboard shortcuts (Ctrl+B) still work with new icon rail
- [ ] Update existing unified-left-pane tests
- [ ] Run all tests

### Stage: Visual Polish & Accessibility
- [ ] Add hover states and transitions
- [ ] Implement keyboard navigation (arrow keys between icons)
- [ ] Add ARIA labels and roles
- [ ] Test with keyboard-only navigation
- [ ] ACTION: Review UI with user for feedback

### Stage: Documentation & Cleanup
- [ ] Update `docs/reference/UNIFIED_LEFT_PANE.md` with new icon navigation
- [ ] Update `docs/reference/UI_COMPONENTS.md` if needed
- [ ] Add usage examples and screenshots
- [ ] Run final test suite
- [ ] Update this planning doc with progress
- [ ] Follow `docs/instructions/DEBRIEF_PROGRESS.md`
- [ ] Commit changes following `docs/instructions/GIT_COMMITS.md` (use subagent)

### Future Stages (Not Part of Initial Implementation)

### Stage: Scrollable Rail (Later)
- [ ] Detect when icons overflow viewport height
- [ ] Add subtle scroll indicators
- [ ] Implement smooth scrolling with CSS
- [ ] Consider virtualised scrolling for 50+ items

### Stage: Hover Expansion (Later)
- [ ] Add Framer Motion or CSS transitions
- [ ] Expand rail to ~200px on hover
- [ ] Show icon + text label when expanded
- [ ] Add preference to pin expanded state

### Stage: Mobile Support (Later)
- [ ] Add responsive breakpoints
- [ ] Implement hamburger menu for small screens
- [ ] Consider bottom navigation pattern
- [ ] Test on various mobile devices

### Stage: Command Palette Integration (Much Later)
- [ ] Design command structure for navigation
- [ ] Add keyboard shortcuts for each mode
- [ ] Integrate with Cmd/Ctrl+K palette
- [ ] Document shortcuts in help system

### Final Actions
- [ ] Move this doc to `planning/finished/`
- [ ] Final commit

## Appendix

### Final Icon Mapping

Based on research of Phosphor icons library and existing usage patterns in the codebase:

| Navigation Item | **SELECTED ICON** | Alternative | Rationale |
|----------------|------------------|-------------|-----------|
| **Original** | `Article` | `File`, `FileText` | Already used in codebase (line 19), represents source document clearly |
| **AI-generated** | `Robot` | `Sparkle`, `MagicWand` | Already used in assistant-chat.tsx (line 12), universally recognized AI symbol |
| **Summary** | `ListBullets` | `TextAlignLeft`, `ClipboardText` | Suggests condensed, organized content effectively |
| **Chat** | `ChatCircle` | `ChatTeardrop`, `Chat` | Clean, recognizable conversation icon |
| **Glossary** | `BookOpen` | `Book`, `Dictionary` | Reference/learning metaphor, distinct from chat |
| **Search** | `MagnifyingGlass` | N/A | Already used in unified-left-pane.tsx (line 14), universal search icon |

### Future Navigation Items

| Navigation Item | **SELECTED ICON** | Alternative | Rationale |
|----------------|------------------|-------------|-----------|
| **Metadata** | `Info` | `Tag`, `Gear` | Already used in codebase (line 20), represents document properties |
| **Tweet Thread** | `TwitterLogo` | `ChatCenteredText` | Already used in document-header.tsx, social/thread format |

### Icon Technical Details

**Weight**: `duotone` (consistent with design system)
**Size**: 20px (standard for navigation, can scale to 16px/24px as needed)
**Import Format**: 
```tsx
import { 
  Article, Robot, ListBullets, ChatCircle, 
  BookOpen, MagnifyingGlass, Info, TwitterLogo 
} from '@phosphor-icons/react'
```

**Usage Pattern**:
```tsx
<Article size={20} weight="duotone" className="text-gray-600" />
```

### Tooltip Content Structure

```tsx
interface TooltipContent {
  title: string;        // Bold, e.g., "Original Document"
  description: string;  // Plain text, e.g., "View the unmodified source document"
}

const navigationTooltips: Record<string, TooltipContent> = {
  original: {
    title: "Original Document",
    description: "View the unmodified source document with original headings"
  },
  'ai-generated': {
    title: "AI-Generated",
    description: "View document with AI-enhanced headings and structure"
  },
  summary: {
    title: "Summary",
    description: "Read hierarchical summaries at different detail levels"
  },
  chat: {
    title: "Chat",
    description: "Ask questions and discuss the document with AI"
  },
  glossary: {
    title: "Glossary",
    description: "Explore key terms and concepts from the document"
  },
  search: {
    title: "Search",
    description: "Find specific text or concepts within the document"
  }
};
```

### Accessibility Considerations

1. **Keyboard Navigation**:
   - Tab to enter rail, arrow keys to navigate
   - Enter/Space to activate
   - Escape to return focus to document

2. **Screen Reader Support**:
   - Proper ARIA labels on all buttons
   - Navigation landmark role
   - Announce active state changes

3. **Visual Indicators**:
   - Clear focus rings
   - High contrast between states
   - No reliance on colour alone

### Research Findings

From web research on best practices:

1. **Icon rails in professional tools** typically use 48-64px width
2. **Tooltips** should appear after 500-700ms delay to avoid accidental triggers
3. **Scrollable navigation** works best with subtle fade indicators at top/bottom
4. **Mobile patterns** often switch to bottom navigation or hamburger menu
5. **Successful examples**: VSCode, Figma, Obsidian all use similar patterns

### Alternative Approaches Considered

1. **Horizontal icon bar at top**: Rejected due to limited horizontal space with header
2. **Floating action buttons**: Too disruptive to reading experience
3. **Command palette only**: Not discoverable enough for primary navigation
4. **Grouped dropdown menus**: Added complexity without space savings

The vertical icon rail was chosen for its proven effectiveness in professional tools, space efficiency, and scalability for future features.

## Research Summary

### Icon Selection Methodology (Completed 8 June 2025)

**Research Approach:**
1. **Codebase Analysis**: Examined existing Phosphor icon usage in `unified-left-pane.tsx`, `assistant-chat.tsx`, `document-header.tsx`, and other components
2. **Icon Library Research**: Investigated Phosphor Icons duotone weight options via web search and official documentation
3. **Consistency Assessment**: Prioritized icons already in use to maintain design consistency
4. **Semantic Evaluation**: Selected icons that clearly represent their respective functions

**Key Findings:**
- **Existing Usage**: Many suitable icons (Article, Robot, MagnifyingGlass, Info) already imported in codebase
- **Duotone Weight**: Available across all selected icons, supports the sophisticated visual design
- **Professional Context**: All selected icons align with professional document reading application context
- **Scalability**: Icon choices support future navigation additions (metadata, tweet threads)

**Selected Icons Rationale:**
- `Article` (Original): Clean document representation, already in use
- `Robot` (AI-generated): Universal AI symbol, consistency with chat component  
- `ListBullets` (Summary): Visually suggests organized, condensed content
- `ChatCircle` (Chat): Balanced, professional conversation icon
- `BookOpen` (Glossary): Clear reference/learning metaphor
- `MagnifyingGlass` (Search): Universal search standard, already in use

**Next Stage Ready**: Component creation with finalized icon specifications and tooltip content structure.

### Implementation Progress (8 June 2025)

**Stage: Preparation ✅ COMPLETED**
- ✅ Synced latest changes from main branch via sync-worktrees script
- ✅ Comprehensive icon research completed with final selections documented
- ✅ Technical specifications defined (duotone weight, sizing, import patterns)
- ✅ Tooltip content structure finalized with proper descriptions
- ✅ Consistency analysis with existing codebase completed

**Current Status**: Ready to proceed to component creation stage with all research and planning completed.