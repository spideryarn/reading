import { Page, expect } from '@playwright/test';

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
    const authFile = `playwright/.auth/${userRole}.json`;
    
    // Skip if already authenticated and not forcing
    if (!options.forceReauth && !options.skipStateCheck) {
      if (await this.isAlreadyAuthenticated()) {
        return;
      }
    }
    
    // Clear any existing state for fresh auth
    await this.clearAuthState();
    
    // Perform login with credentials from supabase/seed.sql
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
    // Credentials defined in supabase/seed.sql
    const credentials = {
      user: { 
        email: 'hello@spideryarn.com', 
        password: 'ASDFasdf1' 
      },
      admin: { 
        email: 'hello@spideryarn.com', 
        password: 'ASDFasdf1' 
      } // Admin flag set in profiles table
    };
    return credentials[userRole];
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
    // Verify user is actually logged in by checking profile API
    try {
      const response = await this.page.request.get('/api/user/profile');
      if (response.status() !== 200) {
        throw new Error(`Authentication verification failed: ${response.status()}`);
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