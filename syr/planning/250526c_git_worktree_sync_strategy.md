# Git Worktree Synchronisation Strategy

## Goal & Context

**Goal**: Set up a Git worktree configuration that allows working on experimental features in parallel with the main branch, with an efficient one-step synchronisation process.

**Context**: 
- The repository root is at `/Users/greg/Dropbox/dev/experim/reading`
- Current working directory is `/Users/greg/Dropbox/dev/experim/reading/syr`
- Need to maintain two long-running development environments (terminals with `npm run dev`)
- Want to avoid multi-step manual synchronisation processes
- Git worktrees can't have the same branch checked out simultaneously

## Problem Analysis

The core challenge is that Git worktrees are designed to have different branches checked out. This creates a synchronisation problem when you want to keep two experimental branches in sync with main (and therefore with each other).

### Constraint: File System Changes During Checkout

Switching branches in a worktree modifies all tracked files, which causes:
- Running development servers to crash or behave erratically
- File watchers and build processes to be disrupted
- Editors to reload files and potentially lose state
- General developer experience degradation

## Proposed Solutions

### Option 1: Two-Step Manual Process (Simple but Tedious)

Create a sync script that merges in one direction at a time:
- Run from `experim` worktree: merge `main` → `experim`
- Run from `main` worktree: merge `experim` → `main`

**Pros**: Simple, predictable, no temporary branch switching
**Cons**: Requires manual execution in two places, easy to forget one step

### Option 2: No Persistent Main Worktree (Original User Idea)

Keep both worktrees on experimental branches (`experim1`, `experim2`), temporarily checkout main for syncing.

**Pros**: Each worktree has a one-step sync process
**Cons**: Temporarily checking out main disrupts the working directory and breaks running processes

### Option 3: Temporary Worktree for Merging (Recommended)

Use a temporary worktree to perform the two-way merge without disrupting the current working directory.

**Implementation**:
```bash
# From experim branch:
1. Create temporary worktree with main branch
2. In temp worktree: merge experim → main
3. In current worktree: merge main → experim
4. Clean up temporary worktree
```

**Pros**: 
- One-step process from user perspective
- No disruption to running processes
- Handles merge conflicts gracefully
- Works with any branch naming scheme

**Cons**: 
- Slightly more complex script
- Creates temporary directories (automatically cleaned up)

### Option 4: Fast-Forward Only Using Git Fetch

For simple cases without conflicts:
```bash
git fetch . experim:main  # Fast-forward main to experim
git merge main           # Update current branch
```

**Pros**: Very fast, no worktree needed
**Cons**: Only works for fast-forward merges, fails with any divergence

## Key Decisions

1. **Use temporary worktrees** for safe bidirectional merging without disrupting development environments
2. **Automate cleanup** to prevent temporary worktree accumulation
3. **Check preconditions** (uncommitted changes, branch validation) before operations
4. **Provide clear feedback** about sync status and next steps
5. **Keep operations local** - no automatic pushing to avoid surprising remote changes

## Actions

### Setup Phase

- [ ] Create initial worktree structure
  - [ ] Verify repo root location: `/Users/greg/Dropbox/dev/experim/reading`
  - [ ] Create `experim` branch if it doesn't exist
  - [ ] Add worktree at `/Users/greg/Dropbox/dev/experim/reading2` for `experim` branch

### Script Development

- [ ] Create `sync-branches.sh` script with temporary worktree approach
  - [ ] Add precondition checks (branch validation, uncommitted changes)
  - [ ] Implement temporary worktree creation with proper cleanup
  - [ ] Add two-way merge logic with conflict handling
  - [ ] Include informative status messages
  - [ ] Test script with various scenarios (clean merge, conflicts, uncommitted changes)

### Documentation

- [ ] Document the worktree setup process in project README or CLAUDE.md
- [ ] Add usage instructions for the sync script
- [ ] Document the branch strategy (main vs experim)

### Future Enhancements (Optional)

- [ ] Consider adding support for multiple experimental branches
- [ ] Add option to sync with remote branches (currently local-only)
- [ ] Create complementary script for creating new experimental worktrees

## Appendix

### Example Worktree Structure
```
/Users/greg/Dropbox/dev/experim/
├── reading/          # Main worktree (main or experim branch)
│   └── syr/         # Project files
└── reading2/        # Secondary worktree (experim branch)
    └── syr/         # Same project structure
```

### Git Worktree Commands Reference
```bash
# List all worktrees
git worktree list

# Add new worktree
git worktree add <path> <branch>

# Remove worktree
git worktree remove <path>

# Clean up stale worktree references
git worktree prune
```

### Merge Conflict Resolution Flow
When conflicts occur during sync:
1. Script stops and reports conflict location
2. User resolves conflicts in the appropriate worktree
3. User commits the resolution
4. User re-runs sync script to complete the process