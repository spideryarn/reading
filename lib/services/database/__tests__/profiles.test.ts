/**
 * ProfileService Tests
 * 
 * Tests for the ProfileService class which handles user profile operations
 * including CRUD operations, preferences management, and UUID validation.
 */

import { createClient } from '@/lib/supabase/client'
import { ProfileService } from '../profiles'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Profile } from '@/lib/types/database'

// Mock Supabase client for unit tests
const mockSupabaseClient = {
  from: jest.fn(() => mockSupabaseClient),
  select: jest.fn(() => mockSupabaseClient),
  insert: jest.fn(() => mockSupabaseClient),
  update: jest.fn(() => mockSupabaseClient),
  delete: jest.fn(() => mockSupabaseClient),
  eq: jest.fn(() => mockSupabaseClient),
  single: jest.fn(),
} as unknown as SupabaseClient<Database>

// Test data
const testUserId = '123e4567-e89b-12d3-a456-426614174000'
const invalidUserId = 'invalid-uuid'
const testProfile: Profile = {
  id: '456e7890-e89b-12d3-a456-426614174000',
  user_id: testUserId,
  preferences: { theme: 'dark', language: 'en' },
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z'
}

describe('ProfileService', () => {
  let profileService: ProfileService

  beforeEach(() => {
    jest.clearAllMocks()
    profileService = new ProfileService(mockSupabaseClient)
  })

  describe('getByUserId', () => {
    it('should return profile for valid user ID', async () => {
      mockSupabaseClient.single = jest.fn().mockResolvedValue({
        data: testProfile,
        error: null
      })

      const result = await profileService.getByUserId(testUserId)

      expect(result).toEqual(testProfile)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('profiles')
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('*')
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', testUserId)
      expect(mockSupabaseClient.single).toHaveBeenCalled()
    })

    it('should return null for invalid UUID format', async () => {
      const result = await profileService.getByUserId(invalidUserId)

      expect(result).toBeNull()
      expect(mockSupabaseClient.from).not.toHaveBeenCalled()
    })

    it('should return null for not found error (PGRST116)', async () => {
      mockSupabaseClient.single = jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Profile not found' }
      })

      const result = await profileService.getByUserId(testUserId)

      expect(result).toBeNull()
    })

    it('should throw error for other database errors', async () => {
      mockSupabaseClient.single = jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST500', message: 'Database connection error' }
      })

      await expect(profileService.getByUserId(testUserId))
        .rejects.toThrow('Failed to fetch profile: Database connection error')
    })

    it('should handle empty user ID', async () => {
      const result = await profileService.getByUserId('')

      expect(result).toBeNull()
      expect(mockSupabaseClient.from).not.toHaveBeenCalled()
    })

    it('should validate UUID format correctly', async () => {
      // Test various invalid UUID formats
      const invalidUUIDs = [
        '123',
        '123-456-789',
        '123e4567-e89b-12d3-a456-42661417400',  // too short
        '123e4567-e89b-12d3-a456-4266141740000', // too long
        '123g4567-e89b-12d3-a456-426614174000',  // invalid character
        '123e4567_e89b_12d3_a456_426614174000',  // wrong separators
      ]

      for (const invalidUUID of invalidUUIDs) {
        const result = await profileService.getByUserId(invalidUUID)
        expect(result).toBeNull()
      }
    })
  })

  describe('create', () => {
    const newProfileData = {
      user_id: testUserId,
      preferences: { theme: 'light' }
    }

    it('should create new profile successfully', async () => {
      mockSupabaseClient.single = jest.fn().mockResolvedValue({
        data: testProfile,
        error: null
      })

      const result = await profileService.create(newProfileData)

      expect(result).toEqual(testProfile)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('profiles')
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(newProfileData)
      expect(mockSupabaseClient.select).toHaveBeenCalled()
      expect(mockSupabaseClient.single).toHaveBeenCalled()
    })

    it('should throw error when profile creation fails', async () => {
      mockSupabaseClient.single = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'User already has a profile' }
      })

      await expect(profileService.create(newProfileData))
        .rejects.toThrow('Failed to create profile: User already has a profile')
    })

    it('should create profile without preferences', async () => {
      const profileWithoutPrefs = { user_id: testUserId }
      const expectedProfile = { ...testProfile, preferences: null }

      mockSupabaseClient.single = jest.fn().mockResolvedValue({
        data: expectedProfile,
        error: null
      })

      const result = await profileService.create(profileWithoutPrefs)

      expect(result).toEqual(expectedProfile)
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(profileWithoutPrefs)
    })
  })

  describe('updateByUserId', () => {
    const updateData = { preferences: { theme: 'dark', notifications: true } }

    it('should update profile successfully', async () => {
      const updatedProfile = { ...testProfile, ...updateData }
      mockSupabaseClient.single = jest.fn().mockResolvedValue({
        data: updatedProfile,
        error: null
      })

      const result = await profileService.updateByUserId(testUserId, updateData)

      expect(result).toEqual(updatedProfile)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('profiles')
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(updateData)
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', testUserId)
      expect(mockSupabaseClient.select).toHaveBeenCalled()
      expect(mockSupabaseClient.single).toHaveBeenCalled()
    })

    it('should throw error for invalid UUID format', async () => {
      await expect(profileService.updateByUserId(invalidUserId, updateData))
        .rejects.toThrow('Invalid user ID format')

      expect(mockSupabaseClient.from).not.toHaveBeenCalled()
    })

    it('should throw error when profile not found', async () => {
      mockSupabaseClient.single = jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Profile not found' }
      })

      await expect(profileService.updateByUserId(testUserId, updateData))
        .rejects.toThrow('Profile not found')
    })

    it('should throw error for other database errors', async () => {
      mockSupabaseClient.single = jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST500', message: 'Database error' }
      })

      await expect(profileService.updateByUserId(testUserId, updateData))
        .rejects.toThrow('Failed to update profile: Database error')
    })

    it('should handle empty update data', async () => {
      const updatedProfile = testProfile
      mockSupabaseClient.single = jest.fn().mockResolvedValue({
        data: updatedProfile,
        error: null
      })

      const result = await profileService.updateByUserId(testUserId, {})

      expect(result).toEqual(updatedProfile)
      expect(mockSupabaseClient.update).toHaveBeenCalledWith({})
    })
  })

  describe('updatePreferences', () => {
    const newPreferences = { theme: 'dark', language: 'es', notifications: false }

    it('should update preferences successfully', async () => {
      const updatedProfile = { ...testProfile, preferences: newPreferences }
      mockSupabaseClient.single = jest.fn().mockResolvedValue({
        data: updatedProfile,
        error: null
      })

      const result = await profileService.updatePreferences(testUserId, newPreferences)

      expect(result).toEqual(updatedProfile)
      expect(mockSupabaseClient.update).toHaveBeenCalledWith({ preferences: newPreferences })
    })

    it('should handle complex preference objects', async () => {
      const complexPreferences = {
        theme: 'dark',
        ui: {
          sidebarCollapsed: true,
          fontSize: 'medium'
        },
        features: {
          enableNotifications: true,
          autoSave: false
        }
      }

      const updatedProfile = { ...testProfile, preferences: complexPreferences }
      mockSupabaseClient.single = jest.fn().mockResolvedValue({
        data: updatedProfile,
        error: null
      })

      const result = await profileService.updatePreferences(testUserId, complexPreferences)

      expect(result).toEqual(updatedProfile)
      expect(mockSupabaseClient.update).toHaveBeenCalledWith({ preferences: complexPreferences })
    })

    it('should handle null/undefined preferences', async () => {
      const updatedProfile = { ...testProfile, preferences: null }
      mockSupabaseClient.single = jest.fn().mockResolvedValue({
        data: updatedProfile,
        error: null
      })

      const result = await profileService.updatePreferences(testUserId, null)

      expect(result).toEqual(updatedProfile)
      expect(mockSupabaseClient.update).toHaveBeenCalledWith({ preferences: null })
    })
  })

  describe('getPreferences', () => {
    it('should return preferences with defaults for existing profile', async () => {
      const profileWithPrefs = {
        ...testProfile,
        preferences: { theme: 'dark', language: 'es' }
      }

      // Mock getByUserId method
      jest.spyOn(profileService, 'getByUserId').mockResolvedValue(profileWithPrefs)

      const result = await profileService.getPreferences(testUserId)

      expect(result).toEqual({
        theme: 'dark',
        language: 'es'
      })
    })

    it('should return only defaults when profile has no preferences', async () => {
      const profileWithoutPrefs = { ...testProfile, preferences: null }

      jest.spyOn(profileService, 'getByUserId').mockResolvedValue(profileWithoutPrefs)

      const result = await profileService.getPreferences(testUserId)

      expect(result).toEqual({
        theme: 'light'
      })
    })

    it('should return defaults when profile has empty preferences', async () => {
      const profileWithEmptyPrefs = { ...testProfile, preferences: {} }

      jest.spyOn(profileService, 'getByUserId').mockResolvedValue(profileWithEmptyPrefs)

      const result = await profileService.getPreferences(testUserId)

      expect(result).toEqual({
        theme: 'light'
      })
    })

    it('should merge user preferences with defaults', async () => {
      const profileWithPartialPrefs = {
        ...testProfile,
        preferences: { language: 'fr' }
      }

      jest.spyOn(profileService, 'getByUserId').mockResolvedValue(profileWithPartialPrefs)

      const result = await profileService.getPreferences(testUserId)

      expect(result).toEqual({
        theme: 'light',  // default
        language: 'fr'   // user preference
      })
    })

    it('should throw error when profile not found', async () => {
      jest.spyOn(profileService, 'getByUserId').mockResolvedValue(null)

      await expect(profileService.getPreferences(testUserId))
        .rejects.toThrow('Profile not found')
    })

    it('should handle non-object preferences gracefully', async () => {
      const profileWithInvalidPrefs = {
        ...testProfile,
        preferences: 'invalid' as unknown as Record<string, unknown>
      }

      jest.spyOn(profileService, 'getByUserId').mockResolvedValue(profileWithInvalidPrefs)

      const result = await profileService.getPreferences(testUserId)

      // The implementation should ignore non-object preferences and return only defaults
      expect(result).toEqual({
        theme: 'light'
      })
    })
  })

  describe('deleteByUserId', () => {
    it('should delete profile successfully', async () => {
      mockSupabaseClient.delete = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          error: null
        })
      })

      await expect(profileService.deleteByUserId(testUserId)).resolves.not.toThrow()

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('profiles')
      expect(mockSupabaseClient.delete).toHaveBeenCalled()
    })

    it('should throw error for invalid UUID format', async () => {
      await expect(profileService.deleteByUserId(invalidUserId))
        .rejects.toThrow('Invalid user ID format')

      expect(mockSupabaseClient.from).not.toHaveBeenCalled()
    })

    it('should throw error when deletion fails', async () => {
      mockSupabaseClient.delete = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          error: { message: 'Failed to delete profile' }
        })
      })

      await expect(profileService.deleteByUserId(testUserId))
        .rejects.toThrow('Failed to delete profile: Failed to delete profile')
    })

    it('should handle deletion of non-existent profile gracefully', async () => {
      // Supabase doesn't throw error for deleting non-existent records
      mockSupabaseClient.delete = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          error: null
        })
      })

      await expect(profileService.deleteByUserId(testUserId)).resolves.not.toThrow()
    })
  })

  describe('UUID validation edge cases', () => {
    it('should reject UUIDs with incorrect character case handling', async () => {
      // Valid UUID with mixed case should work
      const mixedCaseUUID = '123E4567-e89b-12d3-A456-426614174000'
      
      mockSupabaseClient.single = jest.fn().mockResolvedValue({
        data: testProfile,
        error: null
      })

      const result = await profileService.getByUserId(mixedCaseUUID)
      expect(result).toEqual(testProfile)
    })

    it('should reject UUIDs with leading/trailing whitespace', async () => {
      const uuidWithWhitespace = ` ${testUserId} `
      const result = await profileService.getByUserId(uuidWithWhitespace)
      expect(result).toBeNull()
    })

    it('should reject UUIDs with special characters', async () => {
      const uuidWithSpecialChars = '123e4567-e89b-12d3-a456-426614174000!'
      const result = await profileService.getByUserId(uuidWithSpecialChars)
      expect(result).toBeNull()
    })
  })
})

// Integration Tests with Real Supabase (conditional)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const skipIntegrationTests = !SUPABASE_URL || !SUPABASE_ANON_KEY

const describeIfEnv = skipIntegrationTests ? describe.skip : describe

if (skipIntegrationTests) {
  console.log('⚠️  ProfileService integration tests skipped: Supabase environment variables not set')
}

describeIfEnv('ProfileService Integration Tests', () => {
  let supabase: SupabaseClient<Database>
  let profileService: ProfileService
  let testUserId: string
  let createdProfileId: string

  beforeAll(async () => {
    supabase = createClient()
    profileService = new ProfileService(supabase)
    
    // Generate a test user ID that won't conflict with real users
    testUserId = `test-${Date.now()}-${Math.random().toString(36).substring(2)}`
  })

  afterAll(async () => {
    // Clean up test profile if it was created
    if (createdProfileId) {
      try {
        await profileService.deleteByUserId(testUserId)
      } catch (error) {
        console.warn('Failed to clean up test profile:', error)
      }
    }
  })

  it('should handle complete profile lifecycle', async () => {
    // 1. Create profile
    const profile = await profileService.create({
      user_id: testUserId,
      preferences: { theme: 'dark', language: 'en' }
    })

    expect(profile).toBeTruthy()
    expect(profile.user_id).toBe(testUserId)
    expect(profile.preferences).toEqual({ theme: 'dark', language: 'en' })
    createdProfileId = profile.id

    // 2. Retrieve profile
    const retrieved = await profileService.getByUserId(testUserId)
    expect(retrieved).toBeTruthy()
    expect(retrieved!.id).toBe(profile.id)

    // 3. Update preferences
    const updated = await profileService.updatePreferences(testUserId, {
      theme: 'light',
      notifications: true
    })
    expect(updated.preferences).toEqual({
      theme: 'light',
      notifications: true
    })

    // 4. Get preferences with defaults
    const preferences = await profileService.getPreferences(testUserId)
    expect(preferences.theme).toBe('light')
    expect(preferences.notifications).toBe(true)

    // 5. Delete profile
    await profileService.deleteByUserId(testUserId)
    
    // 6. Verify deletion
    const deleted = await profileService.getByUserId(testUserId)
    expect(deleted).toBeNull()
    
    createdProfileId = '' // Mark as cleaned up
  })

  it('should handle profile not found scenarios', async () => {
    const nonExistentUserId = '00000000-0000-0000-0000-000000000000'
    
    const profile = await profileService.getByUserId(nonExistentUserId)
    expect(profile).toBeNull()

    await expect(profileService.getPreferences(nonExistentUserId))
      .rejects.toThrow('Profile not found')

    await expect(profileService.updateByUserId(nonExistentUserId, { preferences: {} }))
      .rejects.toThrow('Profile not found')
  })
})