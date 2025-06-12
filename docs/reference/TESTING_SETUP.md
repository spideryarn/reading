# Testing Setup

This document covers the technical configuration and setup requirements for running tests in the Spideryarn Reading project.

## See also

- `docs/reference/TESTING_OVERVIEW.md` - Main testing guide with philosophy and basic usage
- `docs/reference/TESTING_TROUBLESHOOTING.md` - Known issues and workarounds
- `docs/reference/TESTING_DATABASE.md` - Database-specific testing patterns
- `docs/reference/AUTHENTICATION_TESTING.md` - Authentication testing patterns
- `jest.config.js` - Jest configuration file
- `jest.setup.js` - Global test setup file  
- `test/setupEnv.js` - Environment variable loading for tests

## Jest Configuration

Jest is configured in `jest.config.js` with Next.js integration:

- **Environment**: jsdom for browser simulation
- **Module resolution**: Next.js-compatible path mapping
- **Test patterns**: `__tests__` directories and `.test.` files
- **Coverage**: Collected from TypeScript source files
- **Setup files**: Global configuration and environment loading

### Key Configuration Features

```javascript
// jest.config.js highlights
{
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  globalSetup: '<rootDir>/test/setupEnv.js',
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
}
```

## Environment Variables in Tests

The project follows Next.js best practices for loading environment variables during testing.

### Setup Instructions

1. **Create `.env.test`**: Copy your `.env.local` file to `.env.test`:
   ```bash
   cp .env.local .env.test
   ```

   **⚠️ Required**: Tests will abort if `.env.test` is missing. This ensures consistent test environment setup.

2. **Run tests**: Environment variables will be loaded automatically:
   ```bash
   npm test
   ```

### How It Works

- **Next.js Convention**: When `NODE_ENV=test`, Next.js loads `.env.test` instead of `.env.local`
- **Automatic Loading**: The `test/setupEnv.js` file uses `@next/env` to load environment variables before tests run
- **No Manual Commands**: No need for special dotenv commands or workarounds

### Environment Loading Order

When running tests, Next.js loads environment files in this order:
1. `.env.test.local` (not committed, local overrides)
2. `.env.test` (committed test defaults - though we gitignore it for sensitive data)
3. `.env` (committed shared defaults)

Note: `.env.local` is explicitly NOT loaded during tests to ensure reproducible test environments.

## Testing Stack Components

### Core Framework
- **Jest**: Testing framework with assertions, mocking, and test running
- **React Testing Library**: Component testing focused on user behaviour
- **@testing-library/jest-dom**: Additional DOM matchers for Jest
- **jsdom**: Browser environment simulation for testing

### Planned Additions
- **next-test-api-route-handler**: 📋 Planned solution for Next.js API route testing

### LLM API Cost Prevention

**Critical**: Ensure all LLM API calls are mocked in tests to prevent cost explosion:

```javascript
// __mocks__/@ai-sdk/anthropic.js
export const anthropic = {
  chat: jest.fn().mockResolvedValue({
    content: [{ type: 'text', text: 'Mocked response' }],
    usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 }
  })
};
```

## Global Setup Files

### `jest.setup.js`
- Global test configuration
- DOM matchers from @testing-library/jest-dom
- ⚠️ Currently contains broken Request mocking (see TESTING_TROUBLESHOOTING.md)

### `test/setupEnv.js`
- Loads environment variables using @next/env
- Ensures `.env.test` file existence
- Runs before any tests execute

## Test Performance Considerations

### Best Practices
- **Mock expensive operations**: Always mock LLM API calls and external services
- **Use test database**: Separate test environment from development
- **Prefer integration tests**: Focus on user-facing functionality over implementation details
- **Batch test runs**: Use subagents for verbose test output to avoid context window issues

### Resource Management
- **Environment separation**: Use `.env.test` for test-specific configuration
- **Database isolation**: Consider separate test database instances for parallel testing
- **API call mocking**: Prevent accidental API usage during testing