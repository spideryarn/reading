# Git Commit Guidelines

## Initial Assessment

Have a look at Git diff. Batch the changes into commits, and make them one at a time.


## Commit Best Practices

### Don't ever do anything destructive

ABOVE ALL, don't do anything that could result in lost work or mess up yet-to-be-committed changes, unless EXPLICITLY instructed to by the user after warning them.


### Batching changes into commits

- Each commit should (ideally) represent a small/medium feature, or stage, or cluster of related changes (e.g. tweaking a bunch of docs).
- The codebase should (ideally) be in a working state after each commit.
- Try not to mix unrelated changes.
- Before making the commit, list all files that will be committed so the user can see when deciding whether to approve the commit.
- If it looks like progress is still ongoing and unfinished, consider committing the oldest changes (by file modification date) first.


### Commit Message Format

**Always include a reference to the planning doc filename** prominently, if we're working on one.

```
<type>: <subject> (50 chars max)

<body> (optional, wrap at 72 chars)
- "Planning doc: yyMMddx_blah.md"
- More detailed explanation
- Bullet points for multiple changes
- ...
```


Types: feat, fix, docs, style, refactor, test, chore

### Handling Concurrent Changes
Note: there may be other agents changing the code while you work.
- To minimise interference, chain the unstage/add/commit operations in one line, to make it less likely that another agent's Git changes interfere:

```bash
git reset HEAD unwanted-file && git add wanted-file && git commit -m "fix: resolve auth bug"
```


### Important Notes

- If the code is in a partial/broken state, prioritise commits that leave the codebase working
- If you encounter merge conflicts or ANY unexpected issues, stop and ask the user immediately
- When in doubt, ask the user before proceeding
- When adding files with special characters (like `[slug]`), quote the path: `git add "app/documents/[slug]/page.tsx"`


## Subagent

Do the commits with a subagent, unless there is a good reason not to. Provide the subagent with lots of context about what we've been doing that will help it to make good decisions and write a good commit message.
