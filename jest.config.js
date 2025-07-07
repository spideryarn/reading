const nextJest = require('next/jest');

const createJestConfig = nextJest({
    dir: './',
});

const customJestConfig = {
    globalSetup: '<rootDir>/tests/setupEnv.js',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    testEnvironment: 'jsdom',
    testMatch: [
        '**/__tests__/**/*.(test|spec).(ts|tsx|js)',
        '**/*.(test|spec).(ts|tsx|js)'
    ],
    testPathIgnorePatterns: [
        // Ignore unit / performance suites we no longer maintain.  Only integration tests remain.
        '<rootDir>/lib/.*/__tests__/',
        '<rootDir>/components/.*/__tests__/',
        '<rootDir>/components/__tests__/',
        '<rootDir>/components/__tests__/.+',
        '<rootDir>/tests/integration/ai-response-logging.test.ts',
        '<rootDir>/app/.*/__tests__/',
        '<rootDir>/tests/e2e/',
        '<rootDir>/lib/utils/.*/__tests__/',
        '<rootDir>/lib/prompts/.*/__tests__/',
        '<rootDir>/lib/services/.*/__tests__/',
        '<rootDir>/lib/evaluation/.*/__tests__/',
        '<rootDir>/.next/',
        '<rootDir>/node_modules/',
        '<rootDir>/obsolete_alternative_version/',
        '<rootDir>/backup/',
        '<rootDir>/e2e/',
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
        'node_modules/(?!(@supabase|@supabase/.*|@assistant-ui|cheerio|nanoid|htmlparser2|domhandler|domutils|dom-serializer|entities|parse5|parse5-htmlparser2-tree-adapter|@assistant-ui/react-markdown|slug|nuqs|unified|remark.*|rehype.*|vfile.*|micromark.*|unist.*|mdast.*|hast.*)/)'
    ]
});