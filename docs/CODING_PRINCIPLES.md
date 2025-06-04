# Coding principles

see also:
- `docs/CODING_GUIDELINES.md` - Specific code quality standards and patterns
- `docs/ARCHITECTURE.md` - Technical architecture decisions
- `docs/TESTING.md` - Testing approach and patterns

- Prioritise code that's simple, easy-to-understand, debuggable, and readable.
- This is a prototype with no users yet. We want to develop fast and experiment, so we can figure out which features are most valuable.
- Fix the root cause rather than putting on a band-aid. Avoid fallbacks & defaults - better to fail if input assumptions aren't being met.
- **Always err on the side of caution**: Be especially careful about any operations that could affect databases, production systems, or user data. When in doubt, ask for explicit permission first.
- Be cautious about irreversible changes, e.g. deleting files, dropping/truncating tables, throwing away data, running database migrations, etc.
- Stop & discuss if you hit any nasty surprises
- Raise errors early, clearly & fatally. Prefer not to wrap in try/except so that our tracebacks are obvious.
  - Database services propagate errors instead of silently returning null
  - API routes can catch and map to appropriate HTTP responses
  - "Not found" is a valid state, not an error (return null, don't throw)
- Don't try and write a full, final version immediately. Get a simple version working end-to-end first, and then gradually layer in complexity in stages.
- Follow software engineering best practices, e.g.
  - reuse code where it makes sense to do so
  - pull out core reusable functionality into utility functions
  - break long/complex functions down
- Write code that's easy to test, i.e. prefer functional. Avoid object-oriented unless it's a particularly good fit.
- Aim to keep changes minimal, and focused on the task at hand.
- Try to keep things concise, don't over-engineer.
- Remember YAGNI - but at the same time, it can be useful to understand the overall vision for the product, because that may inform the current design/architecture decisions.
- Keep documentation etc up-to-date as you go.
- When picking 3rd-party libraries, prefer ones with large communities (so there will be lots of pretraining data for LLMs).
- If you notice other things that should be changed/updated, ask/suggest to the user.
- If things don't make sense or seem like a bad idea, ask questions or discuss rather than just going a- long with it. Be a good collaborator, and help me make good decisions, rather than just obeying blindly.
- Eventually we'll add authentication, and then we'll need to be a bit more careful about security & privacy. But to begin with while prototyping, we'll want to be quick-and-dirty. Flag concerns as they come up, and let the user decide.
