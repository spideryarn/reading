# Error Handling Patterns

## Introduction

This document explains _how Spideryarn Reading handles errors end-to-end_.  It covers the Problem-Detail response format, correlation-ID propagation, and the frontend conventions for surfacing problems to users.  **Goal:** make every error actionable for both users and developers.

## See also

- `docs/reference/CODING_GUIDELINES.md` – overarching coding guidelines (error section summarised here)
- `lib/api/error-utils.ts` – canonical TypeScript definitions for `ProblemDetail` and helper utilities
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

Implementation resides in `lib/hooks/use-api-error-handler.ts` (auto-selected component per table above).

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

- [ ] _What happened_ – one-sentence summary (`title`).
- [ ] _Why it happened_ – brief context (`detail`).
- [ ] _What to do next_ – include guidance or link (`detail`).
- [ ] Provide `retryable` when transient.
- [ ] Map to correct HTTP status (see RFC 9110).
- [ ] Include specific `type` URI (kebab-case).  Keep catalogue in Appendix A below.

## Appendix A – Standard Error Catalogue (excerpt)

| Code | HTTP | Class | Description |
|------|------|-------|-------------|
| `AUTH_REQUIRED` | 401 | `ValidationError` | User must sign in |
| `DOCUMENT_NOT_FOUND` | 404 | `DocumentError` | DB miss |
| `AI_RATE_LIMIT` | 429 | `AIServiceError` | Upstream 429 |
| `STORAGE_ERROR` | 503 | `StorageError` | Supabase/storage outage |

Full list lives in `lib/api/error-utils.ts`. 