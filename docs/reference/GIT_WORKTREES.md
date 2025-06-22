# Git Worktrees Setup and Workflow

Multi-worktree development setup for parallel feature development using a hub-and-spoke model with protected main branch.

## See also

- `scripts/sync-worktrees.ts` - Branch synchronisation tool implementation (example of a well-structured Clipanion script)
- `scripts/sync-worktrees-all.ts` - Wrapper script for automated two-way sync across all worktrees
- `docs/reference/COMMAND_LINE_SCRIPTS.md` - Guidelines for writing command-line scripts like sync-worktrees.ts
- `docs/reference/SETUP.md` - General development environment setup
- `docs/instructions/GIT_COMMIT_CHANGES.md` - Git commit best practices for the project
- `planning/finished/250526c_git_worktree_sync_strategy.md` - Historical decisions about worktree synchronisation (out of date)

## Quick Start

**Basic sync commands:**
```bash
# From any worktree: pull latest from main
./scripts/sync-worktrees.ts

# From main: merge a specific worktree
./scripts/sync-worktrees.ts --branch worktree1

# From main: merge all worktrees
./scripts/sync-worktrees.ts

# Automated two-way sync all worktrees (from main)
./scripts/sync-worktrees-all.ts

# Sync without running npm ci (faster when dependencies unchanged)
./scripts/sync-worktrees-all.ts --run-npm-ci=false
```

**Autostash support:** The script automatically handles uncommitted changes using Git's `--autostash` feature. Your changes are safely stashed before merge and reapplied afterward.

## Principles

- **Protected main branch**: Never work directly on main; all changes go through feature branches
- **Hub-and-spoke model**: Each worktree syncs only with main, not with other worktrees
- **General-purpose worktrees**: Six permanent branches (worktree1-6) for flexible development
- **Simple synchronisation**: One-way merge at a time, no complex cross-worktree syncing

## Migration from Two-Worktree Setup

If you're currently using the main/experim two-worktree setup, follow these steps to migrate:

### 1. Complete Current Work
Ensure all work is committed in both worktrees:
```bash
# In both reading and reading2
git status  # Should show clean working tree
```

### 2. Sync Branches Bidirectionally
```bash
# From reading (main branch)
./scripts/sync-worktrees.ts
# From reading2 (experim branch)
./scripts/sync-worktrees.ts
```

### 3. Merge experim into main
```bash
# In reading (main branch)
git merge experim
git push origin main  # Push the updated main
```

### 4. Clean Up Old Setup
```bash
# Remove the experim worktree
cd /Users/greg/Dropbox/dev/experim
git worktree remove reading2

# Delete the experim branch
cd reading
git branch -d experim
git push origin --delete experim  # If it was pushed
```

## Setting Up Multi-Worktree Environment

### Directory Structure
```
/Users/greg/Dropbox/dev/spideryarn/
├── reading/              # Main branch (protected, read-only)
├── reading-worktree1/    # General-purpose development
├── reading-worktree2/    # General-purpose development
├── reading-worktree3/    # General-purpose development
├── reading-worktree4/    # General-purpose development
├── reading-worktree5/    # General-purpose development
└── reading-worktree6/    # General-purpose development
```

### Initial Setup

1. **Navigate to repository directory**:
   ```bash
   cd /Users/greg/Dropbox/dev/spideryarn/reading
   ```

2. **Create worktree branches**:
   ```bash
   git checkout main
   git checkout -b worktree1
   git checkout -b worktree2
   git checkout -b worktree3
   git checkout -b worktree4
   git checkout -b worktree5
   git checkout -b worktree6
   git checkout main  # Return to main
   ```

3. **Create worktree directories**:
   ```bash
   # From within the reading repository
   git worktree add ../reading-worktree1 worktree1
   git worktree add ../reading-worktree2 worktree2
   git worktree add ../reading-worktree3 worktree3
   git worktree add ../reading-worktree4 worktree4
   git worktree add ../reading-worktree5 worktree5
   git worktree add ../reading-worktree6 worktree6
   ```

4. **Set up each worktree environment**:
   ```bash
   # From the main reading directory, copy .env.local to each worktree
   cp .env.local ../reading-worktree1/
   cp .env.local ../reading-worktree2/
   cp .env.local ../reading-worktree3/
   cp .env.local ../reading-worktree4/
   cp .env.local ../reading-worktree5/
   cp .env.local ../reading-worktree6/
   
   # Edit each .env.local to set unique PORT values
   # Note: Dependencies will be automatically installed when using sync-worktrees-all.ts
   # Or manually install in each worktree if needed:
   # cd ../reading-worktree1 && npm ci
   # cd ../reading-worktree2 && npm ci
   # ... and so on for each worktree
   ```

5. **Configure ports** in each worktree's `.env.local`:
   - reading (main): PORT=3000
   - reading-worktree1: PORT=3001
   - reading-worktree2: PORT=3002
   - reading-worktree3: PORT=3003
   - reading-worktree4: PORT=3004
   - reading-worktree5: PORT=3005
   - reading-worktree6: PORT=3006

6. **Set up browser automation authentication** (required for E2E testing):
   ```bash
   # From main directory, set up authentication in all worktrees
   ./scripts/setup-auth-all-worktrees.ts
   
   # Or manually in each worktree:
   cd ../reading-worktree1 && npm run test:e2e:setup
   cd ../reading-worktree2 && npm run test:e2e:setup
   # ... and so on for each worktree
   ```
   
   This creates environment-specific authentication files for Playwright browser automation:
   - `playwright/.auth/main-user.json` (main repository)
   - `playwright/.auth/worktree1-user.json` through `worktree6-user.json`
   
   **Important**: These auth files are not in Git and must be recreated after database resets.

## Development Workflow

### Starting Development

#### Interactive Development (Standard)
1. Choose an available worktree for your task
2. Start the development server:
   ```bash
   cd reading-worktree1
   npm run dev
   ```
3. Development server runs on the configured port (e.g., http://localhost:3002)

#### AI-First Development with Background Server
For AI agent automation where you want the dev server running in background:

```bash
# Start dev server as background daemon
./scripts/dev-with-restart.sh --daemon

# Check if daemon is running and healthy
./scripts/dev-with-restart.sh --status

# Stop the daemon
./scripts/dev-with-restart.sh --stop
```

**Daemon Mode Features:**
- **Background operation**: Frees up terminal for LLM agents
- **Automatic restarts**: `--daemon` command restarts existing daemon if already running
- **Health checking**: `--status` verifies both process existence and HTTP response
- **Graceful shutdown**: Uses SIGTERM before SIGKILL for clean stops
- **Worktree isolation**: Each worktree daemon uses independent PID tracking
- **Log management**: Automatically rotates dev.log when it exceeds 10MB

**PID File Location**: `.dev-server.pid` in each worktree directory (configurable via `SYR_DEVSERVER_PIDFILE` environment variable)

### Synchronisation Process

The sync script automatically detects your current branch and syncs with main:

```bash
# From any worktree directory
./scripts/sync-worktrees.ts
```

#### From a worktree branch
Merges main → current worktree:
```bash
# In reading-worktree1
./scripts/sync-worktrees.ts  # Merges main → worktree1
```

#### From main branch
You have two options:

1. **Sync a specific worktree**:
   ```bash
   # In reading (main branch)
   ./scripts/sync-worktrees.ts --branch worktree1  # Merges worktree1 → main
   ```

2. **Sync all worktrees at once**:
   ```bash
   # In reading (main branch)
   ./scripts/sync-worktrees.ts  # Merges all worktree branches → main
   ```
   This will attempt to merge all worktree branches (worktree1-6) into main sequentially. If any branch has conflicts, it will be skipped and reported.

**Two-step process for full sync**:

Manual approach:
1. From main: Run sync to merge worktree changes into main
2. From each worktree: Run sync to pull latest main changes

Automated approach (recommended for multiple worktrees):
- From main: `./scripts/sync-worktrees-all.ts` - automatically performs both steps and runs npm ci to ensure dependencies are up to date

### Dependency Management

**Automatic dependency synchronisation**: By default, `sync-worktrees-all.ts` runs `npm ci` in main and each worktree after successful Git sync to ensure all worktrees have identical, up-to-date dependencies that match package-lock.json.

**Benefits of npm ci**:
- Faster than `npm install` (doesn't check for updates)
- Ensures exact dependency versions from package-lock.json
- Prevents "module not found" errors when code changes introduce new dependencies
- Maintains consistency across all worktrees

**Performance options**:
```bash
# Default: sync Git + run npm ci
./scripts/sync-worktrees-all.ts

# Skip npm ci for faster execution (when dependencies haven't changed)
./scripts/sync-worktrees-all.ts --run-npm-ci=false

# Manual npm ci in a specific worktree if needed
cd reading-worktree1 && npm ci
```

**When to skip npm ci**:
- No changes to package.json or package-lock.json
- Working only on code changes without new dependencies
- Need faster sync for rapid iteration
- Troubleshooting Git conflicts without dependency concerns

**Failure handling**: If npm ci fails in any worktree, the script reports the error with full output and marks that worktree as failed, allowing you to investigate and retry.

### Working with Feature Branches

For complex or risky work, create feature branches from a worktree:

```bash
# In reading-worktree1
git checkout -b feature/complex-feature
# Work on feature...
# When done, merge back to worktree1
git checkout worktree1
git merge feature/complex-feature
git branch -d feature/complex-feature
```

### Pushing to Remote

Only push the main branch to origin:
```bash
# After syncing to main
cd reading
git push origin main
```

Worktree branches remain local-only unless explicitly needed for collaboration.

## Common Commands

### Worktree Management
```bash
# List all worktrees
git worktree list

# Remove a worktree
git worktree remove reading-worktree1

# Clean up stale worktree metadata
git worktree prune
```

### Branch Status
```bash
# Check which branches need syncing
git branch -vv

# See commit differences
git log main..worktree1 --oneline
git log worktree1..main --oneline
```

### Browser Automation
```bash
# Set up authentication in all worktrees
./scripts/setup-auth-all-worktrees.ts

# Set up authentication in current worktree only
npm run test:e2e:setup

# Run E2E tests (requires auth setup first)
npm run test:e2e

# Check authentication files
ls -la playwright/.auth/
```

### Conflict Resolution

#### Merge Conflicts
When merge conflicts occur:
1. **Resolve conflicts** in the affected files
2. **Stage resolved files**: `git add <files>`
3. **Complete merge**: `git commit`
4. **Continue**: Re-run sync script

#### Autostash Conflicts
If Git reports "Applying autostash resulted in conflicts":
1. **Check stashed changes**: `git stash show -p`
2. **Options**:
   - Resolve manually: `git stash pop` then fix conflicts
   - Discard stash: `git stash drop` (if changes no longer needed)
   - Keep stash: Leave it and continue working

#### Sync-All Partial Failures
When syncing all worktrees partially fails:

1. **Script reports status**:
   ```
   ✅ Synced 2/3 worktrees to main
   ⚠️  Failed: worktree2
   📋 Next: resolve conflicts in main, commit, then re-run this script
   ```

2. **Fix conflicts in main**:
   ```bash
   git status               # See conflicted files
   # Edit files to resolve conflicts
   git add <resolved-files>
   git commit
   ```

3. **Re-run sync-all**:
   ```bash
   ./scripts/sync-worktrees.ts    # Retries failed branches
   ```

4. **Pull to worktrees**:
   ```bash
   # In each worktree directory
   ./scripts/sync-worktrees.ts    # Gets latest main
   ```
   
   Or use the automated wrapper from main:
   ```bash
   ./scripts/sync-worktrees-all.ts  # Handles step 2 automatically
   ```

**Recovery tip**: Git merges are idempotent - re-running skips already-synced branches.

## Troubleshooting

### Port Conflicts
If a port is already in use:
1. Check `.env.local` in each worktree for PORT settings
2. Ensure no duplicate ports across worktrees
3. Kill any orphaned dev servers: `lsof -i :3002` and `kill <PID>`

### Authentication File Issues
If Playwright tests fail with authentication errors:

**Missing auth files after database reset:**
```bash
# Recreate all authentication files
./scripts/setup-auth-all-worktrees.ts

# Or recreate for single worktree
cd reading-worktree1 && npm run test:e2e:setup
```

**Environment validation errors:**
```bash
# Check environment configuration
cd reading-worktree2
PORT=$(grep "^PORT=" .env.test | cut -d'=' -f2)
echo "Port: $PORT, Expected test user: test-user2@spideryarn.com"
```

**Auth files exist but tests still fail:**
- Database may have been reset - auth files become stale
- Delete specific auth file: `rm playwright/.auth/worktree2-user.json`
- Re-run setup: `npm run test:e2e:setup`

**Wrong test user for environment:**
- Check PORT in `.env.test` matches worktree number
- Worktree1 (PORT=3001) should use `test-user1@spideryarn.com`
- Worktree6 (PORT=3006) should use `test-user6@spideryarn.com`

### Worktree Errors
If "worktree already exists" error:
```bash
# First, clean up stale metadata
git worktree prune

# If the error persists, force remove and re-add
git worktree remove --force <path-to-worktree>
git worktree add ../reading-worktree1 worktree1
```

### Sync Script Issues
If sync script not found in a worktree:
1. Manually sync from main first: `git merge main`
2. The script will be available after merge

### Directory Structure Validation
The sync script validates your worktree setup before running:

**Expected directory structure**:
```
/Users/greg/Dropbox/dev/spideryarn/
├── reading/              # Main branch
├── reading-worktree1/    # worktree1 branch
├── reading-worktree2/    # worktree2 branch
├── reading-worktree3/    # worktree3 branch
├── reading-worktree4/    # worktree4 branch
├── reading-worktree5/    # worktree5 branch
└── reading-worktree6/    # worktree6 branch
```

**Common validation errors**:
- **Unexpected directories**: `reading-test`, `reading-old`, etc.
  - **Fix**: Remove or rename to match expected structure
- **Missing branches**: Directory exists but branch doesn't
  - **Fix**: Create the branch or remove the directory
- **Sync-all with missing branches**: Some worktree branches don't exist
  - **Fix**: Create missing branches or use `--branch` for individual sync

The script fails fast with clear error messages to prevent unexpected behavior.

## Browser Automation Isolation

**Multi-Worktree Browser Testing Support** (June 2025):

The project includes comprehensive isolation for browser automation across all 7 environments to prevent authentication conflicts, file overwrites, and database collisions during concurrent testing.

### Authentication Isolation

**Environment-Specific Test Users**:
- **Main repository** (port 3000): `hello@spideryarn.com`
- **Worktree 1** (port 3001): `test-user1@spideryarn.com`
- **Worktree 2** (port 3002): `test-user2@spideryarn.com`
- **...through Worktree 6** (port 3006): `test-user6@spideryarn.com`
- All users share password: `ASDFasdf1` (from `supabase/seed.sql`)

### File System Isolation

**Directory Structure**:
```
playwright/
├── .auth/
│   ├── main-user.json              # Main repository auth
│   ├── worktree1-user.json         # Worktree 1 auth
│   └── ...worktree6-user.json      # Worktree 6 auth
├── screenshots/
│   ├── main/, worktree1/, ...worktree6/  # Isolated screenshots
└── test-results/
    ├── main/, worktree1/, ...worktree6/  # Isolated test results
```

### Database Namespace Isolation

**Worktree-Aware Test Namespaces**:
- Pattern: `test-main-{testname}-{timestamp}-{uuid}` for main
- Pattern: `test-wt{N}-{testname}-{timestamp}-{uuid}` for worktrees
- Prevents test data contamination across environments

### Usage

**Automatic Environment Detection**:
```typescript
// Environment detection based on PORT
const envId = getCurrentEnvironmentId() // PORT - 3000 = environment ID
const testUser = getCurrentEnvironmentTestUser() // Appropriate test user
const paths = getCurrentEnvironmentPaths() // Isolated file paths
```

**Benefits**:
- **Concurrent testing**: Run browser automation in multiple worktrees simultaneously
- **No conflicts**: Authentication, files, and database data remain isolated
- **Consistent experience**: Same test patterns work across all environments

**Documentation**: See `docs/reference/TESTING_BROWSER_AUTOMATION_OVERVIEW.md` for comprehensive implementation details and usage patterns.

## Best Practices

1. **Clean commits**: Commit frequently with clear messages
2. **Regular syncing**: Sync with main at least daily to avoid conflicts
3. **Branch hygiene**: Delete feature branches after merging
4. **Worktree purpose**: Track what each worktree is working on (your own system)
5. **Database migrations**: Test migrations thoroughly before syncing
6. **Browser automation**: Use environment-specific test users for concurrent testing

## Limitations

- All worktrees share the same local Supabase instance (mitigated by namespace isolation)
- Cannot checkout the same branch in multiple worktrees
- Worktree branches are local-only (not pushed to origin)
- Manual two-step process required for bidirectional sync (automated by sync-worktrees-all.ts)