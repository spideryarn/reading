Perform a technical audit/review.

- If there's a relevant planning doc, check whether recent changes (e.g. recent related Git commits, and also uncommitted changes) implement the planning doc correctly.
- Look for bugs, gotchas, potential problems
- Zoom out to consider whether the overall strategy/approach is sound, or could be improved.

For background, read:
- `docs/reference/CODING_PRINCIPLES.md`
- `docs/reference/CODING_GUIDELINES.md`
- `docs/instructions/WRITE_EVERGREEN_DOC.md` – conventions for evergreen documentation like this file.
- `docs/instructions/WRITE_PLANNING_DOC.md` – how to record stage-based action plans (used by the 
- and any other relevant docs

If a feature/area/question/file have been suggested, start by scanning & investigating that area.

Start by reading relevant code & docs for the feature/area that .



## Audit Workflow
1. **Scan** the target area (component, API route, service) for non-determinism, silent failures, and coupling.
2. **Record findings** in the relevant planning doc under a new appendix section (prefix with "(Discuss with the user …)"). Make sure you provide enough detail for someone else to successfully implement
3. **Prioritise** findings into stages (A, B, C…) with task lists following `WRITE_PLANNING_DOC.md`.
4. **Implement** each stage sequentially, ensuring tests pass after every stage. Commit with messages per `docs/instructions/GIT_COMMIT_CHANGES.md`.
5. **Update documentation** – if a pattern is generally useful, refine this evergreen doc.

## Maintenance
Review this doc quarterly or whenever we notice repeated architectural hygiene issues. Keep examples current and cross-references valid. 