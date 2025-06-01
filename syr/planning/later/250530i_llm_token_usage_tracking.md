# LLM Token Usage Tracking and Cost Calculation

## Goal, context

Implement comprehensive token usage tracking for all LLM calls in the Spideryarn Reading application. Currently, the Vercel AI SDK provides detailed token usage metadata (`promptTokens`, `completionTokens`, `totalTokens`, `finishReason`) in all `generateText` responses, but our codebase doesn't capture or log this information.

The goal is to track every LLM interaction for monitoring, debugging, and eventual cost analysis. This will help with:
- Understanding actual token usage patterns across different features
- Debugging LLM performance issues
- Preparing for production cost monitoring and optimization
- Supporting future billing/usage analytics

Current state: Zero token tracking. All LLM calls occur through two main pathways:
1. **Prompt Template System** (`lib/prompts/types.ts`) - handles `summarise`, `glossary`, `headings`, `tweet-thread` APIs
2. **Direct Chat API** (`app/api/chat/route.ts`) - handles conversational interactions

## References

- `docs/VERCEL_AI_SDK_REFERENCE.md` - Documents Vercel AI SDK capabilities including usage metadata (lines 98-99)
- `lib/services/llm-provider.ts` - Multi-provider abstraction layer for AI SDK
- `lib/prompts/types.ts` - Centralized prompt template execution system (lines 85-92)
- `app/api/chat/route.ts` - Chat API endpoint using direct `generateText` calls (line 63)
- `docs/LLM_PROMPT_TEMPLATES.md` - Will need updating to document usage tracking
- `lib/config.ts` - Contains model configuration and pricing information for cost calculations

## Principles, key decisions

- **Simple logging first**: Start with browser console logging before implementing database storage
- **Two-pathway approach**: Implement separately for prompt templates and chat API (don't force chat into template system)
- **Preserve existing architecture**: Minimal changes to current LLM call patterns
- **Prototype-focused**: Prioritize accuracy and development speed over production concerns
- **Future-ready data structure**: Design logging format to support eventual Supabase storage
- **Comprehensive coverage**: Track all LLM calls, not just user-facing ones

## Actions

### Stage: Enhance Prompt Template System with Usage Tracking
- [ ] Modify `executePromptInternal` function in `lib/prompts/types.ts` to capture and log usage data
  - [ ] Change return type from `Promise<string>` to include usage metadata
  - [ ] Add console logging with structured format: `[LLM Usage] template_name: { promptTokens, completionTokens, totalTokens, finishReason }`
  - [ ] Extract prompt type from template name (remove `.njk` extension)
  - [ ] Test with existing APIs: `summarise`, `glossary`, `headings`, `tweet-thread`

- [ ] Update all API routes that use `executePrompt` to handle new return format
  - [ ] Modify return statements to extract `text` property from enhanced response
  - [ ] Verify no breaking changes to existing API responses

- [ ] Test enhanced prompt template system
  - [ ] Run existing test suite: `npm test`
  - [ ] Manual testing of each API endpoint via browser dev tools
  - [ ] Verify console logging appears for each LLM call

### Stage: Add Usage Tracking to Chat API
- [ ] Enhance chat API in `app/api/chat/route.ts` to capture usage metadata
  - [ ] Extract `usage` and `finishReason` from `generateText` result (line 63)
  - [ ] Add console logging with format: `[LLM Usage] chat: { promptTokens, completionTokens, totalTokens, finishReason }`
  - [ ] Include message count and document context length in logging

- [ ] Test chat API usage tracking
  - [ ] Manual testing via chatbot interface
  - [ ] Verify console logging appears for chat interactions
  - [ ] Test with different conversation lengths and document contexts

### Stage: Create Unified Logging Interface
- [ ] Create utility function for standardized usage logging
  - [ ] New file: `lib/services/usage-logger.ts`
  - [ ] Function signature: `logLLMUsage(promptType: string, usage: Usage, finishReason: string, metadata?: object)`
  - [ ] Consistent console.log format across all LLM calls

- [ ] Refactor both tracking implementations to use unified logger
  - [ ] Update prompt template system to use `logLLMUsage`
  - [ ] Update chat API to use `logLLMUsage`
  - [ ] Include relevant metadata (template name, message count, etc.)

### Stage: Add Cost Calculation Framework
- [ ] Research current model pricing for Anthropic Claude and Google Gemini
  - [ ] Update `lib/config.ts` with pricing information per model
  - [ ] Add separate pricing for input vs output tokens

- [ ] Implement cost calculation utility
  - [ ] Function to calculate cost based on token usage and model type
  - [ ] Include cost in console logging output
  - [ ] Format: `[LLM Usage] template_name: { tokens: {...}, cost: $0.0123, model: 'claude-3-5-haiku' }`

### Stage: Prepare for Database Storage
- [ ] Design Supabase table schema for LLM usage tracking
  - [ ] Fields: `id`, `prompt_type`, `model`, `prompt_tokens`, `completion_tokens`, `total_tokens`, `finish_reason`, `cost`, `timestamp`, `metadata` (JSON)
  - [ ] Create migration file: `supabase/migrations/[timestamp]_create_llm_usage_table.sql`

- [ ] Implement database storage functions (but don't activate yet)
  - [ ] Function to insert usage record into Supabase
  - [ ] Add feature flag to toggle between console logging and database storage
  - [ ] Test database insertion with sample data

### Stage: Documentation and Testing
- [ ] Update `docs/LLM_PROMPT_TEMPLATES.md` to document usage tracking
  - [ ] Add section on token usage monitoring
  - [ ] Document logging format and data structure
  - [ ] Include examples of cost calculation

- [ ] Write tests for usage tracking functionality
  - [ ] Unit tests for usage logger utility
  - [ ] Integration tests for prompt template usage tracking
  - [ ] Integration tests for chat API usage tracking

- [ ] Run comprehensive testing
  - [ ] Full test suite: `npm test`
  - [ ] Manual testing of all LLM-powered features
  - [ ] Verify consistent logging across all APIs

### Stage: Review and Cleanup
- [ ] Review implementation with user
  - [ ] Demonstrate console logging in action
  - [ ] Confirm data structure meets requirements
  - [ ] Discuss next steps for database activation

- [ ] Git commit all changes
  - [ ] Follow `docs/GIT_COMMITS.md` guidelines
  - [ ] Use descriptive commit message covering all tracking enhancements

- [ ] Move this document to `planning/finished/` and commit

## Appendix

### Current LLM Call Analysis

**Prompt Template System** (`lib/prompts/types.ts:85-92`):
- Used by: `summarise`, `glossary`, `headings`, `tweet-thread` APIs
- Current return: `Promise<string>` (just the generated text)
- Available metadata: `result.usage`, `result.finishReason` from underlying `generateText` call
- Centralized: ✅ Single function handles all template-based calls

**Chat API** (`app/api/chat/route.ts:63`):
- Direct `generateText` call with conversation history
- Current logging: Response length only (line 72-75)
- Available metadata: Same `result.usage`, `result.finishReason`
- Centralized: ❌ Single endpoint but separate from template system

### Token Usage Metadata Structure (from Vercel AI SDK)
```typescript
interface Usage {
  promptTokens: number      // Input tokens sent to model
  completionTokens: number  // Output tokens generated by model  
  totalTokens: number       // promptTokens + completionTokens
}

type FinishReason = 'stop' | 'length' | 'content-filter'
```

### Planned Database Schema
```sql
CREATE TABLE llm_usage (
  id SERIAL PRIMARY KEY,
  prompt_type VARCHAR(50) NOT NULL,  -- 'chat', 'summarise', 'glossary', etc.
  model VARCHAR(100) NOT NULL,       -- 'claude-3-5-haiku', 'gemini-1.5-flash', etc.
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  finish_reason VARCHAR(20),
  cost DECIMAL(10,6),               -- Calculated cost in USD
  timestamp TIMESTAMP DEFAULT NOW(),
  metadata JSONB                    -- Additional context (message count, content length, etc.)
);
```

### Cost Calculation Research
Based on web search of Anthropic pricing:
- Claude 3.5 Haiku: Input ~$0.25/1M tokens, Output ~$1.25/1M tokens
- Claude 3.5 Sonnet: Input ~$3/1M tokens, Output ~$15/1M tokens
- Billing calculated monthly based on actual usage
- Tool use requests priced same as regular requests
- Volume discounts available for enterprise customers