# Dev Server Automation

Background daemon mode for LLM agent automation and multi-worktree isolation.

## See also

- `scripts/dev-with-restart.sh` - Implementation
- `docs/reference/GIT_WORKTREES.md` - Multi-worktree usage
- `CLAUDE.md` - AI agent commands

## Commands

```bash
# AI agent automation
npm run dev:daemon      # Start/restart daemon in background
npm run dev:status      # Check daemon health (PID + HTTP)
npm run dev:stop        # Stop daemon gracefully

# Standard mode (unchanged)
npm run dev             # Foreground mode (preserves .next, conditional db:types)
npm run dev:clean       # Clean build (clears .next, forces db:types)
npm run dev:safe        # Without DB type generation
```

## AI Agent Workflow

```bash
# Start Supabase first (if not already running)
npm run supabase:status || npm run supabase:start

# Then start dev server
npm run dev:status      # Check current status
npm run dev:daemon      # Start/restart daemon
npm run dev:status      # Verify healthy startup
```

**Supabase Integration**: The dev server requires Supabase to be running for database type generation. Use the minimal start mode (`npm run supabase:start`) for better battery life and resource usage.

## Features

- **Background operation**: Non-blocking for LLM terminals
- **Auto-restart**: `dev:daemon` gracefully restarts existing daemon
- **Health checking**: PID existence + HTTP response verification
- **Multi-worktree isolation**: Independent PID files per worktree (port-based)
- **Robust process cleanup**: Uses `npx kill-port` for reliable port-based process killing
- **Orphaned process handling**: Catches processes not tracked by PID files
- **Graceful shutdown**: SIGTERM → SIGKILL with 5-second grace period
- **Lock protection**: Prevents race conditions during startup
- **Stale cleanup**: Removes orphaned PID/lock files
- **Log rotation**: 10MB limit on `dev.log`
- **Improved hot reload reliability**: Uses standard Webpack instead of Turbopack for better Fast Refresh performance
- **Conditional type generation**: Skips database type regeneration if migrations unchanged
- **Preserved build cache**: .next directory preserved by default for faster startups

## Configuration

- **PID file**: `.dev-server.pid` (configurable via `SYR_DEVSERVER_PIDFILE`)
- **Lock file**: `.dev-server.lock`
- **Port detection**: Uses PORT from `.env.local`

## Troubleshooting

**"No daemon running"**: Run `npm run dev:daemon`

**"Daemon running but not responding"**: Check `dev.log`, restart with `npm run dev:daemon`

**"Port already in use"**: Script uses `npx kill-port` for robust process cleanup

**Manual recovery**:
```bash
rm -f .dev-server.pid .dev-server.lock
npx kill-port $PORT  # More reliable than lsof + kill
npm run dev:daemon
```

**"Database type generation failed"**: Ensure Supabase is running:
```bash
npm run supabase:status
# If not running:
npm run supabase:start
# Then retry dev server
npm run dev:daemon
```

## Multi-Worktree Usage

- Each worktree has independent daemon state
- Ensure unique PORT in each `.env.local`
- Can run daemons simultaneously across all worktrees
- Use `npm run dev:status` to check which are active

## Process Management Improvements

Recent improvements to the dev server automation include:

- **npx kill-port integration**: Both `npm run dev` and `npm run dev:daemon` now use `npx kill-port` for more reliable process cleanup
- **Dual cleanup strategy**: `npm run dev:stop` attempts both PID-based killing (if daemon PID exists) and port-based cleanup (to catch orphaned processes)
- **Fallback handling**: Gracefully handles cases where `npx kill-port` is not available
- **Better error messages**: Clear feedback about what cleanup methods were attempted and their success

This makes both foreground and daemon modes more robust, particularly in scenarios where processes become orphaned or PID tracking fails.

## Hot Reload Configuration

**Turbopack Removal (June 2025)**: The dev server no longer uses Turbopack due to hot reload reliability issues:

- **Previous configuration**: Used `--turbopack` flag and turbopack resolver configuration
- **Current configuration**: Uses standard Next.js Webpack compiler for improved Fast Refresh reliability
- **Impact**: More reliable hot reloading and component updates during development
- **Performance**: Slightly slower initial compilation but significantly more stable hot reload experience

**Files changed**:
- `next.config.ts`: Commented out turbopack configuration
- `scripts/dev-with-restart.sh`: Removed `--turbopack` flags from both daemon and foreground modes

This change resolves issues where component changes weren't being properly reflected during development, improving the developer experience for hot reloading.

## Performance Optimizations

**Conditional Database Type Generation (July 2025)**: The dev server now intelligently manages database type generation:

- **Smart detection**: Checks if migration files are newer than generated types
- **Skip when unchanged**: Avoids unnecessary type regeneration on every startup
- **Force options**: Use `--force-types` flag or `npm run dev:clean` to force regeneration
- **Build cache preservation**: .next directory is preserved by default (no longer cleared on every startup)

**Command options**:
- `npm run dev` - Preserves .next, conditional db:types
- `npm run dev:clean` - Clears .next, forces db:types regeneration
- `./scripts/dev-with-restart.sh --force-types` - Forces type regeneration only
- `./scripts/dev-with-restart.sh --clean` - Full clean build

These optimizations significantly improve dev server startup time, especially for iterative development workflows.

## Fail-Fast Environment Checks

**Critical Environment Validation (July 2025)**: The dev server now performs fail-fast checks for critical dependencies:

- **Supabase CLI check**: Verifies `supabase` command is available before attempting database operations
- **Early termination**: Exits immediately with clear error message if dependencies are missing
- **Helpful guidance**: Provides installation instructions when dependencies are not found

**When checks trigger**:
- During `npm run db:types` execution (called by dev server scripts)
- Before attempting any database type generation
- Prevents cryptic error messages from missing tools

**Resolution**:
```bash
# If Supabase CLI is missing:
npm install -g supabase
# Or follow instructions at: https://supabase.com/docs/guides/cli
```

This fail-fast approach aligns with the project's principle of "Raise errors early, clearly & fatally" to prevent confusion during development setup.