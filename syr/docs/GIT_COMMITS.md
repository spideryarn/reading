# Git Commit Guidelines

## Initial Assessment
Have a look at Git diff. Think about how to batch the changes into commits following atomic commit principles.
- If you have been instructed to make the commits, then do so, one at a time.
- If not, then just suggest what the batches would be.

## Commit Best Practices

### Atomic Commits
- Each commit should represent ONE logical change
- The codebase should be in a working state after each commit
- Don't mix unrelated changes (e.g. feature + formatting fixes)

### Commit Message Format
```
<type>: <subject> (50 chars max)

<body> (optional, wrap at 72 chars)
- More detailed explanation
- Bullet points for multiple changes
```

Types: feat, fix, docs, style, refactor, test, chore

### Handling Concurrent Changes
Note: there may be other agents changing the code while you work.
- To minimise interference, chain the unstage/add/commit operations:
  ```bash
  git reset HEAD unwanted-file && git add wanted-file && git commit -m "fix: resolve auth bug"
  ```
- This reduces the window where another agent's changes could interfere

### Important Notes
- If the code is in a partial/broken state, prioritise commits that leave the codebase working
- If you encounter merge conflicts or ANY unexpected issues, stop and ask the user immediately
- When in doubt, ask the user before proceeding
- When adding files with special characters (like `[slug]`), quote the path: `git add "app/documents/[slug]/page.tsx"`