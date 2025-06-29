# Goal and Context

Spideryarn Reading currently has overlapping authentication helpers (`validateAuth`, two different `requireAuth` functions, and assorted mocks).  These duplications create inconsistent behaviour (throw vs redirect vs result‐object), increase mocking boiler-plate, and encourage ambiguous call-sites.

This planning document proposes a **root-cause refactor** to converge on a single, well-typed helper set while removing the legacy `route-protection.ts` module.


## Problem Statement

1. Two different `requireAuth` exports exist (`lib/auth/server-auth.ts` and `lib/auth/route-protection.ts`).
2. `validateAuth()` mixes two paradigms in one signature (throws or returns an object depending on arguments), leading to confusing types and widespread conditional logic.
3. Duplicated helpers complicate unit-test mocking and increase maintenance cost.
4. The unused `route-protection.ts` file adds cognitive overhead and risks accidental import.


## Desired Outcome / Acceptance Criteria

- ✅ A **single** canonical helper module (`lib/auth/server-auth.ts`) exposes three clearly-named functions with one behaviour each:
  1. `getAuthUser(): Promise<User | null>` – returns the current user or `null`; never throws or redirects.
  2. `requireAuth(opts?: { redirectTo?: string }): Promise<User>` –
     * If `opts.redirectTo` is provided and unauthenticated, performs `redirect()` to that URL.
     * Else throws an `AuthError` with status 401.
  3. `assertAuth(request: Request): { success: boolean; user?: User; error?: string }` – never throws or redirects.
- ✅ `AuthError` class defined in `lib/auth/errors.ts` (or inside server-auth) with `status = 401` and safe message.
- ✅ All server components and API routes use **only** `getAuthUser` or `requireAuth`.
- ✅ `lib/auth/route-protection.ts` deleted; its helper functions either removed (if unused) or relocated.
- ✅ Jest helpers updated to mock only `getAuthUser()`.
- ✅ All tests and `npm run check:health` pass.
- ✅ Documentation updated (`docs/reference/AUTHENTICATION_OVERVIEW.md`, `server-auth` JSDoc) and deprecation notice added for `validateAuth`.


## References

- `lib/auth/server-auth.ts` – current helper implementations (to be refactored)
- `lib/auth/route-protection.ts` – duplicate helpers, slated for deletion
- `docs/reference/AUTHENTICATION_OVERVIEW.md` (and other relevant docs?) – will need update
- `docs/instructions/WRITE_PLANNING_DOC.md` – planning doc guidelines (this document follows)


## Guiding Principles & Decisions

- **Single source of truth**: All authentication utilities live in one module.
- **One function → one responsibility**: Each helper has exactly one behaviour (no optional overloads).
- **Explicit failure handling**: API routes throw an `AuthError`; UI components may redirect.
- **Minimal developer friction**: Most common usage pattern (`requireAuth()` in API routes) remains a one-liner.
- **Backward compatibility**: `validateAuth` remains exported but marked **deprecated** to avoid breaking external consumers mid-refactor; internal code will migrate.


## Stages & Actions

### Stage: Preparation & Research ✅ COMPLETED
- [x] Search (`ripgrep`) for imports of `validateAuth`, `requireAuth`, and `route-protection` to quantify migration scope.
- [x] Add `AuthError` class with HTTP status 401.
- [x] Implement `getAuthUser`, `requireAuth`, `assertAuth` per acceptance criteria.
- [x] Deprecate `validateAuth` (JSDoc `@deprecated`) and have it internally call new helpers.
- [x] Export new helpers and ensure existing named exports remain.
- [x] Update unit tests for `server-auth` to cover new behaviours (success, null, redirect, throw).

### Stage: Delete Legacy Module & Relocate Utilities
- [ ] Confirm `lib/auth/route-protection.ts` is unused via `ripgrep`.
- [ ] If `isBot` / `createUnauthorizedResponse` **unused**, delete; if used elsewhere, move to `lib/utils/http-auth.ts` and update imports.
- [ ] Remove the file and update `tsconfig` paths if necessary.

### Stage: Codebase-wide Migration
- [ ] **Codemod**: Replace `validateAuth()` (throwing style) with `requireAuth()` across `app/api/*`.
- [ ] Replace pattern `await validateAuth(request, { requireAuth: true })` with `assertAuth(request)` OR `requireAuth()` depending on use-case.
- [ ] Replace imports of `lib/auth/route-protection` helpers with new ones.
- [ ] Run `npm run check:health --quick` to catch immediate type errors.

### Stage: Update Tests & Mocks
- [ ] Delete `setupValidateAuthMock`, `mockValidateAuth`, and consolidate into `mockGetAuthUser()`.
- [ ] Refactor affected tests to use `getAuthUser` mock.
- [ ] Ensure E2E tests still login correctly.

### Stage: Documentation & Evergreen Updates
- [ ] Update `docs/reference/AUTHENTICATION_OVERVIEW.md` helper descriptions.
- [ ] Add upgrade note in `docs/reference/ARCHITECTURE_DECISIONS.md` (or new ADR) explaining rationale.
- [ ] Search docs for `validateAuth` examples and update.

### Stage: External Critique & Review
- [ ] Commit initial refactor; run external AI critique per `docs/instructions/GATHER_DIVERSE_INPUTS_AND_CRITIQUES_ON_PLANNING_DOCS_FROM_OTHER_AI_MODELS.md`.
- [ ] Incorporate useful feedback; update code/doc accordingly.

### Stage: Final Validation & Cleanup
- [ ] Run `npm run test` (unit + integration) in subagent.
- [ ] Run `npm run check:health` (rigorous) to ensure TS, ESLint, build all pass.
- [ ] Manual Playwright smoke test: login, hit a protected API route (expect success), unauthenticated request (expect 401 JSON), unauthenticated page (expect redirect).
- [ ] Search for remaining `validateAuth(` or `route-protection` strings – expect zero.

### Stage: Remove Deprecated Code (Post-Migration)
- [ ] Remove deprecated `validateAuth` function from `lib/auth/server-auth.ts`.
- [ ] Remove any remaining deprecated function overloads and legacy compatibility code.
- [ ] Update JSDoc and TypeScript definitions to reflect final API.
- [ ] Run final `npm run check:health` to ensure no regressions.
- [ ] Move this doc to `planning/finished/`

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Hidden external consumers of `validateAuth` | Keep it exported with deprecation notice; monitor build for errors |
| Redirect logic mis-used in API routes | Throw path is default when no `redirectTo` provided; ensure tests cover |
| Deleting `route-protection.ts` removes needed helpers | Verify usage beforehand; move helpers if still in use |


## Appendix

Here’s the split of responsibilities that the refactor is aiming for:

1. getAuthUser()  → “Just give me the user (or null)”  
   • Returns `User | null`.  
   • Never throws, never redirects, no extra metadata.  
   • Ideal when the caller will decide the next step itself (e.g. a page that shows different UI for guests vs members, or you’re about to run several optional checks).

2. requireAuth(...)  → “Guarantee I’m authenticated”  
   • Returns `User` on success.  
   • If unauthenticated:  
      – **In API/server logic** (default): throws `AuthError(401)` so the caller can convert it to a uniform Problem-Details JSON.  
      – **In pages/components** (when you pass `{ redirectTo: '/auth/login' }`): performs `redirect()` for you.  
   • Use this when you simply can’t continue without a user and you’re happy to delegate failure handling (throw or redirect) to the helper.

3. assertAuth(request)  → “Give me a typed result object so I can branch without exceptions”  
   • Returns an object `{ success: boolean; user?: User; error?: string }`.  
   • Never throws or redirects.  
   • Primary use-cases:  
      – **Edge/runtime environments** where throwing isn’t ideal and you want a quick JSON response:  
        ```ts
        const { success, user, error } = assertAuth(req)
        if (!success) return NextResponse.json({ error }, { status: 401 })
        ```  
      – **Middleware-style utilities** that need to log/measure auth outcome and then continue down a chain without exception control-flow.  
      – When you’d like to preserve the semantics of the old “`validateAuth(request, { requireAuth: true })` pattern” but with a clearer, non-overloaded name.

In short:

• If you want **simple data (or null)** – use getAuthUser.  
• If you want a **hard guard** – use requireAuth.  
• If you need a **structured result** for branching or logging without try/catch – use assertAuth.

Most routes will end up using either requireAuth (one-liner) or getAuthUser (for optional auth). assertAuth is there for the minority of places where explicit success/error objects make the code cleaner than exceptions or null-checks.

We need to update relevant docs to describe this.