# CLAUDE.md - Spideryarn Reading Codebase Guide

This document provides essential context for Claude instances working on the Spideryarn Reading project.

see:
- `README.md` for goals/intents/features
- IMPORTANT: `docs/CODING_PRINCIPLES.md`
- IMPORTANT: `docs/CODING_GUIDELINES.md` for code quality standards
- `docs/ARCHITECTURE.md`
- `docs/GIT_COMMITS.md` for using Git

## Project Overview

Spideryarn Reading is an AI-assisted document reading and analysis application, currently in early prototype phase. The main goal is to help humans digest written non-fiction material better through AI-powered features like AI-generated granular table of contents, chatbot, summaries at multiple granularities, glossary, and intelligent navigation.


## Key Architectural Decisions

Based on README.md, the following architecture decisions have been made:

- **Frontend Framework**: Next.js with TypeScript and Tailwind CSS (transitioning from SvelteKit)
- **AI Integration**: Anthropic Claude Sonnet 4 for all AI-related features
  - Vercel AI SDK Core for multi-provider support (Claude, Gemini)
  - @assistant-ui/react for chat UI primitives
  - All LLM calls use Nunjucks + Zod prompt templates
- **Storage**: Supabase (Postgres with realtime capabilities) from the start
- **Data Structure**: Single-row document storage (moved away from element decomposition)
- **Frontend State**: Virtual DOM approach - maintain document structure as React state/context
- **Background Processing**: Frontend-driven queue initially, with API calls to backend
- **MVP Focus**: Basic document display with hierarchical summaries as the core feature

## Build, testing, and debugging

Next.js local dev server:
- `npm run dev` - Regenerates DB types then starts dev server. User is already running this in a separate terminal. If you need them to restart it, ask them.
- `npm run dev:safe` - Starts dev server without type generation (fallback if DB is unavailable)
- Logs: `dev.log` - Use `tail dev.log` to check recent output
- URL: http://localhost:$PORT/ (configurable via PORT in `.env.local`)

Database operations:
- `npm run db:types` - Regenerate TypeScript types from Supabase schema
- `npm run db:reset` - **DESTRUCTIVE**: Reset database and regenerate types (NEVER run without explicit user permission - this deletes all local data!)

Type checking and linting:
- `npm run build` - TypeScript compilation errors
- `npm run lint` - ESLint code quality/style issues
- `npm test` - Jest testing (`npm run test:coverage` for coverage)
  - Tests use `.env.test` for environment variables (copy from `.env.local`: `cp .env.local .env.test`)
  - When writing tests, use our Jest testing framework with React Testing Library
  - Prefer using a subagent for running tests to avoid filling the context window

Debugging resources:
- Current logs: `tail dev.log`
- Browser debugging: Playwright MCP (console logs, network requests, screenshots)
- Test files: `src/lib/*/tests/` and `components/__tests__/`
- Database: `supabase/migrations/` and `docs/DATABASE_*.md`
- Architecture: `docs/ARCHITECTURE.md`
- Recent decisions: `planning/*.md` docs


## Error Handling

**Database Service Layer**: The database services now propagate errors instead of silently failing. This helps with debugging and ensures problems are noticed early:
- Methods throw descriptive errors with context
- "Not found" cases (error code PGRST116) return null instead of throwing
- No more `console.error` + `return null` patterns
- API routes should catch database errors and map to appropriate HTTP responses

This follows our principle: "Raise errors early, clearly & fatally" (see `docs/CODING_PRINCIPLES.md`)


## Project Structure

**Active Development** (root directory):
- Core implementation: `app/`, `components/`, `lib/`
- Documentation: `docs/` (evergreen) and `planning/` (decisions)
- Database: `supabase/migrations/` and config

**IGNORE**:
- `obsolete_alternative_version/` - deprecated Python version (occasionally useful for prompts)
- `backup/` - deprecated SvelteKit implementation


## Environment Variables

Key variables in `.env.local`:
- `ANTHROPIC_API_KEY` - Required for AI features
- `PORT` - Dev server port
- `LLM_MODEL` - default is Claude Sonnet 4, but we usually override to Haiku for development
- Supabase connection details (see `docs/SETUP.md`)

Test environment (`.env.test`):
- Currently mirrors `.env.local` for simplicity
- Best practice: Use cheaper LLM models (Haiku) and separate test database in future
- See `docs/TESTING.md` for setup instructions

Template: `.env.example` (may not be current - check `.env.local` for active config)


## Context window, tasks, and subagents

Use tasks whenever there's more than a couple of things to keep track of.

Use subagents where appropriate (to avoid filling up the context window), e.g. for tests, curl, Playwright/Puppeteer MCP, other verbose output, Git commits, and any other encapsulated tasks.

Give them lots of background so that they can make good decisions, e.g. about goals, what we've been changing, gotchas & things to avoid, warnings to abort and provide feedback on what happened if there are surprises, relevant environment variables like $PORT for Playwright, using Jest for testing, and anything else that will help them to be effective but careful).


## Documentation Reference

see `docs/DOCUMENTATION_ORGANISATION.md`

Available evergreen documentation in `docs/` - here are some of the most useful.

Coding & infrastructure:
- `docs/CODING_PRINCIPLES.md` - Outlines development principles prioritising simplicity, readability, debugging, and rapid prototyping for early-stage development
- `docs/CODING_GUIDELINES.md` - Code quality standards including linting, TypeScript patterns, React best practices, and import conventions
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
- `docs/WRITE_EVERGREEN_DOC.md` - Guidelines for writing evergreen documentation including structure, cross-references, status indicators, and maintenance practices
- `docs/WRITE_PLANNING_DOC.md` - Guide for writing planning/project management documents with file naming conventions, structure, and stage-based action plans
- `docs/UPDATE_HOUSEKEEPING_DOCUMENTATION.md` - Process for keeping project documentation up-to-date including review steps, update patterns, and quality checklist
- `docs/UPDATING_CLAUDE_INSTRUCTIONS.md` - Guidelines for maintaining CLAUDE.md to help AI agents operate effectively on the Spideryarn Reading codebase


Recent planning decisions & progress tracking of major features: `planning/*.md`


## UI Components & Styling

The project uses **shadcn/ui** component library built on Radix UI primitives for consistent, accessible components.

### When to use shadcn/ui vs raw Tailwind:
- **Use shadcn/ui**: For interactive components (buttons, dialogs, forms, loading states)
- **Use raw Tailwind**: For simple layouts, spacing, basic styling

### Available Components:
- `Button` - All variants with custom Spideryarn orange theme (`#DB8A45`)
- `Dialog` - Accessible modals (custom dialog.tsx still used for compatibility)
- `Alert` - Error and warning states
- `Loading` - Standardised loading indicators with spinner
- `Select`, `Checkbox` - Available but not currently used (YAGNI principle)

### Adding New Components:
```bash
# Install new shadcn/ui component (non-interactive)
printf "\n" | npx shadcn@latest add [component-name]

# For React 19 compatibility, use --force if needed
printf "\n" | npx shadcn@latest add [component-name] --force
```

### Component Customisation:
- All components are copied to `components/ui/` and can be modified
- Theme customisation in `app/globals.css` with OKLCH colour values
- Primary colour set to Spideryarn orange: `hsl(30 62% 57%)`

### Documentation:
- `docs/SHADCN_UI_REFERENCE.md` - Complete installation and usage guide
- `docs/UI_COMPONENTS.md` - Available components and usage patterns

### Phosphor Icons SSR Usage:
For server components (without 'use client'), use SSR-compatible imports:
```javascript
// Server components - SSR imports
import { Warning } from "@phosphor-icons/react/dist/ssr/Warning"
import { Info } from "@phosphor-icons/react/dist/ssr/Info"
```

For client components (with 'use client'), use standard imports:
```javascript
// Client components - standard imports
import { Warning, Info } from "@phosphor-icons/react"
```

Next.js optimization is configured in `next.config.ts`:
```javascript
experimental: {
  optimizePackageImports: ["@phosphor-icons/react"],
}
```

## Style

Use British spelling.


## Git

Follow the instructions in `docs/GIT_COMMITS.md`.
