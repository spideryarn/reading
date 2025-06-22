# Project Management Practices

This is a guide for writing planning/project management `.md` files, e.g. `planning/yyMMdda_complex_project.md`.

These are for thinking through & documenting decisions, breaking down complex projects into multiple stages, and tracking progress.

Aim to keep these concise, but emphasise & clearly capture all the decisions, responses, and requirements from the user.

Update this doc regularly to keep the actions up-to-date. When you change it, make minimal, focused changes, based on new user input.

Make sure you have clarity with the user about edge cases, i.e. which ones we want to address, and what we think the right answer should be. If in doubt, stop and ask questions.

Ultrathink.

Use todo lists to help you keep track of everything required for generating a planning doc.

see also: `docs/instructions/WRITE_EVERGREEN_DOC.md` for instructions on writing evergreen docs


## File naming

Planning docs should follow this naming format: `yyMMdd[letter]_description_in_normal_case.md`

- Date prefix: `yyMMdd` format (e.g., `250526` for 26 May 2025)
- Auto-incrementing letter: append a letter (a, b, c...) based on creation order within the same day
  - First doc created on a given day gets `a`
  - Second doc gets `b`, and so on
  - This ensures files sort alphanumerically by creation date
  - Sometimes we might end up with multiple docs with the same day and letter (e.g. `250526a`, e.g if multiple agents were working simultaneously in separate Git worktrees) - don't worry if this happens
- Description: Use lowercase words separated by underscores
  - Exception: Keep proper capitalisation for acronyms like `ToC` (Table of Contents) or proper names, e.g. `Vercel`
  - Example: `250526a_ToC_hierarchical_summary_tooltips.md`

## Creating the doc

### Process for starting the doc from scratch:
- (Generating the filename should be done by an appropriately-instructed sub-agent)
- Use MCP or run `date +"%y%m%d"` command first to get the current date for naming the file
- Store it in `planning/`
- IMPORTANT Before writing the doc, make sure you have asked the user questions about their requirements to clarify key principles & decisions, following instructions in `docs/instructions/SOUNDING_BOARD_MODE.md`.

## Reporting a summary to the user after generating the doc

After you've created the doc, provide a summary output to the user, with info such as:
- Key assumptions/principles/decisions
- Overall stages
- Important concerns/risks you foresee if there are any
- Anything else that you think is surprising, distinctive, or important to know about this plan


## Document structure

Don't include a `Date` section at the top since it's implicit from the filename.


### Goal, context

- Clear problem/goal statement(s) at top, plus enough context/background to pick up where we left off
- If the goal is complex, break things down in detail about the desired behaviour.


### References

- Mention relevant evergreen docs (in `docs/`), other planning docs (in `planning/`), code files/functions, links, or anything else that could provide context, with a 1-sentence summary for each of what it's about/why it's relevant


### Principles, key decisions

- Include any specific principles/approaches or decisions that have been explicitly agreed with the user (over and above existing Cursor rules, project examples, best practices, etc).
- As you get new information from the user, update this doc so it's always up-to-date.
- If there are any surprises/issues, stop immediately, and discuss with the user before proceeding.


### Stages & actions

Structuring:
- Break into lots of stages. 
- List stages and actions in the order that they should be tackled
- Start with a really simple working v1, and gradually layer in complexity, ending each stage with passing tests and working code.
- Try to surface potential risks early. For example, if the whole plan rests on the library being able to do X, let's do a quick trial to make sure that works).
- Try to organise the stages so that we frontload the business value, so that we could stop partway. For example, get it working for the primary/most valuable use-case first.
- Include actions with clear acceptance criteria
- If there are actions that the user needs to do, add those in too, so we can track progress and remind the user.

Formatting:
- Don't number the stages, so that it's easier to move them around without having to renumber everything
- Use `[ ]` and `[x]` checkboxes to indicate todo/done.
- Refer to specific docs, files/functions, examples, links, etc, so it's clear exactly what needs to be done
- If there are caveats, snippets, examples, or other rich detail that won't fit in a couple of sentences, add a section in the Appendix and reference it from the action
- Explicitly say to use subagents for encapsulated work, or where it will create a lot of verbose content, e.g. checking for errors or browser console output with Puppeteer/Playwright MCP (preferring Puppeteer), doing research
- Make sure the actions are described clearly enough and with enough detail/context that someone else could implement correctly

Upfront preparatory actions:
- Run `./scripts/sync-worktrees.ts` in a subagent to make sure we've pulled the latest changes from `main` before we start (to make merge conflicts less likely).
- If this is a major piece of work, ask the user whether we should have an early action to create a `yyMMdd[letter]_complex_project` Git branch (and move over any changes). If so, then add a final action to merge that back into `main`.

Early stages:
- Add actions to search the web for research where appropriate, e.g. determining best practices, making use of 3rd-party libraries, etc

At the beginning of stages:
- Add an action to write some tests (i.e. before writing code), or to update tests with new edge cases (as we add new functionality and layer in complexity). Edge cases should have been agreed/prioritised with the user, otherwise stop to discuss them.

After creating the initial planning doc:
- **External critique stage**: Follow `docs/instructions/GATHER_DIVERSE_INPUTS_AND_CRITIQUES_ON_PLANNING_DOCS_FROM_OTHER_AI_MODELS.md` to get external AI model feedback
  - Commit the initial planning doc first (pre-critique version)
  - Run critique process and incorporate useful feedback
  - Update planning doc with critique insights and revisions
  - Commit the revised version

At the end of stage (where appropriate):
- If doing UI-related changes, add an end-of-stage action to check things look ok with Puppeteer MCP (in a subagent, provided with rich description of the background/approach to take/success criteria).
- **Add health check actions** - Use judgment to include appropriate checks based on changes made:
  - **TypeScript check** (`npm run build` or `tsc --noEmit`): Include when modifying TypeScript code, especially API routes, type definitions, or core logic
  - **Linting** (`npm run lint`): Include when adding new files or significantly modifying existing code patterns
  - **Testing** (re-run affected tests in subagent): Include when changing logic that has test coverage - see `docs/reference/TESTING_OVERVIEW.md` and `docs/reference/TESTING_SETUP.md`
  - **Build verification** (`npm run build`): Reserve for major changes or final validation - builds can be time-consuming
  - **Decision criteria**: Choose checks that are likely to catch regressions from the specific changes being made. For small isolated changes, lighter checks suffice. For core system changes, run comprehensive checks.
- Follow instructions in `docs/instructions/DEBRIEF_PROGRESS.md` to output a summary of where things stand
- Update this planning doc with progress so far, log useful learnings/surprises/changes of plan/etc.
- Add an action to stop & review with user where appropriate, e.g. when we get to a good stopping point, to manually check changes to the user interface, etc.
- Git commit (following instructions in `docs/instructions/GIT_COMMIT_CHANGES.md`, including use a subagent).

In later stages:
- Add actions to update relevant `docs/reference/*.md` evergreen docs (see `docs/instructions/WRITE_EVERGREEN_DOC.md`). If you think we need a new evergreen-doc, ask the user
- Add actions to tidy up tests (e.g. remove redundant ones, consolidate into fewer, higher-coverage, integration tests optimised for catching regressions), and any other helpful polish
- Add actions to update logging/monitoring if needed (see `docs/reference/LOGGING_BEST_PRACTICES.md`)

As final actions:
- **Final health check** - Run comprehensive validation before completion:
  - `npm run build` - Ensure TypeScript compilation succeeds and no build errors
  - `npm run lint` - Verify code quality standards are met
  - `npm test` - Confirm all tests pass (run in subagent if verbose)
  - Only include checks that are relevant to the changes made during the project
- Consolidate our tests. Consider removing low-level ones that will be brittle or that we don't need, and adding one or two high-coverage, integration tests that will catch important regressions.
- Ask the user's permission to merge back (if we created a branch)
- Move the doc to `planning/finished/` and commit.

Example stages & action (no need to include the words `TODO` or `DONE` explicitly, since the `[ ]` todo-checkboxes capture that):

```
### Stage: High-level description of this stage
- [ ] This is a top-level action
  - [ ] It can have sub-actions that get ticked off
    - You can add bulletpoint notes of up to a few sentences with extra detail/context to help plan & shape future actions
    - Or reference a later Appendix section which can contain lots more relevant detail

### ✅ This stage has already been completed
  - ✅ This action has already been completed
    - 📔 You could journal about useful/unexpected discoveries when you update progress on completed actions
  - ❌ This action has failed/been skipped
```

# Appendix

Add any other important context here, e.g.
- Summary of web searching
- Example data
- Code snippets & mentions
- Relevant tests
- Rich background, quotes, and context, especially from conversations/decisions from the user
- Alternative approaches that were considered but discarded - describe the desiderata, tradeoffs, and especially the approach we did picked and the rationale.
- Other information that should be captured but didn't fit neatly in the above sections

