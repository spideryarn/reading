# Accessing GitHub Actions Logs in Claude Code

Learn how to give Claude Code access to GitHub Actions logs for debugging CI/CD workflows and build failures.

## See also

- `docs/reference/INDEX_FOR_DOCUMENTATION.md` - Complete documentation overview
- GitHub CLI documentation - https://cli.github.com/manual/gh_run_view - Official reference for `gh` commands
- `.github/workflows/` - GitHub Actions workflow files in the repository

## Overview

When working with Claude Code, you may need to share GitHub Actions logs to debug CI/CD failures, analyze test results, or investigate build issues. There are several methods to provide this access, ranging from simple CLI commands to automated workflow permissions.

## Quick Access Methods

### Using GitHub CLI (Recommended)

The simplest way to share logs is using the `gh` command-line tool:

```bash
# View latest workflow run with logs
gh run view --log

# List recent workflow runs
gh workflow run list

# View specific run with failed job logs only
gh run view [run-id] --log-failed

# Export logs to a file for sharing
gh run view [run-id] --log > actions.log
```

### Direct GitHub UI Access

1. Navigate to the Actions tab in your repository
2. Click on the specific workflow run
3. Expand the job and step logs
4. Copy relevant sections or use the "Download log archive" option

## Automated Access Configuration

For Claude Code GitHub Actions integration, configure workflow permissions:

```yaml
permissions:
  actions: read        # Access to workflow logs
  contents: write      # Repository content access
  pull-requests: write # PR interaction capability
```

## Best Practices

- **Share specific logs**: Export only the relevant run logs rather than entire workflow histories
- **Include context**: When sharing logs, mention the workflow name, run ID, and specific failing steps
- **Sensitive data**: Review logs for secrets or sensitive information before sharing
- **Log retention**: GitHub retains logs for 90 days by default

## Common Use Cases

### Debugging Test Failures
```bash
# Get logs for a specific test job
gh run view --job [job-id] --log
```

### Analyzing Build Errors
```bash
# Focus on failed steps only
gh run view [run-id] --log-failed > build-error.log
```

### Monitoring Deployment Issues
```bash
# View deployment workflow logs
gh workflow view deploy.yml
gh run list --workflow=deploy.yml
```

## Troubleshooting

- **Permission denied**: Ensure you're authenticated with `gh auth login`
- **Run not found**: Verify the run ID and that you have repository access
- **Large log files**: Use `--log-failed` flag or grep for specific patterns
- **Rate limits**: The GitHub API has rate limits; cache logs locally when needed

## Limitations

- Logs are retained for 90 days by GitHub
- Very large logs may be truncated in the UI
- Real-time log streaming requires active workflow monitoring
- Some logs may contain ANSI color codes that need cleaning

## Status

✓ **Implemented** - GitHub CLI access methods
✓ **Implemented** - Workflow permission configuration
📋 **Planned** - Direct MCP integration for automated log fetching