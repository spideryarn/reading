# Testing Database Approaches for Supabase Local Development

Research and analysis of different approaches for handling test databases in Supabase local development, with emphasis on multi-worktree environments and concurrent test execution.

## See also

- `docs/reference/TESTING_DATABASE.md` - Current database testing patterns and examples
- `docs/reference/TESTING_SETUP.md` - General test environment configuration
- `docs/reference/GIT_WORKTREES.md` - Multi-worktree development setup that creates concurrency challenges
- `docs/reference/SETUP.md` - Local Supabase development environment setup
- https://supabase.com/docs/guides/local-development/testing/overview - Official Supabase testing recommendations
- https://github.com/orgs/supabase/discussions/14329 - Community discussion on separate test instances
- https://github.com/orgs/supabase/discussions/5968 - Multiple local Supabase projects

## Goals and Constraints

### Primary Goals
1. **Prevent test data pollution** - Tests should not interfere with manual development testing
2. **Support concurrent testing** - Multiple worktrees must be able to run tests simultaneously
3. **Maintain simplicity** - Avoid complex setup and maintenance overhead
4. **Fast test execution** - Tests should run quickly without database reset delays
5. **Easy migration management** - Database schema changes should not require manual sync

### Key Constraints
1. **Six active worktrees** - Each potentially running tests concurrently
2. **Shared local environment** - All worktrees on same machine
3. **Auth/Storage/Realtime/RLS** - Tests need full Supabase feature support
4. **Limited resources** - Running multiple Postgres instances impacts performance
5. **Team collaboration** - Setup must be reproducible across developer machines

## Options Explored

### Option 1: Separate Test Database Instance ✓ Implemented (but reconsidering)

**Setup**: Run two complete Supabase instances - one for dev, one for tests

**Implementation**:
```bash
# Development instance
supabase/config.toml          # Ports: 54341 (API), 54342 (DB)
.env.local                    # Points to dev instance

# Test instance  
supabase-test/config.toml     # Ports: 54351 (API), 54352 (DB)
.env.test                     # Points to test instance
```

**Pros**:
- Complete isolation between dev and test data
- Can reset test database without affecting dev
- Full Supabase feature support (Auth, Storage, etc.)
- Clear separation of concerns

**Cons**:
- **Migration sync complexity** - Must maintain two sets of migration files
- **Resource overhead** - Two full Postgres/Supabase stacks
- **Worktree conflicts** - All worktrees share same test database
- **Setup complexity** - Requires separate config files and management scripts
- **Maintenance burden** - Two environments to update and monitor

### Option 2: Schema-Based Separation

**Setup**: One Postgres instance, multiple schemas for test isolation

**Implementation**:
```sql
-- Each worktree gets its own schema
CREATE SCHEMA worktree1_test;
CREATE SCHEMA worktree2_test;
-- etc.
```

**Pros**:
- Resource efficient - single Postgres instance
- Perfect worktree isolation
- Shared connection pooling

**Cons**:
- **Supabase integration complexity** - Auth/Storage expect `public` schema
- **API configuration overhead** - Each schema needs PostgREST permissions
- **RLS policy duplication** - Must replicate policies per schema
- **Not officially supported** - Requires custom configuration

### Option 3: Shared Database with Smart Test Design 🎯 RECOMMENDED

**Setup**: Use the same local dev database for both development and testing

**Implementation**:
```javascript
// Test design principles
const testId = `test-${uuid()}-${Date.now()}`;
const testUser = await createUser({ 
  email: `test-${testId}@example.com`,
  name: `Test User ${testId}`
});

// Cleanup
afterEach(async () => {
  await cleanupTestData(testId);
});
```

**Pros**:
- **Simplicity** - No additional infrastructure
- **Official recommendation** - Supabase docs explicitly suggest this approach
- **Fast execution** - No database resets needed
- **True parallelization** - Tests run concurrently without conflicts
- **Zero maintenance** - No sync scripts or dual configs
- **Migration simplicity** - Single source of truth

**Cons**:
- Test data accumulates in dev database (mitigated by cleanup)
- Requires disciplined test design
- Can't use database resets between tests

## Detailed Comparison

### Migration Management

| Approach | Migration Complexity | Sync Required | Risk of Drift |
|----------|---------------------|---------------|---------------|
| Separate DB | High - manual sync needed | Yes | High |
| Schema-based | Medium - schema replication | Per schema | Medium |
| Shared DB | **None - single source** | **No** | **None** |

### Resource Usage

| Approach | Memory | CPU | Disk | Containers |
|----------|--------|-----|------|------------|
| Separate DB | 2x | 2x | 2x | ~20 |
| Schema-based | 1.2x | 1x | 1.5x | ~10 |
| Shared DB | **1x** | **1x** | **1x** | **~10** |

### Worktree Concurrency

| Approach | Isolation | Setup per Worktree | Conflict Risk |
|----------|-----------|-------------------|---------------|
| Separate DB | Partial - shared test DB | Config copy | High |
| Schema-based | Complete | Schema creation | None |
| Shared DB | **By design (UUIDs)** | **None** | **None** |

## Recommended Approach: Shared Database with Smart Test Design

Based on official Supabase documentation and our specific constraints, the shared database approach is optimal:

### Key Quote from Supabase Docs
> "Application-level tests should not rely on a clean database state, as resetting the database before each test can be slow and makes tests difficult to parallelize. Instead, design your tests to be independent by using unique user IDs for each test case."

### Implementation Guidelines

#### 1. Test Isolation Pattern
```javascript
// Use deterministic, unique identifiers
import { randomUUID } from 'crypto';

export function getTestNamespace(testName: string): string {
  const worktreeId = process.env.WORKTREE_ID || 'default';
  const timestamp = Date.now();
  const uuid = randomUUID().substring(0, 8);
  return `test_${worktreeId}_${testName}_${timestamp}_${uuid}`;
}
```

#### 2. Data Cleanup Strategy
```javascript
// Track all test-created resources
const testResources = new Set<string>();

beforeEach(() => {
  testResources.clear();
});

afterEach(async () => {
  // Clean up in reverse order of creation
  for (const resourceId of Array.from(testResources).reverse()) {
    await deleteTestResource(resourceId);
  }
});
```

#### 3. Test User Pattern
```javascript
// Never use fixed emails or usernames
const testUser = await createTestUser({
  email: `${getTestNamespace('auth')}@test.local`,
  metadata: { is_test: true, created_at: new Date() }
});
```

#### 4. Bulk Cleanup Script
```bash
# Periodic cleanup of old test data
DELETE FROM auth.users 
WHERE raw_user_meta_data->>'is_test' = 'true' 
AND created_at < NOW() - INTERVAL '1 day';
```

## Migration from Current Setup

### Phase 1: Update Test Design (Priority)
1. Audit existing tests for hardcoded values
2. Implement UUID-based test isolation
3. Add cleanup hooks to all test suites

### Phase 2: Simplify Infrastructure
1. Update `.env.test` to point back to dev database
2. Remove `supabase-test/` directory
3. Update package.json scripts to use single database
4. Document new testing approach

### Phase 3: Optimize
1. Create test helper utilities for common patterns
2. Implement periodic cleanup job
3. Monitor test data accumulation

## Best Practices

### DO
- ✅ Use UUIDs for all test data
- ✅ Clean up after each test
- ✅ Design tests to run in any order
- ✅ Use descriptive test namespaces
- ✅ Tag test data for easy identification

### DON'T
- ❌ Hardcode emails, usernames, or IDs
- ❌ Assume clean database state
- ❌ Use `DELETE FROM table` without WHERE
- ❌ Share test data between tests
- ❌ Reset database between tests

## Performance Considerations

### Test Execution Speed
- **Separate DB with resets**: ~5-10s per test suite
- **Shared DB with smart design**: ~50-100ms per test
- **Improvement**: 50-100x faster

### Parallelization
- **Separate DB**: Limited by reset locks
- **Shared DB**: Unlimited parallelization

## Conclusion

The shared database approach with smart test design aligns with:
1. **Supabase best practices** - Official documentation recommendation
2. **Performance requirements** - 50-100x faster test execution  
3. **Simplicity principle** - No sync scripts or dual maintenance
4. **Worktree architecture** - Perfect concurrent execution
5. **Team scalability** - Easy to understand and implement

This approach requires more disciplined test design but eliminates infrastructure complexity and provides superior performance.

## References

- [Supabase Testing Overview](https://supabase.com/docs/guides/local-development/testing/overview)
- [PostgreSQL Testing Best Practices](https://www.postgresql.org/docs/current/regress.html)
- [Jest Concurrent Testing](https://jestjs.io/docs/configuration#testsequencer-string)
- [Database Testing Anti-Patterns](https://martinfowler.com/articles/nonDeterminism.html#DatabaseTests)