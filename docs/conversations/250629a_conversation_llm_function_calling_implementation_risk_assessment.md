---
Date: 2025-06-29
Duration: ~30 minutes
Type: Decision-making
Status: Active
Related Docs: planning/250614e_llm_tool_function_calling.md
---

# LLM Function Calling Implementation Risk Assessment - 29 June 2025

## Context & Goals

Following the update of the LLM function calling planning document based on external critiques from o3 and Gemini AI models, a discussion emerged about implementation risks. The user wanted to understand "whether there's much risk that in the process of doing this work, we break existing code, or is it purely additive."

## Key Background

The updated plan emphasizes a **thin wrapper approach** that delegates to the existing `executeTool()` framework rather than creating parallel validation/execution systems. The external critiques identified critical architectural alignment issues that were incorporated into the revised plan.

User's core concern: **"Do you think there's much risk that in the process of doing this work, there's much risk that we break existing code, or is it purely additive?"**

## Risk Assessment Discussion

### Low-Risk Areas (Purely Additive)
The majority of the LLM function calling implementation consists of entirely new code:
- Schema generation (`lib/tools/llm/schema-generator.ts`) - new file
- Provider adapters (`lib/tools/llm/providers/*`) - new files  
- Function executor wrapper (`lib/tools/llm/function-executor.ts`) - new file
- Most integration work - new code paths

### Moderate-Risk Areas (Modifying Existing Code)

**1. Tool Registry Interface Enhancement**
```typescript
// Adding new fields to Tool interface
executionSafety: 'read-only' | 'generative' | 'mutative' | 'local-nav'
parameterSchemas: Record<string, z.ZodSchema>
```
**Risk**: If not done with backward compatibility (making fields optional initially), could break existing tool definitions.

**2. Executor Validation Update**
The plan mentions "Update executor to use these schemas for validation" - this touches the core execution path.
**Risk**: If the executor currently has placeholder validation, replacing it could introduce bugs.

**3. Chat API Handler**
Adding function calling to the existing chat handler means modifying request/response flow.
**Risk**: Could break existing chat functionality if not careful with conditional logic.

**4. Chat UI Integration** 
Adding consent UI means modifying the chat message flow and component structure.
**Risk**: Could affect existing chat rendering/interactions.

## Mitigation Strategies Identified

1. **Make new fields optional initially**:
   ```typescript
   executionSafety?: ExecutionSafety  // Optional at first
   parameterSchemas?: Record<string, z.ZodSchema>
   ```

2. **Feature flag the function calling**:
   ```typescript
   if (response.function_call && ENABLE_FUNCTION_CALLING) {
     // New code path
   } else {
     // Existing behavior unchanged
   }
   ```

3. **Comprehensive test coverage** before making changes

4. **Incremental rollout** - implement schemas for one tool at a time

## Risk Level Assessment

**Overall Assessment: Low to moderate risk** with proper care.

The biggest risk identified was in the executor validation update, but since the executor already expects Zod schemas (just doesn't have them yet), this might actually be fixing a gap rather than changing behavior.

## Key Architecture Insight

The architecture is well-designed to minimize breaking changes because:
- The thin wrapper approach means minimal touching of existing code
- Most functionality is purely additive
- The existing tool execution framework provides a stable foundation
- Feature flags can isolate new functionality during development

## Decision Framework

The conversation established that while there are some modification points, the **risks are manageable** through:
- Backward compatibility practices
- Feature flagging
- Incremental implementation
- Comprehensive testing

The benefits of the thin wrapper approach (leveraging existing robust infrastructure) significantly outweigh the implementation risks.

## Next Steps

Implementation should proceed with emphasis on:
1. Making all new tool interface fields optional initially
2. Using feature flags for function calling features
3. Implementing comprehensive tests before touching existing validation
4. Rolling out tool schemas incrementally

## Sources & References

- **Updated Planning Document**: `planning/250614e_llm_tool_function_calling.md`
- **External Critiques**: Referenced o3 and Gemini AI feedback incorporated into the plan
- **Tool Architecture Guide**: `docs/reference/TOOL_ARCHITECTURE_AND_DEVELOPMENT_GUIDE.md`
- **Tool Execution Framework**: `planning/finished/250614d_tool_execution_framework.md`

## Related Work

This risk assessment informs the implementation strategy for the LLM function calling feature and establishes confidence that the work can proceed without significant disruption to existing functionality.