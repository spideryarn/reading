# CLAUDE.md - Spideryarn Reading Codebase Guide

This document provides essential context for Claude instances working on the Spideryarn Reading project.

**Critical References:**
- `docs/reference/CODING_PRINCIPLES.md` - **MUST READ**: Core development philosophy
- `docs/reference/CODING_GUIDELINES.md` - **MUST READ**: Comprehensive code standards (error handling, testing, security, etc.)
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
- Glossary
- Intelligent navigation & LLM-powered search
- LLM-powered PDF transcription at import
- and various other expert-reader assistance tools.


## Development Philosophy & Safety Guidelines

Key principles (see `docs/reference/CODING_PRINCIPLES.md` for full details):

- **Fix the root cause rather than putting on a band-aid.** Avoid fallbacks & defaults - better to fail if input assumptions aren't being met.
- **Stay focused on the specific task.** Make minimal, targeted changes only. Don't fix unrelated issues unless directly blocking.
- **If you hit any nasty surprises, stop & discuss with the user.** Don't push through unexpected issues.
- **No destructive or irreversible changes without explicit permission.** Be especially careful about databases, production systems, or user data.
- **Raise errors early, clearly & fatally.** Don't mask problems with defaults/bandaids/fallbacks.
- **If things don't make sense or seem like a bad idea, ask questions.** Be a good collaborator.

## Key Architectural Decisions

Based on README.md, the following architecture decisions have been made:

- **Frontend Framework**: Next.js with TypeScript and Tailwind CSS (transitioning from SvelteKit)
- **AI Integration**: Anthropic Claude Sonnet 4 for all AI-related features
  - Vercel AI SDK Core for multi-provider support (Claude, Gemini)
  - @assistant-ui/react for chat UI primitives
  - All LLM calls use Nunjucks + Zod prompt templates
- **Storage**: Supabase (Postgres with realtime capabilities) from the start
- **Background Processing**: Frontend-driven queue initially, with API calls to backend


## Build, testing, and debugging

Next.js local dev server:
- `npm run dev:daemon` (use this by default) - start/restart dev server in background with PID tracking, doesn't block the shell
- `npm run dev` - Regenerates DB types then starts dev server (foreground mode)
- Logs: `dev.log` and `error.log` - use `tail` to check recent output
- URL: http://localhost:$PORT/ (configurable via PORT in `.env.local`)

- **Worktree isolation**: Each worktree tracks its own daemon independently via `.dev-server.pid`, and has its own port defined in `.env.local`

Production deployment:
- **Live URL**: https://www.spideryarn.com
- **Documentation**: `docs/reference/SETUP_DEPLOYMENT_PRODUCTION.md`
- **Streamlined deployment**: `npm run deploy:production` (builds locally + Git pushes to main, which in turn triggers GitHub Actions migration, and Vercel deploymanet)
- **Status**: ✅ Fully operational with custom domain, SSL, Google SSO, and database integration

Database operations - read `docs/reference/DATABASE_SUPABASE_INTEGRATION_REFERENCE.md` and other `docs/reference/DATABASE_*.md` before working with the database

⚠️ **CRITICAL**: Always ask for explicit user permission before modifying the database, especially in major ways. When in doubt, err on the side of caution!

Type checking and linting:
- `npm run check:health` - **Orchestration**: Git-aware health check (TypeScript + ESLint + Build)
- `npm run build` - TypeScript compilation errors
- `npm run lint` - ESLint code quality/style issues
- before testing, read `docs/reference/TESTING_TROUBLESHOOTING.md`
  - `npm test` - Jest testing (`npm run test:coverage` for coverage), depends on `.env.test`
  - When writing tests, use our Jest testing framework with React Testing Library
  - **Prefer using a subagent** for **running** tests to avoid filling the context window
- for Playwright E2E browser testing, first read `docs/reference/TESTING_BROWSER_AUTOMATION_OVERVIEW.md`
  - **ALWAYS use `npm run test:e2e:with-preflight`** for E2E tests - includes preflight checks, headless and isolated flags
  - **E2E Authentication Best Practice**: Use `test.use({ storageState })` pattern for file-level auth injection (see `docs/reference/TESTING_BROWSER_AUTOMATION_IMPLEMENTATION.md`)
- **CLI usage:** When running Claude Code from command line, you MUST explicitly run `npm run lint` and `npm run build` to get diagnostic feedback OR use `npm run check:health` for orchestration-friendly summaries
- **Health check orchestration:** See `docs/reference/SETUP_FOR_AI_FIRST_CODING.md` for AI orchestration patterns and health checking workflows
- For large-scale find-and-replace: see `docs/reference/SD_STRING_DISPLACEMENT_FIND_REPLACE.md`
- Database: `supabase/migrations/` and `docs/reference/DATABASE_*.md`
- Architecture: `docs/reference/ARCHITECTURE_OVERVIEW.md` and `docs/reference/ARCHITECTURE_DECISIONS.md`


## Test Database Approach - IMPORTANT

- **CRITICAL: NEVER reset the database** without user permission, because it destroys development data
- **IMPORTANT**: We use a **shared database** approach for testing. Tests run against the same local development database.
  - see `docs/reference/TESTING_DATABASE.md` for comprehensive patterns and test isolation utilities.
  - **Use UUID-based test isolation** - all test data must be namespaced
  - **Clean up test data** afterwards using `getCleanupFunctions()` utilities

## Test Writing Guidance

**Before writing tests**: Use a subagent to search for existing test coverage. This avoids context pollution and duplication.
- Test files: `src/lib/*/tests/` and `components/__tests__/`

**Test hierarchy** (prefer higher on list):
1. **E2E tests** (`e2e/*.spec.ts`) - One E2E test can replace many unit tests
2. **Integration tests** - Test complete workflows, not individual functions
3. **Unit tests** - Only for complex algorithms or critical business logic

**Aim for fewer, but more useful & robust tests**, e.g. don't test simple transformations, environment detection, logging, implementation details.

Debugging resources:
- Current logs: `tail dev.log` or `tail error.log`
- Browser debugging: Playwright MCP (console logs, network requests, screenshots)
- **E2E testing**: 
  - Always use `npm run test:e2e:with-preflight` (combines preflight + tests in one command)
  - Use file-level `test.use({ storageState })` for authentication, not per-test login
  - Dev server MUST be running externally - do NOT rely on Playwright's webServer config

⚠️ **IMPORTANT**: If tests are failing, try and understand why. If they're failing for systemic reasons, tell the user so we can discuss how to fix things. Be wary about removing/modifying the tests just to make them pass. If in doubt, stop & discuss with the user.

**Test Modification Guidelines**:
- **Don't modify existing tests without discussing and agreeing with the user**
- **If a test fails, default to fixing the code, not the test**
- **Valid reasons to modify tests**:
  - Consolidating redundant tests
  - Changing requirements or edge case handling
  - Fixing incorrect test assertions
  - Improving test clarity or reducing brittleness

**Enforcement**:
- AI agents should fix code to pass tests, not vice versa
- Stop and discuss with user if tests need modification
- Test changes require explicit user approval
- When in doubt, ask rather than assume

**Rationale**: This prevents AI agents from "gaming" tests by modifying them to pass instead of fixing underlying code issues.

## Logging & Observability

**Current Implementation**:
- Pino structured logging with request correlation tracking
- Key utilities: `createRequestLogger()`, `generateCorrelationId()`, `logAIOperation()`, `createTimer()`
- Privacy-safe patterns (IDs only, no sensitive content)
- Mixed approach: Pino + console.log during migration

**Documentation**: See `docs/reference/LOGGING_BEST_PRACTICES.md` for comprehensive patterns and examples.


## Error Handling

**Best Practices**: See `docs/reference/CODING_GUIDELINES.md` for comprehensive error handling patterns
- Propagate errors instead of silently failing
- "Not found" cases return null (don't throw)
- Use structured error responses with correlation IDs
- User-friendly error messages: "What happened + Why + What to do"


## Authentication System

**Current Implementation**: Supabase Auth with Next.js App Router
- Email/password and Google OAuth authentication
- Route protection with server-side validation
- Long-lasting sessions (1 week) with automatic refresh
- Profile management with dropdown navigation

**Files**: `lib/auth/`, `components/auth/`, `app/auth/`, `middleware.ts`
**Documentation**: See `docs/reference/AUTHENTICATION_*.md` for comprehensive guides


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

- **E2E Testing**: Always use `npm run test:e2e` (includes headless and isolated flags)
- **Setup**: `npm run test:e2e:setup` for authentication
- **Pre-flight**: `npm run e2e:preflight` to verify test environment
- See `docs/reference/TESTING_BROWSER_AUTOMATION_OVERVIEW.md`


## Tasks & Subagents

For Claude Code: **Use TodoWrite/TodoRead** for task tracking when handling multiple items.

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
- 