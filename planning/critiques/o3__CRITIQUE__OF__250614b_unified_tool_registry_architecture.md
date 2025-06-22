Read file: components/command-palette.tsx

Read file: lib/tools/hooks/use-tool-url-state.ts

Ran tool
Read file: docs/reference/TOOL_TEMPLATE_FOR_CREATING_NEW.md

Ran tool
Read file: docs/reference/ARCHITECTURE_URL_STATE.md

CRITIQUE OF “250614b Unified Tool Registry Architecture”  
(Prepared following the guidelines in docs/instructions/CRITIQUE_OF_PLANNING_DOC.md)

────────────────────────────────────────────────────────
1  Overall assessment
────────────────────────────────────────────────────────
The document lays out a thoughtful, incremental migration path to a registry-based tool architecture and ties it tightly to existing URL-state and command-palette work.  The staged checklist, strong type-safety emphasis, and backwards-compatibility plan are major positives.

However, the scope is very large and several practical, performance, and integration details are either missing or under-specified.  Addressing these early will reduce re-work and help the migration land smoothly.

────────────────────────────────────────────────────────
2  Key strengths
────────────────────────────────────────────────────────
• Clear goals & principles – especially “gradual migration” and “URL is the single source of truth”.  
• Stage-based roadmap that can be paused after any stage with minimal risk.  
• Type-driven design (Zod + TS interfaces) aligns with existing patterns.  
• Places new work next to the current hooks (`lib/tools/hooks/use-tool-url-state.ts`) and command palette (`components/command-palette.tsx`) rather than replacing them abruptly.  
• Early inclusion of analytics hooks and caching shows forward thinking.

────────────────────────────────────────────────────────
3  Major concerns & potential problems
────────────────────────────────────────────────────────
1  Explosion of scope  
   - Stages cover *types, registry, executor, command generation, analytics, lazy-loading, dev-tools,* and *CLI*.  Even with parallel work this is months of effort.  You risk analysis paralysis or half-migrated code paths.  Consider splitting into multiple planning docs (registry core vs. executor/analytics).

2  Parallel systems maintenance overhead  
   - “Phase 1: Parallel Systems” leaves two command-definition sources (hard-coded and generated).  If feature flags or deprecation plan aren’t enforced, the lists will diverge quickly (see the already long switch in `components/command-palette.tsx`, lines 34-144).  At minimum add a “single source of truth” rule or a lint check that flags duplicate command IDs.

3  Bundle size & loading strategy  
   - Registering every tool eagerly in the browser will pull in all React components, icons and Zod schemas.  The doc mentions lazy loading but not *where*: per tool? per category?  Spell out a dynamic-import pattern and test it with Webpack/Next.js tree-shaking before committing.

4  Server/Client boundary ambiguity  
   - Where does `executeTool()` run?  Many existing tools call Next.js API routes (server).  The new interface allows arbitrary async work which might accidentally run heavy code on the client bundle.  Define an explicit “runtime: 'client' | 'server'” field or restrict `execute` to make a fetch call/route.

5  Registry lifecycle in Jest & hot-reload  
   - Module-level `Map` will persist across tests and Next.js hot-reload boundaries.  Without a `clearRegistry()` util you’ll get “duplicate registration” errors in watch mode and flaky tests.  Plan for reset hooks in `vitest.setup.ts` / `jest.setup.js`.

6  Coupling execution to navigation  
   - Returning `{type: 'navigation', navigation: {tab}}` from `execute()` mixes business logic with UI concern.  Prefer emitting an event from the executor or having a lightweight `open` helper separate from `execute`.

7  Caching & invalidation  
   - Simple `{enabled, ttl}` is insufficient for document-dependent data.  You also need an `etag` or `version` determined by document updated-at to avoid serving stale glossary when the user regenerates headings.  At least reference the existing Supabase row `documents.updated_at`.

8  Versioning strategy unclear  
   - The `version` field is semver, but migration or “multiple major versions” policy is not described.  Will the registry refuse to register two tools with the same `id` but different majors?  Consider `id@major`.

9  Analytics placeholder  
   - Good to stub, but decide where events are dispatched (client only? Next.js middleware?).  Without clarity, code may proliferate untracked `console.log` calls.

10  Auto-discovery hazards  
    - Auto-registering by scanning the filesystem could break on Vercel edge/functions bundles where dynamic FS access isn’t allowed.  Favour explicit `import './implementations/*.ts'` in a central barrel file or a `next-dynamic` pattern.

11  Security / RLS  
    - Tools that bypass the API layer by running logic directly in the executor can sidestep the existing RLS enforcement (e.g., `services/database/*`).  Document a rule: *“All data reads/writes must go through service layer or API route, not directly in execute().”*

12  Command generation conflicts  
    - If both hand-written and generated commands use the same shortcut (`⌘+5` etc.) registerTool must expose duplicates.  Define tie-break precedence (registry wins?) and surface warnings in dev mode.

────────────────────────────────────────────────────────
4  Smaller / tactical observations
────────────────────────────────────────────────────────
• ToolCategory enum may not fit multi-role tools (e.g., Summary is both navigation *and* generation).  Tag-based classification or multi-valued field is more flexible.  
• `component` property in Tool interface implies direct React import; server-only code should not reference it.  Maybe split `ui?: {...}` into a separate client-only registry.  
• Need explicit guideline on how registry interacts with `DocumentCommunicationContext` to avoid duplicate state sources.  
• Consider code-gen (“npx spideryarn-tool new”) sooner; otherwise new tools will deviate quickly.  
• Remember accessibility: generated commands must include ARIA labels and respect screen-reader order in command palette.

────────────────────────────────────────────────────────
5  Recommendations / next-step actions
────────────────────────────────────────────────────────
1  Trim Stage 1 to just *types + registerTool + basic discovery* and ship Glossary migration.  Defer executor/analytics.  
2  Write a proof-of-concept benchmark for lazy-loaded tool modules to validate bundle size impact before locking API shape.  
3  Add `resetRegistryForTests()` helper and call it in `jest.setup.js` now to avoid flaky duplicates later.  
4  Decide and document where `execute()` is allowed to run; failing to do so will cause unexpected client-side weight or server-less deployment issues.  
5  Add a short “Compatibility/Deprecation” section: when do we remove hard-coded command palette entries? how long is the parallel window?  
6  Extend caching section with invalidation key example tied to `documents.updated_at`.  
7  Write a small RFC for “navigation vs execution separation” and pick a pattern before more tools migrate.  
8  Surface duplicate shortcut / id conflicts at registration time with a dev-time error.

────────────────────────────────────────────────────────
6  Verdict
────────────────────────────────────────────────────────
The plan is sound in principle and aligns with Spideryarn’s architecture, but its breadth hides several implementation pitfalls.  Address the concerns above—especially execution context, bundle size, and duplicate-system maintenance—before starting Stage 2.  With those tightened, the registry will provide the consistency and scalability the codebase now needs.

Let me know if you’d like me to insert this critique into the planning document as an appendix; otherwise no code or doc changes have been made yet.