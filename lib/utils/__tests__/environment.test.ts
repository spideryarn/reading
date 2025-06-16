// Environment detection tests
// Tests environment-aware behavior for storage RLS policies

import { detectEnvironment, shouldStorageRLSWork, shouldShowStorageErrors, getStorageErrorMessage, shouldThrowStorageError } from '../environment'

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

      expect(env.nodeEnv).toBe('development')
      expect(env.isLocalSupabase).toBe(true)
      expect(env.isCloudEnvironment).toBe(false)
      expect(env.expectStorageRLS).toBe(false)
      expect(env.showStorageErrors).toBe(false)
    })

    test('should detect cloud production environment', () => {
      process.env.NODE_ENV = 'production'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://abc123.supabase.co'

      const env = detectEnvironment()

      expect(env.nodeEnv).toBe('production')
      expect(env.isLocalSupabase).toBe(false)
      expect(env.isCloudEnvironment).toBe(true)
      expect(env.expectStorageRLS).toBe(true)
      expect(env.showStorageErrors).toBe(true)
    })

    test('should detect cloud development environment', () => {
      process.env.NODE_ENV = 'development'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://abc123.supabase.co'

      const env = detectEnvironment()

      expect(env.nodeEnv).toBe('development')
      expect(env.isLocalSupabase).toBe(false)
      expect(env.isCloudEnvironment).toBe(true)
      expect(env.expectStorageRLS).toBe(true)
      expect(env.showStorageErrors).toBe(true)
    })
  })

  describe('shouldThrowStorageError', () => {
    test('should not throw RLS errors in local development', () => {
      process.env.NODE_ENV = 'development'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'

      expect(shouldThrowStorageError('row-level security policy violation')).toBe(false)
      expect(shouldThrowStorageError('RLS policy blocked')).toBe(false)
    })

    test('should throw RLS errors in cloud environment', () => {
      process.env.NODE_ENV = 'production'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://abc123.supabase.co'

      expect(shouldThrowStorageError('row-level security policy violation')).toBe(true)
      expect(shouldThrowStorageError('RLS policy blocked')).toBe(true)
    })

    test('should throw non-RLS errors in all environments', () => {
      process.env.NODE_ENV = 'development'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'

      expect(shouldThrowStorageError('Bucket not found')).toBe(true)
      expect(shouldThrowStorageError('Network error')).toBe(true)

      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://abc123.supabase.co'

      expect(shouldThrowStorageError('Bucket not found')).toBe(true)
      expect(shouldThrowStorageError('Network error')).toBe(true)
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

    test('should handle other errors appropriately by environment', () => {
      process.env.NODE_ENV = 'development'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'

      expect(getStorageErrorMessage('Network timeout')).toContain('Local storage error')

      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://abc123.supabase.co'

      expect(getStorageErrorMessage('Network timeout')).toContain('temporarily unavailable')
    })
  })

  describe('Utility functions', () => {
    test('shouldStorageRLSWork matches expectStorageRLS', () => {
      process.env.NODE_ENV = 'development'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'

      expect(shouldStorageRLSWork()).toBe(false)

      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://abc123.supabase.co'

      expect(shouldStorageRLSWork()).toBe(true)
    })

    test('shouldShowStorageErrors matches showStorageErrors', () => {
      process.env.NODE_ENV = 'development'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'

      expect(shouldShowStorageErrors()).toBe(false)

      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://abc123.supabase.co'

      expect(shouldShowStorageErrors()).toBe(true)
    })
  })
})