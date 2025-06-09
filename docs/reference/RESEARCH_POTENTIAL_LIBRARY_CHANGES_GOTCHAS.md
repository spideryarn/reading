# Research Potential Library Changes & Gotchas

## Objective

Identify areas of our code where someone new to the codebase might get tripped up, and determine what information we can gather, and what preparation/documentation and other improvements we can make to help them avoid these issues.

## Research Methodology

### Phase 1: Background Research
- Read foundational documentation:
    - `docs/reference/DOCUMENTATION_ORGANISATION.md`
    - `docs/reference/SITE_ORGANISATION.md`
    - `docs/instructions/WRITE_DEEP_DIVE_AS_DOC.md`
    - `docs/instructions/UPDATE_CLAUDE_INSTRUCTIONS.md`
    - Other relevant code and documentation

- Run `date` to get today's date/time.

### Phase 2: Library Research
For each library in `package.json` and `docs/reference/ARCHITECTURE_OVERVIEW.md`, research:
- **Known gotchas and common pitfalls**
- **API changes in the last 12 months** (breaking changes, deprecations, new patterns)
- **Version compatibility issues**
- **Security advisories or updates**
- **Performance considerations or changes**
- **Community-reported issues and solutions**

### Phase 3: Codebase Analysis
Review the codebase for:
- **Complex/unconventional patterns** that might need extra documentation
- **Unclear code sections** where intent, rationale, or usage is ambiguous
- **Cross-component interactions** with surprising or non-obvious behaviour
- **Areas lacking sufficient comments** where context would prevent mistakes
- **Potential maintenance hazards** or brittle implementations

### Phase 4: Prioritised Recommendations
Generate actionable recommendations balancing:
- **Risk assessment** of identified issues
- **Impact on new developers** joining the codebase
- **Documentation burden** vs. benefit (avoiding over-documentation)
- **Immediate vs. future concerns**


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
Deliver findings as:
1. **Executive summary** of key risks and recommendations
2. **Library-specific findings** with actionable items
3. **Codebase improvement opportunities** prioritised by impact
4. **Implementation roadmap** for addressing identified issues


IMPORTANT: Do not make any changes yet, until authorised by the user.


