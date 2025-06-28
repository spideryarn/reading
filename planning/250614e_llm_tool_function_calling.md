# LLM Tool Function Calling Integration

## Goal

Enable LLM-driven tool usage by:
- Generating OpenAPI-compatible function schemas from tool definitions
- Creating type-safe function calling wrappers
- Integrating with the chat interface for AI-assisted tool usage
- Supporting both Claude and Gemini function calling formats
- Ensuring secure parameter validation and execution

## Context

Spideryarn Reading has a chat interface that could be enhanced by allowing the LLM to directly invoke tools on behalf of users. Currently:
- Chat can reference document content but cannot trigger tools
- Users must manually switch tabs and click buttons
- No programmatic interface for AI to use tools
- Each LLM provider has different function calling formats

We need a system that generates function schemas from tool definitions and safely executes them.

## References

- `docs/reference/TOOL_CHATBOT_ASSISTANT_UI_INTEGRATION.md` - Current chat implementation
- `docs/reference/LLM_PROMPT_TEMPLATES.md` - Nunjucks + Zod template system
- `lib/prompts/templates/chat.njk` - Chat prompt template to enhance
- `planning/finished/250614b_unified_tool_registry_architecture.md` - Core tool registry (COMPLETED)
- `planning/finished/250614c_command_palette_dynamic_generation.md` - Command generation (COMPLETED)
- `planning/250614d_tool_execution_framework.md` - Execution framework (dependency)
- `planning/finished/250614a_tool_url_state_management.md` - URL state for function results

## Principles & Key Decisions

1. **Function-first for LLMs** - LLMs prefer function calls over URL manipulation
2. **Provider-agnostic** - Support both Anthropic and Google formats
3. **Type-safe execution** - Validate all parameters before execution
4. **Security by default** - Sanitize inputs, rate limit, audit trail
5. **Graceful degradation** - Chat works even if function calling fails
6. **User consent** - Show what AI will do before execution (initially)
7. **URL-based navigation** - Tab changes must use URL state (see `planning/finished/250615a_url_state_single_source_of_truth.md`)

## Stages & Actions

### Stage: Preparation and dependencies
- [x] ✅ COMPLETED: Core tool registry (250614b) - All 8 tools registered  
- [x] ✅ COMPLETED: Command palette generation (250614c) - Dynamic generation working
- [ ] Ensure execution framework (250614d) is operational
- [ ] Review current chat implementation and prompt templates
- [ ] Research Claude and Gemini function calling formats

### Stage: Schema generation design
- [ ] Create `lib/tools/llm/types.ts`
  - [ ] Define LLMFunction interface
  - [ ] Define provider-specific format types
  - [ ] Create parameter mapping types
  - [ ] Add security annotation types
- [ ] Document schema generation approach
  - [ ] How Zod schemas map to OpenAPI
  - [ ] Provider-specific adaptations
  - [ ] Parameter type conversions

### Stage: Schema generation implementation
- [ ] Create `lib/tools/llm/schema-generator.ts`
  - [ ] generateOpenAPISchema() from Tool
  - [ ] convertZodToOpenAPI() helper
  - [ ] generateAnthropicSchema() adapter
  - [ ] generateGeminiSchema() adapter
  - [ ] Handle nested schemas and references
- [ ] Write comprehensive schema generation tests
  - [ ] Test all Zod types convert correctly
  - [ ] Verify provider-specific formats
  - [ ] Test complex nested schemas
- [ ] Run tests

### Stage: Function wrapper implementation
- [ ] Create `lib/tools/llm/function-wrapper.ts`
  - [ ] wrapToolAsFunction() main wrapper
  - [ ] Parameter validation layer
  - [ ] Execution context injection
  - [ ] Result formatting for LLM
  - [ ] Error handling and fallbacks
- [ ] Create security layer
  - [ ] Input sanitization
  - [ ] Rate limiting per user
  - [ ] Audit logging
  - [ ] Permission checking
- [ ] Add wrapper tests

### Stage: Provider integration - Claude
- [ ] Create `lib/tools/llm/providers/claude.ts`
  - [ ] Format functions for Claude API
  - [ ] Handle Claude-specific requirements
  - [ ] Parse Claude function calls
  - [ ] Map results back to Claude format
- [ ] Update chat prompt template
  - [ ] Add function definitions to system prompt
  - [ ] Include function calling instructions
  - [ ] Add examples of function usage
- [ ] Test Claude integration

### Stage: Provider integration - Gemini
- [ ] Create `lib/tools/llm/providers/gemini.ts`
  - [ ] Format functions for Gemini API
  - [ ] Handle Gemini-specific requirements
  - [ ] Parse Gemini function calls
  - [ ] Map results back to Gemini format
- [ ] Test Gemini integration
- [ ] Compare behavior between providers

### Stage: Chat interface enhancement
- [ ] Update chat API route
  - [ ] Include function definitions in LLM calls
  - [ ] Parse function call responses
  - [ ] Execute requested functions
  - [ ] Return results to LLM for summary
- [ ] Add UI for function execution
  - [ ] Show pending function calls
  - [ ] User confirmation (initially)
  - [ ] Execution status and results
  - [ ] Error display
- [ ] Test end-to-end chat with functions

### Stage: Security implementation
- [ ] Create `lib/tools/llm/security.ts`
  - [ ] Parameter sanitization functions
  - [ ] Rate limiting with Redis/memory
  - [ ] Audit trail logging
  - [ ] Permission checking framework
- [ ] Add security tests
  - [ ] Test injection attempts
  - [ ] Verify rate limiting works
  - [ ] Check audit logs created
  - [ ] Test permission denials

### Stage: Simple function examples
- [ ] Create example functions for:
  - [ ] Opening glossary
  - [ ] Searching for terms
  - [ ] Generating summaries
  - [ ] Navigating to sections
- [ ] Test each function via chat
- [ ] Document usage patterns

### Stage: Complex function orchestration
- [ ] Enable multi-step function calls
  - [ ] Search then summarize results
  - [ ] Generate glossary then highlight terms
  - [ ] Chain multiple tool invocations
- [ ] Handle function dependencies
- [ ] Test complex workflows

### Stage: Error handling and recovery
- [ ] Implement comprehensive error handling
  - [ ] Invalid parameters
  - [ ] Tool execution failures
  - [ ] Rate limit exceeded
  - [ ] Permission denied
- [ ] Create user-friendly error messages
- [ ] Add fallback behaviors
- [ ] Test all error scenarios

### Stage: Performance optimization
- [ ] Cache function schemas
  - [ ] Generate once at startup
  - [ ] Invalidate on tool changes
- [ ] Optimize execution paths
  - [ ] Batch similar operations
  - [ ] Parallel execution where safe
- [ ] Add performance monitoring
- [ ] Load test with many functions

### Stage: Documentation
- [ ] Create `docs/reference/TOOL_LLM_FUNCTION_CALLING.md`
  - [ ] Architecture overview
  - [ ] Security model
  - [ ] Provider differences
  - [ ] Usage examples
- [ ] Update chat documentation
- [ ] Create troubleshooting guide

### Stage: Testing and validation
- [ ] Use subagent for comprehensive testing
  - [ ] Test all tools via LLM
  - [ ] Cross-provider testing
  - [ ] Security penetration testing
  - [ ] Performance benchmarks
- [ ] User acceptance testing
  - [ ] Natural language tool usage
  - [ ] Error recovery flows
  - [ ] Multi-step operations

### Stage: Final review
- [ ] Security audit
  - [ ] Review all input paths
  - [ ] Check permission model
  - [ ] Verify audit logging
- [ ] Performance review
- [ ] Documentation completeness
- [ ] Git commit following guidelines

## Function Schema Examples

### Generated OpenAPI Schema

```typescript
// From glossary tool definition
{
  "name": "use_glossary",
  "description": "Extract and display key terms and concepts from the document",
  "parameters": {
    "type": "object",
    "properties": {
      "action": {
        "type": "string",
        "enum": ["open", "execute", "refresh"],
        "description": "What action to perform with the glossary"
      },
      "term": {
        "type": "string",
        "description": "Specific term to highlight in the glossary (optional)"
      },
      "refresh": {
        "type": "boolean",
        "default": false,
        "description": "Force refresh of cached glossary data"
      }
    },
    "required": ["action"]
  }
}
```

### Claude Function Format

```typescript
const claudeFunction = {
  name: "use_glossary",
  description: "Extract and display key terms and concepts from the document",
  input_schema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["open", "execute", "refresh"],
        description: "What action to perform"
      },
      term: {
        type: "string",
        description: "Specific term to highlight"
      }
    },
    required: ["action"]
  }
}
```

### Function Execution Flow

```typescript
// 1. LLM requests function
const llmResponse = {
  function_call: {
    name: "use_glossary",
    arguments: {
      action: "execute",
      term: "quantum computing"
    }
  }
}

// 2. Wrapper validates and executes
const result = await executeFunction(llmResponse.function_call)

// 3. Result returned to LLM (using direct response format from 250614d)
const functionResult = {
  name: "use_glossary",
  result: {
    glossaryTerms: [...],
    processingTime: 1500,
    metadata: {
      correlationId: "req_123",
      cached: false
    }
  }
}

// 4. LLM summarizes for user
"I've generated a glossary for this document and found 15 key terms. 
The term 'quantum computing' has been highlighted in the glossary view."
```

## Security Model

### Input Validation Layers

1. **Schema Validation** - Zod validates against tool schema
2. **Type Coercion** - Convert strings to proper types safely
3. **Sanitization** - Remove potentially harmful content
4. **Range Checking** - Ensure values within acceptable bounds
5. **Permission Check** - Verify user can execute tool

### Rate Limiting

```typescript
const rateLimits = {
  'analysis': { requests: 10, window: '1m' },    // Glossary, search
  'generation': { requests: 5, window: '5m' },   // Summaries, headings
  'navigation': { requests: 50, window: '1m' },  // Tab switches
  'transform': { requests: 3, window: '5m' }     // Tweet threads
}
```

### Audit Trail

```typescript
interface AuditEntry {
  timestamp: Date
  userId: string
  sessionId: string
  function: string
  parameters: Record<string, any>
  result: 'success' | 'error' | 'denied'
  errorDetails?: string
  executionTime: number
}
```

## Provider Differences

### Claude (Anthropic)
- Supports structured `function_call` in responses
- Can call multiple functions in sequence
- Provides clear function/argument separation
- Better at following function schemas exactly

### Gemini (Google)
- Uses `functionCall` format (camelCase)
- May hallucinate function names more often
- Requires more explicit instructions
- Better at natural language descriptions

## Usage Examples

### Natural Language Commands

```
User: "Generate a glossary for this document"
AI: [Calls use_glossary with action: "execute"]
    "I've generated a glossary with 23 key terms organized by category..."

User: "Search for mentions of consciousness"  
AI: [Calls search_document with query: "consciousness", type: "text"]
    "I found 12 mentions of 'consciousness' in the document..."

User: "Show me a detailed summary of the introduction"
AI: [Calls generate_summary with section: "intro", level: "detailed"]
    "Here's a detailed summary of the introduction section..."
```

### Multi-Step Operations

```
User: "Find all technical terms and create a glossary of just those"
AI: [Calls search_document with type: "semantic", query: "technical terminology"]
    [Calls use_glossary with action: "execute", filter: "technical"]
    "I've searched for technical terms and generated a focused glossary..."
```

## Success Criteria

1. LLM can successfully invoke all registered tools
2. Natural language commands map correctly to functions
3. Security layer prevents malicious usage
4. Performance overhead < 100ms per function call
5. Works consistently across Claude and Gemini
6. Clear audit trail of all function executions

## Risks & Mitigations

1. **Prompt injection** - Sanitize all inputs, use parameter schemas strictly
2. **Resource exhaustion** - Rate limiting, execution timeouts
3. **Data leakage** - Never include sensitive data in function results
4. **Hallucinated functions** - Validate function names against registry
5. **Infinite loops** - Limit function chains, add circuit breakers
6. **Cost explosion** - Monitor token usage, set limits per user

## Future Considerations

- Function composition and workflows
- User-defined custom functions
- Async/streaming function results
- Function result caching across sessions
- A/B testing different function strategies
- Fine-tuning models on function usage patterns

## Related Documents

### Prerequisites (must be completed first)
- `planning/finished/250614b_unified_tool_registry_architecture.md` - Core registry (COMPLETED)
- `planning/finished/250614c_command_palette_dynamic_generation.md` - Dynamic commands (COMPLETED)
- `planning/250614d_tool_execution_framework.md` - Execution framework (dependency)

### Related
- `planning/finished/250614a_tool_url_state_management.md` - URL state integration
- `planning/finished/250615a_url_state_single_source_of_truth.md` - URL as SoT
- `planning/critiques/o3__CRITIQUE__OF__250614b_unified_tool_registry_architecture.md` - External review that informed the split approach


## Appendix - critique from o3 AI

Critique of planning/250614e_llm_tool_function_calling.md  
(against the backdrop of the recently-finished Tool Execution Framework and overall tool architecture)

────────────────────────────────────────
Overall
────────────────────────────────────────
The document is ambitious and mostly on-point, but it occasionally drifts out of sync with the freshly-implemented execution framework and registry-driven architecture.  The biggest risks are (a) duplicating logic that already lives in the executor layer, (b) leaving a few critical integration details vague, and (c) under-estimating provider quirks and security hardening.

────────────────────────────────────────
1  Alignment with Tool Execution Framework (250614d, TOOL_EXECUTION_FRAMEWORK.md)
────────────────────────────────────────
•  Validation & execution boundaries  
  – The executor already owns Zod validation, routing, timeouts, correlation IDs, and RFC 9457 error shaping.  
  – 250614e proposes its own “wrapper validates and executes” step.  That would duplicate work and create two sources of truth.  
  → Recommendation: have the LLM function wrapper delegate straight to `executeTool()` (or the generated typed wrappers) and never perform a second validation pass.  The only extra logic the LLM layer needs is provider-specific argument/response marshalling.

•  Result shape  
  – 250614e’s example result embeds `{ name, result: { … } }`.  
  – The executor purposely returns “no envelope” JSON plus metadata, and surfaces errors via RFC 9457.  
  → Spell out a deterministic mapping from executor responses to the provider format (e.g. Claude’s `tool_response`) without re-wrapping successful data.  Consistency matters for caching, audit, and tests.

•  Security / rate limits  
  – The executor exposes per-tool timeout configuration and will soon expose rate limiting helpers (see Stage “Security implementation” in 250614e).  
  – Keep *all* throttling at the executor or API-middleware layer; the LLM façade should simply respect 429 responses and surface them to the model.

────────────────────────────────────────
2  Schema generation design
────────────────────────────────────────
•  Source-of-truth for schemas  
  – All tools already declare their Zod schemas in the registry; re-defining them in `lib/tools/llm/types.ts` risks drift.  
  → Generate OpenAPI/Claude/Gemini schemas by introspecting the registry entries directly.  That makes new tools instantly available to the chat agent without extra code.

•  Enum vs union types  
  – Some tool parameter types use Zod unions (e.g. search `type: 'text' | 'semantic'`).  Confirm your Zod-to-OpenAPI converter handles these (many OSS converters stumble here).

•  Nested object refs  
  – Several tools embed deep objects (e.g. summary granularity options).  Decide whether to flatten or use `$ref` components; Claude currently dislikes `$ref`, Gemini is fine.  Document that decision.

────────────────────────────────────────
3  Provider-specific quirks
────────────────────────────────────────
•  Claude function_call streaming  
  – Claude can emit a partial `function_call` message *before* all arguments are present.  Specify how your parsing layer will buffer or resume the stream.

•  Gemini hallucination mitigation  
  – The doc notes that Gemini “may hallucinate function names more often”.  Add concrete safeguards: reject unknown names, log the attempted call, and feed back an error tool response so the model can retry.

•  Token cost explosion  
  – Schema lists for seven tools are ~2 k tokens uncompressed.  Plan compression or selective exposure; e.g. only include the two most-likely tools for the current conversation context.

────────────────────────────────────────
4  User-consent UX
────────────────────────────────────────
The plan says “Show what AI will do before execution (initially)”.  Good for safety, but:

•  This is orthogonal to function calling; it belongs in the chat UI layer, not the LLM wrapper.  
•  Decide the approval mechanism now (modal vs toast vs inline diff) because it drives what metadata the wrapper must return (e.g. a prettified summary of arguments).

────────────────────────────────────────
5  Audit & observability
────────────────────────────────────────
•  The executor already forwards correlation IDs into Supabase audit tables.  250614e should explicitly reuse those IDs instead of generating new ones, or we’ll lose end-to-end traces.

•  Function-call telemetry: consider tagging each audit row with `invoked_by_llm: true/false` so we can compare AI vs user-triggered tool usage.

────────────────────────────────────────
6  Testing strategy
────────────────────────────────────────
•  You list “Use subagent for comprehensive testing” but omit contract tests between wrapper → executor → handlers.  
  – Add golden-file tests: given a `function_call` JSON, assert the executor sees precisely the same validated params.  This will catch marshalling bugs early.

•  Provider regression tests: snapshot Claude & Gemini responses for edge-case schemas (enums, nested objects, optionals).

────────────────────────────────────────
7  Security hardening gaps
────────────────────────────────────────
•  Prompt-injection surface  
  – LLM can supply strings that become SQL pattern inputs or regexes (search tool).  Sanitisation layer is mentioned but needs explicit mapping: which Zod refinements or helper functions will be auto-applied?

•  Long-running chains  
  – Multi-step orchestration could yield runaway loops (LLM A calls tool, gets data, immediately asks to refresh, ad infinitum).  Define a per-conversation execution budget (N calls or T seconds) enforced by the wrapper.

────────────────────────────────────────
8  Stage planning realism
────────────────────────────────────────
Several stages could be merged to reduce overhead:

•  “Schema generation implementation” and “Provider integration – Claude” are tightly coupled—Claude formatting is just a projection of the OpenAPI schema.  Combining them will keep conversions in one file and avoid drift.

•  “Security implementation” can be incremental: start with parameter sanitisation and permission checks; rate limiting and audit trail already exist in the executor.

────────────────────────────────────────
Quick-win recommendations
────────────────────────────────────────
1.  Generate provider schemas directly from the tool registry; drop any parallel schema definitions.  
2.  Make the LLM wrapper a very thin layer:  
   – translate provider ↔ executor JSON  
   – call `tools.<id>.<action>()`  
   – map executor responses/errors back.  
3.  Adopt the executor’s RFC 9457 error objects 1-for-1; do *not* invent a `{ name, error }` envelope.  
4.  Add a “max function_calls_per_turn” and “max function_chain_depth” constant now—cheap insurance.  
5.  Clarify the consent UX flow and the data contract it needs before coding Stage “Chat interface enhancement”.

────────────────────────────────────────
Conclusion
────────────────────────────────────────
The plan is directionally correct and leverages modern function-calling capabilities well.  Tightening its coupling with the existing executor, clarifying provider quirks, and sharpening security/observability details will prevent duplication and integration friction.  With those adjustments, Stage-by-Stage implementation should proceed smoothly.
