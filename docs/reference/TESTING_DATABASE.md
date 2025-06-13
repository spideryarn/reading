# Testing Database

> ✅ **UPDATED**: This documentation reflects the shared database testing approach adopted in June 2025.

This document covers database-specific testing patterns and setup for the Spideryarn Reading project.

## See also

- `docs/reference/TESTING_OVERVIEW.md` - Main testing guide with philosophy and basic usage
- `docs/reference/TESTING_SETUP.md` - Configuration and environment setup
- `docs/reference/TESTING_TROUBLESHOOTING.md` - Known issues and workarounds
- `docs/reference/TESTING_DATABASE_SUPABASE_OPTIONS_RESEARCH.md` - Research and analysis of different test database approaches
- `docs/reference/DATABASE_OVERVIEW.md` - Database architecture and schema
- `lib/testing/test-isolation-utils.ts` - Test isolation utilities
- `docs/reference/AUTHENTICATION_TESTING.md` - Authentication-specific database testing

## Shared Database Testing Approach

⚠️ **IMPORTANT**: We use a **shared database** approach for testing, following Supabase's official recommendations. Tests run against the same local development database, NOT a separate test database.

### Key Principles

1. **No database resets**: Tests must NEVER reset or truncate the database
2. **UUID-based isolation**: All test data uses unique namespaces to avoid conflicts
3. **Self-cleaning tests**: Tests must clean up their own data in afterEach hooks
4. **Concurrent-safe**: Tests must work when run in parallel across multiple worktrees
5. **No assumptions about state**: Tests cannot assume an empty database

### Why Shared Database?

From Supabase's official documentation:
> "Application-level tests should not rely on a clean database state, as resetting the database before each test can be slow and makes tests difficult to parallelize. Instead, design your tests to be independent by using unique user IDs for each test case."

Benefits:
- Simpler infrastructure (no dual-database setup)
- Faster test execution (no reset overhead)
- Better reflects production conditions
- Supports concurrent testing across worktrees
- No migration sync issues

## Test Isolation Utilities

### Core Functions

```typescript
import { 
  getTestNamespace, 
  createTestUser, 
  createTestDocument,
  getCleanupFunctions,
  trackTestData 
} from '@/lib/testing/test-isolation-utils'

// Generate unique namespace for test isolation
const namespace = getTestNamespace('my-feature-test')
// Returns: 'test_my-feature-test_1718293847123_a1b2c3d4'

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

### Required Test Pattern

```typescript
describe('DocumentService', () => {
  let supabase: SupabaseClient
  let documentService: DocumentService
  const namespace = getTestNamespace('document-service-test')
  
  beforeEach(() => {
    supabase = createSupabaseClient()
    documentService = new DocumentService(supabase)
  })
  
  afterEach(async () => {
    // CRITICAL: Clean up test data after each test
    const cleanup = getCleanupFunctions(namespace, supabase)
    await cleanup.all()
  })
  
  it('should create document', async () => {
    // Create test document with namespace
    const testDoc = createTestDocument(namespace, {
      title: 'Test Document'
    })
    
    const document = await documentService.create(testDoc)
    
    // Track for cleanup (if not using createTestDocument helper)
    trackTestData(namespace, 'documents', document.id)
    
    expect(document.title).toBe('Test Document')
    expect(document.metadata.test_namespace).toBe(namespace)
  })
})
```

## Writing Database Tests

### DO's ✅

```typescript
// DO: Use unique namespaces for isolation
const namespace = getTestNamespace('auth-test')
const email = createTestEmail(namespace)

// DO: Clean up test data in afterEach
afterEach(async () => {
  const cleanup = getCleanupFunctions(namespace, supabase)
  await cleanup.all()
})

// DO: Filter assertions by namespace
const users = await supabase
  .from('profiles')
  .select()
  .eq('metadata->test_namespace', namespace)
expect(users.data).toHaveLength(1)

// DO: Use test metadata for tracking
const doc = await documentService.create({
  title: 'Test',
  metadata: createTestMetadata(namespace)
})
```

### DON'Ts ❌

```typescript
// DON'T: Reset the database
await supabase.rpc('reset_db') // NEVER DO THIS

// DON'T: Delete without filtering
await supabase.from('documents').delete() // DESTRUCTIVE

// DON'T: Assume empty tables
const count = await supabase.from('users').select('count')
expect(count).toBe(0) // WRONG ASSUMPTION

// DON'T: Use hardcoded IDs or emails
const user = { email: 'test@example.com' } // NOT UNIQUE

// DON'T: Skip cleanup
// Missing afterEach cleanup leaves test data behind
```

## Test Data Management

### Creating Test Data

Use the provided utilities for consistent test data:

```typescript
// Users
const testUser = createTestUser(namespace, {
  email: 'admin@test.local',
  fullName: 'Admin User',
  metadata: { role: 'admin' }
})

// Documents
const testDoc = createTestDocument(namespace, {
  title: 'Important Document',
  content: '<p>Test content</p>'
})

// Custom data with tracking
const thread = await chatService.createThread({
  document_id: testDoc.id,
  metadata: createTestMetadata(namespace)
})
trackTestData(namespace, 'threads', thread.id)
```

### Cleanup Patterns

```typescript
// Option 1: Clean up everything at once
const cleanup = getCleanupFunctions(namespace, supabase)
await cleanup.all()

// Option 2: Selective cleanup
await cleanup.documents()  // Only documents
await cleanup.users()     // Only users

// Option 3: Manual cleanup for custom data
afterEach(async () => {
  await supabase
    .from('custom_table')
    .delete()
    .eq('test_namespace', namespace)
})
```

## Authentication in Database Tests

### Test User Creation

```typescript
describe('Authenticated Features', () => {
  const namespace = getTestNamespace('auth-features')
  let testUser: any
  
  beforeEach(() => {
    testUser = createTestUser(namespace)
    // Mock authentication context
    jest.spyOn(auth, 'getUser').mockResolvedValue(testUser)
  })
  
  afterEach(async () => {
    const cleanup = getCleanupFunctions(namespace, supabase)
    await cleanup.all()
    jest.restoreAllMocks()
  })
})
```

### RLS Testing with Test Users

```typescript
describe('Row Level Security', () => {
  const namespace = getTestNamespace('rls-test')
  
  it('should enforce document ownership', async () => {
    const user1 = createTestUser(namespace, { email: 'user1@test.local' })
    const user2 = createTestUser(namespace, { email: 'user2@test.local' })
    
    // Create document as user1
    const doc = await documentService.create({
      ...createTestDocument(namespace),
      user_id: user1.id
    })
    
    // Try to access as user2 (should fail)
    const result = await supabase
      .from('documents')
      .select()
      .eq('id', doc.id)
      .eq('user_id', user2.id)
    
    expect(result.data).toHaveLength(0)
  })
})
```

## Common Patterns

### Testing Error Cases

```typescript
it('should handle duplicate emails gracefully', async () => {
  const namespace = getTestNamespace('duplicate-test')
  const email = createTestEmail(namespace)
  
  // Create first user
  await userService.create({ email })
  
  // Attempt duplicate (should fail)
  await expect(
    userService.create({ email })
  ).rejects.toThrow('email already exists')
})
```

### Testing Concurrent Operations

```typescript
it('should handle concurrent document creation', async () => {
  const namespace = getTestNamespace('concurrent-test')
  
  // Create multiple documents concurrently
  const promises = Array.from({ length: 5 }, (_, i) => 
    documentService.create(
      createTestDocument(namespace, { title: `Doc ${i}` })
    )
  )
  
  const documents = await Promise.all(promises)
  
  // Track all for cleanup
  documents.forEach(doc => 
    trackTestData(namespace, 'documents', doc.id)
  )
  
  expect(documents).toHaveLength(5)
})
```

## Migration Testing

When testing migrations in a shared database environment:

```typescript
describe('Migration Validation', () => {
  it('should have required columns', async () => {
    // Query schema information
    const { data: columns } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'documents')
      .eq('table_schema', 'public')
    
    const columnNames = columns?.map(c => c.column_name) || []
    
    // Verify expected columns exist
    expect(columnNames).toContain('upload_metadata')
    expect(columnNames).toContain('upload_ai_call_id')
  })
})
```

## Performance Considerations

### Efficient Cleanup

```typescript
// Good: Batch cleanup operations
const cleanup = getCleanupFunctions(namespace, supabase)
await cleanup.all() // Single transaction for all types

// Less efficient: Individual cleanup calls
await cleanup.documents()
await cleanup.users()
await cleanup.threads()
// Multiple round trips
```

### Query Optimization

```typescript
// Good: Filter by namespace early
const documents = await supabase
  .from('documents')
  .select('id, title')
  .eq('metadata->test_namespace', namespace)
  .limit(10)

// Bad: Fetch all then filter
const allDocs = await supabase.from('documents').select()
const testDocs = allDocs.filter(d => 
  d.metadata?.test_namespace === namespace
)
```

## Troubleshooting

### Test Data Accumulation

If test data accumulates over time:

```bash
# Create cleanup script in scripts/cleanup-test-data.ts
# Run periodically to remove old test data:
npm run cleanup:test-data
```

### Namespace Collisions

Namespaces include timestamp and UUID to prevent collisions:
- Format: `test_${testName}_${timestamp}_${uuid}`
- Example: `test_auth_1718293847123_a1b2c3d4`

### Debugging Failed Cleanup

```typescript
// Add logging to identify cleanup issues
const cleanup = getCleanupFunctions(namespace, supabase)
try {
  await cleanup.all()
} catch (error) {
  console.error('Cleanup failed for namespace:', namespace)
  console.error('Tracked data:', getTrackedData(namespace))
  throw error
}
```

## Best Practices Summary

1. **Always use namespaces**: Every test must have a unique namespace
2. **Track all test data**: Use utilities or manual tracking for cleanup
3. **Clean up in afterEach**: Don't rely on beforeEach cleanup
4. **Test in isolation**: Don't depend on data from other tests
5. **Handle async properly**: Await all database operations
6. **Use test utilities**: Leverage the provided helper functions
7. **Document test data**: Add comments explaining test data relationships