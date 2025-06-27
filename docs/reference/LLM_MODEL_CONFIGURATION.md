# LLM Model Configuration Reference

> ✅ **CURRENT** - This documentation reflects the model string system implemented in June 2025.

## Overview

The Spideryarn Reading application uses a **model string** approach for AI model configuration, replacing the previous tier-based UUID system. This provides better performance, easier debugging, and simplified maintenance.

**Key Benefits:**
- **Performance**: Eliminates database lookups on every AI call
- **Debugging**: Human-readable model identifiers in SQL queries and logs
- **Maintenance**: All model configuration in version-controlled files
- **Flexibility**: Easy to add new models without database migrations

📖 **Related Documentation:**
- `docs/reference/DATABASE_SCHEMA.md` - Database schema with model_string fields
- `docs/reference/LLM_PROMPT_TEMPLATES.md` - AI/LLM call patterns using model strings
- `docs/reference/LLM_PROMPT_CACHING.md` - Prompt caching strategies for cost optimization across providers
- `planning/finished/250614a_llm_model_management_simplification.md` - Migration planning and implementation

## Model String Format

**Format**: `provider:model:version[:thinking]`

**Components:**
- `provider`: AI provider (anthropic, google, openai, etc.)
- `model`: Model identifier WITHOUT version suffix
- `version`: Version identifier (date-based, latest, preview, etc.)
- `thinking`: Optional suffix for reasoning/thinking mode

**Examples:**
```
anthropic:claude-3-5-haiku:20241022
anthropic:claude-sonnet-4:20250514
anthropic:claude-sonnet-4:20250514:thinking
google:gemini-2.5-flash:latest
google:gemini-2.5-pro:latest
```

**Validation:**
- Enforced at database level with check constraint
- Regex pattern: `^[a-z]+:[a-z0-9\-\.]+:[a-z0-9\-\.]+(:thinking)?$`
- Case-sensitive (all lowercase)

## Configuration Files

### Primary Configuration: `lib/config/models.ts`

Contains all model metadata and configuration:

```typescript
export const MODELS = {
  'anthropic:claude-3-5-haiku:20241022': {
    provider: 'anthropic',
    modelId: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    description: 'Fast and cost-effective model for high-volume tasks',
    contextWindow: 200000,
    maxOutputTokens: 8192,
    pricing: {
      inputPer1M: 1.00,
      outputPer1M: 5.00
    },
    capabilities: {
      reasoning: false,
      multimodal: false,
      functionCalling: true
    }
  },
  // ... more models
}
```

**Key Functions:**
- `parseModelString(modelString)`: Parse and validate model string format
- `getModelConfig(modelString)`: Get metadata for a model string
- `getAvailableModels()`: List all configured models
- `getModelsByProvider(provider)`: Filter models by provider

### Tier Key Compatibility: `lib/config.ts`

Maintains backwards compatibility with tier-based configuration:

```typescript
export const MODEL_TIERS = {
  'anthropic-cheap': 'anthropic:claude-3-5-haiku:20241022',
  'anthropic-balanced': 'anthropic:claude-sonnet-4:20250514',
  'anthropic-balanced-thinking': 'anthropic:claude-sonnet-4:20250514:thinking',
  'google-cheap': 'google:gemini-2.5-flash:latest',
  // ... more tiers
}
```

**Hybrid Support Functions:**
- `getModelStringFromEnvironment()`: Resolves both tier keys and model strings
- `getModelForAICall()`: Returns model string + config for API calls

## Environment Variable Configuration

### `LLM_MODEL` Environment Variable

**Purpose**: Set the default model for the application

**Supported Format:**
- **Model String**: `LLM_MODEL=provider:model:version[:thinking]`

**Examples:**
```bash
# Anthropic models
LLM_MODEL=anthropic:claude-3-5-haiku:20241022
LLM_MODEL=anthropic:claude-sonnet-4:20250514:thinking

# Google models
LLM_MODEL=google:gemini-2.5-flash:latest
LLM_MODEL=google:gemini-2.5-pro:latest
```

**Validation:**
1. Parse model string format using `parseModelString()`
2. Validate against available models in `MODEL_DEFINITIONS`
3. If validation fails, throw descriptive error

**Fallback**: Defaults to `anthropic:claude-sonnet-4:20250514` if not set

### Development vs Production

**Development** (`.env.local`):
```bash
# Use cheaper models for development
LLM_MODEL=anthropic:claude-3-5-haiku:20241022
# or
LLM_MODEL=google:gemini-2.0-flash:latest
```

**Production** (deployed environment):
```bash
# Use balanced models for production
LLM_MODEL=anthropic:claude-sonnet-4:20250514
# or
LLM_MODEL=google:gemini-2.5-pro:latest
```

## API Usage Patterns

### Standard AI Call Pattern

All API routes now use this consistent pattern:

```typescript
import { getModelForAICall } from '@/lib/config'
import { AiCallService } from '@/lib/services/database/ai-calls'

// Get model configuration
const { modelString, config: modelConfig } = getModelForAICall()

// Create AI call tracking
const aiCall = await AiCallService.startCallWithModelString({
  modelString,
  documentId,
  promptType: 'summarise',
  promptTemplate: 'document-summary',
  promptInput: content,
  createdBy: userId
})

// Make API call using Vercel AI SDK
const result = await generateText({
  model: anthropic(modelConfig.modelId),
  prompt: content,
  maxTokens: modelConfig.maxOutputTokens
})

// Complete AI call tracking
await AiCallService.completeCall(aiCall.id, {
  responseText: result.text,
  promptTokens: result.usage.promptTokens,
  completionTokens: result.usage.completionTokens,
  totalTokens: result.usage.totalTokens,
  finishReason: result.finishReason
})
```

### Model-Specific Handling

```typescript
import { parseModelString, getModelConfig } from '@/lib/config/models'

const { modelString } = getModelForAICall()
const parsed = parseModelString(modelString)

// Provider-specific logic
if (parsed.provider === 'anthropic') {
  // Use Anthropic SDK
  const model = anthropic(config.modelId)
} else if (parsed.provider === 'google') {
  // Use Google SDK
  const model = google(config.modelId)
}

// Thinking mode handling
if (parsed.thinking) {
  // Enable reasoning tokens for supported models
  options.reasoning = true
}
```

## Database Integration

### AI Calls Table

Model strings are stored directly in the `ai_calls` table:

```sql
-- Query AI calls by model
SELECT * FROM ai_calls 
WHERE model_string = 'anthropic:claude-sonnet-4:20250514';

-- Query by provider
SELECT * FROM ai_calls 
WHERE model_string LIKE 'anthropic:%';

-- Query thinking mode calls
SELECT * FROM ai_calls 
WHERE model_string LIKE '%:thinking';
```

### Performance

- **Index**: `idx_ai_calls_model_string` on model_string column
- **No Joins**: Direct string storage eliminates model table joins
- **Human Readable**: SQL queries show actual model names

## Available Models Reference

### Current Models

| Model String | Name | Input Price* | Output Price* | Context | Use Case |
|--------------|------|--------------|---------------|---------|----------|
| `google:gemini-2.5-flash:latest` | Gemini 2.0 Flash | TBA** | TBA** | 1M tokens | **Development** - Fast, large context |
| `google:gemini-2.5-pro:latest` | Gemini 2.5 Pro | $1.25/M† | $10/M† | 1M tokens | Production alternative |
| `anthropic:claude-3-5-haiku:20241022` | Claude 3.5 Haiku | $0.80/M | $4/M | 200K tokens | Development, simple tasks |
| `anthropic:claude-sonnet-4:20250514` | Claude Sonnet 4 | $3/M | $15/M | 200K tokens | **Production** - Reliable |
| `anthropic:claude-sonnet-4:20250514:thinking` | Claude Sonnet 4 (Thinking) | $3/M | $15/M | 200K tokens | **Complex Analysis** - Advanced reasoning |
| `anthropic:claude-opus-4:latest` | Claude Opus 4 | $15/M | $75/M | 200K tokens | Maximum quality |

*Per million tokens  
**Gemini Flash pricing TBA  
†Higher pricing ($2.50/M input, $15/M output) for prompts >200K tokens


## Adding New Models

### 1. Add Model Configuration

Add to `lib/config/models.ts`:

```typescript
export const MODELS = {
  // ... existing models
  'openai:gpt-4:latest': {
    provider: 'openai',
    modelId: 'gpt-4',
    name: 'GPT-4',
    description: 'OpenAI GPT-4 model',
    contextWindow: 8192,
    maxOutputTokens: 4096,
    pricing: {
      inputPer1M: 30.00,
      outputPer1M: 60.00
    },
    capabilities: {
      reasoning: false,
      multimodal: true,
      functionCalling: true
    }
  }
}
```


### 3. Update Provider Support

Ensure the provider is supported in API call logic:

```typescript
// In API routes, add provider handling
if (parsed.provider === 'openai') {
  const model = openai(config.modelId)
}
```

### 4. Test Configuration

```bash
# Test with direct model string
LLM_MODEL=openai:gpt-4:latest npm run dev
```

## Migration from Legacy System

### Migration Overview

**Legacy System** (Deprecated as of June 2025):
- Tier keys like `anthropic-cheap`, `google-balanced`
- UUID-based model lookups in `ai_models` database table
- Complex resolution through database queries

**Current System**:
- Direct model strings like `anthropic:claude-3-5-haiku:20241022`
- Configuration-based model metadata in `lib/config/models.ts`
- No database dependencies for model resolution

### Code Migration Examples

**Before** (UUID-based):
```typescript
const tierKey = process.env.LLM_MODEL as ProviderTierKey
const modelConfig = getModelConfig(tierKey)
const modelVersion = getModelVersion(tierKey)

const aiCall = await AiCallService.create({
  modelId: modelUuid,  // UUID lookup required
  // ...
})
```

**After** (Model string):
```typescript
const { modelString, config } = getModelForAICall()

const aiCall = await AiCallService.startCallWithModelString({
  modelString,  // Direct string storage
  // ...
})
```

### Environment Variable Migration

```bash
# Old (still works for backwards compatibility)
LLM_MODEL=anthropic-cheap

# New (recommended)
LLM_MODEL=anthropic:claude-3-5-haiku:20241022
```

### Why the Migration Was Necessary

The legacy UUID-based system had several issues:
- **Performance Impact**: Required database lookups on every AI call
- **Debugging Difficulty**: Opaque UUIDs in database made troubleshooting hard
- **Complex Maintenance**: Model metadata split between config and database
- **Difficult Extension**: Adding new models required database migrations

The new model string system eliminates these issues while maintaining backwards compatibility during transition.

## Troubleshooting

### Common Issues

**Error: Invalid model string format**
```
Solution: Ensure format is provider:model:version[:thinking]
Valid: anthropic:claude-sonnet-4:20250514
Invalid: claude-sonnet-4 (missing provider and version)
```

**Error: Model not found in configuration**
```
Solution: Add model to MODELS in lib/config/models.ts
Or use a tier key that maps to existing model
```

**Error: Provider not supported**
```
Solution: Add provider handling in API route logic
Ensure provider SDK is installed and configured
```

### Debugging

**Check current model configuration:**
```typescript
import { getModelForAICall } from '@/lib/config'
const { modelString, config } = getModelForAICall()
console.log('Model:', modelString, config)
```

**Check environment variable resolution:**
```typescript
import { getModelStringFromEnvironment } from '@/lib/config'
console.log('Resolved model:', getModelStringFromEnvironment())
```

**Query AI calls by model:**
```sql
SELECT model_string, COUNT(*) 
FROM ai_calls 
GROUP BY model_string 
ORDER BY COUNT(*) DESC;
```

## Cost Optimization

### Prompt Caching

For high-volume operations or repeated document analysis, consider implementing prompt caching to reduce costs:

- **Anthropic Claude**: 90% cost savings with manual cache configuration
- **Google Gemini**: 75% savings with automatic caching (2.5 models)
- **OpenAI**: 50% savings with automatic caching

**See**: `docs/reference/LLM_PROMPT_CACHING.md` for comprehensive implementation guidance, provider comparison, and cost analysis examples.

### Development vs Production Cost Strategy

**Development Environment**:
```bash
# Use cost-effective models for development
LLM_MODEL=anthropic:claude-3-5-haiku:20241022
LLM_MODEL=google:gemini-2.5-flash:latest
```

**Production Environment**:
```bash
# Balance quality and cost for production
LLM_MODEL=anthropic:claude-sonnet-4:20250514
# With caching enabled for repeated operations
```

## Future Enhancements

**Planned Features:**
- Dynamic model pricing updates
- Model capability detection
- Usage analytics by model
- Cost optimization recommendations
- Prompt caching integration

**Potential Extensions:**
- Model versioning and deprecation handling
- Regional model selection
- Custom model configurations per user
- Model performance benchmarking