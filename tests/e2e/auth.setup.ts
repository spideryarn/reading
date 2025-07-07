import { test as setup, expect } from '@playwright/test';
import { getCurrentEnvironmentTestUser, getEnvironmentName, getCurrentEnvironmentId, validateEnvironmentSetup } from '../../lib/testing/worktree-auth-helpers';

/**
 * Authentication Setup Project (Playwright)
 * ------------------------------------------------------
 * This file creates `playwright/.auth/<env>-user.json` that all
 * authenticated E2E tests depend on.
 * 
 * • We previously logged-in through the UI, then called `storageState()`.  
 *   That missed httpOnly cookies on fast machines and caused API calls to
 *   fail with "Authentication required".
 * • Dynamic `import()` of `supabase-js` from jsDelivr failed in CI due to
 *   CORS / CDN throttling ("Failed to fetch dynamically imported module").
 * 
 * ❑ Solution
 *   – Copy the UMD bundle that ships with `@supabase/supabase-js` into
 *     `public/vendor/` during `postinstall` (see `scripts/copy-supabase-bundle.js`).
 *   – Inject that script here with `page.addScriptTag` and perform a
 *     **programmatic** password login.  Because the code executes in the
 *     browser context, Supabase writes cookies + IndexedDB exactly the same
 *     way the UI does, but without the flakiness.
 *   – Poll for an `sb-*` cookie / localStorage token, then persist
 *     `storageState()`.
 * 
 * This approach is fully offline-friendly, CI-safe and deterministic.
 */
// Increase timeout – first page load can take up to a minute while Next.js compiles.
setup.setTimeout(120_000);

// Strict environment validation - fail fast if misconfigured
const validation = validateEnvironmentSetup();
if (!validation.isValid) {
  throw new Error(`Environment validation failed:\n${validation.errors.join('\n')}\n\nCurrent: PORT=${validation.port}, envId=${validation.envId}, envName=${validation.envName}`);
}

const envId = getCurrentEnvironmentId();
const envName = getEnvironmentName(envId);
const authFile = `playwright/.auth/${envName}-user.json`;
const { email, password } = getCurrentEnvironmentTestUser();

/**
 * Worktree-Aware Authentication Setup for Playwright Tests
 * 
 * This setup project runs before all tests and creates an authenticated user session
 * using environment-specific test users to prevent auth conflicts across worktrees.
 * 
 * Environment: ${envName} (ID: ${envId})
 * Test User: ${email}
 * Auth File: ${authFile}
 */
setup('authenticate', async ({ page }) => {
  console.log(`Setting up authentication for ${envName} environment...`);
  console.log(`Using test user: ${email}`);
  console.log(`Auth file: ${authFile}`);
  
  // Programmatic Supabase login avoids flaky UI interaction timing
  await page.goto('/', { waitUntil: 'networkidle' });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase env vars missing – cannot perform programmatic login')
  }

  // Inject Supabase UMD bundle (copied to /vendor by postinstall)
  await page.addScriptTag({ url: '/vendor/supabase.min.js' })

  const loginResult = await page.evaluate(({ email, password, supabaseUrl, supabaseKey }) => {
    // @ts-ignore – global injected by UMD bundle
    const client = window.supabase.createClient(supabaseUrl, supabaseKey)
    return client.auth.signInWithPassword({ email, password }).then(({ error }) => ({
      success: !error,
      message: error?.message,
    }))
  }, { email, password, supabaseUrl, supabaseKey })

  if (!loginResult.success) {
    throw new Error(`Supabase programmatic login failed: ${loginResult.message}`)
  }

  // Wait briefly for Supabase to finish writing persistence data
  await page.waitForTimeout(1000);
  
  console.log('Programmatic login successful');
  // 🔄 NEW: wait until Supabase has finished writing its httpOnly cookies
  // Without this, storageState() may capture an empty cookie jar and break API calls.
  await expect.poll(async () => {
    // Check httpOnly cookie presence
    const cookies = await page.context().cookies()
    if (cookies.some(c => c.name.startsWith('sb-'))) return true

    // Fallback: check localStorage token (Supabase stores auth here too)
    const hasLocalStorageToken = await page.evaluate(() => {
      return Object.keys(localStorage).some(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
    })
    return hasLocalStorageToken
  }, { timeout: 15000 }).toBeTruthy()
  console.log('Supabase auth cookies detected – persistence layer is ready');
  console.log('Authentication successful via programmatic API');
  
  // Save authentication state IMMEDIATELY after login succeeds
  // This ensures we capture the auth state with cookies and IndexedDB entries
  await page.context().storageState({ 
    path: authFile,
    indexedDB: true  // Critical for Supabase auth persistence
  });
  console.log(`Authentication state saved to ${authFile}`);
  
  // Verify authentication works by navigating to protected route
  await page.goto('/read', { waitUntil: 'networkidle' });
  
  // Check if we stayed on the protected route (not redirected to login)
  const currentUrl = page.url();
  if (currentUrl.includes('/auth/login')) {
    throw new Error('Authentication failed - redirected to login page when accessing protected route');
  }
  
  console.log(`Authentication setup completed successfully for ${envName} environment`);
  console.log(`Verified access to protected route: ${currentUrl}`);
});