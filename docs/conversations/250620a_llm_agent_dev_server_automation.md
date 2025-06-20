---
Date: 20 June 2025
Duration: ~45 minutes
Type: Problem-solving, Research Review
Status: Awaiting Decision
Related Docs: scripts/dev-with-restart.sh, docs/reference/SETUP.md
---

# LLM Agent Dev Server Automation - 20 June 2025

## Context & Goals

This conversation arose from a practical need in the AI-first development workflow. The user has a multi-worktree setup where LLM agents work in one terminal whilst `npm run dev` runs in another, but wants to "take myself out of the loop" when agents need to restart the development server.

**User's Current Setup:**
> "I have AI-first coding setup with LLM agents in one terminal, npm run dev in another"

**Core Problem:**
> "User wants to 'take myself out of the loop' for dev server restarts - Goal: LLM should be able to restart dev server in background without blocking agent terminal"

The existing `scripts/dev-with-restart.sh` already handles port conflicts and restarts, but requires manual intervention when the LLM agent needs to restart the server.

## Key Background

**Multi-Worktree Environment:**
- Different ports for parallel development (3000-3006)
- Existing restart script that works well manually
- User values "minimal disruption to existing working setup"

**User Priorities:**
> "Values simplicity but open to robustness discussion"

The user is working in a complex development environment where multiple Git worktrees allow parallel development streams, each with their own port assignments to avoid conflicts.

## Main Discussion

### Research Methodology
Conducted parallel web searches on npm background processes, PID management, and automation approaches. Research focused on:
- Background process management techniques
- PID file approaches for process tracking
- Industry-standard process managers (PM2)
- Signal handling for graceful restarts
- Multi-process coordination strategies

### Technical Requirements Analysis
The solution needs to address several technical challenges:

1. **Process Management**: Enable LLM agents to start/stop/restart dev servers without blocking
2. **Status Checking**: LLM needs to verify server health beyond just PID existence
3. **Multi-Worktree Coordination**: Handle multiple simultaneous worktrees without conflicts
4. **Crash Recovery**: Determine appropriate behaviour when servers crash unexpectedly
5. **Integration**: Work with existing `scripts/dev-with-restart.sh` logic

### Key Technical Findings
Research revealed three main approaches for background process management:
- **PID Files**: Simple, widely-used approach for process tracking
- **Process Managers**: Robust solutions like PM2 with built-in monitoring and recovery
- **Signal Handling**: Enhanced scripts with crash detection and auto-recovery

## Alternatives Considered

### Option 1: Background Process with PID Management
**Approach**: Extend existing script to run in background with PID file tracking

**Pros:**
- Minimal changes to existing working setup
- Simple for LLM agents to understand and use
- Preserves existing port conflict and restart logic
- Low complexity, easy to debug

**Cons:**
- Basic process management (no built-in crash recovery)
- Manual implementation of health checking
- Limited monitoring capabilities

**Implementation Summary:**
- Modify `scripts/dev-with-restart.sh` to support background mode
- Add PID file management for process tracking
- Create simple start/stop/status commands for LLM usage
- Add basic health check mechanism (port responsiveness)

### Option 2: PM2 Process Manager
**Approach**: Use PM2 industry-standard process manager for robust service management

**Pros:**
- Robust, battle-tested process management
- Built-in crash recovery and auto-restart
- Rich monitoring and logging capabilities
- Wide ecosystem support and documentation

**Cons:**
- Additional dependency to install and maintain
- More complex configuration and setup
- Potential learning curve for troubleshooting
- May be overkill for development environment

**Implementation Summary:**
- Install PM2 as development dependency
- Create PM2 ecosystem configuration for each worktree
- Adapt existing restart logic to work with PM2
- Configure auto-restart policies and monitoring

### Option 3: Enhanced Script with Signal Handling
**Approach**: Build crash recovery and monitoring into the shell script itself

**Pros:**
- No external dependencies
- Built-in crash recovery capabilities
- Custom monitoring tailored to specific needs
- Complete control over behaviour

**Cons:**
- More complex shell scripting required
- Custom implementation may have edge cases
- Limited compared to dedicated process managers
- More maintenance burden

**Implementation Summary:**
- Add signal handling for graceful shutdowns
- Implement crash detection and auto-restart logic
- Build health monitoring into the script
- Create comprehensive logging for debugging

## Key Questions Raised

Several important questions emerged during the discussion that need user input:

### Auto-Restart Behaviour
**Question**: Should the dev server auto-restart on crash, or only restart when explicitly requested by the LLM?

**Context**: This affects complexity and system behaviour. Auto-restart provides more resilience but may mask underlying issues.

### Multi-Worktree Coordination
**Question**: How should the system handle multiple simultaneous worktrees?

**Context**: Each worktree runs on different ports, but they may share resources or have dependencies.

### Health Check Sophistication
**Question**: How should the LLM check server health beyond PID existence?

**Context**: Simple PID checking may not catch servers that are running but not responding properly.

### Complexity vs Robustness Trade-off
**Question**: What's the preference on complexity vs robustness?

**Context**: More robust solutions require more setup and maintenance but provide better reliability.

### Worktree Context Detection
**Question**: How does the LLM know which worktree it's working in?

**Context**: The LLM needs to identify the correct dev server instance to manage in multi-worktree scenarios.

## Decisions Made

No final decisions were made pending user input on the key questions above.

## My Recommendation

**Recommended Approach**: Start with Option 1 (PID Management) initially

**Rationale:**
- Preserves existing working setup with minimal changes
- Maintains simplicity while providing core functionality
- Can be enhanced later with more sophisticated features
- Aligns with user's preference for minimal disruption

**Implementation Strategy:**
1. Begin with basic PID file approach
2. Add health check mechanism (port responsiveness)
3. Integrate with existing `scripts/dev-with-restart.sh` logic
4. Provide simple LLM-friendly commands (start-bg, stop, status, restart)
5. Can evolve to more robust solutions based on experience

**Enhancement Path:**
- Monitor usage patterns and pain points
- Add crash recovery if needed
- Consider PM2 migration if robustness becomes important
- Implement more sophisticated health checking as requirements clarify

## Open Questions

1. **Auto-restart policy**: On crash, should server auto-restart or wait for explicit LLM request?
2. **Multi-worktree coordination**: How to handle resource conflicts or dependencies between worktrees?
3. **Health check depth**: What level of health checking is needed beyond PID and port responsiveness?
4. **Worktree detection**: What's the best way for LLM to identify its current worktree context?
5. **Error handling**: How should the system handle edge cases like port conflicts or permission issues?
6. **Logging strategy**: What level of logging is needed for debugging and monitoring?

## Next Steps

**Immediate Actions Needed:**
1. User decision on preferred approach (Option 1, 2, or 3)
2. User input on key questions above
3. Requirements clarification for health checking and auto-restart behaviour

**Implementation Planning:**
1. Design specific command interface for LLM agent usage
2. Plan integration with existing restart script
3. Define testing approach for multi-worktree scenarios
4. Create documentation for LLM agent usage patterns

## Sources & References

**Web Research Sources:**
- **npm background processes**: Various Stack Overflow discussions on running npm scripts in background
- **PID management techniques**: Unix/Linux process management best practices  
- **PM2 documentation**: Official PM2 process manager documentation for Node.js applications
- **Signal handling**: Shell scripting patterns for graceful process management

**Internal References:**
- `scripts/dev-with-restart.sh` - Current working dev server restart script
- `docs/reference/SETUP.md` - Development environment setup including multi-worktree configuration
- Multi-worktree port assignments: 3000-3006 for parallel development streams

**Technical Context:**
- Next.js development server management
- Multi-worktree Git development workflow
- AI-first development with LLM agents
- Port conflict resolution in development environments

## Related Work

This conversation is expected to result in:
- Enhanced development script with background process management
- Documentation for LLM agent interaction with dev server management  
- Possible updates to `docs/reference/SETUP.md` with new automation capabilities
- Testing procedures for multi-worktree dev server coordination