# AI Orchestration Health Checks Implementation

## ADDENDUM: Scale Analysis & Revised Recommendation

**Updated Analysis (June 22, 2025)**: Investigation revealed the verboseness problem is **significantly smaller** than initially estimated:

- **Actual TypeScript files**: ~343 files (not 5,667)
- **Files TypeScript processes**: ~252 files  
- **Error density**: ~1 error per file (283 errors ÷ 252 files)
- **ESLint issues**: ~276 issues across 343 files (<1 issue per file)

**Revised Recommendation**: The orchestration approach outlined below is **likely overengineering** for this scale. The verbose output (276 ESLint issues, 283 TypeScript errors) is manageable for AI agents working on a ~300-file codebase.

**Simpler Alternatives to Consider**:
1. **Gradual fixing**: Address TypeScript errors incrementally (~1 per file is reasonable)
2. **Direct commands**: Continue using detailed lint/build commands - output isn't overwhelming at this scale
3. **Incremental linting**: Still valuable but less critical than for large codebases
4. **Skip orchestration**: The complexity may not justify the benefits for 300 files

**Decision Point**: Before implementing the full orchestration system below, consider whether simpler approaches (gradual error fixing, incremental linting) might be more appropriate for the actual project scale.

---

## Goal, context

The goal is to implement orchestration-friendly health check commands that allow AI agents to efficiently determine which detailed checks need to be run, reducing context window usage while improving error detection and process automation.

**Current Problem**: AI agents running `npm run lint`, `npm run build`, and `tsc --noEmit` get overwhelmed with verbose output (276 ESLint issues, 283 TypeScript errors) making it difficult to prioritise and orchestrate sub-tasks effectively.

**Desired Solution**: Implement summary commands that provide actionable intelligence for orchestration decisions, with detailed commands available for focused debugging by sub-agents.

## References

- `docs/instructions/WRITE_PLANNING_DOC.md` - Planning document structure and process
- `docs/instructions/GIT_COMMIT_CHANGES.md` - Git commit workflow and conventions
- `docs/reference/CODING_GUIDELINES.md` - Current code quality check documentation
- `CLAUDE.md` - Main development environment and command reference
- **Web Research**: Industry best practices from TypeScript-ESLint project CI/CD patterns and modern npm script orchestration

## Principles, key decisions

**Core Principles**:
- **Separate but Sequential**: TypeScript, ESLint, and build checks catch different classes of problems and all are needed
- **Orchestration-Friendly**: Summary commands provide just enough information for AI agents to make informed decisions
- **Context Window Efficiency**: Verbose output only when needed by focused sub-agents
- **Error Prioritisation**: TypeScript errors are blocking (runtime safety), ESLint issues are non-blocking (code quality)

**Key Technical Decisions**:
- Use shell scripts for health check summaries with structured output
- Maintain existing detailed commands for sub-agent use
- Follow industry patterns: parallel execution, staged linting, progressive enhancement
- Align with existing project structure and npm script conventions

**User Requirements**:
- Catch potential errors/problems earlier in the development process
- Improve AI agent orchestration efficiency
- Reduce context window pollution from verbose diagnostics
- Focus on improving future process (ignore existing errors for now)

## Stages & actions

### Stage: Research and Design Foundation
- [x] Research industry best practices for TypeScript/ESLint orchestration
  - 📔 Found comprehensive patterns from typescript-eslint project, ESLint v9 updates, and modern CI/CD approaches
  - 📔 Confirmed industry consensus: separate commands needed for different error classes
  - 📔 Validated orchestration pattern: summary for decisions, detailed for debugging
- [x] Document current command relationships and output volumes
  - 📔 Current state: 276 ESLint issues, 283 TypeScript errors, successful builds despite type errors
  - 📔 Confirmed: tsc --noEmit catches critical issues that Next.js build misses

### Stage: Health Check Script Implementation
- [ ] Create `scripts/health-check.sh` with structured summary output
  - Implement error counting for TypeScript, ESLint, and build processes
  - Include actionable status indicators (🔴 BLOCKING, 🟡 HIGH, ✅ OK)
  - Provide priority guidance for orchestration decisions
- [ ] Add npm script `check:health` to package.json
- [ ] Test health check script with current codebase
  - Verify error counts match manual runs
  - Ensure script handles edge cases (no errors, command failures)

### Stage: Detailed Check Script Organization
- [ ] Add organized npm scripts for detailed checks:
  - `check:types` - TypeScript type checking (`tsc --noEmit`)
  - `check:lint` - ESLint detailed output
  - `check:build` - Build process detailed output
- [ ] Verify detailed scripts work correctly with current setup
- [ ] Test integration between summary and detailed commands

### Stage: Documentation Updates
- [ ] Update `CLAUDE.md` with new orchestration pattern
  - Add health check workflow to build/testing section
  - Document orchestration vs detailed command usage
  - Update command reference with new scripts
- [ ] Update `docs/reference/CODING_GUIDELINES.md`
  - Replace current quality check section with orchestration pattern
  - Add guidance on when to use summary vs detailed commands
  - Include error prioritisation guidelines
- [ ] Update `docs/instructions/WRITE_PLANNING_DOC.md`
  - Add health check as end-of-stage action template
  - Include orchestration decision points in stage guidelines

### Stage: Testing and Validation
- [ ] Test full orchestration workflow:
  - Run health check to identify issues
  - Use summary output to decide which detailed checks to run
  - Verify sub-agent workflow with detailed commands
- [ ] Validate that summary output provides sufficient information for orchestration decisions
- [ ] Test error handling and edge cases
- [ ] Run existing linting and build processes to ensure no regressions

### Stage: Final Polish and Documentation
- [ ] Update any remaining documentation references to old patterns
- [ ] Test full workflow with a sub-agent to ensure orchestration efficiency
- [ ] Ensure all new scripts follow project conventions and security practices
- [ ] Final validation of all commands and documentation accuracy

### Stage: Completion
- [ ] Git commit following `docs/instructions/GIT_COMMIT_CHANGES.md`
- [ ] Move planning document to `planning/finished/`

## Appendix

### Web Research Summary

**Key Sources and Findings**:

1. **ESLint Official Documentation** - https://eslint.org/
   - ESLint v9.0.0 released with new flat config format
   - Emphasis on separation of concerns: linting vs building vs type checking

2. **TypeScript-ESLint Project CI/CD** - https://github.com/typescript-eslint/typescript-eslint/blob/main/.github/workflows/ci.yml
   - Comprehensive CI example with parallel execution
   - Separate jobs for linting, type checking, and building
   - Matrix builds for different environments

3. **Stack Overflow: Build vs Lint in CI** - https://stackoverflow.com/questions/74183904/should-i-build-typescript-in-my-ci-pipeline-if-i-use-eslint-with-typescript-plug
   - Industry consensus: "ESLint is a linter, not a build tool"
   - Both are needed as they catch different classes of problems

4. **Modern CI/CD Patterns**:
   - Parallel execution using matrix builds
   - Staged linting with tools like `lint-staged`
   - Progressive enhancement: start simple, add complexity
   - Structured npm scripts: `run-p` for parallel, `run-s` for sequential

**Key Technical Insights**:
- **Command Relationships**: TypeScript (type safety), ESLint (patterns/style), Build (bundling) are complementary
- **Error Prioritisation**: TypeScript errors block runtime, ESLint issues affect maintainability
- **Orchestration Patterns**: Summary commands for decisions, detailed commands for debugging
- **Industry Standards**: Structured npm scripts, health check patterns, CI/CD matrix approaches

### Current Command Analysis

**Current Output Volumes**:
- TypeScript errors: 283 (blocking issues)
- ESLint issues: 276 (code quality warnings)
- Build status: Successful (despite type errors)
- Total files processed: ~5,667 TypeScript files

**Orchestration Decision Matrix**:
- TypeScript errors > 0: 🔴 BLOCKING - Deploy sub-agent with `npm run check:types`
- ESLint issues > 50: 🟡 HIGH - Deploy sub-agent with `npm run check:lint`
- Build errors > 0: 🔴 BLOCKING - Deploy sub-agent with `npm run check:build`

### Implementation Examples

**Health Check Script Output Format**:
```bash
🔍 Health Check Summary:
TypeScript errors: 283 🔴 BLOCKING
ESLint issues: 276 🟡 HIGH  
Build errors: 0 ✅ OK
📋 Priority: Fix TypeScript errors first
```

**Proposed npm Scripts**:
```json
{
  "scripts": {
    "check:health": "scripts/health-check.sh",
    "check:types": "tsc --noEmit",
    "check:lint": "eslint . --ext .ts,.tsx",
    "check:build": "next build"
  }
}
```

### Alternative Approaches Considered

**Approach 1: Single Comprehensive Command**
- *Considered*: Combining all checks into one command
- *Discarded*: Would still produce verbose output, doesn't solve orchestration problem

**Approach 2: JSON Output Format**
- *Considered*: Machine-readable JSON output for parsing
- *Discarded*: Human-readable format better for debugging, simpler implementation

**Approach 3: Integration with Existing Tools**
- *Considered*: Using tools like `lint-staged` or `husky` for automation
- *Selected for later*: Focus on core orchestration pattern first, integrate with existing workflows later

**Chosen Approach**: Shell script with structured human-readable output
- *Rationale*: Simple to implement, easy to debug, provides clear orchestration guidance
- *Benefits*: Immediate utility, easy to extend, follows industry patterns
- *Trade-offs*: Less sophisticated than full CI/CD integration, but sufficient for current needs