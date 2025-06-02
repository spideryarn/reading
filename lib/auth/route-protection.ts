import { redirect } from 'next/navigation'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Route protection utilities for server components and API routes
 * 
 * This module provides utilities for protecting routes and handling
 * authentication redirects in a Next.js App Router application.
 */

interface AuthRedirectOptions {
  loginPath?: string
  returnTo?: string
}

/**
 * Require authentication for a server component.
 * 
 * This function checks if the user is authenticated and redirects
 * to the login page if not. Use this in server components that
 * require authentication.
 * 
 * @param options - Configuration for the authentication redirect
 * @returns Promise<User> - The authenticated user object
 * @throws Redirects to login page if user is not authenticated
 * 
 * @example
 * ```typescript
 * // In a server component
 * export default async function ProtectedPage() {
 *   const user = await requireAuth()
 *   // User is guaranteed to be authenticated here
 *   return <div>Hello {user.email}</div>
 * }
 * ```
 */
export async function requireAuth(options: AuthRedirectOptions = {}) {
  const { loginPath = '/auth/login', returnTo } = options
  
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    const searchParams = new URLSearchParams()
    if (returnTo) {
      searchParams.set('next', returnTo)
    }
    
    const redirectUrl = searchParams.toString() 
      ? `${loginPath}?${searchParams.toString()}`
      : loginPath
    
    redirect(redirectUrl)
  }
  
  return user
}

/**
 * Get the current authenticated user without redirecting.
 * 
 * This function returns the user if authenticated, or null if not.
 * Use this when you want to conditionally show content based on
 * authentication status without forcing a redirect.
 * 
 * @returns Promise<User | null> - The authenticated user or null
 * 
 * @example
 * ```typescript
 * // In a server component
 * export default async function OptionalAuthPage() {
 *   const user = await getAuthUser()
 *   return (
 *     <div>
 *       {user ? `Welcome ${user.email}` : 'Please log in'}
 *     </div>
 *   )
 * }
 * ```
 */
export async function getAuthUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return null
  }
  
  return user
}

/**
 * Check if the current request is from a bot or crawler.
 * 
 * This function examines the User-Agent header to determine
 * if the request is likely from a search engine bot or crawler.
 * 
 * @param request - The Next.js request object
 * @returns boolean - True if the request appears to be from a bot
 */
export function isBot(request: NextRequest): boolean {
  const userAgent = request.headers.get('user-agent') || ''
  
  const botPatterns = [
    'googlebot',
    'bingbot',
    'slurp',
    'duckduckbot',
    'baiduspider',
    'yandexbot',
    'facebookexternalhit',
    'twitterbot',
    'rogerbot',
    'linkedinbot',
    'embedly',
    'quora link preview',
    'showyoubot',
    'outbrain',
    'pinterest',
    'developers.google.com',
    'slackbot',
    'vkshare',
    'w3c_validator',
    'redditbot',
    'applebot',
    'whatsapp',
    'flipboard',
    'tumblr',
    'bitlybot',
    'skypeuripreview',
    'nuzzel',
    'discordbot',
    'google page speed',
    'qwantbot',
    'pinterestbot',
    'bitrix link preview',
    'xing-contenttabreceiver',
    'chrome-lighthouse',
    'telegrambot'
  ]
  
  return botPatterns.some(pattern => 
    userAgent.toLowerCase().includes(pattern.toLowerCase())
  )
}

/**
 * Create a 401 Unauthorized response for API routes.
 * 
 * This function creates a standardized 401 response that's
 * appropriate for both browser users and bots/crawlers.
 * 
 * @param message - Optional error message
 * @returns NextResponse with 401 status
 * 
 * @example
 * ```typescript
 * // In an API route
 * export async function GET(request: NextRequest) {
 *   const user = await getAuthUser()
 *   if (!user) {
 *     return createUnauthorizedResponse('Authentication required')
 *   }
 *   // Handle authenticated request
 * }
 * ```
 */
export function createUnauthorizedResponse(message = 'Authentication required') {
  return NextResponse.json(
    { error: message, code: 'UNAUTHORIZED' },
    { status: 401 }
  )
}


