# Documentation organsation

## References

- `README.md`
- `docs/SITE_ORGANISATION.md`


## Evergreen documentation Reference

(Written based on `docs/WRITING_EVERGREEN_DOCS.md`)

Available evergreen documentation in `docs/` - here are some of the most useful.

Coding & infrastructure:
- `docs/CODING_PRINCIPLES.md` - Outlines development principles prioritising simplicity, readability, debugging, and rapid prototyping for early-stage development
- `docs/ARCHITECTURE.md` - Contains high-level architectural decisions including framework choices, data structures, storage approach, and MVP features
- `docs/STYLING.md` - CSS and visual styling configuration including theme settings, Phosphor icons usage, and loading/error button patterns
- `docs/SETUP.md` - Development environment setup guide including Node.js, Supabase, Git worktree configuration, and common commands
- `docs/SITE_ORGANISATION.md` - Documents the hierarchical, document-centric architecture including application routes, component hierarchy, and navigation patterns. (May be out of date)
- `docs/TESTING.md` - Testing approach documentation covering Jest with React Testing Library setup, test structure, and current test coverage
- `docs/UI_INTERFACE.md` - Documents the multi-pane layout with tabbed navigation including four-pane structure, tab system architecture, and scrolling fixes. See related docs below in "AI, features, machinery, interface" section.

Database:
- `docs/DATABASE_OVERVIEW.md`
- `docs/DATABASE_MIGRATIONS.md` - Guide for managing database schema changes through Supabase migrations with timestamped SQL files
- `docs/DATABASE_SCHEMA.md` - Reference for both current (deprecated) schema and target schema showing the transition from element decomposition to single-row storage (VERY MUCH EVOLVING)

AI, features, machinery, interface:
- `docs/CHATBOT_ASSISTANT_UI_INTEGRATION.md` - Comprehensive technical guide for integrating the @assistant-ui/react library into the chatbot interface within the Tools pane
- `docs/LLM_PROMPT_TEMPLATES.md` - Guide for creating AI/LLM calls using the Nunjucks + Zod template system with type safety and validation
- `docs/MUTATIONS.md` - Documents the reversible document transformation system for applying/reverting changes like AI-generated headings and content filtering
- `docs/TABLE_OF_CONTENTS_PANE.md` - Architecture and features of the enhanced ToC system with tabbed interface, AI-generated headings, and tooltip summaries
- `docs/AI_GLOSSARY.md` - Documents the glossary feature that extracts key entities from documents using LLM analysis and displays them in a dedicated pane
- `docs/AI_SUMMARISE.md` - Documents the AI summarise feature that generates hierarchical summaries of document content using LLM analysis at multiple granularity levels

Docs, modes, and admin:
- `docs/GIT_COMMITS.md` - Guidelines for Git commit best practices including batching changes, message format, and handling concurrent changes
- `docs/PROJECT_STATUS.md` - Current development state overview showing implemented features (AI summaries, glossary, headings) and planned enhancements
- `docs/SOUNDING_BOARD.md` - Instructions for collaborative discussion mode emphasising asking questions and suggesting alternatives rather than immediate implementation
- `docs/WRITING_EVERGREEN_DOCS.md` - Guidelines for writing evergreen documentation including structure, cross-references, status indicators, and maintenance practices
- `docs/WRITING_PLANNING_DOCS.md` - Guide for writing planning/project management documents with file naming conventions, structure, and stage-based action plans
- `docs/UPDATE_HOUSEKEEPING_DOCUMENTATION.md` - Process for keeping project documentation up-to-date including review steps, update patterns, and quality checklist
- `docs/UPDATING_CLAUDE_INSTRUCTIONS.md` - Guidelines for maintaining CLAUDE.md to help AI agents operate effectively on the Spideryarn Reading codebase


## Planning docs

(Written based on `docs/WRITING_PLANNING_DOCS.md`)

Recent planning decisions & progress-tracking of major features: `planning/*.md`

