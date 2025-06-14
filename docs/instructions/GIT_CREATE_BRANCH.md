If the user hasn't provided info about what the branch will be for, stop and ask them.

Decide on a short phrase, based on the task defined by the user, as the branch name, e.g. `refactor_blah_for_foo`

Run this in a subagent:
- Check that we're either on `main` or a branch name starting with `worktree`, e.g. `worktree1` - if not, double-check with the user before continuing.
- Run `date` and prepend today's date as `yyMMdd_` to the short-phrase branch-name
- Then create that as a new branch
