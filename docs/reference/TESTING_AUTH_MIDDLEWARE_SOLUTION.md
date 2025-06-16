# Testing Auth Middleware Solution

## Problem

In Stage 5 of the test restructuring, we identified an execution order issue where auth middleware (`validateAuth()`) is called before input validation in API routes. This causes:

1. 500 errors instead of expected 400 errors for invalid input
2. Tests unable to properly test input validation errors
3. Auth concerns mixed with business logic validation

## Root Cause

The issue occurs because API routes typically follow this pattern:

```typescript
export async function POST(request: NextRequest) {
  try {
    // Auth check happens first
    const user = await validateAuth()  // Throws on failure
    
    // Input validation happens second
    const body = await request.json()
    if (!body.url) {
      return new NextResponse('Invalid URL', { status: 400 })
    }
    
    // Business logic...
  } catch (error) {
    // Auth failures caught here, returning 500
    return new NextResponse('Error', { status: 500 })
  }
}
```

## Solution

### 1. Auth Test Helpers (`lib/testing/auth-test-helpers.ts`)

Created comprehensive auth test helpers that allow tests to control auth behavior:

```typescript
// For testing business logic (auth always succeeds)
authTestScenarios.businessLogic()

// For testing auth failures
authTestScenarios.authFailure('Custom error message')

// For testing with specific user
authTestScenarios.withUser({ id: 'custom-id' })
```

### 2. Test Structure Pattern

Tests should be organized into separate describe blocks for different concerns:

```typescript
describe('API Tests', () => {
  describe('Business Logic Validation', () => {
    // Auth mocked to succeed
    // Test input validation, business rules
  })
  
  describe('Authentication Tests', () => {
    // Test auth failures specifically
  })
  
  describe('Error Priority Testing', () => {
    // Test that auth is checked before validation
  })
})
```

### 3. Mock Setup Order

Critical: Mocks must be set up before importing the route:

```typescript
// ✅ Correct order
jest.mock('@/lib/auth/server-auth', () => ({ ... }))
jest.mock('@/lib/supabase/server', () => ({ ... }))
// ... other mocks ...

// Import route AFTER mocks
import { POST } from '../route'
```

### 4. Route-Specific Considerations

Different routes have different auth patterns:

- **Routes using `validateAuth()`**: Throws on failure, enforces auth
- **Routes using `getUser()`**: Returns `{user, error}`, doesn't enforce auth
- **Chat API**: Uses `getUser()` for optional user context, works without auth

## Implementation Examples

### Extract URL API Test

```typescript
// app/api/extract-url/__tests__/extract-url-auth-validation.test.ts
describe('Extract URL API - Auth vs Validation Testing', () => {
  describe('Input Validation Tests (Auth Succeeds)', () => {
    it('should return 400 for missing URL', async () => {
      // Auth succeeds by default
      const response = await POST(request)
      expect(response.status).toBe(400)
    })
  })
  
  describe('Authentication Tests', () => {
    it('should return 401 when not authenticated', async () => {
      authTestScenarios.authFailure('User not authenticated')
      const response = await POST(request)
      expect(response.status).toBe(401)
    })
  })
})
```

### Chat API Test

```typescript
// Chat doesn't require auth, only uses it for logging
describe('Chat API Tests', () => {
  beforeEach(() => {
    const { getUser } = require('@/lib/auth/server-auth')
    getUser.mockResolvedValue({ user: defaultTestUser, error: null })
  })
})
```

## Key Learnings

1. **Mock early**: Set up all mocks before importing routes
2. **Separate concerns**: Use different test blocks for auth vs validation
3. **Know your route**: Understand if it uses `validateAuth()` or `getUser()`
4. **Error messages matter**: Auth error detection often relies on specific message patterns
5. **Service mocking**: Mock service constructors at module level, not in beforeEach

## Migration Guide

To update existing tests:

1. Add auth test helpers import
2. Move route imports after all mocks
3. Split tests into auth/validation sections
4. Use appropriate auth scenario for each test
5. Update expectations based on route's auth behavior

## Future Considerations

1. Consider moving input validation before auth checks in routes
2. Standardize error handling patterns across all API routes
3. Create route-specific test templates for consistency
4. Document each route's auth requirements clearly