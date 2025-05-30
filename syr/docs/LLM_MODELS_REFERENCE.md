# LLM Models Reference

## Available Models

| Key | Model | Input Price* | Output Price* | Context | Use Case |
|-----|-------|--------------|---------------|---------|----------|
| `google-cheap` | Gemini 2.5 Flash | TBA** | TBA** | 1M tokens | **Development** - Fast, large context |
| `google-balanced` | Gemini 2.5 Pro | $1.25/M† | $10/M† | 1M tokens | Production alternative |
| `google-expensive` | Gemini 2.5 Pro | $1.25/M† | $10/M† | 1M tokens | Same as balanced |
| `anthropic-cheap` | Claude 3.5 Haiku | $0.80/M | $4/M | 200K tokens | Development, simple tasks |
| `anthropic-balanced` | Claude Sonnet 4 | $3/M | $15/M | 200K tokens | **Production** - Reliable |
| `anthropic-expensive` | Claude Opus 4 | $15/M | $75/M | 200K tokens | Maximum quality |

*Per million tokens  
**Gemini 2.5 Flash pricing TBA (currently in preview)  
†Higher pricing ($2.50/M input, $15/M output) for prompts >200K tokens

## Quick Comparison

**Context Windows:**
- Gemini 2.5: 1M tokens (5x larger)
- Claude 4: 200K tokens

**Recommendations:**
- **Development**: `google-cheap` (large context, cost-effective)
- **Production**: `anthropic-balanced` (proven reliability)

## API Keys Required

see `.env.example`

## Switching Models

```bash
LLM_MODEL=google-cheap npm run dev
```

The application automatically handles provider selection, authentication, and request formatting.
