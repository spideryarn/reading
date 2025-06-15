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
      // Upgrade safe rules to errors for production code
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/no-require-imports": "error",
      "@typescript-eslint/no-unused-expressions": "error",
      "react/display-name": "error",
      
      // Add temporal dead zone protection (from o3 suggestion)
      "no-use-before-define": ["error", { 
        "variables": true, 
        "functions": false,
        "classes": false 
      }],
      
      // Keep these as warnings for gradual adoption
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/exhaustive-deps": "warn"
    }
  },
  
  // Lenient rules for test files
  {
    files: ["**/__tests__/**", "**/*.test.ts", "**/*.test.tsx"],
    rules: {
      // Tests need flexibility for mocking complex external libraries
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react/display-name": "warn"
    }
  }
];

export default eslintConfig;
