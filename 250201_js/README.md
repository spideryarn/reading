# Spideryarn

A tool for reading enriched documents with AI assistance—designed to help you navigate, digest, and interrogate complex documents like papers, essays, and books.

## Overview

This project combines the simplicity of Svelte.js with the utility of Tailwind CSS for rapid styling.

## Setup Instructions

### Quick Start
```bash
npm run setup
```

This will handle all initial setup and installation steps safely and idempotently.

### Manual Setup Steps

### Creating the Svelte Project

You can quickly scaffold a minimal Svelte project using Vite:

1. **Create a new project using Vite:**
   ```
   npx create-vite@latest my-svelte-app -- --template svelte
   ```
   or
   ```
   npm create vite@latest my-svelte-app -- --template svelte
   ```

2. **Navigate into your project directory:**
   ```
   cd my-svelte-app
   ```

3. **Install project dependencies:**
   ```
   npm install
   ```

### Setting Up Tailwind CSS

To integrate Tailwind CSS into your Svelte project, follow these steps:

1. **Install Tailwind and its dependencies:**
   ```
   npm install -D tailwindcss postcss autoprefixer
   npx tailwindcss init -p
   ```

2. **Update your `tailwind.config.js` file to include Svelte files:**
   ```js
   module.exports = {
     content: [
       "./index.html",
       "./src/**/*.{svelte,js,ts}",
     ],
     theme: {
       extend: {},
     },
     plugins: [],
   }
   ```

3. **Add Tailwind directives to your main CSS file (e.g., `src/app.css`):**
   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```

### Running the Application

Start the development server with:

npm run dev

Then open your browser to the URL provided (typically [http://localhost:3000](http://localhost:3000)).

## Development Setup

### TypeScript and Code Quality

1. **Install TypeScript and related dependencies:**
   ```bash
   npm install -D typescript @tsconfig/svelte svelte-check
   npm install -D eslint prettier eslint-config-prettier eslint-plugin-svelte
   ```

2. **Initialize TypeScript configuration:**
   ```bash
   npx tsc --init
   ```

3. **Set up ESLint and Prettier:**
   Create `.eslintrc.js`:
   ```js
   module.exports = {
     extends: [
       'eslint:recommended',
       'plugin:svelte/recommended',
       'prettier'
     ],
     parser: '@typescript-eslint/parser',
     parserOptions: {
       project: './tsconfig.json',
       extraFileExtensions: ['.svelte']
     },
     rules: {
       // Keep it simple with minimal custom rules at first
     }
   }
   ```

   Create `.prettierrc`:
   ```json
   {
     "semi": true,
     "singleQuote": true,
     "trailingComma": "es5",
     "printWidth": 100
   }
   ```

### Diagram Generation

1. **Install Mermaid CLI globally:**
   ```bash
   npm install -g @mermaid-js/mermaid-cli
   ```

2. **Generate architecture diagram:**
   ```bash
   ./scripts/generate-diagrams.sh
   ```

This will generate the architecture diagram as SVG in `docs/architecture.svg`.

## Project Structure

We're keeping the structure minimal and intuitive:

```
src/
├── lib/           # Reusable components and utilities
│   ├── components/    # Svelte components
│   └── utils/        # Helper functions and types
├── routes/        # Page components
├── stores/        # Svelte stores for state management
├── types/         # TypeScript type definitions
└── app.svelte     # Root component
```

## Testing Strategy

### Unit Testing
- Using Vitest for unit tests (Vite's native test runner)
- Focus on testing pure functions and utility modules
- Keep component tests simple and focused on business logic

```bash
npm install -D vitest @testing-library/svelte
```

Example test structure:
```typescript
// src/lib/utils/parser.test.ts
import { describe, it, expect } from 'vitest';
import { parseDocument } from './parser';

describe('parseDocument', () => {
  it('should correctly parse basic text', () => {
    const result = parseDocument('Hello World');
    expect(result).toBeDefined();
  });
});
```

### End-to-End Testing
- Using Playwright for E2E testing
- Focus on critical user journeys
- Test across multiple browsers

```bash
npm install -D @playwright/test
npx playwright install
```

Example E2E test:
```typescript
// e2e/basic.spec.ts
import { test, expect } from '@playwright/test';

test('basic document reading flow', async ({ page }) => {
  await page.goto('/');
  await page.fill('[data-testid="document-input"]', 'Test content');
  await page.click('[data-testid="analyze-button"]');
  await expect(page.locator('[data-testid="analysis-result"]')).toBeVisible();
});
```

## Development Conventions

1. **Code Organization**
   - One component per file
   - Use TypeScript for all new code
   - Keep components small and focused
   - Extract reusable logic into composable functions

2. **Naming Conventions**
   - Components: PascalCase (e.g., `DocumentReader.svelte`)
   - Files: kebab-case (e.g., `document-parser.ts`)
   - Functions: camelCase (e.g., `parseDocument`)
   - Types/Interfaces: PascalCase (e.g., `DocumentMetadata`)

3. **State Management**
   - Start with Svelte's built-in stores
   - Keep state as local as possible
   - Document store structure in comments

4. **Testing**
   - Write tests alongside new features
   - Use meaningful test descriptions
   - Follow AAA pattern (Arrange, Act, Assert)

