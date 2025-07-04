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

**Goal**: Help humans digest non-fiction material through AI-powered features:
- AI-generated granular table of contents and headings
- Chatbot assistance
- Multi-granularity summaries
- Entity glossary
- Intelligent navigation


## Development Philosophy & Safety Guidelines

Key principles from `docs/reference/CODING_PRINCIPLES.md`:

**Core Approach:**
- **AI-first development**: Fast experimentation with comprehensive docs/testing for AI productivity
- **Fix root causes**: No band-aids - fail clearly when assumptions aren't met
- **Stay focused**: Minimal, targeted changes only. Flag unrelated issues, don't fix them
- **Raise errors early & clearly**: No masking problems - expose them for debugging
- **Descriptive naming**: Use longer, more descriptive filenames, function names, and variable names that are easy to grep and understand

**Safety Guidelines:**
- **Stop and discuss**: When hitting surprises or uncertainty
- **Ask permission for**: Database changes, irreversible operations, production systems
- **Never modify without permission**: `.env.*` files, database schemas, test data
- **Database operations**: Always read `docs/reference/DATABASE_*.md` first

⚠️ **CRITICAL**: Database changes destroy development data. Always ask first!

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

## Testing

**Database Approach:**
- **Shared database** - tests use same local dev database
- **UUID isolation** - all test data must be namespaced
- **Cleanup required** - use `getCleanupFunctions()` utilities
- **RLS testing**: Use `RLSTestDatabase` class (see `docs/reference/TESTING_DATABASE.md`)

**Test Strategy:**
1. **E2E tests** (`e2e/*.spec.ts`) - Prefer these
2. **Integration tests** - Complete workflows
3. **Unit tests** - Only for complex logic

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

**IGNORE:**
- `obsolete_alternative_version/` - Deprecated Python version
- `backup/` - Deprecated SvelteKit implementation


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
- **RLS Testing**: Use `RLSTestDatabase` class (see `docs/reference/TESTING_DATABASE.md`)
- **Migrations**: `supabase/migrations/` (see `docs/reference/DATABASE_MIGRATIONS.md`)

**UI Components**:
- shadcn/ui + Phosphor icons
- See `docs/reference/DESIGN_SHADCN_UI_REFERENCE.md`

**Documentation Index**: `docs/reference/INDEX_FOR_DOCUMENTATION.md`


## Quick Reference

- **Spelling**: British
- **Git commits**: Follow `docs/instructions/GIT_COMMIT_CHANGES.md`
- **Date**: Summer 2025
- **Production**: https://www.spideryarn.com