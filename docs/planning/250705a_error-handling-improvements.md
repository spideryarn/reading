# Error Handling Improvements Plan

**Status**: Draft  
**Created**: 2025-01-05  
**Stage**: Planning

## Executive Summary

This document outlines a phased approach to improve error handling across the Spideryarn Reading codebase. The plan prioritises quick wins that enhance error visibility and debugging without requiring architectural changes, followed by systematic standardisation efforts.

## Goals

1. **Immediate visibility**: Surface currently masked errors and improve vague error messages
2. **Consistency**: Standardise API error responses using RFC 9457
3. **Developer experience**: Provide clear patterns and documentation for error handling
4. **User experience**: Ensure all errors are actionable and user-friendly

## Current State Analysis

### Strengths
- Sophisticated Tool Error Notifications system with 6 well-defined error types
- RFC 9457 compliance in tools API
- Good error coverage in most components

### Weaknesses
- Inconsistent API error responses across routes
- Some errors masked by fallbacks/defaults
- Vague or technical error messages in places
- No unified error handling documentation

## Implementation Plan

### Stage 1: Quick Wins (Days 1-3)

**Goal**: Improve error visibility and detail without architectural changes

#### 1.1 Fix Masked/Silent Errors

**Priority files requiring immediate attention:**

| File | Issue | Action |
|------|-------|--------|
| `lib/services/database/documents.ts:160` | Returns empty array on DB error | Throw error instead of masking |
| `lib/services/database/ai-calls.ts:89` | Catches and logs but returns undefined | Propagate error to caller |
| `components/tools/ToolsPane.tsx:45` | Silent fallback to empty state | Show error message |
| `app/api/documents/[id]/route.ts:42` | Generic "Document not found" for all errors | Differentiate auth vs not found |
| `lib/content/html-to-markdown.ts:78` | Silently returns empty string on parse failure | Throw with parse error details |
| `components/document-viewer/DocumentViewer.tsx:92` | Shows "Loading..." forever on error | Display actual error state |

#### 1.2 Enhance Vague Error Messages

**Files with undifferentiated errors:**

| File | Current Message | Improved Message |
|------|-----------------|------------------|
| `app/api/upload/route.ts:56` | "Upload failed" | "Upload failed: File too large (max 10MB)" |
| `app/api/auth/callback/route.ts:78` | "Authentication error" | "Authentication failed: Invalid or expired token" |
| `lib/services/pdf/pdf-processor.ts:112` | "PDF processing error" | "PDF processing failed: Unable to extract text from page 3" |
| `app/api/documents/[id]/content/route.ts:89` | "Failed to update content" | "Content update failed: Document is locked by another user" |
| `components/auth/signup-form.tsx:134` | "Signup failed" | "Signup failed: Email already registered" |

#### 1.3 Add Correlation IDs

Add correlation IDs to all API routes for debugging:

```typescript
// Before
return new NextResponse('Error occurred', { status: 500 })

// After
const correlationId = generateCorrelationId()
logger.error({ error, correlationId }, 'Operation failed')
return NextResponse.json(
  { error: 'Error occurred', correlationId },
  { status: 500 }
)
```

**Priority routes**: All `/api/documents/*`, `/api/upload/*`, `/api/auth/*`

### Stage 2: API Standardisation (Days 4-7)

**Goal**: Adopt RFC 9457 Problem Details across all API routes

#### 2.1 Create Shared Error Utilities

```typescript
// lib/api/errors.ts
export function createProblemDetail(options: {
  type: string
  title: string
  status: number
  detail?: string
  instance?: string
  correlationId?: string
}): NextResponse
```

#### 2.2 Migrate API Routes

**Migration priority order:**

1. **High-traffic routes** (most user impact):
   - `/api/documents/*`
   - `/api/upload/*`
   - `/api/chat/*`

2. **Auth routes** (security critical):
   - `/api/auth/*`
   - `/api/user/*`

3. **Tool routes** (already compliant, minor adjustments):
   - `/api/tools/*`

4. **Utility routes** (lower priority):
   - `/api/health`
   - `/api/metrics`

### Stage 3: Documentation (Days 8-9)

**Goal**: Comprehensive error handling guide

#### 3.1 Create ERROR_HANDLING_PATTERNS.md

**Proposed structure:**

```markdown
# Error Handling Patterns

## Overview
- Philosophy: Fail fast, fail clearly
- Core principles from CODING_PRINCIPLES.md

## Error Display Decision Tree
- When to use toast vs inline vs dialog
- Severity levels and their meanings
- Auto-dismiss timing guidelines

## Frontend Error Patterns

### Component Error States
- useState pattern with examples
- Error boundary usage
- Form validation errors

### Using the Notification System
- When to use which display method
- Severity level guidelines
- Code examples

### Writing User-Friendly Error Messages
- Structure: What happened + Why + What to do
- Avoid technical jargon
- Actionable guidance

## API Error Patterns

### RFC 9457 Problem Details
- Standard structure
- Required vs optional fields
- Examples for common scenarios

### Error Response Examples
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 409 Conflict
- 429 Rate Limited
- 500 Internal Error
- 503 Service Unavailable

### Migration Guide
- Before/after examples
- Step-by-step conversion
- Testing approach

## Tool Error System
- 6 error types and their usage
- Error transformation pipeline
- UI treatment by type

## Best Practices
- Always include correlation IDs
- Log technical details, show user-friendly messages
- Consider retry logic for transient failures
- Test error paths explicitly

## Code Examples
- Full component with error handling
- API route with proper error responses
- Form with validation errors
- Tool execution with error handling
```

### Stage 4: Future Considerations (Days 10+)

**For future evaluation:**

1. **Generalise Tool Error Notifications**
   - Assess feasibility of extending to all app errors
   - Consider success notification support
   - Evaluate persistence needs

2. **Shared Error Types**
   - Define TypeScript interfaces
   - Create error factory functions
   - Standardise error shapes

3. **Error Monitoring**
   - Integration with error tracking service
   - User error reporting
   - Analytics dashboard

## Success Metrics

- Zero masked/silent errors in critical paths
- 100% of API routes using RFC 9457 format
- All error messages include actionable guidance
- Correlation IDs in all error responses
- Comprehensive documentation coverage

## Risk Mitigation

- Test all error paths during migration
- Gradual rollout with monitoring
- Maintain backwards compatibility during transition
- Review changes with team before deployment

## Next Steps

1. Review and approve this plan
2. Create tracking issues for each stage
3. Begin Stage 1 quick wins
4. Schedule progress check-ins

## Appendix: Tool Error Types Reference

The existing tool system defines 6 error types that serve as a model for error handling:

1. **ToolTimeoutError**: Retryable timeout errors
2. **ToolAuthenticationError**: Non-retryable auth failures (shown as dialog)
3. **ToolValidationError**: Non-retryable input validation (shown inline)
4. **ToolServerError**: Retryable server errors
5. **ToolNotFoundError**: Non-retryable missing tool
6. **ToolCancelledError**: User-cancelled operations (brief info toast)

These demonstrate good patterns for error categorisation, retry logic, and appropriate UI treatment based on severity and context.