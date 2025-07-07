import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
    baseDirectory: __dirname,
});

const eslintConfig = [
    ...compat.extends("next/core-web-vitals", "next/typescript"),

    // Strict rules for production code
    {
        files: ["**/*.ts", "**/*.tsx"],
        ignores: ["**/__tests__/**", "**/*.test.ts", "**/*.test.tsx"],
        rules: {
            // Keep these as warnings to prevent deployment blocking while preserving diagnostic value
            "@typescript-eslint/no-unused-vars": ["warn", {
                "argsIgnorePattern": "^_",
                "varsIgnorePattern": "^_",
                "caughtErrorsIgnorePattern": "^_"
            }],
            "@typescript-eslint/no-require-imports": "warn",
            "@typescript-eslint/no-unused-expressions": "warn",
            "react/display-name": "warn",

            // Add temporal dead zone protection (from o3 suggestion) - keep as error for safety
            "no-use-before-define": ["error", {
                "variables": true,
                "functions": false,
                "classes": false
            }],

            // Keep these as warnings for gradual adoption
            "@typescript-eslint/no-explicit-any": "warn",
            "react-hooks/exhaustive-deps": "warn",

            // -----------------------------------------------------------------
            // 🚫 Disallow legacy AI call completion helpers in production code.
            // Enforce use of AIResponseLogger.completeAICall() for consistency
            // so we always capture raw_api_response and latency_ms.
            // -----------------------------------------------------------------
            "no-restricted-syntax": [
                "error",
                {
                    selector: "CallExpression[callee.property.name='completeCall']",
                    message: "Use AIResponseLogger.completeAICall instead of AiCallService.completeCall (legacy)."
                },
                {
                    selector: "CallExpression[callee.name='createWithModelString']",
                    message: "createWithModelString is deprecated – use startCallWithModelString + AIResponseLogger.completeAICall."
                }
            ]
        }
    },

    // Allow internal use of completeCall inside the logger implementation itself
    {
        files: ["lib/services/ai-response-logger.ts"],
        rules: {
            "no-restricted-syntax": "off"
        }
    },

    // Lenient rules for test files
    {
        files: ["**/__tests__/**", "**/*.test.ts", "**/*.test.tsx", "**/__mocks__/**"],
        rules: {
            // Tests need flexibility for mocking complex external libraries
            "@typescript-eslint/no-explicit-any": "off", // Allow any types in tests for mocking flexibility
            "@typescript-eslint/no-unused-vars": ["warn", {
                "argsIgnorePattern": "^_",
                "varsIgnorePattern": "^_",
                "caughtErrorsIgnorePattern": "^_"
            }],
            "@typescript-eslint/no-require-imports": "off", // Allow require() for dynamic imports in tests
            "@typescript-eslint/no-unused-expressions": "off", // Allow chai-style assertions
            "react-hooks/exhaustive-deps": "off", // Test components often intentionally have incomplete deps
            "react/display-name": "off" // Test components don't need display names
        }
    },

    // Additional guidance for Playwright E2E: discourage arbitrary timeouts
    {
        files: ["tests/e2e/**/*.ts"],
        rules: {
            // Warn when waitForTimeout is used; prefer event-driven waits
            "no-restricted-syntax": [
                "warn",
                {
                    "selector": "CallExpression[callee.property.name='waitForTimeout']",
                    "message": "Avoid waitForTimeout – use explicit waits for selectors, events or network responses instead."
                }
            ]
        }
    }
];

export default eslintConfig;
