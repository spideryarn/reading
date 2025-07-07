import { test, expect } from '@playwright/test'

/*
 * Error Recovery & Offline Comprehensive Test
 * -------------------------------------------
 * Consolidates:
 *   • optimized-error-recovery.spec.ts
 *   • error-page-testing.spec.ts
 *
 * Focus:
 * 1. Simulate 500 error and verify custom error page
 * 2. Simulate network offline and recovery
 */

test.describe('Error handling & recovery', () => {
  test('custom error pages render for 500 and 404', async ({ page }) => {
    // Trigger known 500 route
    await page.goto('/api/fake_error')
    await expect(page).toHaveTitle(/Server Error|Application Error|Error/i)

    // Load a non-existent route to get 404
    await page.goto('/this-route-should-404')
    await expect(page.locator('text=404').or(page.locator('text=Not Found')).first()).toBeVisible()
  })

  test('network offline mode shows recovery UI', async ({ page, context }) => {
    await page.goto('/')
    // Go offline
    await context.setOffline(true)
    await page.reload({ waitUntil: 'domcontentloaded' })

    // Expect offline indicator
    const offlineMessage = page.locator('text=offline').or(page.locator('text=No Internet')).first()
    expect(await offlineMessage.isVisible().catch(() => false)).toBeTruthy()

    // Back online and reload
    await context.setOffline(false)
    await page.reload({ waitUntil: 'networkidle' })
    await expect(page).toHaveURL('/')
  })
}) 