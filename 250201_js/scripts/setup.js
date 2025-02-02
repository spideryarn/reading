#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function exec(command) {
    try {
        execSync(command, { stdio: 'inherit' });
    } catch (error) {
        console.error(`Failed to execute: ${command}`);
        process.exit(1);
    }
}

function ensureFileExists(filepath, content) {
    if (!fs.existsSync(filepath)) {
        fs.writeFileSync(filepath, content);
        console.log(`Created ${filepath}`);
    }
}

// Install dependencies if needed
if (!fs.existsSync('node_modules')) {
    console.log('Installing dependencies...');
    exec('npm install');
}

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
    '@playwright/test'
];

console.log('Ensuring dev dependencies...');
exec(`npm install -D ${devDependencies.join(' ')}`);

// Initialize Tailwind if not already done
if (!fs.existsSync('tailwind.config.js')) {
    console.log('Initializing Tailwind...');
    exec('npx tailwindcss init -p');
}

// Ensure config files exist
ensureFileExists('.eslintrc.js', `module.exports = {
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

// Initialize TypeScript if needed
if (!fs.existsSync('tsconfig.json')) {
    console.log('Initializing TypeScript...');
    exec('npx tsc --init');
}

// Install Playwright browsers if needed
console.log('Setting up Playwright...');
exec('npx playwright install');

console.log('Setup complete! You can now run:');
console.log('  npm run dev    - Start development server');
console.log('  npm test       - Run tests'); 