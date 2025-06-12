# Update Housekeeping Documentation

This document describes the process for keeping project documentation up-to-date as the codebase evolves. Documentation housekeeping should be performed regularly to ensure accuracy and prevent confusion.

## See also

- `docs/reference/DOCUMENTATION_ORGANISATION.md` - Comprehensive guide to all project documentation organisation and navigation
- `docs/instructions/UPDATE_DOCUMENTATION_ORGANISATION_DOC.md` - Run after this process to update documentation organisation guide
- `docs/instructions/WRITE_EVERGREEN_DOC.md` - Guidelines for writing evergreen documentation
- `docs/instructions/WRITE_PLANNING_DOC.md` - Guidelines for ephemeral planning documents
- `docs/instructions/UPDATE_CLAUDE_INSTRUCTIONS.md` - Maintaining CLAUDE.md as part of housekeeping
- `docs/instructions/DO_GIT_COMMITS.md` - How to commit documentation updates

## When to Update Documentation

Perform documentation housekeeping:
- After implementing major features
- When architectural decisions change
- When you notice outdated information while working
- As a periodic maintenance task (e.g., weekly/monthly)
- Before major releases or milestones

## Process Overview

### Step 1: Comprehensive Review

Read all key documentation to understand the current state:
1. `README.md` - Project overview and goals
2. `docs/reference/DOCUMENTATION_ORGANISATION.md` - Documentation structure and navigation guide
3. `docs/reference/*.md` and `docs/instructions/*.md` - All evergreen documentation
4. Recent `planning/*.md` - Latest decisions and changes
5. Key code files and API routes
6. Configuration files and migrations

Use subagents where appropriate to maintain context window efficiency.

### Step 2: Identify potential improvements

Look for:
- **Feature Status Mismatches** - Documentation says "not implemented" but code exists
- **Architectural Drift** - Documentation describes old approaches superseded by new decisions
- **Missing High-level Docs** - Missing high-level/overview evergreen/reference documentation, e.g. README, SETUP, ARCHITECTURE, PRODUCT VISION, CODING_PRINCIPLES/GUIDELINES, SITE_ORGANISATION.md, TESTING, UI_INTERFACE and/or STYLING/DESIGN/CSS, etc. These are just examples - use your judgment about which high-level docs would be most relevant to this particular codebase.
- **Missing Features** - New functionality not documented
- **Broken Cross-References** - Links to renamed/removed files
- **Duplicate Information** - Same content in multiple places (consolidate to one location)
- **Incomplete Sections** - Placeholder or stub documentation
- **Not that useful** - Information that isn't very relevant or adding much. Either remove or make it more concise
- **No longer useful** - Information that may have been useful in the past, but is out-of-date or no longer so useful. Either remove, make it more concise, or move into an Appendix as a historical record (if you think it still has some value as background)

Follow these principles:
1. **Single Source of Truth** - Information should exist in one canonical location
2. **Cross-Reference** - Link to canonical docs rather than duplicating content
3. **Transitional States** - Document both current and target states during migrations
4. **Clear Status** - Mark features/approaches as current, deprecated, or planned

### Step 3: Make prioritised suggestions

Discuss proposed changes to the user, usually grouped by priority (most important/valuable/problematic first).

Agree a plan with the user, and execute it, defaulting to highest-priority first.

- Use tasks and subagents, following instructions in `docs/instructions/TASKS_SUBAGENTS.md`

- Commit in batches (following `docs/instructions/DO_GIT_COMMITS.md`), using subagents.


### Step 4: Review

Review where we are, and consider whether there's anything remaining, or any other gaps/improvements we're now noticing.


### Step 5: Late-stage housekeeping steps

After completing the main documentation updates:

1. **Update documentation organisation guide**: Run `docs/instructions/UPDATE_DOCUMENTATION_ORGANISATION_DOC.md` to ensure the documentation organisation guide reflects any structural changes made during housekeeping.

2. **Update CLAUDE.md if needed**: Run `docs/instructions/UPDATE_CLAUDE_INSTRUCTIONS.md` if changes affect essential AI agent context:
   - New build commands or debugging tools
   - Architectural changes affecting project structure
   - New documentation requiring signposts

#### Common Update Patterns

**Feature Implementation Status**
```markdown
# Before
**Missing Features**
- AI integration not yet implemented
- Summaries not built

# After  
**Implemented Features**
- AI integration with Claude Sonnet 4 ✓
- Hierarchical summaries with hover tooltips ✓

**Planned Features**
- Document upload functionality
- User authentication
```

**Architectural Changes**
```markdown
# Add transitional documentation
**Current State**: Code uses decomposed element storage
**Target State**: Single-row document storage (see ARCHITECTURE_DECISIONS.md)
**Migration Status**: Schema exists, code needs updating
```

**Cross-References**
```markdown
# Instead of duplicating prompt template info
see `docs/reference/LLM_PROMPT_TEMPLATES.md` for prompt template architecture
```
### Step 6: Suggest a commit to the user (following `docs/instructions/DO_GIT_COMMITS.md`)


## Documentation Quality Checklist

Before committing, ensure:
- [ ] No contradictions between documents
- [ ] Status accurately reflects implementation
- [ ] Cross-references are valid
- [ ] Transitional states are clearly marked
- [ ] "See also" sections are comprehensive
- [ ] Examples match current code patterns
- [ ] Technical details are accurate
- [ ] Documentation organisation guide (`docs/reference/DOCUMENTATION_ORGANISATION.md`) reflects any structural changes

## Common Pitfalls

1. **Over-updating** - Don't change accurate historical records in planning docs
2. **Under-referencing** - Always add "see also" links for related topics
3. **Duplication** - Resist copying content; link to canonical source
4. **Vague Status** - Be specific about what's implemented vs planned


## Typos and tightening

If you notice typos, fix them.

If you notice places where the doc could be a bit more concise, or more tightly worded, without changing the meaning, then make the changes.

If you notice ways in which you think the doc should be improved, which *would* change the meaning, discuss them with the user. Don't make changes that will change the meaning without explicit permission.


