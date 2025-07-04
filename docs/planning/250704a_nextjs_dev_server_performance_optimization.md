# Fix Next.js Dev Server Performance Issues

**Status**: Mostly Complete (January 2025)
- Primary issue (Dropbox sync) resolved by moving worktrees
- Performance optimizations implemented
- Documentation updated

## Goal

Resolve the severe performance degradation in the local Next.js development server, where page loads are taking an unacceptably long time. The investigation has revealed multiple contributing factors creating a "perfect storm" of performance issues.

## Context

The user reported that their local dev server is taking ages to load pages after running `npm run dev`. Initial investigation revealed this is a devops/infrastructure issue rather than application code performance, with multiple systemic problems compounding the slowness.

**Update (January 2025)**: The critical Dropbox syncing issue has been resolved by moving worktrees from `~/Dropbox/blah` to `~/blah`, eliminating the primary performance bottleneck.

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

### 1. ~~Dropbox Syncing 7.5GB of node_modules~~ (RESOLVED)
- **Evidence**: 7 worktrees × 1.1GB each = 7.5GB total being actively synced
- **Impact**: Constant file lock contention, disk I/O overhead, CPU usage
- **Resolution**: Moved worktrees outside Dropbox (~/Dropbox/blah → ~/blah)
- **Note**: `.dropboxignore` files don't exist - Dropbox doesn't support this feature

### 2. ~~Aggressive Cache Clearing~~ (RESOLVED)
- **Evidence**: Line 153 in `dev-with-restart.sh`: `rm -rf .next`
- **Impact**: Forces complete rebuild on every restart, losing all compilation cache
- **Resolution**: Made cache clearing optional with `--clean` flag; default preserves .next

### 3. ~~Pre-startup Database Type Generation~~ (RESOLVED)
- **Evidence**: Line 329: `npm run db:types --silent` runs before every dev server start
- **Impact**: Adds 5-10 seconds to every startup
- **Resolution**: Now only regenerates when migrations are newer than generated types

### 4. ~~Not Using Turbopack~~ (DECISION: Skip)
- **Evidence**: Main dev script doesn't use `--turbo` flag (though `dev:safe` does)
- **Impact**: Missing out on 10x faster compilation speeds
- **Decision**: Skip Turbopack for now - production builds still alpha, potential compatibility issues

### 5. Docker Resource Competition
- **Evidence**: 11 Supabase containers running for 5-7 days
- **Impact**: Memory and CPU competition
- **Root cause**: Long-running development containers

## Principles & Key Decisions

- **Minimal disruption**: Changes should not affect the user's workflow or require significant reconfiguration
- **Reversibility**: All changes should be easily reversible if issues arise
- **Incremental improvement**: Address highest-impact issues first
- **Preserve functionality**: Maintain all current development features while improving performance
- **Ensure correctness**: For code reviews, prioritize having up-to-date builds over faster startups

## Stages & Actions

### Stage: ~~Quick performance wins~~ (COMPLETED)
- [x] Modify `dev-with-restart.sh` to make .next deletion optional
  - [x] Add `--clean` flag to explicitly request cache clearing
  - [x] Default behavior should preserve .next directory
  - [x] Update all npm scripts to reflect new behavior
- [x] Make database type generation conditional
  - [x] Check if migrations have changed since last generation
  - [x] Skip `npm run db:types` if schema is unchanged
  - [x] Add `--force-types` flag for explicit regeneration

### Stage: ~~Enable Turbopack~~ (SKIPPED)
- Decision: Skip Turbopack integration for now due to alpha status for production builds

### Stage: ~~Docker optimization~~ (COMPLETED)
- [x] Audit Docker container usage
  - [x] Identified non-essential services: analytics (Logflare), vector (logging aggregator), inbucket (email testing)
  - [x] Core services needed: postgres, auth, storage, realtime, imgproxy, functions
- [x] Create optimized Supabase management scripts
  - [x] `npm run supabase:start` - Minimal mode (excludes non-essential services)
  - [x] `npm run supabase:start:full` - Full mode (all services)
  - [x] `npm run supabase:stop` - Stop containers
  - [x] `npm run supabase:status` - Check status
- [x] Reduced container count from 11 to ~7-8 for better battery life

### Stage: Additional optimizations
- [ ] Investigate Next.js onDemandEntries configuration
  - [ ] Increase `maxInactiveAge` to keep compiled pages in memory longer
  - [ ] Adjust `pagesBufferLength` for better caching
- [ ] Review and optimize file watcher configuration
  - [ ] Exclude unnecessary directories from watching
  - [ ] Optimize polling intervals if needed
- [ ] Consider moving development outside Dropbox entirely (discuss with user first)

### Stage: ~~Monitoring and documentation~~ (COMPLETED)
- [x] Document all changes in evergreen docs
  - [x] Update `docs/reference/SETUP_DEVELOPMENT_ENVIRONMENT.md`
  - [x] Update `docs/reference/SETUP_DEV_SERVER_AUTOMATION.md`
- Performance tips already included in updated documentation

### Stage: Verification and cleanup
- [ ] Run comprehensive health check: `npm run check:health`
- [ ] Verify all development workflows still function correctly
- [ ] Get user feedback on performance improvements
- [ ] Move this planning doc to `planning/finished/`
- [ ] Git commit all changes with clear documentation

## Implementation Summary

### What We Implemented
1. **Conditional database type generation**: Only regenerates when migrations change (saves 5-10 seconds)
2. **Optional cache clearing**: Default preserves .next, use `--clean` flag when needed
3. **New commands**:
   - `npm run dev` - Fast startup (default)
   - `npm run dev:clean` - Full clean (clears cache + regenerates types)
   - Supports `--force-types` flag for manual type regeneration
4. **Optimized Supabase container management**:
   - `npm run supabase:start` - Minimal mode (7-8 containers instead of 11)
   - `npm run supabase:start:full` - Full mode when email/analytics needed
   - Reduces Docker resource usage and improves battery life

### Visual Indicators Discussion
Considered implementing warnings when cache/types are stale, but decided to fail fast instead:
- If we can detect staleness reliably, better to auto-fix or fail with clear message
- Prevents confusion from running with outdated builds
- User can always use `npm run dev:clean` for guaranteed fresh start

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