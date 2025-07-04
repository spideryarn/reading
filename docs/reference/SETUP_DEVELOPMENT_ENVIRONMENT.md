# Setup Guide

## Prerequisites

- Node.js (latest LTS version)
- npm or yarn
- Anthropic API key (and/or OpenAI API key for critique features)
- Supabase CLI (install with `npm install -g supabase`)
- sd (for codebase refactoring): `brew install sd` or `cargo install sd`
- code2prompt (for codebase context generation): `brew install code2prompt`
- Python 3.7+ (for planning document critique features - installed automatically when needed)

## See also

- `docs/reference/SETUP_PYTHON.md` - Python dependencies for critique features (optional for most developers)
- `docs/reference/SETUP_SECRETS_AND_ENVIRONMENT_VARIABLES.md` - Environment variable security and production configuration
- `docs/reference/SD_STRING_DISPLACEMENT_FIND_REPLACE.md` - sd usage guide for codebase refactoring


## GitHub repo

https://github.com/spideryarn/reading/


## Quick Start

1. **Clone and install dependencies:**
   ```bash
   git clone https://github.com/spideryarn/reading.git
   cd reading
   npm install
   ```

2. **Environment setup:**
   ```bash
   cp .env.example .env.local
   # Add your API keys to .env.local:
   # - ANTHROPIC_API_KEY (required for AI features)
   # - OPENAI_API_KEY (optional, for critique features)
   # - GOOGLE_GENERATIVE_AI_API_KEY (optional, for Gemini models)
   ```

3. **Initialize Supabase (if not already done):**
   ```bash
   npx supabase init
   ```
   
   This creates the `supabase` directory with config files. The project already includes:
   - `supabase/config.toml` - Pre-configured with custom ports
   - `supabase/migrations/` - Database schema files
   - `supabase/seed.sql` - Optional seed data

4. **Start Supabase locally:**
   ```bash
   npx supabase start
   ```
   
   This will:
   - Download and start Docker containers for all Supabase services
   - Apply database migrations from `supabase/migrations/`
   - Show connection details including API keys
   
   **Note:** This project uses custom ports (configured in `supabase/config.toml`):
   - API: http://localhost:54341
   - Database: localhost:54342
   - Studio: http://localhost:54343
   - Inbucket: http://localhost:54344
   - Analytics: http://localhost:54347
   
   To see the actual running URLs and keys: `npx supabase status`

5. **Generate TypeScript types:**
   ```bash
   npm run db:types
   ```
   This runs `supabase gen types typescript --local` and writes to `lib/types/database-auto-generated.ts`.

   **IMPORTANT (May-2025):** The CLI now outputs *only* the `Database` tree. We append a small
   compatibility shim at the *end* of that file which re-exports a few common aliases
   (`Document`, `AiCall`, etc.).  Regenerating types does **not** touch the shim, so simply rerun the
   command whenever you change the schema; GitHub also runs a nightly job that opens a PR
   if the generated section drifts.
   
   **Note**: This command requires the Supabase CLI to be installed. If you see an error about
   'supabase: command not found', install it with `npm install -g supabase` first.

6. **Start development server:**
   ```bash
   npm run dev
   ```
   
   This logs to `dev.log`, as defined in `package.json`.

   By default, runs on port 3000, but if you define `PORT=3001` in `.env.local`, it'll use that instead. The `dotenv-cli` package is used to load environment variables from `.env.local` before starting the Next.js development server.

   Navigate to e.g. http://localhost:3001/ (or your configured port)

   **Performance optimization**: The dev server now conditionally regenerates database types only when migrations have changed, significantly improving startup time. Use `npm run dev:clean` to force a full clean build with type regeneration.

   **Hot Reload**: The dev server uses standard Next.js Webpack compiler (not Turbopack) for improved Fast Refresh reliability. This provides more stable hot reloading of component changes during development.

   **For AI agents**: Use background daemon mode for automation - see `docs/reference/SETUP_DEV_SERVER_AUTOMATION.md` for comprehensive dev server management with daemon mode, health checking, and multi-worktree isolation.

7. **Verify setup:**
   ```bash
   # Check for TypeScript errors
   npm run build
   
   # Check for linting issues
   npm run lint
   
   # Run tests
   npm test
   ```

## Authentication Setup

### Google OAuth Configuration

1. **Create Google Cloud Project:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable the "Google+ API" (for basic profile access)

2. **Configure OAuth Consent Screen:**
   - Go to "APIs & Services" → "OAuth consent screen"
   - Choose "External" user type for development
   - Fill in application name, user support email, and developer contact

3. **Create OAuth Credentials:**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client IDs"
   - Application type: "Web application"
   - Authorized redirect URIs:
     - Development: `http://localhost:3001/auth/callback`
     - Production: `https://yourdomain.com/auth/callback`

4. **Add to Environment Variables:**
   ```bash
   # Add to .env.local
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```

### Email/SMTP Configuration

For password reset functionality:

1. **Gmail SMTP Setup:**
   - Enable 2-factor authentication on your Gmail account
   - Generate an App Password: Account Settings → Security → App passwords
   - Use the 16-character app password (not your regular password)

2. **Add SMTP Variables:**
   ```bash
   # Add to .env.local
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   SMTP_FROM=your-email@gmail.com
   ```

### Environment Variables (.env.local)

**NEVER modify, overwrite, or delete** `.env.*` files without explicit user permission

Complete environment setup:

```bash
# Core API Keys
ANTHROPIC_API_KEY=your_anthropic_api_key
PORT=3001
LLM_MODEL=claude-3-5-haiku-20241022  # Use Haiku for development

# Supabase (from npx supabase status)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54341
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Authentication
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your_nextauth_secret  # Generate with: openssl rand -base64 32

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Email/SMTP (for password resets)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
SMTP_FROM=your-email@gmail.com
```

**⚠️ Security Note**: Never commit `.env.local` to version control. The `.env.example` template excludes sensitive values.

## Test Environment Setup

For running tests that require environment variables (like database tests), you need to create `.env.test`:

```bash
# Copy your local environment to test environment
cp .env.local .env.test
```

**Authentication Testing Requirements:**
- Tests require authentication environment variables in `.env.test`
- Use development-safe values (local Supabase URLs, test OAuth apps)
- Consider using Haiku model (`LLM_MODEL=claude-3-5-haiku-20241022`) for faster test execution

This follows Next.js conventions where `.env.local` is not loaded during tests. The `.env.test` file is automatically loaded when running `npm test`.

## Git Worktree Development Setup (Optional)

For parallel development using multiple worktrees with a protected main branch, see `docs/reference/GIT_WORKTREES.md`.

This includes:
- Setting up a hub-and-spoke model with 6 development worktrees
- Branch synchronisation workflow with automated dependency management
- Enhanced dev server automation with background daemon mode for AI-first development
- Multi-worktree browser automation isolation for concurrent testing

See also `docs/reference/SETUP_DEV_SERVER_AUTOMATION.md` for comprehensive dev server management capabilities across all worktrees.

## Project Understanding

- **Goals & Vision**: See [README.md](../README.md) for the application's core objectives and target users
- **Technical Architecture**: See [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md) for framework choices, data structure decisions, and implementation approach


## Key Architecture Points

- **Framework**: Next.js with TypeScript and Tailwind CSS
- **AI**: Anthropic Claude Sonnet 4 for most AI features
- **Storage**: Supabase (Postgres with realtime)
- **Data Strategy**: Single-row document storage with complete content preserved
- **Frontend State**: Virtual DOM approach using React state/context

## Supabase Local Development

The project is configured to use custom ports to avoid conflicts with other local Supabase instances:

| Service | Default Port | Our Port | URL |
|---------|-------------|----------|-----|
| API | 54321 | 54341 | http://localhost:54341 |
| Database | 54322 | 54342 | postgres://localhost:54342 |
| Studio | 54323 | 54343 | http://localhost:54343 |
| Inbucket | 54324 | 54344 | http://localhost:54344 |
| Analytics | 54327 | 54347 | - |

These custom ports are configured in `supabase/config.toml`.

### Database Connection and Environment Variables

The application uses Supabase's REST API for all database operations, requiring only one database-related environment variable:

- `NEXT_PUBLIC_SUPABASE_URL` - The Supabase API endpoint (e.g., `http://127.0.0.1:54341`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - The anonymous/public key for client access

**Note**: The application does NOT use direct PostgreSQL connections. All database operations go through the Supabase client SDK which uses the REST API.

**For direct database access** (development/debugging only):
- Use the connection string from `npx supabase status` output
- Default: `postgresql://postgres:postgres@localhost:54342/postgres`
- Tools like Postico, pgAdmin, or psql should connect to port `54342` (not the standard 5432)
- This is only for manual database inspection, not for the application

### Supabase Storage Setup

For file uploads (PDFs, documents):

1. **Create Storage Bucket:**
   ```bash
   # Start Supabase first
   npx supabase start
   
   # Create storage bucket (if not already created by migrations)
   npx supabase storage create documents --public
   ```

2. **Verify Storage Setup:**
   - Visit Supabase Studio: http://localhost:54343
   - Go to Storage → Buckets
   - Confirm 'documents' bucket exists with public access

3. **Storage Configuration:**
   - Maximum file size: 50MB (configurable in bucket settings)
   - Allowed types: PDF, HTML files
   - RLS policies ensure users can only access their own documents

**Note**: Storage buckets and policies are configured automatically via database migrations in `supabase/migrations/20250606000001_storage_bucket_and_policies.sql`.

## shadcn/ui Component Setup

The project uses shadcn/ui for consistent, accessible components:

```bash
# Install shadcn/ui (if not already installed)
npx shadcn@latest init

# Add new components as needed
printf "\n" | npx shadcn@latest add button
printf "\n" | npx shadcn@latest add dialog

# For React 19 compatibility, use --force if needed
printf "\n" | npx shadcn@latest add [component-name] --force
```

**Available Components**: Button, Dialog, Alert, Loading, Select, Checkbox
**Customisation**: All components are copied to `components/ui/` and can be modified
**Theme**: Configured with Spideryarn orange (`#DB8A45`) in `app/globals.css`

See `docs/reference/DESIGN_SHADCN_UI_REFERENCE.md` for complete setup and usage guide.

## Keyboard Shortcuts

Basic shortcuts available in the application:

- **Cmd/Ctrl + K**: Open command palette (global search and navigation)
- **Cmd/Ctrl + Enter**: Submit chat messages
- **Tab**: Navigate between panes and interactive elements

For complete keyboard shortcut reference, see `docs/reference/KEYBOARD_SHORTCUTS.md`.

## Common Supabase Commands

```bash
# Start Supabase
npx supabase start

# Stop Supabase
npx supabase stop

# Reset database (reapplies migrations and seeds)
# ⚠️ DESTRUCTIVE: This deletes all data!
npm run db:reset:DANGEROUS

# Reset database and regenerate TypeScript types
# ⚠️ DESTRUCTIVE: This deletes all data!
npm run db:reset:DANGEROUS

# Generate TypeScript types only
npm run db:types

# Check status (shows actual ports and connection URLs)
npx supabase status

# Access database directly (use port from supabase status)
psql postgres://postgres:postgres@localhost:54342/postgres

# Load seed data manually (if needed)
psql postgres://postgres:postgres@localhost:54342/postgres -f supabase/seed.sql
```

### Troubleshooting

If port conflicts occur:
1. Check if another Supabase instance is running: `docker ps`
2. Stop all Supabase containers: `npx supabase stop --no-backup`
3. Ensure Docker Desktop is running
4. Try starting again: `npx supabase start`

## Development Notes

- The `backup/` folder contains the deprecated SvelteKit implementation - ignore it
- The `obsolete_alternative_version` contains a more advanced, also deprecated, Python version - mostly ignore that, but occasionally we'll borrow from the prompts etc. see `docs/reference/OBSOLETE_ALTERNATIVE_VERSION.md`
- Current focus is on basic document display with hierarchical summaries
- Starting with sample HTML files (no upload functionality yet)

## Additional Documentation

**Authentication & Security:**
- [AUTHENTICATION_OVERVIEW.md](AUTHENTICATION_OVERVIEW.md) - Complete authentication system architecture
- [AUTHENTICATION_SETUP.md](AUTHENTICATION_SETUP.md) - Detailed configuration guide
- [AUTHENTICATION_SECURITY.md](AUTHENTICATION_SECURITY.md) - Security practices and troubleshooting

**Architecture & Design:**
- [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md) - Key architectural decisions and rationale
- [ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md) - Current system architecture
- [UI_COMPONENTS.md](UI_COMPONENTS.md) - Available UI components and patterns

**Development:**
- [CODING_GUIDELINES.md](CODING_GUIDELINES.md) - Code quality standards and best practices
- [TESTING_OVERVIEW.md](TESTING_OVERVIEW.md) - Testing approach and current test coverage
- [GIT_WORKTREES.md](GIT_WORKTREES.md) - Advanced Git worktree development setup
