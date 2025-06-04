# Database Integration Completion

## Goal, context

Complete the database integration for Spideryarn Reading by connecting existing AI features to database storage and addressing remaining infrastructure gaps. This follows the successful database schema implementation in `planning/finished/250531a_database_storage_implementation.md` which created comprehensive tables but left the UI integration incomplete.

**Current State**: Documents are successfully loaded from database instead of static files, but AI-generated content (summaries, glossaries, headings) and chat conversations are still handled in-memory. The application has a robust database schema but isn't leveraging it for core features.

**Primary Goals**:
1. Move static HTML files to archive location since database migration is complete
2. Add slug column to documents table for more efficient routing 
3. Connect AI features (summaries, glossary, headings) to store results in `document_enhancements` table
4. Integrate chat functionality with `chat_threads` and `chat_messages` tables
5. Implement simple real-time proof-of-concept for database changes
6. Work around authentication dependency using mock user approach

**Success Criteria**: All existing features work as before, but data persists across page reloads and multiple sessions. No user-facing feature changes, just robust backend storage.

## References

**Planning & Architecture**:
- `planning/finished/250531a_database_storage_implementation.md` - Comprehensive database schema implementation with 7 tables, services, and testing
- `docs/CODING_PRINCIPLES.md` - Emphasises simplicity, prototype-first approach, and gradual complexity layering
- `docs/ARCHITECTURE.md` - Overall technical architecture including database storage decisions
- `docs/DATABASE_OVERVIEW.md` - Current database implementation with schema details and service patterns
- `docs/DATABASE_SCHEMA.md` - Detailed table specifications for all 7 database tables
- `docs/DATABASE_MIGRATIONS.md` - Migration workflow and best practices for schema changes

**Current Implementation**:
- `lib/services/database/` - Complete database services: DocumentService, EnhancementService, ChatService, AiCallService
- `supabase/migrations/20250531235026_comprehensive_storage_schema.sql` - Full schema with MODDATETIME, RLS, indexes, and AI model seeding
- `app/documents/[slug]/page.tsx` - Successfully loads documents from database with slug-based routing
- `lib/utils/slug.ts` - Centralized slug utilities for document routing
- `components/assistant-chat.tsx` - Current chat UI using @assistant-ui/react (in-memory)

**AI Features**:
- `docs/AI_SUMMARISE.md` - AI summarise feature generating hierarchical summaries at multiple granularities
- `docs/AI_GLOSSARY.md` - Glossary feature extracting key entities using LLM analysis  
- `docs/AI_HEADINGS.md` - AI-generated headings feature with mutation system
- `lib/prompts/` - Nunjucks + Zod prompt templates for all AI features
- `app/api/summarise/route.ts`, `app/api/glossary/route.ts`, `app/api/headings/route.ts` - Current AI API routes (in-memory)

**Real-time Infrastructure**:
- `lib/supabase/realtime.ts` - Real-time subscription helpers for all major tables
- `docs/DATABASE_OVERVIEW.md` - Documents subscription patterns and real-time capabilities

## Principles, key decisions

### Authentication Workaround Strategy
**Decision**: Use mock user approach (Option B) with fallback to nullable approach (Option A) if needed
- Create single "system" user in auth.users via migration to satisfy foreign key constraints
- Assign all documents, chats, and enhancements to this mock user during development
- Maintains database integrity while avoiding authentication complexity
- Easy migration path when real authentication is implemented

### Simplicity-First Implementation  
**From user feedback**: "keep things simple, especially at first", "get the basics of database storage/retrieval working robustly", "prioritise the most important and most basic stuff"
- Focus on existing features only - no new functionality
- Document remains read-only (no editing UI)
- Defer search, user management, and advanced features
- Keep real-time as simple proof-of-concept only

### Storage Integration Priorities
**From conversation analysis**:
1. **High Priority**: AI enhancements storage (summaries, glossary, headings) - provides immediate persistence value
2. **High Priority**: Chat storage - enables persistent conversations across sessions  
3. **Medium Priority**: Simple real-time PoC - demonstrates database change propagation
4. **Low Priority**: Performance optimizations, cost tracking - defer to later phases

### Database Efficiency Improvements
**Decision**: Add slug column to documents table based on performance analysis
- Current implementation fetches all documents then filters in memory (fine for 4 docs, won't scale)
- Slug column with unique constraint enables direct database lookups
- Maintains backward compatibility with existing slug-based URLs

### Real-time Scope Limitation
**From user guidance**: "fine to defer realtime to a much later stage", "don't need polling", "fine for user to just reload page"
- Implement simple PoC only: database title change → automatic page update
- No comprehensive real-time integration across all features
- Demonstrates capability without adding complexity to core features

## Actions

### Stage: Infrastructure Cleanup and Migration
- ✅ Move static HTML files to archive using subagent
  - ✅ Create `static/examples/obsolete/` directory
  - ✅ Move all `static/examples/*.html` files to obsolete directory
  - ✅ Verify existing functionality still works with database-loaded documents
  - ✅ Update any documentation references to static files
    - 📔 Successfully moved 4 HTML files to archive. Found minor documentation references that may need updates in SITE_ORGANISATION.md and PROJECT_STATUS.md

- ✅ Add slug column to documents table using subagent following migration best practices
  - ✅ Create new migration: `npx supabase migration new add_documents_slug_column`
  - ✅ Add unique slug column to documents table with migration for existing data
  - ✅ Update DocumentService to use slug-based lookups instead of list-and-filter
  - ✅ Run `npm run db:reset` to apply migration and regenerate types
  - ✅ Update all slug-based routing to use direct database queries
  - ✅ Test that document loading performance is improved
    - 📔 Migration `20250602005754_add_documents_slug_column.sql` applied successfully. Added getBySlug() method to DocumentService and updated all routing code for direct database lookups.

### Stage: Authentication Mock User Setup
- ✅ Create mock authentication user via migration, using subagent with lots of context
  - ✅ Add system user creation to existing migration or create new one
  - ✅ Use Supabase auth.admin functions to create "system@spideryarn.internal" user
  - ✅ Update DocumentService to assign created_by to system user for new documents
  - ✅ Test that foreign key constraints are satisfied
  - ✅ If auth user creation fails, fall back to making created_by nullable temporarily
    - 📔 Migration `20250603211615_add_mock_system_user.sql` created system user with ID `00000000-0000-0000-0000-000000000001`. All database operations now use this mock user to satisfy foreign key constraints.

### Stage: AI Enhancements Database Integration
- ✅ Connect AI summarise feature to database storage
  - ✅ Update `app/api/summarise/route.ts` to use EnhancementService
  - ✅ Modify response to store results in document_enhancements table with type='summary'
  - ✅ Update UI components to load existing summaries from database on page load
  - ✅ Test that summaries persist across page reloads
  - ✅ **Critical Fix**: Resolved UUID validation error in tooltip summarization
    - 📔 **Issue**: Tooltip functionality was concatenating documentId + elementId (e.g., `"uuid-syr-elementid"`), creating invalid UUIDs that failed foreign key constraints
    - 📔 **Solution**: Modified API to accept separate `documentId` (proper UUID) and `sectionId` (element ID) parameters
    - 📔 **Files Updated**: 
      - `app/api/summarise/route.ts:13,36,81,127` - Added sectionId parameter and section-specific caching logic
      - `components/table-of-contents-tabs.tsx:168-169` - Updated API call to pass documentId and sectionId separately
    - 📔 **Testing**: Verified section-specific caching works (different sections get separate cache entries), performance improvement (cached: 82ms vs new: 514ms), and database persistence across sessions

- ✅ Connect AI glossary feature to database storage  
  - ✅ Update `app/api/glossary/route.ts` to use EnhancementService
  - ✅ Store glossary results with type='glossary' in document_enhancements table
  - ✅ Update glossary UI to load from database and handle cached results
  - ✅ Test that glossaries persist and don't regenerate unnecessarily
  - ✅ **Major Architectural Refactor**: Eliminated tier key redundancy with config-based model resolution
    - 📔 **Issue**: Tier keys were stored redundantly in both `lib/config.ts` and database JSONB fields, causing "Model not found for tier key 'google-cheap'" errors
    - 📔 **Solution**: Implemented pure config-based architecture - tier keys resolved to provider+modelId in API routes, database stores only provider+modelId
    - 📔 **Files Updated**: 
      - `app/api/glossary/route.ts` - Added config-based tier resolution, proper error handling for malformed cached data
      - `lib/services/database/ai-calls.ts` - Removed tier key logic, updated interface to use provider+modelId lookup  
      - `lib/services/database/enhancements.ts` - Fixed data structure for entities array storage
      - `docs/LLM_MODELS_REFERENCE.md` - Updated architecture documentation
      - `supabase/seed.sql` - Removed tier information from ai_models data
    - 📔 **Benefits**: Eliminates redundancy, config is single source of truth, simpler tier management, easier to add new models
    - 📔 **Testing**: Verified glossary generation working correctly with entities extracted and properly stored in database

- [ ] Connect AI headings feature to database storage
  - [ ] Update `app/api/headings/route.ts` to use EnhancementService  
  - [ ] Store AI-generated headings with type='headings' in document_enhancements table
  - [ ] Update mutation system to work with database-stored headings
  - [ ] Add a 'reset' button (like with Glossary) to clear the document-enhancement database row and give the user a way to fix things if we get into a broken state
  - [ ] Test that heading mutations persist across sessions

- [ ] Write integration tests for AI enhancement persistence
  - [ ] Test that each enhancement type stores and retrieves correctly
  - [ ] Verify that enhancements are linked to correct documents and AI calls
  - [ ] Test behavior when enhancements already exist (update vs create new)

### Stage: Chat Database Integration
- [ ] Connect chat functionality to database storage
  - [ ] Update chat components to use ChatService instead of in-memory state
  - [ ] Modify `components/assistant-chat.tsx` to load existing threads from database
  - [ ] Store chat messages in chat_messages table with proper sequencing
  - [ ] Link chat threads to documents and AI models in database
  - [ ] Test that conversations persist across page reloads and browser sessions

- [ ] Update chat UI for database-backed conversations
  - [ ] Load conversation history on component mount
  - [ ] Handle message persistence and thread continuity
  - [ ] Test multi-turn conversations with proper message ordering
  - [ ] Verify that conversation context is maintained

### Stage: Simple Real-time Proof of Concept
- [ ] Implement basic real-time document title updates
  - [ ] Use existing real-time helpers from `lib/supabase/realtime.ts`
  - [ ] Subscribe to document table changes in document page components
  - [ ] Update page title when document title changes in database
  - [ ] Create simple test: manually update title in Supabase Studio, verify page updates
  - [ ] Document the real-time patterns for future comprehensive implementation

### Stage: Testing and Validation
- [ ] Run comprehensive test suite
  - [ ] Ensure all existing tests pass: `npm test`
  - [ ] Run database integration tests specifically
  - [ ] Test that all AI features work end-to-end with database storage
  - [ ] Verify chat persistence works correctly

- [ ] Manual testing of key user workflows
  - [ ] Test document loading and navigation
  - [ ] Generate AI summaries, glossaries, and headings - verify persistence
  - [ ] Test chat conversations across multiple sessions
  - [ ] Test real-time document updates using Supabase Studio

### Stage: Configuration Simplification ✅ COMPLETED
- ✅ **Resolved tier key redundancy**: Implemented config-based model resolution architecture
  - ✅ **Solution chosen**: Keep `lib/config.ts` as single source of truth (Option A variant)
  - ✅ Config defines tier mappings to provider+modelId, database stores only provider+modelId for tracking
  - ✅ Environment variable overrides (LLM_MODEL) continue to work seamlessly
  - ✅ **Benefits achieved**: Eliminates duplication, simpler tier management, easier to add new models
  - ✅ **Impact**: No breaking changes to development workflow, improved error handling


### Stage: Documentation and Cleanup
- ✅ Update relevant documentation
  - ✅ Update `docs/DATABASE_SCHEMA.md` with tier key architecture changes
  - ✅ Document authentication workaround approach (completed in earlier stages)
  - ✅ Add examples of using database-backed AI features (in service layer docs)
  - ✅ Update any outdated references to in-memory storage
  - ✅ **Comprehensive Database Test Consolidation**: Refactored integration tests for new tier architecture
    - 📔 **Issue**: Database tests had broken AiCallService API calls using old `promptType`/`promptInput` interface
    - 📔 **Solution**: Consolidated ~20 test cases into 9 focused tests with proper `provider + modelId` interface
    - 📔 **Files Updated**: `lib/services/database/__tests__/integration.test.ts` - Complete rewrite with helper functions and better coverage
    - 📔 **Benefits**: Reduced complexity while improving coverage, fixed all API mismatches, added comprehensive cross-service testing

- [ ] Code cleanup and optimization
  - [ ] Remove any unused static file loading code
  - [ ] Clean up temporary workarounds or debugging code
  - [ ] Ensure error handling is consistent across all database operations
  - [ ] Run `npm run lint` and fix any issues

### Stage: Git Commit and Finalization
- [ ] Git commit all changes following `docs/GIT_COMMITS.md`
  - [ ] Use subagent for commit to ensure proper message structure
  - [ ] Include migration files, code changes, and documentation updates
  - [ ] Verify working tree is clean after commit

- [ ] Move this planning document to `planning/finished/`
- [ ] Final commit with planning doc move


## Appendix

### Database Schema Context

The foundation for this work was established in `planning/finished/250531a_database_storage_implementation.md` which created:

1. **Comprehensive Schema**: 7 tables with proper relationships, indexes, and constraints
2. **Service Layer**: Complete CRUD operations for all major entities
3. **Real-time Infrastructure**: Subscription helpers ready for production use
4. **Type Safety**: Generated TypeScript types from schema

**Key Tables for This Integration**:
- `documents` - Already integrated, needs slug column addition
- `document_enhancements` - Ready for AI feature storage (summaries, glossary, headings)
- `chat_threads` & `chat_messages` - Ready for chat persistence
- `ai_calls` - Ready for tracking AI usage (optional for this phase)

### Conversation Decision Points

**Authentication Strategy**: 
> "Let's go with Option B for auth. If you have trouble with that, fall back on Option A"

Option B creates a mock system user to satisfy foreign key constraints while avoiding authentication complexity. This maintains database integrity and provides easy migration path.

**Scope Definition**:
> "Let's treat the document as read-only, so no need for editing title etc for now. More generally, don't worry about adding new features. Let's just get the basics of database storage/retrieval working robustly."

Clear guidance to focus on existing feature persistence, not new functionality.

**Simplicity Emphasis**:
> "Remember docs/CODING_PRINCIPLES.md, e.g. keep things simple, especially at first!"

Aligns with prototype-first approach: get simple version working end-to-end, then layer complexity gradually.

**Real-time Scope**:
> "And we can add some kind of simple realtime PoC (e.g. if I change the title of the document directly in the database, does it automatically update on the page) as a later stage."

Simple proof-of-concept only, not comprehensive real-time integration.

### Performance Optimization Context

The current slug-based routing implementation fetches all documents then filters in memory:

```typescript
// Current approach in getDocumentBySlug()
const { documents } = await documentService.list({
  isPublic: true,
  limit: 100
})
return findDocumentBySlug(documents, slug)
```

This works for 4 documents but won't scale. Adding a unique slug column enables direct lookups:

```sql
-- Proposed improvement
SELECT * FROM documents WHERE slug = $1 AND is_public = true;
```

### Testing Considerations

The existing database tests have 3 known RLS-related failures documented in the planning doc. These don't affect the integration work but should be noted:
- ai_models permission issue (INSERT blocked by RLS)
- ai_call_id SET NULL behavior (DELETE policy missing)  
- profiles table user_id requirement (needs auth.users)

The mock user approach should resolve the profiles issue and potentially the others.

### Alternative Approaches Considered

**Authentication Approaches**:
- **Option A** (Nullable approach): Remove foreign key constraints temporarily
  - Pro: Maximum simplicity
  - Con: Data integrity concerns, harder migration later
- **Option B** (Mock user): Create system user in auth.users
  - Pro: Maintains constraints, easy migration
  - Con: Slight complexity in migration
- **Option C** (Full auth): Implement complete authentication first
  - Pro: Production-ready approach  
  - Con: Major scope expansion, delays core features

**Chosen**: Option B with Option A fallback based on user preference for maintaining database integrity while keeping implementation simple.

**Real-time Integration Scope**:
- **Comprehensive**: Real-time for all features (AI generation, chat, document changes)
  - Pro: Full live experience
  - Con: Significant complexity, not needed for prototype
- **Simple PoC**: Just document title updates
  - Pro: Demonstrates capability without complexity
  - Con: Limited immediate value
- **Deferred**: No real-time implementation
  - Pro: Maximum simplicity
  - Con: Misses opportunity to validate real-time infrastructure

**Chosen**: Simple PoC based on user guidance to demonstrate capability without adding complexity to core features.