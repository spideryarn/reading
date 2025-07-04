# Multiple Chat Threads per Document

**THIS IS STILL A PROPOSAL, and needs further discussion before we start implementing it.**

(written by o3)

## Goal & Context

Allow each document to host multiple independent chat conversations (threads) so users can explore different lines of questioning without cluttering a single timeline.

Chat persistence already exists via `chat_threads` / `chat_messages` tables, but the UI loads only one thread (latest or URL-specified). We need a first-class thread selector, creation flow, and minor API tweaks to expose per-thread metadata.

## Questions / Requirements to Discuss with User

- Do we need per-thread privacy beyond existing document ownership (e.g. shared docs where threads are private to creator)?
- Is renaming a thread a must-have for v1 or acceptable as nice-to-have?
- Maximum number of threads per document? (helps enforce DB constraints/pagination)
- Realtime updates between tabs (y/n) – impacts supabase realtime subscription work.
- Any analytics requirements (e.g. track last-opened, favourites)?

👉 Please confirm / clarify the above before Stage 1 starts.

## References (1-sentence each)

- `chat_threads`, `chat_messages` – Postgres tables that already support N threads.
- `ChatService.listThreadsByDocument` – returns most recent threads, will power selector.
- `usePersistentChat` – hook that loads a single thread; will be split/refactored.
- `docs/reference/ARCHITECTURE_URL_STATE.md` – URL param `conversation=<uuid>` already selects a thread.
- `WRITE_PLANNING_DOC.md` – guidelines for this document.

## Principles & Key Decisions

1. Keep DB schema; only add indexes if needed.
2. URL is single source of truth for selected thread (`conversation` param).
3. Incrementally enhance UI – ship basic dropdown first, then nicer sidebar, realtime, etc.
4. Backwards-compat: existing deep links continue to work (default to latest thread when param absent).
5. Low coupling: Chat runtime logic stays in `usePersistentChat`; thread-list logic lives in new hook/component.

## Stages & Actions

### Stage: Preparatory housekeeping
- [ ] Ensure latest `main` is merged into worktree (`./scripts/sync-worktrees.ts`) ✅ subagent.
- [ ] Regenerate DB types (`npm run db:types`) to catch any pending schema drift.

### Stage: Spike – list threads API & performance
- [ ] Write quick script to list 10k mock threads to gauge query performance.
- [ ] If slow, add composite idx `(document_id, updated_at DESC)`.

### Stage: Thread list component (v1 dropdown)
- [ ] Create `components/chat-thread-selector.tsx` – simple `<Select>` listing titles (or "Untitled" fallback).
  - [ ] Uses `ChatService.listThreadsByDocument` (limit 20).
  - [ ] On change → updates `conversation` URL param.
- [ ] Inject selector into `assistant-chat.tsx` header.
- [ ] Add "New chat" button → clears `conversation` param (starts fresh).
- [ ] Unit test selector behaviour (`react-testing-library`).

### Stage: Hook refactor
- [ ] Split `usePersistentChat` into:
  - `useChatThreads(documentId)` – fetch list, create, delete, rename.
  - `useChatRuntime(threadId | null)` – current logic.
- [ ] Migrate UI to new hooks.

### Stage: Thread titles editing (nice-to-have)
- [ ] In dropdown list show pencil icon → editable input.
- [ ] Debounced update via `ChatService.updateThread`.

### Stage: Realtime updates (nice-to-have)
- [ ] Subscribe to `chat_threads` channel for document.
- [ ] Auto-refresh list + current messages when other tab adds messages.

### Stage: Pagination & limits (later)
- [ ] Backend API to count threads so UI can show "Next / Prev".
- [ ] Soft limit: 50 threads per document; show toast when exceeded.

### Stage: Analytics / favourites (optional)
- [ ] Add `last_opened_at` column (defaults to NOW()) when thread fetched.
- [ ] Favourite flag per thread (boolean column, smallstar UI).

### Stage: Documentation & polish
- [ ] Update `CLAUDE.md`, `DATABASE_SCHEMA.md`, UX docs.
- [ ] End-to-end Playwright test: create two threads, reload page, ensure selector & messages correct.
- [ ] Final debrief, tidy tests, request user review.

## Appendix

- Potential index: `CREATE INDEX idx_chat_threads_doc_updated ON chat_threads (document_id, updated_at DESC);`
- Mock data generator snippet … 