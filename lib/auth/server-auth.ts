import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'
import { authLogger, generateCorrelationId } from '@/lib/services/logger'
import { redirect } from 'next/navigation'

/**
 * Server-side authentication utilities for Next.js App Router
 * 
 * This module provides three core authentication functions:
 * • getAuthUser() - Returns User | null, never throws or redirects
 * • requireAuth() - Returns User or throws/redirects on failure
 * • assertAuth() - Returns structured result object, never throws
 * 
 * Each function has a single, well-defined behavior for clear usage patterns.
 */

/**
 * Custom error class for authentication failures in API routes.
 */
export class AuthError extends Error {
  public readonly status: number

  constructor(message: string = 'Authentication required', status: number = 401) {
    super(message)
    this.name = 'AuthError'
    this.status = status
  }
}

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

/**
 * Get the current authenticated user.
 * 
 * This function returns the current user or null without throwing errors
 * or performing redirects. Use this when you need to check authentication
 * status and handle the result yourself.
 * 
 * @param opts - Configuration options
 * @param opts.allowBearer - Allow Bearer token authentication (explicit opt-in only)
 * @param opts.request - Request object for Bearer token extraction (required if allowBearer is true)
 * @returns Promise<User | null> - The authenticated user or null
 * 
 * @example
 * ```typescript
 * // In a server component or API route (cookie-based)
 * const user = await getAuthUser()
 * if (!user) {
 *   return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
 * }
 * 
 * // In test environment with Bearer token
 * const user = await getAuthUser({ allowBearer: true, request })
 * ```
 */
export async function getAuthUser(opts?: { 
  allowBearer?: boolean
  request?: Request 
}): Promise<User | null> {
  const correlationId = generateCorrelationId()
  
  try {
    // First try standard cookie-based authentication
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (!error && user) {
      authLogger.debug({
        userId: user.id,
        email: user.email,
        correlationId,
        operation: 'getAuthUser',
        authMethod: 'cookie'
      }, 'User retrieved successfully via cookie auth')
      
      return user
    }
    
    // If cookie auth failed and Bearer token is explicitly allowed, try Bearer token fallback
    if (opts?.allowBearer && opts.request) {
      const authHeader = opts.request.headers.get('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const jwt = authHeader.slice(7)
        
        try {
          // Create a short-lived Supabase client with Bearer token
          const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
          const bearerClient = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
              global: {
                headers: {
                  'Authorization': `Bearer ${jwt}`
                }
              }
            }
          )
          
          const { data: { user: bearerUser }, error: bearerError } = await bearerClient.auth.getUser()
          
          if (!bearerError && bearerUser) {
            authLogger.debug({
              userId: bearerUser.id,
              email: bearerUser.email,
              correlationId,
              operation: 'getAuthUser',
              authMethod: 'bearer'
            }, 'User retrieved successfully via Bearer token')
            
            return bearerUser
          } else if (bearerError) {
            authLogger.warn({
              error: bearerError.message,
              correlationId,
              operation: 'getAuthUser',
              authMethod: 'bearer'
            }, 'Bearer token authentication failed')
          }
        } catch (bearerAuthError) {
          authLogger.warn({
            error: bearerAuthError instanceof Error ? bearerAuthError.message : 'Unknown error',
            correlationId,
            operation: 'getAuthUser',
            authMethod: 'bearer'
          }, 'Bearer token processing failed')
        }
      }
    }
    
    // Log the original cookie auth error if no fallback succeeded
    if (error) {
      authLogger.warn({
        error: error.message,
        correlationId,
        operation: 'getAuthUser',
        authMethod: 'cookie'
      }, 'Cookie authentication failed')
    }
    
    return null
  } catch (error) {
    authLogger.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      correlationId,
      operation: 'getAuthUser'
    }, 'Unexpected authentication error')
    
    return null
  }
}

/**
 * Require authentication with configurable failure handling.
 * 
 * By default, throws an AuthError for API routes. When redirectTo is provided,
 * performs a redirect instead (useful for page components).
 * 
 * @param opts - Configuration options
 * @param opts.redirectTo - URL to redirect to if unauthenticated (performs redirect instead of throwing)
 * @param opts.allowBearer - Allow Bearer token authentication (explicit opt-in only)
 * @param opts.request - Request object for Bearer token extraction (required if allowBearer is true)
 * @returns Promise<User> - The authenticated user (guaranteed)
 * @throws AuthError - When unauthenticated and no redirectTo provided
 * 
 * @example
 * ```typescript
 * // In an API route (throws AuthError)
 * export async function GET() {
 *   const user = await requireAuth()
 *   // user is guaranteed to be valid here
 * }
 * 
 * // In a page component (redirects)
 * export default async function ProtectedPage() {
 *   const user = await requireAuth({ redirectTo: '/auth/login' })
 *   // user is guaranteed to be valid here
 * }
 * 
 * // In an API route with Bearer token support
 * export async function POST(request: Request) {
 *   const user = await requireAuth({ allowBearer: true, request })
 *   // user is guaranteed to be valid here
 * }
 * ```
 */
export async function requireAuth(opts?: { 
  redirectTo?: string
  allowBearer?: boolean
  request?: Request 
}): Promise<User> {
  const correlationId = generateCorrelationId()
  const user = await getAuthUser({
    allowBearer: opts?.allowBearer,
    request: opts?.request
  })
  
  if (!user) {
    authLogger.info({
      correlationId,
      operation: 'requireAuth',
      redirectTo: opts?.redirectTo,
      allowBearer: opts?.allowBearer
    }, 'Authentication required - user not found')
    
    if (opts?.redirectTo) {
      redirect(opts.redirectTo)
    } else {
      throw new AuthError('Authentication required')
    }
  }
  
  authLogger.debug({
    userId: user.id,
    correlationId,
    operation: 'requireAuth'
  }, 'Authentication successful')
  
  return user
}

/**
 * Assert authentication status with structured result object.
 * 
 * This function never throws or redirects, instead returning a structured
 * result object. Use this when you need explicit control over authentication
 * failure handling, such as in middleware or edge functions.
 * 
 * @param request - The incoming request (used for logging context and Bearer token extraction)
 * @param opts - Configuration options
 * @param opts.allowBearer - Allow Bearer token authentication (explicit opt-in only)
 * @returns Object with success flag, user (if authenticated), and error message
 * 
 * @example
 * ```typescript
 * // In an API route with explicit error handling
 * export async function POST(request: Request) {
 *   const { success, user, error } = await assertAuth(request)
 *   if (!success) {
 *     return NextResponse.json({ error }, { status: 401 })
 *   }
 *   // Use user here
 * }
 * 
 * // In an API route with Bearer token support
 * export async function POST(request: Request) {
 *   const { success, user, error } = await assertAuth(request, { allowBearer: true })
 *   if (!success) {
 *     return NextResponse.json({ error }, { status: 401 })
 *   }
 *   // Use user here
 * }
 * ```
 */
export async function assertAuth(
  request: Request, 
  opts?: { allowBearer?: boolean }
): Promise<{ success: boolean; user?: User; error?: string }> {
  const correlationId = generateCorrelationId()
  const user = await getAuthUser({
    allowBearer: opts?.allowBearer,
    request
  })
  
  if (!user) {
    authLogger.info({
      correlationId,
      operation: 'assertAuth',
      url: request.url,
      method: request.method,
      allowBearer: opts?.allowBearer
    }, 'Authentication assertion failed')
    
    return {
      success: false,
      error: 'Authentication required'
    }
  }
  
  authLogger.debug({
    userId: user.id,
    correlationId,
    operation: 'assertAuth',
    url: request.url,
    method: request.method
  }, 'Authentication assertion successful')
  
  return {
    success: true,
    user
  }
}

