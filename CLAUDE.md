# CLAUDE.md - Spideryarn Reading Codebase Guide

This document provides essential context for Claude instances working on the Spideryarn Reading project.

see:
- `README.md` for goals/intents/features
- `docs/reference/VISION_PRODUCT_STRATEGY.md` for comprehensive product vision and strategic direction
- IMPORTANT: `docs/reference/CODING_PRINCIPLES.md`
- IMPORTANT: `docs/reference/CODING_GUIDELINES.md` for code quality standards
- `docs/reference/ARCHITECTURE_OVERVIEW.md` for current system architecture
- `docs/reference/ARCHITECTURE_DECISIONS.md` for key architectural decisions and rationale
- `docs/reference/LOGGING_BEST_PRACTICES.md` for comprehensive logging and observability guidance
- `docs/reference/LLM_MODEL_CONFIGURATION.md` for AI model configuration and usage patterns
- `docs/instructions/GIT_COMMIT_CHANGES.md` for Git commit best practices

## Project Overview

Spideryarn Reading is an AI-assisted document reading and analysis application, currently in early development phase using AI-first development methods. The main goal is to help humans digest written non-fiction material better through AI-powered features like AI-generated granular table of contents, chatbot, summaries at multiple granularities, glossary, and intelligent navigation.

The codebase is developed primarily by AI agents working in parallel, with comprehensive documentation, strict typing, and testing infrastructure designed to support AI productivity and code quality.


## Development Philosophy

Key principles that guide all development decisions, from `docs/CODING_PRINCIPLES.md`:

- **This is early-stage development with AI-first methods.** We want to develop fast and experiment using AI agents, so we can figure out which features are most valuable. The comprehensive documentation, typing, and testing infrastructure exists to support AI productivity and prevent regressions.
- **Fix the root cause rather than putting on a band-aid.** Avoid fallbacks & defaults - better to fail if input assumptions aren't being met.
- **If you hit any nasty surprises, stop & discuss with the user.** Don't push through unexpected issues.
- **No destructive or irreversible changes without checking with the user.** Be especially careful about any operations that are irreversible, could involve data loss, affect databases, production systems, or user data. When in doubt, ask for explicit permission first.
- **Raise errors early, clearly & fatally.** Prefer not to wrap in try/except so that tracebacks are obvious.
- **If things don't make sense or seem like a bad idea, ask questions or discuss rather than just going along with it.** Be a good collaborator, and help make good decisions.

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
- `npm run dev` - Regenerates DB types then starts dev server (foreground mode)
- `npm run dev:daemon` - **AI agent automation**: Start/restart dev server in background with PID tracking
- `npm run dev:status` - Check if daemon is running and healthy (process + HTTP response)
- `npm run dev:stop` - Stop background daemon gracefully
- `npm run dev:safe` - Starts dev server without type generation (fallback if DB is unavailable)
- Logs: `dev.log` - Use `tail dev.log` to check recent output
- URL: http://localhost:$PORT/ (configurable via PORT in `.env.local`)

**AI-First Development Best Practices:**
- **Use daemon mode for automation**: `npm run dev:daemon` allows LLM agents to manage dev server without blocking terminal
- **Always check status first**: Run `npm run dev:status` before starting daemon to avoid conflicts
- **Graceful cleanup**: Use `npm run dev:stop` rather than killing processes manually
- **Worktree isolation**: Each worktree tracks its own daemon independently via `.dev-server.pid`
- **Health verification**: Daemon mode checks both process existence AND HTTP response for true health status

Production deployment:
- **Live URL**: https://www.spideryarn.com
- **Documentation**: `docs/reference/SETUP_DEPLOYMENT_PRODUCTION.md`
- **Streamlined deployment**: `npm run deploy:production` (builds locally + pushes to main)
- **Auto-deployment**: Pushes to main trigger GitHub Actions migrations + Vercel deployment
- **Status**: ✅ Fully operational with custom domain, SSL, Google SSO, and database integration

Database operations:
- `npm run db:types` - Regenerate TypeScript types from Supabase schema
- ⛔ `npm run db:reset:DANGEROUS` - **DO NOT USE**: This command destroys ALL data including test and development data. Only use with explicit user permission in exceptional circumstances.
- `npx supabase db push` - **CAUTION**: Applies migrations to database (NEVER run without explicit user permission)

⚠️ **CRITICAL**: Always ask for explicit user permission before modifying the database, especially in major ways. When in doubt, err on the side of caution!

Type checking and linting:
- `npm run build` - TypeScript compilation errors
- `npm run lint` - ESLint code quality/style issues
- `npm test` - Jest testing (`npm run test:coverage` for coverage)
  - Tests **require** `.env.test` (copy from `.env.local`: `cp .env.local .env.test`) - tests abort if missing
  - When writing tests, use our Jest testing framework with React Testing Library
  - Prefer using a subagent for running tests to avoid filling the context window
  - Current test health: ~71% pass rate due to NextRequest mocking issues (see `docs/reference/TESTING_TROUBLESHOOTING.md`)
- `npm run test:e2e` - Playwright E2E tests (requires auth setup first: `npm run test:e2e:setup`)
- `npm run test:e2e:setup` - Set up Playwright authentication for current worktree

**Important for Claude Code users:**
- **IDE integration:** When using Claude Code within VS Code/Cursor/JetBrains, ESLint and TypeScript diagnostics are automatically shared
- **CLI usage:** When running Claude Code from command line, you MUST explicitly run `npm run lint` and `npm run build` to get diagnostic feedback
- **New stricter rules:** We've implemented context-aware linting (stricter for production code, lenient for tests) to catch errors early in AI development
- **Linting for AI-first development:** See `docs/reference/SETUP_FOR_AI_FIRST_CODING.md` for comprehensive AI linting strategies

⚠️ **IMPORTANT**: If tests are failing, try and understand why. If they're failing for systemic reasons, we should discuss how to fix that. Be wary about removing/modifying the tests just to make them pass. If in doubt, stop & discuss with the user.


## Test Database Approach - IMPORTANT

⚠️ **CRITICAL**: We use a **shared database** approach for testing. Tests run against the same local development database.

**Key Rules**:
- **NEVER reset the database** - destroys development data
- **NEVER use `npm run db:reset:DANGEROUS`** without explicit user permission
- **Use UUID-based test isolation** - all test data must be namespaced
- **Clean up test data** using `getCleanupFunctions()` utilities

**Documentation**: See `docs/reference/TESTING_DATABASE.md` for comprehensive patterns and test isolation utilities.

## Test Writing Guidance

**Before writing tests**: Use a subagent to search for existing test coverage. This avoids context pollution and duplication.

**Test hierarchy** (prefer higher on list):
1. **E2E tests** (`e2e/*.spec.ts`) - One E2E test can replace many unit tests
2. **Integration tests** - Test complete workflows, not individual functions
3. **Unit tests** - Only for complex algorithms or critical business logic

**Avoid testing**: Simple transformations, environment detection, logging, implementation details.

Debugging resources:
- Current logs: `tail dev.log`
- Browser debugging: Playwright MCP (console logs, network requests, screenshots)
- Codebase refactoring: sd (`sd --preview --string-mode "old" "new" .`) - see `docs/reference/SD_STRING_DISPLACEMENT_FIND_REPLACE.md`
- Test files: `src/lib/*/tests/` and `components/__tests__/`
- Database: `supabase/migrations/` and `docs/reference/DATABASE_*.md`
- Architecture: `docs/reference/ARCHITECTURE_OVERVIEW.md` and `docs/reference/ARCHITECTURE_DECISIONS.md`
- Recent decisions: `planning/*.md` docs

## Logging & Observability

**Current Implementation**:
- Pino structured logging with request correlation tracking
- Key utilities: `createRequestLogger()`, `generateCorrelationId()`, `logAIOperation()`, `createTimer()`
- Privacy-safe patterns (IDs only, no sensitive content)
- Mixed approach: Pino + console.log during migration

**Documentation**: See `docs/reference/LOGGING_BEST_PRACTICES.md` for comprehensive patterns and examples.


## Error Handling

**Database Services**: Propagate errors instead of silently failing
- Methods throw descriptive errors with context
- "Not found" cases return null (don't throw)
- API routes should catch and map to appropriate HTTP responses

**Principle**: "Raise errors early, clearly & fatally" (see `docs/reference/CODING_PRINCIPLES.md`)


## Upload Metadata Tracking

**Current Implementation**:
- Upload metadata stored in `documents.upload_metadata` JSONB field
- AI call traceability via `documents.upload_ai_call_id` foreign key
- Implemented in PDF upload and URL extraction APIs
- Enables debugging and processing optimization

**Files**: Migration `20250608120000_add_upload_metadata_fields.sql`, types in `lib/types/database.ts`


## Authentication System

**Current Implementation**: Supabase Auth with Next.js App Router
- Email/password and Google OAuth authentication
- Route protection with server-side validation
- Long-lasting sessions (1 week) with automatic refresh
- Profile management with dropdown navigation

**Files**: `lib/auth/`, `components/auth/`, `app/auth/`, `middleware.ts`
**Documentation**: See `docs/reference/AUTHENTICATION_*.md` for comprehensive guides


## Project Structure

**Active Development** (root directory):
- Core implementation: `app/`, `components/`, `lib/`
- Documentation: `docs/` (evergreen) and `planning/` (decisions)
- Database: `supabase/migrations/` and config

**IGNORE**:
- `obsolete_alternative_version/` - deprecated Python version (occasionally useful for prompts)
- `backup/` - deprecated SvelteKit implementation


## Environment Variables

**NEVER modify, overwrite, or delete** `.env.*` files without explicit user permission

Key variables in `.env.local`:
- `ANTHROPIC_API_KEY` - Required for AI features
- `PORT` - Dev server port
- `LLM_MODEL` - uses model strings (`anthropic:claude-3-5-haiku:20241022`, `google:gemini-2.0-flash:latest`), defaults to Claude Sonnet 4, but we usually override to Haiku for development
- Supabase connection details (see `docs/reference/SETUP_DEVELOPMENT_ENVIRONMENT.md`)

Test environment (`.env.test`):
- Currently mirrors `.env.local` for simplicity (shared database approach)
- Best practice: Use cheaper LLM models (`LLM_MODEL=anthropic:claude-3-5-haiku:20241022` or `LLM_MODEL=google:gemini-2.0-flash:latest`) for cost efficiency
- See `docs/reference/TESTING_SETUP.md` for setup instructions

Template: `.env.example` (may not be current - check `.env.local` for active config)


## Browser Automation

**Playwright E2E Testing (Recommended)**:
- Use `npm run test:e2e` for comprehensive test suites
- **Setup required**: Run `npm run test:e2e:setup` in each worktree before first use
- **Multi-worktree isolation**: Environment-aware authentication prevents conflicts

**Playwright MCP (For interactive debugging)**:
- **⚠️ CRITICAL**: Always check `.env.test` for PORT variable - different worktrees use different ports
- **Multi-worktree auth**: Use environment-specific test users (test-user1@spideryarn.com, etc.)
- **Configuration**: Use headless mode and 1200x800 viewport for reliable automation

**Documentation**: See `docs/reference/TESTING_BROWSER_AUTOMATION_OVERVIEW.md` for comprehensive patterns


## Context window, tasks, and subagents

Use tasks whenever there's more than a couple of things to keep track of.

Use subagents where appropriate:
- e.g. for running a battery of tests, checking lint/build, curl, Puppeteer/Playwright or other browser automation, other verbose output, Git commits, any other verbose-output, and anywhere else where you think it's a good fit
- They are especially valuable as a way to avoid filling up your context window  
- They are also a good fit for encapsulated & well-defined tasks, i.e. tasks that don't need the full context of the conversation so far, and/or where we only need a summary of what was done in order to proceed
- Use subagents in parallel where possible (because this is faster), but only if there isn't a dependency between tasks (e.g. the output of this one is useful as input for the next)
- **Give them lots of background** so that they can make good decisions, e.g. about goals, point them to relevant docs/code, what we've been changing, gotchas & things to avoid, relevant environment variables like $PORT for Puppeteer/Playwright, using Jest for testing, the current date/time from `date`, and anything else that will help them to be effective but correct/careful.
- **Tell subagents what to be cautious of**, and to abort and provide feedback on what happened if there are problems or surprises (to avoid them going rogue and doing more harm than good)

**See**: `docs/instructions/TASKS_SUBAGENTS.md` for detailed guidelines on effective subagent usage


## Documentation Reference

see `docs/reference/DOCUMENTATION_ORGANISATION.md` for a comprehensive, navigational overview of all project documentation

Available evergreen documentation in `docs/` - comprehensive signposting by domain:

**Instructions & Modes** (workflow guidance):
- `docs/instructions/TASKS_SUBAGENTS.md` - Detailed subagent usage guidelines for context management
- `docs/instructions/GIT_COMMIT_CHANGES.md` - Guidelines for Git commit best practices including batching changes, message format, and handling concurrent changes
- `docs/instructions/SOUNDING_BOARD_MODE.md` - Instructions for collaborative discussion mode emphasising asking questions and suggesting alternatives rather than immediate implementation
- `docs/instructions/DETECTIVE_SCIENTIST_MODE.md` - Systematic investigation approach
- `docs/instructions/DOCUMENT_RESEARCH.md` - Research methodology for documentation
- `docs/instructions/UPDATE_HOUSEKEEPING_DOCUMENTATION.md` - Process for keeping project documentation up-to-date including review steps, update patterns, and quality checklist
- `docs/instructions/UPDATE_HOUSEKEEPING_TESTS.md` - Process for maintaining test quality and organisation while supporting rapid prototyping
- `docs/instructions/UPDATE_CLAUDE_INSTRUCTIONS.md` - Guidelines for maintaining CLAUDE.md to help AI agents operate effectively on the Spideryarn Reading codebase
- `docs/instructions/WRITE_EVERGREEN_DOC.md` - Guidelines for writing evergreen documentation including structure, cross-references, status indicators, and maintenance practices
- `docs/instructions/WRITE_PLANNING_DOC.md` - Guide for writing planning/project management documents with file naming conventions, structure, and stage-based action plans
- `docs/instructions/GATHER_DIVERSE_INPUTS_AND_CRITIQUES_ON_PLANNING_DOCS_FROM_OTHER_AI_MODELS.md` - Process for obtaining external AI critiques of planning documents for quality assurance

**Core Development & Architecture**:
- `docs/reference/CODING_PRINCIPLES.md` - **CRITICAL**: Core development philosophy for AI-first methods
- `docs/reference/CODING_GUIDELINES.md` - **CRITICAL**: Code quality standards and TypeScript patterns
- `docs/reference/ARCHITECTURE_OVERVIEW.md` - Current system architecture and implementation
- `docs/reference/ARCHITECTURE_DECISIONS.md` - Key architectural decisions and framework choices
- `docs/reference/ARCHITECTURE_URL_STATE.md` - URL state management patterns
- `docs/reference/SETUP*.md` - Development environment setup and configuration
- `docs/reference/COMMAND_LINE_SCRIPTS.md` - Guidelines for CLI script development
- `docs/reference/PROJECT_STATUS.md` - Current development state overview showing implemented features (AI summaries, glossary, headings) and planned enhancements

**Testing** (comprehensive testing ecosystem):
- `docs/reference/TESTING_OVERVIEW.md` - Testing approach with Jest and React Testing Library
- `docs/reference/TESTING_DATABASE.md` - **CRITICAL**: Real RLS testing patterns (use `RLSTestDatabase`)
- `docs/reference/TESTING_BROWSER_AUTOMATION_OVERVIEW.md` - Playwright E2E testing (recommended)
- `docs/reference/TESTING_AUTHENTICATION.md` - Auth testing patterns and utilities
- `docs/reference/TESTING_TROUBLESHOOTING.md` - Known issues and workarounds
- `docs/reference/TESTING_SETUP.md` - Test environment configuration
- `docs/reference/TESTING_*.md` - Additional testing utilities and service mocks

**Database & Security**:
- `docs/reference/DATABASE_OVERVIEW.md` - Database architecture and patterns
- `docs/reference/DATABASE_MIGRATIONS.md` - Schema change management with Supabase
- `docs/reference/DATABASE_SCHEMA.md` - Current schema reference (evolving)
- `docs/reference/DATABASE_SECURITY.md` - Security patterns and RLS implementation
- `docs/reference/DATABASE_*.md` - Local setup, production, backup, and Supabase integration

**Authentication System**:
- `docs/reference/AUTHENTICATION_OVERVIEW.md` - System architecture and flows
- `docs/reference/AUTHENTICATION_SETUP.md` - Configuration and deployment
- `docs/reference/AUTHENTICATION_UI.md` - UI components and forms
- `docs/reference/AUTHENTICATION_DATABASE.md` - Database integration and RLS
- `docs/reference/AUTHENTICATION_SECURITY.md` - Security practices and troubleshooting
- `docs/reference/AUTHENTICATION_*.md` - Admin features and testing patterns

**UI, Styling & Components**:
- `docs/reference/UI_INTERFACE.md` - Multi-pane layout with tabbed navigation
- `docs/reference/UI_COMPONENTS.md` - Available components and usage patterns
- `docs/reference/STYLING_SHADCN_UI_REFERENCE.md` - shadcn/ui integration guide
- `docs/reference/STYLING_OVERVIEW.md` - CSS configuration and theme settings
- `docs/reference/STYLING_*.md` - Colors, fonts, icons, highlighting, tooltips, mobile detection
- `docs/reference/UNIFIED_LEFT_PANE_TABBED_NAVIGATION.md` - Architecture and features of the unified left pane with tabbed interface, ToC, AI-generated headings, and tooltip summaries
- `docs/reference/KEYBOARD_SHORTCUTS.md` - Application keyboard shortcuts

**AI Features & Tools**:
- `docs/reference/TOOL_CHATBOT_ASSISTANT_UI_INTEGRATION.md` - Comprehensive technical guide for integrating the @assistant-ui/react library into the chatbot interface within the Tools pane
- `docs/reference/TOOL_SUMMARISE.md` - Documents the AI summarise feature that generates hierarchical summaries of document content using LLM analysis at multiple granularity levels
- `docs/reference/TOOL_GLOSSARY.md` - Documents the glossary feature that extracts key entities from documents using LLM analysis and displays them in a dedicated pane
- `docs/reference/TOOL_HEADINGS.md` - AI-generated heading system
- `docs/reference/TOOL_*.md` - Search, highlighting, metadata, reading difficulty tools
- `docs/reference/LLM_PROMPT_TEMPLATES.md` - Guide for creating AI/LLM calls using the Nunjucks + Zod template system with type safety and validation
- `docs/reference/LLM_MODEL_CONFIGURATION.md` - AI model configuration and usage patterns
- `docs/reference/LLM_*.md` - Token tracking, evaluation frameworks

**Content Processing**:
- `docs/reference/PDF_TO_HTML_*.md` - PDF conversion approaches (LLM, open source, paid services)
- `docs/reference/HTML_*.md` - HTML content processing and sanitization
- `docs/reference/MUTATIONS_DOCUMENT_CONTENT_REVERSIBLE_TRANSFORMS.md` - Documents the reversible document transformation system for applying/reverting changes like AI-generated headings and content filtering
- `docs/reference/UPLOAD_DOCUMENT_PROCESSING_PIPELINE.md` - Document upload and processing

**Specialized & Research**:
- `docs/reference/VISION_PRODUCT_STRATEGY.md` - Comprehensive product vision and strategy
- `docs/reference/LOGGING_BEST_PRACTICES.md` - Pino structured logging patterns
- `docs/reference/CROSS_PANE_COMMUNICATION_MESSAGING_ARCHITECTURE.md` - Inter-pane messaging architecture
- `docs/reference/RESEARCH_*.md` - Reading difficulty metrics and text formatting research
- `docs/reference/VERCEL_AI_SDK_REFERENCE.md` - AI SDK integration patterns

**Row Level Security (RLS) Testing - IMPORTANT**:
- **ALWAYS use real RLS testing**: Use `RLSTestDatabase` class in `lib/testing/rls-database-test-utils.ts`
- **AVOID simulation approaches**: Old simulation-based RLS tests have been deprecated for security reasons
- **Essential for security**: Real RLS testing discovered and fixed critical vulnerabilities
- **See**: `docs/reference/TESTING_DATABASE.md` for comprehensive real RLS testing patterns
- **Example**: `lib/services/database/__tests__/rls-policies-real.test.ts` for reference implementation

**Recent Decisions & Planning**: `planning/*.md` for major feature progress tracking and architectural decisions


## UI Components & Styling

**Components**: shadcn/ui component library built on Radix UI primitives
- **Use shadcn/ui**: For interactive components (buttons, dialogs, forms, loading states)
- **Use raw Tailwind**: For simple layouts, spacing, basic styling
- **Available**: Button, Dialog, Alert, Loading (all with Spideryarn orange theme)
- **Install new**: `printf "\n" | npx shadcn@latest add [component-name]`

**Icons**: Phosphor icons with SSR support - use `/dist/ssr/` imports for server components
**Documentation**: `docs/reference/STYLING_SHADCN_UI_REFERENCE.md` and `docs/reference/UI_COMPONENTS.md`

## Style

Use British spelling.


## Git

Follow the instructions in `docs/instructions/GIT_COMMIT_CHANGES.md`.


## Date

It is summer 2025.
