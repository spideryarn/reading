# Coding principles

see also:
- `docs/reference/CODING_GUIDELINES.md` - Specific code quality standards and patterns
- `docs/reference/ARCHITECTURE_DECISIONS.md` - Technical architecture decisions
- `docs/reference/TESTING_OVERVIEW.md` - Testing approach and patterns

- Prioritise code that's simple, easy-to-understand, clean, debuggable, and readable.
- This is early-stage development with AI-first methods. We want to develop fast and experiment using AI agents, so we can figure out which features are most valuable. The comprehensive documentation, typing, and testing infrastructure exists to support AI productivity and prevent regressions.
- Fix the root cause rather than putting on a bandaid. Avoid fallbacks & defaults - better to fail if input assumptions aren't being met. In general, look for minimal, clean, general, robust, minimal-gotchas, root-cause fixes.
- **Never implement silent data modifications**: No truncation, silent filtering, or quiet data transformations without explicit user consent. If data doesn't fit constraints, fail clearly with a descriptive error rather than modifying it silently.
- **Always err on the side of caution**: Be especially careful about any operations that could affect databases, production systems, or user data. When in doubt, ask for explicit permission first.
- Be cautious about irreversible changes, e.g. deleting files, dropping/truncating tables, throwing away data, running database migrations, etc.
- If you hit any nasty surprises, stop & discuss immediately with the user.
- Raise errors early, clearly & fatally. Prefer not to wrap in try/except so that our tracebacks are obvious.
  - Database services propagate errors instead of silently returning null
  - API routes can catch and map to appropriate HTTP responses
  - "Not found" is a valid state, not an error (return null, don't throw)
- **Fail fatally & immediately with clear, debuggable, user-visible error messages.** When errors or unforeseen situations occur, don't mask problems - expose them clearly for debugging and user understanding. Better to fail fast than fail silently. Make error messages actionable and informative.
- Don't try and write a full, final version immediately. Get a simple version working end-to-end first, and then gradually layer in complexity in stages.
- Follow software engineering best practices, e.g.
  - reuse code/machinery where it makes sense to do so
  - pull out core reusable functionality into utility functions
  - break long/complex functions down
- Write code that's easy to test, i.e. prefer functional. Avoid object-oriented unless it's a particularly good fit.
- Aim to keep changes minimal, and focused on the task at hand. Don't fix unrelated issues you notice unless they're directly blocking your current task - flag concerning issues for discussion instead.
- Try to keep things concise, don't over-engineer.
- Remember YAGNI - but at the same time, it can be useful to understand the overall vision for the product, because that may inform the current design/architecture decisions.
- If tests are failing, try and understand why. If they're failing for systemic reasons, we should discuss how to fix that. Be wary about removing/modifying the tests just to make them pass. If in doubt, stop & discuss with the user.
- Keep documentation etc up-to-date as you go.
- When picking 3rd-party libraries, prefer ones with large communities (so there will be lots of pretraining data for LLMs).
- If you notice other things that should be changed/updated, ask/suggest to the user.
- If things don't make sense or seem like a bad idea, ask questions or discuss rather than just going a- long with it. Be a good collaborator, and help me make good decisions, rather than just obeying blindly.
- Eventually we'll need to be a bit more careful about security & privacy. But to begin with while prototyping, we'll want to be quick-and-dirty. Flag concerns as they come up, and let the user decide.
- Look for 80-20 solutions, but we're optimising for long-term AI-first development speed, so that eventually we can build rich features robustly and quickly.

