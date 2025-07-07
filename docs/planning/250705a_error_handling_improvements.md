# Error Handling Overhaul Plan

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

### ✅ Stage: Quick Wins - Expose Hidden Errors (COMPLETE – 2025-07-07)
- [x] Re-audited masked/silent errors across codebase
  - [x] Searched for empty `catch` blocks (none found)
  - [x] Reviewed loading-state components and ensured error branches exist
  - [x] Grepped for vague messages (`"Something went wrong"`, `"Unknown error"`) and replaced or contextualised where appropriate
- [x] Replaced vague messages in API routes (`create-draft-document`, `realtime-demo`, `upload-pdf-single-page-image`) with actionable Problem-Detail-style responses
- [x] Implemented **global correlation-ID middleware** in `middleware.ts` (automatically injects and returns `x-spideryarn-correlation-id` on every request)
- [x] Ran `npm run check:health` – resolved TypeScript and lint issues; all checks pass

> Outcome: Silent failures surface clearly, correlation tracing is universal, and codebase compiles & lints cleanly.

### ✅ Stage: Core Infrastructure (COMPLETE – 2025-07-07)
- [x] Create `lib/api/error-utils.ts` with ProblemDetail interface and ApplicationError class (see Appendix B)
- [x] Add domain-specific error subclasses (DocumentError, StorageError, AIServiceError, ValidationError)
- [x] Implement `createProblemDetail()` helper function
- [x] Write Jest unit tests for serialisation and header presence
- [ ] Refactor existing tool error helpers to use new infrastructure *(in progress – started with `create-draft-document`, `realtime-demo`; remaining routes & helpers to be migrated in next stage)*
- [x] Run tests and verify all pass (`npm test`, `npx tsc --noEmit`)

### Stage: API Route Standardisation
- [x] Create list of all API routes needing conversion (initial inventory below)

  **Initial conversion inventory (to be updated as work proceeds):**
  - `app/api/chat/route.ts`
  - ~~`app/api/delete-document/route.ts`~~ ✅ converted
  - `app/api/extract-url/route.ts`
  - ~~`app/api/fake_error/route.ts`~~ ✅ converted
  - `app/api/fake_success_delay/route.ts`
  - `app/api/finalise-vision-document/route.ts`
  - ~~`app/api/profile/background/route.ts`~~ ✅ converted
  - `app/api/read/[slug]/download/route.ts`
  - `app/api/read/[slug]/original/route.ts`
  - `app/api/read/[slug]/tooltip-info/route.ts`
  - ~~`app/api/speech-to-text/route.ts`~~ ✅ converted
  - ~~`app/api/stripe/create-checkout-session/route.ts`~~ ✅ converted
  - ~~`app/api/stripe/create-customer/route.ts`~~ ✅ converted
  - ~~`app/api/stripe/create-portal-session/route.ts`~~ ✅ converted
  - `app/api/stripe/webhook/route.ts`
  - `app/api/tools/[toolId]/route.ts`
  - `app/api/tweet-thread/route.ts`
  - `app/api/upload-html/route.ts`
  - ~~`app/api/upload-pdf/route.ts`~~ ✅ converted
  - `app/api/read/[slug]/tooltip-info/route.ts` (partial successes handled; error branches need migration)
  - *(Quick-win routes already converted: create-draft-document, realtime-demo, upload-pdf-single-page-image)*

### Stage: Documentation & Frontend Patterns
- [ ] Create `docs/reference/ERROR_HANDLING_PATTERNS.md` (following instructions in `docs/instructions/WRITE_EVERGREEN_DOC.md`) with:
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