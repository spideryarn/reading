# Descriptive Error Message Propagation

## Goal

Systematically improve error handling throughout the Spideryarn Reading codebase to provide useful, descriptive, user-visible error messages that help users understand what went wrong and what they can do about it, while preserving technical context for debugging.

## Context

Current error handling in the codebase is inconsistent:
- Many API routes return generic "Something went wrong" messages
- Error context is frequently lost as exceptions propagate through layers
- Some areas have excellent patterns (UserErrorMessageService) that should be replicated
- The tools error hierarchy provides good type safety but isn't consistently used

This impacts both user experience (unhelpful error messages) and developer productivity (difficult debugging).

## User Stories & Acceptance Criteria

### As a user uploading a document
- I see specific error messages like "Your PDF is too large (25MB). Maximum size is 10MB."
- I understand what went wrong: "Unable to extract text from this PDF. It appears to be scanned or image-based."
- I know what to do next: "Please try uploading a text-based PDF or use our OCR option."

### As a developer debugging production issues
- Error logs contain correlation IDs linking user-facing errors to technical details
- Stack traces and original error causes are preserved in logs
- Error categories help identify patterns (storage vs processing vs quota)

### As an AI agent developing features
- Clear error handling patterns guide implementation
- Type-safe error classes prevent information loss
- Consistent patterns across the codebase reduce confusion

## References

- `lib/services/user-error-messages.ts` - Excellent error mapping pattern to replicate
- `lib/tools/executor/types.ts` - Type-safe error hierarchy worth preserving
- `docs/reference/CODING_PRINCIPLES.md` - "Fail fatally & immediately with clear, debuggable, user-visible error messages"
- `docs/reference/LOGGING_BEST_PRACTICES.md` - Structured logging patterns for errors
- `app/api/tools/[toolId]/route.ts` - RFC 9457 Problem Details implementation

## Principles & Key Decisions

1. **User-first messages** - Every error shown to users must be actionable and understandable
2. **Context preservation** - Technical details preserved in logs, not lost in translation
3. **Fail fast and clear** - Per coding principles, surface problems immediately
4. **Consistent patterns** - One way to handle errors across all layers
5. **Type safety** - Leverage TypeScript to ensure error information isn't lost
6. **Progressive enhancement** - Start with critical user paths, expand systematically

## Stages & Actions

### Stage: Preparation and error audit
- [ ] Create test scenarios for common error cases:
  - Document upload failures (size, format, processing)
  - Authentication errors
  - Database operation failures
  - AI service errors (rate limits, timeouts)
- [ ] Document current error messages shown to users for each scenario

### Stage: Create core error infrastructure
- [ ] Create base error classes with context preservation:
  ```typescript
  class ApplicationError extends Error {
    constructor(
      message: string,
      public readonly code: string,
      public readonly context: Record<string, unknown>,
      public readonly cause?: Error
    ) {
      super(message)
      this.name = this.constructor.name
    }
  }
  ```
- [ ] Create domain-specific error classes:
  - `DocumentError` (with documentId, userId, operation)
  - `StorageError` (with bucket, key, operation)
  - `AIServiceError` (with model, prompt, tokens)
  - `ValidationError` (with field, value, constraint)
- [ ] Add error serialization for logging that preserves all context
- [ ] Write tests for error creation and serialization

### Stage: Standardize API error responses
- [ ] Create centralized error response handler:
  ```typescript
  function createApiErrorResponse(
    error: unknown,
    correlationId: string
  ): NextResponse
  ```
- [ ] Implement consistent error response format:
  ```typescript
  interface ApiErrorResponse {
    error: string           // User-friendly message
    code: string           // Machine-readable code
    correlationId: string  // Request tracking
    details?: unknown      // Safe additional context
    retryable?: boolean    // Retry guidance
    userAction?: string    // What user can do
  }
  ```
- [ ] Create error middleware for all API routes
- [ ] Update health checks and tests

### Stage: Enhance UserErrorMessageService
- [ ] Extend error categories to cover all operations:
  - Document operations (upload, delete, update)
  - AI operations (summarize, extract, generate)
  - Authentication (login, signup, session)
  - Search and filtering
- [ ] Add context-aware message generation:
  ```typescript
  getUserMessage(error: ApplicationError): UserErrorInfo
  ```
- [ ] Create error code catalog with user messages
- [ ] Test all error mapping scenarios

### Stage: Update critical user paths - Document upload
- [ ] Replace generic errors in `/api/upload-pdf/route.ts`:
  - Size validation: "Your PDF is 25MB but the maximum size is 10MB"
  - Format validation: "Please upload a PDF file. You uploaded a [format]"
  - Processing errors: Map to specific user guidance
- [ ] Update `/api/upload-html/route.ts` similarly
- [ ] Preserve all context in structured logs
- [ ] Test error scenarios with UI

### Stage: Update critical user paths - Authentication
- [ ] Replace "Authentication failed" with specific messages:
  - "Your session has expired. Please sign in again."
  - "Invalid email or password. Please try again."
  - "Too many login attempts. Please wait 5 minutes."
- [ ] Add proper error context for debugging
- [ ] Ensure security (don't leak user existence)
- [ ] Test all auth error scenarios

### Stage: Update database service errors
- [ ] Replace generic "Failed to X" patterns in `lib/services/database/`:
  - Add operation context (create, update, delete)
  - Include relevant IDs (user, document, etc.)
  - Map database errors to user messages
- [ ] Create database error wrapper:
  ```typescript
  wrapDatabaseOperation<T>(
    operation: () => Promise<T>,
    context: DatabaseContext
  ): Promise<T>
  ```
- [ ] Apply to all database operations
- [ ] Run tests to ensure functionality preserved

### Stage: Update AI/LLM service errors
- [ ] Enhance error handling in LLM operations:
  - Rate limit errors: "AI service is busy. Your request will automatically retry in 30 seconds."
  - Token limit errors: "This document is too long for AI processing. Try selecting a smaller section."
  - Model errors: Map to user-friendly explanations
- [ ] Add retry guidance to errors
- [ ] Include token counts and limits in error context
- [ ] Test with various AI error scenarios

### Stage: Implement error monitoring helpers
- [ ] Create error reporting utilities:
  ```typescript
  reportError(error: ApplicationError, context: ErrorContext): void
  ```
- [ ] Add correlation ID generation and propagation
- [ ] Create error metrics collection (by type, frequency)
- [ ] Document monitoring patterns for production

### Stage: Update documentation
- [ ] Update `docs/reference/CODING_PRINCIPLES.md`:
  - Add section on descriptive error messages
  - Include examples of good vs bad patterns
- [ ] Update `docs/reference/CODING_GUIDELINES.md`:
  - Add error handling patterns section
  - Include code examples for common scenarios
- [ ] Create `docs/reference/ERROR_HANDLING_PATTERNS.md`:
  - Comprehensive guide for error handling
  - Examples for each layer (API, service, database)
  - Testing error scenarios
- [ ] Update `docs/instructions/WRITE_PLANNING_DOC.md`:
  - Add late-stage action: "Verify descriptive error messages"
  - Include error scenario testing in stages

### Stage: Create developer tools
- [ ] Create error message linter/checker:
  - Detect generic error messages
  - Ensure error context included
  - Check for user-friendly messages
- [ ] Add to pre-commit hooks (warning only initially)
- [ ] Create error testing utilities
- [ ] Document usage in developer guide

### Stage: Final validation and rollout
- [ ] Use subagent to test all error scenarios:
  - Document complete user journey with each error type
  - Verify error messages are helpful
  - Check logs contain debugging context
- [ ] Run `npm run check:health --rigorous`
- [ ] Create error handling showcase/demo
- [ ] Get user approval for the new patterns

## Appendix

### Example Error Transformations

**Before**:
```typescript
catch (error) {
  return NextResponse.json({ error: 'Failed to create draft' }, { status: 500 })
}
```

**After**:
```typescript
catch (error) {
  const appError = error instanceof ApplicationError 
    ? error 
    : new DocumentError(
        'Unable to create draft document',
        'DRAFT_CREATION_FAILED',
        { userId, title, error: error.message },
        error
      )
  
  logger.error({
    ...appError.context,
    correlationId,
    stack: appError.stack
  }, appError.message)
  
  const userMessage = userErrorService.getUserMessage(appError)
  
  return createApiErrorResponse(userMessage, correlationId)
}
```

### Error Message Examples

**Storage Errors**:
- ❌ "Storage error"
- ✅ "Unable to save your document. Our storage service is temporarily unavailable. Please try again in a few minutes."

**Validation Errors**:
- ❌ "Invalid input"
- ✅ "Your document title contains invalid characters. Please use only letters, numbers, spaces, and basic punctuation."

**AI Service Errors**:
- ❌ "AI processing failed"
- ✅ "The AI service is currently processing many requests. Your document will be analyzed automatically when capacity is available (usually within 2-3 minutes)."

### Error Context Preservation

Each error should maintain:
1. **User context**: What the user was trying to do
2. **Technical context**: Stack traces, error codes, system state
3. **Debugging context**: IDs, timestamps, correlation IDs
4. **Recovery context**: What can be done to fix/retry

### Integration with Existing Patterns

- Leverage existing `UserErrorMessageService` patterns
- Maintain tools error hierarchy for type safety
- Use Pino structured logging for error context
- Follow RFC 9457 for API error responses where appropriate