- Rename or move a file or files as per the user's explicit instructions. 
  - If asked to propose/discuss, then don't make changes until they have been agreed with the user.
  - If things are confusing, or you see potential problems, or have a better idea, then you should ask questions, raise concerns, make suggestions, etc.

- If there are multiple files, use tasks and subagents (provided with rich context) to:
  - Do the rename/move
    - Prefer to use `git mv` rather than `mv`, where appropriate. Or if there is a special tool for doing the move (e.g. a syntactically-aware refactoring tool, use that)
  - Search carefully for all the places that refer to each file, and update them appropriately.
    - Be careful not to break/disrupt functionality.

- IMPORTANT: If in doubt, or you notice any issues/surprises/complications stop and ask.

- Once you have finished, commit these changes as a single commit, following `docs/GIT_COMMITS.md`