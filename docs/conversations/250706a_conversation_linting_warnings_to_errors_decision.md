# Linting and Type-Checking: Warnings to Errors Decision - 2025-07-06

---
Date: 2025-07-06
Duration: ~15 minutes
Type: Decision-making
Status: Active
Related Docs: `docs/reference/SETUP_FOR_AI_FIRST_CODING.md`, `eslint.config.mjs`
---

## Context & Goals

The user asked: "Can we change all the linting and type-checking checks from warning -> error? Should we?"

This prompted an investigation into the current configuration, rationale, and implications of making this change in an AI-first development environment.

## Key Background

The project follows an AI-first development approach where "all code is written by AI agents (primarily Claude)". Key contextual points:

- **Current philosophy**: "early-stage development with AI-first methods" focused on developing fast and experimenting
- **Development context**: Using Claude Code from CLI (not IDE), which means no automatic diagnostic sharing
- **Existing system**: Sophisticated health check orchestration designed for AI agents

## Main Discussion

### Current Configuration Analysis

Investigation revealed a thoughtful, layered approach:

**TypeScript Configuration**:
- Already strict (`"strict": true`) with additional AI-friendly settings
- Compilation errors block builds (already enforced as errors)
- Includes `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` for extra safety

**ESLint Configuration**:
- Most rules set to `warn` with explicit rationale: "Keep these as warnings to prevent deployment blocking while preserving diagnostic value"
- One rule already error: `no-use-before-define` for temporal dead zone protection
- Different strictness for production vs test code

**Health Check System**:
- Git-aware orchestration tool (`scripts/check-health.ts`)
- Distinguishes between BLOCKING (TypeScript/Build) and quality (ESLint) issues
- Designed for AI agents to efficiently identify and fix issues

### AI-First Development Considerations

From the documentation analysis, key principles emerged:

1. **"Fail Fast, Fix Early"** - AI agents excel at systematically fixing lint errors
2. **AI agents don't get "annoyed"** by strict rules like humans do
3. **CLI limitation**: When using Claude Code from CLI, explicit linting commands are essential (no automatic diagnostics)
4. **Systematic approach**: AI can methodically work through long lists of violations

## Alternatives Considered

### Option 1: Convert All Warnings to Errors
**Pros**:
- Maximum strictness aligns with "Fail Fast, Fix Early"
- AI agents handle strict rules well
- Catch all issues at compile time

**Cons**:
- Could block deployments with minor issues
- Goes against current pragmatic approach
- May slow experimentation phase

### Option 2: Keep Current Setup (Warnings)
**Pros**:
- Deployment flexibility maintained
- Aligns with rapid experimentation goals
- Health check already provides prioritization

**Cons**:
- May miss catching bugs early
- Less enforcement for code quality
- Requires discipline to fix warnings

### Option 3: Selective/Gradual Conversion (Recommended)
**Pros**:
- Balance between strictness and flexibility
- Target most important rules first
- Maintain context-aware approach

**Cons**:
- Requires thoughtful selection of rules
- More complex configuration

## Decisions Made

**Recommendation: Yes, but selectively and gradually**

Phase 1 approach was proposed:
1. Convert critical warnings to errors:
   - `@typescript-eslint/no-unused-vars` → error
   - `@typescript-eslint/no-require-imports` → error
   - Keep `no-use-before-define` as error (already done)

2. Maintain warnings for:
   - Rules marked "for gradual adoption"
   - React-specific rules that might block during refactoring
   - Test file rules (maintain flexibility)

3. Continue using health check system as primary enforcement

## Open Questions

- Which specific rules should be prioritized for Phase 1?
- Should we add more TypeScript compiler options mentioned in the documentation?
- How to handle the gradual rollout and monitor impact on development velocity?

## Next Steps

User to decide whether to:
1. Proceed with Phase 1 configuration changes
2. Maintain current setup
3. Explore alternative approach

## Sources & References

**External Sources**:
- **[Claude Code IDE Integrations](https://docs.anthropic.com/en/docs/claude-code/ide-integrations)** - Confirmed CLI limitations for diagnostic sharing
- **[TypeScript Strict Configuration Guide](https://www.typescriptlang.org/tsconfig#strict)** - Comprehensive strict mode options

**Internal References**:
- See `docs/reference/SETUP_FOR_AI_FIRST_CODING.md` for AI-first development principles
- See `eslint.config.mjs` for current ESLint configuration with rationale comments
- See `scripts/check-health.ts` for health check orchestration implementation
- See `docs/reference/CODING_PRINCIPLES.md` for "Fail Fast, Fix Early" philosophy

## Related Work

This conversation may lead to:
- Updates to `eslint.config.mjs` if Phase 1 proceeds
- Documentation updates in `docs/reference/SETUP_FOR_AI_FIRST_CODING.md`
- Potential planning document for phased rollout of stricter linting