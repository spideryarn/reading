# Research Potential Library Changes & Gotchas

## Objective

Identify areas of our code where someone new to the codebase might get tripped up, and determine what information we can gather, and what preparation/documentation and other improvements we can make to help them avoid these issues.

## Research Methodology

### Stage: Background Research
- Read foundational documentation:
    - `docs/reference/DOCUMENTATION_ORGANISATION.md`
    - `docs/reference/SITE_ORGANISATION.md`
    - `docs/instructions/WRITE_DEEP_DIVE_AS_DOC.md`
    - `docs/instructions/UPDATE_CLAUDE_INSTRUCTIONS.md`
    - Other relevant code and documentation

- Run `date` to get today's date/time.

### Stage: Library Research
For each library in `package.json` and `docs/reference/ARCHITECTURE_OVERVIEW.md`, research:
- **Known gotchas and common pitfalls**
- **API changes in the last 12 months** (breaking changes, deprecations, new patterns)
- **Version compatibility issues**
- **Security advisories or updates**
- **Performance considerations or changes**
- **Community-reported issues and solutions**

### Stage: Codebase Analysis
Review the codebase for:
- **Complex/unconventional patterns** that might need extra documentation
- **Unclear code sections** where intent, rationale, or usage is ambiguous
- **Cross-component interactions** with surprising or non-obvious behaviour
- **Areas lacking sufficient comments** where context would prevent mistakes
- **Potential maintenance hazards** or brittle implementations

### Stage: Ask User to Clarify Requirements
Ask the user questions if you need to, based on what you've found so far, to suggest further actions, and to shape the recommendations that you provide.

Following the user's response, do any final research needed, so that recommendations can be very concrete.

### Stage: Prioritised Recommendations
Generate actionable recommendations balancing:
- **Priority/risk assessment** of identified issues. Don't be hyperbolic, e.g. don't label something 'Critical' unless it truly is. Don't sweat the small stuff.
- **Likelihood that there will be a problem in this area, and that this documentation would help**
- **Documentation burden** vs. benefit (avoiding over-documentation)

Example recommendations (though these are just examples - use your judgment about what's valuable/relevant for the project you're working on)
- Write a deep dive doc on a particular library, emphasising how the API for it has changed in the new version
- Update the deployment script or instructions to avoid a particular gotcha
- Update the instructions for running migrations to ban potentially destructive actions (e.g. dropping all tables)
- Create a doc for adding features of a particular type, that references relevant docs/code, provides examples/snippets/patterns
- etc etc


## Execution Strategy

### Task Management and subagents
Follow instructions in `docs/instructions/TASKS_SUBAGENTS.md`. It'll be necessary to make heavy but careful use of subagents in order to avoid filling up our context window.

When delegating to subagents, provide:
- **Clear scope and objectives** for their specific research area
- **Current date context** for timeline-sensitive research
- **References to relevant documentation** they should consult
- **Specific libraries or code areas** to focus on
- **Format expectations** for their findings
- **Decision-making authority** and escalation criteria

Tell subagents to output detailed enough evidence/logging that we can retrace their steps (e.g. which urls or parts of the code their output is based on). Coordinate the findings from subagents into coherent recommendations.


### Output Format
Deliver findings as a planning document in `planning/` following the instructions in `docs/instructions/WRITE_PLANNING_DOC.md`:

1. **Planning document structure**:
   - Goal and context section explaining the research scope
   - Critical findings with risk assessment (urgent/high/medium priority)
   - Stages & actions with checkboxes for implementation tracking
   - Implementation roadmap for addressing identified issues
   - Appendix with research evidence and sources

2. **File naming**: Use format `yyMMdda_research_library_changes_gotchas.md` (or increment letter if multiple research docs on same day)

3. **Content organisation**:
   - Executive summary of key risks and recommendations
   - Library-specific findings with actionable items
   - Codebase improvement opportunities prioritised by impact
   - Reference URLs and evidence for all findings

IMPORTANT: Do not make any implementation changes yet, until authorised by the user. The planning document should only contain research findings and recommended actions.
