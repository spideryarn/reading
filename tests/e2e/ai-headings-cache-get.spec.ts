import { test, expect } from '@playwright/test'
import { RobustAuthManager } from '../helpers/robust-auth'
import { getCurrentEnvironmentPaths } from '../../lib/testing/worktree-auth-helpers'

const { authFile } = getCurrentEnvironmentPaths()

test.use({ storageState: authFile })

const DOC_SLUG = 'chalmers-1995-facing-up-to-the-problem-of-consciousness'

/**
 * Verifies that the first /api/tools/structure request (action=get) returns 200
 * and indicates cached headings for the page.
 */

test('Structure tool GET returns cached headings (200)', async ({ page, browser }) => {
  // Ensure authenticated context
  if (!(await page.context().storageState()).cookies.length) {
    const authMgr = new RobustAuthManager(page)
    await authMgr.loginAs('user', { forceReauth: true })
  }

  // Listen for the first structure tool request
  const structureResponsePromise = page.waitForResponse(response => {
    return response.url().includes('/api/tools/structure') && response.request().method() === 'POST'
  })

  await page.goto(`/read/${DOC_SLUG}`)

  const structureResp = await structureResponsePromise

  expect(structureResp.status(), 'structure endpoint should return HTTP 200').toBe(200)

  const json = await structureResp.json()
  // Expect cached flag true and operations array non-empty
  expect(json.cached).toBeTruthy()
  expect(Array.isArray(json.operations)).toBeTruthy()
  expect(json.operations.length).toBeGreaterThan(0)
}) 