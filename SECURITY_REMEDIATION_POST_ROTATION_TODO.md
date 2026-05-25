# Post-Rotation Follow-Ups

Things discovered during the rotation that need handling *after* legacy keys are revoked.
Add to this file as we go.

## Critical (will cause failures after Phase 4.3 — legacy HS256 revoke)

### RLS test files that forge HS256 JWTs

Five test files sign fake user tokens using `SUPABASE_JWT_SECRET` (the HS256 shared
secret) so they can exercise RLS as a specific user. Once the legacy HS256 signing
key is revoked, Supabase will no longer accept those tokens and these tests will
fail authentication against the database.

Affected files:
- `lib/services/database/__tests__/rls-test-helpers.ts:58`
- `lib/services/database/__tests__/chat-atomic-operations.test.ts` (lines 77, 372)
- `lib/services/database/__tests__/chat-message-deduplication.test.ts:69`
- `lib/services/database/__tests__/chat-rls-auth.test.ts` (lines 55, 250)
- `lib/services/database/__tests__/chat-no-duplicates-validation.test.ts:73`

User decision (during rotation): defer, handle afterwards.

Options when we come back to this:
1. **Switch signing to the new ES256 standby JWT key** — Supabase auth still accepts
   correctly-signed tokens, so if we can read the private side of the ES256 key the
   forging pattern can continue. **Check whether the dashboard exposes the standby
   private key** — historically only the JWKS (public) is exposed, in which case this
   route is closed.
2. **Use real user sessions in tests** — provision throwaway users via
   `supabase.auth.admin.createUser()` then sign in to get a real ES256-signed
   token. Cleaner but requires reshaping `rls-test-helpers.ts`.
3. **Skip the affected tests and rely on E2E coverage** — fastest, biggest gap.

Recommendation: start with option 2. The test-isolation primitives in this repo
already use UUID namespacing, so adding ephemeral user creation/teardown fits.

## Hygiene / nice-to-haves

### Consider re-resetting DB password

During Phase 3a, Claude accidentally printed a 16-char prefix of the freshly-rotated
prod DB password (`MbzZRPcGLUXaG3xz…`) in a diagnostic that used a 16-char default
substr length. The 30-char password retains ~84 bits of entropy (still
computationally infeasible to brute force), and the transcript is only visible to
the user + Anthropic, but a second `Settings → Database → Reset database password`
click would close the exposure cleanly. Trade-off: another round of updating
`.env.prod` DATABASE_URL + Vercel DATABASE_URL + GH Actions `SUPABASE_DB_PASSWORD`.

### Questionable service_role | anon fallback chain in 3 scripts

`scripts/reapply-headings-cache.ts`, `scripts/reproduce-headings-apply.ts`,
`scripts/debug-cached-headings.ts` fall back from `SUPABASE_SERVICE_ROLE_KEY` to
`NEXT_PUBLIC_SUPABASE_ANON_KEY` to `SUPABASE_ANON_KEY` to `''`. This silently
degrades privilege level — a script meant to run as admin can quietly run as
public anon and produce confusing "row not found" errors instead of failing
loudly.

During rotation we pruned the dead `SUPABASE_ANON_KEY` reference. The remaining
service_role-or-anon fallback is still smelly. Either pick one and require it,
or split into two explicit code paths.

### History-rewrite decision (Phase 8)

The leaked secrets in `cb08236a/.env.test` (Gemini, Anthropic) remain in git
history after key rotation. Decide whether the reputational benefit of force-pushing
a cleaned history outweighs the disruption to any clones/forks.

### Spend cap + WAF on Vercel (Phase 8)

Hello Zenno enabled spend cap and firewall rules after rotation. Decide whether
the same is worth doing here.

### User notification (Phase 8)

~9 external users (per the 2026-05-04 inventory). No evidence of user-data
exfiltration. Decision worth recording explicitly rather than implicitly
skipping.
