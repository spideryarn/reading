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

3. Set up Tailwind CSS:
```bash
# Initialize Tailwind CSS configuration
npx tailwindcss init -p
```

4. Create a CSS file at `src/app.css` with these Tailwind directives:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

5. Update your `src/app.html` to include the CSS file and update your `src/routes/+layout.svelte` to import the CSS:
```html
<!-- In +layout.svelte -->
<script>
  import "../app.css";
</script>

<slot />
```

## Development Setup

The project uses:
- SvelteKit with TypeScript
- Tailwind CSS for styling
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
├── app.css        # Global styles and Tailwind directives
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
   - Use Tailwind CSS utility classes for styling

2. **Naming Conventions**
   - Components: PascalCase (e.g., `DocumentReader.svelte`)
   - Files: kebab-case (e.g., `document-parser.ts`)
   - Functions: camelCase (e.g., `parseDocument`)
   - Types/Interfaces: PascalCase (e.g., `DocumentMetadata`)

3. **CSS/Styling Conventions**
   - Prefer Tailwind utility classes over custom CSS
   - Use @apply directive in components when reusing multiple utility classes
   - Keep custom CSS to a minimum
   - Use CSS modules when custom styles are necessary



