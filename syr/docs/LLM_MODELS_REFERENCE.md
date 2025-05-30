# LLM Models Reference

This document provides a comprehensive overview of all available Large Language Models (LLMs) in the Spideryarn Reading application, including their capabilities, pricing, and recommended use cases.

## Provider-Tier Model Keys

The application uses a provider-tier key system for easy model configuration:

- **Format**: `{provider}-{tier}`
- **Providers**: `anthropic`, `google`  
- **Tiers**: `cheap` (fast/cost-effective), `balanced` (good performance/cost ratio), `expensive` (highest capability)

Set your preferred model using the `LLM_MODEL` environment variable:
```bash
LLM_MODEL=google-cheap npm run dev
```

## Available Models

### Anthropic (Claude) Models

| Provider-Tier Key | Model ID | Description | Context Window | Output Tokens | Use Case |
|------------------|----------|-------------|----------------|---------------|----------|
| `anthropic-cheap` | claude-3-5-haiku-20241022 | Claude 3.5 Haiku - Fast and cost-effective | 200K tokens | 8,192 tokens | Development, testing, simple tasks |
| `anthropic-balanced` | claude-sonnet-4-20250514 | Claude Sonnet 4 - Balanced performance and cost | 200K tokens | 8,192 tokens | **Recommended for production** |
| `anthropic-expensive` | claude-opus-4-20250514 | Claude Opus 4 - Highest capability | 200K tokens | 8,192 tokens | Complex reasoning, highest quality |

### Google (Gemini) Models

| Provider-Tier Key | Model ID | Description | Context Window | Output Tokens | Use Case |
|------------------|----------|-------------|----------------|---------------|----------|
| `google-cheap` | gemini-2.5-flash | Gemini 2.5 Flash - Fast and cost-effective | 1M tokens | 8,192 tokens | **Recommended for development** |
| `google-balanced` | gemini-2.5-pro | Gemini 2.5 Pro - Balanced performance | 1M tokens | 8,192 tokens | Production alternative to Claude |
| `google-expensive` | gemini-2.5-pro | Gemini 2.5 Pro - Same as balanced tier | 1M tokens | 8,192 tokens | Currently same as balanced |

## Performance Characteristics

### Context Window Comparison

- **Gemini 2.5**: 1M tokens (5x larger than Claude)
- **Claude 4**: 200K tokens

The larger context window of Gemini models allows for processing longer documents without truncation.

### Speed and Cost

- **Cheap tier**: Optimised for speed and low cost, suitable for development and simple tasks
- **Balanced tier**: Good balance of capability and cost, recommended for most production use cases  
- **Expensive tier**: Highest capability models for complex reasoning and maximum quality

## Recommended Configuration

### Development Environment
```bash
LLM_MODEL=google-cheap
```
- Fast responses for development workflow
- Cost-effective for frequent testing
- Large context window for document processing

### Production Environment  
```bash
LLM_MODEL=anthropic-balanced
```
- Proven reliability and quality
- Good balance of cost and performance
- Well-tested across all application features

## API Key Requirements

Ensure you have the appropriate API keys configured:

```bash
# For Anthropic models
ANTHROPIC_API_KEY=your_anthropic_key

# For Google models  
GOOGLE_GENERATIVE_AI_API_KEY=your_google_key
```

## Example Pricing Calculations

*Note: Pricing information below is illustrative. Check provider websites for current rates.*

### Typical Document Analysis (10K tokens input, 500 tokens output)

**Anthropic Claude Models:**
- Haiku (cheap): ~$0.003 per request
- Sonnet 4 (balanced): ~$0.015 per request  
- Opus 4 (expensive): ~$0.075 per request

**Google Gemini Models:**
- Flash (cheap): ~$0.001 per request
- Pro (balanced/expensive): ~$0.007 per request

### Monthly Development Usage (1000 requests)
- `google-cheap`: ~$1
- `anthropic-cheap`: ~$3
- `anthropic-balanced`: ~$15

## Model Selection Guidelines

### Choose `google-cheap` when:
- Developing and testing features
- Processing long documents (>100K tokens)
- Cost is a primary concern
- Speed is more important than absolute quality

### Choose `anthropic-balanced` when:
- Running in production
- Quality is important
- You need consistent, reliable results
- Budget allows for higher-tier models

### Choose expensive tier models when:
- Maximum quality is required
- Complex reasoning tasks
- Critical business applications
- Quality is more important than cost

## Context Window Usage

### Document Processing Limits

**Gemini 2.5 (1M tokens):**
- Can process documents up to ~750,000 words
- Suitable for academic papers, books, long reports

**Claude 4 (200K tokens):**  
- Can process documents up to ~150,000 words
- Suitable for articles, research papers, medium documents

### Optimization Tips

1. **Use appropriate model for content size**: Choose Gemini for very long documents
2. **Monitor token usage**: Check response metadata for actual token consumption
3. **Consider content chunking**: For extremely long content, consider processing in chunks
4. **Template optimization**: Keep prompt templates concise to maximise content space

## Switching Models

Models can be changed at runtime by updating the environment variable:

```bash
# Switch to different model
export LLM_MODEL=anthropic-balanced
npm run dev

# Or inline for single command
LLM_MODEL=google-cheap npm run dev
```

The application will automatically:
- Select the correct provider based on the key
- Configure API authentication
- Adjust request parameters appropriately

## Troubleshooting

### Common Issues

**"Provider not found" errors:**
- Check API key is correctly set
- Verify provider-tier key spelling
- Ensure provider packages are installed

**Token limit exceeded:**
- Use model with larger context window (Gemini)
- Reduce prompt template size
- Implement content chunking

**Quality issues:**
- Try higher-tier model (`balanced` or `expensive`)
- Adjust temperature settings in prompt templates
- Review prompt engineering best practices

For more troubleshooting, see `docs/TROUBLESHOOTING.md`.