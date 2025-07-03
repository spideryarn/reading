import { test, expect } from '@playwright/test'

/**
 * Regression test: Verify document text is not obscured by the vertical icon
 * navigation bar when the unified left pane is collapsed on a narrow screen.
 *
 * Reproduction details (from bug report):
 *   - Viewport width: 638 px
 *   - The unified left pane is collapsed
 *   - Document text was previously rendered beneath the nav bar, with the
 *     first characters cut off. This test ensures an adequate left margin.
 */

test('document left margin clear of nav bar when sidebar collapsed (viewport 638px)', async ({ page }) => {
  // Allow extra time for initial document parsing and Supabase queries on first load
  test.setTimeout(60_000)

  // Set viewport to reproduce the reported failure state
  await page.setViewportSize({ width: 638, height: 800 })

  // Navigate to a public document seeded in the database
  await page.goto('/read/chalmers-1995-facing-up-to-the-problem-of-consciousness-cropped')
  // Wait for the main document viewer to be rendered instead of full network idle
  await page.locator('#document-viewer').first().waitFor({ state: 'attached', timeout: 30_000 })

  // Collapse the unified left pane using the dedicated toggle button
  const toggleButton = page.locator('button[aria-label^="Toggle sidebar"]').first()
  await expect(toggleButton).toBeVisible()
  await toggleButton.click()

  // Give the layout a moment to finish its collapse animation
  await page.waitForTimeout(700)

  // Verify the main document viewer container has adequate left offset
  const viewerContainer = page.locator('#document-viewer').first()
  await expect(viewerContainer).toBeVisible()

  // Capture a screenshot for manual inspection/debugging if needed
  await page.screenshot({ path: 'playwright/test-results/left-margin-regression.png', fullPage: true })

  // Ensure the container starts to the right of the nav bar (≥40 px)
  const box = await viewerContainer.boundingBox()
  expect(box).not.toBeNull()
  if (box) {
    expect(box.x).toBeGreaterThanOrEqual(40)
  }
}) 