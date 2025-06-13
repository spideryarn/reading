# Authentication Testing Guide

Comprehensive guide for testing authentication functionality in the Spideryarn Reading application, including testing patterns, mocking strategies, and integration approaches.

## See also

- `docs/reference/TESTING_OVERVIEW.md` - General testing framework and setup
- `docs/reference/AUTHENTICATION_OVERVIEW.md` - Authentication system architecture
- `docs/reference/AUTHENTICATION_SECURITY.md` - Security testing considerations
- `lib/auth/__tests__/` - Authentication utility tests
- `app/auth/__tests__/` - Authentication page and component tests
- `__tests__/auth-integration.test.ts` - Cross-component integration tests

## Authentication Testing Architecture

### Test Organization

**Server-Side Authentication Tests**:
- `lib/auth/__tests__/server-auth.test.ts` - Server authentication utilities
- `lib/auth/__tests__/route-protection.test.ts` - Route authorization
- `lib/auth/__tests__/route-integration.test.ts` - End-to-end route protection

**Client-Side Authentication Tests**:
- `lib/auth/__tests__/client-utils.test.ts` - Client utilities and redirects
- `lib/context/__tests__/auth-context.test.tsx` - React authentication context

**Page and Component Tests**:
- `app/auth/__tests__/auth-pages.test.tsx` - Login/signup page rendering
- `app/auth/__tests__/profile-page.test.tsx` - Profile page integration
- `components/__tests__/auth/` - Authentication form components

**Integration Tests**:
- `__tests__/auth-integration.test.ts` - Cross-component authentication flows
- `lib/services/database/__tests__/profiles.test.ts` - Profile database operations

### Test Categories

**Unit Tests**: Individual authentication utilities and functions
**Component Tests**: Authentication forms and UI components  
**Integration Tests**: Authentication flows across multiple components
**Page Tests**: Full page functionality including server-side auth
**Service Tests**: Database operations and profile management

## Mocking Patterns

### Supabase Client Mocking

**Client-Side Supabase Mock**:
```typescript
// For components using @/lib/supabase/client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(),
      getSession: jest.fn(),
    },
  })),
}))
```

**Server-Side Supabase Mock**:
```typescript
// For server components using @/lib/supabase/server
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve({
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({ eq: jest.fn() })),
      insert: jest.fn(),
      update: jest.fn(),
    })),
  })),
}))
```

**Database Service Mocking**:
```typescript
// Mock ProfileService and DocumentService
jest.mock('@/lib/services/database/profiles', () => ({
  ProfileService: jest.fn().mockImplementation(() => ({
    getByUserId: jest.fn(),
    updateByUserId: jest.fn(),
  })),
}))

jest.mock('@/lib/services/database/documents', () => ({
  DocumentService: jest.fn().mockImplementation(() => ({
    getByUserId: jest.fn(),
    createForUser: jest.fn(),
  })),
}))
```

### Authentication State Mocking

**Authenticated User Mock**:
```typescript
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  aud: 'authenticated',
  role: 'authenticated',
  created_at: '2024-01-01T00:00:00.000Z',
  user_metadata: {},
  app_metadata: {},
}

// Mock successful authentication
mockSupabase.auth.getUser.mockResolvedValue({
  data: { user: mockUser },
  error: null,
})
```

**Unauthenticated State Mock**:
```typescript
// Mock no user
mockSupabase.auth.getUser.mockResolvedValue({
  data: { user: null },
  error: null,
})
```

**Authentication Error Mock**:
```typescript
// Mock authentication error
mockSupabase.auth.getUser.mockResolvedValue({
  data: { user: null },
  error: { message: 'Invalid JWT', code: 'invalid_token' },
})
```

### Next.js Mocking

**Navigation Mocking**:
```typescript
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    refresh: jest.fn(),
  })),
  useSearchParams: jest.fn(() => ({
    get: jest.fn(),
  })),
  redirect: jest.fn(),
}))
```

**Server Action Mocking**:
```typescript
// Mock server-side redirect
jest.mock('next/navigation', () => ({
  redirect: jest.fn(() => {
    throw new Error('NEXT_REDIRECT'); // Next.js redirect behavior
  }),
}))
```

## Testing Server-Side Authentication

### Key Patterns for Server Components

**Testing Server Client Creation**:
```typescript
// Critical: Test that createClient() is properly awaited
it('should await createClient() to prevent type errors', async () => {
  const mockClient = {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
    from: jest.fn(() => ({ select: jest.fn() })),
  }
  
  const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
  mockCreateClient.mockResolvedValue(mockClient as any)
  
  // This would fail if createClient() wasn't awaited
  await render(<ServerComponent />)
  
  expect(mockCreateClient).toHaveBeenCalled()
})
```

**Testing Authentication Guards**:
```typescript
// Test redirect behavior for unauthenticated users
it('should redirect unauthenticated users to login', async () => {
  const mockGetUser = getUser as jest.MockedFunction<typeof getUser>
  mockGetUser.mockResolvedValue({ user: null, error: null })
  
  await expect(async () => {
    render(<ProtectedPage />)
  }).rejects.toThrow('NEXT_REDIRECT')
  
  expect(redirect).toHaveBeenCalledWith('/auth/login?next=/protected-route')
})
```

**Testing Database Integration**:
```typescript
// Test service instantiation and calls
it('should load user profile and documents', async () => {
  const mockProfileService = ProfileService as jest.MockedClass<typeof ProfileService>
  const mockGetByUserId = jest.fn().mockResolvedValue(mockProfile)
  mockProfileService.mockImplementation(() => ({ getByUserId: mockGetByUserId }))
  
  render(<ProfilePage />)
  
  expect(mockGetByUserId).toHaveBeenCalledWith(mockUser.id)
})
```

## Testing Client-Side Authentication

### Form Component Testing

**Login Form Validation**:
```typescript
it('should validate email and password fields', async () => {
  render(<LoginForm />)
  
  // Test invalid email
  await userEvent.type(screen.getByLabelText(/email/i), 'invalid-email')
  await userEvent.click(screen.getByRole('button', { name: /log in/i }))
  
  expect(screen.getByText(/valid email address/i)).toBeInTheDocument()
})
```

**Authentication Context Testing**:
```typescript
it('should update auth state on successful login', async () => {
  const mockSignIn = jest.fn().mockResolvedValue({ error: null })
  mockSupabase.auth.signInWithPassword = mockSignIn
  
  const { result } = renderHook(() => useAuth(), {
    wrapper: AuthProvider,
  })
  
  await act(() => result.current.signIn('test@example.com', 'password'))
  
  expect(mockSignIn).toHaveBeenCalledWith({
    email: 'test@example.com',
    password: 'password',
  })
})
```

### Component Integration Testing

**Profile Dropdown Testing**:
```typescript
it('should display user information and handle logout', async () => {
  render(<ProfileDropdown user={mockUser} />)
  
  expect(screen.getByText(mockUser.email)).toBeInTheDocument()
  
  await userEvent.click(screen.getByText(/log out/i))
  
  expect(mockSupabase.auth.signOut).toHaveBeenCalled()
})
```

## Testing Error Scenarios

### Authentication Errors

**Invalid Credentials**:
```typescript
it('should handle invalid login credentials', async () => {
  mockSupabase.auth.signInWithPassword.mockResolvedValue({
    data: { user: null, session: null },
    error: { message: 'Invalid login credentials' },
  })
  
  render(<LoginForm />)
  
  await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com')
  await userEvent.type(screen.getByLabelText(/password/i), 'wrongpassword')
  await userEvent.click(screen.getByRole('button', { name: /log in/i }))
  
  expect(screen.getByText(/invalid login credentials/i)).toBeInTheDocument()
})
```

**Network Errors**:
```typescript
it('should handle network errors gracefully', async () => {
  mockSupabase.auth.signInWithPassword.mockRejectedValue(new Error('Network error'))
  
  render(<LoginForm />)
  
  // Submit form
  await userEvent.click(screen.getByRole('button', { name: /log in/i }))
  
  expect(screen.getByText(/unexpected error/i)).toBeInTheDocument()
})
```

**Database Errors**:
```typescript
it('should handle profile loading errors', async () => {
  const mockProfileService = ProfileService as jest.MockedClass<typeof ProfileService>
  mockProfileService.mockImplementation(() => ({
    getByUserId: jest.fn().mockRejectedValue(new Error('Database error')),
  }))
  
  render(<ProfilePage />)
  
  expect(await screen.findByText(/error loading profile/i)).toBeInTheDocument()
})
```

## Integration Testing Strategies

### Cross-Component Testing

**Authentication Flow Testing**:
```typescript
describe('Complete authentication flow', () => {
  it('should handle login → redirect → profile access', async () => {
    // Test the full user journey
    const { rerender } = render(<LoginPage />)
    
    // Login
    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'password')
    await userEvent.click(screen.getByRole('button', { name: /log in/i }))
    
    // Simulate successful login
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })
    
    // Navigate to profile
    rerender(<ProfilePage />)
    
    expect(screen.getByText(mockUser.email)).toBeInTheDocument()
  })
})
```

### Route Protection Testing

**Protected Route Access**:
```typescript
it('should enforce authentication on protected routes', async () => {
  // Mock unauthenticated state
  mockGetUser.mockResolvedValue({ user: null, error: null })
  
  await expect(async () => {
    render(<ProtectedDocumentPage params={{ slug: 'test-doc' }} />)
  }).rejects.toThrow('NEXT_REDIRECT')
  
  expect(redirect).toHaveBeenCalledWith('/auth/login?next=/documents/test-doc')
})
```

**Public Route Access**:
```typescript
it('should allow unauthenticated access to public routes', async () => {
  mockGetUser.mockResolvedValue({ user: null, error: null })
  
  render(<PublicDocumentShare params={{ slug: 'test-doc' }} />)
  
  expect(screen.getByText(/shared document/i)).toBeInTheDocument()
})
```

## Performance Testing

### Authentication Performance

**Load Testing Authentication Context**:
```typescript
it('should handle rapid authentication state changes', async () => {
  const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
  
  // Simulate rapid state changes
  act(() => {
    for (let i = 0; i < 100; i++) {
      result.current.signIn('test@example.com', 'password')
    }
  })
  
  expect(result.current.loading).toBe(false)
})
```

**Token Refresh Testing**:
```typescript
it('should handle token refresh without user interruption', async () => {
  // Mock token refresh in middleware
  mockSupabase.auth.getUser
    .mockResolvedValueOnce({ data: { user: mockUser }, error: null })
    .mockResolvedValueOnce({ data: { user: mockUser }, error: null })
  
  render(<AuthenticatedComponent />)
  
  // Simulate token refresh
  await act(() => Promise.resolve())
  
  expect(screen.getByText(/welcome/i)).toBeInTheDocument()
})
```

## Security Testing

### Authentication Security Tests

**CSRF Protection**:
```typescript
it('should include CSRF protection in forms', () => {
  render(<LoginForm />)
  
  // Verify form includes proper security attributes
  const form = screen.getByTestId('login-form')
  expect(form).toHaveAttribute('method', 'POST')
})
```

**Input Sanitization**:
```typescript
it('should sanitize user inputs', async () => {
  render(<LoginForm />)
  
  await userEvent.type(screen.getByLabelText(/email/i), '<script>alert("xss")</script>')
  
  // Verify input is sanitized
  const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
  expect(emailInput.value).not.toContain('<script>')
})
```

**Session Security**:
```typescript
it('should clear sensitive data on logout', async () => {
  const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
  
  // Login
  await act(() => result.current.signIn('test@example.com', 'password'))
  
  // Logout
  await act(() => result.current.signOut())
  
  expect(result.current.user).toBeNull()
  expect(result.current.session).toBeNull()
})
```

## RLS (Row Level Security) Testing

### Quick Reference

**Key Resources**:
- [Supabase Testing Overview](https://supabase.com/docs/guides/local-development/testing/overview)
- [Testing RLS with pgTAP](https://usebasejump.com/blog/testing-on-supabase-with-pgtap)
- [RLS Testing Examples](https://dev.to/davepar/testing-supabase-row-level-security-4h32)

**Best Practices**:
- Use separate test database/project for RLS testing
- Don't rely on clean database state - use unique user IDs per test
- Test both positive (allowed) and negative (blocked) scenarios
- Verify specific error codes: `PGRST116` for "no rows returned"

### Testing Approaches

**Approach 1: Real Authentication with JWT Tokens** (✅ **RECOMMENDED** - Used in production)

This is the current approach used in the Spideryarn Reading codebase. It uses actual JWT authentication to validate database-level RLS policies.

```typescript
import { RealRLSTestSetup, RLSAssertions, RLSTestHelpers } from '@/lib/services/database/__tests__/rls-test-helpers'
import { TEST_USER_IDS } from '@/lib/testing/rls-test-context'

describe('Document RLS policies', () => {
  let setup: RealRLSTestSetup
  
  beforeAll(async () => {
    setup = new RealRLSTestSetup()
  })
  
  afterAll(async () => {
    await setup.cleanup()
  })
  
  it('should prevent cross-user document access', async () => {
    // Create document owned by User A using admin client
    const document = await setup.createTestDocument({
      title: 'User A Document',
      created_by: TEST_USER_IDS.USER_A
    })
    
    // Create authenticated clients for both users
    const userAClient = await setup.createUserClient(TEST_USER_IDS.USER_A)
    const userBClient = await setup.createUserClient(TEST_USER_IDS.USER_B)
    
    // User A should have access to their own document
    const userAResult = await setup.testResourceAccess(userAClient, 'documents', document.id)
    RLSAssertions.assertHasAccess(userAResult, document.id)
    
    // User B should be blocked from User A's document
    const userBResult = await setup.testResourceAccess(userBClient, 'documents', document.id)
    RLSAssertions.assertBlockedAccess(userBResult)
  })
})
```

**Key Features of Real RLS Testing**:
- Uses actual JWT tokens signed with Supabase secret
- Tests database-level RLS policies (not client-side simulation)
- Service role client for test setup, authenticated clients for testing
- Proper handling of RLS error codes (PGRST116)
- Zero false positives - tests fail when they should

**Approach 2: Legacy Simulation** (❌ **DEPRECATED** - Do not use)

```typescript
// ❌ DEPRECATED: This approach simulates RLS with JavaScript filtering
// It was replaced because it provided false confidence in security controls
describe('Document RLS policies', () => {
  let userAClient: SupabaseClient
  let userBClient: SupabaseClient
  
  beforeEach(async () => {
    userAClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)
    userBClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)
    
    // Sign in as different users (requires real test users)
    await userAClient.auth.signInWithPassword({ email: 'userA@test.com', password: 'test123' })
    await userBClient.auth.signInWithPassword({ email: 'userB@test.com', password: 'test123' })
  })
  
  it('should prevent cross-user document access', async () => {
    // This approach was problematic because it didn't test real RLS policies
  })
})
```

**Approach 2: Helper Functions and Patterns**

The `RealRLSTestSetup` class provides several helper methods for common testing patterns:

```typescript
// Create test data with admin privileges (bypasses RLS for setup)
const document = await setup.createTestDocument({
  title: 'Test Document',
  created_by: TEST_USER_IDS.USER_A
})

const aiCall = await setup.createTestAICall({
  document_id: document.id,
  created_by: TEST_USER_IDS.USER_A,
  prompt_type: 'test'
})

// Test resource access with different user contexts
const userAClient = await setup.createUserClient(TEST_USER_IDS.USER_A)
const userBClient = await setup.createUserClient(TEST_USER_IDS.USER_B)

// Use helper methods for standardized testing
const ownerResult = await setup.testResourceAccess(userAClient, 'documents', document.id)
const nonOwnerResult = await setup.testResourceAccess(userBClient, 'documents', document.id)

// Use assertions for consistent validation
RLSAssertions.assertHasAccess(ownerResult)
RLSAssertions.assertBlockedAccess(nonOwnerResult)
```

**Approach 3: Convenience Helper Patterns**

For complex testing scenarios, use the convenience helper methods:

```typescript
// Test complete ownership isolation pattern
await RLSTestHelpers.testOwnershipIsolation(
  setup,
  // Create resource
  () => setup.createTestDocument({ created_by: TEST_USER_IDS.USER_A }),
  // Test access function
  (client, resource) => setup.testResourceAccess(client, 'documents', resource.id),
  // Get resource ID
  (resource) => resource.id
)

// Test profile access (uses different primary key)
const userAClient = await setup.createUserClient(TEST_USER_IDS.USER_A)
const userBClient = await setup.createUserClient(TEST_USER_IDS.USER_B)

const profileResult = await setup.testProfileAccess(userAClient, TEST_USER_IDS.USER_A)
RLSAssertions.assertHasAccess(profileResult)

const blockedProfileResult = await setup.testProfileAccess(userBClient, TEST_USER_IDS.USER_A)
RLSAssertions.assertBlockedAccess(blockedProfileResult)
```

### Common Gotchas

**1. Real vs Simulated RLS Testing**
```typescript
// ❌ DEPRECATED: Client-side simulation (unreliable)
import { RLSTestSetup } from '@/lib/testing/rls-database-test-utils' // OLD FILE

// ✅ Real database-level testing (current approach)
import { RealRLSTestSetup } from '@/lib/services/database/__tests__/rls-test-helpers'
```

**2. NextJS Server Components in Tests**
```typescript
// ❌ This fails in tests - requires request context
import { createClient } from '@/lib/supabase/server' 

// ✅ Use direct Supabase client creation in tests
import { createClient } from '@supabase/supabase-js'
```

**3. RLS Error Codes and Blocking Behavior**
```typescript
// ✅ RLS violations return specific error codes:
expect(error?.code).toBe('PGRST116') // No rows returned (blocked by RLS)

// ✅ RLS assertions handle this automatically:
RLSAssertions.assertBlockedAccess(result) // Expects PGRST116 or null data
RLSAssertions.assertHasAccess(result)     // Expects valid data, no errors
```

**4. Test User Management**
```typescript
// ❌ Don't reset database between tests (slow and unreliable)
afterEach(() => resetDatabase())

// ✅ Use predefined test user IDs (consistent and fast)
import { TEST_USER_IDS } from '@/lib/testing/rls-test-context'
const userAClient = await setup.createUserClient(TEST_USER_IDS.USER_A)
```

**5. Service Role vs Anon Key**
```typescript
// Service role bypasses ALL RLS - use for test setup only
const adminClient = setup.getAdminClient() // Uses service role

// Anon key + JWT respects RLS - use for actual testing  
const userClient = await setup.createUserClient(userId) // Uses anon key + auth
```

**6. JWT Token Requirements**
```typescript
// ✅ Ensure SUPABASE_JWT_SECRET is set in test environment
if (!process.env.SUPABASE_JWT_SECRET) {
  throw new Error('SUPABASE_JWT_SECRET required for RLS testing')
}

// JWT tokens are automatically generated by RealRLSTestSetup
const client = await setup.createUserClient(userId) // Handles JWT creation
```

### Service Layer Testing with Real RLS

```typescript
// Test service layer with real RLS policies (current approach)
describe('DocumentService RLS integration', () => {
  let setup: RealRLSTestSetup
  
  beforeAll(async () => {
    setup = new RealRLSTestSetup()
  })
  
  it('should enforce document ownership through RLS policies', async () => {
    // Create document owned by User A
    const document = await setup.createTestDocument({
      title: 'User A Document',
      created_by: TEST_USER_IDS.USER_A
    })
    
    // Create authenticated clients
    const userAClient = await setup.createUserClient(TEST_USER_IDS.USER_A)
    const userBClient = await setup.createUserClient(TEST_USER_IDS.USER_B)
    
    // Create service instances with user context
    const userADocService = new DocumentService(userAClient)
    const userBDocService = new DocumentService(userBClient)
    
    // User A should access their document
    const userADoc = await userADocService.getById(document.id)
    expect(userADoc).not.toBeNull()
    expect(userADoc?.id).toBe(document.id)
    
    // User B should be blocked by RLS
    const userBDoc = await userBDocService.getById(document.id)
    expect(userBDoc).toBeNull() // RLS blocks access
  })
})
```

### Legacy Service Layer Testing (Deprecated)

```typescript
// ❌ DEPRECATED: Mocked authentication approach (unreliable)
describe('DocumentService user isolation', () => {
  it('should only return documents for the authenticated user', async () => {
    const mockGetUser = getUser as jest.MockedFunction<typeof getUser>
    
    // This approach was problematic because:
    // 1. It didn't test actual RLS policies
    // 2. Required complex mocking infrastructure
    // 3. Could pass tests while RLS was broken
    
    // Replaced with real RLS testing above
  })
})
```

### API Route Authentication Testing

```typescript
// Current approach: API routes rely on RLS policies for security
describe('API route RLS integration', () => {
  let setup: RealRLSTestSetup
  
  beforeAll(async () => {
    setup = new RealRLSTestSetup()
  })
  
  it('should enforce document ownership through RLS', async () => {
    // Create document owned by User A
    const document = await setup.createTestDocument({
      title: 'User A Document', 
      created_by: TEST_USER_IDS.USER_A
    })
    
    // Create JWT tokens for authentication
    const userAToken = setup.createTestJWT(TEST_USER_IDS.USER_A)
    const userBToken = setup.createTestJWT(TEST_USER_IDS.USER_B)
    
    // User A should access their document
    const userARequest = new NextRequest(`http://localhost:3000/api/documents/${document.slug}`, {
      headers: { 'Authorization': `Bearer ${userAToken}` }
    })
    const userAResponse = await GET(userARequest, { params: { slug: document.slug } })
    expect(userAResponse.status).toBe(200)
    
    // User B should be blocked by RLS
    const userBRequest = new NextRequest(`http://localhost:3000/api/documents/${document.slug}`, {
      headers: { 'Authorization': `Bearer ${userBToken}` }
    })
    const userBResponse = await GET(userBRequest, { params: { slug: document.slug } })
    expect(userBResponse.status).toBe(404) // RLS blocks access
  })
})
```

### Legacy API Route Testing (Deprecated)

```typescript
// ❌ DEPRECATED: Complex mocking approach
describe('API route authentication', () => {
  it('should enforce document ownership', async () => {
    // This approach required extensive mocking and didn't test real RLS
    const mockGetUser = getUser as jest.MockedFunction<typeof getUser>
    const mockIsOwnedByUser = jest.fn().mockResolvedValue(false)
    // ... complex mocking setup that could miss real security issues
  })
})
```

### Test User Factory Pattern

```typescript
// Simple test user factory for consistent test data
const createTestUser = (identifier: string) => ({
  id: `user-${identifier}-${Date.now()}`,
  email: `${identifier}@test.com`,
  password: 'test123'
})

// Usage in tests
describe('Multi-user scenarios', () => {
  it('should maintain document ownership boundaries', async () => {
    const alice = createTestUser('alice')
    const bob = createTestUser('bob')
    
    // Mock alice context and create document
    mockGetUser.mockResolvedValue({ user: alice, error: null })
    const aliceDoc = await DocumentService.createForUser(alice.id, { title: 'Alice Doc' })
    
    // Mock bob context and test access
    mockGetUser.mockResolvedValue({ user: bob, error: null })
    const bobAccess = await DocumentService.isOwnedByUser(aliceDoc.id, bob.id)
    
    expect(bobAccess).toBe(false)
  })
})
```

## Critical Security Discovery and Fix

### AI Calls RLS Vulnerability (Fixed)

**Issue**: The original AI calls RLS policy had a critical security vulnerability that allowed any authenticated user to access any document-independent AI call created by any other user.

**Root Cause**: The policy used `OR` logic that was too permissive:
```sql
-- ❌ VULNERABLE: Original policy
CREATE POLICY "ai_calls_access_policy" ON "public"."ai_calls"
AS PERMISSIVE FOR ALL TO authenticated
USING (
  auth.uid() = created_by OR 
  (
    document_id IS NULL OR 
    document_id IN (
      SELECT id FROM documents WHERE created_by = auth.uid()
    )
  )
);
```

**Problem**: The `document_id IS NULL` condition allowed access to ANY document-independent AI call, regardless of who created it.

**Discovery**: Found during real RLS testing implementation when User B could access User A's document-independent AI calls.

**Fix**: Applied in migration `20250613000003_fix_admin_policy_security_bugs.sql`:
```sql
-- ✅ SECURE: Fixed policy with proper AND logic
CREATE POLICY "ai_calls_access_policy" ON "public"."ai_calls"
AS PERMISSIVE FOR ALL TO authenticated
USING (
  auth.uid() = created_by AND (
    document_id IS NULL OR 
    document_id IN (
      SELECT id FROM documents WHERE created_by = auth.uid()
    )
  )
);
```

**Validation**: All 8 RLS tests now pass, confirming the security fix works correctly.

**Lessons Learned**:
1. **Real RLS testing is essential** - The simulated approach missed this vulnerability
2. **Complex RLS policies need careful review** - `OR` conditions can create unintended access
3. **Test document-independent scenarios** - Don't just test document-linked resources
4. **Cross-user access tests are critical** - Always test that User B cannot access User A's data

## Real RLS Testing Implementation Guide

### Quick Start

1. **Import the real RLS testing infrastructure**:
```typescript
import { RealRLSTestSetup, RLSAssertions } from '@/lib/services/database/__tests__/rls-test-helpers'
import { TEST_USER_IDS } from '@/lib/testing/rls-test-context'
```

2. **Set up test infrastructure**:
```typescript
describe('Your RLS tests', () => {
  let setup: RealRLSTestSetup
  
  beforeAll(async () => {
    setup = new RealRLSTestSetup()
  })
  
  afterAll(async () => {
    await setup.cleanup()
  })
})
```

3. **Test ownership isolation pattern**:
```typescript
it('should enforce user isolation', async () => {
  // Create resource owned by User A
  const resource = await setup.createTestDocument({
    created_by: TEST_USER_IDS.USER_A
  })
  
  // Test access with different user contexts
  const userAClient = await setup.createUserClient(TEST_USER_IDS.USER_A)
  const userBClient = await setup.createUserClient(TEST_USER_IDS.USER_B)
  
  // User A should have access
  const ownerResult = await setup.testResourceAccess(userAClient, 'documents', resource.id)
  RLSAssertions.assertHasAccess(ownerResult)
  
  // User B should be blocked
  const blockedResult = await setup.testResourceAccess(userBClient, 'documents', resource.id)
  RLSAssertions.assertBlockedAccess(blockedResult)
})
```

### Environment Requirements

Ensure your test environment has these variables:
```bash
# Required for RLS testing
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_JWT_SECRET=your_jwt_secret  # Required for token generation
```

### Common Test Patterns

**Document Ownership Isolation**:
```typescript
it('documents respect user ownership', async () => {
  const document = await setup.createTestDocument({ created_by: TEST_USER_IDS.USER_A })
  
  const userAClient = await setup.createUserClient(TEST_USER_IDS.USER_A)
  const userBClient = await setup.createUserClient(TEST_USER_IDS.USER_B)
  
  const ownerAccess = await setup.testResourceAccess(userAClient, 'documents', document.id)
  const nonOwnerAccess = await setup.testResourceAccess(userBClient, 'documents', document.id)
  
  RLSAssertions.assertHasAccess(ownerAccess)
  RLSAssertions.assertBlockedAccess(nonOwnerAccess)
})
```

**Profile Access Isolation**:
```typescript
it('profiles respect user isolation', async () => {
  await setup.createTestProfile({ user_id: TEST_USER_IDS.USER_A })
  
  const userAClient = await setup.createUserClient(TEST_USER_IDS.USER_A)
  const userBClient = await setup.createUserClient(TEST_USER_IDS.USER_B)
  
  const ownProfile = await setup.testProfileAccess(userAClient, TEST_USER_IDS.USER_A)
  const otherProfile = await setup.testProfileAccess(userBClient, TEST_USER_IDS.USER_A)
  
  RLSAssertions.assertHasAccess(ownProfile)
  RLSAssertions.assertBlockedAccess(otherProfile)
})
```

**AI Calls with Document Relationships**:
```typescript
it('AI calls follow document ownership', async () => {
  const document = await setup.createTestDocument({ created_by: TEST_USER_IDS.USER_A })
  const aiCall = await setup.createTestAICall({ 
    document_id: document.id,
    created_by: TEST_USER_IDS.USER_A 
  })
  
  const userAClient = await setup.createUserClient(TEST_USER_IDS.USER_A)
  const userBClient = await setup.createUserClient(TEST_USER_IDS.USER_B)
  
  const ownerAccess = await setup.testResourceAccess(userAClient, 'ai_calls', aiCall.id)
  const nonOwnerAccess = await setup.testResourceAccess(userBClient, 'ai_calls', aiCall.id)
  
  RLSAssertions.assertHasAccess(ownerAccess)
  RLSAssertions.assertBlockedAccess(nonOwnerAccess)
})
```

### Troubleshooting RLS Tests

**Test Failures (Often Expected)**:
- RLS tests are designed to fail when access should be blocked
- Use `RLSAssertions.assertBlockedAccess()` to properly handle expected failures
- Error code `PGRST116` indicates RLS is working correctly

**JWT Token Issues**:
```typescript
// Ensure JWT secret is configured
if (!process.env.SUPABASE_JWT_SECRET) {
  throw new Error('SUPABASE_JWT_SECRET required for RLS testing')
}

// JWT tokens are automatically created by RealRLSTestSetup
// No manual token management needed
```

**Performance Issues**:
- RLS tests should complete in <500ms each
- Use `beforeAll/afterAll` instead of `beforeEach/afterEach` for setup
- Don't reset the entire database between tests

**False Positives**:
- If tests pass when they should fail, check that you're using authenticated clients (not admin)
- Verify JWT tokens are being used: `client.auth.getUser()` should return the test user
- Ensure you're testing with anon key, not service role key

## Testing Best Practices

### Test Organization

1. **Group Related Tests**: Use `describe` blocks to group authentication scenarios
2. **Clear Test Names**: Use descriptive test names that explain the scenario
3. **Setup and Teardown**: Clear mocks between tests to avoid interference
4. **Mock Isolation**: Keep mocks focused and avoid over-mocking

### Mock Management

1. **Consistent Mocking**: Use the same mock patterns across similar tests
2. **Mock Reset**: Clear mocks in `beforeEach` or `afterEach` hooks
3. **Mock Validation**: Verify mocks are called with expected parameters
4. **Error Simulation**: Test both success and failure scenarios

### Test Data

1. **Realistic Data**: Use realistic user data that matches production patterns
2. **Edge Cases**: Test with empty data, malformed data, and edge cases
3. **Data Isolation**: Each test should use independent test data
4. **UUID Validation**: Use valid UUID formats for user IDs and resource IDs

### Integration Testing

1. **User Journey Focus**: Test complete user workflows
2. **Component Boundaries**: Test integration points between components
3. **State Management**: Verify state updates across component boundaries
4. **Error Propagation**: Test how errors propagate through the authentication system

---

*Last updated: 13 June 2025*  
*Testing Status: Real RLS Testing Implementation ✅*  
*Security Status: Critical AI calls vulnerability discovered and fixed ✅*  
*Next review: After RLS policy changes or security updates*