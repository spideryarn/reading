# Error Handling Overhaul Plan

**Status**: In Progress  
**Created**: 2025-01-05  
**Last Updated**: 2025-01-06  
**Stage**: Implementation (Stage 1 Complete)

## History

- **2025-01-05** – Initial planning document created
- **2025-07-05** – Merged and superseded `250703b_descriptive_error_message_propagation.md`
- **2025-01-06** – Completed circular reference handling, updated to standard format

## Goal, Context

Spideryarn Reading currently suffers from inconsistent error responses, occasional silent failures, and vague user-facing messages. We need a comprehensive error handling overhaul to ensure reliability and maintainability.

**Problem**: 
- Silent failures mask issues from users and developers
- Inconsistent error formats across API routes
- Vague error messages don't help users resolve issues
- No correlation tracking for debugging

**Solution**: Single-shot migration to standardised error handling with RFC 9457 Problem Details, correlation IDs, and comprehensive tooling.

## User Stories & Acceptance Criteria

### As a User
- I want clear error messages that tell me what went wrong and how to fix it
- **Acceptance criteria**: All errors follow "What happened + Why + What to do" pattern

### As a Developer
- I want consistent error handling patterns across the codebase
- **Acceptance criteria**: 100% of API routes use RFC 9457 Problem Details format

### As an Admin
- I want to trace errors through the system for debugging
- **Acceptance criteria**: All responses include `x-spideryarn-correlation-id` header

## References

- `docs/reference/CODING_GUIDELINES.md` - Core error handling principles and patterns
- `docs/reference/ERROR_HANDLING_PATTERNS.md` - To be created: comprehensive error handling guide
- `docs/reference/AI_RESPONSE_LOGGING.md` - Logging patterns for AI operations
- `docs/reference/LOGGING_BEST_PRACTICES.md` - Structured logging with Pino
- `lib/api/tool-error-utils.ts` - Existing RFC 9457 implementation for tools
- `docs/instructions/WRITE_PLANNING_DOC.md` - Instructions for maintaining planning docs

## Principles, Key Decisions

1. **Zero silent failures** – every unexpected condition throws loudly
2. **100% RFC 9457 compliance** across all API routes
3. **Actionable user messages** following the "What happened + Why + What to do" pattern
4. **End-to-end correlation tracing** via the `x-spideryarn-correlation-id` response header
5. **Comprehensive documentation & lint tooling** to prevent regressions
6. **Single-shot migration** – no backwards compatibility phase (no production users)
7. **Type-safe infrastructure** centred on `ApplicationError` and Problem Details

## Stages & Actions

### Stage: Preparation
- [ ] Run `./scripts/sync-worktrees.ts` in a subagent to ensure latest changes from main
- [ ] Create feature branch `250106_error_handling_overhaul` for this major work
- [ ] Search web for RFC 9457 Problem Details best practices and examples (use subagent)

### ✅ Stage: Circular Reference Handling (COMPLETE)
- [x] Created `lib/utils/safe-json.ts` utility for safe JSON serialisation
- [x] Updated `AIResponseLogger` to use safeJsonValue helper  
- [x] Implemented placeholder `"[Circular]"` for circular references with warning logs
- [x] Updated unit tests to expect circular reference placeholders
- [x] Added regression test with real Anthropic payload
- [x] Updated `docs/reference/AI_RESPONSE_LOGGING.md` with sanitisation strategy
  - 📔 Discovered that Anthropic API responses contain legitimate circular references in their structure
  - 📔 Previous implementation was throwing errors, breaking AI tool functionality
  - 📔 New approach logs warnings but continues processing successfully

### Stage: Quick Wins - Expose Hidden Errors
- [ ] Re-audit masked/silent errors across codebase (use subagent with Grep/Glob tools)
  - [ ] Search for `catch` blocks returning empty values
  - [ ] Find components with perpetual loading states
  - [ ] Identify vague error messages
- [ ] Replace vague messages with specific, actionable ones (see Appendix A for examples)
- [ ] Introduce global correlation-ID middleware for all requests
- [ ] Run `npm run check:health` and fix any issues (use subagent if >3 files)

### Stage: Core Infrastructure
- [ ] Create `lib/api/error-utils.ts` with ProblemDetail interface and ApplicationError class (see Appendix B)
- [ ] Add domain-specific error subclasses (DocumentError, StorageError, AIServiceError, ValidationError)
- [ ] Implement `createProblemDetail()` helper function
- [ ] Write Jest unit tests for serialisation and header presence
- [ ] Refactor existing tool error helpers to use new infrastructure
- [ ] Run tests and verify all pass

### Stage: API Route Standardisation
- [ ] Create list of all API routes needing conversion (use subagent)
- [ ] Replace all `NextResponse.json({ error:` patterns with `createProblemDetail()`
- [ ] Map existing status codes to structured Problem Details
- [ ] Update API route tests to assert Problem Details shape
- [ ] Create `useProblemDetailError()` frontend hook
- [ ] Add integration tests for end-to-end error flow
- [ ] Run `npm run check:health --rigorous` for comprehensive validation

### Stage: Documentation & Frontend Patterns
- [ ] Create `docs/reference/ERROR_HANDLING_PATTERNS.md` with:
  - [ ] Notification decision tree
  - [ ] Example Problem Details for common scenarios
  - [ ] Component patterns and hooks usage
  - [ ] Checklist for writing user-friendly messages
- [ ] Update design system with error display variants
- [ ] Document correlation ID usage for debugging
- [ ] Review with user for feedback

### Stage: Developer Tooling & Linting
- [ ] Create ESLint rule to forbid empty catch blocks
- [ ] Add rule to detect generic error messages
- [ ] Add rule to forbid raw `NextResponse.json({ error:`
- [ ] Create `npm run lint:errors` script
- [ ] Wire lint:errors into pre-commit hook
- [ ] Create VS Code snippets for common error patterns
- [ ] Test tooling with sample violations

### Stage: Integration & Consolidation
- [ ] Refactor remaining AI tools to use `safeJsonValue` helper (use subagent):
  - [ ] Structure tool
  - [ ] Summary tool  
  - [ ] Search tool
  - [ ] Metadata tool
- [ ] Verify all AIResponseLogger call-sites use updated serialisation
- [ ] Delete redundant error handling code
- [ ] Run comprehensive test suite
- [ ] Check UI with Puppeteer MCP for error states (use subagent)
- [ ] Update `docs/reference/CODING_GUIDELINES.md` with error handling section

### Stage: Final Validation & Cleanup
- [ ] Run final health check:
  - [ ] `npm run build` - Ensure TypeScript compilation succeeds
  - [ ] `npm run lint` - Verify code quality standards
  - [ ] `npm test` - Confirm all tests pass (use subagent if verbose)
- [ ] Test consolidation (use subagent):
  - [ ] Search for all tests added during this work
  - [ ] Identify redundant or brittle tests
  - [ ] Consolidate into fewer integration/E2E tests
- [ ] Error message verification - review all changed error handling
- [ ] Create housekeeping script to detect masked errors going forward
- [ ] Document any discovered improvement opportunities
- [ ] Ask user permission to merge feature branch to main
- [ ] Move this doc to `docs/planning/finished/` and commit

## Success Metrics

- ✅ 100% of API routes emit RFC 9457 Problem Details
- ✅ All responses include `x-spideryarn-correlation-id`
- ✅ No TODO/FIXME comments about "temporary error message"
- ✅ `npm run lint:errors` passes with zero findings
- ✅ Housekeeping script finds zero masked errors

## Risk Management

- Comprehensive automated tests on error paths
- Rollback: initialise feature branch; if issues arise we can revert in Git (no prod users)

## Appendix

### Appendix A – Masked Error Examples

| File & Line | Issue | Action |
|-------------|-------|--------|
| `components/document-viewer/DocumentViewer.tsx:92` | Permanently shows "Loading…" on fetch failure | Add error state UI |
| `components/tools/ToolsPane.tsx:45` | Silent fallback to empty state | Surface error via toast |
| `lib/content/html-to-markdown.ts:78` | Returns `""` on parse errors | Throw `HtmlParseError` |
| `app/api/upload/route.ts:56` | Generic "Upload failed" | Problem Detail *FileTooLarge* |
| *(to be updated after audit)* | | |

### Appendix B – Core Infrastructure Implementation

```typescript
// lib/api/error-utils.ts
export interface ProblemDetail {
  type: string
  title: string
  status: number
  detail?: string
  instance?: string
  correlationId: string
  retryable?: boolean
}

export class ApplicationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly context: Record<string, unknown> = {},
    public readonly cause?: Error
  ) {
    super(message)
    this.name = code
  }
}

// Domain-specific subclasses: DocumentError, StorageError, AIServiceError, ValidationError …

export function createProblemDetail(opts: ProblemDetail): NextResponse {
  const res = NextResponse.json(opts, { status: opts.status })
  res.headers.set('x-spideryarn-correlation-id', opts.correlationId)
  return res
}
```

### Appendix C – Error Class Catalogue

| Code | Class | Typical Context | User Message Pattern |
|------|-------|-----------------|---------------------|
| `DOCUMENT_NOT_FOUND` | `DocumentError` | DB lookup misses | "Document not found. It may have been deleted. Please check the URL or return to your documents." |
| `FILE_TOO_LARGE` | `ValidationError` | Upload > 10 MB | "File too large (max 10MB). Please reduce file size or split into smaller documents." |
| `AI_RATE_LIMIT` | `AIServiceError` | Anthropic 429 | "AI service temporarily unavailable due to high demand. Please try again in a few minutes." |
| `CIRCULAR_REFERENCE` | `SerializationError` | JSON circular ref | "Unable to process response due to data structure issue. Our team has been notified." |
| *(expand as classes are added)* | | | |

### Appendix D – Future Considerations

- Extend Tool Error Notification UI to wrap non-tool errors
- Integrate external error-tracking (e.g. Sentry) keyed by correlation ID
- Add error recovery mechanisms for retryable errors
- Consider implementing exponential backoff for rate-limited operations

---
**End of document**