This repo is about the Spideryarn reading app. But this task is about `gjdutils`, and sharing some of the techniques we're using here for AI-assisted programming.

Within it, we have cloned `gjdutils/` from https://github.com/gregdetre/gjdutils - this is my open source repository of useful scripts, snippets, and LLM prompts.

Every so often I would like to take a look at `docs/instructions/*.md` and `scripts/`, and examine whether there are any docs or scripts in there that could usefully be ported over to `gjdutils/` to be shared with the wider world.

I am actively improving & adding to `docs/instructions/` and `scripts/` as I develop Spideryarn Reading, and so I would like to occasionally update `gjdutils/` to include these improvements. The tricky part is that while some of the docs and scripts in this app are generic and could be of widespread utility (copied, perhaps with light modification), some are specific to this app, and it wouldn't make sense to include them in the more general-purpose `gjdutils/`.

Use a subagent to gather information & compare what's in both `docs/instructions/` folders and examine `scripts/`, and then make a proposal for:
- **Documentation** that exist in both that we should compare, and see if there are any improvements from one to port/update in the other (probably from this app -> gjdutils, but perhaps occasionally vice versa), e.g. `docs/instructions/WRITE_PLANNING_DOC.md` also exists as an older version as `gjdutils/docs/instructions/WRITE_PLANNING_DOC.md`.
- **Documentation** that only exist in `docs/instructions/` and should be added to `gjdutils/docs/instructions/` (or perhaps even vice versa).
- **Documentation** that should be renamed in `gjdutils/docs/instructions/` (because there's a better name in `docs/instructions/`).
- **Documentation** that should be removed (though probably there should be a good reason for this, e.g. there are duplicates, or we agree the doc is bad/out of date in some clear way).
- **Scripts** in `scripts/` that should be ported to `gjdutils/src/ts/` as general-purpose TypeScript utilities.
- **Scripts** that are too project-specific and should not be ported.
- Include this `docs/instructions/PORT_DOCS_TO_GJDUTILS.md` as an example of one we should port (so that other projects can also port their docs to become general/shareable)

When porting from this app -> gjdutils:

**For Documentation:**
- Remove/generalise any references that are specific to this app.
- De-emphasise terminology that's specific to Claude Code (e.g. `ultrathink` -> `think hard`, `subagents` -> `subagents/AI assistants if available`). This could vary case-by-case, so let's discuss.
- Many of the most relevant docs will be commands (e.g. `WRITE_PLANNING_DOCS`, `DEBRIEF_PROGRESS.md`) or modes (e.g. `SOUNDING_BOARD_MODE.md`), etc.

**For Scripts:**
- Port to TypeScript and place in `gjdutils/src/ts/` with appropriate subdirectories (`cli/`, `scripts/`, `critique/`)
- Remove project-specific imports and dependencies (Spideryarn prompt templates, model configs, etc.)
- Make all configuration options explicit and configurable via command line arguments
- Create standalone versions that work without project-specific infrastructure
- Add comprehensive documentation with usage examples
- Include a header comment explaining what changes were made from the original
- Examples of good candidates:
  - `generate-sequential-datetime-prefix.ts` → generic date prefix generator
  - `extract-claude-conversation.ts` → generic LLM conversation extractor
  - `sync-worktrees.ts` → generic Git worktree sync tool
  - `count_lines.sh` → generic code line counter (convert to TypeScript)
- Examples that might be too specific:
  - Scripts with heavy dependencies on project-specific database schemas
  - Scripts tightly coupled to Spideryarn's authentication system
  - Scripts that only work with specific project directory structures

Once agreed, use tasks and subagents (provided with rich context) to make the updates.
