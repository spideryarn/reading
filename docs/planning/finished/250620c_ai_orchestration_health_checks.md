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

**✅ DECISION MADE**: Implement `npm run check:health` using Clipanion TypeScript CLI - provides systematic health checking for planning document workflow integration.

---

## Goal, context

**✅ UPDATED GOAL**: Implement a single `npm run check:health` command that integrates seamlessly into planning document workflows, providing orchestration-friendly output for routine health checking at the end of each development stage.

**✅ REFINED PROBLEM**: Need a systematic approach to catch compile-time errors during development stages. Current ad-hoc approach leads to inconsistent checking and missed issues.

**✅ SOLUTION APPROACH**: Git-aware health checking with file-based orchestration output, designed for routine use rather than comprehensive error management.

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

**✅ UPDATED KEY TECHNICAL DECISIONS**:
- **Clipanion TypeScript CLI**: Complex argument handling, git integration, robust error handling
- **Sequential execution**: Simple, reliable - TypeScript → ESLint → Build  
- **Git-aware by default**: Check changed files (catches cross-file impacts)
- **File-based orchestration output**: Issue counts per file for targeted subagent dispatch
- **Routine workflow integration**: Single command for end-of-stage planning document actions

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

### ✅ Stage: Design and Planning (COMPLETED)
- [x] Design Clipanion CLI arguments and modes for health check tool
  - 📔 **Default scope**: Git-aware (changed files since HEAD~1)
  - 📔 **Modes**: `--rigorous` (all files + tests), `--quick` (skip build), `--files` (specific paths)
  - 📔 **Tools**: TypeScript + ESLint + Build (sequential execution, all enabled by default)
- [x] Plan file-based orchestration output format
  - 📔 **Format**: File paths with issue counts per tool type
  - 📔 **Orchestration**: Enables targeted subagent dispatch to specific files
- [x] Update planning document workflow integration
  - 📔 **Updated**: `docs/instructions/WRITE_PLANNING_DOC.md` with systematic health check approach
  - 📔 **Integration**: Single `npm run check:health` action for end-of-stage checking

### ✅ Stage: Health Check CLI Implementation (COMPLETED)
- [x] Create `scripts/check-health.ts` using Clipanion framework
  - 📔 Implemented comprehensive CLI with Clipanion 4.0 following existing script patterns
  - 📔 CLI argument parsing: --quick, --rigorous, --files, --no-typescript/eslint/build
  - 📔 Git integration: detects changed files since HEAD~1, includes unstaged changes
  - 📔 Sequential execution: TypeScript → ESLint → Build (with proper error handling)
  - 📔 File-based orchestration output: issue counts per tool with command suggestions
- [x] Add npm script `check:health` to package.json
  - 📔 Added as `"check:health": "./scripts/check-health.ts"` in scripts section
- [x] Test health check CLI with current codebase
  - 📔 Git-aware detection working: correctly identifies TypeScript file changes
  - 📔 Rigorous mode tested: processes 292 files, found 261 TypeScript issues
  - 📔 Tool integration verified: TypeScript (261 errors), ESLint (clean), Build (fails due to TS errors)
  - 📔 Edge cases handled: no changes detected returns clean exit

### ✅ Stage: Documentation Updates (COMPLETED)
- [x] Update `CLAUDE.md` with new orchestration pattern
  - 📔 Added comprehensive health check section to build/testing guidance
  - 📔 Documented orchestration vs detailed command usage patterns
  - 📔 Updated command reference with `npm run check:health` script
- [x] Update `docs/reference/CODING_GUIDELINES.md`
  - 📔 Replaced current quality check section with systematic orchestration pattern
  - 📔 Added guidance on when to use summary vs detailed commands for AI agents
  - 📔 Included error prioritisation guidelines (TypeScript/Build blocking, ESLint quality)
- [x] Update `docs/reference/SETUP_FOR_AI_FIRST_CODING.md`
  - 📔 Added comprehensive "Health Check Orchestration" section with commands, benefits, and usage patterns
  - 📔 Integrated with existing AI-first development workflow documentation
  - 📔 Updated CLAUDE.md references to point to health check orchestration guidance

### Stage: Testing and Validation
- [ ] Test full orchestration workflow:
  - Run health check to identify issues
  - Use summary output to decide which detailed checks to run
  - Verify sub-agent workflow with detailed commands
- [ ] Validate that summary output provides sufficient information for orchestration decisions
- [ ] Test error handling and edge cases
- [ ] Run existing linting and build processes to ensure no regressions

### ✅ Stage: Final Polish and Documentation (COMPLETED)
- [x] Update any remaining documentation references to old patterns
  - 📔 Updated CLAUDE.md CLI usage section to reflect orchestration pattern
  - 📔 Aligned documentation with health check workflow for AI agents
- [x] Test full workflow with health check to ensure orchestration efficiency
  - 📔 Verified script works correctly with git-aware detection
  - 📔 Confirmed quick mode and help output are comprehensive
- [x] Ensure all new scripts follow project conventions and security practices
  - 📔 Fixed infinite recursion bug in git fallback logic
  - 📔 Removed unused imports (resolve from 'path', UsageError from 'clipanion')  
  - 📔 Script follows established shebang pattern (#!/usr/bin/env npx tsx)
  - 📔 Proper error handling and user-friendly output formatting
- [x] Final validation of all commands and documentation accuracy
  - 📔 Confirmed package.json script configuration works correctly
  - 📔 Verified help output and examples are accurate and comprehensive

### Stage: Completion
- [ ] Git commit following `docs/instructions/GIT_COMMIT_CHANGES.md`
- [ ] Move planning document to `docs/planning/finished/`

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