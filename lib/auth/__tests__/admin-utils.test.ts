/**
 * @jest-environment node
 */

import { grantAdminAccess, revokeAdminAccess, isUserAdmin } from '../admin-utils'
import { createClient } from '@/lib/supabase/server'

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn()
}))

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

describe('Admin Utils', () => {
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis()
    }
    mockCreateClient.mockResolvedValue(mockSupabase)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('grantAdminAccess', () => {
    it('should grant admin access to a user', async () => {
      mockSupabase.eq.mockResolvedValue({ error: null })

      const result = await grantAdminAccess('test-user-id')

      expect(result.success).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
      expect(mockSupabase.update).toHaveBeenCalledWith({
        is_admin: expect.any(String) // ISO timestamp
      })
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'test-user-id')
    })

    it('should handle database errors', async () => {
      const error = { message: 'Database error' }
      mockSupabase.eq.mockResolvedValue({ error })

      const result = await grantAdminAccess('test-user-id')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database error')
    })
  })

  describe('revokeAdminAccess', () => {
    it('should revoke admin access from a user', async () => {
      mockSupabase.eq.mockResolvedValue({ error: null })

      const result = await revokeAdminAccess('test-user-id')

      expect(result.success).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
      expect(mockSupabase.update).toHaveBeenCalledWith({ is_admin: null })
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'test-user-id')
    })

    it('should handle database errors', async () => {
      const error = { message: 'Database error' }
      mockSupabase.eq.mockResolvedValue({ error })

      const result = await revokeAdminAccess('test-user-id')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database error')
    })
  })

  describe('isUserAdmin', () => {
    it('should return true for admin users', async () => {
      const adminTimestamp = '2025-06-12T22:00:00.000Z'
      mockSupabase.single.mockResolvedValue({
        data: { is_admin: adminTimestamp },
        error: null
      })

      const result = await isUserAdmin('admin-user-id')

      expect(result.isAdmin).toBe(true)
      expect(result.adminSince).toBe(adminTimestamp)
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
      expect(mockSupabase.select).toHaveBeenCalledWith('is_admin')
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'admin-user-id')
    })

    it('should return false for regular users', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { is_admin: null },
        error: null
      })

      const result = await isUserAdmin('regular-user-id')

      expect(result.isAdmin).toBe(false)
      expect(result.adminSince).toBeUndefined()
    })

    it('should handle database errors', async () => {
      const error = { message: 'User not found' }
      mockSupabase.single.mockResolvedValue({ error })

      const result = await isUserAdmin('nonexistent-user-id')

      expect(result.isAdmin).toBe(false)
      expect(result.error).toBe('User not found')
    })
  })
})