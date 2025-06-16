// Environment detection utilities
// Provides environment-aware behavior for error handling and feature availability

/**
 * Environment detection results
 */
export interface EnvironmentInfo {
  /** Runtime environment (development/production/test) */
  nodeEnv: 'development' | 'production' | 'test'
  /** Whether we're running against local Supabase instance */
  isLocalSupabase: boolean
  /** Whether we're running in a production-like cloud environment */
  isCloudEnvironment: boolean
  /** Whether storage RLS policies are expected to be available */
  expectStorageRLS: boolean
  /** Whether to show storage failures as user-facing errors */
  showStorageErrors: boolean
}

/**
 * Detect current environment and capabilities
 */
export function detectEnvironment(): EnvironmentInfo {
  const nodeEnv = (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test'
  
  // Check if we're using local Supabase (localhost URLs)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const isLocalSupabase = supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1')
  
  // Cloud environment: production mode OR non-local Supabase
  const isCloudEnvironment = nodeEnv === 'production' || !isLocalSupabase
  
  // Storage RLS policies are only available in cloud environments
  const expectStorageRLS = isCloudEnvironment
  
  // Show storage errors to users in cloud environments, but not in local dev
  const showStorageErrors = isCloudEnvironment
  
  return {
    nodeEnv,
    isLocalSupabase,
    isCloudEnvironment,
    expectStorageRLS,
    showStorageErrors
  }
}

/**
 * Check if storage RLS policies are expected to work in current environment
 */
export function shouldStorageRLSWork(): boolean {
  return detectEnvironment().expectStorageRLS
}

/**
 * Check if storage failures should be treated as user-facing errors
 */
export function shouldShowStorageErrors(): boolean {
  return detectEnvironment().showStorageErrors
}

/**
 * Get environment-appropriate error message for storage failures
 */
export function getStorageErrorMessage(originalError: string): string {
  const env = detectEnvironment()
  
  if (originalError.includes('row-level security policy') || originalError.includes('RLS policy')) {
    if (env.isLocalSupabase) {
      return 'Local development: Storage RLS policies not available (expected behavior)'
    } else {
      return 'Storage access denied. Please contact support if this persists.'
    }
  }
  
  if (env.isLocalSupabase) {
    return `Local storage error: ${originalError}`
  } else {
    return 'File storage temporarily unavailable. Please try again.'
  }
}

/**
 * Determine if an error should be thrown vs handled gracefully
 */
export function shouldThrowStorageError(error: string): boolean {
  const env = detectEnvironment()
  
  // RLS policy errors in local development are expected - don't throw
  if (!env.expectStorageRLS && (error.includes('row-level security policy') || error.includes('RLS policy'))) {
    return false
  }
  
  // All other storage errors should be thrown in cloud environments
  if (env.isCloudEnvironment) {
    return true
  }
  
  // In local development, only throw for unexpected errors (not RLS-related)
  return !error.includes('row-level security policy') && !error.includes('RLS policy')
}

/**
 * Log environment information for debugging
 */
export function logEnvironmentInfo(): void {
  const env = detectEnvironment()
  console.log('Environment Info:', {
    nodeEnv: env.nodeEnv,
    isLocalSupabase: env.isLocalSupabase,
    isCloudEnvironment: env.isCloudEnvironment,
    expectStorageRLS: env.expectStorageRLS,
    showStorageErrors: env.showStorageErrors,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/.*/, '/[redacted]') // Hide path for security
  })
}