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
npm run dev             # Foreground mode
npm run dev:safe        # Without DB type generation
```

## AI Agent Workflow

```bash
npm run dev:status      # Check current status
npm run dev:daemon      # Start/restart daemon
npm run dev:status      # Verify healthy startup
```

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