# Error Handling Patterns

## Introduction

This document explains _how Spideryarn Reading handles errors end-to-end_.  It covers the Problem-Detail response format, correlation-ID propagation, and the frontend conventions for surfacing problems to users.  **Goal:** make every error actionable for both users and developers.

## See also

- `docs/reference/CODING_GUIDELINES.md` – overarching coding guidelines (error section summarised here)
- `lib/api/error-utils.ts` – canonical TypeScript definitions for `ProblemDetail` and helper utilities
  * `getErrorTitle(status)` – central map of HTTP status → short title
  * `createToolProblemDetail()` – typed helper used by Unified Tool API endpoints (always includes `toolId`)
- `middleware.ts` – global correlation-ID injection middleware
- `components/ui/alert.tsx` – base alert component used by error toasts/banners
- `lib/context/mutation-context.tsx` – provides `showError()` helper consumed by hooks
- `docs/planning/250705a_error_handling_improvements.md` – historical planning document driving this overhaul

## Principles & Decisions (recap)

1. **Zero silent failures** – unexpected states **must** throw.
2. **100 % RFC 9457 Problem Details** – every API error is machine-readable.
3. **Actionable user messaging** – _What happened + Why + What to do_.
4. **Correlation tracing** – every response header includes `x-spideryarn-correlation-id` to join logs/UI.
5. **Retry semantics** – Problem Details may include `retryable: true` to inform exponential-back-off logic.

## Error Lifecycle

```mermaid
flowchart TD
    A(Client Action) -->|fetch| B(API Route)
    B -->|throw ApplicationError| C(createProblemDetail)
    C -->|JSON + header| D(HTTP Response)
    D --> E(Frontend fetch wrapper)
    E --> F(showError(component/hook))
    F --> G(User sees guidance)
```

## Notification Decision Tree

| Condition | Surface To User | Rationale |
|-----------|-----------------|-----------|
| `status < 400` | _No error shown_ | Success.  Correlation-ID still logged. |
| `status === 401` | Modal + redirect to login | Requires authentication. |
| `status === 403` | Toast (danger) | Permission denied, user can navigate elsewhere. |
| `status === 404` | Inline empty-state component | Normal UX – e.g. “Document not found”. |
| `status === 422` | Toast (warning) | Input valid but unprocessable (e.g. readability extract failed). |
| `status === 429 \| 503 \| 504` **and** `retryable` | Toast (info) + auto-retry w/ back-off | Temporary outage. |
| `status >= 500` | Toast (danger) + “Report” link with correlation-ID | Unexpected server failure. |

Implementation resides in `lib/context/error-context.tsx` (decision tree logic) and `lib/hooks/use-api-error-handler.ts`.

## Example Problem Details

```jsonc
// Document not found
{
  "type": "https://spideryarn.com/problems/document_not_found",
  "title": "Document not found",
  "status": 404,
  "detail": "Document not found. It may have been deleted.",
  "correlationId": "89c6df86-5e71-4723-a809-1d4b2e7fa9c1"
}

// AI rate-limit
{
  "type": "https://spideryarn.com/problems/ai_rate_limit",
  "title": "AI service temporarily unavailable",
  "status": 429,
  "detail": "LLM provider returned 429. Please retry later.",
  "correlationId": "b31f9834-2c5e-47d7-b7c0-bba8c1d2d0b6",
  "retryable": true
}
```

## Frontend Component & Hook Patterns

### Hooks

* `useDeleteDocument()` – wraps fetch → automatically calls `showError(problem)` when `!response.ok`.
* `useMutationContext()` – centralises toast helpers `showError()` / `showSuccess()`.

### Components

1. **`<ErrorToast />`** – subscribes to `ErrorContext`; maps status→variant colours.
2. **`<InlineError>`** – lightweight component for within panels.
3. **`<ErrorBoundary>`** (react-error-boundary) – catches render-time exceptions and renders Problem Detail if available.

Usage example:
```tsx
const { mutate, isLoading } = useDeleteDocument({
  onSuccess: () => router.push('/'),
})

return <Button onClick={() => mutate(id)} disabled={isLoading}>Delete</Button>
```
Error body automatically surfaces according to Tree above.

## Checklist – Writing User-Friendly Messages

### Author-Friendly Checklist – Crafting Clear Error Messages

✅ _What happened?_
  • Provide a concise, human-readable **`title`** (≈ 60 chars) that can stand alone in a toast/banner.  
  • Avoid jargon – prefer “Document not found” over “DB_ERR_404”.

✅ _Why did it happen?_
  • Offer 1-2 short sentences in **`detail`** that explain the root cause in plain language.  
  • If the user is at fault, be polite: “The file exceeds the 10 MB limit.”  
  • If the system failed, acknowledge: “Our AI service is temporarily overloaded.”

✅ _What can the user do now?_
  • End the **`detail`** with actionable guidance (link or next step).  
    e.g. “Please reduce the file size or split it into smaller documents.”

✅ _Is it retryable?_
  • Set **`retryable: true`** for transient issues (429/503/504 etc.).  
  • Omit or set to `false` for permanent errors (validation, permission).

✅ _Pick the right HTTP status_
  • 4xx → user can likely fix; 5xx → server fault.  
  • Use 422 for “semantically correct but unprocessable” inputs.

✅ _Use a stable `type` URI_
  • Format: `https://spideryarn.com/problems/<kebab-case-code>`  
  • Add the code to the catalogue (Appendix A) when introducing a new one.

✅ _Keep sensitive data out_
  • Never leak internal IDs, stack traces, or provider secrets.  
  • Log full details server-side; surface only what’s helpful to the user.

See `docs/reference/CODING_GUIDELINES.md#errors` for the complete style-guide.

## PDF Extraction Error Modes

The PDF image extraction system introduces specific error patterns that require careful handling:

### WASM Instantiation Errors
- **When**: WebAssembly module fails to load or initialize
- **HTTP Status**: 500
- **User Message**: "PDF processing system initialization failed. Please try again."
- **Technical Details**: Log WASM module name, error message, and environment info
- **Retryable**: true (may succeed after cold start)

### Memory Limit Exceeded
- **When**: PDF rendering exceeds available memory (1024MB on Vercel)
- **HTTP Status**: 413
- **User Message**: "This PDF is too complex to process. Try splitting it into smaller sections."
- **Technical Details**: Log page dimensions, scale factor, memory usage estimate
- **Retryable**: false

### Processing Timeout
- **When**: Extraction takes longer than timeout limit (5 min on Vercel)
- **HTTP Status**: 504
- **User Message**: "PDF processing timed out. This usually happens with very large or complex documents."
- **Technical Details**: Log elapsed time, page count, extraction method
- **Retryable**: true (with same or different method)

### Direct Extraction Confidence Warning
- **When**: Direct extraction succeeds but with low confidence (<0.4)
- **HTTP Status**: 200 (not an error, but logged as warning)
- **User Message**: N/A (internal logging only)
- **Technical Details**: Log confidence score, bbox dimensions, heuristic details
- **Action**: System automatically falls back to rendering methods

### Storage Configuration Error
- **When**: Supabase bucket rejects image uploads (mime type, RLS policy)
- **HTTP Status**: 503
- **User Message**: "The system cannot store extracted images. Please contact support."
- **Technical Details**: Log bucket name, mime type, RLS policy details
- **Retryable**: false (requires configuration fix)

### Module Loading Error
- **When**: Required PDF processing module fails to load
- **HTTP Status**: 500
- **User Message**: "PDF processing module error. The system may be updating."
- **Technical Details**: Log module name, NODE_MODULE_VERSION if applicable
- **Retryable**: true (may work after deployment completes)

### All Extraction Methods Failed
- **When**: Direct, @napi-rs/canvas, and WASM methods all fail
- **HTTP Status**: 500
- **User Message**: "Unable to extract images from this PDF. The document may use an unsupported format."
- **Technical Details**: Log each method's failure reason, PDF metadata
- **Retryable**: false (fundamental incompatibility)

## Appendix A – Standard Error Catalogue (excerpt)

| Code | HTTP | Class | Description |
|------|------|-------|-------------|
| `AUTH_REQUIRED` | 401 | `ValidationError` | User must sign in |
| `DOCUMENT_NOT_FOUND` | 404 | `DocumentError` | DB miss |
| `AI_RATE_LIMIT` | 429 | `AIServiceError` | Upstream 429 |
| `STORAGE_ERROR` | 503 | `StorageError` | Supabase/storage outage |
| `STORAGE_CONFIG_ERROR` | 503 | `StorageError` | Storage configuration prevents upload |
| `IMAGE_EXTRACTION_FAILED` | 500 | `ProcessingError` | All PDF extraction methods failed |
| `EXTRACTION_MODULE_ERROR` | 500 | `ProcessingError` | PDF processing module load error |
| `PDF_MEMORY_LIMIT` | 413 | `ProcessingError` | PDF too complex, exceeds memory |
| `PDF_TIMEOUT` | 504 | `ProcessingError` | PDF processing timed out |
| `WASM_INIT_ERROR` | 500 | `ProcessingError` | WebAssembly initialization failed |

Full list lives in `lib/api/error-utils.ts`. 

## Correlation-ID Debugging

Every ProblemDetail includes `correlationId` and responses mirror it in the `x-spideryarn-correlation-id` header.  In development builds the toast UI renders the ID and offers a one-click copy button (hover "ID").  Locate the same ID in server logs to trace the request lifecycle end-to-end.

## Variant mapping

The ErrorProvider decision tree maps HTTP status codes to `Alert` variants:

| HTTP status | Variant |
|-------------|---------|
| <400 | info |
| 401-403 | destructive |
| 404 | warning (inline) |
| 422 | warning |
| 429/503/504 + retryable | info |
| ≥500 | destructive |

The mapping lives in `lib/context/error-context.tsx#decideDisplayAndVariant`. 