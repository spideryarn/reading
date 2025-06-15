# LLM Models Reference

> ⚠️ **DEPRECATED** - This document is deprecated as of June 2025. 
> 
> **See instead**: `docs/reference/MODEL_STRING_CONFIGURATION.md` for current model configuration approach.

## Migration Notice

This document described the legacy tier-based model system that has been replaced with a **model string** approach.

**Old System** (Deprecated):
- Tier keys like `anthropic-cheap`, `google-balanced`
- UUID-based model lookups in `ai_models` database table
- Complex resolution through database queries

**New System** (Current):
- Direct model strings like `anthropic:claude-3-5-haiku:20241022`
- Configuration-based model metadata in `lib/config/models.ts`
- No database dependencies for model resolution

## Quick Migration Guide

**Environment Variables:**
```bash
# Old (still works for backwards compatibility)
LLM_MODEL=anthropic-cheap

# New (recommended)
LLM_MODEL=anthropic:claude-3-5-haiku:20241022
```

**API Usage:**
```typescript
// Old
const tierKey = process.env.LLM_MODEL as ProviderTierKey
const modelConfig = getModelConfig(tierKey)
const modelVersion = getModelVersion(tierKey)

// New
const { modelString, config } = getModelForAICall()
```

## Available Models

The current model configuration is maintained in `lib/config/models.ts`. For up-to-date model information, pricing, and usage patterns, see:

📖 **Current Documentation**: `docs/reference/MODEL_STRING_CONFIGURATION.md`

## Legacy Reference (Historical)

*The information below reflects the deprecated system for historical reference only.*

### Original Tier System

| Key | Model | Input Price* | Output Price* | Context | Use Case |
|-----|-------|--------------|---------------|---------|----------|
| `google-cheap` | Gemini 2.0 Flash | TBA** | TBA** | 1M tokens | **Development** - Fast, large context |
| `google-balanced` | Gemini 2.5 Pro | $1.25/M† | $10/M† | 1M tokens | Production alternative |
| `anthropic-cheap` | Claude 3.5 Haiku | $0.80/M | $4/M | 200K tokens | Development, simple tasks |
| `anthropic-balanced` | Claude Sonnet 4 | $3/M | $15/M | 200K tokens | **Production** - Reliable |
| `anthropic-balanced-thinking` | Claude Sonnet 4 (Thinking) | $3/M | $15/M | 200K tokens | **Complex Analysis** - Advanced reasoning |
| `anthropic-expensive` | Claude Opus 4 | $15/M | $75/M | 200K tokens | Maximum quality |

*Per million tokens  
**Gemini Flash pricing TBA  
†Higher pricing ($2.50/M input, $15/M output) for prompts >200K tokens

### Original Architecture

**Tier Management**: Model tiers were defined in `lib/config.ts` as the single source of truth  
**Database Storage**: Models were stored in `ai_models` table for tracking metadata  
**Resolution**: API routes resolved tier keys to provider+modelId using config, then looked up model UUID for tracking

**Why This Was Replaced:**
- Required database lookups on every AI call (performance impact)
- Made debugging difficult with opaque UUIDs in database
- Complex maintenance with model metadata split between config and database
- Difficult to add new models (required database migrations)

The new model string system eliminates these issues while maintaining backwards compatibility during transition.