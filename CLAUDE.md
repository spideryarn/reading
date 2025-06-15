# CLAUDE.md - Spideryarn Reading Codebase Guide

This document provides essential context for Claude instances working on the Spideryarn Reading project.

see:
- `README.md` for goals/intents/features
- `docs/reference/VISION.md` for comprehensive product vision and strategic direction
- IMPORTANT: `docs/reference/CODING_PRINCIPLES.md`
- IMPORTANT: `docs/reference/CODING_GUIDELINES.md` for code quality standards
- `docs/reference/ARCHITECTURE_OVERVIEW.md` for current system architecture
- `docs/reference/ARCHITECTURE_DECISIONS.md` for key architectural decisions and rationale
- `docs/reference/LOGGING_BEST_PRACTICES.md` for comprehensive logging and observability guidance
- `docs/reference/MODEL_STRING_CONFIGURATION.md` for AI model configuration and usage patterns
- `docs/instructions/GIT_COMMITS.md` for using Git

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
- `npm run dev` - Regenerates DB types then starts dev server. User is already running this in a separate terminal. If you need them to restart it, ask them.
- `npm run dev:safe` - Starts dev server without type generation (fallback if DB is unavailable)
- Logs: `dev.log` - Use `tail dev.log` to check recent output
- URL: http://localhost:$PORT/ (configurable via PORT in `.env.local`)

Production deployment:
- **Live URL**: https://www.spideryarn.com
- **Documentation**: `docs/reference/SETUP_DEPLOYMENT_PRODUCTION.md`
- **Auto-deployment**: Pushes to main trigger GitHub Actions migrations + Vercel deployment
- **Status**: ✅ Fully operational with custom domain, SSL, Google SSO, and database integration

Database operations:
- `npm run db:types` - Regenerate TypeScript types from Supabase schema
- ⛔ `npm run db:reset` - **DO NOT USE**: This command destroys ALL data including test and development data. Only use with explicit user permission in exceptional circumstances.
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

⚠️ **IMPORTANT**: If tests are failing, try and understand why. If they're failing for systemic reasons, we should discuss how to fix that. Be wary about removing/modifying the tests just to make them pass. If in doubt, stop & discuss with the user.


## Test Database Approach - IMPORTANT

⚠️ **CRITICAL**: We use a **shared database** approach for testing, following Supabase's official recommendations. Tests run against the same local development database, NOT a separate test database.

**Key Testing Rules**:
- **NEVER reset the database** - this would destroy development data
- **NEVER use `npm run db:reset`** unless explicitly authorized by the user
- **NEVER delete all records** from tables (no `DELETE FROM table` without WHERE)
- **Use UUID-based test isolation** - all test data must be namespaced

**Required Test Pattern**:
```typescript
import { getTestNamespace, createTestUser, getCleanupFunctions } from '@/lib/testing/test-isolation-utils'

describe('My Feature', () => {
  const namespace = getTestNamespace('my-feature-test')
  
  afterEach(async () => {
    // Clean up only test-namespaced data
    const cleanup = getCleanupFunctions(namespace, supabase)
    await cleanup.all()
  })
  
  it('should do something', async () => {
    // Create test data with namespace
    const testUser = createTestUser(namespace)
    
    // Your test logic here
    
    // Cleanup happens automatically in afterEach
  })
})
```

**Complete Documentation**: See `docs/reference/TESTING_DATABASE.md` for comprehensive patterns, examples, and utilities.

Debugging resources:
- Current logs: `tail dev.log`
- Browser debugging: Playwright MCP (console logs, network requests, screenshots)
- Test files: `src/lib/*/tests/` and `components/__tests__/`
- Database: `supabase/migrations/` and `docs/reference/DATABASE_*.md`
- Architecture: `docs/reference/ARCHITECTURE_OVERVIEW.md` and `docs/reference/ARCHITECTURE_DECISIONS.md`
- Recent decisions: `planning/*.md` docs

## Logging & Observability

**Pino Structured Logging** (Stage 6 - Complete):
- **Implementation**: Pino structured logging deployed across 11 critical API routes and 6 service files
- **Mixed approach**: Pino added alongside existing console.log statements for safe migration
- **Key utilities**: `createRequestLogger()`, `generateCorrelationId()`, `logAIOperation()`, `createTimer()`
- **Security patterns**: Privacy-safe logging (IDs only, no sensitive content like API keys or full document content)
- **Pretty logs in development**: Pino-pretty enabled for better developer experience (requires `serverExternalPackages` config in Next.js 15)

**Current logging patterns**:
```typescript
// Standard API route pattern with request timing
import { createRequestLogger, generateCorrelationId, logAIOperation, createTimer } from '@/lib/services/logger'

const correlationId = generateCorrelationId()
const requestLogger = createRequestLogger('/api/route-name', correlationId)
const requestTimer = createTimer(requestLogger, 'request-name')

requestLogger.info({
  userId: user.id,
  documentId,
  operation: 'ai-extraction',
  correlationId
}, 'Request initiated')

// AI operations with token tracking
logAIOperation('content-extraction', {
  modelProvider: 'anthropic',
  tokensUsed: result.usage.totalTokens,
  userId: user.id,
  documentId,
  correlationId
}, 'success')

// Complete request timing at end
requestTimer.end({ userId: user.id, documentId, correlationId })
```

**Mixed logging approach** (current):
- **Console.log**: Still used for immediate development feedback
- **Pino**: Added for structured production logging and correlation tracking
- **Migration**: Gradual replacement of console.log with Pino loggers

**Security & Privacy**:
- **Safe**: Log user IDs, document IDs, operation metadata, token usage
- **Private**: URL hostnames only (no query parameters), truncated search queries
- **Never log**: API keys, full document content, personal data, payment information

See `docs/reference/LOGGING_BEST_PRACTICES.md` for comprehensive patterns and examples.


## Error Handling

**Database Service Layer**: The database services now propagate errors instead of silently failing. This helps with debugging and ensures problems are noticed early:
- Methods throw descriptive errors with context
- "Not found" cases (error code PGRST116) return null instead of throwing
- No more `console.error` + `return null` patterns
- API routes should catch database errors and map to appropriate HTTP responses

This follows our principle: "Raise errors early, clearly & fatally" (see `docs/reference/CODING_PRINCIPLES.md`)


## Upload Metadata Tracking

The system now tracks comprehensive metadata for all document uploads (PDF and URL-based):

**Implementation Features**:
- Upload metadata stored in `documents.upload_metadata` JSONB field (extraction method, provider, processing time, file sizes, etc.)
- Full AI call traceability via `documents.upload_ai_call_id` foreign key to `ai_calls` table
- Implemented across both PDF upload (`/api/upload-pdf`) and URL extraction (`/api/extract-url`) APIs
- Enables debugging, analytics, and processing optimization

**Database Integration**:
- Migration: `supabase/migrations/20250608120000_add_upload_metadata_fields.sql`
- Types: Auto-generated in `lib/types/database.ts`
- Service: Updated `DocumentService.createWithStorage()` method to handle metadata


## Authentication System

The project includes a complete authentication system using Supabase Auth with Next.js App Router:

**Key Features**:
- Email/password and Google OAuth authentication
- Automatic user profile creation and document ownership tracking
- Route protection with server-side validation
- Long-lasting sessions (1 week) with automatic refresh
- Password reset flow with Gmail SMTP
- Profile management with dropdown navigation

**Documentation**:
- `docs/reference/AUTHENTICATION_OVERVIEW.md` - System architecture and flows
- `docs/reference/AUTHENTICATION_SETUP.md` - Configuration and deployment guide
- `docs/reference/AUTHENTICATION_UI.md` - UI components and forms
- `docs/reference/AUTHENTICATION_DATABASE.md` - Database integration and RLS
- `docs/reference/AUTHENTICATION_SECURITY.md` - Security practices and troubleshooting

**Implementation Files**:
- `lib/auth/` - Authentication utilities and server-side helpers
- `components/auth/` - UI components (login, signup, profile dropdown)
- `app/auth/` - Authentication pages and route handlers
- `middleware.ts` - Session management and token refresh


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
- `LLM_MODEL` - supports tier keys (`anthropic-cheap`, `google-balanced`) or model strings (`anthropic:claude-3-5-haiku:20241022`), defaults to Claude Sonnet 4, but we usually override to Haiku for development
- Supabase connection details (see `docs/reference/SETUP.md`)

Test environment (`.env.test`):
- Currently mirrors `.env.local` for simplicity (shared database approach)
- Best practice: Use cheaper LLM models (`LLM_MODEL=anthropic-cheap` or `LLM_MODEL=google:gemini-2.0-flash:latest`) for cost efficiency
- See `docs/reference/TESTING_SETUP.md` for setup instructions

Template: `.env.example` (may not be current - check `.env.local` for active config)


## Browser Automation

**Puppeteer MCP (Preferred)**:
- Use Puppeteer for browser automation tasks via MCP server
- **⚠️ CRITICAL - Port configuration**: Always check `.env.local` for the PORT variable before navigating. Different Git worktrees use different ports (3001, 3002, 3003, etc.), not the default 3000. This is essential for reliable testing.
- **Test credentials**: Use hello@spideryarn.com with password 'ASDFasdf1' (from `supabase/seed.sql`)
- **Headless by default**: Always use `{"headless": true}` in launchOptions unless user specifically requests visual debugging
- **Window size**: Set viewport in launchOptions and screenshot dimensions for proper page rendering:
  - `defaultViewport: {"width": 1200, "height": 800}` in launchOptions for better page layout
  - Use `width` and `height` parameters in screenshot calls (e.g., 1200x800)
  - Default 800x600 is often too small for modern web layouts
- **Port checking example**: 
  ```bash
  # Always check .env.local first
  PORT=$(grep "^PORT=" .env.local | cut -d'=' -f2)
  # Then navigate with the correct port
  mcp__puppeteer__puppeteer_navigate({url: "http://localhost:${PORT}/", launchOptions: {"headless": true, "defaultViewport": {"width": 1200, "height": 800}}})
  ```

**Playwright**: Available as alternative, but prefer Puppeteer for MCP integration


## Context window, tasks, and subagents

Use tasks whenever there's more than a couple of things to keep track of.

Use subagents where appropriate:
- e.g. for running a battery of tests, curl, Puppeteer/Playwright MCP or other browser automation, other verbose output, Git commits, any other verbose-output, and anywhere else where you think it's a good fit
- They are especially valuable as a way to avoid filling up your context window
- They are also a good fit for encapsulated & well-defined tasks, i.e. tasks that don't need the full context of the conversation so far, and/or where we only need a summary of what was done in order to proceed
- Use subagents in parallel where possible (because this is faster), but only if there isn't a dependency between tasks (e.g. the output of this one is useful as input for the next)
- Give them lots of background so that they can make good decisions, e.g. about goals, point them to relevant docs/code, what we've been changing, gotchas & things to avoid, relevant environment variables like $PORT for Puppeteer/Playwright, using Jest for testing, the current date/time from `date`, and anything else that will help them to be effective but correct/careful.
- Tell subagents what to be cautious of, and to abort and provide feedback on what happened if there are problems or surprises (to avoid them going rogue and doing more harm than good)


## Documentation Reference

see `docs/reference/DOCUMENTATION_ORGANISATION.md` for a comprehensive, navigational overview of all project documentation

Available evergreen documentation in `docs/` - here are some of the most useful.

Coding & infrastructure:
- `docs/reference/CODING_PRINCIPLES.md` - Outlines development principles prioritising simplicity, readability, debugging, and rapid prototyping for early-stage development
- `docs/reference/CODING_GUIDELINES.md` - Code quality standards including linting, TypeScript patterns, React best practices, and import conventions
- `docs/reference/COMMAND_LINE_SCRIPTS.md` - Guidelines for writing command-line scripts using shell scripts or TypeScript/Clipanion
- `docs/reference/ARCHITECTURE_OVERVIEW.md` - Current system architecture and implementation details
- `docs/reference/ARCHITECTURE_DECISIONS.md` - Key architectural decisions including framework choices, data structures, storage approach, and MVP features
- `docs/reference/STYLING_OVERVIEW.md` - CSS and visual styling configuration including theme settings, Phosphor icons usage, and loading/error button patterns
- `docs/reference/SETUP.md` - Development environment setup guide including Node.js, Supabase, Git worktree configuration, and common commands
- `docs/reference/SITE_ORGANISATION.md` - Documents the hierarchical, document-centric architecture including application routes, component hierarchy, and navigation patterns. (May be out of date)
- `docs/reference/TESTING_OVERVIEW.md` - Testing approach documentation covering Jest with React Testing Library setup, test structure, and current test coverage
- `docs/reference/TESTING_SETUP.md` - Test configuration and environment setup
- `docs/reference/TESTING_TROUBLESHOOTING.md` - Known testing issues and workarounds
- `docs/reference/TESTING_DATABASE.md` - Database-specific testing patterns including real RLS testing guide with security validation
- `docs/reference/TESTING_WITH_BROWSER_AUTOMATION.md` - Browser automation options (Playwright recommended over Puppeteer MCP) for E2E testing
- `docs/reference/UI_INTERFACE.md` - Documents the multi-pane layout with tabbed navigation including four-pane structure, tab system architecture, and scrolling fixes. See related docs below in "AI, features, machinery, interface" section.

Database:
- `docs/reference/DATABASE_OVERVIEW.md`
- `docs/reference/DATABASE_MIGRATIONS.md` - Guide for managing database schema changes through Supabase migrations with timestamped SQL files
- `docs/reference/DATABASE_SCHEMA.md` - Reference for both current (deprecated) schema and target schema showing the transition from element decomposition to single-row storage (VERY MUCH EVOLVING)

**Row Level Security (RLS) Testing**:
- **ALWAYS use real RLS testing**: Use `RLSTestDatabase` class in `lib/testing/rls-database-test-utils.ts`
- **AVOID simulation approaches**: Old simulation-based RLS tests have been deprecated for security reasons
- **Essential for security**: Real RLS testing discovered and fixed critical vulnerabilities
- **See**: `docs/reference/TESTING_DATABASE.md` for comprehensive real RLS testing patterns
- **Example**: `lib/services/database/__tests__/rls-policies-real.test.ts` for reference implementation

AI, features, machinery, interface:
- `docs/reference/TOOL_CHATBOT_ASSISTANT_UI_INTEGRATION.md` - Comprehensive technical guide for integrating the @assistant-ui/react library into the chatbot interface within the Tools pane
- `docs/reference/LLM_PROMPT_TEMPLATES.md` - Guide for creating AI/LLM calls using the Nunjucks + Zod template system with type safety and validation
- `docs/reference/MUTATIONS.md` - Documents the reversible document transformation system for applying/reverting changes like AI-generated headings and content filtering
- `docs/reference/UNIFIED_LEFT_PANE.md` - Architecture and features of the unified left pane with tabbed interface, ToC, AI-generated headings, and tooltip summaries
- `docs/reference/TOOL_GLOSSARY.md` - Documents the glossary feature that extracts key entities from documents using LLM analysis and displays them in a dedicated pane
- `docs/reference/TOOL_SUMMARISE.md` - Documents the AI summarise feature that generates hierarchical summaries of document content using LLM analysis at multiple granularity levels

Docs, modes, and admin:
- `docs/instructions/GIT_COMMIT_CHANGES.md` - Guidelines for Git commit best practices including batching changes, message format, and handling concurrent changes
- `docs/reference/PROJECT_STATUS.md` - Current development state overview showing implemented features (AI summaries, glossary, headings) and planned enhancements
- `docs/instructions/SOUNDING_BOARD_MODE.md` - Instructions for collaborative discussion mode emphasising asking questions and suggesting alternatives rather than immediate implementation
- `docs/instructions/WRITE_EVERGREEN_DOC.md` - Guidelines for writing evergreen documentation including structure, cross-references, status indicators, and maintenance practices
- `docs/instructions/WRITE_PLANNING_DOC.md` - Guide for writing planning/project management documents with file naming conventions, structure, and stage-based action plans
- `docs/instructions/UPDATE_HOUSEKEEPING_DOCUMENTATION.md` - Process for keeping project documentation up-to-date including review steps, update patterns, and quality checklist
- `docs/instructions/UPDATE_HOUSEKEEPING_TESTS.md` - Process for maintaining test quality and organisation while supporting rapid prototyping
- `docs/instructions/UPDATE_CLAUDE_INSTRUCTIONS.md` - Guidelines for maintaining CLAUDE.md to help AI agents operate effectively on the Spideryarn Reading codebase


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
- `docs/reference/STYLING_SHADCN_UI_REFERENCE.md` - Complete installation and usage guide
- `docs/reference/UI_COMPONENTS.md` - Available components and usage patterns

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

Follow the instructions in `docs/instructions/GIT_COMMIT_CHANGES.md`.


## Date

It is summer 2025.
