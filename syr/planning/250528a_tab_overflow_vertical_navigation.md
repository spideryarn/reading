# Tab Overflow Solution: Vertical Navigation

## Goal, context

**Problem**: The horizontal tab navigation in the Table of Contents left sidebar overflows when window width is narrow, making tabs inaccessible. Currently shows 3 tabs ("Original", "AI-generated", "Summary") and will likely grow to a half-dozen or more.

**Goal**: Implement a clean, scalable solution that handles tab overflow gracefully while maintaining good UX and being easy to implement with Tailwind CSS.

**User requirements**:
- Consider multi-line wrapping vs vertical list
- Focus on easy Tailwind implementation
- Design should clearly indicate 1-of-N selection state
- Start implementing recommended approach after planning


## References

- `components/tab-container.tsx` - Current horizontal tab implementation using flex layout
- `components/table-of-contents.tsx` - Usage context, shows 3 tabs that will grow
- `docs/WRITING_PLANNING_DOCS.md` - Planning document format guidelines
- Screenshot showing overflow issue on narrow windows


## Principles, key decisions

**Research findings**:
- **Multi-line tab wrapping is poor UX** - breaks visual connection between tab and content, disorienting
- **Vertical tabs are recommended for sidebars** - natural fit for unlimited growth, clear hierarchy
- **Horizontal scrolling better for headers** - but not ideal for sidebar context

**User decision**: Go with vertical list approach with clear 1-of-N selection design

**Technical approach**: 
- Modify TabContainer component to support vertical layout option
- Use Tailwind classes for clean selection states
- Maintain existing component API for minimal breaking changes

## Actions

- [x] **Research and design vertical tab pattern**
  - [x] Web research completed via subagent - found vertical tabs ideal for sidebars
  - [x] Design visual selection states using Tailwind classes
  - [x] Plan component API changes to support vertical/horizontal modes

- [x] **Implement vertical TabContainer option**
  - [x] Add `orientation` prop to TabContainer ("horizontal" | "vertical")
  - [x] Implement vertical layout with proper Tailwind classes
  - [x] Add clear active state styling (background, border, typography)
  - [x] Ensure accessibility with proper ARIA attributes
  - [x] Test component in isolation

- [x] **Update Table of Contents to use vertical tabs**
  - [x] Modify TableOfContents component to use vertical orientation
  - [x] Test with existing 3 tabs (Original, AI-generated, Summary)
  - [x] Verify responsive behavior on different screen sizes
  - [x] Check that content area layout adjusts properly

- [x] **Testing and validation**
  - [x] Write tests for new vertical tab functionality
  - [x] Test keyboard navigation and accessibility
  - [x] Test with narrow window widths (original problem scenario)
  - [x] Verify no regressions in existing functionality

- [x] **Code review and commit**
  - [x] Review changes with focus on maintainability
  - [x] Run linting and type checking  
  - [ ] Git commit following `docs/GIT_COMMITS.md` guidelines
  - [x] Update this planning doc with completion status

- [x] **Documentation update**
  - [x] Update component documentation/comments if needed
  - [x] Consider if any evergreen docs need updating

# Appendix

## Web Research Summary

**Key findings from subagent research**:
- Multi-line tab wrapping consistently rated as poor UX pattern
- Material UI, Ant Design, Chakra UI all recommend vertical tabs for sidebars
- Horizontal scrolling with `overflow-x-auto` is preferred for header tabs
- Clear visual selection patterns: background colors, borders, typography weight

**Recommended Tailwind implementation**:
```jsx
<nav className="flex flex-col space-y-1 p-4">
  <button className={`px-3 py-2 text-left rounded-md transition-colors ${
    activeTab === tab.id 
      ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-500' 
      : 'text-gray-600 hover:bg-gray-50'
  }`}>
    {tab.label}
  </button>
</nav>
```

**Visual selection indicators**:
- Active: Background color change, left border accent, text color change
- Hover: Subtle background change for inactive tabs
- Typography: Keep consistent, rely on color/background for state indication

## Component API Design

**Proposed TabContainer changes**:
- Add optional `orientation?: "horizontal" | "vertical"` prop (default: "horizontal")
- Maintain existing props: `tabs`, `defaultTab`, `className`, `title`
- No breaking changes to existing usage
- Vertical mode uses different layout classes but same basic structure