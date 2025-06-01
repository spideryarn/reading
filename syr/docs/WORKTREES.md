# Git Worktrees Setup and Workflow

Multi-worktree development setup for parallel feature development using a hub-and-spoke model with protected main branch.

## See also

- `scripts/sync-branches.ts` - Branch synchronisation tool implementation
- `docs/SETUP.md` - General development environment setup
- `docs/GIT_COMMITS.md` - Git commit best practices for the project
- `planning/finished/250526c_git_worktree_sync_strategy.md` - Historical decisions about worktree synchronisation (out of date)

## Principles

- **Protected main branch**: Never work directly on main; all changes go through feature branches
- **Hub-and-spoke model**: Each worktree syncs only with main, not with other worktrees
- **General-purpose worktrees**: Three permanent branches (worktree1/2/3) for flexible development
- **Simple synchronisation**: One-way merge at a time, no complex cross-worktree syncing

## Migration from Two-Worktree Setup

If you're currently using the main/experim two-worktree setup, follow these steps to migrate:

### 1. Complete Current Work
Ensure all work is committed in both worktrees:
```bash
# In both reading/syr and reading2/syr
git status  # Should show clean working tree
```

### 2. Sync Branches Bidirectionally
```bash
# From reading/syr (main branch)
./scripts/sync-branches.ts
# From reading2/syr (experim branch)
./scripts/sync-branches.ts
```

### 3. Merge experim into main
```bash
# In reading/syr (main branch)
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

## Setting Up Three-Worktree Environment

### Directory Structure
```
/Users/greg/Dropbox/dev/experim/
├── reading/              # Main branch (protected, read-only)
├── reading-worktree1/    # General-purpose development
├── reading-worktree2/    # General-purpose development
└── reading-worktree3/    # General-purpose development
```

### Initial Setup

1. **Navigate to repository parent directory**:
   ```bash
   cd /Users/greg/Dropbox/dev/experim
   ```

2. **Create the three worktree branches**:
   ```bash
   cd reading
   git checkout main
   git checkout -b worktree1
   git checkout -b worktree2
   git checkout -b worktree3
   git checkout main  # Return to main
   ```

3. **Create worktree directories**:
   ```bash
   cd ..  # Back to /Users/greg/Dropbox/dev/experim
   git worktree add reading-worktree1 worktree1
   git worktree add reading-worktree2 worktree2
   git worktree add reading-worktree3 worktree3
   ```

4. **Set up each worktree environment**:
   ```bash
   # For each worktree (example for worktree1)
   cd reading-worktree1/syr
   cp ../../reading/syr/.env.local .env.local
   # Edit .env.local and set unique PORT (e.g., 3002, 3003, 3004)
   npm install
   ```

5. **Configure ports** in each worktree's `.env.local`:
   - reading (main): PORT=3000
   - reading-worktree1: PORT=3001
   - reading-worktree2: PORT=3002
   - reading-worktree3: PORT=3003

## Development Workflow

### Starting Development
1. Choose an available worktree for your task
2. Start the development server:
   ```bash
   cd reading-worktree1/syr
   npm run dev
   ```
3. Development server runs on the configured port (e.g., http://localhost:3002)

### Synchronisation Process

The sync script automatically detects your current branch and syncs with main:

```bash
# From any worktree directory
./scripts/sync-branches.ts
```

#### From a worktree branch
Merges main → current worktree:
```bash
# In reading-worktree1
./scripts/sync-branches.ts  # Merges main → worktree1
```

#### From main branch
You have two options:

1. **Sync a specific worktree**:
   ```bash
   # In reading (main branch)
   ./scripts/sync-branches.ts --branch worktree1  # Merges worktree1 → main
   ```

2. **Sync all worktrees at once**:
   ```bash
   # In reading (main branch)
   ./scripts/sync-branches.ts  # Merges all worktree branches → main
   ```
   This will attempt to merge worktree1, worktree2, and worktree3 into main sequentially. If any branch has conflicts, it will be skipped and reported.

**Two-step process for full sync**:
1. From main: Run sync to merge worktree changes into main
2. From each worktree: Run sync to pull latest main changes

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
cd reading/syr
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

### Conflict Resolution

#### Single Branch Conflicts
When merge conflicts occur during individual branch sync:
1. Resolve conflicts in the affected files
2. Stage resolved files: `git add <files>`
3. Complete merge: `git commit`
4. Re-run sync script to continue

#### Sync-All Partial Failures
When `sync-branches.ts` (without `--branch`) partially fails:

1. **The script reports which branches failed**, e.g.:
   ```
   ✅ Synced 2 worktree(s) to main
   ⚠️  Failed to sync: worktree2
   📋 To recover: resolve conflicts in main branch, commit, then re-run this script.
   ```

2. **Fix conflicts in main branch**:
   ```bash
   # You're still in main branch where conflicts occurred
   git status                    # See conflicted files
   # Edit files to resolve conflicts
   git add <resolved-files>
   git commit
   ```

3. **Re-run the sync-all command**:
   ```bash
   ./scripts/sync-branches.ts    # Runs sync-all again
   ```
   
   The script will:
   - Skip already-synced branches (Git says "Already up to date")
   - Retry the previously failed branch
   - Continue with any remaining branches

4. **Complete the process**: Once all worktrees are synced to main, go to each worktree and pull the latest changes:
   ```bash
   # In each worktree directory
   ./scripts/sync-branches.ts    # Pulls main → worktree
   ```

**Why this works**: Git merges are idempotent - running the same merge twice has no effect if it already succeeded.

## Troubleshooting

### Port Conflicts
If a port is already in use:
1. Check `.env.local` in each worktree for PORT settings
2. Ensure no duplicate ports across worktrees
3. Kill any orphaned dev servers: `lsof -i :3002` and `kill <PID>`

### Worktree Errors
If "worktree already exists" error:
```bash
git worktree prune
git worktree add reading-worktree1 worktree1 --force
```

### Sync Script Issues
If sync script not found in a worktree:
1. Manually sync from main first: `git merge main`
2. The script will be available after merge

### Directory Structure Validation
The sync script validates your worktree setup before running:

**Expected directory structure**:
```
/Users/greg/Dropbox/dev/experim/
├── reading/              # Main branch
├── reading-worktree1/    # worktree1 branch
├── reading-worktree2/    # worktree2 branch
└── reading-worktree3/    # worktree3 branch
```

**Common validation errors**:
- **Unexpected directories**: `reading-test`, `reading-old`, etc.
  - **Fix**: Remove or rename to match expected structure
- **Missing branches**: Directory exists but branch doesn't
  - **Fix**: Create the branch or remove the directory
- **Sync-all with missing branches**: Some worktree branches don't exist
  - **Fix**: Create missing branches or use `--branch` for individual sync

The script fails fast with clear error messages to prevent unexpected behavior.

## Best Practices

1. **Clean commits**: Commit frequently with clear messages
2. **Regular syncing**: Sync with main at least daily to avoid conflicts
3. **Branch hygiene**: Delete feature branches after merging
4. **Worktree purpose**: Track what each worktree is working on (your own system)
5. **Database migrations**: Test migrations thoroughly before syncing

## Limitations

- All worktrees share the same local Supabase instance
- Cannot checkout the same branch in multiple worktrees
- Worktree branches are local-only (not pushed to origin)
- Manual two-step process required for bidirectional sync