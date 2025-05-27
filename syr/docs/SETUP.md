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

5. **Start development server:**
   ```bash
   npm run dev
   ```
   
   This logs to `dev.log`, as defined in `package.json`.

   By default, runs on port 3000, but if you define `PORT=3001` in `.env.local`, it'll use that instead. The `dotenv-cli` package is used to load environment variables from `.env.local` before starting the Next.js development server.

   Navigate to e.g. http://localhost:3001/ (or your configured port)

## Git Worktree Development Setup (Optional)

For parallel development on experimental features, you can set up Git worktrees to maintain two separate working directories with different branches running simultaneously.

### Initial Worktree Setup

**Note: Only the user (not the AI) should set up and use the sync script.**

1. **Navigate to parent directory:**
   ```bash
   cd ..  # Go to /Users/greg/Dropbox/dev/experim/reading/
   ```

2. **Create experimental branch (if it doesn't exist):**
   ```bash
   git checkout -b experim
   git push -u origin experim  # Optional: push to remote
   git checkout main
   ```

3. **Create second worktree, e.g. /Users/greg/Dropbox/dev/experim/reading2/ :**
   ```bash
   git worktree add ../reading2 experim
   ```

4. **Set up environment for second worktree:**
   ```bash
   cd reading2/syr
   cp ../../reading/syr/.env.local .env.local
   ```

5. **Update PORT in second worktree's .env.local:**
   ```bash
   # Edit .env.local and change PORT=3001 to PORT=3002 (or next available port)
   ```

6. **Install dependencies in second worktree:**
   ```bash
   npm install
   ```

7. **Start development server in second worktree:**
   ```bash
   npm run dev
   ```

### Directory Structure After Setup

```
/Users/greg/Dropbox/dev/experim/reading/
├── syr/          # Main worktree (main branch) - http://localhost:3001
└── reading2/
    └── syr/      # Experimental worktree (experim branch) - http://localhost:3002
```

### Syncing Branches

Use the provided sync script to keep branches in sync:

```bash
# From either worktree directory
./scripts/sync-branches.ts

# Or with custom branch names
./scripts/sync-branches.ts --main develop --experim feature
```

The sync script:
- Attempts fast-forward merge first (ideal case)
- Falls back to one-direction merge if branches have diverged
- Handles merge conflicts gracefully
- Requires clean working tree before syncing
- **Two-step process**: Run from both worktrees to complete full sync

#### Manual Sync (if script isn't available in target worktree)

If the sync script hasn't been synced to the target worktree yet, manually complete the sync:

```bash
# Go to the other worktree (e.g., reading2/syr)
cd ../../reading2/syr

# Check current branch and ensure it's experim
git branch

# Probably you've already got the latest version of Clipanion from when you set up the worktree, but if not
npm install

# Merge main into experim
git merge main
```

This completes the two-way sync. The sync script will be available in both worktrees after this.

### Supabase Considerations

Both worktrees will use the same local Supabase instance (same ports and database). Be careful when making schema migrations - test them thoroughly in one worktree before syncing to the other.

### Common Worktree Commands

```bash
# List all worktrees
git worktree list

# Remove a worktree (from main repository)
git worktree remove reading2

# Clean up stale worktree references
git worktree prune
```

### Fixing Setup Mistakes

If you accidentally created the worktree in the wrong location:

```bash
# Remove the incorrectly placed worktree
git worktree remove reading2

# Create it in the correct location (alongside, not inside)
git worktree add ../reading2 experim
```

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

### Common Supabase Commands

```bash
# Start Supabase
npx supabase start

# Stop Supabase
npx supabase stop

# Reset database (reapplies migrations and seeds)
npx supabase db reset

# Check status
npx supabase status

# Access database directly
psql postgres://postgres:postgres@localhost:54342/postgres
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
