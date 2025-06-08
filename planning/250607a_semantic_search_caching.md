# Semantic Search Caching Implementation

## Goal, context

Add database caching for semantic search results to improve performance and enable query history functionality. Currently, semantic search results are generated on-demand for each query (taking 4-8 seconds), but are not stored in the database unlike other AI features (summaries, glossary, headings, tweet threads).

The goal is to:
1. Cache semantic search results in the `document_enhancements` table for instant retrieval on repeated queries
2. Maintain exact query matching (no fuzzy matching) - "consciousness" and "conscious experience" are distinct queries
3. Enable future UI enhancements like query history dropdown

**Key Requirements from User**:
- Queries must be treated as exactly distinct (subtle differences in phrasing yield importantly different matches)
- Cache never expires (but will add UI for manual deletion in later stage)
- Use existing `document_enhancements` table rather than creating new table
- Query normalization should only trim whitespace, preserve case and punctuation

## References

**Implementation Context**:
- `planning/finished/250606a_semantic_search_implementation.md` - Complete semantic search feature implementation without caching
- `planning/finished/250602a_database_integration_completion.md` - Shows how other AI features store results in `document_enhancements`
- `app/api/semantic-search/route.ts` - Current semantic search API that generates results on-demand
- `lib/services/database/enhancements.ts` - EnhancementService for storing/retrieving AI enhancements
- `docs/DATABASE_SCHEMA.md` - Document enhancements table structure with unique constraint on (document_id, type, subtype)

**Similar Features for Reference**:
- `app/api/glossary/route.ts` - Shows pattern for caching glossary results with type='glossary'
- `app/api/headings/route.ts` - Shows GET/POST/DELETE pattern for cached headings
- `app/api/summarise/route.ts` - Shows how summaries use subtype for section-specific caching

## Principles, key decisions

### Exact Query Matching
**Decision**: Treat each query as completely distinct, no fuzzy matching or similarity detection
- "consciousness" ≠ "conscious experience" ≠ "what is consciousness?"
- Each produces subtly but importantly different semantic matches
- User explicitly wants to preserve these distinctions

### Query Normalization Strategy
**Decision**: Minimal normalization - only trim leading/trailing whitespace
- Preserve case sensitivity (don't lowercase)
- Preserve punctuation
- Create `normalizeSemanticSearchQuery()` function that only trims whitespace
- Store both original and normalized query in content

### Storage Architecture
**Decision**: Use existing `document_enhancements` table (Option A from analysis)
- Type: `'semantic-search'`
- Subtype: Normalized query string (trimmed whitespace only)
- Content structure:
  ```typescript
  {
    originalQuery: string      // Exactly as user typed
    normalizedQuery: string    // Whitespace trimmed
    matches: Array<{
      elementId: string
      confidence: number  
      reasoning: string
      relevantText?: string
    }>
    stats?: {
      totalElements: number
      searchableElements: number
      matchesFound: number
      estimatedTokensUsed?: number
    }
    searchedAt: string        // ISO timestamp
  }
  ```

### No Automatic Expiration
**Decision**: Cached results never expire automatically
- Simplifies implementation
- Preserves historical searches
- Later stage will add manual deletion UI

### Subtype Length Consideration
**Analysis**: PostgreSQL TEXT type has no practical length limit
- Queries of a few sentences are fine
- Unique constraint will work with long subtypes
- No need for query hashing initially

## Actions

### Stage: Add Query Normalization Utility
- [x] Create query normalization function
  - [x] Add `normalizeSemanticSearchQuery()` to `lib/utils/` or `lib/services/`
  - [x] Function should only trim leading/trailing whitespace
  - [x] Add unit tests for normalization (empty string, spaces, tabs, newlines)
  - [x] Test that case and punctuation are preserved
- [x] Update planning doc with progress

### Stage: Update Semantic Search API for Caching
- [x] Modify GET endpoint in `/app/api/semantic-search/route.ts`
  - [x] Check for cached results before executing LLM call
  - [x] Use EnhancementService.get() with type='semantic-search' and subtype=normalizedQuery
  - [x] If cached result exists, return it with additional metadata (cachedAt timestamp)
  - [x] Add response header or field to indicate cached vs fresh result
- [x] Modify POST endpoint to store results
  - [x] After successful LLM execution, store results using EnhancementService
  - [x] Use normalized query as subtype
  - [x] Include both original and normalized query in content
  - [x] Link to AI call record for tracking
- [x] Add error handling
  - [x] Handle case where caching fails but LLM succeeded (return results anyway)
  - [x] Log caching errors but don't fail the request
- [x] Test with curl or subagent
  - [x] First query should be slow (4-8s)
  - [x] Repeated identical query should be fast (<100ms)
  - [x] Similar but different query should generate fresh results
- [x] Update planning doc with progress

### Stage: Update UI to Show Cached Status
- [x] Modify `components/unified-left-pane.tsx` semantic search handling
  - [x] Add visual indicator when results are from cache (similar to "Loaded" badge on other features)
  - [x] Show cache timestamp if available
  - [x] Ensure navigation and highlighting work identically for cached results
- [x] Test UI changes
  - [x] Verify cached results display correctly
  - [x] Ensure performance improvement is noticeable to user
  - [x] Check that all result interactions work as before
- [x] Update planning doc with progress

### Stage: Add Integration Tests
- [ ] Write tests for semantic search caching
  - [ ] Test that identical queries return cached results
  - [ ] Test that different queries generate fresh results
  - [ ] Test query normalization (whitespace variations)
  - [ ] Test that cached results maintain correct structure
  - [ ] Verify AI call tracking for both cached and fresh queries
- [ ] Run all tests and ensure they pass
- [ ] Update planning doc with progress

### Stage: Documentation and Initial Deployment
- [ ] Update relevant documentation
  - [ ] Add caching details to semantic search documentation
  - [ ] Update API documentation with cache behavior
  - [ ] Document query normalization rules
- [ ] Manual testing of complete flow
  - [ ] Test with various documents and query types
  - [ ] Verify performance improvement
  - [ ] Check database entries are created correctly
- [ ] Git commit following `docs/GIT_COMMITS.md` (use subagent)
- [ ] Update planning doc with completion status

### Later Stage: Add Cache Management UI
- [ ] Add DELETE endpoint to `/app/api/semantic-search/route.ts`
  - [ ] Accept documentId and query parameters
  - [ ] Use EnhancementService to delete specific cached query
  - [ ] Return success/not-found status
- [ ] Add cache management to UI
  - [ ] Add "Clear cache" 'x' button for individual results
  - [ ] Test cache deletion functionality
  - [ ] Verify deletion removes correct cache entry
  - [ ] Ensure fresh search works after cache clear
  - [ ] Check that other cached queries remain intact

### Later Stage: Query History Dropdown
- [x] Create endpoint to list cached queries for a document
  - [x] GET /api/semantic-search?documentId=xxx (integrated into existing route)
  - [x] Return list of cached queries with timestamps
  - [x] Sort by most recent first
- [x] Convert search input to combo-box
  - [x] Show dropdown of previous queries when focused
  - [x] Allow selection of previous query to load cached results instantly
  - [x] Maintain ability to type new queries
  - [x] Used custom dropdown implementation for better integration
- [x] Test query history functionality
  - [x] Verify dropdown shows correct historical queries
  - [x] Ensure selection loads cached results
  - [x] Check that new queries still work

### Final Stage: Wrap Up
- [ ] Move this planning doc to `planning/finished/`
- [ ] Git commit the doc move

## Appendix

### Database Schema Context

The `document_enhancements` table structure:
```sql
UNIQUE(document_id, type, subtype)
```

This unique constraint means:
- Each document can have one cached result per unique query
- The normalized query becomes the subtype
- No versioning needed - newer results replace older ones

### Performance Considerations

Current performance characteristics:
- Fresh semantic search: 4-8 seconds (LLM processing time)
- Cached search: Expected <100ms (database query only)
- This 40-80x improvement justifies the added complexity

### Alternative Approaches Considered

**Query Hashing**: Considered using MD5/SHA hash of query as subtype
- Pros: Fixed length, efficient indexing
- Cons: Can't see actual query in database, harder to debug
- Decision: Start with plain text, optimize later if needed

**Similarity Matching**: Considered grouping similar queries
- Pros: Better cache hit rate, storage efficiency
- Cons: Complex implementation, may return inappropriate results
- Decision: Exact matching aligns with user requirement for precision

**TTL/Expiration**: Considered automatic cache expiration
- Pros: Ensures freshness, prevents unbounded growth
- Cons: Adds complexity, user wants persistent cache
- Decision: No expiration, add manual management later

### User Requirement Quotes

> "Queries have to be exactly the same to be loaded interchangeably, i.e. 'consciousness' and 'conscious experience' must be treated as distinct. (Because they mean subtly different things, and will yield subtly but importantly different matches)"

> "Never. But as a later stage, we will want to add a UI feature for the user to delete a semantic search result from the store."

> "For the query normalisation, it's ok to trim leading/trailing whitespace, but I don't think we should mess with the case, i.e. we should store the query as case-sensitive. And let's not mess with punctuation either."