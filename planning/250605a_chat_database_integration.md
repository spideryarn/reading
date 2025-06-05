# Chat Database Integration

## Goal, context

Implement database persistence for the chat feature in Spideryarn Reading, transforming the current in-memory chat system into a database-backed solution that preserves conversations permanently across page reloads, browser sessions, and document navigation.

**Current State**: The chat system uses @assistant-ui/react with `useLocalRuntime` for in-memory state management. Chat conversations work well with document context and proper error handling, but are lost when the user navigates away or refreshes the page.

**Target State**: Chat conversations persist in the database using the existing `chat_threads` and `chat_messages` tables. Users can return to previous conversations days/weeks/months later. The chat UI continues to work exactly as it does now, but with transparent background persistence.

**Key Requirements from User**:
1. Permanent conversation persistence across sessions
2. One thread per document initially (design for future multi-thread support) 
3. Auto-generated thread titles/summaries from conversation content
4. Start simple, layer complexity gradually
5. Prioritise simplicity - fail fast and clear on errors (no masking of database failures)
6. Document-specific threads (changing documents = different thread set)

## References

**Planning & Architecture**:
- `planning/250602a_database_integration_completion.md` - Parent planning document for overall database integration work
- `docs/ASSISTANT_UI_DATABASE_PERSISTENCE.md` - Deep dive research on assistant-ui persistence patterns and best practices
- `docs/CODING_PRINCIPLES.md` - Simplicity-first approach, fail-fast error handling principles

**Current Implementation**:
- `components/assistant-chat.tsx` - Working @assistant-ui/react implementation with UI primitives
- `src/lib/hooks/useChatRuntime.ts` - Current chat runtime management using `useLocalRuntime`
- `app/api/chat/route.ts` - Working LLM integration with document context and error handling
- `lib/services/database/chat.ts` - Complete ChatService with CRUD operations ready for use

**Database Infrastructure**:
- `docs/DATABASE_SCHEMA.md` - Chat tables specification (`chat_threads` and `chat_messages`)
- `supabase/migrations/20250531235026_comprehensive_storage_schema.sql` - Database schema with chat tables
- `lib/types/database.ts` - TypeScript types for chat tables

**Testing & Integration**:
- `src/lib/hooks/__tests__/useChatRuntime.test.ts` - Existing tests for chat runtime hook
- `lib/services/database/__tests__/integration.test.ts` - Database service integration tests

## Principles, key decisions

### Persistence Architecture Decision
**Chosen**: Option A - `useLocalRuntime` with Background Persistence (based on research in `docs/ASSISTANT_UI_DATABASE_PERSISTENCE.md`)
- Keep existing assistant-ui setup working unchanged
- Add transparent persistence layer that saves/loads conversation history
- Database operations happen in background without affecting UI flow
- Minimal changes to current chat implementation

**Alternative Considered**: Option B - `useExternalStoreRuntime` with Full State Control
- Rejected for initial implementation due to complexity
- Would require rewriting chat state management
- Can be considered for future enhancements if needed

### Thread Management Strategy  
**Decided**: One persistent thread per document initially
- Each document gets exactly one chat thread that continues indefinitely
- Thread created automatically on first chat message
- Thread title auto-generated from first user message (truncated to ~50 characters)
- Future enhancement: Multiple threads per document with user management UI

### Error Handling Philosophy
**From user requirements**: "If database persistence fails, that's an error - don't try and mask it or continue in memory"
- Database failures should surface immediately as clear error messages
- No fallback to in-memory mode - maintain data integrity expectations
- Follow existing pattern: clear, immediate, fatal errors for debugging

### Loading Strategy
**Decided**: Lazy loading on chat tab access
- Load conversation history only when user first navigates to chat tab
- Prevents unnecessary database queries when user doesn't use chat
- Simple loading indicator while fetching history

### Thread Title Generation
**Decided**: Auto-generation with future manual override capability
- Extract first ~50 characters of first user message
- Add "..." suffix if truncated
- Future stage: Allow users to edit thread titles manually

## Actions

### Stage: Research and Design Validation ✅ COMPLETED
- ✅ Research assistant-ui database persistence patterns and best practices
  - ✅ **Created**: `docs/ASSISTANT_UI_DATABASE_PERSISTENCE.md` - Comprehensive research document
    - 📔 **Key Finding**: No official assistant-ui persistence solution available yet (planned for later 2025)
    - 📔 **Recommendation**: Use `useLocalRuntime` + background persistence approach for simplicity
    - 📔 **Architecture**: Transparent persistence layer with database as secondary store, assistant-ui as primary UI state manager

### Stage: Database Integration Foundation
- [ ] Create chat persistence service layer
  - [ ] Create `usePersistentChat` hook extending current `useChatRuntime`
  - [ ] Add conversation loading logic from database on component mount
  - [ ] Add background saving logic after each message exchange
  - [ ] Handle thread creation automatically on first message
  - [ ] Implement auto-title generation from first user message
  - [ ] Add proper error handling that fails fast on database issues

- [ ] Update chat API to support thread management
  - [ ] Modify `app/api/chat/route.ts` to accept optional `threadId` parameter
  - [ ] Add thread creation logic when no thread exists
  - [ ] Link assistant messages to AI calls for tracking
  - [ ] Update message saving to use proper sequence numbers
  - [ ] Test that conversation context is maintained across messages

### Stage: UI Integration
- [ ] Update `components/assistant-chat.tsx` for database-backed conversations
  - [ ] Replace `useChatRuntime` with `usePersistentChat` hook
  - [ ] Add loading state while conversation history loads
  - [ ] Add error state display for database failures
  - [ ] Test that existing UI features (suggestions, error handling) continue working
  - [ ] Ensure thread suggestions still show for empty conversations

- [ ] Add conversation persistence indicators
  - [ ] Add subtle visual indicator that conversation is being saved
  - [ ] Show thread title in chat header (auto-generated from first message)
  - [ ] Add timestamp showing when conversation was last active
  - [ ] Consider "✓ Saved" indicator similar to other AI features

### Stage: Thread Management
- [ ] Implement one-thread-per-document pattern
  - [ ] Create thread automatically when user sends first message to document
  - [ ] Load existing thread when user navigates to chat tab
  - [ ] Ensure thread isolation per document (changing documents = different threads)
  - [ ] Test that thread persistence works across page reloads and browser sessions

- [ ] Add thread title generation
  - [ ] Extract first user message content (up to 50 characters)
  - [ ] Generate meaningful titles with "..." suffix if truncated
  - [ ] Update thread title in database after first message exchange
  - [ ] Display generated title in chat interface

### Stage: Error Handling and Edge Cases
- [ ] Implement robust error handling
  - [ ] Handle database connection failures with clear error messages
  - [ ] Handle thread creation failures gracefully
  - [ ] Handle message saving failures (fail fast, don't continue)
  - [ ] Add proper loading states and error recovery UX
  - [ ] Test error scenarios with database unavailable

- [ ] Handle conversation state edge cases
  - [ ] Test behavior when database has messages but assistant-ui state is empty
  - [ ] Handle message sequence number conflicts
  - [ ] Test large conversation loading performance
  - [ ] Ensure proper message ordering in all scenarios

### Stage: Testing and Validation
- [ ] Write comprehensive tests for chat persistence
  - [ ] Unit tests for `usePersistentChat` hook
  - [ ] Integration tests for thread creation and message saving
  - [ ] Test conversation loading and state synchronization
  - [ ] Test error handling scenarios
  - [ ] Test thread isolation between documents

- [ ] Manual testing of key user workflows
  - [ ] Test full conversation flow with persistence
  - [ ] Test conversation loading across page refreshes
  - [ ] Test document navigation with thread isolation
  - [ ] Test error scenarios (database unavailable, etc.)
  - [ ] Test conversation history accumulation over multiple sessions

### Stage: Performance and Optimization
- [ ] Optimize conversation loading
  - [ ] Implement efficient message loading (all messages for now, pagination later)
  - [ ] Add conversation history caching if needed
  - [ ] Test performance with longer conversations
  - [ ] Monitor database query efficiency

- [ ] Add conversation management features (if time permits)
  - [ ] Consider "clear conversation" functionality
  - [ ] Consider conversation export/import
  - [ ] Consider conversation search within long threads

### Stage: Future Enhancements Planning
- [ ] Design multi-thread support for future implementation
  - [ ] Plan UI for thread selection and management
  - [ ] Design thread creation/deletion workflows
  - [ ] Plan thread title editing functionality
  - [ ] Document migration path from single-thread to multi-thread

- [ ] Plan advanced persistence features
  - [ ] Message branching support (assistant-ui feature)
  - [ ] Conversation search across all threads
  - [ ] Thread organization and categorization
  - [ ] Real-time collaboration support

### Stage: Documentation and Cleanup
- [ ] Update relevant documentation
  - [ ] Update `docs/CHATBOT_ASSISTANT_UI_INTEGRATION.md` with persistence patterns
  - [ ] Document the chat persistence architecture in code comments
  - [ ] Add examples of using database-backed chat to service layer docs
  - [ ] Update any outdated references to in-memory chat

- [ ] Code cleanup and optimization
  - [ ] Remove any unused in-memory chat logic
  - [ ] Ensure error handling is consistent across all chat operations
  - [ ] Run `npm run lint` and fix any issues
  - [ ] Add proper TypeScript types for persistence layer

### Stage: Integration with Main Planning Document
- [ ] Update `planning/250602a_database_integration_completion.md`
  - [ ] Replace existing chat database integration actions with reference to this document
  - [ ] Update status and progress tracking
  - [ ] Ensure coordination with other database integration work

### Stage: Git Commit and Finalization
- [ ] Git commit all changes following `docs/GIT_COMMITS.md`
  - [ ] Use subagent for commit to ensure proper message structure
  - [ ] Include all chat persistence changes and documentation updates
  - [ ] Verify working tree is clean after commit

- [ ] Move this planning document to `planning/finished/` when complete
- [ ] Final commit with planning doc move

## Appendix

### Database Schema Context

The chat persistence system uses two main tables designed in the comprehensive schema implementation:

**`chat_threads` table**:
- `id` (UUID, primary key)
- `document_id` (UUID, foreign key to documents)
- `model_id` (UUID, foreign key to ai_models)
- `title` (TEXT, default 'New Chat')
- `created_by` (UUID, foreign key to auth.users - using mock system user)
- `created_at`, `updated_at` (timestamps)

**`chat_messages` table**:
- `id` (UUID, primary key)
- `thread_id` (UUID, foreign key to chat_threads)
- `ai_call_id` (UUID, foreign key to ai_calls - for assistant messages)
- `role` (TEXT, 'user' | 'assistant' | 'system')
- `content` (TEXT, message content)
- `sequence_number` (INTEGER, for message ordering)
- `created_at`, `updated_at` (timestamps)
- Unique constraint on (thread_id, sequence_number)

**Key Design Features**:
- Sequence numbers prevent race conditions in message ordering
- Assistant messages link to AI calls for full traceability
- Thread isolation per document via document_id foreign key
- Support for conversation branching (future enhancement)

### Current Implementation Analysis

**Strengths of Existing Chat System**:
- Clean @assistant-ui/react integration with proper primitives
- Good error handling and logging in API routes
- Document context integration working well
- Comprehensive test coverage for runtime hook

**Integration Points**:
- `useChatRuntime` hook is well-designed for extension
- `ChatService` database layer is complete and ready
- API route supports conversation history already
- Type definitions are comprehensive

**Minimal Changes Required**:
- Main work is extending `useChatRuntime` to add persistence
- UI components can remain largely unchanged
- API route needs minor modifications for thread management
- Database schema already exists and tested

### Alternative Approaches Considered

**Background Persistence vs External Store**:
- **Background Persistence** (Chosen): Keep assistant-ui managing state, add database sync
  - Pro: Minimal code changes, preserves all assistant-ui features
  - Pro: Lower risk, easier to implement
  - Con: Potential state sync complexity
- **External Store** (Deferred): Take control of state, use database as primary source
  - Pro: Complete control over persistence behavior
  - Pro: Database as single source of truth
  - Con: Much more complex implementation
  - Con: Need to reimplement assistant-ui state logic

**Thread Management Strategies**:
- **Single Thread** (Chosen): One persistent conversation per document
  - Pro: Simple to implement and understand
  - Pro: Matches current user mental model
  - Con: May become unwieldy for long-running conversations
- **Multiple Threads** (Future): User can create/manage multiple conversations per document
  - Pro: Better organization for complex documents
  - Pro: Matches patterns from ChatGPT, Claude, etc.
  - Con: Adds UI complexity for thread management

**Loading Strategies**:
- **Eager Loading** (Considered): Load conversation on document page load
  - Pro: Chat ready immediately when user clicks tab
  - Con: Unnecessary database queries if user doesn't use chat
- **Lazy Loading** (Chosen): Load conversation when chat tab accessed
  - Pro: Efficient database usage
  - Pro: Matches pattern of other tabs (summaries, etc.)
  - Con: Slight delay when first accessing chat

### User Requirements Synthesis

From user feedback, key priorities are:
1. **Permanent persistence**: "persist permanently across page loads/sessions/etc" - conversations should survive browser restarts
2. **Thread titles**: "generate some kind of title or summary of each thread" - auto-generation initially, manual editing later
3. **Future multi-thread support**: "in future, the idea would be that you could have multiple threads per document" - design for this but implement single-thread first
4. **Simplicity first**: "keep things simple" and "gradually layer in complexity" - start with basic persistence, enhance later
5. **Fail-fast errors**: "if the database persistence fails, that's an error - don't try and mask it" - clear error handling
6. **Document isolation**: "Chat threads should be specific to a single document" - thread switching on document navigation

### Technical Risk Assessment

**Low Risk**:
- Database schema already exists and tested
- ChatService is complete and working
- Current chat implementation is solid foundation

**Medium Risk**:
- State synchronization between assistant-ui and database
- Message sequence handling in concurrent scenarios
- Performance with longer conversation histories

**High Risk**:
- Assistant-ui library evolution (no official persistence yet)
- Complex edge cases in conversation state management
- Migration path if official persistence solution becomes available

**Mitigation Strategies**:
- Start with simple implementation to validate approach
- Comprehensive testing of state synchronization
- Clear documentation of custom persistence architecture
- Design for easy migration to official solutions when available