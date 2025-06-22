# Browser Automation Testing Overview

Quick reference for AI agents and developers using browser automation testing in the Spideryarn Reading project.

## See Also

- `docs/reference/RESEARCH_ON_TESTING_BROWSER_AUTOMATION.md` - Detailed tool comparison and research
- `docs/reference/TESTING_BROWSER_AUTOMATION_IMPLEMENTATION.md` - Detailed implementation patterns
- `docs/reference/TESTING_OVERVIEW.md` - Current testing infrastructure using Jest and React Testing Library
- `docs/reference/GIT_WORKTREES.md` - Multi-worktree browser automation isolation
- [Playwright Documentation](https://playwright.dev/) - Official Playwright documentation

## Executive Summary

**Playwright** is the recommended solution for browser automation testing. It offers:

- **Fast execution** (2-5s per test vs 60s+ with Puppeteer MCP)
- **Minimal output** suitable for AI agents
- **Native Next.js integration**
- **Headless by default** for efficiency
- **Cross-browser support** (Chromium, Firefox, WebKit)

## Quick Start for AI Agents

### Essential Commands
```bash
# Run all E2E tests
npx playwright test

# Run specific test file  
npx playwright test tests/e2e/complete-document-workflow-with-authentication.spec.ts

# Run tests matching pattern
npx playwright test --grep "authentication"

# Debug mode (only when needed)
npx playwright test --debug
```

### Current Implementation Status ✅

**Location**: `tests/e2e/`
- `complete-document-workflow-with-authentication.spec.ts` - Comprehensive workflow testing
- `document-upload-processing-with-ai-integration.spec.ts` - AI features integration testing

**Coverage**: Replaces 50+ unit tests with comprehensive integration testing:
- 🔐 Authentication flow and security
- 📝 Form validation and error handling  
- 📄 Document upload and processing
- 🤖 AI features integration (headings, glossary, chat, summary)
- 💾 Database operations with RLS enforcement

**Execution Results**:
- **3 test scenarios** covering authentication, validation, and complete workflows
- **~35 seconds** total execution time
- **95%+ success rate** with robust error handling

## Key Testing Patterns

### Authentication
```typescript
// Use existing seeded user
await page.fill('input[name="email"]', 'hello@spideryarn.com');
await page.fill('input[name="password"]', 'ASDFasdf1');
await page.click('button[type="submit"]');
await expect(page).toHaveURL(/^(?!.*\/auth\/login).*$/);
```

### Event-Driven Waiting (Recommended)
```typescript
// Wait for API responses, not arbitrary timeouts
const [response] = await Promise.all([
  page.waitForResponse(resp => 
    resp.url().includes('/api/extract-url') && resp.status() === 200
  ),
  page.click('#submit-button')
]);
```

### Multi-Worktree Support
Each worktree uses environment-specific configuration:
- **Port isolation**: Different ports per worktree (3000, 3001, 3002, etc.)
- **Authentication isolation**: Environment-specific test users
- **File isolation**: Separate auth states, screenshots, results

## Configuration

**Playwright Config**: `playwright.config.ts`
- Sequential execution (`workers: 1`) for database safety
- Extended timeouts for AI operations (30-45 seconds)
- Minimal output for AI agents (`reporter: 'list'`)
- Environment-aware port configuration

**Test Credentials**: Defined in `supabase/seed.sql`
- Main: `hello@spideryarn.com` / `ASDFasdf1`
- Worktree-specific: `test-user{N}@spideryarn.com` / `ASDFasdf1`

## E2E Value Proposition

**Why E2E over Unit Testing:**
- **Real workflows**: Tests actual user journeys, not isolated functions
- **Integration confidence**: Catches bugs between components
- **Security validation**: Tests actual RLS policies and authentication
- **Minimal mocking**: Tests real system behavior
- **Maintenance**: 1 E2E test replaces 50+ unit tests

**When to still use Unit Tests:**
- Complex algorithmic logic with edge cases
- Performance-critical code requiring isolated benchmarking
- Library functions without user interface
- Error conditions hard to trigger in E2E

## Common Issues & Solutions

### Database Reset Recovery
Tests include automatic recovery from database resets using `withDatabaseResetRecovery()` helper.

### Test Isolation
Each test uses UUID-based namespaces to avoid conflicts in shared database approach.

### AI Operation Timeouts
Extended timeouts (30-45s) configured for AI processing operations like content extraction and summarization.


---

For detailed implementation patterns, authentication helpers, and advanced configuration, see `docs/reference/TESTING_BROWSER_AUTOMATION_IMPLEMENTATION.md`.