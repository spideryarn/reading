# Spideryarn Reading — Security Remediation TODO

**Source incident**: Supabase Personal Access Token leaked in a public commit
on `spideryarn/hellozenno` (`.cursor/mcp.json` @ `2b36530`, ~2025-04-11). Used
on 2026-03-21 to deploy a malicious Edge Function proxy on this project.
Hello Zenno has been fully remediated as of 2026-05-25 — see
`/Users/greg/Dropbox/dev/experim/hellozenno/docs/conversations/260525a_supabase_pat_compromise_remediation.md`
for the complete play-by-play.

This file is the equivalent runbook for Spideryarn Reading.

External master runbook (with shared scripts + DB backups): `~/security-investigations/260503-supabase-vercel/`.

## TL;DR — why this is simpler than Hello Zenno

Hello Zenno had a custom Flask backend that verified Supabase JWTs against
the legacy HS256 shared secret. Migrating it required a code change to
support both HS256 and asymmetric (JWKS) verification during rollover.

**Spideryarn Reading delegates auth entirely to `@supabase/ssr` v0.6.1.**
The middleware (`middleware.ts`) and the helpers under `lib/supabase/`
(`server.ts`, `client.ts`) call `createServerClient` / `createBrowserClient`,
which transparently verify Supabase-issued tokens. Newer versions of those
libraries already understand both legacy HS256 and the new asymmetric JWT
signing keys + the new `sb_publishable_*` / `sb_secret_*` API keys.

So the rotation here is mostly **dashboard clicks + env-var swaps**, no
custom code change for the auth pipeline. The only real code touch is
updating the dozen or so admin/test scripts under `scripts/` that use
`SUPABASE_SERVICE_ROLE_KEY` directly to use the new `sb_secret_*` key.

## Project facts (so future-self doesn't have to re-derive)

- **Repo**: `/Users/greg/dev/spideryarn/reading` (origin: `github.com/spideryarn/reading.git`, **public**)
- **Supabase project ref**: `blsgjlrezruxcfdyrqpk` (same org as Hello Zenno: `GD personal`)
- **Stack**: Next.js (`app/` dir) + Supabase + Stripe
- **Auth wiring**:
  - `middleware.ts` calls `createServerClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, { cookies })` then `supabase.auth.getUser()`
  - `lib/supabase/server.ts` and `lib/supabase/client.ts` follow the standard `@supabase/ssr` patterns
  - No custom JWT verification anywhere
- **Env vars used**:
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (browser + middleware)
  - `SUPABASE_SERVICE_ROLE_KEY` (admin scripts under `scripts/`, NOT in app runtime)
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - `ANTHROPIC_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`
- **Hosting**: Vercel (status of git-link unverified — see Phase 0 below)

## Status from previous session (already done — do not redo)

- [x] PAT revoked (organisation-level, from the Hello Zenno session). New PAT `Droid Greg 260504` lives in `~/Dropbox/dev/experim/hellozenno/.env.security`.
- [x] DB backup taken (21 MB / 577 entries) and stored in two locations: `~/Dropbox/backups/supabase-incident-2026/` and `~/security-investigations/260503-supabase-vercel/db-backups/`.
- [x] Edge Function inventory: 0 functions (the malicious proxy was cleanly removed before our audit).
- [x] Edge Function project secrets: only Supabase built-ins, no third-party API keys exfiltrated via that surface.
- [x] GitHub Actions secret `SUPABASE_ACCESS_TOKEN` updated to the new PAT on `spideryarn/reading` (timestamp 2026-05-04T19:00:19Z).
- [x] Trufflehog scan: found historical exposure of Gemini/Anthropic keys in `.env.test` @ commit `cb08236a` — flagged for rotation in step 6.

## Phase 0 — Pre-flight (10 min)

- [ ] **Confirm Vercel deploy linkage.** Run `vercel link --yes --project <name>` in this dir, then check `cat .vercel/project.json` and `curl -H "Authorization: Bearer $(jq -r .token "$HOME/Library/Application Support/com.vercel.cli/auth.json")" "https://api.vercel.com/v9/projects/$PROJECT_ID?teamId=$ORG_ID" | jq '.link'`. If `link: null`, deploys are manual via `vercel --prod`. If linked, pushing to `main` triggers a deploy. **Hello Zenno taught us this matters**: the rotation requires a redeploy and you need to know how to trigger one cleanly.
- [ ] **Confirm `@supabase/ssr` and `@supabase/supabase-js` versions.** Currently `^0.6.1` and `^2.49.8` (verified 2026-05-25). Both support new `sb_publishable_*` keys and JWKS verification. If you're running this much later, upgrade them first if needed.
- [ ] **Confirm production is deployable from clean state.** Easy way: bump `package.json` version, deploy, watch for green health check. If the deploy is broken before you start rotating, you'll have a much harder time confirming the rotation worked.
- [ ] **Read the Hello Zenno session log** (`/Users/greg/Dropbox/dev/experim/hellozenno/docs/conversations/260525a_supabase_pat_compromise_remediation.md`) end to end so you know which footguns to look for. Especially: build-time vs runtime env vars on Vercel; the order in which Supabase forces you to disable legacy keys.

## Phase 1 — Take a fresh DB backup (5 min)

The backup taken on 2026-05-04 is already 3 weeks stale by the time you read this. Do another one before rotating anything mutative.

```bash
# Use session pooler (port 5432). Transaction pooler (6543) does not allow pg_dump.
# Connection details from Supabase dashboard → Settings → Database → Connection string (session)
PGPASSWORD='<current-prod-db-password>' /opt/homebrew/opt/postgresql@18/bin/pg_dump \
  --host=aws-0-eu-west-2.pooler.supabase.com \
  --port=5432 \
  --username=postgres.blsgjlrezruxcfdyrqpk \
  --dbname=postgres \
  --no-owner --no-privileges --format=custom \
  --file="$HOME/Dropbox/backups/supabase-incident-2026/spideryarn_$(date +%Y%m%d_%H%M%S).dump"

# Verify and double-store
ls -lh ~/Dropbox/backups/supabase-incident-2026/spideryarn_*.dump
md5 ~/Dropbox/backups/supabase-incident-2026/spideryarn_*.dump
cp ~/Dropbox/backups/supabase-incident-2026/spideryarn_*.dump ~/security-investigations/260503-supabase-vercel/db-backups/
```

## Phase 2 — Generate replacement keys in Supabase (10 min)

All on https://supabase.com/dashboard/project/blsgjlrezruxcfdyrqpk

1. **Settings → API Keys → "Publishable and secret API keys" tab.**
   - If empty: click the green "Create new API keys" button to bootstrap. That will create a default publishable + secret key pair.
   - Note both values somewhere safe (these are about to go into env vars).
   - The publishable key starts `sb_publishable_…` and replaces the legacy anon JWT.
   - The secret key starts `sb_secret_…` and replaces the legacy `service_role` JWT.
2. **Settings → JWT Keys → "JWT Signing Keys" tab.**
   - Confirm there's already a STANDBY key (ECC P-256). If not, click "Create Standby Key" and pick ECC P-256 to match what Supabase ships by default.
   - **Do not click "Rotate keys" yet.** Spideryarn doesn't need a code change first (no custom JWT verification), but you still want to verify the standby key is reachable via JWKS before promoting:
     ```bash
     curl -s https://blsgjlrezruxcfdyrqpk.supabase.co/auth/v1/.well-known/jwks.json | jq
     ```
     should return at least one key with `alg: ES256` (the standby).
3. **Settings → Database → Connection string.** Click "Reset database password" and copy the new value. Keep it ready.

## Phase 3 — Update env vars and code references (20 min)

### 3a. Local env files

Update `.env.local`, `.env.prod`, and any other env files in this directory:

```diff
- NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...   # legacy HS256 anon JWT
+ NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...        # new publishable key
- SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...       # legacy HS256 service_role JWT
+ SUPABASE_SERVICE_ROLE_KEY=sb_secret_...                 # new secret key (still using same env var name to minimise code churn)
```

Also rotate the DB password if it appears anywhere (some scripts read `DATABASE_URL` directly):

```diff
- DATABASE_URL=postgresql://postgres.blsgjlrezruxcfdyrqpk:<old>@aws-0-eu-west-2.pooler.supabase.com:6543/postgres
+ DATABASE_URL=postgresql://postgres.blsgjlrezruxcfdyrqpk:<new>@aws-0-eu-west-2.pooler.supabase.com:6543/postgres
```

### 3b. Vercel project-level env vars

**This is the Hello Zenno footgun in disguise.** `NEXT_PUBLIC_*` env vars in Next.js are inlined at build time. If you rely on `vercel deploy -e KEY=value` (runtime injection), the built bundle still ships with the OLD value. The cleanest fix is to update Vercel's project-level env vars:

```bash
# Link to the Spideryarn Vercel project (project name TBD — likely 'spideryarn-reading')
mkdir /tmp/syr_link && cd /tmp/syr_link
vercel link --yes --project <spideryarn-reading-project-name> --scope greg-detre

# Update each env var (production env)
NEW_PUBLISHABLE='sb_publishable_...'
NEW_SECRET='sb_secret_...'
NEW_DB_PASSWORD='...'
NEW_DATABASE_URL="postgresql://postgres.blsgjlrezruxcfdyrqpk:${NEW_DB_PASSWORD}@aws-0-eu-west-2.pooler.supabase.com:6543/postgres"

yes | vercel env rm NEXT_PUBLIC_SUPABASE_ANON_KEY production
echo "$NEW_PUBLISHABLE" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production

yes | vercel env rm SUPABASE_SERVICE_ROLE_KEY production
echo "$NEW_SECRET" | vercel env add SUPABASE_SERVICE_ROLE_KEY production

yes | vercel env rm DATABASE_URL production
echo "$NEW_DATABASE_URL" | vercel env add DATABASE_URL production

# Verify
vercel env ls 2>&1 | rg 'SUPABASE|DATABASE_URL'

cd / && rm -rf /tmp/syr_link
```

Repeat for Preview and Development envs if they were set previously.

### 3c. Hardcoded credentials in source — REMOVE

`scripts/tests/test-storage-direct.ts` line 11 has a hardcoded service-role JWT as a fallback (192 chars). **This must be deleted, not just rotated** — the value is in git history and may be in the cloned-out copy on the attacker's disk. After Phase 4 it's a dead key, but leaving the literal in the file is bad hygiene.

Also audit:
- `scripts/reapply-headings-cache.ts:59`
- `scripts/reproduce-headings-apply.ts:42`

These have a chained fallback `process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''`. After rotation, `SUPABASE_ANON_KEY` (no NEXT_PUBLIC prefix) is a dead reference; remove it. The chain itself is questionable — service_role and anon have wildly different privilege levels — but that's a separate refactor.

### 3d. GitHub Actions secrets

Already updated `SUPABASE_ACCESS_TOKEN` (in the previous session). Check for any other Supabase-related secrets via:

```bash
gh secret list --repo spideryarn/reading
```

Common ones that need updating if they exist: `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`. Any of those used by GitHub Actions workflows must be rotated too — otherwise CI breaks after the legacy keys are revoked.

### 3e. Redeploy and verify

```bash
# If git-connected: just push
git push origin main

# If manual: from project root, run whatever Vercel deploy command is conventional.
# (You can check the existing scripts/ for a pattern, or just run `vercel --prod`.)
```

After deploy completes:
- Hard-reload the production site
- Log out + log in
- Hit a few authed pages and confirm
- Run any admin script that uses `SUPABASE_SERVICE_ROLE_KEY` (e.g. `scripts/cleanup-test-data.ts` against a non-prod project, or just confirm one runs without auth errors)
- **Stop and confirm everything works before continuing.** If something fails here, the rotation hasn't broken anything yet — you're still on legacy keys + new replacements running in parallel.

## Phase 4 — Promote, disable, revoke (10 min)

Once the redeploy is verified working with the NEW keys present, you can decommission the legacy ones. Same dashboard sequence as Hello Zenno:

1. **Settings → JWT Keys**: click **"Rotate keys"**. Promotes ECC P-256 standby → current; demotes legacy HS256 → previous (still trusted for verification of in-flight tokens).
   - Existing user sessions remain valid until their access tokens expire (~1 h) and refresh onto ES256.
   - Verify: log out, log back in, confirm new tokens are ES256 (Network tab → any Supabase request → `Authorization: Bearer <jwt>`; decode at jwt.io and check `alg: ES256`).
2. **Settings → API Keys → "Legacy anon, service_role API keys" tab**: click **"Disable JWT-based legacy API keys"**. This breaks the legacy anon JWT and legacy service_role JWT.
   - **If anything fails here**, the bundle is still using a legacy key somewhere — go back to 3b/3c. Re-enable legacy keys via the same panel as a temporary rollback.
3. **Settings → JWT Keys → "Previously used keys" → "Revoke key"** on the legacy HS256. **This is the moment the attacker's stolen secret stops being able to sign forged tokens. Permanent.**

After all three:
- Hard-reload, log out, log in once more
- Hit authed pages
- Done.

## Phase 5 — Apply RLS audit (15 min)

Hello Zenno's Supabase advisor flagged 17 public tables with no row-level
security. Spideryarn was already mostly RLS-protected (8 public tables, all
with RLS enabled, per the inventory taken on 2026-05-04). **Re-verify** because new tables may have been added since:

https://supabase.com/dashboard/project/blsgjlrezruxcfdyrqpk/advisors/security

If any new "RLS Disabled in Public" warnings appear, write a short migration that does `ALTER TABLE public.<x> ENABLE ROW LEVEL SECURITY;` plus appropriate policies. Use the helper at `~/security-investigations/260503-supabase-vercel/scripts/enable_rls_hellozenno.sql` as a template.

## Phase 6 — Rotate third-party API keys (30 min)

Trufflehog flagged historical exposures in this repo's git history (commit `cb08236a`, `.env.test`):
- `GOOGLE_GENERATIVE_AI_API_KEY` (Gemini)
- `ANTHROPIC_API_KEY`

These were exposed publicly in a previous commit. Rotate them as a hygiene measure even though the leaked PAT incident didn't directly involve them:

- [ ] **Anthropic** — https://console.anthropic.com/settings/keys → revoke the leaked key, create new, update `.env.local`, `.env.prod`, Vercel env, GitHub Actions secrets.
- [ ] **Google AI Studio** — https://aistudio.google.com/app/apikey → same.

Also rotate any other third-party keys you used during this rough patch (audit `scripts/setup-storage.ts` and friends to be sure):

- [ ] **Stripe** — https://dashboard.stripe.com/apikeys → only if `STRIPE_SECRET_KEY` ever appeared in a public commit (search `git log --all -p -- .env\* | rg sk_live_`). If clean, skip.

## Phase 7 — Reply to Supabase Security

After rotation is fully done for both projects (HZ already done), send the consolidated reply. Draft is at `~/security-investigations/260503-supabase-vercel/SUPABASE_REPLY_DRAFT.md`. Update it with the Spideryarn-specific timeline before sending.

## Phase 8 — Decisions

- [ ] **Notify Spideryarn users?** Check `auth.users` count vs how many are external (i.e., not your own emails). Hello Zenno had 27 external; Spideryarn had 9 (per the 2026-05-04 inventory). Apply the same disclosure decision matrix from `~/security-investigations/260503-supabase-vercel/REMEDIATION_RUNBOOK.md` — no evidence of user-data exfiltration but the explicit decision is worth recording.
- [ ] **Rewrite git history?** The leaked PAT is in `spideryarn/hellozenno`, not here, so this repo is less affected. Still: the historical Gemini/Anthropic keys in `.env.test` @ `cb08236a` are in this repo's history. Force-push impact vs reputational benefit; same trade-off as Hello Zenno.
- [ ] **Vercel spend cap + firewall** — Same considerations as Hello Zenno. Decide whether to enable spend cap on the Spideryarn Vercel project and whether to add IP allow/rate-limit rules.

## Differences from Hello Zenno you might trip over

- **No backend code change needed.** Skip the equivalent of HZ's `auth_utils.py` work entirely.
- **Service role key IS used here** (in `scripts/`, not at app runtime). HZ doesn't use it at all. So you have an additional env var to migrate (`SUPABASE_SERVICE_ROLE_KEY` → new `sb_secret_*` value), and admin scripts must be updated. App runtime uses anon/publishable only.
- **Next.js, not SvelteKit.** Same build-time-env-var trap (`NEXT_PUBLIC_*` is inlined at build), same fix (update Vercel project env vars before redeploy).
- **No peewee.** No `playhouse.pool` import-error landmine.
- **Smaller user base.** ~9 external users vs Hello Zenno's 27.
- **Hardcoded service_role JWT in `scripts/tests/test-storage-direct.ts`.** Has to go regardless.

## Quick reference — once-this-is-done checklist

- [ ] Phase 0: Vercel link confirmed, deploys triggerable
- [ ] Phase 1: Fresh DB backup, MD5-verified, in two locations
- [ ] Phase 2: New publishable key, new secret key, new DB password generated
- [ ] Phase 3a: Local env files updated
- [ ] Phase 3b: Vercel project env vars updated (production)
- [ ] Phase 3c: Hardcoded service_role JWT removed from `scripts/tests/test-storage-direct.ts`; chained fallbacks audited
- [ ] Phase 3d: GitHub Actions secrets audited and updated
- [ ] Phase 3e: Redeployed, hard-refresh + login + admin script all confirmed working
- [ ] Phase 4.1: JWT signing keys rotated (ES256 now current)
- [ ] Phase 4.2: Legacy JWT-based API keys disabled
- [ ] Phase 4.3: Legacy HS256 signing key revoked
- [ ] Phase 5: RLS advisor re-checked, any new gaps closed
- [ ] Phase 6: Anthropic + Gemini keys rotated
- [ ] Phase 7: Supabase Security reply sent
- [ ] Phase 8: User notification decision made and recorded; history-rewrite decision made
