# LLM Tool Function Calling Integration

## Goal

Enable LLM-driven tool usage by:
- Generating OpenAPI-compatible function schemas from tool registry definitions
- Creating thin provider-specific adapters that translate to/from the existing executor
- Integrating with the chat interface for AI-assisted tool usage
- Supporting both Claude and Gemini function calling formats
- Leveraging existing validation, execution, and security infrastructure

## Context

Spideryarn Reading has a robust tool execution framework and a chat interface that could be enhanced by allowing the LLM to directly invoke tools on behalf of users. Currently:
- Chat can reference document content but cannot trigger tools
- Users must manually switch tabs and click buttons
- No programmatic interface for AI to use tools
- Each LLM provider has different function calling formats
- We have a complete tool executor that handles validation, auth, and execution

We need a thin translation layer that generates function schemas from tool registry definitions and maps LLM function calls to the existing `executeTool()` framework.

## References

- `docs/reference/TOOL_CHATBOT_ASSISTANT_UI_INTEGRATION.md` - Current chat implementation
- `docs/reference/LLM_PROMPT_TEMPLATES.md` - Nunjucks + Zod template system
- `lib/prompts/templates/chat.njk` - Chat prompt template to enhance
- `docs/planning/finished/250614b_unified_tool_registry_architecture.md` - Core tool registry (COMPLETED)
- `docs/planning/finished/250614c_command_palette_dynamic_generation.md` - Command generation (COMPLETED)
- `docs/planning/finished/250614d_tool_execution_framework.md` - Execution framework (COMPLETED)
- `docs/planning/finished/250614a_tool_url_state_management.md` - URL state for function results

## Principles & Key Decisions

1. **Thin wrapper approach** - LLM layer only translates between providers and executor
2. **Registry-driven schemas** - Generate all schemas from tool registry definitions
3. **Delegate to executor** - Use existing validation, auth, execution, and error handling
4. **Provider-agnostic core** - Keep provider specifics isolated in adapter modules
5. **Safety levels for consent** - Tools declare execution safety for dynamic UI decisions
6. **No duplicate validation** - Trust the executor's Zod validation completely
7. **URL-based navigation** - Tab changes must use URL state (see `docs/planning/finished/250615a_url_state_single_source_of_truth.md`)

## Stages & Actions

### Stage: Preparation and dependencies
- [x] ✅ COMPLETED: Core tool registry (250614b) - All 8 tools registered  
- [x] ✅ COMPLETED: Command palette generation (250614c) - Dynamic generation working
- [x] ✅ COMPLETED: Execution framework (250614d) - Complete with validation & error handling
- [ ] Review current chat implementation and assistant-ui integration
- [ ] Research Claude and Gemini function calling formats and requirements

### Stage: Add Zod schemas to tool definitions
- [ ] Enhance tool registry interface to include parameter schemas
  - [ ] Add `parameterSchemas: Record<string, z.ZodSchema>` to Tool interface
  - [ ] Add `executionSafety: 'read-only' | 'generative' | 'mutative' | 'local-nav'`
- [ ] Add Zod schemas for each tool's actions
  - [ ] Chat: send, execute, create, list, delete schemas
  - [ ] Glossary: open, execute, refresh schemas
  - [ ] Search: text, semantic search schemas
  - [ ] Summary: generate with granularity schemas
  - [ ] Structure: AI headings schemas
  - [ ] Highlights: add, remove, clear schemas
  - [ ] Metadata: view schemas
  - [ ] Tweet thread: generate schemas
- [ ] Update executor to use these schemas for validation
- [ ] Test validation with various parameter combinations

### Stage: Schema generation and provider adapters
- [ ] Create `lib/tools/llm/schema-generator.ts`
  - [ ] generateFunctionSchema(tool) - creates base schema from registry
  - [ ] extractActionEnum(tool) - gets valid actions from supportedActions
  - [ ] convertZodToOpenAPI(schema) - handles all Zod types
  - [ ] Handle union types and enums properly
- [ ] Create `lib/tools/llm/providers/claude.ts`
  - [ ] generateClaudeFunctions(tools) - converts all tools to Claude format
  - [ ] parseClaudeFunctionCall(response) - extracts function call
  - [ ] formatClaudeToolResponse(result, error?) - wraps executor response
  - [ ] Handle streaming function calls buffering
- [ ] Create `lib/tools/llm/providers/gemini.ts`
  - [ ] generateGeminiFunctions(tools) - converts all tools to Gemini format
  - [ ] parseGeminiFunctionCall(response) - extracts function call
  - [ ] formatGeminiToolResponse(result, error?) - wraps executor response
  - [ ] Add hallucination mitigation (validate function names)
- [ ] Test schema generation for all tools
- [ ] Test provider-specific format compliance

### Stage: Chat API integration
- [ ] Create `lib/tools/llm/function-executor.ts` (thin wrapper)
  - [ ] executeLLMFunction(functionCall, userId, sessionId)
  - [ ] Extract action from parameters
  - [ ] Map function name to toolId (e.g., 'use_glossary' → 'glossary')
  - [ ] Call executeTool(toolId, action, params, options)
  - [ ] Return result in provider-neutral format
- [ ] Update chat API route handler
  - [ ] Add function definitions to LLM calls based on provider
  - [ ] Parse function calls from responses
  - [ ] Execute via executeLLMFunction()
  - [ ] Format results back to LLM using provider adapter
  - [ ] Continue conversation with function results
- [ ] Update chat prompt template
  - [ ] Add available functions to system message
  - [ ] Include function calling instructions
  - [ ] Add examples based on provider
- [ ] Test end-to-end flow with both providers

### Stage: UI for function execution consent
- [ ] Add consent UI component
  - [ ] Show function name and parameters
  - [ ] Different UI based on executionSafety level
  - [ ] Auto-approve read-only operations (configurable)
  - [ ] Require confirmation for generative/mutative
- [ ] Integrate with chat message flow
  - [ ] Pending state while awaiting consent
  - [ ] Show execution progress
  - [ ] Display results or errors inline
- [ ] Add user preferences
  - [ ] Remember consent choices per tool
  - [ ] Option to always allow certain tools
- [ ] Test consent flow with various safety levels

### Stage: Error handling and provider quirks
- [ ] Add function name validation
  - [ ] Reject unknown function names immediately
  - [ ] Return helpful error to LLM for retry
  - [ ] Log attempted hallucinated functions
- [ ] Handle provider-specific issues
  - [ ] Claude: Buffer streaming function calls
  - [ ] Gemini: Extra validation for common hallucinations
  - [ ] Token optimization (selective tool exposure)
- [ ] Map executor errors to provider formats
  - [ ] Use RFC 9457 error details from executor
  - [ ] Format as provider expects for tool errors
- [ ] Add circuit breakers
  - [ ] Max functions per conversation turn
  - [ ] Max total function calls per session
  - [ ] Prevent infinite retry loops
- [ ] Test error scenarios comprehensively

### Stage: Integration testing
- [ ] Create integration test suite
  - [ ] Test all tools via LLM function calls
  - [ ] Verify parameter validation works
  - [ ] Check error handling and recovery
  - [ ] Test multi-step operations
- [ ] Cross-provider testing
  - [ ] Same prompts should work on both
  - [ ] Compare function call patterns
  - [ ] Verify consistent results
- [ ] Security testing
  - [ ] Attempt prompt injection
  - [ ] Try to bypass validation
  - [ ] Verify audit trails created
- [ ] Performance testing
  - [ ] Measure overhead vs direct calls
  - [ ] Test with many concurrent functions
  - [ ] Verify caching works properly

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

### Tool Registry Enhancement

```typescript
// Enhanced tool definition with Zod schemas
interface Tool {
  id: string
  name: string
  // ... existing properties
  executionSafety: 'read-only' | 'generative' | 'mutative' | 'local-nav'
  parameterSchemas: {
    open?: z.ZodSchema
    execute?: z.ZodSchema
    refresh?: z.ZodSchema
    // ... other actions
  }
}

// Example: Glossary tool with schemas
const glossaryTool: Tool = {
  id: 'glossary',
  name: 'Glossary',
  executionSafety: 'generative',
  executorConfig: {
    supportedActions: ['open', 'execute', 'refresh']
  },
  parameterSchemas: {
    execute: z.object({
      filter: z.enum(['all', 'technical', 'concepts']).optional(),
      refresh: z.boolean().default(false)
    }),
    open: z.object({
      term: z.string().optional()
    })
  }
}
```

### Generated Function Schema

```typescript
// Auto-generated from tool registry
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
      "filter": {
        "type": "string",
        "enum": ["all", "technical", "concepts"],
        "description": "Filter glossary terms by category"
      },
      "term": {
        "type": "string",
        "description": "Specific term to highlight when opening"
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
      filter: "technical"
    }
  }
}

// 2. Thin wrapper translates to executor call
const { action, ...parameters } = llmResponse.function_call.arguments
const toolId = llmResponse.function_call.name.replace('use_', '') // 'glossary'

// 3. Delegate to existing executor (with its validation, auth, error handling)
const result = await executeTool(
  toolId,
  action,
  parameters,
  { userId, sessionId, correlationId }
)

// 4. Executor returns direct JSON (no envelope) or RFC 9457 error
// Success case:
{
  glossaryTerms: [...],
  processingTime: 1500,
  metadata: {
    correlationId: "req_123",
    cached: false
  }
}

// 5. Provider adapter formats for LLM
const toolResponse = formatClaudeToolResponse(result)

// 6. LLM summarizes for user
"I've generated a glossary focusing on technical terms. Found 8 technical concepts 
including 'quantum computing', 'entanglement', and 'superposition'."
```

## Security Model

### Leveraging Existing Infrastructure

1. **Validation** - Executor uses tool's Zod schemas for all validation
2. **Authentication** - Executor's `validateAuth()` checks user permissions
3. **Error Handling** - RFC 9457 errors from executor provide security context
4. **Audit Trail** - Executor logs to `ai_calls` table with correlation IDs
5. **Rate Limiting** - Can be added to executor middleware layer

### Function Name Validation

```typescript
// First line of defense against hallucinated functions
function validateFunctionName(name: string): string | null {
  // Map function name to tool ID
  const toolId = name.replace('use_', '')
  
  // Check if tool exists in registry
  if (!toolRegistry.has(toolId)) {
    logger.warn({ functionName: name }, 'LLM attempted unknown function')
    return null
  }
  
  return toolId
}
```

### Execution Safety Levels

```typescript
// Tools declare their safety level for consent UI
type ExecutionSafety = 
  | 'read-only'    // Safe to auto-execute (search, view)
  | 'generative'   // Creates new content (summaries, headings)
  | 'mutative'     // Modifies document (highlights, structure)
  | 'local-nav'    // Only affects UI state (tab switches)

// Consent UI uses this to decide whether to prompt
const requiresConsent = (safety: ExecutionSafety, userPrefs: UserPrefs) => {
  if (safety === 'read-only' || safety === 'local-nav') {
    return userPrefs.requireConsentForReadOnly ?? false
  }
  return true
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

1. LLM can successfully invoke all registered tools via thin wrapper
2. Natural language commands map correctly to executor calls
3. Existing security infrastructure prevents malicious usage
4. Minimal performance overhead (< 50ms for translation layer)
5. Works consistently across Claude and Gemini
6. Audit trail via existing `ai_calls` table

## Risks & Mitigations

1. **Duplicate validation** - Use only executor's Zod validation, no second pass
2. **Function hallucination** - Validate names before calling executor
3. **Provider drift** - Comprehensive tests for each provider's format
4. **Schema complexity** - Start with simple tools, iterate on edge cases
5. **Token costs** - Selective tool exposure based on context
6. **Infinite loops** - Circuit breakers at wrapper level

## Future Considerations

- Function composition and workflows
- User-defined custom functions
- Async/streaming function results
- Function result caching across sessions
- A/B testing different function strategies
- Fine-tuning models on function usage patterns

## Related Documents

### Prerequisites (must be completed first)
- `docs/planning/finished/250614b_unified_tool_registry_architecture.md` - Core registry (COMPLETED)
- `docs/planning/finished/250614c_command_palette_dynamic_generation.md` - Dynamic commands (COMPLETED)
- `docs/planning/finished/250614d_tool_execution_framework.md` - Execution framework (COMPLETED)

### Related
- `docs/planning/finished/250614a_tool_url_state_management.md` - URL state integration
- `docs/planning/finished/250615a_url_state_single_source_of_truth.md` - URL as SoT
- `docs/planning/critiques/o3__CRITIQUE__OF__250614b_unified_tool_registry_architecture.md` - External review that informed the split approach

## Key Insights from External Reviews

Both o3 and Gemini critiques identified the same core improvements needed:

1. **Avoid duplicating the executor** - The LLM layer must be a thin wrapper that delegates to `executeTool()`
2. **Generate schemas from registry** - Don't maintain separate schema definitions
3. **Clarify the action parameter mapping** - LLM functions include action as a parameter, executor expects it separately
4. **Add execution safety levels** - Tools should declare their safety level for consent UI decisions
5. **Validate function names first** - Prevent hallucinated functions before they reach the executor

These insights have been incorporated throughout this updated plan to ensure we build on the existing robust infrastructure rather than creating parallel systems.

