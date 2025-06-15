const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  globalSetup: '<rootDir>/test/setupEnv.js',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  testMatch: [
    '**/__tests__/**/*.(test|spec).(ts|tsx|js)',
    '**/*.(test|spec).(ts|tsx|js)'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/obsolete_alternative_version/',
    '<rootDir>/backup/',
    // Exclude helper/utility files that aren't tests
    '.*test-helpers\\.(ts|tsx|js)$',
    '.*visibility-test-utils\\.(ts|tsx|js)$',
    '.*test-utils\\.(ts|tsx|js)$'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^~/(.*)$': '<rootDir>/$1'
  },
  collectCoverageFrom: [
    '**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!jest.config.js',
    '!jest.setup.js'
  ],
  coverageReporters: ['text', 'lcov', 'html']
};

// Export async configuration to override Next.js defaults for Supabase ESM support
module.exports = async () => ({
  ...(await createJestConfig(customJestConfig)()),
  transformIgnorePatterns: [
    'node_modules/(?!(@supabase|@supabase/.*|@assistant-ui|cheerio|nanoid|htmlparser2|domhandler|domutils|dom-serializer|entities|parse5|parse5-htmlparser2-tree-adapter|@assistant-ui/react-markdown|slug|nuqs)/)'
  ]
});