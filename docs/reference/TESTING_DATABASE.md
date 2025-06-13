# Testing Database

This document covers database-specific testing patterns and setup for the Spideryarn Reading project.

## See also

- `docs/reference/TESTING_OVERVIEW.md` - Main testing guide with philosophy and basic usage
- `docs/reference/TESTING_SETUP.md` - Configuration and environment setup
- `docs/reference/TESTING_TROUBLESHOOTING.md` - Known issues and workarounds
- `docs/reference/DATABASE_OVERVIEW.md` - Database architecture and schema
- `lib/services/database/__tests__/` - Database service test examples
- `docs/reference/AUTHENTICATION_TESTING.md` - Authentication-specific database testing

## Database Integration Testing

Database integration tests require a running Supabase instance and proper environment configuration.

### Prerequisites

1. **Supabase instance**: Local or remote instance must be accessible
2. **Environment variables**: Properly configured `.env.test` file
3. **Database schema**: Up-to-date migrations applied

### Running Database Tests

```bash
# Run all tests including database tests
npm test

# Run database tests specifically
npm test -- --testPathPattern=database-schema

# Run specific database service tests
npm test lib/services/database/
```

## Environment Setup for Database Tests

### Required Environment Variables

Database tests require these variables in `.env.test`:

```bash
# Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Database connection (if using direct connection)
DATABASE_URL=postgresql://...
```

### Test Database Best Practices

1. **Separate test database**: Use dedicated database instance for testing
2. **Clean state**: Each test should start with a known database state
3. **Isolation**: Tests should not interfere with each other
4. **Cleanup**: Remove test data after test completion

## Database Service Testing Patterns

### Service Layer Tests

Example structure for testing database services:

```typescript
// lib/services/database/__tests__/documents.test.ts
import { DocumentService } from '../documents';
import { createSupabaseTestClient } from '../../test-utils';

describe('DocumentService', () => {
  let supabase: SupabaseClient;
  let documentService: DocumentService;

  beforeEach(() => {
    supabase = createSupabaseTestClient();
    documentService = new DocumentService(supabase);
  });

  it('should create document with metadata', async () => {
    const document = await documentService.create({
      title: 'Test Document',
      content: 'Test content'
    });

    expect(document).toBeDefined();
    expect(document.title).toBe('Test Document');
  });
});
```

### Schema Validation Tests

```typescript
// Test database schema constraints
describe('Database Schema', () => {
  it('should enforce required fields', async () => {
    await expect(
      documentService.create({ title: null })
    ).rejects.toThrow('title is required');
  });

  it('should validate data types', async () => {
    await expect(
      documentService.create({ created_at: 'invalid-date' })
    ).rejects.toThrow('invalid date format');
  });
});
```

## Test Data Management

### Test Data Creation

Use consistent patterns for creating test data:

```typescript
// Test data factory
const createTestDocument = (overrides = {}) => ({
  title: 'Test Document',
  content: 'Default test content',
  user_id: TEST_USER_ID,
  ...overrides
});

// Usage in tests
const document = await documentService.create(
  createTestDocument({ title: 'Custom Title' })
);
```

### Test Data Cleanup

```typescript
describe('DocumentService', () => {
  const createdDocuments: string[] = [];

  afterEach(async () => {
    // Clean up created test data
    for (const id of createdDocuments) {
      await documentService.delete(id);
    }
    createdDocuments.length = 0;
  });

  it('should create document', async () => {
    const document = await documentService.create(createTestDocument());
    createdDocuments.push(document.id);
    
    expect(document).toBeDefined();
  });
});
```

## Authentication in Database Tests

### Test User Management

Database tests often require authenticated contexts:

```typescript
// Mock system user for testing
const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

const createAuthenticatedContext = () => ({
  user: { id: TEST_USER_ID },
  supabase: createSupabaseTestClient()
});
```

### Row Level Security (RLS) Testing

Test RLS policies with different user contexts:

```typescript
describe('Document RLS Policies', () => {
  it('should only return user own documents', async () => {
    const user1Documents = await documentService.listForUser(USER_1_ID);
    const user2Documents = await documentService.listForUser(USER_2_ID);

    expect(user1Documents).not.toContain(user2Documents[0]);
  });
});
```

## Migration Testing

### Schema Migration Validation

```typescript
describe('Database Migrations', () => {
  it('should have all required tables', async () => {
    const { data: tables } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    const tableNames = tables?.map(t => t.table_name) || [];
    expect(tableNames).toContain('documents');
    expect(tableNames).toContain('ai_calls');
  });

  it('should have required columns', async () => {
    const { data: columns } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'documents');

    const columnNames = columns?.map(c => c.column_name) || [];
    expect(columnNames).toContain('upload_metadata');
    expect(columnNames).toContain('upload_ai_call_id');
  });
});
```

## Performance Testing

### Query Performance

```typescript
describe('Database Performance', () => {
  it('should query documents efficiently', async () => {
    const startTime = Date.now();
    
    await documentService.list({ limit: 100 });
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(1000); // Should complete within 1 second
  });
});
```

## Common Database Testing Issues

### Connection Issues
- Verify Supabase instance is running and accessible
- Check network connectivity and firewall settings
- Validate connection string format

### Permission Issues
- Ensure service role key has sufficient permissions
- Verify RLS policies don't block test operations
- Check database user privileges

### Data Consistency Issues
- Implement proper test isolation
- Use transactions for test data management
- Clear test data between test runs

## Database Testing Best Practices

1. **Use transactions**: Wrap tests in transactions that can be rolled back
2. **Mock external dependencies**: Focus on database logic, mock external services
3. **Test edge cases**: Verify constraint violations and error handling
4. **Performance awareness**: Monitor query performance in tests
5. **Schema validation**: Test database constraints and data types
6. **RLS verification**: Ensure security policies work correctly