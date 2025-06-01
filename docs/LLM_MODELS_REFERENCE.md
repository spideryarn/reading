# LLM Models Reference

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
