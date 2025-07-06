# Comprehensive AI Response Logging Implementation

## Goal

Implement comprehensive logging of all AI API responses in the `ai_calls` table for debugging, auditing, and monitoring purposes. This includes capturing the complete raw API response, accurate latency measurements, and ensuring all AI calls properly log token usage and metadata.

## Context

Currently, the `ai_calls` table has a `response_text` field that is never populated (always NULL) except for test prompt types. Additionally:
- Latency measurements (`latency_ms`) are never captured
- Some prompt types (like `reading_difficulty`) don't log token usage
- We're missing valuable debugging information from the raw API responses
- The Vercel AI SDK provides rich metadata that we're not capturing

## User Stories & Acceptance Criteria

### As a developer debugging AI issues
- I need to see the complete raw API response to understand what the LLM returned
- I need accurate latency measurements to identify performance bottlenecks
- I need all token usage logged consistently across all prompt types
- I need provider-specific metadata (headers, IDs, timestamps) for troubleshooting

### As a system administrator monitoring costs
- I need accurate token usage tracking for all AI calls
- I need to identify which operations are most expensive
- I need latency data to monitor API performance

### Acceptance Criteria
1. All AI calls store the complete raw API response (not just extracted text)
2. Latency is accurately measured and stored in milliseconds
3. All prompt types consistently log token usage
4. The solution handles all 3 providers (Anthropic, Google, OpenAI) robustly
5. Serialization works correctly without errors
6. A standardized interface ensures future implementations log data correctly

## References

- `lib/services/database/ai-calls.ts` - Current AiCallService implementation
- `lib/prompts/types.ts` - executePromptWithUsage returns raw response data
- `docs/reference/VERCEL_AI_SDK_REFERENCE.md` - SDK capabilities and metadata access
- `docs/reference/DATABASE_SUPABASE_INTEGRATION_REFERENCE.md` - Database schema patterns
- `docs/reference/CODING_PRINCIPLES.md` - Fail fast with clear errors principle

## Principles & Key Decisions

### 1. Field Naming Decision
**Decision**: Replace `response_text` with `raw_api_response` JSONB field
- Remove redundant `response_text` field entirely
- `raw_api_response` stores the complete API response including text content
- JSONB allows storing structured data including metadata
- Enables querying specific response fields if needed
- Text content accessible via `raw_api_response->>'text'`

### 2. Storage Approach
**Decision**: Store the complete Vercel AI SDK result object
- Captures all available metadata in one place
- Preserves provider-specific fields
- Future-proof as SDK adds new fields

### 3. Latency Measurement
**Decision**: Use SDK timestamps as the single source of truth when available
- Primary: Calculate latency using `finishTimestamp - startTimestamp` from the SDK response.
- Fallback: If timestamps are missing, fall back to `experimental_providerMetadata.latency`; as a last resort, use a custom high-resolution timer started before the request and stopped on the final token.
- Record **one** latency value per call (first available in the order above) to avoid confusion and duplication.

### 4. Standardization Strategy
**Decision**: Create a standardized AI response logger service
- Single point of responsibility for capturing all AI responses
- Enforces consistent logging across all handlers
- Type-safe interface prevents missing data

### 5. Migration Approach
**Decision**: Clean migration removing redundancy
- Add new `raw_api_response` JSONB field
- Remove unused `response_text` field in same migration
- No data loss since `response_text` was never populated
- Simplifies schema and reduces confusion

### 6. Error Handling Approach (Added 2025-07-06)
**Decision**: Fail fast and fatal with clear error messages
- No graceful fallbacks or silent failures
- All errors throw immediately with detailed context
- Error messages include debugging information (AI call ID, response size, object keys)
- Follows project principle: "Fail fatally & immediately with clear, debuggable, user-visible error messages"
- Ensures AI usage and cost tracking never fails silently

## Stages & Actions

### Stage: Database schema migration
- [x] Review current `ai_calls` table schema and usage patterns
- [x] Create migration to add `raw_api_response` JSONB field to `ai_calls` table
- [x] Update migration to also remove `response_text` field
- [ ] Add check constraint to ensure `raw_api_response` is not null for new rows (deferred)
- [x] Update database type definitions
- [x] Test updated migration locally with rollback plan
- [x] Migration review approved (2025-07-06)
- [x] Committed database migration changes (2025-07-06)

### Stage: Core AI response capture service
- [x] Create `lib/services/ai-response-logger.ts` with standardized interface
- [x] Implement response serialization with provider-specific handling
- [x] Add fatal error handling with clear, debuggable messages (no graceful fallbacks)
- [x] Write unit tests for all 3 providers (Anthropic, Google, OpenAI)
  - [x] Test verifies JSON serialization with proper error handling
  - [x] Test handles edge cases (large responses, special characters)
  - [x] Test verifies all expected fields are captured
  - [x] Test ensures circular references fail fatally
  - [x] Test ensures serialization errors fail fatally
  - [ ] Add custom ESLint rule (and optional codemod) that forbids direct calls to `AiCallService.completeCall` outside the new logger, encouraging consistent usage

### Stage: Update AiCallService
- [x] Modify `completeCall` method to accept optional `rawApiResponse` parameter
- [x] Update `extractMetricsFromAiResponse` to handle full response objects
- [x] Ensure backward compatibility for existing code
- [x] Add latency calculation from timestamps with proper priority order
- [x] Tests updated for new error handling approach

### Stage: Integrate with prompt execution
- [x] Update `executePromptWithUsage` to return full Vercel AI SDK response
- [x] Ensure all metadata is preserved through the execution chain
- [x] Added `rawResponse` field to `PromptExecutionResult` interface
- [ ] Test with real API calls to verify data capture

### Stage: Update all tool handlers
- [ ] Update structure.ts handler to use new logging
- [ ] Update glossary.ts handler
- [ ] Update summary.ts handler
- [ ] Update search.ts handler
- [ ] Fix metadata.ts handler to log token usage for reading_difficulty
- [ ] Update all other handlers to use standardized logging

### Stage: Multimodal and streaming support
- [ ] Update multimodal prompt handlers to capture responses
- [ ] Investigate streaming response capture (if applicable)
- [ ] Ensure chat responses are logged appropriately

### Stage: Testing and validation
- [ ] Run comprehensive tests across all prompt types
- [ ] Verify data is correctly stored in database
- [ ] Check serialization with various response sizes
- [ ] Test error scenarios and edge cases
- [ ] Use subagent to run full test suite
- [ ] Write an **integration test** that executes a real prompt end-to-end and asserts that `raw_api_response` and latency are correctly persisted in the `ai_calls` table

### Stage: Monitoring and debugging tools
- [ ] Create utility functions to query and analyze stored responses
- [ ] Add logging for response sizes and serialization performance
- [ ] Document how to access and use the stored data

### Stage: Documentation and cleanup
- [ ] Update `docs/reference/DATABASE_SCHEMA.md` with new field
- [ ] Create `docs/reference/AI_RESPONSE_LOGGING.md` guide
- [ ] Update relevant code comments
- [ ] Remove any temporary debugging code
- [ ] Run final health check: `npm run check:health`
- [ ] Create evergreen documentation `docs/reference/DATABASE_AI_RESPONSE_LOGGING.md` describing schema, logging approach, and querying patterns (see `docs/instructions/WRITE_EVERGREEN_DOC.md`)

### Stage: Final review and merge
- [ ] Review all changes with user
- [ ] Ensure all tests pass
- [ ] Check that existing functionality isn't broken
- [ ] Get permission to merge to main
- [ ] Move planning doc to `docs/planning/finished/`

## Appendix

### Vercel AI SDK Response Structure

Based on research, the SDK provides:
```typescript
{
  text: string,                    // The generated text
  usage: {                        // Token usage
    promptTokens: number,
    completionTokens: number,
    totalTokens: number,
    reasoningTokens?: number      // For o3-preview models
  },
  finishReason: string,           // Why generation stopped
  response?: {                    // HTTP response metadata
    id: string,
    headers: Headers,
    // ... other fields
  },
  experimental_providerMetadata?: {
    latency?: number,             // Provider-reported latency
    // ... provider-specific fields
  },
  startTimestamp?: number,        // Generation start time
  finishTimestamp?: number,       // Generation end time
}
```

### Example Enhanced Logging

```typescript
// Before (current implementation)
await aiCallService.completeCall(aiCall.id, {
  output_data: { operations_count: 10 },
  usage: llmResult.usage,
  finishReason: llmResult.finishReason
})

// After (with comprehensive logging)
await aiCallService.completeCall(aiCall.id, {
  output_data: { operations_count: 10 },
  usage: llmResult.usage,
  finishReason: llmResult.finishReason,
  rawApiResponse: llmResult.fullResponse,  // Complete SDK response
  latencyMs: llmResult.finishTimestamp - llmResult.startTimestamp
})
```

### Migration Safety

To ensure safe migration:
1. New field is nullable initially to not break existing code
2. Gradual rollout - update handlers one at a time
3. Monitor serialization performance and storage usage
4. Verify no code references `response_text` before removal
5. Add alerts for serialization failures

### Storage Considerations

- Average response size: 1-10 KB (JSON)
- With compression: 20-30% of original size
- Retention policy: Consider 30-90 day retention
- (Indexing strategy to be revisited once real-world query patterns emerge; GIN index deferred)