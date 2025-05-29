# Multi-LLM Provider Support Implementation

## Goal, context

Implement support for multiple LLM providers (particularly Gemini alongside Claude) to give users choice and reduce vendor lock-in. Currently, the application is tightly coupled to Anthropic's Claude through the `@anthropic-ai/sdk`, with LLM calls in 5 API routes and the `executePrompt()` helper function.

The current architecture has moderate coupling to Anthropic - while the prompt template system (Nunjucks + Zod) and central configuration are provider-agnostic, the execution layer directly instantiates Anthropic clients and expects Anthropic-specific response formats.

## References

- `docs/LLM_PROMPT_TEMPLATES.md` - Documents current Nunjucks + Zod template system that would remain unchanged
- `lib/config.ts` - Central AI configuration that already supports model switching via `AI_MODEL` environment variable  
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

### Decision: Use Vercel AI SDK

**Rationale:**
- **TypeScript-native**: Perfect fit for our Next.js + TypeScript stack
- **Provider abstraction**: Clean interface supporting Claude, Gemini, OpenAI with identical API
- **Framework integration**: Built specifically for Next.js applications
- **Streaming support**: Maintains compatibility with our existing streaming implementations
- **Active development**: Vercel's flagship AI library with strong community support
- **Migration path**: Can incrementally replace Anthropic SDK without rewriting prompt templates

### Architecture Approach

- **Incremental migration**: Replace direct Anthropic SDK usage with Vercel AI SDK provider abstraction
- **Preserve template system**: Keep existing Nunjucks + Zod validation system unchanged
- **Environment configuration**: Add `LLM_PROVIDER` environment variable alongside existing `AI_MODEL`
- **Backward compatibility**: Maintain Claude as default with seamless fallback

## Actions

**Stage 0** - Create a new Git branch

**Stage 1: Research and Planning**
- [x] Research standard solutions (OpenRouter, LiteLLM, Vercel AI SDK)
- [x] Analyse current LLM integration coupling and identify change points
- [x] Document findings and approach in planning document
- [ ] Review Vercel AI SDK documentation for provider setup and migration patterns
- [ ] Test Vercel AI SDK basic integration in isolated example to validate approach

**Stage 2: Foundation - Install and Configure Vercel AI SDK**
- [ ] Install Vercel AI SDK: `npm install ai @ai-sdk/anthropic @ai-sdk/google`
- [ ] Add environment variables for provider selection:
  - `LLM_PROVIDER=anthropic|google` (default: anthropic)
  - `GOOGLE_AI_API_KEY` for Gemini support
- [ ] Update `lib/config.ts` to include provider configuration and model mapping
- [ ] Create provider factory function to instantiate correct AI SDK provider based on config
- [ ] Write unit tests for provider configuration and factory function

**Stage 3: Update Core Abstraction Layer**
- [ ] Create new `lib/services/llm-client.ts` with unified LLM interface
- [ ] Update `executePrompt()` in `lib/prompts/types.ts` to use Vercel AI SDK instead of direct Anthropic client
- [ ] Ensure response format normalisation between different providers
- [ ] Update template loading to work with new client interface
- [ ] Write comprehensive tests for updated `executePrompt()` function with multiple providers

**Stage 4: Migrate API Routes (Non-Chat)** - use subagents
- [ ] Update `/app/api/summarise/route.ts` to use new unified client
- [ ] Update `/app/api/glossary/route.ts` to use new unified client  
- [ ] Update `/app/api/headings/route.ts` to use new unified client
- [ ] Test all three routes with both Claude and Gemini providers
- [ ] Verify response formats and error handling work correctly across providers

**Stage 5: Migrate Chat API Route**
- [ ] Update `/app/api/chat/route.ts` to use Vercel AI SDK streaming interface
- [ ] Ensure chat message format compatibility across providers
- [ ] Test conversation flow with both Claude and Gemini
- [ ] Verify streaming responses work correctly with new provider abstraction

**Stage 6: Testing and Validation**
- [ ] Run full test suite to ensure no regressions: `npm test`
- [ ] Test provider switching via environment variables
- [ ] Test fallback behaviour when API keys are missing/invalid
- [ ] Manual testing of all AI features (summarise, glossary, headings, chat) with both providers
- [ ] Performance testing to ensure response times remain acceptable

**Stage 7: Documentation and Configuration**
- [ ] Update `docs/LLM_PROMPT_TEMPLATES.md` to document multi-provider support
- [ ] Update `docs/SETUP.md` with new environment variable requirements
- [ ] Add provider switching instructions to `README.md`
- [ ] Update `.env.example` with new Gemini configuration options
- [ ] Create troubleshooting section for provider-specific issues

**Stage 8: Cleanup and Optimisation**
- [ ] Remove direct `@anthropic-ai/sdk` dependency and imports
- [ ] Clean up any unused Anthropic-specific code or types
- [ ] Optimise provider client instantiation (consider caching/singleton pattern)
- [ ] Run linting and type checking: `npm run lint && npm run build`

**Stage 9: User Experience Enhancements**
- [ ] Consider adding UI provider selection option in settings/debug panel
- [ ] Add provider information to API responses for debugging
- [ ] Implement graceful degradation when preferred provider is unavailable
- [ ] Add cost estimation display (different providers have different pricing)

**Stage 10: Final Review and Deployment**
- [ ] Full manual testing of all features with multiple providers
- [ ] Performance benchmarking comparison (response time, quality)
- [ ] Update planning document with final implementation notes and lessons learned
- [ ] Git commit all changes following `docs/GIT_COMMITS.md` guidelines
- [ ] Update `docs/PROJECT_STATUS.md` to reflect multi-provider support
- [ ] Merge back into main (check with the user first)

# Appendix

## Vercel AI SDK Key Benefits for Our Use Case

Based on web research, the Vercel AI SDK offers:

1. **Unified Provider API**: Single interface for Claude, Gemini, GPT-4, etc.
2. **TypeScript Native**: Built specifically for TypeScript/Next.js applications
3. **Streaming Support**: Native streaming responses compatible with our chat interface  
4. **Framework Integration**: Designed for React/Next.js with built-in hooks and utilities
5. **Provider Flexibility**: Switch providers with configuration change, no code rewrite
6. **Active Development**: 1M+ weekly downloads, backed by Vercel

## Current Integration Points Requiring Change

1. **Direct Anthropic imports** in 5 files:
   - `/app/api/chat/route.ts`
   - `/app/api/summarise/route.ts` 
   - `/app/api/glossary/route.ts`
   - `/app/api/headings/route.ts`
   - `/lib/prompts/types.ts`

2. **Client instantiation pattern**:
   ```typescript
   const anthropic = new Anthropic({
     apiKey: process.env.ANTHROPIC_API_KEY,
   })
   ```

3. **executePrompt() function** hardcoded to Anthropic client and response format

4. **Response parsing** expects Anthropic's specific response structure

## Alternative Solutions Considered

- **OpenRouter**: Excellent abstraction but adds network latency and external dependency
- **LiteLLM**: Python-focused, would require additional REST API layer for TypeScript integration
- **Custom abstraction**: More work to maintain, less community support than established solutions

The Vercel AI SDK emerged as the best fit due to its TypeScript-first design, Next.js integration, and comprehensive provider support while maintaining the flexibility of our existing prompt template system.

## Vercel AI SDK Architecture Deep Dive

### Three-Module Architecture

The Vercel AI SDK consists of three distinct modules with different purposes:

**AI SDK Core** - LLM Integration Layer:
- Unified API for calling 15+ LLM providers (Claude, GPT-4, Gemini, etc.)
- Provider abstraction allowing model switching via configuration
- Backend-focused, works in Node.js, Deno, Bun environments
- Built-in streaming support for real-time responses
- Structured output generation with schema validation

**AI SDK UI** - Frontend Interface Components:
- Ready-made React hooks: `useChat`, `useCompletion`, `useAssistant`
- Framework support: React, Vue, Svelte, SolidJS
- Built-in chat interface with automatic message state management
- Real-time streaming to UI with status tracking (submitted, streaming, ready, error)
- Message parts system for complex outputs (text, tools, results)
- Event callbacks for onFinish, onError, onResponse

**AI SDK RSC** - Generative UI (Experimental):
- Stream React components directly from AI responses
- Generative UI where AI generates actual UI components, not just text
- Server-side streaming of rich interfaces using React Server Components
- Currently experimental with known limitations - not recommended for production

### Implementation Strategy for Our Project

**Recommended Approach - Incremental Adoption:**

1. **Phase 1: AI SDK Core Only**
   - Replace direct Anthropic SDK usage with AI SDK Core
   - Keep existing chat interface and prompt template system
   - Gain multi-provider support with minimal disruption
   - Maintain current UI/UX while adding provider flexibility

2. **Phase 2: Consider AI SDK UI (Optional)**
   - Evaluate if AI SDK UI hooks provide benefits over current chat implementation
   - Could replace custom chat state management with `useChat` hook
   - Offers built-in streaming status indicators and error handling
   - Would require refactoring existing chat components

**Benefits vs Current Architecture:**
- **AI SDK Core** provides exactly the provider abstraction needed
- **Existing prompt template system** (Nunjucks + Zod) remains unchanged
- **Streaming support** is built-in vs manual implementation
- **TypeScript-native** design matches our tech stack

**Trade-offs:**
- **AI SDK UI** might be overkill given our working chat interface
- **Additional dependency** vs current lightweight approach  
- **Learning curve** for new hooks and patterns
- **AI SDK RSC** too experimental for our production needs

This analysis confirms that **AI SDK Core** is the right starting point, with **AI SDK UI** as a potential future enhancement once multi-provider support is stable.