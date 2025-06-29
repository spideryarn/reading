# Glossary Iterate Action Implementation

## Goal, context

Replace the current semantic mismatch where the glossary tool uses the `execute` action but behaves iteratively. The glossary currently adds entities in batches with "Load More" functionality, which is semantically an iterative operation but incorrectly uses the `execute` action. This creates confusion and inconsistency in the tool execution framework.

The glossary needs to be migrated to use a proper `iterate` action that accurately reflects its progressive, batch-based entity generation behavior. This will establish a consistent pattern for other iterative tools and improve semantic clarity across the tool ecosystem.

## User stories & acceptance criteria

**As a developer, I want the glossary to use semantically correct actions** so that the tool execution framework is consistent and predictable.

**Acceptance criteria:**
- Glossary uses `iterate` action for progressive entity generation
- Existing "Load More" functionality remains unchanged for users
- Backward compatibility maintained during transition period
- Other iterative tools can follow the same pattern

**As a user, I want the glossary experience to remain unchanged** so that my workflow is not disrupted during the technical migration.

**Acceptance criteria:**
- UI behavior identical before and after migration
- "Load More" button continues to work as expected
- Progressive entity loading maintains same performance characteristics
- Entity storage and caching behavior unchanged

## References

- `docs/reference/TOOL_EXECUTION_FRAMEWORK.md` - Current framework only supports execute, open, refresh actions
- `lib/tools/executor/types.ts` - Type definitions for tool execution framework requiring extension
- `lib/tools/implementations/glossary.ts` - Current glossary tool definition using execute action
- `app/api/tools/[toolId]/handlers/glossary.ts` - Handler implementation with iterative logic under execute action
- `docs/reference/TOOL_GLOSSARY.md` - Documents current progressive loading behavior
- `planning/250629b_iterative_heading_generation_operation_limited.md` - Shows plans for iterate action in structure tool
- `components/tools/GlossaryPanel.tsx` - Frontend component using execute action for iterative behavior

## Principles, key decisions

**Semantic accuracy over backward compatibility**: The current `execute` action for iterative behavior is semantically incorrect and should be fixed, even if it requires framework changes.

**Framework extension approach**: Add `iterate` action to the core tool execution framework as a first-class citizen, not as a tool-specific workaround.

**Gradual migration strategy**: Support both `execute` and `iterate` actions during transition to ensure zero-disruption deployment.

**Consistency across iterative tools**: Establish `iterate` as the standard pattern for progressive operations (glossary, structure/headings, future tools).

**Preserve existing behavior**: Users should see no functional changes, only improved semantic accuracy under the hood.

## Stages & actions

### Stage: Framework foundation - Add iterate action support
- [ ] Extend tool execution framework to support `iterate` action:
  - [ ] Add `iterate` to action types in `lib/tools/executor/types.ts:56` (`ToolExecutionParams.action`)
  - [ ] Update `ToolWrapper` interface to include `iterate` method alongside `execute`, `open`, `refresh`
  - [ ] Modify `generateToolWrappers()` function to create `iterate` method wrappers
  - [ ] Ensure type safety across all tool wrapper generation
- [ ] Update tool execution routing to handle `iterate` action:
  - [ ] Modify core executor logic to route `iterate` actions to appropriate handlers
  - [ ] Ensure `iterate` follows same authentication and error handling patterns as `execute`
  - [ ] Validate that `iterate` integrates properly with existing timeout and cancellation mechanisms
- [ ] Run `npm run check:health` to ensure framework changes don't break existing tools

### Stage: Glossary tool definition updates
- [ ] Update glossary tool configuration:
  - [ ] Modify `lib/tools/implementations/glossary.ts:59` to add `iterate` to `serverOperations` array
  - [ ] Keep `execute` in `serverOperations` during transition period for backward compatibility
  - [ ] Update tool metadata to reflect iterative nature
- [ ] Verify tool registry correctly recognizes both actions:
  - [ ] Test that glossary tool is discoverable with both `execute` and `iterate` actions
  - [ ] Ensure tool wrapper generation creates both methods correctly

### Stage: API handler adaptation
- [ ] Extend `GlossaryHandler.handlePost()` to support `iterate` action:
  - [ ] Add action-based routing within `handlePost()` method
  - [ ] Route `iterate` action to existing iterative logic (current `execute` implementation)
  - [ ] Maintain `execute` action support for backward compatibility
  - [ ] Ensure identical behavior between `execute` and `iterate` during transition
- [ ] Validate handler integration:
  - [ ] Test both `execute` and `iterate` actions produce identical results
  - [ ] Verify error handling works consistently for both actions
  - [ ] Confirm timeout and cancellation behavior is preserved

### Stage: Frontend component migration
- [ ] Update `GlossaryPanel.tsx` to use `iterate` action:
  - [ ] Replace calls to `tools.glossary.execute()` with `tools.glossary.iterate()`
  - [ ] Update button text/labels if needed to reflect iterative semantics
  - [ ] Ensure loading states and progress indicators work with new action
- [ ] Test UI integration:
  - [ ] Verify "Load More" functionality works identically with `iterate` action
  - [ ] Test error states and edge cases with new action
  - [ ] Confirm cancellation and timeout handling in UI

### Stage: Documentation and framework documentation
- [ ] Update tool execution framework documentation:
  - [ ] Add `iterate` action to `docs/reference/TOOL_EXECUTION_FRAMEWORK.md`
  - [ ] Document when to use `iterate` vs `execute` actions
  - [ ] Provide examples of iterative tool patterns
- [ ] Update glossary-specific documentation:
  - [ ] Revise `docs/reference/TOOL_GLOSSARY.md` to document `iterate` action usage
  - [ ] Update action semantics and progressive loading descriptions
  - [ ] Add migration guidance for developers

### Stage: Testing and validation
- [ ] Update existing tests to use `iterate` action:
  - [ ] Modify glossary-related tests to test both `execute` and `iterate` actions
  - [ ] Ensure test coverage for action transition compatibility
  - [ ] Verify E2E tests work with new action
- [ ] Run comprehensive testing:
  - [ ] Use subagent to run full test suite: `npm test`
  - [ ] Test both actions in development environment
  - [ ] Verify no regressions in glossary functionality

### Stage: Rollout and cleanup
- [ ] Deploy with dual action support:
  - [ ] Monitor for any issues with `iterate` action in production
  - [ ] Gather feedback on new action semantics
  - [ ] Verify performance characteristics remain unchanged
- [ ] Plan deprecation of `execute` for iterative operations:
  - [ ] Add deprecation warnings for `execute` action on iterative tools
  - [ ] Provide clear migration timeline for other tools
  - [ ] Document migration path for future iterative tools
- [ ] Final health check and cleanup:
  - [ ] Run `npm run build` to ensure TypeScript compilation succeeds
  - [ ] Run `npm run lint` to verify code quality standards
  - [ ] Use subagent to run `npm test` for final validation
- [ ] Move doc to `planning/finished/` and commit

## Appendix

### Appendix A: Current Glossary Iterative Behavior Analysis

**Progressive Loading Pattern:**
- Initial request: No `existing_entities` parameter, returns first batch (20 entities)
- Continuation requests: Include `existing_entities` parameter with previous results
- Response includes `hasMore`/`more_entities_available` signal for UI state management
- Individual entity storage supports incremental updates

**Action Semantic Mismatch:**
- Current: Uses `execute` action which implies "run once and complete"
- Reality: Performs iterative progression with continuation signals
- Correct: Should use `iterate` action which implies "progressive steps toward completion"

### Appendix B: Framework Integration Points

**Core Type Updates Required:**
```typescript
// lib/tools/executor/types.ts
interface ToolExecutionParams {
  action: 'execute' | 'open' | 'refresh' | 'iterate'  // Add iterate
  // ... rest unchanged
}

interface ToolWrapper {
  execute: (parameters?, options?) => Promise<ToolExecutionResult>
  open: (parameters?, options?) => Promise<ToolExecutionResult>
  refresh: (parameters?, options?) => Promise<ToolExecutionResult>
  iterate: (parameters?, options?) => Promise<ToolExecutionResult>  // New
}
```

**Handler Pattern for Dual Support:**
```typescript
// app/api/tools/[toolId]/handlers/glossary.ts
async handlePost(action: string, parameters: Record<string, unknown>, context: ExecutionContext) {
  switch (action) {
    case 'execute':
      // Legacy support - same logic as iterate
      return this.handleIterativeGeneration(parameters, context)
    case 'iterate':
      // New semantic action
      return this.handleIterativeGeneration(parameters, context)
    default:
      throw createHandlerError(`Unsupported action: ${action}`, 'validation')
  }
}
```

### Appendix C: Migration Strategy for Other Tools

**Structure Tool Preparation:**
- The structure/headings tool is already planned to use `iterate` action (per `planning/250629b_iterative_heading_generation_operation_limited.md`)
- This glossary migration establishes the framework foundation needed for structure tool implementation
- Creates consistent pattern for all progressive/iterative tools

**Future Iterative Tools:**
- Summary tool could benefit from progressive summarization
- Search tool might use iterative refinement
- Chat tool already has natural iterative conversation pattern

### Appendix D: Backward Compatibility Strategy

**Transition Period Support:**
- Support both `execute` and `iterate` actions with identical behavior
- Gradual migration of frontend components to use `iterate`
- Deprecation warnings for `execute` on iterative tools
- Clear documentation on when to use each action

**Long-term Vision:**
- `execute`: One-shot operations that complete fully
- `iterate`: Progressive operations with continuation signals
- `open`: Navigation/URL state changes
- `refresh`: Cache invalidation and data reloading

### Appendix E: AI Model Critique (o3-latest)

The following critique was generated using the automated critique process described in `docs/instructions/GATHER_DIVERSE_INPUTS_AND_CRITIQUES_ON_PLANNING_DOCS_FROM_OTHER_AI_MODELS_API_APPROACH.md`:

```
Critique of planning/250629c_glossary_iterate_action_implementation.md
======================================================================

Executive summary  
‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾  
The document correctly identifies the semantic mismatch around using `execute` for progressive glossary generation and outlines a sensible migration path towards a dedicated `iterate` action.  The high-level stages are sound and well-sequenced.  However, several important knock-on effects, typing breakages, and cross-cutting design questions are missing.  Addressing them early will prevent widespread compiler errors and architectural drift.

---------------------------------------------------------------------
1.  Architecture & API‐surface impacts
---------------------------------------------------------------------

1.1  Incomplete action-type propagation  
•  ToolExecutionParams (lib/tools/executor/types.ts:54) will gain `'iterate'`, but the planning doc forgets to update:  
  – ToolApiRequest.action (types.ts:314)  
  – ToolExecutionResult.metadata.action (types.ts:105)  
  – Error messages in executor, loggers, analytics, and Pino redaction lists.  
  A quick grep shows ≥15 literal `'execute' | 'open' | 'refresh'` discriminants elsewhere (generateToolWrappers, dev helpers, mock executor, test helpers).  All must be touched or the compiler will fail.

1.2  Wrapper-shape breakage  
ToolWrapper (types.ts:378) is extended to include `iterate()`.  Code that treats `ToolWrapper` polymorphically (e.g. in hooks or dev-helpers) will now have to supply an implementation for `iterate` **for every tool**, even those that are one-shot only.  Options:  
  a) make `iterate` optional (`iterate?: (…) => …`) and generate a default "unsupported" stub, or  
  b) generate wrappers conditionally but return a discriminated union rather than a single interface (bigger refactor).  
Without this, non-iterative tools will fail type-checking at build time.

1.3  Registry / serverOperations confusion  
glossary.ts:59 currently lists `['execute', 'refresh', 'generate']`.  Introducing `iterate` makes three progressive actions.  Decide whether `generate` is deprecated (it appears unused) or alias it to `iterate` to avoid cognitive load.

1.4  Formal contract for iterative tools  
The plan adds `iterate` but does **not** define the minimal request/response contract common to all iterative tools.  Recommend specifying:

```
POST /api/tools/<tool>
{
  action: "iterate",
  parameters: {
    cursor?: string   // opaque progress token
    batchSize?: number
    existing_entities?: [...]
  }
}

Response
{
  data: {...},               // tool-specific
  moreItemsAvailable: bool,  // REQUIRED
  cursor?: string            // server-returned progress token
}
```

Defining this now prevents each tool inventing its own continuation parameters (`existing_entities` for glossary, `existing_operations` for headings, etc.).

---------------------------------------------------------------------
2.  Typing & build considerations
---------------------------------------------------------------------

2.1  CI breakage scope  
Adding a literal `'iterate'` union member will cascade through >80 compiled files.  Plan to stage PRs:

• PR-1: Framework types + executor stub + generated stubs for all tools (no behaviour change).  
• PR-2: Glossary migration.  
This keeps `main` branch buildable between stages.

2.2  Tests & mocks  
The jest mocks in lib/tools/executor/development-helpers.ts and tests that call `executeTool('glossary', 'execute', …)` will need fixtures for `'iterate'`.  Budget time for CI stabilisation (currently ~57 % suites pass).

---------------------------------------------------------------------
3.  Back-compat & rollout strategy
---------------------------------------------------------------------

3.1  Dual-action period  
The document states "support both execute and iterate", but the frontend migration stage removes all `execute()` calls immediately.  Doing both in the same deploy removes the safety net.  Recommend:

• ship framework + server handler with alias `iterate → execute`,  
• monitor prod logs for 24 h,  
• migrate frontend, then deprecate.

3.2  Feature flag  
Consider a simple env flag `TOOLS_ITERATE_ENABLED` checked inside `generateToolWrappers`.  Allows instant rollback without redeploying code.

---------------------------------------------------------------------
4.  Glossary-specific concerns
---------------------------------------------------------------------

4.1  Idempotence & concurrency  
Today each "Load More" call is independent because the client passes `existing_entities`.  Moving to `iterate` you may accidentally create duplicate AI-calls if the user double-clicks the button and both requests race.  Add a mutex or look-up recent unfinished ai_calls before submitting a new one (ai_calls.status='pending') in the handler.

4.2  Cache-key versioning  
EnhancementService.storeGlossary is now deprecated in favour of per-entity storage.  Ensure iterate calls append rather than overwrite rows to keep cache valid across batches.

---------------------------------------------------------------------
5.  Documentation gaps
---------------------------------------------------------------------

• TOOL_EXECUTION_FRAMEWORK.md must be expanded with a clear definition of iterative actions and generic request/response semantics (see §1.4).  
• CLAUDE.md and TOOL_ARCHITECTURE_AND_DEVELOPMENT_GUIDE.md reference "execute/open/refresh"; update.  
• Changelog entry—developers grepping docs will otherwise miss the change.

---------------------------------------------------------------------
6.  Alternative / refinement suggestions
---------------------------------------------------------------------

6.1  "continuation" instead of "iterate"  
If you expect many tools to support progressive loading but with heterogeneous behaviours (paginated, cursor-based, stream-based), a generic "continue" or "next" action with optional `cursor` parameter is more flexible.  Decide now; later rename is painful.

6.2  Optional generics  
Make ToolWrapper generic:

```
interface ToolWrapper<TServerOps extends string = never> {
  execute: ...
  open: ...
  refresh: ...
} & Record<TServerOps, (...args) => Promise<ToolExecutionResult>>
```

Glossary wrapper would be `ToolWrapper<'iterate'>`.  Avoids adding empty stubs to every tool.

---------------------------------------------------------------------
7.  Minor / editorial points
---------------------------------------------------------------------

• Stage checklist should include updating ToolExecutionResult.metadata.action union.  
• "Update button text/labels if needed" contradicts "UI behaviour identical"; clarify.  
• Run `npm run lint --fix` after adding new union member—several exhaustive switch statements will complain.

---------------------------------------------------------------------
Recommendation summary
---------------------------------------------------------------------

1.  Add a "Framework Prep" section explicitly listing **all** type\-level surfaces to be touched (ToolExecutionParams, ToolApiRequest, ToolExecutionResult, ToolWrapper, tests, dev helpers).  
2.  Decide and document a minimal iterate/continuation JSON contract.  
3.  Provide a migration timeline with a feature flag and two-phase deployment.  
4.  Define wrapper-generation strategy for tools that do **not** support iterate to avoid type churn.  
5.  Address concurrency / duplicate AI-call risk in the handler.  
6.  Update documentation set consistently (at least 4 files highlighted above).  

With these additions the plan will be comprehensive and low-risk to implement.
```

### Appendix F: Open Questions for Clean Final State Discussion

The following questions arose from analyzing how to ensure a clean codebase with no backwards compatibility cruft left behind:

## Key Questions About Clean Final State

**1. Action Naming & Long-term Semantics**
The o3 critique raises an interesting point: should we call it `iterate` or something more generic like `continue`/`next`? If we're building for the future, we want:
- Clear semantic meaning that won't become confusing
- Flexibility for different continuation patterns (cursor-based, page-based, stream-based)
- Consistency across tools

**Question**: Do you see this as specifically about "iteration" (repeating the same operation) or more broadly about "continuation" (progressive operations that may vary)?

**2. Type System Design Strategy**
The critique identifies a fundamental architectural choice:
- **Option A**: Make `iterate` optional on ToolWrapper (`iterate?: ...`) with default "unsupported" stubs
- **Option B**: Use conditional wrapper generation with discriminated unions
- **Option C**: Generic ToolWrapper interfaces (`ToolWrapper<'iterate'>`)

**Question**: Which approach aligns better with your vision for type safety vs. simplicity? Option C seems cleanest long-term but requires more upfront design.

**3. Cleanup Timeline & Enforcement**
For ensuring no backwards compatibility cruft remains, we could:

**Immediate cleanup approach:**
- Use feature flags during rollout
- Hard deadline for `execute` removal (e.g., 2 weeks after successful deployment)
- Automated linting rules that flag deprecated patterns
- TypeScript strict mode to catch lingering action string literals

**Gradual cleanup approach:**
- Keep `execute` as an alias indefinitely for some tools
- Focus on semantic clarity rather than elimination
- Accept some duplication for stability

**Question**: How aggressive should we be about cleanup? The more aggressive, the cleaner the end state, but higher risk.

**4. Standardized Iteration Contract**
The o3 critique suggests defining a universal iteration contract now:
```typescript
{
  cursor?: string,
  moreItemsAvailable: boolean,
  batchSize?: number
}
```

This prevents each tool from inventing its own parameters. But it also means deciding the abstraction level upfront.

**Question**: Should we standardize the iteration interface now, or let it emerge organically from the first few tools then refactor?

## My Recommendation for Clean End State

I lean toward being **moderately aggressive** about cleanup:

1. **Use feature flags** for safe rollout but with hard removal timeline
2. **Design generic continuation contract** upfront to avoid per-tool inconsistencies  
3. **Choose descriptive action name** that won't become semantically confusing (`continue` vs `iterate`)
4. **Use conditional wrapper generation** to avoid bloating non-iterative tools
5. **Add linting rules** to prevent new code using deprecated patterns
6. **Document the migration explicitly** so future developers understand the history

What's your preference on the aggressiveness of cleanup vs. the risk tolerance? And do you have thoughts on the action naming question - `iterate` vs `continue` vs something else?