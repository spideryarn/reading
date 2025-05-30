# Updating Claude Instructions

Guidelines for maintaining CLAUDE.md to help AI agents operate effectively on the Spideryarn Reading codebase.

## See also

- `CLAUDE.md` - The main instructions file for AI agents
- `docs/WRITING_EVERGREEN_DOCS.md` - General documentation writing guidelines
- `docs/UPDATE_HOUSEKEEPING_DOCUMENTATION.md` - Documentation maintenance process (includes updating CLAUDE.md)

## Purpose of CLAUDE.md

CLAUDE.md serves as the primary orientation document for AI agents working on this codebase. It should provide essential context and signposts without duplicating information that exists elsewhere in the documentation.

## What to Include in CLAUDE.md

### Essential Project Context
- **Project overview** - Brief description of goals and current phase
- **Architecture summary** - Key framework and storage decisions
- **Build commands** - How to run, test, and debug the application
- **Project structure** - Where to find different types of code/docs

### Debugging and Development Aids
- **Type checking** - `npm run build` for TypeScript errors
- **Linting** - `npm run lint` for code quality issues  
- **Testing** - `npm test` and coverage commands
- **Log files** - Location of development logs (`dev.log`)
- **Test locations** - Where to find existing tests
- **Database info** - Migration files and schema documentation

### Navigation Signposts
- **Architecture docs** - Link to `docs/ARCHITECTURE.md` for detailed decisions
- **Planning docs** - Point to `planning/*.md` for recent decisions
- **Specific domains** - Database, prompts, UI components documentation

### Operational Guidelines
- **Git practices** - Reference to `docs/GIT_COMMITS.md`
- **Code style** - British spelling, existing patterns
- **Environment setup** - Key variables and configuration

## What NOT to Include

- **Detailed instructions** - These belong in specific domain docs
- **Code examples** - Link to actual implementation files instead
- **Duplicate information** - Always reference canonical source
- **Step-by-step tutorials** - These belong in `docs/SETUP.md`

## Maintenance Principles

### Conciseness
Keep CLAUDE.md focused and scannable. Each section should be 3-5 bullet points maximum. Use signposting rather than explanation.

### Signposting Over Duplication
Instead of explaining how something works, point to where the information lives:
- "Database schema: `supabase/migrations/` and `docs/DATABASE_SCHEMA.md`"
- "Testing: Jest setup in `jest.config.js`, tests in `src/lib/*/tests/`"

### Current State Focus
Document what exists now, not what's planned. Use status indicators (✓ implemented, 📋 planned) when helpful.

### User-Driven Updates
Update CLAUDE.md based on:
- **User feedback** - What agents needed but couldn't find
- **Common pain points** - Debugging paths that weren't obvious
- **New major features** - Changes to build process, architecture
- **Structural changes** - New documentation, moved files

## Review Triggers

Update CLAUDE.md when:
- AI agents struggle to find essential information
- Major architectural changes occur
- New debugging tools or processes are added
- Project structure changes significantly
- User identifies missing signposts during development

## Quality Checklist

Before updating CLAUDE.md:
- [ ] Information is essential for AI agent effectiveness
- [ ] No duplication of content available elsewhere
- [ ] All links and references are valid
- [ ] Debugging paths are clear and actionable
- [ ] Structure remains scannable and concise
- [ ] Cross-references point to canonical sources