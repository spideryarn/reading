# Testing Database

> ✅ **Status**: Current documentation as of June 2025.

This document is the **primary guide** for database testing in the Spideryarn Reading project. It covers our shared database approach, test isolation patterns, and all practical testing guidance.

## See also

- `docs/reference/TESTING_OVERVIEW.md` - Main testing guide with philosophy and basic usage
- `docs/reference/TESTING_SETUP.md` - Configuration and environment setup
- `docs/reference/TESTING_TROUBLESHOOTING.md` - Known issues and workarounds
- `docs/reference/TESTING_DATABASE_CLEANUP.md` - Cleanup utilities and maintenance
- `docs/reference/archive/TESTING_DATABASE_SUPABASE_OPTIONS_RESEARCH.md` - Historical research on database testing approaches
- `docs/reference/DATABASE_OVERVIEW.md` - Database architecture and schema
- `lib/testing/test-isolation-utils.ts` - Test isolation utilities implementation
- `docs/planning/finished/250613b_test_database_shared_approach_migration.md` - Migration history and decisions

## Overview

We use a **shared database approach** where both development and tests use the same local Supabase instance. This eliminates the complexity of maintaining separate test databases while ensuring tests don't interfere with each other or development data.

## Core Principles

⚠️ **CRITICAL RULES**:

1. **NEVER reset the database** - Tests must NEVER reset, truncate, or clear the entire database
2. **UUID-based isolation** - All test data uses unique namespaces to prevent conflicts
3. **Self-cleaning tests** - Tests clean up their own data in `afterEach` hooks
4. **Concurrent-safe** - Tests can run in parallel across multiple worktrees
5. **No state assumptions** - Tests cannot assume an empty or specific database state

## Why Shared Database?

**Supabase's Official Recommendation**: 
> "Application-level tests should not rely on a clean database state, as resetting the database before each test can be slow and makes tests difficult to parallelize. Instead, design your tests to be independent by using unique user IDs for each test case."

**Benefits**:
- **Simplicity** - No additional infrastructure or sync scripts
- **Performance** - 50-100x faster than database resets
- **True parallelization** - Tests run concurrently without conflicts
- **Production-like** - Better reflects real-world conditions
- **Zero maintenance** - Single source of truth for migrations

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

### Core Functions

```typescript
// Generate unique namespace for test isolation
const namespace = getTestNamespace('my-feature-test')
// Returns: 'test_my-feature-test_1718293847123_a1b2c3d4'

// Create unique test emails
const testEmail = createTestEmail(namespace)
const adminEmail = createTestEmail(namespace, 'admin')

// Create test data with namespace
const testUser = createTestUser(namespace, {
  email: 'custom@test.local', // optional override
  fullName: 'Test User'
})

// Track additional data for cleanup
trackTestData(namespace, 'documents', documentId)

// Clean up all test data
const cleanup = getCleanupFunctions(namespace, supabase)
await cleanup.all() // or cleanup.documents(), cleanup.users(), etc.
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
      // Note: no metadata column needed - we track by ID
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

// GOOD - Filter by tracked test IDs
const cleanup = getCleanupFunctions(namespace, supabase)
const testUsers = getTrackedData(namespace)?.users || []

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

- `docs/reference/TESTING_DATABASE_CLEANUP.md` - Cleanup utilities and maintenance
- `lib/testing/test-isolation-utils.ts` - Implementation details
- `docs/reference/TESTING_OVERVIEW.md` - General testing philosophy and setup
- `docs/reference/TESTING_SETUP.md` - Configuration and environment setup
- `docs/reference/archive/TESTING_DATABASE_SUPABASE_OPTIONS_RESEARCH.md` - Historical research on testing approaches