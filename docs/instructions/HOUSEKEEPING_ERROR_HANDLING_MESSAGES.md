# Housekeeping: Error Handling and Messages

This document provides instructions for periodically reviewing and improving error handling throughout the Spideryarn Reading codebase. Run this process whenever you notice unclear error messages or suspect errors are being masked.

## When to Run This Process

- After adding new features or API endpoints
- When users report confusing error messages
- As part of quarterly code quality reviews
- When debugging issues that seem to "silently fail"
- Before major releases

## Prerequisites

- Familiarity with `docs/reference/CODING_PRINCIPLES.md` (especially "Raise errors early, clearly & fatally")
- Understanding of `docs/reference/ERROR_HANDLING_PATTERNS.md` (once created)
- Access to the Tool Error Notification system (`lib/tools/executor/error-ui.ts`)
- Knowledge of the new **Problem Detail** helpers in `lib/api/error-utils.ts` (especially `createProblemDetail` and the `ApplicationError` hierarchy)
- Ability to run the specialised ESLint task `npm run lint:errors` (checks empty catch blocks, generic messages, and raw `NextResponse.json({ error:` patterns)

## Investigation Process

### Step 0: Run Lint Checks

Before manual investigation, execute the automated lint task:

```bash
npm run lint:errors
```

Fix or document any findings before moving on. The goal is zero lint violations.

### Step 1: Search for Masked Errors

Use subagents to search for patterns that indicate errors being silently handled:

```typescript
// Patterns to search for:
- catch blocks that return default values
- try/catch with empty catch blocks
- .catch(() => null) or .catch(() => undefined)
- error conditions returning empty arrays/objects
- "|| []", "|| {}", "|| ''" in error contexts
- console.error without re-throwing or user notification
- `NextResponse.json({ error:` (raw error envelopes instead of Problem Details)
```

**Example task for subagent:**
```
Search the codebase for catch blocks that might be masking errors. Look for:
1. catch blocks that return default values instead of propagating errors
2. try/catch with logging but no user-visible error
3. Promise .catch() that returns null/undefined/empty values
4. Functions that silently fail and return defaults

Focus on:
- lib/services/database/
- app/api/
- components/ (especially data fetching)

Report specific instances with file:line references.
```

### Step 2: Identify Vague Error Messages

Search for generic or unhelpful error messages:

```typescript
// Patterns to search for:
- "Error occurred"
- "Something went wrong"
- "Failed"
- "Invalid request"
- "Operation failed"
- Single-word errors
- Technical errors shown to users (e.g., "ECONNREFUSED")
```

**Example task for subagent:**
```
Search for vague or generic error messages in the codebase. Look for:
1. Error messages without specific details
2. Technical error codes exposed to users
3. Messages that don't explain what went wrong
4. Messages without actionable guidance

Check both:
- API error responses
- Frontend error displays
- Log messages that might reach users

List each finding with current message and suggested improvement.
```

### Step 3: Check Error Display Consistency

Verify errors are using appropriate display methods:

**For Frontend Errors:**
- Critical errors (auth, data loss) → Should use dialog
- Validation errors → Should be inline near inputs
- Transient errors → Should use toast notifications
- Network/timeout errors → Should be retryable

**For API Errors:**
- Should follow RFC 9457 Problem Details format
- Must include correlation IDs
- Should have appropriate HTTP status codes
- Must distinguish between client errors (4xx) and server errors (5xx)
- Verify the `x-spideryarn-correlation-id` header is present on every response

### Step 4: Validate Error Flows

Test common error scenarios:

1. **Authentication Errors**
   - Expired session
   - Invalid credentials
   - Insufficient permissions

2. **Validation Errors**
   - Missing required fields
   - Invalid formats
   - Business rule violations

3. **Network Errors**
   - Server unavailable
   - Timeout
   - Rate limiting

4. **Data Errors**
   - Not found
   - Conflict/duplicate
   - Referential integrity

### Step 5: Document Findings

Create a summary of issues found:

```markdown
## Error Handling Issues Found

### Masked Errors
1. `file:line` - Description of issue
   - Current: [code snippet]
   - Recommended: [improvement]

### Vague Messages
1. `file:line` - Current: "Error occurred"
   - Recommended: "Unable to save document: File size exceeds 10MB limit"

### Inconsistent Display
1. `component` - Using toast for critical auth error
   - Should use dialog per patterns

### Missing Standards
1. `api/route` - Not using RFC 9457
   - Needs migration to Problem Details format
```

## Improvement Guidelines

### For Masked Errors

**Instead of:**
```typescript
try {
  const result = await database.query(...)
  return result
} catch (error) {
  console.error('Query failed:', error)
  return [] // Silent failure!
}
```

**Do this:**
```typescript
try {
  const result = await database.query(...)
  return result
} catch (error) {
  logger.error({ error, query }, 'Database query failed')
  throw new DatabaseError('Failed to fetch data', { cause: error })
}
```

### For Vague Messages

**Instead of:**
```typescript
return new NextResponse('Upload failed', { status: 400 })
```

**Do this:**
```typescript
return createProblemDetail({
  type: 'https://spideryarn.com/errors/file-too-large',
  title: 'File Too Large',
  status: 400,
  detail: 'The uploaded file exceeds the 10MB size limit. Please compress or split the file.',
  instance: req.url,
  correlationId
})
```

### For User-Facing Messages

Follow the three-part structure:
1. **What happened**: "Document upload failed"
2. **Why**: "The file size exceeds the 10MB limit"
3. **What to do**: "Please compress the file or split it into smaller parts"

## Process Improvements

### Prevent Future Issues

1. **Code Review Checklist**
   - ✓ Are errors propagated, not masked?
   - ✓ Do error messages include context?
   - ✓ Is the appropriate display method used?
   - ✓ Are correlation IDs included (APIs)?

2. **Testing Requirements**
   - Add test cases for error paths
   - Verify error messages are user-friendly
   - Check errors are visible, not logged only

3. **Documentation Updates**
   - Keep `ERROR_HANDLING_PATTERNS.md` current
   - Document new error types in tool system
   - Update examples with real scenarios

4. **Tooling Suggestions**
   - ESLint rule for empty catch blocks
   - Custom rule for generic error messages
   - Pre-commit hook to check error patterns

### Meta-Improvements

To prevent error handling issues:

1. **Make the Right Way Easy**
   - Provide error utility functions
   - Create error message templates
   - Share common error components

2. **Make the Wrong Way Hard**
   - Lint rules against silent failures
   - Type system to enforce error handling
   - Code review automation

3. **Education**
   - Onboarding includes error patterns
   - Regular error handling reviews
   - Share examples of good patterns

## Related Documentation

- `docs/reference/CODING_PRINCIPLES.md` - Core philosophy on error handling
- `docs/reference/ERROR_HANDLING_PATTERNS.md` - Detailed patterns and examples
- `docs/reference/TOOL_ARCHITECTURE_AND_DEVELOPMENT_GUIDE.md` - Tool error system
- `docs/planning/250705a_error-handling-improvements.md` - Current improvement plan
- `lib/tools/executor/types.ts` - Tool error type definitions

## Example Execution

When running this housekeeping process, your workflow might look like:

```bash
# 1. Search for masked errors
# Use subagent to find catch blocks returning defaults

# 2. Search for vague messages  
# Use subagent to find generic error strings

# 3. Review findings and create issues
# Group by priority and component

# 4. Fix highest-impact issues first
# Start with user-facing errors

# 5. Update documentation
# Add new patterns discovered
```

Remember: The goal is to surface problems early and clearly, making debugging easier and improving user experience. When in doubt, fail loudly rather than silently!