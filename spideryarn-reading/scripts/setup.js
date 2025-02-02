#!/usr/bin/env node

import { execSync } from 'child_process';
import { promises as fs, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function exec(command) {
    try {
        execSync(command, { stdio: 'inherit' });
    } catch (error) {
        console.error(`Failed to execute: ${command}`);
        process.exit(1);
    }
}

function ensureFileExists(filepath, content) {
    if (!existsSync(filepath)) {
        writeFileSync(filepath, content);
        console.log(`Created ${filepath}`);
    }
}

// Initialize basic Svelte dependencies if not present
const requiredDependencies = [
    '@sveltejs/vite-plugin-svelte',
    'svelte'
];

// Install dev dependencies if not present
const devDependencies = [
    'tailwindcss',
    'postcss',
    'autoprefixer',
    'typescript',
    '@tsconfig/svelte',
    'svelte-check',
    'eslint',
    'prettier',
    'eslint-config-prettier',
    'eslint-plugin-svelte',
    'vitest',
    '@testing-library/svelte',
    '@playwright/test',
    'vite'
];

console.log('Setting up Svelte project in current directory...');

// Install core dependencies
console.log('Installing core dependencies...');
exec(`npm install ${requiredDependencies.join(' ')}`);

// Install dev dependencies
console.log('Installing dev dependencies...');
exec(`npm install -D ${devDependencies.join(' ')}`);

// Create src directory if it doesn't exist
if (!existsSync('src')) {
    mkdirSync('src');
    console.log('Created src directory');
}

// Create basic Svelte files if they don't exist
const basicFiles = {
    'src/app.css': `@tailwind base;
@tailwind components;
@tailwind utilities;`,
    'src/App.svelte': `<script lang="ts">
  let count = 0;
</script>

<main class="container mx-auto p-4">
  <h1 class="text-3xl font-bold mb-4">Welcome to SpiderYarn Reading</h1>
  <button 
    class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
    on:click={() => count++}
  >
    Count is {count}
  </button>
</main>

<style>
</style>`,
    'src/main.ts': `import App from './App.svelte'
import './app.css'

const app = new App({
  target: document.getElementById('app'),
})

export default app`,
    'src/vite-env.d.ts': `/// <reference types="vite/client" />`,
    'index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SpiderYarn Reading</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>`,
    'vite.config.js': `import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
})`,
    'svelte.config.js': `import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

export default {
  preprocess: vitePreprocess(),
}`
};

for (const [file, content] of Object.entries(basicFiles)) {
    ensureFileExists(file, content);
}

// Initialize Tailwind if not already done
if (!existsSync('tailwind.config.js')) {
    console.log('Initializing Tailwind...');
    exec('npx tailwindcss init -p');
}

// Ensure config files exist
ensureFileExists('.eslintrc.js', `export default {
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
  rules: {}
}`);

ensureFileExists('.prettierrc', `{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100
}`);

// Initialize TypeScript configuration
ensureFileExists('tsconfig.json', `{
  "extends": "@tsconfig/svelte/tsconfig.json",
  "compilerOptions": {
    "target": "ESNext",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "resolveJsonModule": true,
    "allowJs": true,
    "checkJs": true,
    "isolatedModules": true
  },
  "include": ["src/**/*.d.ts", "src/**/*.ts", "src/**/*.js", "src/**/*.svelte"],
  "references": [{ "path": "./tsconfig.node.json" }]
}`);

ensureFileExists('tsconfig.node.json', `{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler"
  },
  "include": ["vite.config.js"]
}`);

// Install Playwright browsers if needed
console.log('Setting up Playwright...');
exec('npx playwright install');

// Install global dependencies if needed
console.log('Checking global dependencies...');
try {
    execSync('mmdc --version', { stdio: 'ignore' });
} catch (error) {
    console.log('Installing Mermaid CLI globally...');
    exec('npm install -g @mermaid-js/mermaid-cli');
}

// Create initial Mermaid diagram if it doesn't exist
const mermaidDir = join(__dirname, '..', 'docs');
const mermaidFile = join(mermaidDir, 'architecture.mmd');

if (!existsSync(mermaidDir)) {
    mkdirSync(mermaidDir, { recursive: true });
}

ensureFileExists(mermaidFile, `graph TD
    A[Document Reader] --> B[AI Service]
    B --> C[Document Parser]
    C --> D[State Management]
    D --> A`);

// Generate initial diagram
console.log('Generating architecture diagram...');
exec('scripts/generate-diagrams.sh');

console.log('Setup complete! You can now run:');
console.log('  npm run dev    - Start development server');
console.log('  npm test       - Run tests'); 