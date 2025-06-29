# Chat Architecture Database-First Redesign

## Goal & Context

Replace the current dual-state chat architecture (assistant-ui in-memory + database persistence) with a database-first approach to eliminate message duplicates, race conditions, and state synchronisation issues.

**Current Problems:**
- Duplicate messages appearing in chat UI
- "Refresh to fix" behaviour when optimistic updates diverge from database state
- Race conditions during thread creation causing inconsistent state
- Empty content handling inconsistencies across client/server layers
- Manual refresh button masking deeper architectural issues

**Target Solution:**
- Database becomes single source of truth for all chat messages
- Server-side message persistence with atomic thread + message operations
- Client receives authoritative database rows after each send operation
- Optional Supabase realtime sync for multi-session scenarios
- Elimination of optimistic updates in favour of loading states

## User Stories & Acceptance Criteria

**As a user sending chat messages:**
- When I send a message, I see a loading spinner immediately
- My **own** message appears instantly in the thread in a *pending* state (greyed-out or with an hour-glass icon) and flips to normal once the server confirms it was persisted
- While the assistant is generating a reply I see a typing/streaming indicator so I know the request is in-progress
- I never see duplicate messages in the conversation
- I never need to refresh the page to see the correct conversation state
- Empty messages or tool-only responses display consistently

**As a user with multiple browser tabs:**
- Messages sent in one tab appear in other tabs without manual refresh
- Real-time updates feel natural and don't interfere with typing

**As a developer maintaining the chat system:**
- No more complex state synchronisation logic between UI and database
- Race conditions around thread creation are eliminated
- Message ordering is guaranteed by database sequence numbers
- Error handling is simplified (either saved to DB or failed completely)

## References

- Current architecture investigation findings in conversation above
- `components/assistant-chat.tsx` - Main chat UI component
- `lib/hooks/usePersistentChat.ts` - Current dual-state management logic
- `app/api/tools/[toolId]/handlers/chat.ts` - Current REST API endpoint
- `lib/services/database/chat.ts` - Database service layer
- `docs/reference/TOOL_CHATBOT_ASSISTANT_UI_INTEGRATION.md` - Current assistant-ui integration patterns
- `planning/250616a_multi_chat_threads.md` - Future multi-thread UI requirements

## Principles & Key Decisions

**Database-First Architecture:**
- Database is the canonical source of truth for all chat state
- Client never saves messages directly - only calls API endpoints
- UI displays exactly what exists in database (no optimistic updates)
- Loading states provide immediate feedback during server round-trips

**User Experience Trade-offs:**
- Accept slight delay in message appearance for guaranteed consistency
- Loading spinners provide immediate feedback during server processing
- Eliminate confusing refresh button and duplicate message scenarios

**Technical Approach:**
- Keep existing database schema and RLS policies (they work well)
- Replace dual-state management with single database-driven state
- Use `useExternalStoreRuntime` from assistant-ui for external message store
- Add Supabase realtime subscriptions for multi-session sync *(filter by `thread_id` and respect existing RLS to avoid leakage)*
- Maintain existing API patterns but ensure atomic operations
- **Streaming strategy:** the server streams tokens to the client; the UI shows a temporary "assistant-typing" bubble that is replaced with the authoritative DB row once the generation finishes.  This preserves real-time feel while still keeping the DB as the source of truth
- **Optimistic user placeholder:** render the user bubble instantly, flagged as `pending`, then overwrite with the DB row to avoid UX delay while preventing duplicates
- **Schema scope:** we *may* add a `content_parts JSONB` column for richer message parts in future, but this iteration will stay with the current `content` text column to keep risk low.  Migration task is deferred and tracked separately
- **Future multi-thread support:** design the API and store so a document can own multiple threads, but limit UI to a single active thread for now (out of scope to surface thread list)

**Migration Strategy:**
- Implement new endpoint alongside existing one for safe rollback
- Progressive enhancement - start with core send/receive, add realtime later
- Preserve existing chat data and authentication patterns

## Stages & Actions

### Stage: Prepare for implementation
- [ ] Run `./scripts/sync-worktrees.ts` in subagent to pull latest changes from main
- [ ] Ask user if we should create `250629a_chat_database_first` Git branch for this work
- [ ] Research `useExternalStoreRuntime` documentation and patterns
  - [ ] Web search for assistant-ui external store examples and best practices
  - [ ] Examine current assistant-ui integration points that need updating

### Stage: Design new API contract
- [ ] Design revised REST API response format for atomic message operations
  - [ ] POST `/api/tools/chat` returns `{ thread: ThreadData, messages: MessageData[] }`
  - [ ] Include both user message and AI response in single transaction
  - [ ] Ensure thread creation is atomic with first message pair
- [ ] Define TypeScript interfaces for new API responses
- [ ] Update API endpoint to handle atomic thread + message creation
  - [ ] Single transaction: create thread → insert user message → run AI → insert AI response
  - [ ] Return complete thread and message data from database
  - [ ] Maintain existing error handling and logging patterns

### Stage: Implement database-first message store
- [ ] Create new `useChatStore` hook (React context or Zustand)
  - [ ] State: `messages[]`, `isLoading`, `error`, `threadId`
  - [ ] Actions: `sendMessage(content)`, `loadThread(threadId)`, `clearMessages()`
  - [ ] Integrate with new API endpoint to receive authoritative database rows
  - [ ] **Render user message placeholder marked as pending and replace on confirmation**
  - [ ] **Show assistant-typing placeholder during streaming; replace on completion**
- [ ] Add message deduplication based on database IDs (not content)
- [ ] Implement loading states for message sending operations and error-retry UI (e.g. "Resend" button on failure)
- [ ] Add error handling with proper user feedback (no more silent failures)

### Stage: Replace assistant-ui integration
- [ ] Replace `useLocalRuntime` with `useExternalStoreRuntime` in AssistantChat
- [ ] Wire external store runtime to new `useChatStore` state and actions
- [ ] Update message rendering to handle database-sourced content consistently
- [ ] Preserve existing UI features: voice input, suggestions, thread management
- [ ] Remove refresh button from chat interface
- [ ] Test that all assistant-ui features work with external store pattern

### Stage: Add Supabase realtime synchronisation
- [ ] Add Supabase realtime subscription to `chat_messages` table
- [ ] Filter realtime events by current `thread_id` and user permissions (RLS safe)
- [ ] Merge realtime message updates (INSERT/UPDATE/DELETE) into local message store
- [ ] Handle connection drops and reconnection gracefully
- [ ] Add subtle "live" indicator when realtime is connected
- [ ] Test multi-tab scenario: messages appear across browser tabs

### Stage: Content validation and edge cases
- [ ] Standardise empty content handling across all layers
  - [ ] API validation: decide whether to allow empty/whitespace-only messages
  - [ ] Database storage: consistent handling of tool calls vs text content
  - [ ] UI rendering: proper display of empty or tool-only messages
- [ ] Add comprehensive input validation at API layer
- [ ] Test edge cases: network failures, malformed content, concurrent requests
- [ ] Ensure proper error messages replace current "refresh to fix" scenarios

### Stage: Migration and rollback safety
- [ ] Implement feature flag to switch between old and new chat architecture
- [ ] Add database migration if needed for new content structure
- [ ] Test with existing chat threads and messages (no data loss)
- [ ] Create rollback plan if database-first approach causes issues
- [ ] Update relevant evergreen documentation in `docs/reference/`

### Stage: Testing and validation
- [ ] Write integration tests for atomic thread + message creation
- [ ] Add tests for message deduplication and ordering guarantees
- [ ] Test multi-session realtime synchronisation scenarios
- [ ] Validate no more duplicate messages under any conditions
- [ ] Performance testing: compare database round-trip vs optimistic updates
- [ ] Use subagent for comprehensive test execution

### Stage: Final validation and cleanup
- [ ] Run `npm run check:health` to validate all TypeScript and linting
- [ ] Run `npm test` in subagent to ensure all tests pass
- [ ] Remove old dual-state management code from `usePersistentChat`
- [ ] Update `docs/reference/TOOL_CHATBOT_ASSISTANT_UI_INTEGRATION.md` with new patterns
- [ ] Git commit following `docs/instructions/GIT_COMMIT_CHANGES.md`
- [ ] Ask user permission to merge branch back to main (if created)
- [ ] Move planning doc to `planning/finished/` and commit

# Appendix

## Technical Architecture Details

**Current Dual-State Problems:**
```typescript
// Current problematic pattern in usePersistentChat.ts
const sendMessage = async (content: string) => {
  // 1. Optimistic update to UI
  appendToThread({ role: 'user', content })
  
  // 2. Separate API call (potential divergence)
  const response = await fetch('/api/tools/chat', { ... })
  
  // 3. Another optimistic update
  appendToThread({ role: 'assistant', content: response.content })
  
  // 4. Fire-and-forget save (race condition potential)
  saveMessagesToDatabase()
}
```

**New Database-First Pattern:**
```typescript
// Proposed new pattern
const sendMessage = async (content: string) => {
  setLoading(true)
  
  try {
    // Single atomic operation returns authoritative data
    const { thread, messages } = await fetch('/api/tools/chat', {
      method: 'POST',
      body: JSON.stringify({ content, threadId })
    }).then(r => r.json())
    
    // Replace entire message store with database truth
    setMessages(messages)
    setThreadId(thread.id)
  } catch (error) {
    setError(error.message)
  } finally {
    setLoading(false)
  }
}
```

## Alternative Approaches Considered

**Incremental Fix Approach:** Fix race conditions and add deduplication to existing architecture. Decided against because it maintains the fundamental dual-state complexity.

**Optimistic Updates with Conflict Resolution:** Keep optimistic updates but add sophisticated merge logic. Decided against due to complexity and potential for new edge cases.

**Event Sourcing Pattern:** Store chat events rather than final state. Too complex for current needs and would require major database schema changes.

## Success Criteria Summary

1. **Zero duplicate messages** - impossible due to single source of truth
2. **No refresh button needed** - eliminated due to consistent state
3. **Atomic thread creation** - race conditions eliminated
4. **Consistent empty content handling** - standardised across all layers  
5. **Multi-session sync** - realtime updates across browser tabs
6. **Maintained UX quality** - loading states replace optimistic updates
7. **Rollback safety** - feature flagged implementation with existing data preservation