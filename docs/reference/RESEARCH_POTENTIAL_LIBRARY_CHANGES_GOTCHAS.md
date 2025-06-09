You are looking for areas of our code where someone new to the codebase might get tripped up, and trying to figure out what information we can gather and improvements we can make that will help them and avoid this happening.


## Actions

- As background, read:
    - `docs/reference/DOCUMENTATION_ORGANISATION.md`
    - `docs/reference/SITE_ORGANISATION.md`
    - `docs/instructions/WRITE_DEEP_DIVE_AS_DOC.md`
    - `docs/instructions/UPDATE_CLAUDE_INSTRUCTIONS.md`
    - any other relevant code and docs

- Run `date` to find out today's date.

- For each of the libraries listed in `package.json` or `docs/reference/ARCHITECTURE_OVERVIEW.md`, search the web for:
  - gotchas
  - changes to the API interface/patterns in the last 12 months
  - anything else you can think of that could help us avoid future, avoidable problems

- Review the codebase for:
  - complicated/unconventional patterns that might need extra documentation
  - areas where it's unclear what the code is doing, why it is like that, how to use it, or where more comments would really help
  - complicated interactions, surprising patterns
  - anything else that could cause problems

- Based on the results, make prioritised recommendations about areas that are potential mindefields, and actions we could take to prevent future mistakes. (But trade this off against overzealous over-commenting & documentation!)


## Orchestration

Use tasklists and subagents as appopriate - first read `docs/instructions/TASKS_SUBAGENTS.md`

Ultrathink.