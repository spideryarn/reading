# LLM Token Usage Tracking and Logging

Comprehensive tracking system for monitoring AI/LLM token usage, costs, and performance across all API calls in the Spideryarn Reading application.

## See also

- `docs/reference/LLM_PROMPT_TEMPLATES.md` - Prompt template system with usage tracking functions
- `docs/reference/LLM_PROMPT_CACHING.md` - Prompt caching strategies for cost optimization (90%, 75%, 50% savings across providers)
- `docs/reference/DATABASE_SCHEMA.md` - Database tables: `ai_calls` and `ai_models` 
- `docs/reference/LOGGING_BEST_PRACTICES.md` - Pino logging patterns for AI operations
- `lib/services/database/ai-calls.ts` - AiCallService implementation with usage storage
- `lib/prompts/types.ts` - Enhanced prompt execution functions returning usage metadata
- `docs/planning/finished/250530i_llm_token_usage_tracking.md` - Implementation planning and decisions

## Overview

The system tracks every LLM call with:
- **Token counts**: Input, output, total, and reasoning tokens
- **Cost calculation**: Automatic pricing based on model and usage
- **Performance metrics**: Latency, finish reason, success/failure tracking
- **Model attribution**: Links to specific models and versions
- **Request tracing**: Correlation IDs for debugging

## Architecture

### Database Schema

**`ai_calls` table** - Comprehensive AI call tracking:
```typescript
{
  id: string                    // UUID primary key
  created_at: timestamp         // Call initiation time
  updated_at: timestamp         // Last update time
  document_id?: string          // Optional document context
  user_id?: string              // User making the request
  
  // Model identification
  provider: string              // 'anthropic', 'google', 'openai'
  model_id: string              // 'claude-3-5-haiku', 'gemini-2.0-flash'
  
  // Operation tracking
  prompt_type: string           // 'chat', 'summarise', 'glossary', etc.
  prompt_template?: string      // Template name used
  status: string                // 'pending', 'success', 'failed'
  
  // Token usage (from Vercel AI SDK)
  prompt_tokens?: number        // Input tokens
  completion_tokens?: number    // Output tokens  
  total_tokens?: number         // Sum of prompt + completion
  reasoning_tokens?: number     // Claude thinking mode tokens
  
  // Performance & debugging
  latency_ms?: number           // Response time
  finish_reason?: string        // 'stop', 'length', 'content-filter'
  error_message?: string        // Failure details
  
  // Flexible metadata
  input_data?: jsonb            // Request context
  output_data?: jsonb           // Response metadata
  extra?: jsonb                 // Provider-specific data
  extra_usage?: jsonb           // Additional usage metrics
}
```

**`ai_models` table** - Model pricing and capabilities:
```typescript
{
  id: string                    // UUID primary key
  provider: string              // AI provider name
  model_id: string              // Model identifier
  version: string               // Model version
  
  // Pricing (per individual token)
  input_token_cost?: decimal    // Cost per input token
  output_token_cost?: decimal   // Cost per output token
  
  // Capabilities
  context_window?: number       // Max input tokens
  max_output_tokens?: number    // Max generation length
  supports_thinking?: boolean   // Reasoning token support
  
  // Metadata
  display_name?: string         // Human-readable name
  extra?: jsonb                 // Provider-specific capabilities
}
```

### Prompt Template Integration

Enhanced prompt functions return usage metadata:

```typescript
// Standard text prompt with usage tracking
const result = await executePromptWithUsage(template, data)
// Returns: { text: string, usage: PromptUsage, finishReason: string }

// Multimodal prompt with usage tracking  
const result = await executeMultimodalPromptWithUsage(template, data)
// Returns: { text: string, usage: PromptUsage, finishReason: string }

// PromptUsage structure (from Vercel AI SDK)
interface PromptUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  reasoningTokens?: number
}
```

## Implementation Patterns

### API Route Pattern

Standard pattern for API routes with full tracking:

```typescript
import { executePromptWithUsage } from '@/lib/prompts/types'
import { AiCallService } from '@/lib/services/database/ai-calls'
import { createRequestLogger, generateCorrelationId, logAIOperation } from '@/lib/services/logger'

export async function POST(request: NextRequest) {
  // Initialize tracking
  const correlationId = generateCorrelationId()
  const requestLogger = createRequestLogger('/api/my-feature', correlationId)
  
  try {
    // Create AI call record
    const aiCall = await aiCallService.startCall({
      documentId: body.documentId,
      provider: modelConfig.provider,
      modelId: modelConfig.modelId,
      version: modelConfig.version,  // Required for model lookup
      prompt_type: 'my-feature',
      input_data: { content_length: body.content?.length }
    })
    
    // Execute with usage tracking
    const result = await executePromptWithUsage(template, data)
    
    // Store usage metadata
    await aiCallService.completeCall(aiCall.id, {
      output_data: { result_length: result.text.length },
      usage: result.usage,
      finishReason: result.finishReason
    })
    
    // Log AI operation (Pino structured logging)
    logAIOperation('my-feature', {
      modelProvider: modelConfig.provider,
      tokensUsed: result.usage.totalTokens,
      userId: user.id,
      documentId,
      correlationId
    }, 'success')
    
    return NextResponse.json({ result: result.text })
  } catch (error) {
    // Error handling with logging
  }
}
```

### Cost Calculation

Costs are automatically calculated when pricing data exists:

```typescript
// Query document AI costs
const stats = await aiCallService.getDocumentUsageStats(documentId)
// Returns: { callCount, totalTokens, totalCost, breakdown by operation }

// SQL for manual cost queries
SELECT 
  SUM(ac.prompt_tokens * am.input_token_cost) +
  SUM(ac.completion_tokens * am.output_token_cost) as total_cost_usd
FROM ai_calls ac
JOIN ai_models am ON 
  am.model_id = ac.model_id AND 
  am.provider = ac.provider
WHERE ac.document_id = ?
```

## Logging Integration

AI operations are logged with Pino structured logging:

```typescript
// Standard AI operation logging
import { logAIOperation } from '@/lib/services/logger'

logAIOperation('content-extraction', {
  modelProvider: 'anthropic',
  tokensUsed: result.usage.totalTokens,
  cost: calculatedCost,
  userId: user.id,
  documentId: document.id,
  correlationId
}, 'success')

// Detailed token breakdown
aiLogger.info({
  operation: 'summarisation',
  provider: modelConfig.provider,
  model: modelConfig.modelId,
  promptTokens: result.usage.promptTokens,
  completionTokens: result.usage.completionTokens,
  totalTokens: result.usage.totalTokens,
  reasoningTokens: result.usage.reasoningTokens,
  duration: timer.end(),
  correlationId
}, 'AI summarisation completed')
```

## Current Model Pricing

Pricing data populated in `ai_models` table (June 2025):

**Anthropic Claude**:
- Haiku 3.5: $0.80/$4.00 per million tokens (input/output)
- Sonnet 4: $3.00/$15.00 per million tokens
- Opus 4: $15.00/$75.00 per million tokens

**Google Gemini**:
- Flash 2.0: $0.10/$0.40 per million tokens
- Pro 2.5: $1.25/$10.00 per million tokens (≤200K context)

## API Routes Using Token Tracking

All prompt-based routes track usage:
- `/api/chat` - Chat conversations (via Vercel AI SDK streaming)
- `/api/summarise` - Document summarisation  
- `/api/glossary` - Glossary extraction
- `/api/headings` - AI heading generation
- `/api/semantic-search` - Vector search
- `/api/tweet-thread` - Thread generation
- `/api/upload-pdf` - PDF extraction
- `/api/extract-url` - URL content extraction

## Querying Usage Data

### Document-level usage
```typescript
const stats = await aiCallService.getDocumentUsageStats(documentId)
// Returns aggregated stats with cost breakdown
```

### User-level analytics
```sql
SELECT 
  u.email,
  COUNT(ac.id) as total_calls,
  SUM(ac.total_tokens) as total_tokens,
  ROUND(SUM(
    ac.prompt_tokens * am.input_token_cost +
    ac.completion_tokens * am.output_token_cost
  ), 4) as total_cost_usd
FROM ai_calls ac
JOIN users u ON u.id = ac.user_id
JOIN ai_models am ON am.id = ac.model_id
GROUP BY u.id, u.email
ORDER BY total_cost_usd DESC
```

### Operation performance
```sql
SELECT 
  prompt_type,
  provider,
  model_id,
  COUNT(*) as call_count,
  AVG(latency_ms) as avg_latency,
  AVG(total_tokens) as avg_tokens,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failures
FROM ai_calls
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY prompt_type, provider, model_id
ORDER BY call_count DESC
```

## Troubleshooting

### Common Issues

**"Model not found" errors**:
- Ensure `version` parameter is included in `startCall()`
- Check model exists in `ai_models` table with matching provider+model_id+version

**Missing token counts**:
- Verify using `executePromptWithUsage` not `executePrompt`
- Check `completeCall()` is passed the usage object

**Zero costs calculated**:
- Confirm pricing data exists in `ai_models` table
- Check token counts are being stored in `ai_calls`

### Debugging Queries

```sql
-- Check recent AI calls with missing data
SELECT id, created_at, provider, model_id, prompt_type,
       prompt_tokens, completion_tokens, total_tokens
FROM ai_calls  
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND (prompt_tokens IS NULL OR total_tokens = 0)
ORDER BY created_at DESC;

-- Verify model pricing
SELECT provider, model_id, version,
       input_token_cost, output_token_cost
FROM ai_models
WHERE provider IN ('anthropic', 'google');
```

## Cost Optimization with Caching

### Prompt Caching Integration

Token tracking works with prompt caching for significant cost reductions:

- **Anthropic Claude**: Track `cache_creation_input_tokens` and `cache_read_input_tokens` for 90% savings on cached tokens
- **Google Gemini**: Monitor implicit caching benefits (75% reduction) on 2.5 models 
- **OpenAI**: Automatic caching provides 50% savings on repeated tokens

**Enhanced Usage Tracking for Caching**:
```typescript
// Monitor cache performance
const cacheMetrics = {
  cache_creation_input_tokens: response.usage?.cache_creation_input_tokens,
  cache_read_input_tokens: response.usage?.cache_read_input_tokens,
  cache_hit_rate: calculateCacheHitRate(response.usage)
}

logAIOperation(logger, 'document-analysis', {
  model: 'claude-3-5-sonnet',
  tokens: response.usage,
  cache: cacheMetrics,
  cost: calculateCostWithCaching(response.usage, modelPricing)
})
```

**See**: `docs/reference/LLM_PROMPT_CACHING.md` for comprehensive caching implementation and cost analysis.

## Future Enhancements

- **Streaming token tracking**: Progressive usage updates for long responses
- **Budget alerts**: Notify when usage exceeds thresholds
- **Usage dashboards**: Visual analytics for token consumption
- **Cache-aware pricing**: Reduced costs for cached responses (in progress)
- **Batch operation tracking**: Aggregate costs for multi-step workflows