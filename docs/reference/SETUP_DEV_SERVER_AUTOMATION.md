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

**"Port already in use"**: Script attempts to kill conflicting process

**Manual recovery**:
```bash
rm -f .dev-server.pid .dev-server.lock
lsof -ti:$PORT && kill -9 $PID
npm run dev:daemon
```

## Multi-Worktree Usage

- Each worktree has independent daemon state
- Ensure unique PORT in each `.env.local`
- Can run daemons simultaneously across all worktrees
- Use `npm run dev:status` to check which are active