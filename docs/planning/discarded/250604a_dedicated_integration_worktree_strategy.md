# Dedicated Integration Worktree Strategy

## Goal

Improve the Git worktree synchronization workflow by implementing a dedicated integration worktree to eliminate file-watching disruption in development environments while simplifying the sync script logic.

**Current Problem**: The sync script (`scripts/sync-worktrees.ts`) requires complex logic to handle the fact that the main `reading` worktree permanently occupies the `main` branch. This creates:
- Special-case handling when syncing from main vs. to main
- Potential file-watching disruption when temporarily switching branches for merges
- Asymmetric complexity in sync operations

**Proposed Solution**: Move the `reading` worktree to a neutral branch (`get-out-of-the-way-of-main`) and introduce a dedicated `reading-integration` worktree that stays on `main` purely for Git operations (no development servers).

## References

- `docs/GIT_WORKTREES.md` - Current worktree setup and workflow documentation
- `scripts/sync-worktrees.ts` - Current sync script implementation with complex main branch handling
- `docs/planning/finished/250526c_git_worktree_sync_strategy.md` - Original worktree sync strategy decisions (now outdated)
- Research findings on Git worktree patterns and file-watching behavior (see Appendix)

## Principles, Key Decisions

**Architecture Principles:**
- **Clear separation of concerns**: Development worktrees for coding, integration worktree for Git operations only
- **Zero file-watching disruption**: Development environments should never experience branch switches during sync
- **Simplified sync logic**: Eliminate special-case handling for main branch operations
- **Incremental migration**: Support hybrid approach during transition to allow testing both patterns

**Implementation Decisions:**
- Use 5-worktree structure: `reading` (dev), `reading-worktree1/2/3` (dev), `reading-integration` (Git ops only)
- Integration worktree stays permanently on `main` branch
- Development worktrees never switch branches during sync operations
- Sync script detects integration worktree and uses it automatically when available
- Fallback to current approach if integration worktree not present (graceful degradation)

## Actions

### Stage: Research and Validation
- [x] Research Git worktree synchronization best practices and patterns
- [x] Investigate file-watching behavior with modern development tools
- [x] Document findings and alternative approaches
- [ ] Present findings to user and confirm approach
- [ ] Update this planning doc with final decisions

### Stage: Hybrid Implementation
- [ ] Extend sync script to support optional integration worktree
  - [ ] Add `findIntegrationWorktree()` method to detect existing integration setup
  - [ ] Add `performSyncWithOptionalIntegration()` method for hybrid approach
  - [ ] Test fallback behavior when integration worktree not present
  - [ ] Write unit tests for new integration detection logic
- [ ] Test hybrid implementation with current setup
  - [ ] Verify existing sync behavior unchanged when no integration worktree
  - [ ] Confirm script still passes all existing validation checks
- [ ] Commit hybrid implementation changes
- [ ] Update this planning doc with progress

### Stage: Integration Worktree Setup
- [ ] Create integration worktree setup process
  - [ ] Document step-by-step migration process in `docs/GIT_WORKTREES.md`
  - [ ] Create `reading-integration` worktree on main branch
  - [ ] Move `reading` worktree to `get-out-of-the-way-of-main` branch
  - [ ] Update directory structure validation in sync script
  - [ ] Test integration worktree creation and basic operations
- [ ] Validate new worktree structure
  - [ ] Confirm all worktrees accessible and functional
  - [ ] Test sync operations using integration worktree
  - [ ] Verify no development server conflicts
- [ ] Update documentation
  - [ ] Update `docs/GIT_WORKTREES.md` with new structure and workflow
  - [ ] Add troubleshooting section for integration worktree issues
- [ ] Commit integration setup changes
- [ ] Update this planning doc with progress

### Stage: Enhanced Sync Script
- [ ] Implement full integration worktree support
  - [ ] Add robust integration worktree detection with error handling
  - [ ] Implement `execGitInDir()` method for running Git commands in integration worktree
  - [ ] Add auto-setup for missing integration worktree
  - [ ] Update validation to check integration worktree health
  - [ ] Write comprehensive tests for integration worktree operations
- [ ] Test enhanced sync script
  - [ ] Test all sync scenarios: worktree→main, main→worktree, sync-all
  - [ ] Verify autostash behavior works correctly in integration worktree
  - [ ] Test error handling and recovery scenarios
  - [ ] Confirm zero file-watching disruption in development worktrees
- [ ] Performance and usability testing
  - [ ] Measure sync operation time with integration worktree vs. current approach
  - [ ] Test with development servers running during sync operations
  - [ ] Verify no unexpected build triggers or file watcher restarts
- [ ] Commit enhanced sync script
- [ ] Update this planning doc with progress

### Stage: Documentation and Migration
- [ ] Complete documentation updates
  - [ ] Update quick start section in `docs/GIT_WORKTREES.md`
  - [ ] Document migration process from 4-worktree to 5-worktree setup
  - [ ] Add troubleshooting section for integration worktree specific issues
  - [ ] Update workflow examples to show integration worktree usage
- [ ] Create migration script or guide
  - [ ] Document step-by-step migration from current setup
  - [ ] Include rollback instructions if issues arise
  - [ ] Test migration process on clean worktree setup
- [ ] User acceptance testing
  - [ ] User tests new workflow for typical development scenarios
  - [ ] Gather feedback on UX and any unexpected behavior
  - [ ] Address any issues or refinements needed
- [ ] Final integration
  - [ ] Remove hybrid fallback code if no longer needed
  - [ ] Clean up any deprecated documentation
  - [ ] Commit final implementation
- [ ] Move this doc to `docs/planning/finished/` and commit

## Appendix

### Research Summary

**Git Worktree Synchronization Patterns (2025)**:
- Git worktree still marked "experimental" but widely used in production
- No established patterns for complex multi-worktree setups - most teams use custom solutions
- Dedicated integration worktree pattern found in some teams but not widely documented
- Benefits: isolation of Git operations, prevention of file watching disruption, clean room for merging

**File Watching and Development Tools**:
- Modern tools (Next.js, TypeScript, webpack) generally handle branch switches well
- Main issues occur with massive file changes (>1000 files) or dependency updates
- File watching disruption concerns are valid but may be less severe than expected
- Mitigation strategies exist (restart flags, separate node_modules) but add complexity

**Alternative Approaches Considered**:

1. **Git worktree-aware merging** (Option A):
   - Use remote refs and commit SHAs to avoid checkout
   - **Rejected**: Asymmetric complexity, cannot update non-current branches easily
   - **Problem**: `main → worktree` works but `worktree → main` requires complex workarounds

2. **Accept brief file-watching disruption**:
   - Keep current approach, accept occasional rebuilds
   - **Consideration**: Research suggests disruption may be minimal in practice
   - **Decision**: Implement hybrid approach to allow comparison

3. **Multiple repository clones**:
   - Simpler than worktrees but more disk space
   - **Rejected**: Loses benefit of shared Git state and branch management

4. **Container-based or remote development**:
   - Each environment completely isolated
   - **Rejected**: Adds infrastructure complexity beyond scope

### Directory Structure Comparison

**Current Structure**:
```
/Users/greg/Dropbox/dev/experim/
├── reading/              # main branch (causes complexity)
├── reading-worktree1/    # worktree1 branch
├── reading-worktree2/    # worktree2 branch
└── reading-worktree3/    # worktree3 branch
```

**Proposed Structure**:
```
/Users/greg/Dropbox/dev/experim/
├── reading/              # get-out-of-the-way-of-main branch (dev)
├── reading-worktree1/    # worktree1 branch (dev)
├── reading-worktree2/    # worktree2 branch (dev)  
├── reading-worktree3/    # worktree3 branch (dev)
└── reading-integration/  # main branch (Git ops only)
```

### Implementation Code Snippets

**Integration Worktree Detection**:
```typescript
private findIntegrationWorktree(): string | null {
  const worktrees = this.execGit('worktree list --porcelain');
  const lines = worktrees.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('worktree ') && 
        lines[i+1]?.includes('branch refs/heads/main')) {
      return lines[i].replace('worktree ', '');
    }
  }
  return null;
}
```

**Hybrid Sync Method**:
```typescript
private async performSyncWithOptionalIntegration(sourceBranch: string, targetBranch: string): Promise<void> {
  const integrationWorktree = this.findIntegrationWorktree();
  
  if (integrationWorktree && targetBranch === 'main') {
    console.log('🔧 Using integration worktree for main operations');
    return this.syncViaIntegrationWorktree(integrationWorktree, sourceBranch);
  } else {
    console.log('📦 Using standard merge (brief file-watching disruption possible)');
    return this.performStandardMerge(sourceBranch, targetBranch);
  }
}
```

### Benefits and Trade-offs

**Benefits of Dedicated Integration Worktree**:
- **Zero file-watching disruption**: Development worktrees never switch branches
- **Simplified sync logic**: No special-case handling for main branch operations
- **Clean separation**: Git operations isolated from development environments
- **Reliable automation**: Integration scripts can run without affecting active development
- **Better debugging**: Integration issues isolated from development environment

**Trade-offs**:
- **Additional disk space**: ~5% overhead for extra worktree (Git objects shared efficiently)
- **Mental model complexity**: Developers need to understand integration vs. development worktrees
- **Migration effort**: One-time setup and documentation update required
- **Potential over-engineering**: May be solving a problem that's less severe than expected

**Risk Mitigation**:
- Hybrid implementation allows testing both approaches
- Graceful fallback preserves existing workflow
- Comprehensive documentation reduces mental overhead
- Auto-setup reduces manual configuration burden

### User Feedback Requirements

Key questions for user validation:
1. **Severity assessment**: How disruptive is the current file-watching behavior in practice?
2. **Migration preference**: Gradual hybrid approach vs. direct migration to integration worktree?
3. **Complexity tolerance**: Is the mental overhead of dedicated integration worktree acceptable?
4. **Testing approach**: Preference for side-by-side testing vs. direct implementation?
5. **Rollback planning**: Comfort level with migration given rollback complexity?