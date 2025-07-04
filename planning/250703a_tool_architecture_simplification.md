# Tool Architecture Refinement

DISCUSS WITH USER FIRST:
- Remove the unused generated wrapper code (`lib/tools/executor/wrappers.ts`)
- Plugin architecture considerations
- Multi-tenant scenarios
- Complex execution patterns


## Goal

Refine the tools architecture to improve development speed and reduce complexity while **preserving the valuable abstractions** that enable current and planned functionality. The current architecture successfully solved real problems and enables important features - we should enhance it, not dismantle it.

## Context

After implementing the unified tool registry (250614b) and execution framework (250614d), we have a working system with:
- 7 successfully migrated tools
- 260/260 passing tests
- Type-safe tool discovery and execution
- Foundation for LLM integration (250614e)
- Consistent patterns across all tools

The critiques identified complexity, but missed the context of why these abstractions exist. Rather than removing working features, we should:
1. Remove genuinely unused code
2. Simplify where possible without breaking functionality
3. Document the rationale for necessary complexity
4. Make the system easier to understand and extend

## User Stories & Acceptance Criteria

### As a developer adding a new tool
- I can understand why each abstraction exists
- I can follow clear patterns from existing tools
- I have helpful error messages when I make mistakes
- The complexity serves a clear purpose

### As an AI agent developing features
- The type system guides me to correct implementations
- I can understand the architecture from documentation
- Common patterns are obvious and reusable
- Edge cases are handled gracefully

### As the system evolving over time
- The abstractions enable planned features (LLM integration)
- New requirements can be accommodated without major refactoring
- The architecture scales with the product vision
- Technical debt is minimized

## References

- `planning/finished/250614b_unified_tool_registry_architecture.md` - Registry implementation and rationale
- `planning/finished/250614d_tool_execution_framework.md` - Execution framework design decisions
- `planning/critiques/250630b_gemini_o3_tools_architecture_critique.md` - External analysis (lacks context)
- `docs/reference/CODING_PRINCIPLES.md` - Core principles to follow
- `docs/reference/VISION_PRODUCT_STRATEGY.md` - Product vision driving architectural needs

## Principles & Key Decisions

1. **Preserve working abstractions** - Don't remove features that enable planned functionality
2. **Document rationale** - Make it clear why each abstraction exists
3. **Remove only truly dead code** - Delete what has no purpose, keep what enables features
4. **Improve developer experience** - Better docs, examples, and error messages
5. **Respect Chesterton's fence** - Understand why something exists before removing it

## Stages & Actions

### Stage: Analysis and documentation
- [ ] Document the rationale for each "complex" abstraction:
  - Why dual execution paths exist (local vs server operations)
  - Why the error hierarchy is needed (user experience)
  - Why ExecutableTool extends Tool (execution configuration)
  - Why the registry has validation (development-time safety)
- [ ] Create a "Tool Architecture Rationale" document explaining design decisions
- [ ] Identify which properties are genuinely unused vs. planned for future use

### Stage: Remove genuinely dead code
- [ ] Remove properties with no current or planned use:
  - `configSchema` - if no validation is planned
  - `prerequisites` - if no dependency checking is planned
  - Remove only after confirming with product vision
- [ ] Clean up any test utilities that aren't used
- [ ] Remove any truly redundant error handling
- [ ] Run health checks: `npm run check:health`

### Stage: Simplify configuration patterns
- [ ] If multiple configuration patterns exist for historical reasons:
  - Document why each exists
  - Provide migration path if consolidating
  - Keep backward compatibility during transition
- [ ] Standardize timeout configuration if inconsistent
- [ ] Ensure all tools follow the established pattern
- [ ] Update examples to show best practices

### Stage: Improve type safety without removing features
- [ ] Add better TypeScript constraints where helpful
- [ ] Improve IntelliSense documentation
- [ ] Add runtime validation where it prevents errors
- [ ] Create type guards for common patterns
- [ ] Test that type safety actually helps developers

### Stage: Enhance developer experience
- [ ] Improve error messages to explain what went wrong and why
- [ ] Add more examples to documentation
- [ ] Create troubleshooting guide for common issues
- [ ] Add comments explaining non-obvious design decisions
- [ ] Create tool development checklist

### Stage: Optimize without breaking
- [ ] Profile actual performance bottlenecks
- [ ] Optimize only measured slow paths
- [ ] Keep abstractions that enable features
- [ ] Document any performance trade-offs
- [ ] Maintain comprehensive test coverage

### Stage: Future-proof responsibly
- [ ] Document which abstractions enable future features
- [ ] Create ADRs for significant decisions
- [ ] Plan migration paths for when features are needed
- [ ] Keep the architecture extensible
- [ ] Avoid premature optimization

### Stage: Validation and documentation
- [ ] All tests still pass (260/260)
- [ ] New tool creation is still straightforward
- [ ] LLM integration path remains clear
- [ ] Documentation explains the "why"
- [ ] Git commit with rationale

## Appendix

### Understanding the Current Architecture

The current architecture includes several intentional design decisions:

1. **Registry System**
   - Enables dynamic command palette generation
   - Provides type-safe tool discovery
   - Foundation for LLM function calling
   - Prevents runtime errors through validation

2. **Execution Framework**
   - Dual paths handle different operation types correctly
   - Comprehensive error handling improves user experience
   - Correlation IDs enable debugging in production
   - Type-safe wrappers prevent parameter errors

3. **Tool Interface**
   - Rich metadata enables intelligent features
   - Capabilities support future plugin systems
   - URL state integration enables deep linking
   - Category system helps organization

### What Actually Needs Simplification

Based on analysis, these areas could be simplified without losing functionality:

1. **Configuration Consolidation**
   - Multiple patterns for historical reasons
   - Can be unified with migration path
   - Keep backward compatibility temporarily

2. **Documentation Improvements**
   - Explain why complexity exists
   - Provide more examples
   - Better troubleshooting guides

3. **Error Message Clarity**
   - Technical errors need user-friendly messages
   - Stack traces should be more actionable
   - Recovery suggestions for common failures

### Measuring Success

Success should be measured by:
- Developer velocity (time to add new tools)
- Error rates (fewer runtime failures)
- Code comprehension (survey/feedback)
- Feature enablement (can we still build planned features?)

The goal is refinement, not revolution. The current architecture works - let's make it work better.


## Appendix - critique from o3 AI

Ran tool
Ran tool
Ran tool
Ran tool
Ran tool
Ran tool

Read file: lib/services/user-error-messages.ts

Read file: lib/tools/executor/types.ts

Read file: app/api/tools/[toolId]/route.ts

Read file: docs/reference/LOGGING_BEST_PRACTICES.md

Ran tool

Below is a structured critique of `planning/250703b_descriptive_error_message_propagation.md`, prepared using the guidance in `docs/instructions/CRITIQUE_OF_PLANNING_DOC.md` and after reviewing the relevant code and documentation (notably the existing `UserErrorMessageService`, tool-executor error hierarchy, RFC 9457 “Problem Details” implementation, logging patterns, and coding principles).

============================================================
CRITIQUE
============================================================

1. Problem Characterisation  
   • The document correctly identifies pain-points: generic “Something went wrong” replies, context loss through layers, and inconsistent patterns.  
   • It also recognises the partial solutions already in place (e.g. `UserErrorMessageService` and the tools error hierarchy) and seeks to generalise them—that’s good.

2. Alignment with Existing Architecture  
   a. Existing user-facing error layer  
      - `lib/services/user-error-messages.ts` already converts low-level errors into actionable user messages and categories:  
        ```1:20:lib/services/user-error-messages.ts
        export class UserErrorMessageService {
        // ...
        ```  
        The new proposal to “Enhance UserErrorMessageService” is sensible, but introducing a parallel `ApplicationError` base risks duplication unless a clear migration path is defined.  
   b. Existing technical error hierarchy  
      - Tools already use an abstract `ToolExecutorError` family for type-safe propagation:  
        ```120:145:lib/tools/executor/types.ts
        export abstract class ToolExecutorError extends Error {
          abstract readonly code: string
          abstract readonly retryable: boolean
        }
        ```  
        Introducing another root (`ApplicationError`) without bridging the two will fragment the contract between layers.  
   c. Standardised API error envelopes  
      - RFC 9457 “Problem Details” responses are *already* centralised in `/api/tools/[toolId]/route.ts`:  
        ```110:150:app/api/tools/[toolId]/route.ts
        function createErrorResponse(
          error: { status: number; code: string; message: string; ... },
        ```  
        The plan’s “Create centralised error response handler” duplicates this logic; better to extract the existing helper into `lib/api/problem-details.ts` and reuse.

3. Scope & Phasing Risks  
   • The action list is very ambitious (14 stages). Without clear prioritisation there’s a risk of a long-running branch that never lands.  
   • “Create error middleware for all API routes” will conflict with routes already using request-specific loggers & auth guards. Consider incremental adoption per domain (upload, auth, AI) to avoid merge pain.  
   • Stage “Create developer error linter” is valuable but should follow after patterns stabilise; otherwise the rules will churn.

4. Technical Concerns / Gaps  
   • Error class design: The sample `ApplicationError` constructor accepts a raw `context: Record<string, unknown>`. This is flexible but undermines the strong typing we rely on. Recommend generic parameterisation or specific field interfaces per subclass.  
   • Correlation-ID propagation: The plan requires “error logs contain correlation IDs” but doesn’t spell out how to flow IDs through client-side fetch wrappers and React error boundaries. We already set the `x-spideryarn-correlation-id` header in tool routes; extending fetch/axios wrappers on the front-end should be part of the scope.  
   • Browser-side errors: Document focuses on API/service errors; user-visible errors can also arise in client components (e.g. Supabase JS errors). Plan should include React error boundary pattern aligning with the same `UserErrorMessageService` to keep messaging consistent.  
   • Security: Plan notes “Ensure security (don't leak user existence)” for auth messages, but other categories (AI, storage) could also leak implementation details—needs explicit guidelines (e.g. whitelist of safe fields for `details`).  
   • Tests: Proposal to “create test scenarios for common error cases” is good; should reference existing mocks (`__mocks__/@ai-sdk`, etc.) to avoid reinventing fixtures.

5. Suggestions / Improvements  
   1. **Unify Base Error Classes**  
      - Extend `ToolExecutorError` into a more generic `BaseApplicationError` (keeping existing fields) rather than adding a parallel tree. This avoids large-scale refactors.  
   2. **Extract & Reuse Problem-Details Helper**  
      - Move `createErrorResponse` from the tool route into `lib/api/problem-details.ts`; update existing routes to consume it so Stage “Standardise API error responses” is mostly mechanical.  
   3. **Incremental Roll-out Plan**  
      - Prioritise high-traffic user journeys first (document upload → auth → AI generation). Gate later stages (database, linter) on real-world feedback.  
   4. **Typed Context Objects**  
      - Replace loose `Record<string, unknown>` contexts with discriminated unions (e.g. `DocumentContext | StorageContext`) to preserve type safety.  
   5. **Front-end Surface**  
      - Add a small React hook `useErrorToast(error: unknown)` that consumes `UserErrorMessageService` and displays shadcn/ui `Alert` components—keeps UX consistent.  
   6. **Documentation**  
      - When you add `ERROR_HANDLING_PATTERNS.md`, include decision records that map *each* existing pattern to the new unified approach to ease onboarding.  
   7. **Performance Considerations**  
      - Logging every error stack with context can be noisy; add sampling or log-level guidance in `LOGGING_BEST_PRACTICES.md`.

6. Overall Assessment  
   The proposal is directionally solid and aligns with our coding principles (“fail fast with clear, user-visible errors”). Biggest risk is *redundancy*: there are mature patterns already in place; the plan should focus on consolidating and extending—not re-inventing. Trim scope, reuse helpers, and enforce strong typing to maximise impact while minimising churn.

============================================================
RECOMMENDED NEXT ACTIONS
============================================================
1. Add a short “Integration Strategy” section to the planning doc covering:  
   • How `ApplicationError` relates to `ToolExecutorError` (prefer unification).  
   • Plan to extract `createErrorResponse` helper and update callers.  
2. Re-order stages: audit → helper extraction → update high-impact routes (upload, auth) → roll-out.  
3. After adjusting the plan, *then* proceed to implement Stage 1 audit tasks.

Let me know if you’d like me to modify the planning document directly or draft the updated integration strategy section.