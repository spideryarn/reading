# Test Data Cleanup

> ✅ **Status**: Current documentation as of June 2025.

This document describes how to manage test data in our shared database approach.

## Overview

When using the shared database testing approach, test data accumulates over time. While tests are designed to clean up after themselves, some data may persist due to:
- Test failures that skip cleanup
- Interrupted test runs
- Development/debugging sessions

The cleanup utility helps maintain a clean development database by removing old test data.

## Cleanup Script

### Usage

```bash
# Dry run - shows what would be deleted
npm run cleanup:test-data

# Actually delete stale test data
npm run cleanup:test-data -- --execute

# Verbose output
npm run cleanup:test-data -- --verbose
```

### What It Does

The cleanup script (`scripts/cleanup-test-data.ts`):
- Identifies test data by the presence of `test_namespace` in metadata fields
- Only deletes test data older than 24 hours
- Deletes in reverse dependency order to respect foreign keys
- Shows a summary before deletion
- Runs in dry-run mode by default for safety

### Tables Cleaned

- `profiles` - Test user profiles
- `documents` - Test documents
- `document_enhancements` - AI enhancements for test documents
- `ai_calls` - AI API calls from tests
- `chat_messages` - Chat messages from tests
- `chat_threads` - Chat threads from tests

## When to Run Cleanup

### Manual Cleanup

Run the cleanup script when:
- You notice slow test performance
- Database queries seem slower than usual
- After extensive test development sessions
- Before major test suite runs

### Automated Cleanup (Future)

Consider setting up automated cleanup:
- Daily cron job on development machines
- CI/CD pipeline after test runs
- Git hook after test commits

## Safety Features

The cleanup script includes multiple safety mechanisms:

1. **Namespace Check**: Only deletes data with `test_namespace` metadata
2. **Age Threshold**: Only deletes data older than 24 hours
3. **Dry Run Default**: Shows what would be deleted without actually deleting
4. **Admin Access Required**: Needs `SUPABASE_SERVICE_ROLE_KEY`
5. **Detailed Logging**: Shows exactly what will be/was deleted

## Example Output

```bash
$ npm run cleanup:test-data

🧹 Test Data Cleanup Utility
===========================
Mode: DRY RUN
Time threshold: 24 hours

Scanning for stale test data...

📊 Stale Test Data Summary:
   Profiles: 15
   Documents: 42
   Document Enhancements: 38
   AI Calls: 156
   Chat Messages: 89
   Chat Threads: 12
   -------------------------
   Total: 352 records

⚠️  This is a DRY RUN. No data will be deleted.
To actually delete the data, run with --execute flag:
  npm run cleanup:test-data -- --execute
```

## Troubleshooting

### No Data Found

If the script reports no stale data but you expect some:
- Check that tests are properly using `test_namespace` metadata
- Verify the 24-hour threshold hasn't been reached
- Ensure tests are using the test isolation utilities

### Permission Errors

If you get permission errors:
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`
- Check that the service role key has admin access
- Ensure the database is running

### Foreign Key Errors

If deletion fails with foreign key constraints:
- The script deletes in dependency order, but custom relationships may cause issues
- Check for any custom foreign keys not accounted for
- Consider updating the script's deletion order

## See Also

- `docs/reference/TESTING_DATABASE.md` - Shared database testing approach
- `lib/testing/test-isolation-utils.ts` - Test isolation utilities
- `scripts/cleanup-test-data.ts` - The cleanup script source