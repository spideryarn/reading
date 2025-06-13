# Test Isolation Patterns

> ✅ **Status**: Current documentation as of June 2025.

This document explains our test isolation approach for shared database testing, following Supabase's official recommendations.

## Overview

We use a **shared database approach** where both development and tests use the same local Supabase instance. This eliminates the complexity of maintaining separate test databases while ensuring tests don't interfere with each other or development data.

## Core Principles

1. **No Database Resets**: Tests must NEVER reset, truncate, or clear the entire database
2. **UUID-based Isolation**: All test data uses unique namespaces to prevent conflicts
3. **Self-cleaning Tests**: Tests clean up their own data in `afterEach` hooks
4. **Concurrent-safe**: Tests can run in parallel across multiple worktrees

## Test Isolation Utilities

Import from `@/lib/testing/test-isolation-utils`:

```typescript
import { 
  getTestNamespace, 
  createTestEmail, 
  createTestUser,
  createTestDocument,
  getCleanupFunctions,
  trackTestData
} from '@/lib/testing/test-isolation-utils'
```

## Basic Test Pattern

```typescript
describe('My Feature', () => {
  // Create a unique namespace for this test suite
  const namespace = getTestNamespace('my-feature-test')
  
  afterEach(async () => {
    // Clean up all test data created with this namespace
    const cleanup = getCleanupFunctions(namespace, supabase)
    await cleanup.all()
  })
  
  it('should do something', async () => {
    // Create test data with namespace
    const testUser = await createTestUser(namespace)
    const testDoc = await createTestDocument(namespace, testUser.id)
    
    // Your test logic here
    
    // Cleanup happens automatically in afterEach
  })
})
```

## Authentication Test Pattern

For tests that don't interact with the database but need unique emails:

```typescript
describe('Auth Component', () => {
  const namespace = getTestNamespace('auth-component-test')
  const testEmail = createTestEmail(namespace)
  const adminEmail = createTestEmail(namespace, 'admin')
  
  const mockUser = {
    id: 'user-123',
    email: testEmail,
    // ... other properties
  }
  
  // No cleanup needed for mocked tests
})
```

## Multiple Test Emails

When you need multiple unique emails in a test:

```typescript
const namespace = getTestNamespace('multi-user-test')
const primaryEmail = createTestEmail(namespace)
const secondaryEmail = createTestEmail(namespace, 'secondary')
const adminEmail = createTestEmail(namespace, 'admin')
```

## Manual Cleanup Pattern

For fine-grained control over cleanup:

```typescript
describe('Complex Feature', () => {
  const namespace = getTestNamespace('complex-test')
  
  afterEach(async () => {
    const cleanup = getCleanupFunctions(namespace, supabase)
    
    // Clean up specific types
    await cleanup.documents()
    await cleanup.profiles()
    
    // Or clean up everything
    await cleanup.all()
  })
})
```

## Tracking Custom Data

For data types not covered by built-in utilities:

```typescript
it('should handle custom data', async () => {
  const namespace = getTestNamespace('custom-test')
  
  // Create custom data
  const { data: customData } = await supabase
    .from('custom_table')
    .insert({ 
      name: 'test', 
      metadata: { test_namespace: namespace } 
    })
    .select()
    .single()
  
  // Track for cleanup
  trackTestData(namespace, 'custom', customData.id)
  
  // Will be cleaned up by cleanup.all()
})
```

## Common Pitfalls to Avoid

### ❌ Never Do This

```typescript
// BAD - Destroys all data including development data!
beforeEach(async () => {
  await supabase.from('users').delete()
})

// BAD - Assumes empty database
expect(users.data).toHaveLength(0)

// BAD - Hardcoded test emails that can conflict
const testUser = { email: 'test@example.com' }
```

### ✅ Always Do This

```typescript
// GOOD - Namespace isolation
const namespace = getTestNamespace('my-test')
const testEmail = createTestEmail(namespace)

// GOOD - Filter by namespace
const users = await supabase
  .from('profiles')
  .select()
  .eq('metadata->test_namespace', namespace)

// GOOD - Clean up only your test data
afterEach(async () => {
  const cleanup = getCleanupFunctions(namespace, supabase)
  await cleanup.all()
})
```

## Testing with Real RLS

When testing Row Level Security policies:

```typescript
import { RLSTestDatabase } from '@/lib/testing/rls-database-test-utils'

describe('RLS Policies', () => {
  const namespace = getTestNamespace('rls-test')
  let rlsDb: RLSTestDatabase
  
  beforeEach(async () => {
    rlsDb = new RLSTestDatabase(namespace)
    await rlsDb.setup()
  })
  
  afterEach(async () => {
    await rlsDb.cleanup()
  })
  
  it('should enforce document access', async () => {
    const { alice, bob } = await rlsDb.createTestUsers()
    const doc = await rlsDb.createDocument(alice.user.id)
    
    // Test with Alice's client
    const canRead = await rlsDb.testDocumentRead(alice, doc.id)
    expect(canRead).toBe(true)
    
    // Test with Bob's client
    const cannotRead = await rlsDb.testDocumentRead(bob, doc.id)
    expect(cannotRead).toBe(false)
  })
})
```

## Integration with CI/CD

Our test isolation approach works seamlessly with CI/CD pipelines:

- Tests can run in parallel without conflicts
- No need for database setup/teardown steps
- Works with multiple concurrent test runners
- Compatible with GitHub Actions matrix builds

## Cleanup Script

For periodic maintenance, run:

```bash
npm run cleanup:test-data
```

This removes test data older than 24 hours. See `docs/reference/TESTING_DATABASE_CLEANUP.md` for details.

## Migration Guide

If you're updating old tests:

1. Import test isolation utilities
2. Replace hardcoded emails with `createTestEmail(namespace)`
3. Add namespace to all test data creation
4. Add cleanup in `afterEach`
5. Remove any database reset operations

## See Also

- `docs/reference/TESTING_DATABASE.md` - Database testing overview
- `docs/reference/TESTING_DATABASE_CLEANUP.md` - Cleanup utilities
- `lib/testing/test-isolation-utils.ts` - Implementation details