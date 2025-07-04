# Update Documentation Organisation Doc

Creates or updates `docs/reference/INDEX_FOR_DOCUMENTATION.md` - a navigational guide to all project documentation.

## See also

- `gjdutils/docs/INDEX_FOR_DOCUMENTATION.md` - Example from gjdutils project
- `docs/instructions/UPDATE_INDEX_FOR_DOCUMENTATION.md` - Run this first for content review
- `docs/instructions/WRITE_EVERGREEN_DOC.md` - Structure guidelines

## Task

Create/update the documentation organisation guide with sensible categories and clear starting points for newcomers.

**Run after housekeeping**: This should be done after `UPDATE_INDEX_FOR_DOCUMENTATION.md` to ensure structural changes reflect current content.

## Content Requirements

1. **Use your judgement** to organise docs into sensible categories (don't move files, just categorise in the guide)
2. **Highlight key starting points** for newcomers and different personas
3. **Cover all significant docs** in `docs/reference/`, `docs/instructions/`, plus `README.md`, `CLAUDE.md`, and `docs/planning/` structure

## Process

1. **Discover**: Use Glob to find all documentation files
2. **Categorise**: Create logical groupings based on gjdutils example and codebase needs
3. **Describe**: 1-2 sentences per doc, mark important/starter docs clearly

## Focus

**This task**: Documentation discovery, categorisation, and navigation structure
**Housekeeping**: Content accuracy, cross-references, implementation status

**Sequence**: Run housekeeping first to ensure content is current, then update organisation guide to reflect any structural changes.
