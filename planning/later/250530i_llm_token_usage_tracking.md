# Complete LLM Token Usage Tracking

## Goal, context

Complete the LLM token usage tracking implementation in the Spideryarn Reading application. Since this planning document was written, significant progress has been made:

**✅ Already implemented:**
- Database schema (`ai_calls` table) with token tracking fields
- Chat API (`app/api/chat/route.ts`) already captures and stores usage metadata
- `AiCallService` infrastructure with usage tracking methods
- Multi-provider support with tier-based configuration

**❌ Still missing:**
- Prompt template system (`lib/prompts/types.ts`) doesn't return usage metadata to API routes
- API routes using `executePrompt` can't populate token fields in their AI call records
- Model pricing data is empty in the database
- Cost calculation is broken (references non-existent column names)

The remaining goal is to close the gap so that ALL LLM calls track token usage and costs. This affects 7 API routes: `summarise`, `glossary`, `headings`, `semantic-search`, `tweet-thread`, `upload-pdf`, `extract-url`.

## References

- `lib/prompts/types.ts` - Prompt template system needing usage metadata return
- `lib/services/database/ai-calls.ts` - AiCallService with existing token tracking infrastructure
- `supabase/migrations/` - Database schema with `ai_calls` table and `ai_models` pricing placeholders
- `lib/services/llm-provider.ts` - Multi-provider abstraction layer
- `docs/LLM_PROMPT_TEMPLATES.md` - Will need updating to document completed usage tracking
- API routes using executePrompt: `/api/glossary`, `/api/headings`, `/api/summarise`, `/api/semantic-search`, `/api/tweet-thread`, `/api/upload-pdf`, `/api/extract-url`

## Principles, key decisions

- **Work with existing infrastructure**: Use the existing AiCallService and database schema rather than console logging
- **Minimal breaking changes**: Enhance prompt templates internally without changing API route interfaces
- **Standard industry approach**: Hardcode current pricing rates and calculate costs from token usage (per web research)
- **Preserve existing architecture**: Minimal changes to current LLM call patterns
- **Prototype-focused**: Prioritize accuracy and development speed over production concerns
- **Fix what's broken**: Address the broken cost calculation that references non-existent columns

## Actions

### Stage: Fix Broken Cost Calculation
- [ ] Fix cost calculation in `lib/services/database/ai-calls.ts`
  - [ ] Change `input_cost_per_1k` to `input_token_cost` (correct column name)
  - [ ] Change `output_cost_per_1k` to `output_token_cost` (correct column name)
  - [ ] Test that `getDocumentUsageStats` can calculate costs when pricing data exists

### Stage: Add Model Pricing Data
- [ ] Research current pricing for Anthropic Claude and Google Gemini models
  - [ ] Get exact current rates per token (not per 1K tokens) from provider websites
  - [ ] Document source and date of pricing research

- [ ] Populate `ai_models` table with pricing data
  - [ ] Update seed data or create migration to populate `input_token_cost` and `output_token_cost`
  - [ ] Include all models currently used: Claude Haiku/Sonnet/Opus, Gemini Flash/Pro variants
  - [ ] Use cost per individual token (not per 1K) to match database schema

### Stage: Enhance Prompt Template System to Return Usage Metadata
- [ ] Modify `executePromptInternal` in `lib/prompts/types.ts` to capture usage
  - [ ] Change return type from `Promise<string>` to `Promise<{ text: string, usage: Usage, finishReason: string }>`
  - [ ] Extract and return `result.usage` and `result.finishReason` from Vercel AI SDK response
  - [ ] Maintain backward compatibility by having wrapper functions return just text

- [ ] Update `AiCallService.completeCall()` to accept usage metadata
  - [ ] Add optional `usage` parameter to `completeCall` method
  - [ ] Populate `prompt_tokens`, `completion_tokens`, `total_tokens`, `reasoning_tokens` when usage provided
  - [ ] Calculate and store cost using pricing data from `ai_models` table

- [ ] Update all 7 API routes to capture and store usage
  - [ ] `/api/glossary` - extract usage from enhanced executePrompt response
  - [ ] `/api/headings` - extract usage from enhanced executePrompt response
  - [ ] `/api/summarise` - extract usage from enhanced executePrompt response
  - [ ] `/api/semantic-search` - extract usage from enhanced executePrompt response
  - [ ] `/api/tweet-thread` - extract usage from enhanced executePrompt response
  - [ ] `/api/upload-pdf` - extract usage from enhanced executeMultimodalPrompt response
  - [ ] `/api/extract-url` - extract usage from enhanced executeMultimodalPrompt response
  - [ ] Pass usage metadata to `aiCallService.completeCall()`

### Stage: Testing and Verification
- [ ] Write tests for enhanced usage tracking
  - [ ] Unit tests for modified `executePromptInternal` return format
  - [ ] Unit tests for enhanced `AiCallService.completeCall()` with usage
  - [ ] Integration tests for API routes capturing usage metadata
  - [ ] Test cost calculation with sample pricing data

- [ ] Manual testing of token tracking
  - [ ] Test each API route and verify `ai_calls` records populate token fields
  - [ ] Verify cost calculation works when pricing data is present
  - [ ] Test with different models (Claude vs Gemini) and tiers (cheap vs balanced)
  - [ ] Run existing test suite: `npm test`

### Stage: Documentation and Completion
- [ ] Update `docs/LLM_PROMPT_TEMPLATES.md` to document completed usage tracking
  - [ ] Document that all LLM calls now track token usage and costs
  - [ ] Include examples of how to query usage data from `ai_calls` table
  - [ ] Note pricing data storage in `ai_models` table

- [ ] Review implementation with user
  - [ ] Demonstrate token tracking in database for all API routes
  - [ ] Show cost calculation working with populated pricing data
  - [ ] Confirm all 7 prompt-template routes now track usage

- [ ] Use subagent to commit changes following `docs/GIT_COMMITS.md`
  - [ ] Descriptive commit message covering usage tracking completion
  - [ ] Include all modified files: prompt templates, API routes, AiCallService, pricing data

- [ ] Move this document to `planning/finished/` and commit

## Appendix

### Current Implementation Status

**✅ Chat API** (`app/api/chat/route.ts`):
- Already tracks token usage and stores in `ai_calls` table
- Captures `result.usage.promptTokens`, `result.usage.completionTokens`, etc.
- Creates AI call records with complete usage metadata

**❌ Prompt Template APIs** (7 routes):
- `/api/glossary`, `/api/headings`, `/api/summarise`, `/api/semantic-search`, `/api/tweet-thread`, `/api/upload-pdf`, `/api/extract-url`
- All use `executePrompt` or `executeMultimodalPrompt` which only return text
- Create AI call records but token fields remain NULL
- Usage metadata is available from Vercel AI SDK but not captured

**🔧 Database Infrastructure** (already exists):
- `ai_calls` table with token fields: `prompt_tokens`, `completion_tokens`, `total_tokens`, `reasoning_tokens`
- `ai_models` table with pricing placeholders: `input_token_cost`, `output_token_cost` (currently NULL)
- `AiCallService` with usage tracking methods (needs enhancement to accept usage metadata)

### Token Usage Metadata Structure (from Vercel AI SDK)
```typescript
interface Usage {
  promptTokens: number      // Input tokens sent to model
  completionTokens: number  // Output tokens generated by model  
  totalTokens: number       // promptTokens + completionTokens
}

type FinishReason = 'stop' | 'length' | 'content-filter'
```

### Enhanced Return Types for Prompt Templates
```typescript
// Current (returns only text):
executePrompt(template: string, data: any): Promise<string>

// Enhanced (returns text + usage metadata):
executePrompt(template: string, data: any): Promise<{
  text: string
  usage: Usage
  finishReason: string
}>
```

### Existing Database Schema

**`ai_calls` table** (already implemented):
```sql
-- Core tracking fields
id, created_at, updated_at
prompt_type VARCHAR(50)        -- 'chat', 'summarise', 'glossary', etc.
model_id VARCHAR(100)          -- 'claude-3-5-haiku', 'gemini-1.5-flash', etc.
provider VARCHAR(50)           -- 'anthropic', 'google'

-- Token usage fields (currently NULL for prompt template routes)
prompt_tokens INTEGER
completion_tokens INTEGER  
total_tokens INTEGER
reasoning_tokens INTEGER       -- For Anthropic thinking mode

-- Performance and result tracking
latency_ms INTEGER
finish_reason VARCHAR(20)
request_data JSONB
response_data JSONB
extra JSONB
extra_usage JSONB
```

**`ai_models` table** (pricing placeholders):
```sql
id, model_id, provider, display_name
input_token_cost DECIMAL(10,6)     -- Currently NULL, needs population
output_token_cost DECIMAL(10,6)    -- Currently NULL, needs population
context_window INTEGER
max_output_tokens INTEGER
```

### Current Pricing Research (January 2025)

**Industry Standard Approach** (from web research):
- Vercel AI SDK does not provide pricing information automatically
- Standard practice is to hardcode current pricing rates and calculate costs from token usage
- Most developers store pricing in configuration and update periodically

**Current Anthropic Pricing** (to be verified and updated):
- Claude 3.5 Haiku: Input ~$0.25/1M tokens, Output ~$1.25/1M tokens  
- Claude 3.5 Sonnet: Input ~$3/1M tokens, Output ~$15/1M tokens
- Claude 3 Opus: Input ~$15/1M tokens, Output ~$75/1M tokens

**Google Gemini Pricing** (to be researched):
- Gemini 1.5/2.0 Flash: TBD
- Gemini 1.5/2.5 Pro: TBD

**Database Storage**: Convert to per-token rates (divide by 1M) for `input_token_cost`/`output_token_cost` columns

### Broken Cost Calculation Fix

Current code in `ai-calls.ts:253-258` references non-existent columns:
```typescript
// BROKEN - these columns don't exist:
cost = (call.prompt_tokens * (model.input_cost_per_1k || 0) / 1000) +
       (call.completion_tokens * (model.output_cost_per_1k || 0) / 1000)

// FIXED - use actual column names:
cost = (call.prompt_tokens * (model.input_token_cost || 0)) +
       (call.completion_tokens * (model.output_token_cost || 0))
```