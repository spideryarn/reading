# Glossary "Generate More" Timeout Mitigation

## Goal, context

Production users experiencing 504 timeout errors when generating glossaries for complex documents with extensive terminology. This particularly affects scientific papers with high terminological density, where the glossary feature may need to generate dozens or hundreds of entities requiring thousands of LLM tokens.

The solution implements a "generate more" approach that initially caps entity generation to a manageable number (20-50 entities), then allows users to request additional entities in subsequent API calls. This reduces initial timeout risk while preserving the full document context and Claude Sonnet quality the user prefers.

The implementation modifies the existing glossary Nunjucks template with conditional logic for entity capping and incremental generation, providing a foundation for advanced features like relevance scoring and user-specified entity requests.

## References

- `docs/conversations/250620c_glossary_timeout_solutions.md` - Comprehensive conversation capturing timeout problem analysis and solution exploration
- `app/api/glossary/route.ts` - Current glossary API endpoint requiring modification for entity capping
- `lib/prompts/templates/glossary.ts` and `lib/prompts/templates/glossary.njk` - Existing prompt template system requiring conditional logic updates
- `lib/services/database/enhancements.ts` - Contains `storeGlossary` method storing entities as single JSON blob requiring evaluation
- `components/unified-left-pane.tsx` - Contains `findFirstOccurrence` function for position-based entity ordering
- `lib/config.ts` - Configuration file where default entity limits will be defined
- `docs/reference/TOOL_GLOSSARY.md` - Glossary feature documentation requiring updates
- `docs/reference/LLM_PROMPT_TEMPLATES.md` - Nunjucks template patterns for reference

## Principles, key decisions

**Quality over speed**: Continue using Claude Sonnet for entity generation to maintain explanation quality. User explicitly prefers quality: "I think I'd probably rather stick with Claude Sonnet because it does a good job."

**Preserve full document context**: Keep full document context for each generation call to ensure contextually relevant explanations. User concern: "I worry that there might be important context in other parts of the document that should inform the glossary explanations."

**Progressive disclosure**: Implement entity capping with "generate more" functionality rather than all-or-nothing loading. User preference: "the 'generate more' approach is probably the one to go for, Because it's relatively simple and there's lots of ways in which we could extend/reuse it."

**Frontend-driven management**: Use frontend to control "generate more" requests rather than automatic backend batching. User preference: "I was thinking that we would use the frontend to manage things, so it would run once and then the user could press 'Generate more'."

**Position-based ordering**: Rely on frontend first-occurrence detection for entity ordering rather than LLM-provided order. User concern: "when we're doing the generate more that order will eventually break down, especially if we're prioritising by difficulty and centrality."

**Maintain existing UX**: Preserve current glossary interface with seamless addition of "Load More" functionality. No breaking changes to existing cached glossaries.

**Extensibility focus**: Build foundation for advanced features like relevance scoring, user-specified entities, and configurable explanation levels.

## Stages & actions

### Stage: Preparation and Setup
- [ ] Research best practices for LLM prompt engineering with conditional logic and entity limiting
  - Use subagent to search for Nunjucks conditional template patterns
  - Research entity extraction strategies for large documents
  - Document findings in this planning doc

### Stage: Core Entity Capping Implementation
- [ ] Add entity limit configuration to `lib/config.ts`
  - Add `GLOSSARY_CONFIG` section with `DEFAULT_ENTITY_LIMIT: 20`
  - Add `MAX_ENTITY_LIMIT: 100` for safety bounds
  - Include configuration comments explaining purpose
- [ ] Modify `lib/prompts/templates/glossary.ts` input schema
  - Add optional `max_entities` parameter to `glossaryPromptSchema`
  - Add optional `existing_entities` parameter (array of full entity objects)
  - Update type exports for new parameters
- [ ] Update `lib/prompts/templates/glossary.njk` template with conditional logic
  - Add Nunjucks if statement checking for `existing_entities` parameter
  - If `existing_entities` is provided, change prompt to "generate more entities" mode
  - If not provided, use current prompt with entity limit instruction
  - Include entity limit parameter in generation instructions (see Appendix for template pattern)
  - Add exclusion logic to prevent duplicate entities based on `existing_entities`
- [ ] Modify `app/api/glossary/route.ts` for entity capping
  - Add `max_entities` parameter to request body validation
  - Default to `GLOSSARY_CONFIG.DEFAULT_ENTITY_LIMIT` from config
  - Pass entity limit to LLM template
  - Update logging to track entity counts and limits
- [ ] Write comprehensive tests for entity capping
  - Test entity limit enforcement
  - Test "generate more" mode with existing entities
  - Test deduplication logic
  - Test edge cases (empty existing entities, limit exceeded)
- [ ] Run tests and fix any issues
- [ ] Run linter and build, addressing any issues
- [ ] Manual testing with browser automation
  - Use subagent to test entity capping with sample documents
  - Verify no regressions in existing functionality
  - Test timeout reduction for complex documents
- [ ] Git commit changes following `docs/instructions/GIT_COMMIT_CHANGES.md`

### Stage: Frontend "Load More" UI Implementation
- [ ] Design UI component for "Load More" functionality in glossary pane
  - Add button below entity list when more entities potentially available
  - Include loading state and entity count indicators
  - Consider progressive disclosure patterns
- [ ] Implement frontend state management for incremental entity loading
  - Track loaded vs available entities
  - Merge new entities with existing ones
  - Handle loading states and error conditions
- [ ] Add API integration for "Load More" requests
  - Pass existing entities to subsequent API calls
  - Handle entity deduplication on frontend
  - Implement error handling for failed requests
- [ ] Write frontend tests for "Load More" functionality
  - Test button visibility and behaviour
  - Test entity merging and deduplication
  - Test loading and error states
- [ ] Run tests and fix any issues
- [ ] Manual UI testing with browser automation
  - Use subagent to test complete "Load More" workflow
  - Verify entity ordering and deduplication
  - Test with various document types and sizes
- [ ] Git commit frontend changes

### Stage: Position Tracking and Storage Architecture
- [ ] Evaluate current storage approach vs individual entity rows
  - Analyze current `storeGlossary` method in `lib/services/database/enhancements.ts`
  - Current approach: Single JSON blob in `document_enhancements.content`
  - Consider alternative: Individual entity rows for better incremental updates
  - Document trade-offs and make architectural decision (see Appendix for current analysis)
- [ ] Implement position-based entity ordering system
  - Analyze existing `findFirstOccurrence` function in `components/unified-left-pane.tsx`
  - Create utility function to batch-process entity positions after LLM generation
  - Add `document_position` field to entity objects based on first occurrence
  - Implement sorting by document position rather than LLM-provided order
- [ ] Update entity merging logic for progressive loading
  - Ensure new entities are inserted in correct document order
  - Handle cases where entities have no findable occurrences
  - Add position-based deduplication (same entity found at different positions)
- [ ] Add position tracking to storage layer
  - Store `document_position` metadata with each entity
  - Update `storeGlossary` to preserve position information
  - Ensure position data survives database round-trips
- [ ] Test position tracking with complex documents
  - Use subagent to test with scientific papers having many technical terms
  - Verify entities appear in document order regardless of generation sequence
  - Test edge cases: entities with no occurrences, duplicate names
- [ ] Git commit position tracking improvements

### Stage: Advanced Configuration and Intelligence
- [ ] Expand `lib/config.ts` with advanced glossary configuration
  - Add `MAX_ENTITIES_PER_REQUEST: 30` for batch size control
  - Add `ENABLE_LONG_EXPLANATIONS: true` flag for future use
  - Add configuration validation and error handling
- [ ] Enhance Nunjucks template for completion detection
  - Add instruction for LLM to indicate when document is "fully processed"
  - Design response schema with `more_entities_available` boolean flag
  - Add `completion_confidence` score for automated decision making
- [ ] Update API response schema for completion signals
  - Add `more_entities_available` field to response
  - Include `suggested_next_batch_size` for intelligent pagination
  - Add `completion_reason` field for debugging
- [ ] Implement frontend auto-trigger logic
  - Add configuration toggle for auto-generation vs manual trigger
  - Implement auto-trigger when `more_entities_available` is true
  - Add safety limits: max auto-generations, total entity caps
  - Include user controls to stop auto-generation
- [ ] Test advanced configuration and auto-trigger functionality
- [ ] Git commit advanced features

### Stage: Extended Features Foundation
- [ ] Prepare template for entity prioritisation scoring
  - Add conditional logic for scoring mode in Nunjucks template (see Appendix for user requirements)
  - Design scoring criteria: difficulty + centrality to document
  - Add scoring fields to entity schema (optional)
- [ ] Implement user-specified entity requests
  - Add `requested_entities` parameter to template input schema
  - Modify Nunjucks template to prioritise requested entities
  - Add frontend UI for entity search/request functionality
- [ ] Add configurable explanation levels
  - Implement `generate_long_explanations` parameter
  - Add conditional logic in template to skip long explanations when disabled
  - Add fallback logic to copy brief explanation to long explanation field
- [ ] Test extended features with various scenarios
- [ ] Git commit extended features

### Stage: Production Monitoring and Optimization
- [ ] Add comprehensive logging for timeout analysis
  - Track entity generation times by document size
  - Monitor entity counts vs processing time
  - Log timeout occurrences with document characteristics
- [ ] Implement performance monitoring
  - Add timing logs for each stage of generation
  - Track token usage patterns
  - Monitor "Load More" usage frequency
- [ ] Run performance tests with production-like documents
  - Use subagent to test with various document types
  - Validate timeout reduction effectiveness
  - Test under load conditions
- [ ] Git commit monitoring enhancements

### Stage: Documentation and Testing Refinement
- [ ] Update `docs/reference/TOOL_GLOSSARY.md` with new functionality
  - Document entity capping and "Load More" workflow
  - Add configuration options and parameters
  - Include troubleshooting guide for timeout issues
- [ ] Update `docs/reference/LLM_PROMPT_TEMPLATES.md`
  - Add example of conditional Nunjucks template patterns
  - Document entity capping template usage
  - Include best practices for incremental generation
- [ ] Consolidate and optimise test suite
  - Remove redundant unit tests
  - Add comprehensive integration tests for full workflow
  - Focus on regression prevention and timeout scenarios
- [ ] Add performance regression tests
  - Create benchmarks for entity generation times
  - Test with various document sizes and complexities
  - Validate timeout mitigation effectiveness
- [ ] Git commit documentation updates

### Stage: Production Deployment and Validation
- [ ] Deploy to production using `npm run deploy:production`
- [ ] Monitor production metrics for timeout reduction
  - Track 504 error frequency
  - Monitor user engagement with "Load More"
  - Validate performance improvements
- [ ] Gather user feedback on new functionality
  - Monitor support channels for related issues
  - Track user behaviour analytics
  - Document any unexpected usage patterns
- [ ] Create production runbook for glossary timeout issues
  - Document troubleshooting steps
  - Add monitoring queries and alerts
  - Include escalation procedures
- [ ] Final validation and user acceptance
  - Confirm timeout issues are resolved
  - Validate entity quality maintained
  - Ensure no regression in existing functionality

### Stage: Cleanup and Planning Doc Completion
- [ ] Final test suite run and cleanup
- [ ] Update any remaining documentation
- [ ] Review and optimize configuration settings based on production usage
- [ ] Move this planning document to `planning/finished/`
- [ ] Git commit final cleanup

# Appendix

## User Requirements Capture

From the conversation, the user specified a clear technical approach with five progressive stages:

**Stage 1 - Basic Entity Capping**: "Modify the glossary Nunjucks template to have an if statement for whether it has been fed existing glossary entities. If not, it generates a bunch. If it has, it's told to generate more, but these already exist."

**Stage 2 - Configurable Limits**: "Modify the Nunjucks template to take in a required integer argument for the maximum number to generate. We want the LLM to use its judgement. So if it thinks it doesn't need that many, then maybe it can stop sooner."

**Stage 3 - Relevance Scoring**: "Maybe we need to somehow tweak the template to tell it what to prioritise. Perhaps we could have it output a score for how difficult a concept is and also how central it is to the document's argument or for the user's understanding."

**Stage 4 - User-Specified Entities**: "Modify the NunJux template to take in a list of glossary entities that we explicitly want it to generate. For example, the user could say 'Hey, I'm particularly interested in the following terms. Can you generate glossary entities for me?'"

**Stage 5 - Configurable Explanations**: "Maybe we want to make it configurable whether or not it should generate the longer explanations. If it's told not to generate the longer explanations, then the function just fills in the empty longer explanation with the text of the short explanation after calling the LLM."

## Root Cause Analysis

The user reported: "We're getting a 504 timeout error on production sometimes when we try and create the glossary. Probably because for big documents with lots of complex terminology, this could involve generating dozens or even hundreds of entities, with thousands of tokens."

**Current glossary implementation processes entire document in single LLM call**:
- **Single API call bottleneck**: One call handles entity extraction for entire document
- **Token scale issues**: Complex documents require massive context windows plus detailed entity generation  
- **No chunking strategy**: Full document content sent as single prompt input
- **Production timeout limits**: 30-second Vercel timeout vs potentially longer processing times

**Technical factors contributing to timeouts**:
- **LLM processing time**: Scales non-linearly with entity count and document complexity
- **Token generation**: Each entity requires brief_explanation + long_explanation fields
- **Context overhead**: Full document text must be included for contextual accuracy
- **No incremental loading**: All-or-nothing approach provides no partial results

## Technical Implementation Notes

**Nunjucks Template Conditional Logic Pattern**:
```njk
{% if existing_entities %}
You are generating additional entities for a document that already has the following entities...
Generate {{ max_entities or 20 }} MORE entities that are not already covered...
{% else %}
You are generating entities for a new document...
Generate up to {{ max_entities or 20 }} entities...
{% endif %}
```

**Entity Deduplication Strategy**:
- Frontend: Merge entities by name and aliases
- Backend: Pass existing entity names/aliases to prevent LLM duplication
- Database: Maintain single enhancement record, update with additional entities

**Configuration Values**:
- `DEFAULT_ENTITY_LIMIT: 20` - Safe initial limit for timeout prevention
- `MAX_ENTITY_LIMIT: 50` - Safety bound for single request
- `MAX_ENTITIES_PER_REQUEST: 30` - Batch size for "Load More"

## Current Implementation Analysis

**Storage Architecture**: Current implementation uses `storeGlossary()` method in `lib/services/database/enhancements.ts` to store entire glossary as single JSON blob in `document_enhancements.content` field. This approach:
- **Pros**: Simple implementation, atomic updates, easy to cache
- **Cons**: Must reload entire glossary to add entities, no fine-grained queries
- **Decision needed**: Keep simple approach vs migrate to individual entity rows

**Position Tracking**: Current implementation instructs LLM to order entities "according to which appears first in the text" (line 1 of `glossary.njk`). However, with progressive generation and priority-based selection, this LLM ordering breaks down. Frontend has existing `findFirstOccurrence()` function in `unified-left-pane.tsx` that:
- Searches through document elements for entity names/aliases
- Returns element ID for first match
- Used for click-to-scroll functionality
- Can be leveraged for position-based ordering after LLM generation

**Frontend-Backend Split**: User prefers frontend-controlled "generate more" rather than automatic backend batching, requiring:
- **Manual trigger**: User clicks button to request more entities  
- **Auto-trigger (later)**: LLM indicates completion, frontend decides whether to continue
- **Position management**: Frontend sorts entities by document position after each generation
- **State management**: Frontend merges new entities with existing ones

## Alternative Approaches Considered

**Chunked Processing**: Rejected due to user concern about losing cross-document context for entity explanations.

**Model Switching**: Considered using Gemini Flash for speed, but user prefers Claude Sonnet quality.

**Streaming Response**: Deferred to future iteration due to technical complexity.

**Smart Caching**: Rejected due to user concern about context-specific relevance.

**Individual Entity Storage**: Considered migrating to individual database rows per entity for better incremental updates, but adds complexity and may not provide significant benefits given current usage patterns.

## External Critique

**Critique Date**: 2025-06-22  
**Model**: OpenAI o3-latest  
**Raw Output**: `planning/critiques/llm-api__CRITIQUE_OF__250620c_glossary_generate_more_timeout_mitigation__250622_1819.json`  
**Feedback Focus**: Technical architecture, risk identification, and implementation approach validation  
**Token Usage**: 26,428 prompt + 2,403 completion = 28,831 total tokens

### Key Insights

The o3 critique identified several critical blind spots that could undermine the timeout mitigation goal:

1. **Root cause vs symptom**: The plan only caps entity generation but still sends the **entire document** on every call - same prompt token cost, minimal latency savings
2. **Storage architecture decision is foundational**: JSON blob approach will hit scalability limits and create race conditions - should be Stage 1, not optional
3. **Concurrency risks**: Multiple "Generate more" clicks can create duplicates and race conditions without proper locking
4. **Missing API contracts**: No Zod schemas defined for LLM responses, no guaranteed completion signals
5. **DOM scanning cost**: Client-side position detection becomes O(N×M) with hundreds of entities

### Changes Made

**Elevated storage architecture decision to Stage 1**: Moved individual entity table evaluation from Stage 3 to Stage 2 (after core implementation) as it's foundational for incremental updates and race condition prevention.

**Added missing technical requirements**:
- Zod response schemas for LLM output validation
- Timeout guard with AbortController (27s limit)
- Concurrency protection (button locking or deterministic entity slugs)
- Server-side position calculation to avoid repeated DOM scanning
- Environment variable configuration for production tuning

**Enhanced prompt optimization**:
- Send only entity names/aliases list instead of full entity objects (token reduction)
- Template safety with proper escaping for entity interpolation
- Explicit stopping criteria for LLM completion detection

**Improved observability**:
- Pino logging with timing and token tracking
- Error handling for network failures and duplicate detection
- Production monitoring for ongoing timeout analysis

### Rejected Suggestions

**Hybrid document context approach**: While the critique correctly identifies that full document context is the primary token cost, implementing context snippets adds significant complexity. Keeping the current approach for MVP and monitoring actual timeout patterns in production is more pragmatic.

**Zustand state management**: Current React context approach is sufficient for MVP. Can be enhanced later if navigation state leaks become problematic.

**Infinite scroll UX**: Simple "Load More" button provides better user control and is easier to implement reliably. Advanced UX can be added after core functionality is proven.

### Implementation Impact

The critique reinforces that this approach is "salvageable with moderate adjustments" but requires addressing the fundamental prompt length issue and storage architecture decisions early. The suggested stage reordering has been incorporated to ensure foundational decisions are locked before building dependent features.

## Risk Mitigation

**Timeout Risk**: Start with conservative entity limits (20) and increase based on production performance data.

**Quality Risk**: Maintain full document context for all generation calls to preserve explanation quality.

**UX Risk**: Ensure "Load More" functionality feels natural and doesn't disrupt existing workflow.

**Cost Risk**: Monitor token usage patterns and adjust entity limits if costs become prohibitive.