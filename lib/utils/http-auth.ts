import { NextRequest, NextResponse } from 'next/server'

/**
 * HTTP Authentication Utilities
 * 
 * This module provides utilities for HTTP-level authentication handling,
 * including bot detection and standardized error responses.
 */

/**
 * Check if the current request is from a bot or crawler.
 * 
 * This function examines the User-Agent header to determine
 * if the request is likely from a search engine bot or crawler.
 * 
 * @param request - The Next.js request object
 * @returns boolean - True if the request appears to be from a bot
 * 
 * @example
 * ```typescript
 * // In middleware or API route
 * if (isBot(request)) {
 *   // Handle bot traffic differently
 *   return NextResponse.json({ message: 'Bot detected' })
 * }
 * ```
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