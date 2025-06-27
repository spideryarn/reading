# LLM Prompt Caching Reference

Comprehensive guide to prompt caching capabilities across major LLM providers, including cost savings, implementation approaches, and technical specifications for optimizing AI operation costs.

## See also

- `planning/later/250608a_prompt_caching_implementation.md` - Detailed implementation plan for prompt caching in our document processing workflows
- `docs/reference/LLM_MODEL_CONFIGURATION.md` - AI model configuration and usage patterns in our codebase
- `docs/reference/LLM_PROMPT_TEMPLATES.md` - Nunjucks + Zod prompt template system for consistent AI calls
- `lib/ai/` - Implementation of AI operations that could benefit from caching
- `docs/reference/LOGGING_BEST_PRACTICES.md` - Logging AI operations including cost tracking

## Overview

Prompt caching allows LLM providers to cache repetitive context (like system instructions, document content, or conversation history) to reduce costs and latency for subsequent requests. Each provider offers different approaches, cost savings, and implementation complexity.

## Provider Comparison Matrix

| Provider | Models | Min Tokens | Savings | Setup | Cache Duration | Status |
|----------|--------|------------|---------|-------|----------------|--------|
| **Anthropic Claude** | All Claude models | 1,024-2,048 | 90% | Manual | 5 min (refreshed) | ✓ GA |
| **Google Gemini** | 2.5 Pro/Flash | 1,024+ | 75% | Auto/Manual | 1 hour | ✓ GA |
| **OpenAI** | GPT-4o, o1, o3-mini | 1,024 | 50% | Automatic | 5-10 min | ✓ GA |

## Anthropic Claude Caching

### Technical Specifications

**Supported Models**: All Claude models (Opus 4, Sonnet 4, Sonnet 3.7, Sonnet 3.5, Haiku 3.5, Haiku 3, Opus 3)

**Minimum Token Requirements**:
- Claude Opus 4, Sonnet 4, Sonnet 3.7, Sonnet 3.5, Opus 3: 1,024 tokens
- Claude Haiku 3.5, Haiku 3: 2,048 tokens

**Cost Structure**:
- Cache writes: 25% more than base input tokens
- Cache hits: 10% of base input token price (90% discount)
- Example (Claude Sonnet 4): Base $3/MTok → Cache write $3.75/MTok → Cache hit $0.30/MTok

**Implementation**:
- Manual configuration with `cache_control` parameter
- Requires API header: `anthropic-beta: prompt-caching-2024-07-31`
- Up to 4 cache breakpoints per prompt
- 5-minute TTL (refreshed on access)
- Extended 1-hour TTL available in beta

### Best Practices

1. **Structure prompts** with static content first, dynamic content last
2. **Use multiple cache breakpoints** for complex prompts with different static sections
3. **Monitor cache hit rates** via API response metadata
4. **Consider extended TTL** for workflows with repeated long-form content

### Use Cases

- Conversational agents with extensive system instructions
- Multi-round tool use and agentic workflows
- Document analysis with consistent context
- Extended conversations with uploaded documents

## Google Gemini Caching

### Technical Specifications

**Supported Models**: 
- Gemini 2.5 Pro, 2.5 Flash (implicit + explicit)
- Gemini 1.5 Pro, 1.5 Flash (explicit only)

**Caching Types**:

**Implicit Caching (Automatic)**:
- Minimum: 1,024 tokens (2.5 Flash), 2,048 tokens (2.5 Pro)
- 75% discount on cached tokens
- Enabled by default, no setup required

**Explicit Caching (Manual)**:
- Minimum: 32,768 tokens for 1.5 models
- Manual cache creation with TTL control
- 1-hour default TTL (customizable)

**Cost Structure**:
- **Gemini 2.5 Flash**: $0.075 per 1M cached tokens, $1.00 per 1M tokens per hour storage
- **Gemini 2.5 Pro**: $0.31 per 1M cached tokens (≤200k), $4.50 per 1M tokens per hour storage

### Implementation Strategy

**For moderate contexts (1k-32k tokens)**: Use implicit caching on 2.5 models
**For large contexts (32k+ tokens)**: Use explicit caching with manual management
**Cost optimization**: Place repetitive content at prompt beginning

## OpenAI Caching

### Technical Specifications

**Supported Models**: GPT-4o, GPT-4o-mini, o1-preview, o1-mini, o3-mini
**Note**: Full o3 model caching support unclear from documentation

**Implementation**:
- Completely automatic (zero configuration)
- 1,024 token minimum for activation
- Cache hits for every 128 additional identical tokens
- 50% discount on cached input tokens

**Cost Structure**:
- Standard o3-mini: $1.10 per million input tokens
- With caching: $0.55 per million for cached input tokens
- Cache duration: 5-10 minutes (max 1 hour)
- Organization-scoped caching

### Pros and Cons

**Advantages**:
- Zero setup complexity
- Automatic detection and application
- Monitoring via `cached_tokens` field

**Limitations**:
- Lowest cost savings (50% vs 75-90% competitors)
- Shorter cache duration
- Less control over cache management

## Implementation Recommendations

### For Spideryarn Reading

**Current Context**: We use Claude Sonnet 4 primarily, with Haiku for development

**Recommendations**:

1. **Enable Anthropic caching** for document analysis workflows
2. **Structure prompts** to place document content and system instructions at beginning
3. **Monitor costs** via `logAIOperation()` utility to track cache effectiveness
4. **Consider model switching** to Gemini 2.5 for very large documents (>50k tokens)

### Cost Optimization Strategy

**High-volume operations** (>1000 requests/day):
- Anthropic Claude: 90% savings, worth manual setup
- Google Gemini: 75% savings, automatic for 2.5 models

**Moderate usage** (100-1000 requests/day):
- OpenAI: 50% savings, zero setup complexity
- Consider development overhead vs savings

**Low usage** (<100 requests/day):
- May not justify implementation effort
- OpenAI automatic caching provides some benefit

## Technical Implementation

### Anthropic Cache Control Example

```typescript
const response = await anthropic.messages.create({
  model: "claude-3-5-sonnet-20241022",
  max_tokens: 1024,
  messages: [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "System instructions and document content...",
          cache_control: { type: "ephemeral" }
        },
        {
          type: "text", 
          text: "User question about the document..."
        }
      ]
    }
  ]
}, {
  headers: {
    "anthropic-beta": "prompt-caching-2024-07-31"
  }
});
```

### Monitoring Cache Performance

```typescript
// Log cache metrics in AI operations
const cacheMetrics = {
  cache_creation_input_tokens: response.usage?.cache_creation_input_tokens,
  cache_read_input_tokens: response.usage?.cache_read_input_tokens,
  cache_hit_rate: calculateCacheHitRate(response.usage)
};

logAIOperation(logger, 'document-analysis', {
  model: 'claude-3-5-sonnet',
  tokens: response.usage,
  cache: cacheMetrics
});
```

## Cost Analysis Examples

### Document Analysis Workflow

**Scenario**: 10,000 requests/month analyzing 5,000-token documents

**Without Caching**:
- Anthropic: 50M tokens × $3/MTok = $150/month
- Gemini: 50M tokens × $0.31/MTok = $15.50/month  
- OpenAI: 50M tokens × $10/MTok = $500/month

**With Caching** (80% cache hit rate):
- Anthropic: 10M new + 40M cached × $0.30/MTok = $30 + $12 = $42/month (72% savings)
- Gemini: 10M new + 40M cached × $0.075/MTok = $3.10 + $3 = $6.10/month (61% savings)
- OpenAI: 10M new + 40M cached × $5/MTok = $10 + $200 = $210/month (58% savings)

## Limitations and Considerations

### Cache Invalidation

**All providers**: Changes to any part of cached content invalidates entire cache
**Best practice**: Structure prompts to minimize cache invalidation

### Cache Scope

- **Anthropic**: Organization-scoped
- **Google**: Project-scoped  
- **OpenAI**: Organization-scoped

### Content Restrictions

- Cannot cache thinking blocks or internal reasoning
- Tool definitions and images may affect cache validity
- Must be identical content for cache hits (100% match required)

## Future Considerations

### Emerging Features

- **Extended TTL options**: Longer cache durations for persistent workflows
- **Cross-conversation caching**: Sharing cache across different conversation threads
- **Intelligent cache management**: AI-driven cache optimization

### Cost Trends

- Caching discounts are increasing across providers
- Implementation complexity is decreasing (more automatic options)
- Storage costs remain minimal compared to compute savings

## Migration Path

**Phase 1**: Implement OpenAI automatic caching for immediate 50% savings
**Phase 2**: Add Anthropic manual caching for high-volume workflows (90% savings)
**Phase 3**: Evaluate Gemini 2.5 implicit caching for large document processing

This approach provides immediate cost benefits while allowing for optimization based on actual usage patterns and cost analysis.