# Setup Guide

## Prerequisites

- Node.js (latest LTS version)
- npm or yarn
- Anthropic API key
- Supabase CLI (install with `npm install -g supabase`)


## GitHub repo

https://github.com/spideryarn/reading/


## Quick Start

1. **Clone and install dependencies:**
   ```bash
   git clone https://github.com/spideryarn/reading.git
   cd syr
   npm install
   ```

2. **Environment setup:**
   ```bash
   cp .env.example .env.local
   # Add your ANTHROPIC_API_KEY to .env.local
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
   
   This generates TypeScript types from your database schema into `lib/types/database.ts`. The types provide compile-time safety and autocomplete for database operations.
   
   **Alternative**: Use `npm run db:reset` to reset the database and generate types in one command.

6. **Start development server:
   ```bash
   npm run dev
   ```
   
   This logs to `dev.log`, as defined in `package.json`.

   By default, runs on port 3000, but if you define `PORT=3001` in `.env.local`, it'll use that instead. The `dotenv-cli` package is used to load environment variables from `.env.local` before starting the Next.js development server.

   Navigate to e.g. http://localhost:3001/ (or your configured port)

7. **Verify setup:**
   ```bash
   # Check for TypeScript errors
   npm run build
   
   # Check for linting issues
   npm run lint
   
   # Run tests
   npm test
   ```

## Test Environment Setup

For running tests that require environment variables (like database tests), you need to create `.env.test`:

```bash
# Copy your local environment to test environment
cp .env.local .env.test
```

This follows Next.js conventions where `.env.local` is not loaded during tests. The `.env.test` file is automatically loaded when running `npm test`.

## Git Worktree Development Setup (Optional)

For parallel development using multiple worktrees with a protected main branch, see [WORKTREES.md](WORKTREES.md).

This includes:
- Setting up a hub-and-spoke model with 3 development worktrees
- Branch synchronisation workflow
- Migration from the two-worktree (main/experim) setup

## Project Understanding

- **Goals & Vision**: See [README.md](../README.md) for the application's core objectives and target users
- **Technical Architecture**: See [ARCHITECTURE.md](ARCHITECTURE.md) for framework choices, data structure decisions, and implementation approach


## Key Architecture Points

- **Framework**: Next.js with TypeScript and Tailwind CSS
- **AI**: Anthropic Claude Sonnet 4 for most AI features
- **Storage**: Supabase (Postgres with realtime)
- **Data Strategy**: HTML documents decomposed into database rows with parent/child relationships
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

### Common Supabase Commands

```bash
# Start Supabase
npx supabase start

# Stop Supabase
npx supabase stop

# Reset database (reapplies migrations and seeds)
npx supabase db reset

# Reset database and regenerate TypeScript types
npm run db:reset

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
- The `obsolete_alternative_version` contains a more advanced, also deprecated, Python version - mostly ignore that, but occasionally we'll borrow from the prompts etc. see `docs/OBSOLETE_ALTERNATIVE_VERSION.md`
- Current focus is on basic document display with hierarchical summaries
- Starting with sample HTML files (no upload functionality yet)

For detailed architectural decisions and reasoning, see [ARCHITECTURE.md](ARCHITECTURE.md).
