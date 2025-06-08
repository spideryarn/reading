# LLM Models Reference

## Architecture

**Tier Management**: Model tiers are defined in `lib/config.ts` as the single source of truth
**Database Storage**: Models are stored in `ai_models` table for tracking metadata only
**Resolution**: API routes resolve tier keys to provider+modelId using config, then look up model UUID for tracking

## Available Models

| Key | Model | Input Price* | Output Price* | Context | Use Case |
|-----|-------|--------------|---------------|---------|----------|
| `google-cheap` | Gemini 2.0 Flash | TBA** | TBA** | 1M tokens | **Development** - Fast, large context |
| `google-balanced` | Gemini 2.5 Pro | $1.25/M† | $10/M† | 1M tokens | Production alternative |
| `google-expensive` | Gemini 2.5 Pro | $1.25/M† | $10/M† | 1M tokens | Same as balanced |
| `anthropic-cheap` | Claude 3.5 Haiku | $0.80/M | $4/M | 200K tokens | Development, simple tasks |
| `anthropic-balanced` | Claude Sonnet 4 | $3/M | $15/M | 200K tokens | **Production** - Reliable |
| `anthropic-balanced-thinking` | Claude Sonnet 4 (Thinking) | $3/M | $15/M | 200K tokens | **Complex Analysis** - Advanced reasoning |
| `anthropic-expensive` | Claude Opus 4 | $15/M | $75/M | 200K tokens | Maximum quality |

*Per million tokens  
**Gemini Flash pricing TBA  
†Higher pricing ($2.50/M input, $15/M output) for prompts >200K tokens

## Quick Comparison

**Context Windows:**
- Gemini 2.5: 1M tokens (5x larger)
- Claude 4: 200K tokens

**Recommendations:**
- **Development**: `google-cheap` (large context, cost-effective)
- **Production**: `anthropic-balanced` (proven reliability)
- **Complex Analysis**: `anthropic-balanced-thinking` (advanced reasoning tasks)

## API Keys Required

see `.env.example`

## Switching Models

```bash
LLM_MODEL=google-cheap npm run dev
LLM_MODEL=anthropic-balanced-thinking npm run dev
```

The application automatically handles provider selection, authentication, and request formatting.

## Implementation Details

### Config-Based Resolution
```typescript
// In API routes (e.g., app/api/glossary/route.ts)
import { getModelConfig, AI_CONFIG } from '@/lib/config'

const tierKey = (process.env.LLM_MODEL || AI_CONFIG.DEFAULT_MODEL) as any
const modelConfig = getModelConfig(tierKey)

const aiCall = await aiCallService.startCall({
  documentId,
  provider: modelConfig.provider,    // 'anthropic' | 'google'
  modelId: modelConfig.modelId,      // 'claude-sonnet-4-20250514'
  prompt_type: 'glossary',
  input_data: { /* ... */ }
})
```

### Database Lookup
```typescript
// In AiCallService.startCall()
const modelUuid = await this.getModelUuidByProviderAndId(
  options.provider, 
  options.modelId
)
// Uses: WHERE provider = 'anthropic' AND model_id = 'claude-sonnet-4-20250514'
```

This architecture eliminates redundancy between config and database, follows the principle that configuration belongs in code, and makes tier management much simpler.

## Template Architecture Guidelines

### Single Template per Task (Recommended)

**DO**: Use one template with dynamic provider selection:

```typescript
// ✅ Good: Single template with provider selection
export function createUrlToHtmlPrompt(provider: 'claude' | 'gemini' = 'claude') {
  const modelTier = provider === 'gemini' ? 'google-balanced' : 'anthropic-balanced'
  
  return loadMultimodalPromptTemplateFromCaller(
    'url-to-html.njk',
    urlToHtmlPromptInputSchema,
    {
      model: modelTier,
      temperature: 0,
      maxTokens: 64000,
    }
  )
}
```

**DON'T**: Create separate template files per provider:

```typescript
// ❌ Bad: Separate files for each provider
import { urlToHtmlPrompt } from '@/lib/prompts/templates/url-to-html'
import { urlToHtmlGeminiPrompt } from '@/lib/prompts/templates/url-to-html-gemini'

// This creates unnecessary duplication and maintenance overhead
```

### When Provider-Specific Templates Are Justified

Only create separate templates when there are **meaningful functional differences**:

1. **Different capabilities**: Provider A supports feature X, Provider B doesn't
2. **Different optimal prompting patterns**: Substantially different instruction styles needed
3. **Different input/output formats**: Provider-specific data handling requirements

**Not justified** for:
- Minor wording preferences
- Cosmetic formatting differences  
- Token limit variations (handle in config)
- Default model selection (handle in config)

### Token Limits

Use high token limits (64K) for content transcription tasks:
- URL extraction: Complex webpages need room for long content
- PDF conversion: Academic papers can be lengthy
- Document processing: Better to have headroom than truncation

Lower limits (8K) only for:
- Simple classification tasks
- Short content generation
- Development/testing scenarios

## Thinking Mode

Anthropic's Sonnet 4 supports a "thinking mode" that enables advanced reasoning capabilities. The model shows its reasoning process internally before generating the final response.

### When to Use Thinking Mode

Use `anthropic-balanced-thinking` for:
- **Complex Document Analysis**: Multi-step reasoning about document structure, themes, and connections
- **Summarisation**: Hierarchical content analysis requiring deep understanding
- **Glossary Generation**: Identifying and explaining key concepts with contextual nuance
- **Advanced Chatbot Responses**: Complex user questions requiring detailed analysis

### Usage in Prompt Templates

Enable thinking mode in prompt template configurations:

```typescript
const summaryTemplate = loadPromptTemplateFromCaller(
  'summarise.njk',
  summarySchema,
  { 
    model: 'anthropic-balanced',
    thinking: true  // Automatically upgrades to anthropic-balanced-thinking
  }
)
```

### Performance Considerations

- **Slightly Higher Latency**: Thinking process adds processing time
- **Same Cost**: Uses Claude Sonnet 4 pricing structure  
- **Better Quality**: Improved reasoning for complex tasks
- **Debugging**: Thinking process can be valuable for understanding model behaviour

### Environment Variable Override

```bash
# Force thinking mode for all anthropic-balanced calls
LLM_MODEL=anthropic-balanced-thinking npm run dev
```
