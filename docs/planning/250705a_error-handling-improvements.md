# Error Handling Overhaul Plan

**Status**: Draft  
**Created**: 2025-01-05  
**Last Updated**: 2025-07-05  
**Stage**: Planning

## History

- **2025-07-05** – Merged and superseded `250703b_descriptive_error_message_propagation.md`. All content from that document is now integrated here.

## Executive Summary

Spideryarn Reading currently suffers from inconsistent error responses, occasional silent failures, and vague user‐facing messages. We will perform a single-shot overhaul to:

1. Expose all hidden errors immediately.
2. Introduce a type-safe error infrastructure centred on `ApplicationError` and RFC 9457 *Problem Details* responses.
3. Standardise every API route to emit Problem Details **with correlation IDs**.
4. Provide clear frontend patterns and documentation.
5. Equip developers with lint rules and pre-commit checks that prevent regressions.

Because we have no production users, we will migrate in one go without a backwards-compatibility phase.

## Goals

1. **Zero silent failures** – every unexpected condition throws loudly.
2. **100 % RFC 9457 compliance** across all API routes.
3. **Actionable user messages** following the "What happened + Why + What to do" pattern.
4. **End-to-end correlation tracing** via the `x-spideryarn-correlation-id` response header.
5. **Comprehensive documentation & lint tooling** so future code remains compliant.

## Current State Snapshot

### Strengths
- Tool API already uses RFC 9457 helpers and six well-defined error types.
- Structured Pino logging with correlation IDs is available.

### Weaknesses
- Non-tool routes still return ad-hoc JSON or raw strings.
- Several components mask failures with empty defaults or perpetual loading states.
- No single source-of-truth for error classes or frontend display rules.

---
## Implementation Plan

### Stage 1 – Quick Wins (Days 1-3)

Goal: expose hidden problems and improve obviously vague messages without touching architecture.

1. **Re-audit masked/silent errors** (table below is illustrative; update with latest scan before work starts).
2. **Replace vague messages** with specific, actionable ones.
3. **Introduce global correlation-ID middleware** so *every* request – API or page – receives an ID automatically.

| File & Line | Issue | Action |
|-------------|-------|--------|
| `components/document-viewer/DocumentViewer.tsx:92` | Permanently shows "Loading…" on fetch failure | Add error state UI |
| `components/tools/ToolsPane.tsx:45` | Silent fallback to empty state | Surface error via toast |
| `lib/content/html-to-markdown.ts:78` | Returns `""` on parse errors | Throw `HtmlParseError` |
| `app/api/upload/route.ts:56` | Generic "Upload failed" | Problem Detail *FileTooLarge* |
| *(update this table after audit)* | | |

### Stage 1.5 – Core Infrastructure (Days 2-4)

1. **`lib/api/error-utils.ts`**  
   ```ts
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
2. **Refactor existing helpers** (e.g. Tool route) to use this util.
3. **Add Jest unit tests** for serialisation and header presence.

### Stage 2 – API Standardisation (Days 4-7)

*Single-shot* conversion of every route:

1. Replace all `NextResponse.json({ error:` patterns with `createProblemDetail()`.
2. Map existing status codes & messages to structured Problem Details.
3. Update tests; add integration tests asserting shape (`status`, `type`, `title`, etc.).
4. Frontend adapters: `useProblemDetailError()` hook parses responses and dispatches to toast/dialog/inline based on `status` + optional `retryable`.

### Stage 3 – Documentation & Frontend Patterns (Days 8-9)

1. Publish `docs/reference/ERROR_HANDLING_PATTERNS.md` containing:
   - Notification decision tree
   - Example Problem Details
   - Component patterns & hooks
   - Checklist for writing user-friendly messages
2. Update design system stories to illustrate all error display variants.

### Stage 4 – Developer Tooling & Linting (Days 9-10)

1. **ESLint rule**: forbid empty `catch` blocks, generic messages, and raw `NextResponse.json({ error:`.
2. **`npm run lint:errors`** script wired into pre-commit hook.
3. VS Code snippet pack for `createProblemDetail` and common error subclasses.

### ✅ Stage: Circular Reference Handling (Completed July 2025)
- ✅ Created `lib/utils/safe-json.ts` utility for safe JSON serialisation
- ✅ Updated `AIResponseLogger` to use safeJsonValue helper
- ✅ Implemented placeholder `"[Circular]"` for circular references with warning logs
- [ ] Update unit tests to expect circular reference placeholders
- [ ] Refactor other AI tools to use `safeJsonValue` helper (use subagent):
  - [ ] Structure tool
  - [ ] Summary tool  
  - [ ] Search tool
  - [ ] Metadata tool
- [ ] Add regression test with real Anthropic payload
- [ ] Update `docs/reference/AI_RESPONSE_LOGGING.md` with sanitisation strategy
- [ ] Run `npm run check:health` and fix any issues

### Stage: Final Validation and Cleanup
- [ ] Run comprehensive test suite: `npm run build && npm run lint && npm test`
- [ ] Use subagent to verify all API routes return Problem Details format
- [ ] Use subagent to search for and consolidate redundant error handling tests
- [ ] Review all changed code for descriptive error messages
- [ ] Create housekeeping script to detect masked errors going forward
- [ ] Update team on improvement opportunities discovered during implementation
- [ ] Get user permission to merge branch to main
- [ ] Move this doc to `docs/planning/finished/` and commit
## Success Metrics

- ✅ 100 % of API routes emit RFC 9457 Problem Details.
- ✅ All responses include `x-spideryarn-correlation-id`.
- ✅ No TODO/FIXME comments about "temporary error message".
- ✅ `npm run lint:errors` passes with zero findings.
- ✅ Housekeeping script finds **zero** masked errors.

## Risk Management

- Comprehensive automated tests on error paths.
- Rollback: initialise feature branch; if issues arise we can revert in Git (no prod users).

## Next Steps

1. Create tracking issues per stage.
2. Run masked-error & vague-message audit to refresh Stage 1 table.
3. Implement global correlation-ID middleware.
4. Proceed with Stage 1 fixes, then Stage 1.5 infrastructure.
5. Add a brief note to `docs/reference/CODING_GUIDELINES.md` about error handling and messaging best practices.

## Appendix – Error Class Catalogue

| Code | Class | Typical Context |
|------|-------|-----------------|
| `DOCUMENT_NOT_FOUND` | `DocumentError` | DB lookup misses |
| `FILE_TOO_LARGE` | `ValidationError` | Upload > 10 MB |
| `AI_RATE_LIMIT` | `AIServiceError` | OpenAI 429 |
| *(expand as classes are added)* | | |

---
**End of document**