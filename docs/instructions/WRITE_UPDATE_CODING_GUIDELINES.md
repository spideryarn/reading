Read:
- `docs/reference/CODING_PRINCIPLES.md`
- relevant parts of the codebase
- relevant other docs

Create or update `docs/reference/CODING_GUIDELINES.md` as appropriate. Aim to keep it concise, and avoid fluff or stating the obvious.

Run `date` to get today's date.

Search the web for best practices for any particular libraries/technologies we're using (especially if we haven't run a web search on that technology already/for a while):
- (Use a subagent with plenty of context, e.g. relevant docs, conversation so far, current/proposed technologies)
- Make sure to focus on results that are recent, relevant to the versions we have, and seem to be from authoritative/trustworthy expert sources
- Update `docs/reference/CODING_GUIDELINES.md` with useful tips, gotchas, brief rationale, urls, etc
- Each time you do this, make a note in that doc that you ran a web search on [TOPIC] on [DATE], perhaps listing any particularly useful urls, so that we'll know in future that we've already done this.

Add/update the section in `docs/reference/ARCHITECTURE_DECISIONS.md` that describes our technology stack concisely, pulling from `docs/reference/ARCHITECTURE_DECISIONS.md`, `docs/reference/SETUP_DEVELOPMENT_ENVIRONMENT.md`, etc, and make sure this is up-to-date and complete.

Make sure `docs/reference/CODING_GUIDELINES.md` is referenced in `CLAUDE.md` and any other appropriate docs (e.g.`docs/reference/CODING_PRINCIPLES.md`, `docs/reference/ARCHITECTURE_DECISIONS.md`, etc). And add very concise notes inside `CLAUDE.md` for any particularly important points.

Try and avoid redundant descriptions of the same thing in multiple places. Pick the appropriate doc to describe it fully, then signpost to that (perhaps with a very brief, contextually-relevant summary) in any other docs.

Use tasks and subagents (provided with lots of context) wherever appropriate.

Ultrathink.