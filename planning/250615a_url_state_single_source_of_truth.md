# URL-State Single Source-of-Truth for Tool Tabs

(written by o3)

## Goal & Context

We have experienced infinite-loop render bugs caused by two-way synchronisation between
1. the browser URL (via `useQueryStates / nuqs`), and
2. the `DocumentCommunicationContext`'s `activeTabId`.

The root cause is that **both layers claim to be the source of truth**.  Small
latency or closure mismatches cause them to bounce updates back and forth,
culminating in "Maximum update depth exceeded" errors and noisy console spam.

The proposal is to **make the URL parameter the single authoritative source for
tab state**.  The context becomes a read-only subscriber that mirrors the URL,
while *all code that wishes to navigate* switches tab via the URL-state helper.

This aligns with the existing design goals of the URL-state project: shareable
links, back/forward navigation, and LLM-generated URLs.

## References

- `planning/250614a_tool_url_state_management.md` – original multi-tool URL state plan (to be updated)
- `components/unified-left-pane.tsx`, `components/vertical-icon-nav.tsx`, `components/command-palette.tsx` – primary tab-changing call-sites
- `lib/tools/hooks/use-tool-url-state.ts` – bi-directional sync hook
- `docs/reference/ARCHITECTURE_URL_STATE.md` – current architecture guide
- `planning/250614b_unified_tool_registry_architecture.md` – registry will dispatch tab changes
- `planning/250614c_llm_tool_function_calling.md` – LLM functions will rely on URL parameters

## Principles & Key Decisions

- Single source of truth for any given piece of state → fewer sync bugs.
- URL parameter wins because it enables shareable links & browser history.
- Context remains for intra-component convenience but must never drive the URL.
- Provide a thin wrapper (`navigateToTab`) so most code remains unaware of routing mechanics.
- Dev-time guard: direct `actions.setActiveTab` throws if URL-sync is enabled.

## Stages & Actions

### Stage: Refactor `useToolUrlState`
- [x] Remove the *context → URL* effect.
- [x] Keep *URL → context* effect.
- [x] Add dev-mode guard inside `actions.setActiveTab` to throw when called directly if `urlStateEnabled`.
- [x] Expose `navigateToTab(tabId)` helper that internally calls `setState({ tab })`.
- [x] Add `buildUpdates()` helper to create exactOptionalPropertyTypes-safe update objects.


### Stage: Update Call-sites *(in progress)*
- [ ] `vertical-icon-nav.tsx` – replace direct `setActiveTab` calls with `navigateToTab`.
- [ ] `command-palette.tsx` – same replacement.
- [ ] `simple-document-viewer.tsx` glossary click – same replacement.
- [x] `resizable-document-layout.tsx` iconNav handler and internal clicks updated.
- [ ] Grep for any remaining `setActiveTab(` usages and refactor or justify.

> Implementation notes for each file
> * Import `useNavigateToTab` at the top: `import { useNavigateToTab } from '@/lib/tools/hooks/use-tool-url-state'`
> * Inside the component call `const navigateToTab = useNavigateToTab()` once.
> * Replace callback bodies:
> ```ts
> // OLD
> actions.setActiveTab('summary')
> // NEW
> navigateToTab('summary')
> ```
> * Remove unused `actions` imports if they were only used for tab changes.

### Stage: Documentation
- Update architecture doc and the three related planning docs. Each doc section should:
  1. State that the URL is SoT and context mirrors it.
  2. Provide code snippet for `navigateToTab`.
  3. Warn that direct `actions.setActiveTab` now throws in development.
  - [ ] Update `docs/reference/ARCHITECTURE_URL_STATE.md` – describe SoT rule and helper.
  - [ ] **Update planning docs:**
    - [ ] `250614a_tool_url_state_management.md` – prepend addendum & link (already part of user request).
    - [ ] `250614b_unified_tool_registry_architecture.md` – add assumption that registry should call `navigateToTab`/URL helper, never context.
    - [ ] `250614c_llm_tool_function_calling.md` – note that function execution changing tabs must write URL param only.

### Stage: Testing
- [ ] Jest unit tests for helper.
  - Unit: extend existing 33 tests with one new test that calls `actions.setActiveTab('x')` and asserts it throws when `urlStateEnabled===true`.
- [ ] Manual browser test (or Playwright MCP) verifying:
  - Tab switching updates URL.
  - Back/forward restores context.
  - No 'Active tab changed' spam.
  - E2E (manual or Playwright):
    - Navigate via icon bar, via command-palette shortcut, via glossary click; ensure URL updates and Back arrow returns to previous tab without console spam.

### Stage: Review & Merge
- [ ] Debrief to user, ensure acceptance.
- [ ] Squash-merge feature branch following `GIT_COMMIT_CHANGES.md`.
- [ ] Move this planning doc to `planning/finished/`.
 