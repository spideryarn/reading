import { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/lib/types/database-auto-generated'
import type { JsonObject } from '@/lib/types/json'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export class ProfileService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Get a profile by user_id
   */
  async getByUserId(userId: string): Promise<Profile | null> {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(userId)) {
      return null
    }

    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      // Check for "not found" error (PGRST116)
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Failed to fetch profile: ${error.message}`)
    }

    return data
  }

  /**
   * Create a new profile
   * Note: This will normally be handled automatically by the database trigger
   * but can be used for manual profile creation if needed
   */
  async create(profile: Omit<ProfileInsert, 'id' | 'created_at' | 'updated_at'>): Promise<Profile> {
    const { data, error } = await this.supabase
      .from('profiles')
      .insert(profile)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create profile: ${error.message}`)
    }

    return data
  }

  /**
   * Update a profile by user_id
   */
  async updateByUserId(userId: string, updates: Omit<ProfileUpdate, 'user_id' | 'updated_at'>): Promise<Profile> {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(userId)) {
      throw new Error('Invalid user ID format')
    }

    const { data, error } = await this.supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      // Check for "not found" error (PGRST116)
      if (error.code === 'PGRST116') {
        throw new Error('Profile not found')
      }
      throw new Error(`Failed to update profile: ${error.message}`)
    }

    return data
  }

  /**
   * Update user preferences
   */
  async updatePreferences(userId: string, preferences: JsonObject): Promise<Profile> {
    return this.updateByUserId(userId, { preferences: preferences as Json })
  }

  /**
   * Update user background information
   */
  async updateBackground(userId: string, background: string): Promise<Profile> {
    return this.updateByUserId(userId, { background })
  }

  /**
   * Get user background information
   */
  async getBackground(userId: string): Promise<string> {
    const profile = await this.getByUserId(userId)
    
    if (!profile) {
      throw new Error('Profile not found')
    }

    return profile.background
  }

  /**
   * Get user preferences with defaults
   */
  async getPreferences(userId: string): Promise<JsonObject> {
    const profile = await this.getByUserId(userId)
    
    if (!profile) {
      throw new Error('Profile not found')
    }

    // Return preferences with sensible defaults
    // Ensure preferences is a proper object, not null, string, or other type
    let preferences: JsonObject = {}
    if (profile.preferences && typeof profile.preferences === 'object' && !Array.isArray(profile.preferences)) {
      preferences = profile.preferences as JsonObject
    }
    
    return {
      // Default preferences can be added here
      theme: 'light',
      ...preferences
    }
  }

  /**
   * Delete a profile by user_id
   * Note: This should rarely be used as profiles are typically retained
   */
  async deleteByUserId(userId: string): Promise<void> {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(userId)) {
      throw new Error('Invalid user ID format')
    }

    const { error } = await this.supabase
      .from('profiles')
      .delete()
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Failed to delete profile: ${error.message}`)
    }
  }
}