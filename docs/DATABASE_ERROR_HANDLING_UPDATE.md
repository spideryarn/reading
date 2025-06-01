# Database Error Handling Update

## Overview

Updated the database service layer to properly propagate errors instead of silently returning null/empty arrays. This improves error visibility and debugging capabilities while maintaining backward compatibility where appropriate.

## Changes Made

### 1. Enhanced Error Propagation

All database service files (`documents.ts`, `enhancements.ts`, `chat.ts`, `ai-calls.ts`) now:
- Throw descriptive errors instead of logging to console and returning null
- Return null only for "not found" cases (error code PGRST116)
- Validate UUID format before making database calls to avoid invalid syntax errors

### 2. Method Signature Updates

#### Documents Service
- `update()`: Now returns `Document | null` (was `Document`)
- `delete()`: Now returns `boolean` (was `void`)
- `list()`: Now returns `{ documents: Document[]; hasMore: boolean }` (was `Document[]`)

#### Enhancements Service
- `upsert()`: Now returns `DocumentEnhancement` (was `DocumentEnhancement | null`)
- `delete()`: Now returns `void` (was `boolean`)
- All store methods return `DocumentEnhancement` (was `DocumentEnhancement | null`)

#### Chat Service
- `createThread()`: Now returns `ChatThread` (was `ChatThread | null`)
- `updateThread()`: Now returns `ChatThread` (was `ChatThread | null`)
- `addMessage()`: Now returns `ChatMessage` (was `ChatMessage | null`)
- `deleteThread()`: Now returns `void` (was `boolean`)
- `autoUpdateThreadTitle()`: Now returns `ChatThread` (was `ChatThread | null`)

#### AI Calls Service
- `startCall()`: Now returns `AiCall` (was `AiCall | null`)
- `completeCall()`: Now returns `AiCall | null` (was `AiCall | null`, but now validates UUID)
- `failCall()`: Now returns `AiCall` (was `AiCall | null`)

### 3. UUID Validation

Added UUID format validation for all methods that accept ID parameters. Invalid UUIDs:
- Return `null` for read operations
- Return `false` for delete operations that return boolean
- Return early (no-op) for void operations

### 4. Error Handling Patterns

```typescript
// Before
if (error) {
  console.error('Error message:', error)
  return null
}

// After
if (error) {
  if (error.code === 'PGRST116') { // Not found
    return null
  }
  throw new Error(`Failed to perform operation: ${error.message}`)
}
```

## Benefits

1. **Better Error Visibility**: Errors are now propagated up the call stack where they can be properly handled
2. **Cleaner Code**: No more console.error statements cluttering the service layer
3. **Type Safety**: Return types more accurately reflect possible outcomes
4. **Backward Compatibility**: "Not found" cases still return null as expected by existing code

## Testing

All database integration tests pass successfully with these changes. Tests were updated to:
- Handle the new return types
- Expect proper error propagation
- Work with UUID validation

## Migration Notes

When updating code that uses these services:
1. Handle thrown errors with try/catch blocks
2. Update code that expects null returns from methods that now throw
3. For delete operations, handle the new return types (void or boolean)
4. For list operations, use the new paginated response format