# Setup Instructions

## Quick Start

1. First, create a new SvelteKit project:
```bash
npm create svelte@latest
cd your-project-name
npm install
```

2. Install dependencies:
```bash
npm install
```

## Development Setup

The project uses:
- SvelteKit with TypeScript
- Vite for building and development
- Playwright for frontend testing
- Vitest for unit testing

## Running the Application

Start the development server with:

```bash
npm run dev
```

Then open your browser to the URL provided.

## Testing

### Unit Testing
- Using Vitest for unit tests
- Run tests with:
  ```bash
  # Run all unit tests
  npm run test:unit
  
  # Run unit tests in watch mode
  npm run test:unit:watch
  ```

### Frontend Testing
- Using Playwright for frontend testing
- Run tests with:
  ```bash
  npm run test:frontend
  ```

### Running All Tests
To run both unit and frontend tests:
```bash
npm test
```

## Project Structure

We're keeping the structure minimal and intuitive:

```
src/
├── lib/           # Reusable components and utilities
│   ├── components/    # Svelte components
│   └── utils/        # Helper functions and types
├── routes/        # Page components and routing
└── app.html       # Root HTML template
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



