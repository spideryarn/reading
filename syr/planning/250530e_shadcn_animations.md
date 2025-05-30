# Animations

## Question from user

Let's think about the animations stage now. Perhaps start with the expand/collapse animations? Where else might animations be nice?

This is a nice-to-have. If it's going to create much complexity or other downsides, let's discuss.


## Response from Claude AI

Current Expand/Collapse Areas I See:

  1. Table of Contents (ToC) - Most obvious candidate, users constantly expanding/collapsing heading
  trees
  2. Document Summary sections - Currently has expand/collapse functionality
  3. AI-generated content reveals - When glossary/headings load and appear
  4. Tab switching - Could add smooth transitions between Document/ToC/Tools panes

  Key Questions & Considerations:

  Priority & Impact:

  - Which expand/collapse interactions feel most "jarring" currently?
  - Is the ToC the biggest win since users interact with it most frequently?
  - How much does the current "snappy" behavior actually bother users vs feel responsive?

  Technical Approach Trade-offs:

  Option A: shadcn/ui Collapsible Component
  - ✅ Built on Radix primitives, accessible by default
  - ✅ Handles prefers-reduced-motion automatically
  - ✅ Consistent with our shadcn/ui adoption
  - ❓ Requires wrapping existing components - how invasive is this?

  Option B: CSS-only animations
  - ✅ Lightweight, no additional dependencies
  - ✅ Easy to disable/customize
  - ❌ Need to handle accessibility manually
  - ❌ More custom code to maintain

  Broader Animation Scope:

  - Should we stick to expand/collapse only, or consider:
    - Loading state transitions (fade-in when content appears)?
    - Tab switching animations?
    - Button hover states?
    - Page transitions?

  Complexity Concerns:

  - How much existing code needs to change?
  - Will animations make debugging harder (e.g., when content isn't appearing, is it animation delay or
   actual failure)?
  - Performance impact with large document trees?

  My Instinct:

  Start small with ToC expand/collapse only since that's the highest-frequency interaction. Use
  shadcn/ui Collapsible for accessibility compliance. See how it feels before expanding scope.

  Questions for you:
  1. Which specific interactions feel most in need of smoothing?
  2. How important is this vs other features in your priority queue?
  3. Any performance sensitivity concerns with large documents?
  4. Should we audit current expand/collapse UX first to see what actually feels abrupt?