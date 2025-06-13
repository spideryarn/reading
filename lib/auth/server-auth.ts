import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'
import { authLogger, generateCorrelationId } from '@/lib/services/logger'

/**
 * Server-side authentication utilities for Next.js App Router
 * 
 * This module provides utilities for handling authentication in
 * server components and API routes with proper error handling
 * and type safety.
 */

export interface AuthResult {
  user: User | null
  error: string | null
}

/**
 * Get the current authenticated user with error handling.
 * 
 * This is the primary function for getting user information in
 * server components. It provides detailed error information
 * and handles edge cases gracefully.
 * 
 * @returns Promise<AuthResult> - Object containing user and error information
 * 
 * @example
 * ```typescript
 * // In a server component
 * export default async function UserProfile() {
 *   const { user, error } = await getUser()
 *   
 *   if (error) {
 *     return <div>Authentication error: {error}</div>
 *   }
 *   
 *   if (!user) {
 *     return <div>Please log in to view your profile</div>
 *   }
 *   
 *   return <div>Welcome {user.email}</div>
 * }
 * ```
 */
export async function getUser(): Promise<AuthResult> {
  const correlationId = generateCorrelationId()
  
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      authLogger.warn({
        error: error.message,
        correlationId,
        operation: 'getUser'
      }, 'Authentication error during user retrieval')
      
      return {
        user: null,
        error: error.message
      }
    }
    
    if (user) {
      authLogger.debug({
        userId: user.id,
        email: user.email,
        correlationId,
        operation: 'getUser'
      }, 'User retrieved successfully')
    }
    
    return {
      user,
      error: null
    }
  } catch (error) {
    authLogger.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      correlationId,
      operation: 'getUser'
    }, 'Unexpected authentication error')
    
    return {
      user: null,
      error: 'An unexpected error occurred during authentication'
    }
  }
}

/**
 * Get user session information including access token details.
 * 
 * This function provides access to the full session object,
 * which includes token information useful for API calls or
 * debugging authentication issues.
 * 
 * @returns Promise<Session | null> - The user session or null
 * 
 * @example
 * ```typescript
 * // In a server component that needs token info
 * export default async function APIConnector() {
 *   const session = await getSession()
 *   
 *   if (!session) {
 *     return <div>No active session</div>
 *   }
 *   
 *   // Use session.access_token for API calls
 *   return <div>Token expires: {new Date(session.expires_at * 1000).toLocaleString()}</div>
 * }
 * ```
 */
export async function getSession() {
  try {
    const supabase = await createClient()
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Session retrieval error:', error.message)
      return null
    }
    
    return session
  } catch (error) {
    console.error('Unexpected session error:', error)
    return null
  }
}

/**
 * Validate that a user is authenticated and return the user object.
 * 
 * This function throws an error if the user is not authenticated,
 * making it useful for API routes where you want to fail fast
 * on unauthenticated requests.
 * 
 * @returns Promise<User> - The authenticated user object
 * @throws Error if user is not authenticated
 * 
 * @example
 * ```typescript
 * // In an API route
 * export async function POST(request: Request) {
 *   try {
 *     const user = await validateAuth()
 *     // User is guaranteed to be authenticated here
 *     // Handle the authenticated request
 *   } catch (error) {
 *     return NextResponse.json(
 *       { error: 'Authentication required' },
 *       { status: 401 }
 *     )
 *   }
 * }
 * ```
 */
export async function validateAuth(): Promise<User> {
  const correlationId = generateCorrelationId()
  const { user, error } = await getUser()
  
  if (error) {
    authLogger.warn({
      error,
      correlationId,
      operation: 'validateAuth'
    }, 'Authentication validation failed due to auth error')
    
    throw new Error(`Authentication failed: ${error}`)
  }
  
  if (!user) {
    authLogger.warn({
      correlationId,
      operation: 'validateAuth'
    }, 'Authentication validation failed - no user found')
    
    throw new Error('User not authenticated')
  }
  
  authLogger.debug({
    userId: user.id,
    correlationId,
    operation: 'validateAuth'
  }, 'Authentication validation successful')
  
  return user
}

/**
 * Check if the current user has admin privileges.
 * 
 * This function checks for admin status using user metadata.
 * The implementation can be extended based on your specific
 * admin role management strategy.
 * 
 * @returns Promise<boolean> - True if user is an admin
 * 
 * @example
 * ```typescript
 * // In a server component
 * export default async function AdminPanel() {
 *   const isAdmin = await checkAdminAccess()
 *   
 *   if (!isAdmin) {
 *     return <div>Access denied: Admin privileges required</div>
 *   }
 *   
 *   return <AdminInterface />
 * }
 * ```
 */
export async function checkAdminAccess(): Promise<boolean> {
  const correlationId = generateCorrelationId()
  const { user } = await getUser()
  
  if (!user) {
    authLogger.debug({
      correlationId,
      operation: 'checkAdminAccess'
    }, 'Admin access check failed - no user')
    return false
  }
  
  // Check for admin role in user metadata
  // This can be extended based on your role management strategy
  const userMetadata = user.user_metadata || {}
  const appMetadata = user.app_metadata || {}
  
  const isAdmin = (
    userMetadata.role === 'admin' ||
    appMetadata.role === 'admin' ||
    userMetadata.is_admin === true ||
    appMetadata.is_admin === true
  )
  
  authLogger.info({
    userId: user.id,
    isAdmin,
    correlationId,
    operation: 'checkAdminAccess'
  }, `Admin access check completed: ${isAdmin ? 'granted' : 'denied'}`)
  
  return isAdmin
}

/**
 * Get user ID safely with null checks.
 * 
 * This utility function extracts the user ID with proper
 * error handling, useful for database queries that need
 * the user ID.
 * 
 * @returns Promise<string | null> - The user ID or null
 * 
 * @example
 * ```typescript
 * // In a server component
 * export default async function UserDocuments() {
 *   const userId = await getUserId()
 *   
 *   if (!userId) {
 *     return <div>Please log in to view your documents</div>
 *   }
 *   
 *   const documents = await getDocumentsByUserId(userId)
 *   return <DocumentList documents={documents} />
 * }
 * ```
 */
export async function getUserId(): Promise<string | null> {
  const { user } = await getUser()
  return user?.id || null
}

/**
 * Utility for creating auth-aware database queries.
 * 
 * This function creates a Supabase client with the current user's
 * authentication context, useful for database operations that
 * need to respect Row Level Security policies.
 * 
 * @returns Promise<SupabaseClient> - Authenticated Supabase client
 * 
 * @example
 * ```typescript
 * // In a server component
 * export default async function UserData() {
 *   const supabase = await getAuthenticatedClient()
 *   
 *   // This query will automatically respect RLS policies
 *   const { data: documents } = await supabase
 *     .from('documents')
 *     .select('*')
 *     .eq('user_id', (await getUser()).user?.id)
 *   
 *   return <DocumentList documents={documents} />
 * }
 * ```
 */
export async function getAuthenticatedClient() {
  return await createClient()
}

/**
 * Check if user owns a specific resource.
 * 
 * This utility function checks if the current authenticated user
 * owns a specific resource, useful for authorization checks.
 * 
 * @param resourceUserId - The user ID associated with the resource
 * @returns Promise<boolean> - True if user owns the resource
 * 
 * @example
 * ```typescript
 * // In a server component
 * export default async function DocumentEditor({ documentId }: { documentId: string }) {
 *   const document = await getDocument(documentId)
 *   const canEdit = await checkResourceOwnership(document.user_id)
 *   
 *   if (!canEdit) {
 *     return <div>You don't have permission to edit this document</div>
 *   }
 *   
 *   return <DocumentEditForm document={document} />
 * }
 * ```
 */
export async function checkResourceOwnership(resourceUserId: string): Promise<boolean> {
  const correlationId = generateCorrelationId()
  const currentUserId = await getUserId()
  
  if (!currentUserId) {
    authLogger.debug({
      resourceUserId,
      correlationId,
      operation: 'checkResourceOwnership'
    }, 'Resource ownership check failed - no current user')
    return false
  }
  
  const isOwner = currentUserId === resourceUserId
  
  authLogger.info({
    currentUserId,
    resourceUserId,
    isOwner,
    correlationId,
    operation: 'checkResourceOwnership'
  }, `Resource ownership check completed: ${isOwner ? 'owned' : 'not owned'}`)
  
  return isOwner
}

/**
 * Extract user profile information for display purposes.
 * 
 * This function extracts commonly needed user information
 * for UI display, with fallbacks for missing data.
 * 
 * @returns Promise<UserProfile | null> - User profile data or null
 * 
 * @example
 * ```typescript
 * // In a server component
 * export default async function UserHeader() {
 *   const profile = await getUserProfile()
 *   
 *   if (!profile) {
 *     return <div>Not logged in</div>
 *   }
 *   
 *   return (
 *     <div>
 *       <span>{profile.displayName}</span>
 *       <span>{profile.email}</span>
 *     </div>
 *   )
 * }
 * ```
 */
export interface UserProfile {
  id: string
  email: string
  displayName: string
  avatar?: string
  createdAt: string
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const { user } = await getUser()
  
  if (!user) {
    return null
  }
  
  const userMetadata = user.user_metadata || {}
  
  return {
    id: user.id,
    email: user.email || '',
    displayName: userMetadata.display_name || userMetadata.full_name || user.email || 'User',
    avatar: userMetadata.avatar_url,
    createdAt: user.created_at
  }
}