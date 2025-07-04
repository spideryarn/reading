# Testing AI Feature Test Analysis

> ✅ **AGREED APPROACH**: This document reflects the agreed testing strategy from the Test Reform for AI-First Development (July 2025).

This document defines the testing strategies for AI-first coding, where multiple AI agents write all the code, with human guidance through conversation/discussion/architectural input.

## Agreed Testing Principles

Based on the Test Reform for AI-First Development (July 2025), the following principles guide our testing approach:

1. **Fewer, higher-value tests** - 50% coverage of critical paths beats 100% coverage with brittle tests
2. **Real over mocked** - Use database isolation instead of mocks wherever possible  
3. **Prefer E2E** - Test user journeys, not implementation details
4. **Budget-conscious LLM testing** - Use cheap models (Haiku/Gemini)
5. **Fail fast** - Surface issues early rather than masking them
6. **Test immutability** - AI must discuss test changes with user before modifying

## Testing Hierarchy (Agreed Approach)

```
1. Critical E2E Tests (5-10 tests)
   - User can sign up and access dashboard
   - Document upload and processing works
   - AI features generate expected outputs
   
2. API Contract Tests
   - API endpoints return expected shapes
   - Database operations respect constraints
   - Service boundaries are maintained
   
3. Complex Logic Unit Tests
   - Algorithm correctness
   - Edge case handling
   - Performance-critical code
```

## Target Metrics

- **Test suite failure rate**: Reduce from 28% to 0%
- **Test-to-code ratio**: Under 20% (currently 27%)
- **Test runtime**: Under 5 minutes for common workflows
- **LLM cost budget**: $20/month for all testing
- **Mock usage**: Very few mocks remaining (only most expensive LLM calls)

## User Context and Responses

### Current Pain Points (from user)
1. Each AI agent writes its own tests
2. Real worry about AI modifying tests to make them pass
3. Less worried about performance for now
4. Current mocks are very brittle
5. Open to browser automation but it breaks often
6. Big issue: AI writes code, manual testing shows page won't load or has obvious bugs
7. Many tests are broken much of the time
8. Tests seem very brittle despite consolidation efforts

### User Preferences
- Prefer to fail fast when there are problems
- Test immutability rules should be less stringent - "don't change tests without having discussed & agreed it with the user" is sufficient
- Considering using a different AI to write or review tests against planning docs
- Already have guidance in CLAUDE.md about being wary of modifying tests

## Key Problems & Solutions

### 1. **Test Modification Policy (Agreed)**

This is the most critical concern for AI-first development:

## Test Modification Guidelines (AGREED)
- Don't modify existing tests without discussing and agreeing with the user
- If a test fails, default to fixing the code, not the test
- Valid reasons to modify tests:
  - Consolidating redundant tests
  - Changing requirements or edge case handling
  - Fixing incorrect test assertions
  - Improving test clarity or reducing brittleness

**b) Git Pre-commit Hooks**
Create a pre-commit hook that detects test modifications:
```bash
#!/bin/bash
# Detect if any test files are being modified (not added)
git diff --cached --name-status | grep -E '^M.*\.(test|spec)\.(ts|tsx|js|jsx)$'
if [ $? -eq 0 ]; then
  echo "⚠️  WARNING: Existing tests are being modified!"
  echo "AI agents should fix code, not tests."
  echo "Continue only with explicit user approval."
  # Could make this a hard block with: exit 1
fi
```

**c) Test-First Development Enforcement**
When creating planning docs, explicitly include:
```markdown
### Stage: Write Tests First
- [ ] Write integration tests for the expected behavior
- [ ] Verify tests fail correctly (red phase)
- [ ] Tests become the specification for implementation

### Stage: Implementation
- [ ] Implement code to make tests pass (green phase)
- [ ] Test modifications require user discussion
```

**d) Alternative AI for Test Review** (New option from user)
Consider using a different AI agent specifically for:
- Writing tests based on planning docs
- Reviewing tests against specifications
- Validating that tests match intended behavior
- Ensuring tests aren't modified to pass incorrectly

### 2. **Reducing Mock Brittleness**

Current mocking is too granular. Here's how to fix it:

**a) Mock at Service Boundaries, Not Implementation**
Instead of:
```typescript
// Brittle - mocks internal implementation
jest.mock('@/lib/prompts/types')
jest.mock('@/lib/prompts/templates/pdf-to-html-direct')
```

Do:
```typescript
// Better - mock at service boundary
jest.mock('@/lib/services/ai-service', () => ({
  AIService: {
    extractContent: jest.fn().mockResolvedValue({
      html: '<html>...</html>',
      metadata: { ... }
    })
  }
}))
```

**b) Use Test Doubles Pattern**
Create a `test-doubles/` directory:
```typescript
// test-doubles/ai-service.ts
export const createMockAIService = () => ({
  extractContent: jest.fn(),
  generateSummary: jest.fn(),
  // Stable interface, implementation can change
})
```

**c) Contract-Based Mocking**
Define contracts that both real and mock implementations must follow:
```typescript
// contracts/ai-service.contract.ts
export interface AIServiceContract {
  extractContent(input: Buffer): Promise<{
    html: string
    metadata: Record<string, any>
  }>
}
```

### 3. **Catching "Page Won't Load" Issues**

**a) Smoke Tests in Planning Docs**
Add to every stage:
```markdown
### Stage: [Feature Implementation]
- [ ] Run smoke test: `npm run dev` and verify /[route] loads
- [ ] Check browser console for errors (use Puppeteer MCP)
- [ ] If page doesn't load, STOP and fix before continuing
```

**b) Build-Time Validation**
Add to planning docs:
```markdown
### Pre-implementation Checks
- [ ] Run `npm run build` - must pass before starting
- [ ] Run `npm run typecheck` - no TypeScript errors allowed

### Post-implementation Checks
- [ ] Run `npm run build` - ensure no new errors
- [ ] Run `npm run lint` - fix any issues
```

**c) Automated Page Load Tests**
Create a simple smoke test suite:
```typescript
// __tests__/smoke-tests.test.ts
describe('Page Load Smoke Tests', () => {
  const routes = ['/', '/documents', '/auth/login']
  
  routes.forEach(route => {
    it(`should load ${route} without errors`, async () => {
      const response = await fetch(`http://localhost:${PORT}${route}`)
      expect(response.ok).toBe(true)
      // Could expand with Puppeteer for console error checking
    })
  })
})
```

### 4. **Managing Test Brittleness**

**a) Integration-First Testing**
Current approach is good, but enhance it:
```typescript
// Focus on user journeys, not implementation
describe('Document Upload Journey', () => {
  it('user can upload PDF and see extracted content', async () => {
    // Test the entire flow, not individual functions
  })
})
```

**b) Behavioral Specifications**
Use BDD-style tests that AI agents can understand:
```typescript
describe('Authentication', () => {
  describe('when user signs up with email', () => {
    it('sends verification email', ...)
    it('creates user profile', ...)
    it('redirects to verification page', ...)
  })
})
```

**c) Test Data Builders**
Create builders for consistent test data:
```typescript
// test-builders/document.builder.ts
export class TestDocumentBuilder {
  private doc = { title: 'Test Doc', content: '<p>Test</p>' }
  
  withTitle(title: string) {
    this.doc.title = title
    return this
  }
  
  build() { return this.doc }
}
```

### 5. **Contract Testing Explanation**

Contract testing ensures that different parts of your system (especially those built by different AI agents) work together correctly by testing the "contracts" between them:

```typescript
// Example: API Contract Test
describe('Document API Contract', () => {
  it('POST /api/documents returns expected shape', async () => {
    const response = await POST('/api/documents', { ... })
    
    // Contract validation
    expect(response).toMatchObject({
      id: expect.any(String),
      title: expect.any(String),
      created_at: expect.any(String),
      // etc.
    })
  })
})
```

This is particularly valuable for AI-first development because:
- Different agents can work independently if contracts are defined
- Changes that break contracts are caught immediately
- Reduces integration issues between AI-generated components

## Recommended Planning Doc Updates

User has already updated `docs/instructions/WRITE_PLANNING_DOC.md` with relevant changes. Additional sections to consider:

```markdown
### Testing Strategy
- [ ] Identify key user journeys to test
- [ ] Write journey tests before implementation
- [ ] Define contracts between components
- [ ] Create test data builders for consistency

### Quality Gates
- [ ] TypeScript compilation passes
- [ ] All existing tests still pass
- [ ] New tests pass
- [ ] Manual smoke test: key pages load
- [ ] No console errors in browser

### AI Agent Constraints
- Test modifications require user discussion
- Mock at service boundaries only
- Fix code to pass tests, not vice versa
- Stop if page won't load and investigate
```

## Research Findings

### Meta's TestGen-LLM Approach
- Uses "Assured LLM-based Software Engineering" (Assured LLMSE)
- Augments existing test suites rather than replacing
- Filters: generates tests → filters non-building → drops failing → discards non-coverage-increasing
- Human review: 73% acceptance rate in best cases
- Key insight: 1:20 ratio of generated to useful tests in real-world scenarios

### Test Brittleness Solutions from Research
- **Flaky tests**: Up to 50% of test failures are due to flakiness
- **Root causes**: Network issues, timing, data dependencies, environment differences
- **Solutions**: 
  - Proper isolation with containers
  - Mock external dependencies at service boundaries
  - Focus on behavior over implementation
  - Use consistent test data patterns

### AI-Specific Testing Challenges
- AI tends to over-test trivial functionality
- Context window limitations prevent seeing entire test suite
- AI may "fix" tests instead of code when facing failures
- Different agents may implement similar functionality differently

## Key Insight

AI-first development needs **stronger guardrails** than traditional development, not weaker ones. The Meta TestGen-LLM approach of "augment but don't replace" is crucial - AI should add tests, not modify existing ones without explicit approval.

## See Also

- `docs/reference/TESTING_OVERVIEW.md` - Main testing philosophy and approach
- `docs/reference/TESTING_DATABASE.md` - Database testing patterns
- `docs/reference/TESTING_SETUP.md` - Test configuration
- `docs/reference/TESTING_TROUBLESHOOTING.md` - Known issues
- `docs/instructions/WRITE_PLANNING_DOC.md` - Updated planning doc instructions
- `CLAUDE.md` - Existing guidance on test modification