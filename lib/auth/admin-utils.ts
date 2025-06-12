/**
 * Admin Management Utilities
 * 
 * Provides functions for managing admin status in the Spideryarn Reading application.
 * Admins have super-user access to all documents and system operations.
 */

import { createClient } from '@/lib/supabase/server'

/**
 * Grant admin access to a user by setting the is_admin timestamp
 * @param userId - The UUID of the user to grant admin access
 * @returns Promise resolving to success status
 */
export async function grantAdminAccess(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('profiles')
      .update({ is_admin: new Date().toISOString() })
      .eq('user_id', userId)
    
    if (error) {
      console.error('Error granting admin access:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true }
  } catch (error) {
    console.error('Error granting admin access:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Revoke admin access from a user by clearing the is_admin timestamp
 * @param userId - The UUID of the user to revoke admin access
 * @returns Promise resolving to success status
 */
export async function revokeAdminAccess(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('profiles')
      .update({ is_admin: null })
      .eq('user_id', userId)
    
    if (error) {
      console.error('Error revoking admin access:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true }
  } catch (error) {
    console.error('Error revoking admin access:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Check if a user has admin status
 * @param userId - The UUID of the user to check
 * @returns Promise resolving to admin status and timestamp
 */
export async function isUserAdmin(userId: string): Promise<{ 
  isAdmin: boolean; 
  adminSince?: string; 
  error?: string 
}> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('user_id', userId)
      .single()
    
    if (error) {
      console.error('Error checking admin status:', error)
      return { isAdmin: false, error: error.message }
    }
    
    const isAdmin = data?.is_admin !== null
    const adminSince = data?.is_admin || undefined
    
    return { isAdmin, adminSince }
  } catch (error) {
    console.error('Error checking admin status:', error)
    return { 
      isAdmin: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Get the current user's admin status from their session
 * @returns Promise resolving to admin status for the current user
 */
export async function getCurrentUserAdminStatus(): Promise<{
  isAdmin: boolean;
  adminSince?: string;
  error?: string;
}> {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { isAdmin: false, error: 'User not authenticated' }
    }
    
    // Check admin status
    return await isUserAdmin(user.id)
  } catch (error) {
    console.error('Error getting current user admin status:', error)
    return { 
      isAdmin: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Require admin access for a function - throws error if user is not admin
 * @param userId - Optional user ID to check (defaults to current user)
 * @throws Error if user is not admin
 */
export async function requireAdminAccess(userId?: string): Promise<void> {
  const adminStatus = userId 
    ? await isUserAdmin(userId)
    : await getCurrentUserAdminStatus()
  
  if (adminStatus.error) {
    throw new Error(`Admin check failed: ${adminStatus.error}`)
  }
  
  if (!adminStatus.isAdmin) {
    throw new Error('Admin access required')
  }
}