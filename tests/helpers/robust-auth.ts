import { Page, expect } from '@playwright/test';
import { getCurrentEnvironmentTestUser, getCurrentEnvironmentPaths } from '../../lib/testing/worktree-auth-helpers';

export type UserRole = 'admin' | 'user';

export interface AuthOptions {
  forceReauth?: boolean;
  skipStateCheck?: boolean;
}

/**
 * Robust Authentication Manager for Playwright Tests
 * 
 * Handles:
 * - Database reset recovery
 * - Supabase authentication with IndexedDB persistence
 * - Authentication state verification
 * - Credentials from supabase/seed.sql
 */
export class RobustAuthManager {
  constructor(private page: Page) {}
  
  async loginAs(userRole: UserRole = 'user', options: AuthOptions = {}) {
    const { authFile } = getCurrentEnvironmentPaths();
    
    // Skip if already authenticated and not forcing
    if (!options.forceReauth && !options.skipStateCheck) {
      if (await this.isAlreadyAuthenticated()) {
        return;
      }
    }
    
    // Clear any existing state for fresh auth
    await this.clearAuthState();
    
    // Perform login with environment-specific credentials
    await this.performLogin(userRole);
    
    // Save authentication state with IndexedDB for Supabase
    await this.page.context().storageState({ 
      path: authFile,
      indexedDB: true // Critical for Supabase auth persistence
    });
    
    // Verify authentication worked
    await this.verifyAuthentication();
  }
  
  private async performLogin(userRole: UserRole) {
    const credentials = this.getCredentials(userRole);
    
    await this.page.goto('/auth/login');
    
    // Wait for form to load
    await this.page.waitForLoadState('networkidle');
    
    // Fill login form using form field names (since no data-testid yet)
    await this.page.fill('input[name="email"]', credentials.email);
    await this.page.fill('input[name="password"]', credentials.password);
    await this.page.click('button[type="submit"]');
    
    // Wait for successful authentication (redirect to home)
    await expect(this.page).toHaveURL(/^(?!.*\/auth\/login).*$/, {
      timeout: 15000 // Extended timeout for auth processing
    });
  }
  
  private getCredentials(userRole: UserRole) {
    // Get environment-specific credentials from worktree-auth-helpers
    const { email, password } = getCurrentEnvironmentTestUser();
    
    // Both user and admin use the same environment-specific credentials
    // Admin privileges are set in the profiles table based on email
    return { email, password };
  }
  
  private async isAlreadyAuthenticated(): Promise<boolean> {
    try {
      await this.page.goto('/read');
      // If we can access protected route without redirect, we're authenticated
      return !this.page.url().includes('/auth/login');
    } catch {
      return false;
    }
  }
  
  private async clearAuthState() {
    await this.page.context().clearCookies();
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      // Clear IndexedDB for Supabase
      if ('indexedDB' in window) {
        indexedDB.deleteDatabase('keyval-store');
        indexedDB.deleteDatabase('supabase-auth-token');
      }
    });
  }
  
  private async verifyAuthentication() {
    // Verify user is actually logged in by checking if we can access protected pages
    try {
      // Navigate to a protected page and see if we're redirected to login
      await this.page.goto('/read');
      await this.page.waitForLoadState('networkidle');
      
      // If we can see the page without being redirected to auth, we're authenticated
      const currentUrl = this.page.url();
      if (currentUrl.includes('/auth/login') || currentUrl.includes('/auth/signin')) {
        throw new Error('User appears to be redirected to login page');
      }
    } catch (error) {
      throw new Error(`Authentication verification failed: ${error}`);
    }
  }
}

/**
 * Database Reset Recovery Wrapper
 * 
 * Automatically handles database resets by re-authenticating when needed
 */
export async function withDatabaseResetRecovery<T>(
  page: Page,
  operation: () => Promise<T>,
  maxRetries = 1
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      // Check if error indicates auth/database issue
      if (isAuthError(error) || isDatabaseResetError(error)) {
        const auth = new RobustAuthManager(page);
        await auth.loginAs('user', { forceReauth: true });
        continue;
      }
      
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

function isAuthError(error: any): boolean {
  return error.message?.includes('401') || 
         error.message?.includes('unauthorized') ||
         error.message?.includes('Authentication verification failed');
}

function isDatabaseResetError(error: any): boolean {
  return error.message?.includes('relation') ||
         error.message?.includes('column') ||
         error.message?.includes('database') ||
         error.message?.includes('connection');
}