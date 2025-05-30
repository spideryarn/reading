# Multi-LLM Provider Support Implementation

**Progress Update (30 May 2025)**: Stages 1-5 complete. All API routes including chat now use Vercel AI SDK Core with multi-provider support. Chat API handles conversation history properly with system prompts. All tests passing (38/38 including 16 new chat tests). Ready to proceed with Stage 5b (optional overrides).

## Goal, context

Implement support for multiple LLM providers (particularly Gemini alongside Claude) to give users choice and reduce vendor lock-in. Currently, the application is tightly coupled to Anthropic's Claude through the `@anthropic-ai/sdk`, with LLM calls in 5 API routes and the `executePrompt()` helper function.

The current architecture has moderate coupling to Anthropic - while the prompt template system (Nunjucks + Zod) and central configuration are provider-agnostic, the execution layer directly instantiates Anthropic clients and expects Anthropic-specific response formats.

## References

- `docs/LLM_PROMPT_TEMPLATES.md` - Documents current Nunjucks + Zod template system that would remain unchanged
- `lib/config.ts` - Central AI configuration that already supports model switching via `LLM_MODEL` environment variable  
- `lib/prompts/types.ts` - Contains `executePrompt()` function that's currently Anthropic-specific
- API routes: `/app/api/chat/route.ts`, `/app/api/summarise/route.ts`, `/app/api/glossary/route.ts`, `/app/api/headings/route.ts` - All directly instantiate Anthropic clients
- Web search findings on standard solutions: OpenRouter, LiteLLM, Vercel AI SDK

## Principles, key decisions

Use tasks and subagents where appropriate, especially for curl, tests, and Playwright MCP.

### Standard Solution Research Findings

**OpenRouter** - Unified API platform providing access to 300+ models through OpenAI-compatible endpoints:
- Single API integration supporting Claude, GPT-4, Gemini, and many others
- OpenAI SDK compatibility - works with existing OpenAI client code
- ~25ms latency overhead, distributed infrastructure with fallback support
- Unified cost tracking and management across all providers

**LiteLLM** - Open-source Python/REST abstraction layer for 100+ LLM providers:
- Python-focused but provides OpenAI-compatible REST endpoints for any language
- Backed by Y Combinator, adopted by Netflix, Lemonade, Rocket Money
- Free and open-source with cost tracking and fallback logic
- Primarily Python SDK but REST API can be consumed from TypeScript

**Vercel AI SDK** - TypeScript-native unified LLM toolkit:
- 1M+ weekly downloads, comprehensive TypeScript support
- Built-in support for OpenAI, Anthropic, Google, and others through standardised API
- Designed for React/Next.js applications with streaming support
- Provider-agnostic interface with easy provider switching

### Decision: Use Vercel AI SDK Core with Existing assistant-ui Frontend

**Rationale:**
- **TypeScript-native**: Perfect fit for our Next.js + TypeScript stack
- **Provider abstraction**: Clean interface supporting Claude, Gemini, OpenAI with identical API
- **Minimal disruption**: Keep working assistant-ui frontend unchanged
- **Streaming support**: Maintains compatibility with our existing streaming implementations
- **Active development**: Vercel's flagship AI library with strong community support
- **Migration path**: Can incrementally replace Anthropic SDK without rewriting prompt templates or UI

### Architecture Approach (Option 1: AI SDK Core Backend Only)

- **Backend-only migration**: Replace direct Anthropic SDK usage with Vercel AI SDK Core in API routes
- **Preserve frontend**: Keep existing assistant-ui components and `useChatRuntime` hook unchanged
- **Preserve template system**: Keep existing Nunjucks + Zod validation system unchanged
- **Environment configuration**: Add `LLM_PROVIDER` environment variable alongside existing `LLM_MODEL`
- **Backward compatibility**: Maintain Claude as default with seamless fallback

## Actions

**Stage 0** - Create a new Git branch
- [x] We're in `feature/multi-llm-provider-support`

**Stage 1: Research and Planning**
- [x] Research standard solutions (OpenRouter, LiteLLM, Vercel AI SDK)
- [x] Analyse current LLM integration coupling and identify change points
- [x] Document findings and approach in planning document
- [x] Review Vercel AI SDK documentation for provider setup and migration patterns
- [x] Test Vercel AI SDK basic integration in isolated example to validate approach

**Stage 2: Foundation - Install and Configure Vercel AI SDK Core**
- [x] Install AI SDK Core and provider packages: `npm install ai @ai-sdk/anthropic @ai-sdk/google`
- [x] Add environment variables for provider selection:
  - `LLM_PROVIDER=anthropic|google` (default: anthropic)
  - `GOOGLE_GENERATIVE_AI_API_KEY` for Gemini support
- [x] Update `lib/config.ts` to include provider configuration and model mapping
- [x] Create provider factory function (`lib/services/llm-provider.ts`) to instantiate correct AI SDK provider based on config
- [x] Write unit tests for provider configuration and factory function
- [x] Rename `AI_MODEL` to `LLM_MODEL` environment variable for consistency

**Stage 3: Update Core Abstraction Layer**
- [x] Create new `lib/services/llm-provider.ts` with provider factory pattern
- [x] Update `executePrompt()` in `lib/prompts/types.ts` to use AI SDK Core instead of direct Anthropic client
- [x] Ensure response format normalisation between different providers
- [x] Maintain backward compatibility with existing prompt template system
- [x] Write comprehensive tests for updated `executePrompt()` function with multiple providers

**Stage 4: Migrate API Routes (Non-Chat)** - use subagents
- [x] Update `/app/api/summarise/route.ts` to use new unified client
- [x] Update `/app/api/glossary/route.ts` to use new unified client  
- [x] Update `/app/api/headings/route.ts` to use new unified client
- [x] Test all three routes with both Claude and Gemini providers - use subagents for curl or Playwright MCP
- [x] Verify response formats and error handling work correctly across providers

**Stage 5: Migrate Chat API Route**
- [x] Update `/app/api/chat/route.ts` to use AI SDK Core while maintaining assistant-ui compatibility
- [x] Ensure response format matches what `useChatRuntime` expects
- [x] Test conversation flow with both Claude and Gemini
- [x] Verify existing assistant-ui frontend continues to work unchanged
- [x] Create comprehensive Jest tests for chat API route with multi-provider support

**Stage 5b: Override optionally**
- [ ] Make sure there's a way to override the model and parameters being used for a given call if we want to? i.e. it should default to the environment variables, but allow you to specify/override in the LLM execution function call if you want.
- [ ] Update LLM_PROMPT_TEMPLATES.md and this one, then commit

**Stage 6: Testing and Validation** - use subagents for running tests where appropriate
- [ ] Run full test suite to ensure no regressions: `npm test`
- [ ] Test provider switching via environment variables
- [ ] Test fallback behaviour when API keys are missing/invalid
- [ ] Manual testing of all AI features (summarise, glossary, headings, chat) with both providers
- [ ] Performance testing to ensure response times remain acceptable

**Stage 7: Documentation and Configuration**
- [ ] Update `docs/LLM_PROMPT_TEMPLATES.md` to document multi-provider support
- [ ] Update `docs/SETUP.md` with new environment variable requirements
- [ ] Add provider switching instructions to `README.md`
- [x] Update `.env.example` with new Gemini configuration options
- [ ] Create troubleshooting section for provider-specific issues

**Stage 8: Cleanup and Optimisation**
- [ ] Remove direct `@anthropic-ai/sdk` dependency and imports
- [ ] Clean up any unused Anthropic-specific code or types
- [ ] Optimise provider client instantiation (consider caching/singleton pattern)
- [ ] Run linting and type checking: `npm run lint && npm run build`

**Stage 9: Future Enhancements (Post-MVP)**
- [ ] Consider migration to `@assistant-ui/react-ai-sdk` for tighter integration
- [ ] Add provider information to API responses for debugging
- [ ] Implement graceful degradation when preferred provider is unavailable
- [ ] Consider UI provider selection if users request it

**Stage 10: Final Review and Deployment**
- [ ] Full manual testing of all features with multiple providers
- [ ] Performance benchmarking comparison (response time, quality)
- [ ] Update planning document with final implementation notes and lessons learned
- [ ] Git commit all changes following `docs/GIT_COMMITS.md` guidelines
- [ ] Update `docs/PROJECT_STATUS.md` to reflect multi-provider support
- [ ] Merge back into main (check with the user first)

# Appendix

## Vercel AI SDK Integration Analysis with assistant-ui

### Executive Summary

After thorough research and analysis, we've decided to implement **Option 1: Keep assistant-ui frontend, use Vercel AI SDK Core backend**. This approach provides multi-provider support with minimal disruption to our working chat interface.

### Integration Options Evaluated

#### Option 1: AI SDK Core Backend + assistant-ui Frontend (SELECTED)
- **Approach**: Replace Anthropic SDK with AI SDK Core in API routes only
- **Frontend**: Keep existing `useChatRuntime` and assistant-ui components unchanged
- **Benefits**: 
  - Minimal disruption to working code
  - Incremental migration path
  - Preserves existing tests and UI components
  - Quick path to multi-provider support
- **Trade-offs**: Two dependencies instead of one

#### Option 2: Full Migration to Vercel AI SDK UI
- **Approach**: Replace assistant-ui with Vercel's `useChat` hook
- **Requires**: Complete rewrite of chat components
- **Rejected because**: Current UI is working well, no clear benefit to rewriting

#### Option 3: Hybrid with @assistant-ui/react-ai-sdk
- **Approach**: Use official integration package for tighter coupling
- **Benefits**: Official support, potentially better integration
- **Deferred**: Can be considered after initial implementation is stable

### Research Findings

#### Vercel AI SDK Architecture

The SDK consists of three modules:

1. **AI SDK Core** (What we'll use)
   - Unified API for 15+ LLM providers
   - TypeScript-native design
   - Backend-focused for Node.js environments
   - Perfect for our API route integration

2. **AI SDK UI** (Not needed)
   - Frontend hooks like `useChat`
   - Would duplicate assistant-ui functionality
   - No benefit over our current implementation

3. **AI SDK RSC** (Experimental)
   - Generative UI capabilities
   - Too experimental for production use

#### assistant-ui Compatibility

**Key Discovery**: assistant-ui has first-class Vercel AI SDK support through `@assistant-ui/react-ai-sdk` package
- Official integration maintained by assistant-ui team
- Designed to work seamlessly with Vercel AI SDK
- Our current implementation structure aligns well with this integration pattern

### Implementation Strategy Updates

Based on our analysis, the implementation stages have been updated:

**Stage 2**: Now focuses on AI SDK Core installation only
**Stage 3**: Simplified to create minimal abstraction layer
**Stage 4-5**: API route updates remain similar but clearer
**Stage 9**: Removed UI provider selection (keeping it backend-only initially)

### Key Benefits of Our Approach

1. **Minimal Risk**: Working code stays working
2. **Incremental Progress**: Can test provider switching route by route
3. **Preserve Investment**: Existing tests, UI components, and patterns remain valid
4. **Future Flexibility**: Can adopt tighter integration later if needed

### Technical Integration Details

The migration pattern will be:
```typescript
// Current implementation
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const response = await anthropic.messages.create({
  model: AI_CONFIG.DEFAULT_MODEL,
  messages: [{ role: 'user', content: prompt }]
})

// New implementation
import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google-generativeai'
import { generateText } from 'ai'

const provider = process.env.LLM_PROVIDER === 'google' ? google : anthropic
const result = await generateText({
  model: provider(AI_CONFIG.DEFAULT_MODEL),
  prompt: renderedPrompt,
})
```

### Links and References

- [Vercel AI SDK Documentation](https://ai-sdk.dev/docs/introduction)
- [assistant-ui Documentation](https://www.assistant-ui.com/docs/getting-started)
- [@assistant-ui/react-ai-sdk npm package](https://www.npmjs.com/package/@assistant-ui/react-ai-sdk)
- [AI SDK Core API Reference](https://ai-sdk.dev/docs/ai-sdk-core/overview)
- [Multi-provider examples](https://github.com/vercel/ai/tree/main/examples)

### Why Not Other Solutions?

- **OpenRouter**: Adds network hop and external dependency
- **LiteLLM**: Python-focused, requires REST wrapper
- **Custom abstraction**: More maintenance burden
- **Full Vercel AI SDK UI**: Would require rewriting working code

### Future Considerations

After stable multi-provider support is achieved, we could explore:
1. Using `@assistant-ui/react-ai-sdk` for tighter integration
2. Adding provider selection UI if users request it
3. Implementing provider-specific optimizations
4. Cost tracking across different providers

This approach balances pragmatism with progress, allowing us to achieve multi-provider support while maintaining system stability.