// Environment detection tests
// Tests environment-aware behavior for storage RLS policies

import { detectEnvironment, shouldThrowStorageError, getStorageErrorMessage } from '../environment'

describe('Environment Detection', () => {
  // Store original env vars to restore after tests
  const originalEnv = {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL
  }

  afterEach(() => {
    // Restore original environment
    process.env.NODE_ENV = originalEnv.NODE_ENV
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalEnv.NEXT_PUBLIC_SUPABASE_URL
  })

  describe('detectEnvironment', () => {
    test('should detect local development environment', () => {
      process.env.NODE_ENV = 'development'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'

      const env = detectEnvironment()

      expect(env.isLocalSupabase).toBe(true)
      expect(env.isCloudEnvironment).toBe(false)
      expect(env.expectStorageRLS).toBe(false)
    })

    test('should detect cloud production environment', () => {
      process.env.NODE_ENV = 'production'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://abc123.supabase.co'

      const env = detectEnvironment()

      expect(env.isLocalSupabase).toBe(false)
      expect(env.isCloudEnvironment).toBe(true)
      expect(env.expectStorageRLS).toBe(true)
    })
  })

  describe('shouldThrowStorageError', () => {
    test('should not throw RLS errors in local development', () => {
      process.env.NODE_ENV = 'development'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'

      expect(shouldThrowStorageError('row-level security policy violation')).toBe(false)
    })

    test('should throw RLS errors in cloud environment', () => {
      process.env.NODE_ENV = 'production'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://abc123.supabase.co'

      expect(shouldThrowStorageError('row-level security policy violation')).toBe(true)
    })

    test('should throw non-RLS errors in all environments', () => {
      process.env.NODE_ENV = 'development'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'

      expect(shouldThrowStorageError('Bucket not found')).toBe(true)
    })
  })

  describe('getStorageErrorMessage', () => {
    test('should provide helpful messages for RLS errors in local dev', () => {
      process.env.NODE_ENV = 'development'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'

      const message = getStorageErrorMessage('row-level security policy violation')
      expect(message).toContain('Local development')
      expect(message).toContain('expected behavior')
    })

    test('should provide user-friendly messages for RLS errors in cloud', () => {
      process.env.NODE_ENV = 'production'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://abc123.supabase.co'

      const message = getStorageErrorMessage('RLS policy blocked')
      expect(message).toContain('Storage access denied')
      expect(message).toContain('contact support')
    })
  })
})