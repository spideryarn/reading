# Git Worktrees Setup and Workflow

Multi-worktree development setup for parallel feature development using a hub-and-spoke model with protected main branch.

## See also

- `scripts/sync-worktrees.ts` - Branch synchronisation tool implementation
- `scripts/sync-worktrees-all.ts` - Wrapper script for automated two-way sync across all worktrees
- `docs/SETUP.md` - General development environment setup
- `docs/GIT_COMMITS.md` - Git commit best practices for the project
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
   # Then install dependencies in each worktree
   cd ../reading-worktree1 && npm install
   cd ../reading-worktree2 && npm install
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

## Development Workflow

### Starting Development
1. Choose an available worktree for your task
2. Start the development server:
   ```bash
   cd reading-worktree1
   npm run dev
   ```
3. Development server runs on the configured port (e.g., http://localhost:3002)

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
- From main: `./scripts/sync-worktrees-all.ts` - automatically performs both steps

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
- Manual two-step process required for bidirectional sync (automated by sync-worktrees-all.ts)