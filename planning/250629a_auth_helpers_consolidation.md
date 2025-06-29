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
- `docs/reference/AUTHENTICATION_OVERVIEW.md` – will need update
- `docs/instructions/WRITE_PLANNING_DOC.md` – planning doc guidelines (this document follows)


## Guiding Principles & Decisions

- **Single source of truth**: All authentication utilities live in one module.
- **One function → one responsibility**: Each helper has exactly one behaviour (no optional overloads).
- **Explicit failure handling**: API routes throw an `AuthError`; UI components may redirect.
- **Minimal developer friction**: Most common usage pattern (`requireAuth()` in API routes) remains a one-liner.
- **Backward compatibility**: `validateAuth` remains exported but marked **deprecated** to avoid breaking external consumers mid-refactor; internal code will migrate.


## Stages & Actions

### Stage: Preparation & Research
- [ ] Search (`ripgrep`) for imports of `validateAuth`, `requireAuth`, and `route-protection` to quantify migration scope.
- [ ] Add `AuthError` class with HTTP status 401.
- [ ] Implement `getAuthUser`, `requireAuth`, `assertAuth` per acceptance criteria.
- [ ] Deprecate `validateAuth` (JSDoc `@deprecated`) and have it internally call new helpers.
- [ ] Export new helpers and ensure existing named exports remain.
- [ ] Update unit tests for `server-auth` to cover new behaviours (success, null, redirect, throw).

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
- [ ] Squash commits per `docs/instructions/GIT_COMMIT_CHANGES.md` and open PR.


## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Hidden external consumers of `validateAuth` | Keep it exported with deprecation notice; monitor build for errors |
| Redirect logic mis-used in API routes | Throw path is default when no `redirectTo` provided; ensure tests cover |
| Deleting `route-protection.ts` removes needed helpers | Verify usage beforehand; move helpers if still in use |


## Appendix

*None at this stage – to be populated with research findings, ripgrep output, and AI critique summaries during implementation.* 