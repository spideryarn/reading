# CLAUDE.md - Spideryarn Reading Codebase Guide

This document provides essential context for Claude instances working on the Spideryarn Reading project.

**Critical References:**
- `docs/reference/CODING_PRINCIPLES.md` - **MUST READ**: Core development philosophy
- `docs/reference/CODING_GUIDELINES.md` - Code quality standards and TypeScript patterns
- `docs/reference/ARCHITECTURE_OVERVIEW.md` - Current system architecture
- `docs/reference/TESTING_DATABASE.md` - Test isolation patterns (critical for DB operations)
- `docs/instructions/GIT_COMMIT_CHANGES.md` - Git commit best practices

For comprehensive documentation, see `docs/reference/INDEX_FOR_DOCUMENTATION.md`

## Project Overview

Spideryarn Reading is an AI-assisted document reading and analysis application, currently in early development phase using AI-first development methods. The codebase is developed primarily by AI agents working in parallel, with comprehensive documentation and testing infrastructure designed to support AI productivity.

**Goal of the product**: Help humans digest non-fiction material through AI-powered features:
- AI-generated granular table of contents and headings
- Chatbot assistance
- Multi-granularity summaries
- Entity glossary
- Intelligent navigation


## Development Philosophy & Safety Guidelines

Key principles from `docs/reference/CODING_PRINCIPLES.md`:

**Core Approach:**
- **Help the user make good decisions and build a product that helps people**: if you're skeptical, or have questions, or concerns, or see a better way, **you must speak up**.
- **AI-first development**: Fast experimentation with comprehensive docs/testing for AI productivity
- **Fix root causes**: No bandaids. If you're not sure, gather more clues, generate hypotheses, try and confirm/disconfirm them, flag uncertainty explicitly to the user.
- **Stay focused**: Minimal, targeted changes only. Flag unrelated issues explicitly, but don't fix them
- **Raise errors early & clearly**: No masking problems, no fallbacks/bandaids/defaults - fail fatally and immediately, with a user-visible, debuggable message.
- **Descriptive naming**: Use longer, more descriptive filenames, function names, and variable names that are easy to grep and understand
- **Never implement silent data modifications**: No truncation or quiet transformations
- **Get working end-to-end first**: Simple version before layering complexity
- **Prefer functional over OO**: Easier to test and reason about

**Safety Guidelines:**
- **When hitting surprises or uncertainty**, stop and discuss.
- **Ask permission for**: Database changes, irreversible operations, production systems
- **Never modify without permission**: `.env.*` files, database schemas, test data
- **Database operations**: Always read `docs/reference/DATABASE_*.md` first

⚠️ **CRITICAL**: For database changes that could destroy data, always ask first!

## Architecture & Tech Stack

- **Frontend**: Next.js 15 App Router, TypeScript, Tailwind CSS
- **AI Integration**: 
  - Vercel AI SDK Core (multi-provider: Claude, Gemini)
  - Nunjucks + Zod prompt templates (see `docs/reference/LLM_PROMPT_TEMPLATES.md`)
  - @assistant-ui/react for chat UI
- **Database**: Supabase (Postgres with RLS)
- **State**: Virtual DOM approach - React state/context
- **UI Components**: shadcn/ui + Radix UI primitives

See `docs/reference/ARCHITECTURE_OVERVIEW.md` for details


## Development Environment

**Local Development:**
- `npm run dev:daemon` - Default: background server with PID tracking
- `npm run dev` - Foreground mode with DB type generation
- Logs: `tail dev.log` or `tail error.log`
- URL: `http://localhost:$PORT/` (see `.env.local`)
- **Worktree isolation**: Each worktree has own daemon PID and port

**Code Quality:**
- `npm run check:health` - All-in-one health check (recommended)
- `npm run lint` - ESLint checks
- `npm run build` - TypeScript compilation
- **CLI usage**: Always run health checks before completing tasks

**Production:**
- Live: https://www.spideryarn.com
- Deploy: `npm run deploy:production`
- Details: `docs/reference/SETUP_DEPLOYMENT_PRODUCTION.md`

## Development Workflow

**Stage-based approach** (from planning docs):
1. Get simple version working end-to-end first
2. Layer in complexity gradually
3. Each stage should end with passing tests and working code
4. Clarify edge cases with user early

**Pre-commit verification** (CRITICAL):
```bash
# Always run before committing:
npm run check:health      # Git-aware health check
npm test                  # Ensure tests pass

# For E2E tests:
npm run dev:status || npm run dev:daemon  # Ensure server running
npm run test:e2e                          # Run E2E tests
```

**Health check usage**:
- `npm run check:health` - Checks changed files (git-aware)
- `npm run check:health --rigorous` - All files for major refactors
- `npm run check:health --quick` - Skip build for quick iterations
- Use subagent if >3 files have issues

## Testing

**Test Reform hierarchy** (prefer higher):
1. **E2E tests** (80% confidence) - Real user journeys
2. **Integration tests** (15%) - API contracts
3. **Unit tests** (5%) - Complex algorithms only

**Database Approach:**
- **Shared database** - tests use same local dev database
- **UUID isolation** - all test data must be namespaced
- **Cleanup required** - use `getCleanupFunctions()` utilities
- **RLS testing**: Use `RLSTestDatabase` class (see `docs/reference/TESTING_DATABASE.md`)

**Running Tests:**
- `npm test` - Jest suite
- `npm run test:e2e` - Playwright E2E (run `npm run dev:daemon` first)
- **Use subagents** for running tests to avoid context pollution

**Test Modification Policy:**
- Fix code to pass tests, not vice versa
- Discuss with user before modifying tests
- Valid reasons: consolidation, requirement changes, fixing incorrect assertions

See `docs/reference/TESTING_TROUBLESHOOTING.md` for issues

## Environment Variables

**NEVER modify `.env.*` files without permission**

**Key variables** (`.env.local`):
- `ANTHROPIC_API_KEY` - Required for AI features
- `PORT` - Dev server port
- `LLM_MODEL` - Model strings (e.g., `anthropic:claude-3-5-haiku:20241022`)
- Supabase credentials (see `docs/reference/SETUP_DEVELOPMENT_ENVIRONMENT.md`)

**Test environment** (`.env.test`):
- Mirrors `.env.local` with cheaper LLM models
- See `docs/reference/TESTING_SETUP.md`


## Project Structure

**Active Development:**
- `app/`, `components/`, `lib/` - Core implementation
- `docs/` - Evergreen documentation
- `docs/planning/` - Decision records
- `supabase/migrations/` - Database schema


## Browser Automation

- **E2E Testing**: `npm run test:e2e` (setup: `npm run test:e2e:setup`)
- **Playwright MCP**: Use `--isolated` flag, test user `hello@spideryarn.com`
- See `docs/reference/TESTING_BROWSER_AUTOMATION_OVERVIEW.md`


## Tasks & Subagents

**Use TodoWrite/TodoRead** for task tracking when handling multiple items.

**Use subagents for**:
- Running tests, lint/build checks
- Verbose operations (Git commits, browser automation)
- Context window management
- Parallel tasks without dependencies

**Subagent guidelines**:
- Provide comprehensive background and gotchas
- Instruct to stay focused and flag (not fix) unrelated issues
- Tell them to abort on surprises

See `docs/instructions/TASKS_SUBAGENTS.md` for details


## Key Implementation Areas

**Authentication**: Supabase Auth with Google OAuth
- See `docs/reference/AUTHENTICATION_*.md`

**Tools & AI Features**:
- **Tool development**: `docs/reference/TOOL_ARCHITECTURE_AND_DEVELOPMENT_GUIDE.md`
- **Implemented**: Structure (AI headings), Glossary, Summarise, Chatbot
- **LLM calls**: Nunjucks + Zod templates (`docs/reference/LLM_PROMPT_TEMPLATES.md`)

**Database**:
- **RLS Testing**: Use `RLSTestDatabase` class (critical for security)
- **Migrations**: `supabase/migrations/` (see `docs/reference/DATABASE_MIGRATIONS.md`)

**UI Architecture**:
- `docs/reference/UI_INTERFACE.md` - 2-pane resizable layout with tabbed navigation
- `docs/reference/UI_COMPONENTS.md` - shadcn/ui component system and available components
- `docs/reference/SITE_ORGANISATION_WEBSITE_STRUCTURE.md` - Database-driven application routes and structure
- `docs/reference/UNIFIED_LEFT_PANE_TABBED_NAVIGATION.md` - Left pane with 7 tabs (ToC, Chat, etc.)

**Key References**:
- `docs/reference/SETUP_FOR_AI_FIRST_CODING.md` - AI development optimization patterns
- `docs/instructions/SOUNDING_BOARD_MODE.md` - When to ask questions vs implement
- `docs/reference/INDEX_FOR_DOCUMENTATION.md` - Complete documentation overview


## Quick Reference

- **Spelling**: British
- **Git commits**: Follow `docs/instructions/GIT_COMMIT_CHANGES.md`
- **Date**: Summer 2025
- **Production**: https://www.spideryarn.com