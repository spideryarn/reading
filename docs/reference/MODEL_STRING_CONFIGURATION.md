# Model String Configuration Reference

> ✅ **CURRENT** - This documentation reflects the model string system implemented in June 2025.

## Overview

The Spideryarn Reading application uses a **model string** approach for AI model configuration, replacing the previous UUID-based database lookup system. This provides better performance, easier debugging, and simplified maintenance.

**Key Benefits:**
- **Performance**: Eliminates database lookups on every AI call
- **Debugging**: Human-readable model identifiers in SQL queries and logs
- **Maintenance**: All model configuration in version-controlled files
- **Flexibility**: Easy to add new models without database migrations

📖 **Related Documentation:**
- `docs/reference/DATABASE_SCHEMA.md` - Database schema with model_string fields
- `docs/reference/LLM_PROMPT_TEMPLATES.md` - AI/LLM call patterns using model strings
- `planning/250614a_llm_model_management_simplification.md` - Migration planning and implementation

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
google:gemini-2.0-flash:latest
google:gemini-1.5-pro:latest
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
  'google-cheap': 'google:gemini-2.0-flash:latest',
  // ... more tiers
}
```

**Hybrid Support Functions:**
- `getModelStringFromEnvironment()`: Resolves both tier keys and model strings
- `getModelForAICall()`: Returns model string + config for API calls

## Environment Variable Configuration

### `LLM_MODEL` Environment Variable

**Purpose**: Set the default model for the application

**Supported Formats:**
1. **Tier Key**: `LLM_MODEL=anthropic-cheap`
2. **Model String**: `LLM_MODEL=anthropic:claude-3-5-haiku:20241022`

**Examples:**
```bash
# Using tier key (recommended for convenience)
LLM_MODEL=anthropic-cheap

# Using direct model string (recommended for precision)
LLM_MODEL=anthropic:claude-sonnet-4:20250514:thinking

# Using Google models
LLM_MODEL=google:gemini-2.0-flash:latest
```

**Resolution Order:**
1. Check if value is a tier key in `MODEL_TIERS`
2. If tier key found, resolve to model string
3. If not tier key, validate as model string directly
4. If validation fails, throw error

**Fallback**: Defaults to `anthropic-balanced` if not set

### Development vs Production

**Development** (`.env.local`):
```bash
# Use cheaper models for development
LLM_MODEL=anthropic-cheap
# or
LLM_MODEL=google:gemini-2.0-flash:latest
```

**Production** (deployed environment):
```bash
# Use balanced models for production
LLM_MODEL=anthropic-balanced
# or
LLM_MODEL=anthropic:claude-sonnet-4:20250514
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

### 2. Add Tier Key (Optional)

Add to `lib/config.ts` if you want a convenient tier key:

```typescript
export const MODEL_TIERS = {
  // ... existing tiers
  'openai-balanced': 'openai:gpt-4:latest'
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
# Test with tier key
LLM_MODEL=openai-balanced npm run dev

# Test with direct model string
LLM_MODEL=openai:gpt-4:latest npm run dev
```

## Migration Notes

### From Legacy System

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

### Backwards Compatibility

During transition, both approaches work:
- Environment variables accept tier keys or model strings
- Model metadata available through both systems
- Database stores model_string directly

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

## Future Enhancements

**Planned Features:**
- Dynamic model pricing updates
- Model capability detection
- Usage analytics by model
- Cost optimization recommendations

**Potential Extensions:**
- Model versioning and deprecation handling
- Regional model selection
- Custom model configurations per user
- Model performance benchmarking