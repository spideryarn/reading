/**
 * Admin Management Utilities
 * 
 * Provides functions for managing admin status in the Spideryarn Reading application.
 * Admins have super-user access to all documents and system operations.
 */

import { createClient } from '@/lib/supabase/server'
import { authLogger, generateCorrelationId, createTimer } from '@/lib/services/logger'

/**
 * Grant admin access to a user by setting the is_admin timestamp
 * @param userId - The UUID of the user to grant admin access
 * @returns Promise resolving to success status
 */
export async function grantAdminAccess(userId: string): Promise<{ success: boolean; error?: string }> {
  const correlationId = generateCorrelationId()
  const timer = createTimer(authLogger, 'grantAdminAccess')
  
  authLogger.info({
    operation: 'grantAdminAccess',
    targetUserId: userId,
    correlationId
  }, 'Granting admin access to user')
  
  try {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('profiles')
      .update({ is_admin: new Date().toISOString() })
      .eq('user_id', userId)
    
    if (error) {
      authLogger.error({
        operation: 'grantAdminAccess',
        targetUserId: userId,
        error: error.message,
        correlationId
      }, 'Database error granting admin access')
      
      console.error('Error granting admin access:', error)
      return { success: false, error: error.message }
    }
    
    const duration = timer.end({
      targetUserId: userId,
      correlationId
    })
    
    authLogger.info({
      operation: 'grantAdminAccess',
      targetUserId: userId,
      duration,
      correlationId
    }, 'Admin access granted successfully')
    
    return { success: true }
  } catch (error) {
    authLogger.error({
      operation: 'grantAdminAccess',
      targetUserId: userId,
      error: error instanceof Error ? error.message : 'Unknown error',
      correlationId
    }, 'Error granting admin access')
    
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
  const correlationId = generateCorrelationId()
  const timer = createTimer(authLogger, 'revokeAdminAccess')
  
  authLogger.info({
    operation: 'revokeAdminAccess',
    targetUserId: userId,
    correlationId
  }, 'Revoking admin access from user')
  
  try {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('profiles')
      .update({ is_admin: null })
      .eq('user_id', userId)
    
    if (error) {
      authLogger.error({
        operation: 'revokeAdminAccess',
        targetUserId: userId,
        error: error.message,
        correlationId
      }, 'Database error revoking admin access')
      
      console.error('Error revoking admin access:', error)
      return { success: false, error: error.message }
    }
    
    const duration = timer.end({
      targetUserId: userId,
      correlationId
    })
    
    authLogger.info({
      operation: 'revokeAdminAccess',
      targetUserId: userId,
      duration,
      correlationId
    }, 'Admin access revoked successfully')
    
    return { success: true }
  } catch (error) {
    authLogger.error({
      operation: 'revokeAdminAccess',
      targetUserId: userId,
      error: error instanceof Error ? error.message : 'Unknown error',
      correlationId
    }, 'Error revoking admin access')
    
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
  const correlationId = generateCorrelationId()
  const timer = createTimer(authLogger, 'isUserAdmin')
  
  authLogger.debug({
    operation: 'isUserAdmin',
    targetUserId: userId,
    correlationId
  }, 'Checking user admin status')
  
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('user_id', userId)
      .single()
    
    if (error) {
      authLogger.error({
        operation: 'isUserAdmin',
        targetUserId: userId,
        error: error.message,
        correlationId
      }, 'Database error checking admin status')
      
      console.error('Error checking admin status:', error)
      return { isAdmin: false, error: error.message }
    }
    
    const isAdmin = data?.is_admin !== null
    const adminSince = data?.is_admin || undefined
    
    const duration = timer.end({
      targetUserId: userId,
      isAdmin,
      correlationId
    })
    
    authLogger.info({
      operation: 'isUserAdmin',
      targetUserId: userId,
      isAdmin,
      adminSince,
      duration,
      correlationId
    }, 'Admin status check completed')
    
    return { isAdmin, adminSince }
  } catch (error) {
    authLogger.error({
      operation: 'isUserAdmin',
      targetUserId: userId,
      error: error instanceof Error ? error.message : 'Unknown error',
      correlationId
    }, 'Error checking admin status')
    
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
  const correlationId = generateCorrelationId()
  const timer = createTimer(authLogger, 'getCurrentUserAdminStatus')
  
  authLogger.debug({
    operation: 'getCurrentUserAdminStatus',
    correlationId
  }, 'Getting current user admin status')
  
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      authLogger.warn({
        operation: 'getCurrentUserAdminStatus',
        error: userError?.message || 'No user found',
        correlationId
      }, 'User not authenticated for admin status check')
      
      return { isAdmin: false, error: 'User not authenticated' }
    }
    
    authLogger.debug({
      operation: 'getCurrentUserAdminStatus',
      currentUserId: user.id,
      correlationId
    }, 'Current user found, checking admin status')
    
    // Check admin status
    const result = await isUserAdmin(user.id)
    
    const duration = timer.end({
      currentUserId: user.id,
      isAdmin: result.isAdmin,
      correlationId
    })
    
    authLogger.info({
      operation: 'getCurrentUserAdminStatus',
      currentUserId: user.id,
      isAdmin: result.isAdmin,
      duration,
      correlationId
    }, 'Current user admin status retrieved')
    
    return result
  } catch (error) {
    authLogger.error({
      operation: 'getCurrentUserAdminStatus',
      error: error instanceof Error ? error.message : 'Unknown error',
      correlationId
    }, 'Error getting current user admin status')
    
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