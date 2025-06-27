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