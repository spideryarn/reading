# Git Worktree Synchronisation Strategy

**Note**: This planning document led to the implementation of worktree support. For current documentation, see `docs/WORKTREES.md`.

## Goal & Context

**Goal**: Set up a Git worktree configuration that allows working on experimental features in parallel with the main branch, with an efficient one-step synchronisation process.

**Context**: 
- The repository root is at `/Users/greg/Dropbox/dev/experim/reading`
- Current working directory is `/Users/greg/Dropbox/dev/experim/reading`
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

### Option 1: Two-Step Manual Process (Simple but Tedious - CHOSEN AS FALLBACK)

Create a sync script that merges in one direction at a time:
- Run from `experim` worktree: merge `main` → `experim`
- Run from `main` worktree: merge `experim` → `main`

**Pros**: Simple, predictable, no temporary branch switching
**Cons**: Requires manual execution in two places, easy to forget one step

### Option 2: No Persistent Main Worktree (Original User Idea)

Keep both worktrees on experimental branches (`experim1`, `experim2`), temporarily checkout main for syncing.

**Pros**: Each worktree has a one-step sync process
**Cons**: Temporarily checking out main disrupts the working directory and breaks running processes

### Option 3: Temporary Worktree for Merging

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

### Option 4: Fast-Forward Only Using Git Fetch (CHOSEN FOR HAPPY PATH)

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

## Final Implementation Decision

**Decision**: Hybrid approach combining Option 4 (fast-forward) with Option 3 (temporary worktree fallback).

**Rationale**:
- Try fast-forward first for the common case where branches haven't diverged
- Fall back to temporary worktree approach for complex merges
- User confirmation required before fallback to maintain control
- TypeScript implementation with Clipanion for type safety and good UX

**Technology Choices**:
- **Language**: TypeScript for type safety and consistency with project
- **CLI Framework**: Clipanion (similar to Python's Typer - type-safe, modern design)
- **Execution**: Standalone executable script with shebang for direct execution

**Safety Features**:
- Requires clean working tree (no uncommitted changes)
- Branch existence validation
- Automatic cleanup of temporary worktrees
- Clear error messages and user guidance

## Actions

### Setup Phase ✅

- [x] Create initial worktree structure
  - [x] Verify repo root location: `/Users/greg/Dropbox/dev/experim/reading`
  - [x] Create `experim` branch if it doesn't exist
  - [x] Add worktree at `/Users/greg/Dropbox/dev/experim/reading2` for `experim` branch

### Script Development ✅

- [x] Create `scripts/sync-worktrees.ts` script with hybrid approach
  - [x] Add precondition checks (branch validation, uncommitted changes)
  - [x] Implement fast-forward attempt first
  - [x] Implement temporary worktree fallback with proper cleanup
  - [x] Add two-way merge logic with conflict handling
  - [x] Include informative status messages
  - [x] Install Clipanion dependency
  - [x] Make script executable
  - [ ] Test script with various scenarios (clean merge, conflicts, uncommitted changes)

### Documentation ✅

- [x] Document the worktree setup process in docs/SETUP_DEVELOPMENT_ENVIRONMENT.md
- [x] Add usage instructions for the sync script
- [x] Document the branch strategy (main vs experim)
- [x] Add safety warnings about user-only operation

### Future Enhancements (Optional)

- [ ] Consider adding support for multiple experimental branches
- [ ] Add option to sync with remote branches (currently local-only)
- [ ] Create complementary script for creating new experimental worktrees

## Appendix

### Example Worktree Structure
```
/Users/greg/Dropbox/dev/experim/
├── reading/          # Main worktree (main or experim branch)
└── reading2/        # Secondary worktree (experim branch)
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