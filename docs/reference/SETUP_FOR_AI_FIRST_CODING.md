# Setup for AI-First Coding

This document outlines principles and practical configurations for optimizing development workflows when all code is written by AI agents (primarily Claude).

**Status:** ✅ Current  
**Last Updated:** 2025-06-15  
**Context:** Based on research into Claude Code capabilities, AI assistant linting patterns, and analysis of our current ESLint configuration

## Core Principles for AI-First Development

### Fail Fast, Fix Early
AI agents excel at systematically fixing lint errors but struggle with runtime bugs discovered during manual testing. **Prefer compile-time errors over silent failures.** Note: When using Claude Code from the CLI (not within an IDE), explicit linting commands are essential since automatic diagnostic sharing is not available.

### Context-Aware Strictness
Different parts of the codebase have different requirements:
- **Production code:** Strict typing and linting
- **Test files:** More flexibility for mocking complex external libraries
- **Development utilities:** Balance between strictness and rapid iteration

### Systematic Error Resolution
AI agents don't get "annoyed" by strict rules like humans do. They can methodically work through long lists of lint violations, making strict configurations viable.

### Descriptive Naming for AI Productivity
Use longer, more descriptive filenames, function names, and variable names that are easy to grep and understand. AI agents excel at working with codebases that have clear, searchable naming conventions.

### Leverage Automatic Diagnostic Sharing (IDE-Dependent)
Claude Code automatically receives diagnostic information (ESLint, TypeScript errors) **only when running within supported IDEs** (VS Code, Cursor, JetBrains).

When using Claude Code from the CLI, explicit linting commands (`npm run lint`, `npm run build`) are required for diagnostic feedback.

## Research Findings

### Claude Code Linting Integration

**✅ Confirmed Capabilities (IDE Integration Required):**
- **Automatic diagnostic sharing:** Claude Code receives ESLint, TypeScript, and other diagnostic errors automatically **only when running within VS Code/Cursor/JetBrains IDEs**
- **CLI limitation:** When running Claude Code directly from the command line, diagnostic information is **NOT** automatically shared
- **Multi-file context:** Can understand and fix cross-file linting issues when diagnostic information is available
- **Subjective code review:** Goes beyond traditional linting to catch typos, misleading names, stale comments

**Key Sources:**
- [Claude Code IDE Integrations](https://docs.anthropic.com/en/docs/claude-code/ide-integrations)
- [Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)


## Recommended Configuration Changes

### Phase 1: Immediate Wins (Low Risk)

**ESLint Rule Updates:**
```javascript
// eslint.config.mjs
{
  rules: {
    // Upgrade safe rules to errors
    "@typescript-eslint/no-unused-vars": "error",           // Was: "warn"
    "@typescript-eslint/no-require-imports": "error",      // Was: "warn"
    "prefer-const": "error",                               // Already enforced
    
    // Add TDZ protection (from o3 suggestion)
    "no-use-before-define": ["error", { 
      "variables": true, 
      "functions": false,
      "classes": false 
    }],
  }
}
```

**TypeScript Compiler Options:**
```json
// tsconfig.json additions
{
  "compilerOptions": {
    "exactOptionalPropertyTypes": true,  // Catch optional property misuse
    "useDefineForClassFields": true,     // Modern class field behavior
    "noUncheckedIndexedAccess": true     // Prevent undefined array access
  }
}
```

### Phase 2: Context-Aware Rules (Medium Risk)

**File-Pattern-Based Configuration:**
```javascript
// eslint.config.mjs
export default [
  // Strict rules for production code
  {
    files: ["**/*.ts", "**/*.tsx"],
    excludedFiles: ["**/__tests__/**", "**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "react-hooks/exhaustive-deps": "error",
    }
  },
  
  // Lenient rules for test files
  {
    files: ["**/__tests__/**", "**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",  // Tests need mocking flexibility
      "react-hooks/exhaustive-deps": "warn",         // Test setup may skip deps intentionally
    }
  }
];
```

### Phase 3: Advanced AI Workflows (Higher Risk)

**Custom Linting Commands:**
```json
// package.json
{
  "scripts": {
    "lint:claude": "claude -p 'you are a linter. look at changes vs. main and report issues with filename:line format'",
    "lint:fix-ai": "claude --dangerously-skip-permissions -p 'fix all ESLint errors systematically'"
  }
}
```

**AI-Specific Validation:**
- Add pre-commit hooks that run strict linting
- Use subagents for systematic lint error fixing
- Implement staged rollouts of stricter rules

## Implementation Workflow for AI Agents

### Claude Code Environment Considerations

**When using Claude Code within an IDE (VS Code/Cursor/JetBrains):**
- ✅ Automatic diagnostic sharing (ESLint, TypeScript errors) 
- ✅ Real-time feedback during code writing
- ✅ Immediate visibility of linting violations
- **Workflow:** Write code → See diagnostics → Fix issues → Verify

**When using Claude Code from CLI:**
- ❌ No automatic diagnostic sharing
- ⚠️ Must explicitly run linting commands
- ⚠️ Requires manual diagnostic analysis
- **Workflow:** Write code → Run `npm run lint`/`npm run build` → Analyze output → Fix issues → Re-run

### Error Resolution Patterns
```bash
# Systematic approach for AI agents
npm run lint                    # Identify all issues
npm run lint -- --fix         # Auto-fix what's possible
npm run build                  # Verify TypeScript compilation
npm test                       # Ensure functionality preserved
```

## Health Check Orchestration

**Problem:** AI agents need systematic error checking without verbose output cluttering context windows.

**Solution:** Orchestration-friendly health checks that provide summary-first, detail-on-demand workflow.

### Health Check Commands
```bash
# Basic usage (git-aware, checks changed files)
npm run check:health

# Quick iterations (skip build verification)
npm run check:health:quick  

# Comprehensive checking (all ~300 files)
npm run check:health:rigorous

# Advanced options (use -- separator)
npm run check:health -- --files lib/utils/slug.ts    # Specific files
npm run check:health -- --no-eslint                  # Skip ESLint
npm run check:health -- --no-typescript              # Skip TypeScript
npm run check:health -- --no-build                   # Skip build
```

### Orchestration Benefits
- **Summary-first output:** Issue counts and priority guidance for AI decision-making
- **Git-aware by default:** Checks changed files to catch cross-file impacts
- **File-based targeting:** Enables focused subagent dispatch to problem areas
- **Error prioritization:** TypeScript/Build errors marked as blocking vs ESLint quality issues

### Usage Patterns
```bash
# Planning document stage-end checking
npm run check:health              # Quick health overview
# If issues found → dispatch subagents with suggested detailed commands

# Development iterations  
npm run check:health:quick        # Fast feedback during coding
npm run lint                      # Detailed ESLint diagnostics when needed
```

## Integration with Existing Workflows

### Planning Documents
- Add linting verification as standard stage-end action
- Include rule updates in infrastructure improvement stages
- Consider lint noise assessment for major feature work

### Testing Approach
- Maintain lenient rules for test files (mocking complexity)
- Use stricter rules for production code
- Real RLS testing continues to use shared database approach

### Documentation Updates
- This document serves as reference for linting decisions
- Update CLAUDE.md with new lint workflow recommendations
- Include rule rationale in code review discussions

## Monitoring and Iteration

### Success Metrics
- **Reduced manual testing issues:** Fewer bugs caught in human testing phase
- **Faster AI development cycles:** Less back-and-forth on preventable errors
- **Improved code quality:** Better type safety and maintainability

### Regular Reviews
- **Monthly lint rule assessment:** Are new patterns emerging?
- **AI agent feedback:** What errors are still getting through?
- **Developer experience:** Is strictness helping or hindering velocity?

### Escape Hatches
- **Temporary rule disable:** `// eslint-disable-next-line` for edge cases
- **File-level exceptions:** Pattern-based rule overrides
- **Gradual rollback:** Ability to downgrade rules if too disruptive

## References

**External Resources:**
- [ESLint TDZ Discussion](https://github.com/eslint/eslint/issues/14550) - Community discussion on temporal dead zone detection
- [Docker ESLint + AI Integration](https://www.docker.com/blog/ai-powered-code-analysis/) - Successfully integrated linting with AI workflows
- [TypeScript Strict Configuration Guide](https://www.typescriptlang.org/tsconfig#strict) - Comprehensive strict mode options

**Internal Documentation:**
- `docs/reference/CODING_PRINCIPLES.md` - Core development philosophy
- `docs/reference/TESTING_OVERVIEW.md` - Testing approach and standards
- `docs/instructions/GIT_COMMIT_CHANGES.md` - Commit workflow with linting checks

---

*This document should be updated as we gain experience with stricter linting configurations and AI development workflows.*