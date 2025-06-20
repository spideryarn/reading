# Dev Server Automation for AI-First Development

Enhanced development server management with background daemon mode for LLM agent automation and multi-worktree isolation.

## See also

- `scripts/dev-with-restart.sh` - Implementation of the enhanced dev server script
- `docs/reference/GIT_WORKTREES.md` - Multi-worktree setup and daemon mode usage in context
- `CLAUDE.md` - Essential commands and best practices for AI agents
- `package.json` - Available npm scripts for dev server management

## Overview

The enhanced dev server script provides both traditional foreground mode and new background daemon mode designed for AI-first development workflows. It preserves all existing port conflict resolution while adding robust PID management, health checking, and graceful process handling.

## Key Features

### Background Daemon Mode ✓
- **Non-blocking operation**: Frees up terminal for LLM agents
- **Automatic restart capability**: Existing daemon is gracefully restarted on new `--daemon` calls  
- **PID tracking**: Uses `SYR_DEVSERVER_PIDFILE` environment variable (defaults to `.dev-server.pid`)
- **Lock file protection**: Prevents multiple daemon instances with race condition handling

### Health Monitoring ✓
- **Process verification**: Checks if PID exists and is running
- **HTTP response testing**: Verifies dev server actually responds to requests
- **Comprehensive status reporting**: Distinguishes between "not running", "running but unhealthy", and "healthy"

### Graceful Process Management ✓
- **SIGTERM before SIGKILL**: Attempts graceful shutdown before forcing termination
- **Stale file cleanup**: Automatically removes outdated PID and lock files
- **Port conflict resolution**: Inherits robust port-checking logic from original script

### Multi-Worktree Isolation ✓
- **Independent tracking**: Each worktree maintains its own PID file and daemon state
- **Port-aware operation**: Uses PORT from `.env.local` for worktree-specific behaviour
- **No cross-contamination**: Worktrees can run daemons simultaneously without conflicts

## Available Commands

### NPM Scripts
```bash
# Standard foreground mode (unchanged behaviour)
npm run dev

# AI agent automation - background mode
npm run dev:daemon      # Start/restart daemon in background
npm run dev:status      # Check daemon health (process + HTTP)
npm run dev:stop        # Stop daemon gracefully

# Fallback mode
npm run dev:safe        # Start without DB type generation
```

### Direct Script Usage
```bash
# All npm scripts are wrappers around the enhanced script
./scripts/dev-with-restart.sh           # Normal foreground mode
./scripts/dev-with-restart.sh --daemon  # Background daemon mode  
./scripts/dev-with-restart.sh --status  # Health check
./scripts/dev-with-restart.sh --stop    # Stop daemon
```

## AI Agent Usage Patterns

### Recommended Workflow
```bash
# 1. Check current status
npm run dev:status

# 2. Start/restart if needed (automatically handles existing daemon)
npm run dev:daemon

# 3. Verify healthy startup
npm run dev:status

# 4. Continue with development tasks...

# 5. Clean shutdown when done (optional)
npm run dev:stop
```

### Error Handling
- **Exit codes**: Commands return appropriate exit codes (0 = success, 1 = failure)
- **Clear messaging**: Descriptive output for both success and failure cases
- **Automatic recovery**: `--daemon` mode handles most common error conditions automatically

## Technical Implementation

### Configuration
- **PID file location**: Configurable via `SYR_DEVSERVER_PIDFILE` environment variable
- **Default location**: `.dev-server.pid` in each worktree directory
- **Lock file**: `.dev-server.lock` prevents race conditions during startup
- **Log rotation**: Automatically rotates `dev.log` when it exceeds 10MB

### Process Management Details
```bash
# Graceful shutdown sequence
kill -TERM $PID          # Request graceful shutdown
sleep 5                  # Wait up to 5 seconds
kill -KILL $PID          # Force kill if still running

# Health check sequence  
kill -0 $PID             # Check if process exists
curl -f localhost:$PORT  # Verify HTTP response
```

### File Management
- **Stale cleanup**: Removes PID files for non-existent processes
- **Lock handling**: Cleans up abandoned lock files from crashed startups
- **Atomic operations**: PID file updates are atomic to prevent corruption

## Best Practices

### For AI Agents
1. **Always check status first**: Avoid unnecessary restart attempts
2. **Use daemon mode for automation**: Don't block your own terminal
3. **Verify health after startup**: Ensure server is actually responding
4. **Graceful cleanup**: Use `npm run dev:stop` instead of manual process killing

### For Multi-Worktree Development
1. **Port configuration**: Ensure each worktree has unique PORT in `.env.local`
2. **Independent operation**: Each worktree daemon operates independently
3. **Status awareness**: Check which worktrees have active daemons
4. **Resource management**: Stop unused daemons to free system resources

### Error Recovery
1. **Stale PID files**: Script automatically detects and cleans stale files
2. **Port conflicts**: Existing port-clearing logic handles conflicts robustly
3. **Failed startups**: Lock files prevent multiple simultaneous startup attempts
4. **Process zombies**: Graceful shutdown sequence handles most termination issues

## Troubleshooting

### Common Issues

**"No daemon running"**
- PID file doesn't exist or contains stale PID
- Run `npm run dev:daemon` to start fresh daemon

**"Daemon running but not responding"** 
- Process exists but HTTP requests fail
- Check `dev.log` for startup errors
- Restart with `npm run dev:daemon`

**"Another daemon startup in progress"**
- Lock file indicates concurrent startup attempt
- Wait a moment and retry, or manually remove `.dev-server.lock`

**"Port already in use"**
- Another process (possibly non-daemon) is using the port
- Script will attempt to kill conflicting process
- Check `lsof -ti:$PORT` to identify the process

### Manual Recovery
```bash
# Force cleanup if automated recovery fails
rm -f .dev-server.pid .dev-server.lock

# Check for processes manually  
lsof -ti:$PORT
kill -9 $PID_FROM_ABOVE

# Restart cleanly
npm run dev:daemon
```

## Integration with Existing Workflow

### Backward Compatibility ✓
- **`npm run dev`**: Unchanged behaviour (foreground mode)
- **Existing scripts**: Continue to work exactly as before
- **Port handling**: Inherits all existing port conflict resolution
- **Log format**: Maintains same `dev.log` output format

### Migration Path
- **No migration required**: Existing workflows continue unchanged
- **Opt-in enhancement**: Daemon mode is additional capability, not replacement
- **Gradual adoption**: Can use daemon mode for automation while keeping manual workflows

## Security Considerations

### PID File Security
- **Local scope**: PID files are workspace-local, not system-wide
- **User permissions**: Standard file permissions apply
- **No privilege escalation**: Runs with same permissions as user

### Process Management
- **Graceful termination**: Prefers SIGTERM over SIGKILL
- **Resource cleanup**: Removes temporary files on shutdown
- **No external dependencies**: Self-contained within project scope

## Future Enhancements 📋

Potential improvements identified but not yet implemented:

- **Auto-restart on crash**: Monitor daemon and restart if it crashes unexpectedly
- **Health monitoring logs**: Separate log file for daemon status changes  
- **Multiple instance support**: Allow named daemons for different purposes
- **Integration with PM2**: Optional PM2 backend for production-grade process management

## Status Indicators

- ✅ **Core daemon functionality**: Complete and tested
- ✅ **Multi-worktree isolation**: Implemented and documented
- ✅ **AI agent integration**: Ready for production use
- ✅ **Backward compatibility**: Preserved all existing behaviour
- 📋 **Advanced monitoring**: Future enhancement opportunity