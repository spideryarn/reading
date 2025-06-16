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


### Stage: Update Call-sites *(completed)*
- [x] `vertical-icon-nav.tsx` – replace direct `setActiveTab` calls with `navigateToTab`. ✅ (already done in original commit)
- [x] `command-palette.tsx` – same replacement. ✅ Completed
- [x] `simple-document-viewer.tsx` glossary click – same replacement. ✅ Completed
- [x] `resizable-document-layout.tsx` iconNav handler and internal clicks updated.
- [x] Grep for any remaining `setActiveTab(` usages and refactor or justify. ✅ Checked - remaining usages are in tests and unrelated tab-container component

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

### Stage: Documentation *(completed)*
- Update architecture doc and the three related planning docs. Each doc section should:
  1. State that the URL is SoT and context mirrors it.
  2. Provide code snippet for `navigateToTab`.
  3. Warn that direct `actions.setActiveTab` now throws in development.
  - [x] Update `docs/reference/ARCHITECTURE_URL_STATE.md` – describe SoT rule and helper. ✅ Completed
  - [x] **Update planning docs:**
    - [x] `250614a_tool_url_state_management.md` – prepend addendum & link (already part of user request). ✅ (not needed - this is handled via the new planning doc)
    - [x] `250614b_unified_tool_registry_architecture.md` – add assumption that registry should call `navigateToTab`/URL helper, never context. ✅ Completed
    - [x] `250614c_llm_tool_function_calling.md` – note that function execution changing tabs must write URL param only. ✅ Completed

### Stage: Testing
- [x] Jest unit tests for helper.
  - Unit: extend existing 33 tests with one new test that calls `actions.setActiveTab('x')` and asserts it throws when `urlStateEnabled===true`. ✅ Created new test file with 4 tests, all passing
- [x] Manual browser test (or Playwright MCP) verifying:
  - Tab switching updates URL. ✅ Confirmed: clicking tabs updates URL with ?tab= parameter
  - Back/forward restores context. ✅ Confirmed: browser back button correctly returns to previous tab
  - No 'Active tab changed' spam. ✅ Confirmed: no console spam detected
  - E2E (manual or Playwright): ✅ Tested with Puppeteer MCP
    - Navigate via icon bar, via command-palette shortcut, via glossary click; ensure URL updates and Back arrow returns to previous tab without console spam.

#### Testing Journal (2025-06-16)
- **Environment**: localhost:3001, Next.js 15.3.2 (Turbopack)
- **Test flow**: 
  1. Logged in with test credentials (hello@spideryarn.com)
  2. Navigated to test document
  3. Clicked Summary tab → URL updated to `?tab=summary` ✅
  4. Clicked Glossary tab → URL updated to `?tab=glossary` ✅
  5. Used browser back button → returned to `?tab=summary` ✅
  6. No infinite render loops or "Maximum update depth exceeded" errors ✅
  7. No excessive console logging detected ✅
- **Issues found**: 
  - Unrelated runtime error in document-communication-context.tsx (`Cannot read properties of undefined (reading 'logs')`)
  - Unrelated API error in glossary route (`tierKey is not defined`)
  - Neither issue affects URL state functionality
- **Conclusion**: URL single source of truth implementation working correctly

#### Follow-up fixes (2025-06-16)
Based on o3 AI feedback, fixed the following issues:
1. ✅ **Removed unused `actions` imports** in command-palette.tsx and simple-document-viewer.tsx
2. ✅ **Fixed stale closure bug** in document-communication-context.tsx by adding `state.urlStateEnabled` to useMemo deps
3. ✅ **Updated outdated comment** in use-tool-url-state.ts from "bidirectional sync" to "URL is single source of truth"
4. ✅ **Verified lint passes** - `npm run lint` shows no errors in modified files
5. ✅ **Checked remaining setActiveTab calls** - only in tests and unrelated tab-container component

### Stage: Review & Merge
- [ ] Debrief to user, ensure acceptance.
- [ ] Squash-merge feature branch following `GIT_COMMIT_CHANGES.md`.
- [ ] Move this planning doc to `planning/finished/`.
 