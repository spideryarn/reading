# Service Tests

This directory contains tests for the service layer of the Spideryarn Reading application.

## Database Schema Tests

The `database-schema.test.ts` file contains comprehensive tests for the Supabase database schema.

### Running Database Tests

These tests require a running Supabase instance with the database migration applied.

1. **Set up environment variables**:
   ```bash
   export NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   export NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

2. **Ensure the migration is applied**:
   The migration at `supabase/migrations/20250531235026_comprehensive_storage_schema.sql` must be applied to your Supabase instance.

3. **Run the tests**:
   ```bash
   npm test src/lib/services/__tests__/database-schema.test.ts
   ```

### What the Tests Cover

- **AI Models Table**: Pre-seeded models, unique constraints, provider validation
- **Documents Table**: CRUD operations, MODDATETIME triggers, full-text search
- **AI Calls Table**: Token tracking, status constraints, foreign key relationships
- **Document Enhancements**: JSONB content, unique constraints, cascade deletes
- **Chat Functionality**: Threads, messages, sequence numbers, role validation
- **Foreign Key Relationships**: Proper linking and cascade behavior
- **Profiles Table**: User preferences storage

### Test Data Cleanup

The tests automatically clean up all test data after running to avoid pollution of the database.

### Skipping Tests

If the required environment variables are not set, the tests will be automatically skipped with a helpful message explaining what needs to be configured.