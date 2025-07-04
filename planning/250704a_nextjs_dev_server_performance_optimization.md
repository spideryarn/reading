# Fix Next.js Dev Server Performance Issues

## Goal

Resolve the severe performance degradation in the local Next.js development server, where page loads are taking an unacceptably long time. The investigation has revealed multiple contributing factors creating a "perfect storm" of performance issues.

## Context

The user reported that their local dev server is taking ages to load pages after running `npm run dev`. Initial investigation revealed this is a devops/infrastructure issue rather than application code performance, with multiple systemic problems compounding the slowness.

## User Stories & Acceptance Criteria

- **As a developer**, I want the dev server to start within 30 seconds so I can begin work quickly
- **As a developer**, I want page navigation to complete within 2-3 seconds so I maintain development flow
- **As a developer**, I want file changes to reflect within 1-2 seconds via Hot Module Replacement
- **As a developer**, I want my development environment to not consume excessive system resources

### Success Criteria
- Dev server startup time < 30 seconds
- Initial page load < 5 seconds
- Subsequent navigation < 3 seconds
- HMR updates < 2 seconds
- System remains responsive during development

## References

- `scripts/dev-with-restart.sh` - Custom dev server script that's causing performance issues
- `next.config.ts` - Next.js configuration (not using Turbopack)
- `.gitignore` - Shows node_modules should be excluded (but Dropbox doesn't respect this)
- `package.json` - Shows dev scripts and indicates Turbopack is available but not used
- [Next.js dev mode performance issues (2025)](https://github.com/vercel/next.js/issues/48748) - Known framework issues

## Investigation Findings

### 1. Dropbox Syncing 7.5GB of node_modules (Critical)
- **Evidence**: 7 worktrees × 1.1GB each = 7.5GB total being actively synced
- **Impact**: Constant file lock contention, disk I/O overhead, CPU usage
- **Root cause**: No `.dropboxignore` file exists to exclude node_modules

### 2. Aggressive Cache Clearing
- **Evidence**: Line 153 in `dev-with-restart.sh`: `rm -rf .next`
- **Impact**: Forces complete rebuild on every restart, losing all compilation cache
- **Root cause**: Overly aggressive attempt to ensure "clean" starts

### 3. Pre-startup Database Type Generation
- **Evidence**: Line 329: `npm run db:types --silent` runs before every dev server start
- **Impact**: Adds 5-10 seconds to every startup
- **Root cause**: Unnecessary regeneration when schema hasn't changed

### 4. Not Using Turbopack
- **Evidence**: Main dev script doesn't use `--turbo` flag (though `dev:safe` does)
- **Impact**: Missing out on 10x faster compilation speeds
- **Root cause**: Conservative approach to new technology

### 5. Docker Resource Competition
- **Evidence**: 11 Supabase containers running for 5-7 days
- **Impact**: Memory and CPU competition
- **Root cause**: Long-running development containers

## Principles & Key Decisions

- **Minimal disruption**: Changes should not affect the user's workflow or require significant reconfiguration
- **Reversibility**: All changes should be easily reversible if issues arise
- **Incremental improvement**: Address highest-impact issues first
- **Preserve functionality**: Maintain all current development features while improving performance

## Stages & Actions

### Stage: Immediate critical fix - Dropbox exclusion
- [ ] Create `.dropboxignore` file to exclude node_modules from Dropbox sync
  - [ ] Add pattern for all node_modules directories: `**/node_modules`
  - [ ] Add pattern for .next directories: `**/.next`
  - [ ] Add other build artifacts: `**/dist`, `**/build`, `**/.turbo`
- [ ] Verify Dropbox respects the ignore file (may need to pause/restart sync)
- [ ] Document this in a new evergreen doc about development environment setup

### Stage: Quick performance wins
- [ ] Modify `dev-with-restart.sh` to make .next deletion optional
  - [ ] Add `--clean` flag to explicitly request cache clearing
  - [ ] Default behavior should preserve .next directory
  - [ ] Update all npm scripts to reflect new behavior
- [ ] Make database type generation conditional
  - [ ] Check if migrations have changed since last generation
  - [ ] Skip `npm run db:types` if schema is unchanged
  - [ ] Add `--force-types` flag for explicit regeneration

### Stage: Enable Turbopack
- [ ] Test Turbopack compatibility with current setup
  - [ ] Run `next dev --turbo` manually to check for issues
  - [ ] Verify all features work correctly
  - [ ] Check for any webpack-specific configurations that need adaptation
- [ ] Update dev scripts to use Turbopack by default
  - [ ] Modify main dev command to include `--turbo`
  - [ ] Keep non-turbo fallback as `dev:legacy`
- [ ] Run comprehensive testing to ensure no regressions

### Stage: Docker optimization
- [ ] Audit Docker container usage
  - [ ] Identify which containers are actively needed
  - [ ] Document purpose of each container
- [ ] Create Docker management scripts
  - [ ] `docker-pause.sh` - Pause non-essential containers
  - [ ] `docker-resume.sh` - Resume paused containers
  - [ ] Add to npm scripts for easy access
- [ ] Consider Docker resource limits if needed

### Stage: Additional optimizations
- [ ] Investigate Next.js onDemandEntries configuration
  - [ ] Increase `maxInactiveAge` to keep compiled pages in memory longer
  - [ ] Adjust `pagesBufferLength` for better caching
- [ ] Review and optimize file watcher configuration
  - [ ] Exclude unnecessary directories from watching
  - [ ] Optimize polling intervals if needed
- [ ] Consider moving development outside Dropbox entirely (discuss with user first)

### Stage: Monitoring and documentation
- [ ] Create performance baseline measurements
  - [ ] Time dev server startup
  - [ ] Time initial page load
  - [ ] Time HMR updates
- [ ] Document all changes in evergreen docs
  - [ ] Update `docs/reference/SETUP_DEVELOPMENT_ENVIRONMENT.md`
  - [ ] Create `docs/reference/DEVELOPMENT_PERFORMANCE_OPTIMIZATION.md`
- [ ] Add performance tips to CLAUDE.md for future AI agents

### Stage: Verification and cleanup
- [ ] Run comprehensive health check: `npm run check:health`
- [ ] Verify all development workflows still function correctly
- [ ] Get user feedback on performance improvements
- [ ] Move this planning doc to `planning/finished/`
- [ ] Git commit all changes with clear documentation

## Appendix

### Dropbox Sync Impact Analysis

Based on investigation, Dropbox is attempting to sync:
- ~960 directories per node_modules
- ~100,000+ files per node_modules
- 7.5GB total across all worktrees

This creates:
- File lock contention when Next.js tries to read/write
- Bandwidth usage for continuous sync
- CPU overhead for file monitoring
- Potential conflicts during npm operations

### Turbopack Performance Benefits

From Next.js documentation and community reports:
- 10x faster cold starts
- 5x faster hot module replacement
- Better memory efficiency
- Native handling of large codebases

Trade-offs:
- Some webpack plugins may not be compatible
- Newer technology with potential edge cases
- May require configuration adjustments

### Alternative Approaches Considered

1. **Move entire development out of Dropbox**
   - Pros: Complete elimination of sync issues
   - Cons: Loss of automatic backup, requires workflow change
   - Decision: Too disruptive as first approach

2. **Single shared node_modules via symlinks**
   - Pros: Reduces total size to 1.1GB
   - Cons: Complex setup, potential version conflicts
   - Decision: Too risky for multi-worktree setup

3. **Remote development environment**
   - Pros: Consistent performance, no local resource usage
   - Cons: Requires internet, latency issues, complex setup
   - Decision: Overkill for current problem

### Next.js Dev Server Architecture Notes

The investigation revealed Next.js dev server compiles both frontend and backend, with on-demand compilation causing delays during navigation. This is exacerbated by our aggressive cache clearing and lack of Turbopack optimization.