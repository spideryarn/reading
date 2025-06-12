# Authentication Testing Guide

Comprehensive guide for testing authentication functionality in the Spideryarn Reading application, including testing patterns, mocking strategies, and integration approaches.

## See also

- `docs/reference/TESTING.md` - General testing framework and setup
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

## Multi-User Context Switching for RLS Testing

### Row Level Security (RLS) Testing Patterns

**Database-Level Multi-User Testing**:
```typescript
// Test user isolation at database level
describe('Document RLS policies', () => {
  let userAClient: SupabaseClient
  let userBClient: SupabaseClient
  
  beforeEach(async () => {
    // Create test users with different auth contexts
    userAClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)
    userBClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)
    
    // Sign in as different users
    await userAClient.auth.signInWithPassword({ email: 'userA@test.com', password: 'test123' })
    await userBClient.auth.signInWithPassword({ email: 'userB@test.com', password: 'test123' })
  })
  
  it('should prevent User A from accessing User B documents', async () => {
    // User B creates document
    const { data: docB } = await userBClient
      .from('documents')
      .insert({ title: 'User B Document', content: 'Private content' })
      .select()
      .single()
    
    // User A tries to access User B's document
    const { data: accessAttempt, error } = await userAClient
      .from('documents')
      .select('*')
      .eq('id', docB.id)
      .single()
    
    expect(accessAttempt).toBeNull()
    expect(error?.code).toBe('PGRST116') // No rows returned
  })
})
```

**Application-Level Multi-User Testing**:
```typescript
// Test service layer with different user contexts
describe('DocumentService user isolation', () => {
  it('should only return documents for the authenticated user', async () => {
    // Mock different users
    const mockGetUser = getUser as jest.MockedFunction<typeof getUser>
    
    // Test User A
    mockGetUser.mockResolvedValue({ 
      user: { id: 'user-a-id', email: 'userA@test.com' }, 
      error: null 
    })
    
    const userADocuments = await DocumentService.getByUserId('user-a-id')
    
    // Test User B  
    mockGetUser.mockResolvedValue({ 
      user: { id: 'user-b-id', email: 'userB@test.com' }, 
      error: null 
    })
    
    const userBDocuments = await DocumentService.getByUserId('user-b-id')
    
    // Verify isolation
    expect(userADocuments).not.toEqual(userBDocuments)
    expect(userADocuments.every(doc => doc.created_by === 'user-a-id')).toBe(true)
    expect(userBDocuments.every(doc => doc.created_by === 'user-b-id')).toBe(true)
  })
})
```

**API Route Multi-User Testing**:
```typescript
// Test API routes with different user sessions
describe('API route authentication', () => {
  it('should enforce document ownership in API routes', async () => {
    // Mock User A accessing User B's document
    const mockGetUser = getUser as jest.MockedFunction<typeof getUser>
    mockGetUser.mockResolvedValue({ 
      user: { id: 'user-a-id' }, 
      error: null 
    })
    
    // Mock DocumentService to return User B's document
    const mockIsOwnedByUser = jest.fn().mockResolvedValue(false)
    DocumentService.prototype.isOwnedByUser = mockIsOwnedByUser
    
    const request = new NextRequest('http://localhost:3000/api/documents/user-b-doc/download')
    const response = await GET(request, { params: { slug: 'user-b-doc' } })
    
    expect(response.status).toBe(404) // Access denied (disguised as not found)
    expect(mockIsOwnedByUser).toHaveBeenCalledWith('user-b-doc', 'user-a-id')
  })
})
```

### Multi-User Test Factory Patterns

**User Factory for Consistent Test Data**:
```typescript
interface TestUser {
  id: string
  email: string
  mockClient: SupabaseClient
}

const createTestUser = async (identifier: string): Promise<TestUser> => {
  const email = `${identifier}@test.com`
  const id = `user-${identifier}-${Date.now()}`
  
  const mockClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)
  
  // In real tests, create actual user or mock appropriately
  const mockGetUser = getUser as jest.MockedFunction<typeof getUser>
  mockGetUser.mockResolvedValue({ 
    user: { id, email, aud: 'authenticated' }, 
    error: null 
  })
  
  return { id, email, mockClient }
}

// Usage in tests
describe('Multi-user document scenarios', () => {
  let alice: TestUser
  let bob: TestUser
  
  beforeEach(async () => {
    alice = await createTestUser('alice')
    bob = await createTestUser('bob')
  })
  
  it('should maintain document ownership boundaries', async () => {
    // Alice creates document
    const aliceDoc = await DocumentService.createForUser(alice.id, { title: 'Alice Doc' })
    
    // Bob tries to access Alice's document
    const bobAccess = await DocumentService.isOwnedByUser(aliceDoc.id, bob.id)
    
    expect(bobAccess).toBe(false)
  })
})
```

**Context Switching Utilities**:
```typescript
// Helper for switching authentication context in tests
class TestAuthContext {
  private static currentUser: TestUser | null = null
  
  static switchToUser(user: TestUser) {
    this.currentUser = user
    
    // Update all relevant mocks
    const mockGetUser = getUser as jest.MockedFunction<typeof getUser>
    mockGetUser.mockResolvedValue({
      user: { id: user.id, email: user.email, aud: 'authenticated' },
      error: null
    })
    
    // Update client-side auth context mock
    const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
    mockUseAuth.mockReturnValue({
      user: { id: user.id, email: user.email },
      session: { user: { id: user.id } },
      loading: false,
    })
  }
  
  static getCurrentUser(): TestUser | null {
    return this.currentUser
  }
  
  static clearAuth() {
    this.currentUser = null
    const mockGetUser = getUser as jest.MockedFunction<typeof getUser>
    mockGetUser.mockResolvedValue({ user: null, error: null })
  }
}

// Usage in tests
it('should handle user switching within same test', async () => {
  const alice = await createTestUser('alice')
  const bob = await createTestUser('bob')
  
  // Alice creates document
  TestAuthContext.switchToUser(alice)
  const doc = await DocumentService.createForUser(alice.id, { title: 'Test' })
  
  // Bob tries to access it
  TestAuthContext.switchToUser(bob)
  const access = await DocumentService.isOwnedByUser(doc.id, bob.id)
  
  expect(access).toBe(false)
})
```

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

*Last updated: 6 June 2025*  
*Testing Status: Comprehensive Authentication Test Suite ✅*  
*Next review: After authentication system updates or security changes*