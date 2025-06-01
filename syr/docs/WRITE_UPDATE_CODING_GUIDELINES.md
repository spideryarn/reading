Read:
- `docs/CODING_PRINCIPLES.md`
- relevant parts of the codebase
- relevant other docs

Create or update docs/CODING_GUIDELINES.md as appropriate. Aim to keep it concise, and avoid fluff or stating the obvious.

Run `date` to get today's date.

Search the web for best practices for any particular libraries/technologies we're using:
- Make sure to focus on results that are recent, relevant to the versions we have, and seem to be from authoritative/trustworthy expert sources
- Use a subagent with plenty of context about our stack
- Update the doc with useful tips
- Each time you do this, make a note somewhere that you ran a web search on [TOPIC] on [DATE], perhaps listing any particularly useful urls, so that we'll know in future that we've already done this.

Add/update the section in `docs/ARCHITECTURE.md` that describes our technology stack concisely, pulling from `docs/ARCHITECTURE.md`, `docs/SETUP.md`, etc, and make sure this is up-to-date and complete.

Make sure `docs/CODING_GUIDELINES.md` is referenced in `CLAUDE.md` and any other appropriate docs (e.g.`CODING_PRINCIPLES.md`, `docs/ARCHITECTURE.md`, etc). And add very concise notes inside CLAUDE.md for any particularly important points.

Try and avoid redundant descriptions of the same thing in multiple places. Pick the appropriate doc to describe it fully, then signpost to that (perhaps with a very brief, contextually-relevant summary) in any other docs.

Use tasks and subagents (provided with lots of context) wherever appropriate.

Ultrathink.