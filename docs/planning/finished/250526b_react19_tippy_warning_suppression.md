# React 19 Tippy Warning Suppression

## Goal, context

**Problem**: React 19 compatibility warning appearing in console: "Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release."

**Root cause**: The `@tippyjs/react` library (v4.2.6) used for Table of Contents tooltips hasn't been updated for React 19 compatibility yet. The library internally accesses `element.ref` directly, which is deprecated behaviour in React 19.

**Impact**: Warning appears in browser console during development, causing developer experience friction. Functionality remains intact - tooltips work perfectly.

**Solution approach**: Temporarily suppress the specific warning in Next.js config while waiting for library maintainers to release React 19 compatible version.

## Principles, key decisions

- **Temporary fix**: This is intentionally a short-term solution until `@tippyjs/react` releases React 19 compatibility
- **Targeted suppression**: Only suppress the specific React 19 `element.ref` warning, not all warnings
- **Development-only**: Warning suppression only affects development mode, not production
- **Documentation**: Clear comments explaining the temporary nature and migration path

## Actions

- [x] **Implement warning suppression in next.config.ts**
  - [x] Add webpack configuration to override console.warn in development
  - [x] Filter out specific React 19 element.ref warnings
  - [x] Add descriptive comments linking to this planning doc
  - [x] Preserve all other console warnings for normal debugging

- [ ] **Future migration (when library is updated)**
  - [ ] Monitor `@tippyjs/react` releases for React 19 compatibility
  - [ ] Update library to React 19 compatible version
  - [ ] Remove warning suppression from next.config.ts
  - [ ] Test tooltips still work correctly after library update
  - [ ] Archive this planning document

- [ ] **Alternative library consideration (if needed)**
  - [ ] If `@tippyjs/react` doesn't update within reasonable timeframe, consider alternatives:
    - [ ] `@radix-ui/react-tooltip` (likely React 19 compatible)
    - [ ] `@floating-ui/react` with custom tooltip implementation
  - [ ] Evaluate migration effort vs waiting for upstream fix

## Status

**Current**: Warning suppressed successfully. Tooltips functioning normally in development.

**Next check**: Review `@tippyjs/react` releases monthly for React 19 compatibility update.