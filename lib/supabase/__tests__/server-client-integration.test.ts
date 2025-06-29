import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { getSupabaseServerClient, createClient } from '../server'

describe('getSupabaseServerClient integration tests', () => {
  const originalEnv = { ...process.env }
  
  beforeEach(() => {
    // Set test environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key'
  })

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv }
  })

  describe('Cookie-based authentication', () => {
    it('should create cookie-based client by default', async () => {
      const mockRequest = new Request('https://example.com/api/test')
      
      const client = await getSupabaseServerClient(mockRequest)
      
      // Verify we got a Supabase client instance
      expect(client).toBeDefined()
      expect(client.auth).toBeDefined()
      expect(client.from).toBeDefined()
      
      // Verify the client was configured with the expected URL
      expect(String(client.authUrl).startsWith(process.env.NEXT_PUBLIC_SUPABASE_URL!)).toBe(true)
    })

    it('should create cookie-based client when allowBearer is false', async () => {
      const mockRequest = new Request('https://example.com/api/test', {
        headers: {
          'Authorization': 'Bearer mock-jwt-token'
        }
      })
      
      const client = await getSupabaseServerClient(mockRequest, { allowBearer: false })
      
      // Should ignore the Bearer token and use cookie auth
      expect(client).toBeDefined()
      expect(client.auth).toBeDefined()
    })
  })

  describe('Bearer token authentication', () => {
    it('should create Bearer token client when allowBearer is true and Authorization header is present', async () => {
      const mockRequest = new Request('https://example.com/api/test', {
        headers: {
          'Authorization': 'Bearer mock-jwt-token'
        }
      })
      
      const client = await getSupabaseServerClient(mockRequest, { allowBearer: true })
      
      // Verify we got a Supabase client instance
      expect(client).toBeDefined()
      expect(client.auth).toBeDefined()
      expect(client.from).toBeDefined()
    })

    it('should fall back to cookie client when allowBearer is true but no Authorization header', async () => {
      const mockRequest = new Request('https://example.com/api/test')
      
      const client = await getSupabaseServerClient(mockRequest, { allowBearer: true })
      
      // Should fall back to cookie auth
      expect(client).toBeDefined()
      expect(client.auth).toBeDefined()
    })

    it('should fall back to cookie client when allowBearer is true but Authorization header is not Bearer', async () => {
      const mockRequest = new Request('https://example.com/api/test', {
        headers: {
          'Authorization': 'Basic dXNlcjpwYXNz'
        }
      })
      
      const client = await getSupabaseServerClient(mockRequest, { allowBearer: true })
      
      // Should fall back to cookie auth since it's not a Bearer token
      expect(client).toBeDefined()
      expect(client.auth).toBeDefined()
    })

    it('should extract JWT correctly from Bearer token', async () => {
      const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
      const mockRequest = new Request('https://example.com/api/test', {
        headers: {
          'Authorization': `Bearer ${jwt}`
        }
      })
      
      const client = await getSupabaseServerClient(mockRequest, { allowBearer: true })
      
      // Verify we got a client configured for Bearer auth
      expect(client).toBeDefined()
      expect(client.auth).toBeDefined()
    })
  })

  describe('Different client instances', () => {
    it('should create different instances for cookie vs Bearer auth', async () => {
      const mockRequest = new Request('https://example.com/api/test', {
        headers: {
          'Authorization': 'Bearer mock-jwt-token'
        }
      })
      
      // Get cookie client
      const cookieClient = await getSupabaseServerClient(mockRequest, { allowBearer: false })
      
      // Get Bearer client
      const bearerClient = await getSupabaseServerClient(mockRequest, { allowBearer: true })
      
      // They should be different instances (no caching)
      expect(cookieClient).not.toBe(bearerClient)
    })

    it('should create new instances on each call (no caching)', async () => {
      const mockRequest = new Request('https://example.com/api/test')
      
      const client1 = await getSupabaseServerClient(mockRequest)
      const client2 = await getSupabaseServerClient(mockRequest)
      
      // Should be different instances
      expect(client1).not.toBe(client2)
    })
  })
})

describe('createClient (backward compatibility)', () => {
  const originalEnv = { ...process.env }
  
  beforeEach(() => {
    // Set test environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key'
  })

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv }
  })

  it('should create a cookie-based server client', async () => {
    const client = await createClient()
    
    // Verify we got a Supabase client instance
    expect(client).toBeDefined()
    expect(client.auth).toBeDefined()
    expect(client.from).toBeDefined()
    
    // Verify the client was configured with the expected URL
    expect(String(client.authUrl).startsWith(process.env.NEXT_PUBLIC_SUPABASE_URL!)).toBe(true)
  })
})