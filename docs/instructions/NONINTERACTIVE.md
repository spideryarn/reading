# Non-Interactive Claude Code Usage

Non-interactive mode (`claude -p`) allows Claude to execute tasks without human intervention.


## See Also

- `docs/instructions/WRITE_PLANNING_DOC.md` - Creating structured task documents
- `docs/instructions/GIT_COMMIT_CHANGES.md` - Git workflow practices
- `docs/reference/CODING_PRINCIPLES.md` - Development principles
- `planning/` - Example planning documents


## Tool Access Philosophy

**Non-interactive Claude cannot:**
- Run the application (no access to `npm run dev`, browsers, or live servers)
- Execute tests interactively (no access to test runners that require interaction)
- Access MCP tools (Puppeteer/Playwright browser automation, Supabase queries)
- Commit changes to git (this should be handled externally)
- Access running development servers or databases

**Non-interactive Claude can:**
- Read, write, and edit files
- Perform static analysis of code
- Search and research via web
- Use basic bash commands for file operations
- Generate and modify documentation
- Analyse project structure and dependencies


## Basic Usage

### Simple Command
```bash
claude -p "your task description" \
  --allowedTools "Bash Edit MultiEdit Read Write Glob Grep LS Task WebFetch WebSearch TodoRead TodoWrite" \
  --output-format stream-json
```

### Using the Wrapper Script

see `scripts/claude-batch.sh`


## Planning Document Integration

Non-interactive mode works best with well-structured planning documents (see `docs/instructions/WRITE_PLANNING_DOC.md`). Feed Claude the entire planning document content:

```bash
./scripts/claude-batch.sh "$(cat planning/250529a_your_task.md)"
```

This approach:
- Provides complete context upfront
- Reduces need for clarifying questions
- Enables autonomous task execution
- Works well with parallel execution

## GitHub Actions Integration

### Environment Setup
```yaml
name: AI-Assisted Development
on:
  workflow_dispatch:
    inputs:
      task_description:
        description: 'Task for Claude to execute'
        required: true

jobs:
  claude-task:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install Claude Code
        run: npm install -g @anthropic-ai/claude-code
      - name: Run Claude Task
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          claude -p "${{ github.event.inputs.task_description }}" \
            --allowedTools "Edit MultiEdit Read Write Glob Grep LS Task WebFetch WebSearch" \
            --output-format stream-json
```


## Tool Configuration

### Recommended Tool Set
- **Core file operations**: `Edit MultiEdit Read Write`
- **Search and discovery**: `Glob Grep LS`
- **Research and analysis**: `WebFetch WebSearch`
- **Task management**: `TodoRead TodoWrite`
- **Basic system operations**: `Bash` (limited to file operations)
- **Subtask delegation**: `Task`

### Security Considerations
- Use specific tool allowlists rather than `--dangerously-skip-permissions`
- Limit Bash access to safe operations
- Run in isolated environments for untrusted tasks
- Store API keys securely in CI environments

## Error Handling

Non-interactive mode requires robust error handling since Claude cannot ask for clarification:

### In Task Descriptions
```markdown
# Task: Refactor authentication system

## Error Handling
- If TypeScript errors occur, document them in /tmp/issues.md
- If tests would be needed, create them but note they cannot be run
- If unclear about implementation details, make reasonable assumptions and document them

## Constraints  
- Cannot run application or tests
- Cannot commit changes
- Must work with existing code patterns
```

### In Wrapper Scripts
```bash
claude-batch() {
    # ... setup ...
    
    if ! claude -p "$prompt" --allowedTools "$tools" --output-format stream-json; then
        echo "Claude task failed. Check output above for details."
        return 1
    fi
}
```

## Best Practices

1. **Provide complete context** in planning documents
2. **Specify constraints clearly** (no testing, no commits, etc.)
3. **Use structured output** for automation parsing
4. **Handle failures gracefully** in CI environments
5. **Limit scope** to tasks that don't require runtime verification
6. **Document assumptions** when requirements are ambiguous

## Unresolved Questions

### Git & branch Management
- Should it be able to make its own Git commits?
- Should the wrapper script automatically create branches for each task?
- How should branch naming be standardised for parallel execution?
- Should cleanup of completed branches be automated?

### Output Format
- Is `stream-json` the best format for CI integration?
- Should results be structured differently for different use cases?
- How should partial results be handled if Claude is interrupted?

### Task Scope
- Should there be timeout limits for long-running tasks?

### Error Recovery
- How should the system handle partial completions?
- Should failed tasks be automatically retried with modified parameters?
- What level of rollback capability is needed?


