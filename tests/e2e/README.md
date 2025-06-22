# Document Access Control E2E Tests

This directory contains comprehensive End-to-End (E2E) tests for the document access control system implemented in the Spideryarn Reading application.

## Overview

The document access control system uses:
- **Conditional Authentication**: Routes use `getAuthUser()` instead of `requireAuth()` to allow both authenticated and anonymous users
- **RLS-Based Access Control**: Document access is controlled by database Row Level Security policies
- **Security-First Error Handling**: "Document not found" and "no permission" errors are conflated for security

## Test Files

### `document-access-control.spec.ts`
Comprehensive test suite covering all access control scenarios:

**Anonymous Users:**
- ✅ Can access public documents
- ✅ Get 404 for private documents (security-first approach)

**Authenticated Users:**
- ✅ Can access own private documents  
- ✅ Get 404 for other users' private documents
- ✅ Can access public documents

**Search Engine Bots:**
- ✅ Can access public documents (for SEO)
- ✅ Get 404 for private documents

**Security Validation:**
- ✅ Error messages don't reveal document existence
- ✅ HTTP status codes are consistent for security
- ✅ Navigation respects access control

### `document-access-control-basic.spec.ts`
Simplified smoke tests for basic functionality:
- Application accessibility for anonymous users
- 404 handling for non-existent documents
- Authentication system accessibility
- Bot user agent handling

### `helpers/document-access-test-utils.ts`
Reusable utilities for access control testing:

**DocumentAccessTestHelper:**
- Document creation with specified visibility/ownership
- Test data cleanup and isolation
- Known test user ID management

**AuthenticationHelper:**
- Browser authentication/logout
- Anonymous user simulation
- Bot user agent configuration

**AccessValidationHelper:**
- 404 error validation
- Document content validation
- Security status code validation
- Error message security validation

**AccessControlScenarios:**
- Test document generation
- Access control matrix testing
- Comprehensive scenario validation

## Test Architecture

### Database Integration
- Uses real Supabase database with RLS policies
- Creates test documents with unique slugs for isolation
- Tests actual database-level security, not mocked access

### Multi-Worktree Support
- Environment-specific test users prevent conflicts
- Port-based environment detection (PORT=3002 for worktree2)
- Isolated authentication sessions per worktree

### Security Testing
- Validates actual RLS policy enforcement
- Tests error message security (no information leakage)
- Verifies HTTP status code consistency
- Bot/crawler access validation for SEO

## Running Tests

### Prerequisites
1. Development server must be running:
   ```bash
   npm run dev:daemon
   npm run dev:status  # Verify server is healthy
   ```

2. Authentication setup (per worktree):
   ```bash
   npm run test:e2e:setup
   ```

### Running Tests
```bash
# Run all document access control tests
npm run test:e2e -- --grep "Document Access Control"

# Run basic smoke tests only
npm run test:e2e -- --grep "Document Access Control - Basic Tests"

# Run comprehensive tests only  
npm run test:e2e -- --grep "Document Access Control" --grep-invert "Basic Tests"

# Run with verbose output
npm run test:e2e -- --grep "Document Access Control" --reporter=list
```

### Test Data Management
- Tests create documents with unique slugs to avoid conflicts
- Automatic cleanup after test completion
- Real database operations (no mocking)
- Isolated per test run

## Security Validation

The tests validate critical security properties:

1. **Access Control Enforcement**: RLS policies correctly grant/deny access
2. **Error Message Security**: No information leakage about document existence
3. **Status Code Consistency**: Same error responses for "not found" vs "no permission"
4. **Anonymous vs Authenticated**: Proper access based on authentication state
5. **Cross-User Isolation**: Users cannot access each other's private documents

## Architecture Validation

The tests validate the new architecture:

1. **Conditional Authentication**: `getAuthUser()` allows both authenticated and anonymous access
2. **RLS Policy Integration**: Database-level security enforcement
3. **NotAuthorizedPage Component**: Uses `notFound()` for security-first error handling
4. **Share Route Removal**: Old `/read/[slug]/share` workaround is no longer needed

## Troubleshooting

### Authentication Timeouts
- Ensure development server is running on correct PORT
- Check `.env.test` configuration
- Verify test user credentials

### Test Failures
- Check server logs: `tail dev.log`
- Verify database connectivity
- Ensure RLS policies are applied correctly

### Database Issues
- Check Supabase local instance is running
- Verify migration status
- Check RLS policy configuration

## Related Documentation

- `docs/reference/TESTING_BROWSER_AUTOMATION_OVERVIEW.md` - E2E testing patterns
- `docs/reference/TESTING_DATABASE.md` - RLS testing approach
- `docs/reference/AUTHENTICATION_TESTING.md` - Auth testing utilities
- `planning/250622_improve_document_access_control.md` - Implementation details