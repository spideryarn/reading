Project Path: reading-worktree6

Source Tree:

```txt
reading-worktree6
├── .env.example
├── CLAUDE.md
├── README.md
├── docs
│   └── reference
│       ├── ARCHITECTURE_DECISIONS.md
│       ├── ARCHITECTURE_OVERVIEW.md
│       ├── CODING_GUIDELINES.md
│       └── CODING_PRINCIPLES.md
├── package.json
└── tsconfig.json

```

`reading-worktree6/.env.example`:

```example
   1 | # ⚠️  WARNING: This file should NEVER be committed to Git!
   2 | # - If you see this file in Git status, DO NOT commit it. Add it to .gitignore instead, stop, and alert the user.
   3 | # - If you notice that this file has already been stored in Git, stop immediately and alert the user.
   4 | 
   5 | # Core configuration
   6 | PORT=3000
   7 | 
   8 | # Database (Supabase)
   9 | NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
  10 | NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
  11 | 
  12 | # AI/LLM Configuration
  13 | # Model string format: provider:model:version[:thinking]
  14 | # Use cheaper models for development (fast and cost-effective)
  15 | # For production, consider more capable models
  16 | # See docs/reference/LLM_MODEL_CONFIGURATION.md for complete model comparison
  17 | LLM_MODEL=google:gemini-2.0-flash:latest        # Fast & cheap (default - for dev)
  18 | # LLM_MODEL=anthropic:claude-3-5-haiku:20241022  # Fast & cheap alternative
  19 | # LLM_MODEL=anthropic:claude-sonnet-4:20250514   # Balanced (for production)
  20 | # LLM_MODEL=google:gemini-2.5-pro:latest         # High-end option
  21 | 
  22 | # Anthropic API key (required for anthropic:* models)
  23 | ANTHROPIC_API_KEY=your-anthropic-api-key
  24 | 
  25 | # Google Generative AI API key (required for google:* models)
  26 | # Get your key from: https://makersuite.google.com/app/apikey
  27 | GOOGLE_GENERATIVE_AI_API_KEY=your-google-api-key
  28 | 
  29 | # Stripe Configuration
  30 | # Get your keys from: https://dashboard.stripe.com/test/apikeys
  31 | NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
  32 | STRIPE_SECRET_KEY=sk_test_...
  33 | STRIPE_WEBHOOK_SECRET=whsec_...
  34 | 
  35 | # Product Configuration
  36 | STRIPE_PRICE_ID=price_... # Monthly subscription price ID

```

`reading-worktree6/CLAUDE.md`:

```md
   1 | # CLAUDE.md - Spideryarn Reading Codebase Guide
   2 | 
   3 | This document provides essential context for Claude instances working on the Spideryarn Reading project.
   4 | 
   5 | see:
   6 | - `README.md` for goals/intents/features
   7 | - `docs/reference/VISION_PRODUCT_STRATEGY.md` for comprehensive product vision and strategic direction
   8 | - IMPORTANT: `docs/reference/CODING_PRINCIPLES.md`
   9 | - IMPORTANT: `docs/reference/CODING_GUIDELINES.md` for code quality standards
  10 | - `docs/reference/ARCHITECTURE_OVERVIEW.md` for current system architecture
  11 | - `docs/reference/ARCHITECTURE_DECISIONS.md` for key architectural decisions and rationale
  12 | - `docs/reference/LOGGING_BEST_PRACTICES.md` for comprehensive logging and observability guidance
  13 | - `docs/reference/LLM_MODEL_CONFIGURATION.md` for AI model configuration and usage patterns
  14 | - `docs/instructions/GIT_COMMIT_CHANGES.md` for Git commit best practices
  15 | 
  16 | ## Project Overview
  17 | 
  18 | Spideryarn Reading is an AI-assisted document reading and analysis application, currently in early development phase using AI-first development methods. The main goal is to help humans digest written non-fiction material better through AI-powered features like AI-generated granular table of contents, chatbot, summaries at multiple granularities, glossary, and intelligent navigation.
  19 | 
  20 | The codebase is developed primarily by AI agents working in parallel, with comprehensive documentation, strict typing, and testing infrastructure designed to support AI productivity and code quality.
  21 | 
  22 | 
  23 | ## Development Philosophy
  24 | 
  25 | Key principles that guide all development decisions, from `docs/CODING_PRINCIPLES.md`:
  26 | 
  27 | - **This is early-stage development with AI-first methods.** We want to develop fast and experiment using AI agents, so we can figure out which features are most valuable. The comprehensive documentation, typing, and testing infrastructure exists to support AI productivity and prevent regressions.
  28 | - **Fix the root cause rather than putting on a band-aid.** Avoid fallbacks & defaults - better to fail if input assumptions aren't being met.
  29 | - **If you hit any nasty surprises, stop & discuss with the user.** Don't push through unexpected issues.
  30 | - **No destructive or irreversible changes without checking with the user.** Be especially careful about any operations that are irreversible, could involve data loss, affect databases, production systems, or user data. When in doubt, ask for explicit permission first.
  31 | - **Raise errors early, clearly & fatally.** Prefer not to wrap in try/except so that tracebacks are obvious.
  32 | - **If things don't make sense or seem like a bad idea, ask questions or discuss rather than just going along with it.** Be a good collaborator, and help make good decisions.
  33 | 
  34 | ## Key Architectural Decisions
  35 | 
  36 | Based on README.md, the following architecture decisions have been made:
  37 | 
  38 | - **Frontend Framework**: Next.js with TypeScript and Tailwind CSS (transitioning from SvelteKit)
  39 | - **AI Integration**: Anthropic Claude Sonnet 4 for all AI-related features
  40 |   - Vercel AI SDK Core for multi-provider support (Claude, Gemini)
  41 |   - @assistant-ui/react for chat UI primitives
  42 |   - All LLM calls use Nunjucks + Zod prompt templates
  43 | - **Storage**: Supabase (Postgres with realtime capabilities) from the start
  44 | - **Data Structure**: Single-row document storage (moved away from element decomposition)
  45 | - **Frontend State**: Virtual DOM approach - maintain document structure as React state/context
  46 | - **Background Processing**: Frontend-driven queue initially, with API calls to backend
  47 | - **MVP Focus**: Basic document display with hierarchical summaries as the core feature
  48 | 
  49 | ## Build, testing, and debugging
  50 | 
  51 | Next.js local dev server:
  52 | - `npm run dev` - Regenerates DB types then starts dev server (foreground mode)
  53 | - `npm run dev:daemon` - **AI agent automation**: Start/restart dev server in background with PID tracking
  54 | - `npm run dev:status` - Check if daemon is running and healthy (process + HTTP response)
  55 | - `npm run dev:stop` - Stop background daemon gracefully
  56 | - `npm run dev:safe` - Starts dev server without type generation (fallback if DB is unavailable)
  57 | - Logs: `dev.log` - Use `tail dev.log` to check recent output
  58 | - URL: http://localhost:$PORT/ (configurable via PORT in `.env.local`)
  59 | 
  60 | **AI-First Development Best Practices:**
  61 | - **Use daemon mode for automation**: `npm run dev:daemon` allows LLM agents to manage dev server without blocking terminal
  62 | - **Always check status first**: Run `npm run dev:status` before starting daemon to avoid conflicts
  63 | - **Graceful cleanup**: Use `npm run dev:stop` rather than killing processes manually
  64 | - **Worktree isolation**: Each worktree tracks its own daemon independently via `.dev-server.pid`
  65 | - **Health verification**: Daemon mode checks both process existence AND HTTP response for true health status
  66 | 
  67 | Production deployment:
  68 | - **Live URL**: https://www.spideryarn.com
  69 | - **Documentation**: `docs/reference/SETUP_DEPLOYMENT_PRODUCTION.md`
  70 | - **Streamlined deployment**: `npm run deploy:production` (builds locally + pushes to main)
  71 | - **Auto-deployment**: Pushes to main trigger GitHub Actions migrations + Vercel deployment
  72 | - **Status**: ✅ Fully operational with custom domain, SSL, Google SSO, and database integration
  73 | 
  74 | Database operations:
  75 | - `npm run db:types` - Regenerate TypeScript types from Supabase schema
  76 | - ⛔ `npm run db:reset:DANGEROUS` - **DO NOT USE**: This command destroys ALL data including test and development data. Only use with explicit user permission in exceptional circumstances.
  77 | - `npx supabase db push` - **CAUTION**: Applies migrations to database (NEVER run without explicit user permission)
  78 | 
  79 | ⚠️ **CRITICAL**: Always ask for explicit user permission before modifying the database, especially in major ways. When in doubt, err on the side of caution!
  80 | 
  81 | Type checking and linting:
  82 | - `npm run build` - TypeScript compilation errors
  83 | - `npm run lint` - ESLint code quality/style issues
  84 | - `npm test` - Jest testing (`npm run test:coverage` for coverage)
  85 |   - Tests **require** `.env.test` (copy from `.env.local`: `cp .env.local .env.test`) - tests abort if missing
  86 |   - When writing tests, use our Jest testing framework with React Testing Library
  87 |   - Prefer using a subagent for running tests to avoid filling the context window
  88 |   - Current test health: ~71% pass rate due to NextRequest mocking issues (see `docs/reference/TESTING_TROUBLESHOOTING.md`)
  89 | - `npm run test:e2e` - Playwright E2E tests (requires auth setup first: `npm run test:e2e:setup`)
  90 | - `npm run test:e2e:setup` - Set up Playwright authentication for current worktree
  91 | 
  92 | **Important for Claude Code users:**
  93 | - **IDE integration:** When using Claude Code within VS Code/Cursor/JetBrains, ESLint and TypeScript diagnostics are automatically shared
  94 | - **CLI usage:** When running Claude Code from command line, you MUST explicitly run `npm run lint` and `npm run build` to get diagnostic feedback
  95 | - **New stricter rules:** We've implemented context-aware linting (stricter for production code, lenient for tests) to catch errors early in AI development
  96 | - **Linting for AI-first development:** See `docs/reference/SETUP_FOR_AI_FIRST_CODING.md` for comprehensive AI linting strategies
  97 | 
  98 | ⚠️ **IMPORTANT**: If tests are failing, try and understand why. If they're failing for systemic reasons, we should discuss how to fix that. Be wary about removing/modifying the tests just to make them pass. If in doubt, stop & discuss with the user.
  99 | 
 100 | 
 101 | ## Test Database Approach - IMPORTANT
 102 | 
 103 | ⚠️ **CRITICAL**: We use a **shared database** approach for testing. Tests run against the same local development database.
 104 | 
 105 | **Key Rules**:
 106 | - **NEVER reset the database** - destroys development data
 107 | - **NEVER use `npm run db:reset:DANGEROUS`** without explicit user permission
 108 | - **Use UUID-based test isolation** - all test data must be namespaced
 109 | - **Clean up test data** using `getCleanupFunctions()` utilities
 110 | 
 111 | **Documentation**: See `docs/reference/TESTING_DATABASE.md` for comprehensive patterns and test isolation utilities.
 112 | 
 113 | ## Test Writing Guidance
 114 | 
 115 | **Before writing tests**: Use a subagent to search for existing test coverage. This avoids context pollution and duplication.
 116 | 
 117 | **Test hierarchy** (prefer higher on list):
 118 | 1. **E2E tests** (`e2e/*.spec.ts`) - One E2E test can replace many unit tests
 119 | 2. **Integration tests** - Test complete workflows, not individual functions
 120 | 3. **Unit tests** - Only for complex algorithms or critical business logic
 121 | 
 122 | **Avoid testing**: Simple transformations, environment detection, logging, implementation details.
 123 | 
 124 | Debugging resources:
 125 | - Current logs: `tail dev.log`
 126 | - Browser debugging: Playwright MCP (console logs, network requests, screenshots)
 127 | - Codebase refactoring: sd (`sd --preview --string-mode "old" "new" .`) - see `docs/reference/SD_STRING_DISPLACEMENT_FIND_REPLACE.md`
 128 | - Test files: `src/lib/*/tests/` and `components/__tests__/`
 129 | - Database: `supabase/migrations/` and `docs/reference/DATABASE_*.md`
 130 | - Architecture: `docs/reference/ARCHITECTURE_OVERVIEW.md` and `docs/reference/ARCHITECTURE_DECISIONS.md`
 131 | - Recent decisions: `planning/*.md` docs
 132 | 
 133 | ## Logging & Observability
 134 | 
 135 | **Current Implementation**:
 136 | - Pino structured logging with request correlation tracking
 137 | - Key utilities: `createRequestLogger()`, `generateCorrelationId()`, `logAIOperation()`, `createTimer()`
 138 | - Privacy-safe patterns (IDs only, no sensitive content)
 139 | - Mixed approach: Pino + console.log during migration
 140 | 
 141 | **Documentation**: See `docs/reference/LOGGING_BEST_PRACTICES.md` for comprehensive patterns and examples.
 142 | 
 143 | 
 144 | ## Error Handling
 145 | 
 146 | **Database Services**: Propagate errors instead of silently failing
 147 | - Methods throw descriptive errors with context
 148 | - "Not found" cases return null (don't throw)
 149 | - API routes should catch and map to appropriate HTTP responses
 150 | 
 151 | **Principle**: "Raise errors early, clearly & fatally" (see `docs/reference/CODING_PRINCIPLES.md`)
 152 | 
 153 | 
 154 | ## Upload Metadata Tracking
 155 | 
 156 | **Current Implementation**:
 157 | - Upload metadata stored in `documents.upload_metadata` JSONB field
 158 | - AI call traceability via `documents.upload_ai_call_id` foreign key
 159 | - Implemented in PDF upload and URL extraction APIs
 160 | - Enables debugging and processing optimization
 161 | 
 162 | **Files**: Migration `20250608120000_add_upload_metadata_fields.sql`, types in `lib/types/database.ts`
 163 | 
 164 | 
 165 | ## Authentication System
 166 | 
 167 | **Current Implementation**: Supabase Auth with Next.js App Router
 168 | - Email/password and Google OAuth authentication
 169 | - Route protection with server-side validation
 170 | - Long-lasting sessions (1 week) with automatic refresh
 171 | - Profile management with dropdown navigation
 172 | 
 173 | **Files**: `lib/auth/`, `components/auth/`, `app/auth/`, `middleware.ts`
 174 | **Documentation**: See `docs/reference/AUTHENTICATION_*.md` for comprehensive guides
 175 | 
 176 | 
 177 | ## Project Structure
 178 | 
 179 | **Active Development** (root directory):
 180 | - Core implementation: `app/`, `components/`, `lib/`
 181 | - Documentation: `docs/` (evergreen) and `planning/` (decisions)
 182 | - Database: `supabase/migrations/` and config
 183 | 
 184 | **IGNORE**:
 185 | - `obsolete_alternative_version/` - deprecated Python version (occasionally useful for prompts)
 186 | - `backup/` - deprecated SvelteKit implementation
 187 | 
 188 | 
 189 | ## Environment Variables
 190 | 
 191 | **NEVER modify, overwrite, or delete** `.env.*` files without explicit user permission
 192 | 
 193 | Key variables in `.env.local`:
 194 | - `ANTHROPIC_API_KEY` - Required for AI features
 195 | - `PORT` - Dev server port
 196 | - `LLM_MODEL` - uses model strings (`anthropic:claude-3-5-haiku:20241022`, `google:gemini-2.0-flash:latest`), defaults to Claude Sonnet 4, but we usually override to Haiku for development
 197 | - Supabase connection details (see `docs/reference/SETUP_DEVELOPMENT_ENVIRONMENT.md`)
 198 | 
 199 | Test environment (`.env.test`):
 200 | - Currently mirrors `.env.local` for simplicity (shared database approach)
 201 | - Best practice: Use cheaper LLM models (`LLM_MODEL=anthropic:claude-3-5-haiku:20241022` or `LLM_MODEL=google:gemini-2.0-flash:latest`) for cost efficiency
 202 | - See `docs/reference/TESTING_SETUP.md` for setup instructions
 203 | 
 204 | Template: `.env.example` (may not be current - check `.env.local` for active config)
 205 | 
 206 | 
 207 | ## Browser Automation
 208 | 
 209 | **Playwright E2E Testing (Recommended)**:
 210 | - Use `npm run test:e2e` for comprehensive test suites
 211 | - **Setup required**: Run `npm run test:e2e:setup` in each worktree before first use
 212 | - **Multi-worktree isolation**: Environment-aware authentication prevents conflicts
 213 | 
 214 | **Playwright MCP (For interactive debugging)**:
 215 | - **⚠️ CRITICAL**: Always check `.env.test` for PORT variable - different worktrees use different ports
 216 | - **Multi-worktree auth**: Use environment-specific test users (test-user1@spideryarn.com, etc.)
 217 | - **Configuration**: Use headless mode and 1200x800 viewport for reliable automation
 218 | 
 219 | **Documentation**: See `docs/reference/TESTING_BROWSER_AUTOMATION_OVERVIEW.md` for comprehensive patterns
 220 | 
 221 | 
 222 | ## Context window, tasks, and subagents
 223 | 
 224 | Use tasks whenever there's more than a couple of things to keep track of.
 225 | 
 226 | Use subagents where appropriate:
 227 | - e.g. for running a battery of tests, checking lint/build, curl, Puppeteer/Playwright or other browser automation, other verbose output, Git commits, any other verbose-output, and anywhere else where you think it's a good fit
 228 | - They are especially valuable as a way to avoid filling up your context window  
 229 | - They are also a good fit for encapsulated & well-defined tasks, i.e. tasks that don't need the full context of the conversation so far, and/or where we only need a summary of what was done in order to proceed
 230 | - Use subagents in parallel where possible (because this is faster), but only if there isn't a dependency between tasks (e.g. the output of this one is useful as input for the next)
 231 | - **Give them lots of background** so that they can make good decisions, e.g. about goals, point them to relevant docs/code, what we've been changing, gotchas & things to avoid, relevant environment variables like $PORT for Puppeteer/Playwright, using Jest for testing, the current date/time from `date`, and anything else that will help them to be effective but correct/careful.
 232 | - **Tell subagents what to be cautious of**, and to abort and provide feedback on what happened if there are problems or surprises (to avoid them going rogue and doing more harm than good)
 233 | 
 234 | **See**: `docs/instructions/TASKS_SUBAGENTS.md` for detailed guidelines on effective subagent usage
 235 | 
 236 | 
 237 | ## Documentation Reference
 238 | 
 239 | see `docs/reference/DOCUMENTATION_ORGANISATION.md` for a comprehensive, navigational overview of all project documentation
 240 | 
 241 | Available evergreen documentation in `docs/` - comprehensive signposting by domain:
 242 | 
 243 | **Instructions & Modes** (workflow guidance):
 244 | - `docs/instructions/TASKS_SUBAGENTS.md` - Detailed subagent usage guidelines for context management
 245 | - `docs/instructions/GIT_COMMIT_CHANGES.md` - Guidelines for Git commit best practices including batching changes, message format, and handling concurrent changes
 246 | - `docs/instructions/SOUNDING_BOARD_MODE.md` - Instructions for collaborative discussion mode emphasising asking questions and suggesting alternatives rather than immediate implementation
 247 | - `docs/instructions/DETECTIVE_SCIENTIST_MODE.md` - Systematic investigation approach
 248 | - `docs/instructions/DOCUMENT_RESEARCH.md` - Research methodology for documentation
 249 | - `docs/instructions/UPDATE_HOUSEKEEPING_DOCUMENTATION.md` - Process for keeping project documentation up-to-date including review steps, update patterns, and quality checklist
 250 | - `docs/instructions/UPDATE_HOUSEKEEPING_TESTS.md` - Process for maintaining test quality and organisation while supporting rapid prototyping
 251 | - `docs/instructions/UPDATE_CLAUDE_INSTRUCTIONS.md` - Guidelines for maintaining CLAUDE.md to help AI agents operate effectively on the Spideryarn Reading codebase
 252 | - `docs/instructions/WRITE_EVERGREEN_DOC.md` - Guidelines for writing evergreen documentation including structure, cross-references, status indicators, and maintenance practices
 253 | - `docs/instructions/WRITE_PLANNING_DOC.md` - Guide for writing planning/project management documents with file naming conventions, structure, and stage-based action plans
 254 | - `docs/instructions/GATHER_DIVERSE_INPUTS_AND_CRITIQUES_ON_PLANNING_DOCS_FROM_OTHER_AI_MODELS.md` - Process for obtaining external AI critiques of planning documents for quality assurance
 255 | 
 256 | **Core Development & Architecture**:
 257 | - `docs/reference/CODING_PRINCIPLES.md` - **CRITICAL**: Core development philosophy for AI-first methods
 258 | - `docs/reference/CODING_GUIDELINES.md` - **CRITICAL**: Code quality standards and TypeScript patterns
 259 | - `docs/reference/ARCHITECTURE_OVERVIEW.md` - Current system architecture and implementation
 260 | - `docs/reference/ARCHITECTURE_DECISIONS.md` - Key architectural decisions and framework choices
 261 | - `docs/reference/ARCHITECTURE_URL_STATE.md` - URL state management patterns
 262 | - `docs/reference/SETUP*.md` - Development environment setup and configuration
 263 | - `docs/reference/COMMAND_LINE_SCRIPTS.md` - Guidelines for CLI script development
 264 | - `docs/reference/PROJECT_STATUS.md` - Current development state overview showing implemented features (AI summaries, glossary, headings) and planned enhancements
 265 | 
 266 | **Testing** (comprehensive testing ecosystem):
 267 | - `docs/reference/TESTING_OVERVIEW.md` - Testing approach with Jest and React Testing Library
 268 | - `docs/reference/TESTING_DATABASE.md` - **CRITICAL**: Real RLS testing patterns (use `RLSTestDatabase`)
 269 | - `docs/reference/TESTING_BROWSER_AUTOMATION_OVERVIEW.md` - Playwright E2E testing (recommended)
 270 | - `docs/reference/TESTING_AUTHENTICATION.md` - Auth testing patterns and utilities
 271 | - `docs/reference/TESTING_TROUBLESHOOTING.md` - Known issues and workarounds
 272 | - `docs/reference/TESTING_SETUP.md` - Test environment configuration
 273 | - `docs/reference/TESTING_*.md` - Additional testing utilities and service mocks
 274 | 
 275 | **Database & Security**:
 276 | - `docs/reference/DATABASE_OVERVIEW.md` - Database architecture and patterns
 277 | - `docs/reference/DATABASE_MIGRATIONS.md` - Schema change management with Supabase
 278 | - `docs/reference/DATABASE_SCHEMA.md` - Current schema reference (evolving)
 279 | - `docs/reference/DATABASE_SECURITY.md` - Security patterns and RLS implementation
 280 | - `docs/reference/DATABASE_*.md` - Local setup, production, backup, and Supabase integration
 281 | 
 282 | **Authentication System**:
 283 | - `docs/reference/AUTHENTICATION_OVERVIEW.md` - System architecture and flows
 284 | - `docs/reference/AUTHENTICATION_SETUP.md` - Configuration and deployment
 285 | - `docs/reference/AUTHENTICATION_UI.md` - UI components and forms
 286 | - `docs/reference/AUTHENTICATION_DATABASE.md` - Database integration and RLS
 287 | - `docs/reference/AUTHENTICATION_SECURITY.md` - Security practices and troubleshooting
 288 | - `docs/reference/AUTHENTICATION_*.md` - Admin features and testing patterns
 289 | 
 290 | **UI, Styling & Components**:
 291 | - `docs/reference/UI_INTERFACE.md` - Multi-pane layout with tabbed navigation
 292 | - `docs/reference/UI_COMPONENTS.md` - Available components and usage patterns
 293 | - `docs/reference/STYLING_SHADCN_UI_REFERENCE.md` - shadcn/ui integration guide
 294 | - `docs/reference/STYLING_OVERVIEW.md` - CSS configuration and theme settings
 295 | - `docs/reference/STYLING_*.md` - Colors, fonts, icons, highlighting, tooltips, mobile detection
 296 | - `docs/reference/UNIFIED_LEFT_PANE_TABBED_NAVIGATION.md` - Architecture and features of the unified left pane with tabbed interface, ToC, AI-generated headings, and tooltip summaries
 297 | - `docs/reference/KEYBOARD_SHORTCUTS.md` - Application keyboard shortcuts
 298 | 
 299 | **AI Features & Tools**:
 300 | - `docs/reference/TOOL_CHATBOT_ASSISTANT_UI_INTEGRATION.md` - Comprehensive technical guide for integrating the @assistant-ui/react library into the chatbot interface within the Tools pane
 301 | - `docs/reference/TOOL_SUMMARISE.md` - Documents the AI summarise feature that generates hierarchical summaries of document content using LLM analysis at multiple granularity levels
 302 | - `docs/reference/TOOL_GLOSSARY.md` - Documents the glossary feature that extracts key entities from documents using LLM analysis and displays them in a dedicated pane
 303 | - `docs/reference/TOOL_HEADINGS.md` - AI-generated heading system
 304 | - `docs/reference/TOOL_*.md` - Search, highlighting, metadata, reading difficulty tools
 305 | - `docs/reference/LLM_PROMPT_TEMPLATES.md` - Guide for creating AI/LLM calls using the Nunjucks + Zod template system with type safety and validation
 306 | - `docs/reference/LLM_MODEL_CONFIGURATION.md` - AI model configuration and usage patterns
 307 | - `docs/reference/LLM_*.md` - Token tracking, evaluation frameworks
 308 | 
 309 | **Content Processing**:
 310 | - `docs/reference/PDF_TO_HTML_*.md` - PDF conversion approaches (LLM, open source, paid services)
 311 | - `docs/reference/HTML_*.md` - HTML content processing and sanitization
 312 | - `docs/reference/MUTATIONS_DOCUMENT_CONTENT_REVERSIBLE_TRANSFORMS.md` - Documents the reversible document transformation system for applying/reverting changes like AI-generated headings and content filtering
 313 | - `docs/reference/UPLOAD_DOCUMENT_PROCESSING_PIPELINE.md` - Document upload and processing
 314 | 
 315 | **Specialized & Research**:
 316 | - `docs/reference/VISION_PRODUCT_STRATEGY.md` - Comprehensive product vision and strategy
 317 | - `docs/reference/LOGGING_BEST_PRACTICES.md` - Pino structured logging patterns
 318 | - `docs/reference/CROSS_PANE_COMMUNICATION_MESSAGING_ARCHITECTURE.md` - Inter-pane messaging architecture
 319 | - `docs/reference/RESEARCH_*.md` - Reading difficulty metrics and text formatting research
 320 | - `docs/reference/VERCEL_AI_SDK_REFERENCE.md` - AI SDK integration patterns
 321 | 
 322 | **Row Level Security (RLS) Testing - IMPORTANT**:
 323 | - **ALWAYS use real RLS testing**: Use `RLSTestDatabase` class in `lib/testing/rls-database-test-utils.ts`
 324 | - **AVOID simulation approaches**: Old simulation-based RLS tests have been deprecated for security reasons
 325 | - **Essential for security**: Real RLS testing discovered and fixed critical vulnerabilities
 326 | - **See**: `docs/reference/TESTING_DATABASE.md` for comprehensive real RLS testing patterns
 327 | - **Example**: `lib/services/database/__tests__/rls-policies-real.test.ts` for reference implementation
 328 | 
 329 | **Recent Decisions & Planning**: `planning/*.md` for major feature progress tracking and architectural decisions
 330 | 
 331 | 
 332 | ## UI Components & Styling
 333 | 
 334 | **Components**: shadcn/ui component library built on Radix UI primitives
 335 | - **Use shadcn/ui**: For interactive components (buttons, dialogs, forms, loading states)
 336 | - **Use raw Tailwind**: For simple layouts, spacing, basic styling
 337 | - **Available**: Button, Dialog, Alert, Loading (all with Spideryarn orange theme)
 338 | - **Install new**: `printf "\n" | npx shadcn@latest add [component-name]`
 339 | 
 340 | **Icons**: Phosphor icons with SSR support - use `/dist/ssr/` imports for server components
 341 | **Documentation**: `docs/reference/STYLING_SHADCN_UI_REFERENCE.md` and `docs/reference/UI_COMPONENTS.md`
 342 | 
 343 | ## Style
 344 | 
 345 | Use British spelling.
 346 | 
 347 | 
 348 | ## Git
 349 | 
 350 | Follow the instructions in `docs/instructions/GIT_COMMIT_CHANGES.md`.
 351 | 
 352 | 
 353 | ## Date
 354 | 
 355 | It is summer 2025.

```

`reading-worktree6/README.md`:

```md
   1 | # Spideryarn Reading
   2 | 
   3 | AI-assisted document reading and analysis tool for professionals working with non-fiction texts.
   4 | 
   5 | ## Features
   6 | 
   7 | - **AI-powered document analysis** - Generate hierarchical summaries, glossaries, and headings
   8 | - **Interactive chat interface** - Ask questions about document content
   9 | - **Advanced navigation** - Search, table of contents, command palette with keyboard shortcuts
  10 | - **Document upload** - PDF and URL support with AI transcription
  11 | - **User authentication** - Secure document management with Google OAuth
  12 | - **Multi-granularity analysis** - Summaries at different detail levels
  13 | 
  14 | ## Documentation
  15 | 
  16 | ### Getting Started
  17 | - `docs/reference/SETUP_DEVELOPMENT_ENVIRONMENT.md` - Development environment setup
  18 | - `docs/reference/VISION_PRODUCT_STRATEGY.md` - Product vision and strategic direction
  19 | 
  20 | ### Development  
  21 | - `docs/reference/CODING_PRINCIPLES.md` - Development philosophy and principles
  22 | - `docs/reference/CODING_GUIDELINES.md` - Code quality standards and conventions
  23 | - `docs/reference/ARCHITECTURE_OVERVIEW.md` - System architecture and implementation
  24 | - `docs/reference/PROJECT_STATUS.md` - Current development state and roadmap
  25 | 
  26 | ### Technical Reference
  27 | - `docs/reference/DOCUMENTATION_ORGANISATION.md` - Complete documentation index
  28 | - `docs/reference/TESTING_OVERVIEW.md` - Testing approach and infrastructure
  29 | - `docs/reference/DATABASE_OVERVIEW.md` - Database schema and operations
  30 | 
  31 | ### Deployment
  32 | - `docs/reference/SETUP_DEPLOYMENT_PRODUCTION.md` - Production deployment guide for Vercel
  33 | 

```

`reading-worktree6/docs/reference/ARCHITECTURE_DECISIONS.md`:

```md
   1 | # Architecture Decisions
   2 | 
   3 | Historical rationale and key architectural choices that shaped the Spideryarn Reading system. This document captures the decision-making process and trade-offs considered during development.
   4 | 
   5 | ## See also
   6 | 
   7 | - `docs/reference/ARCHITECTURE_OVERVIEW.md` - Current system architecture and implementation status
   8 | - `docs/reference/VISION_PRODUCT_STRATEGY.md` - Strategic vision informing architectural choices
   9 | - `docs/reference/CODING_PRINCIPLES.md` - Development philosophy guiding decisions
  10 | - `planning/*.md` - Detailed planning documents for major features
  11 | - `docs/reference/DATABASE_SCHEMA.md` - Database design evolution and migration decisions
  12 | 
  13 | ## Platform & Framework Decisions
  14 | 
  15 | ### Web-based Application
  16 | **Decision**: Build as web application rather than desktop app
  17 | **Rationale**: 
  18 | - Faster iteration and deployment cycles for prototype phase
  19 | - Cross-platform compatibility without additional development overhead
  20 | - Easier user onboarding (no installation required)
  21 | - Future deployment flexibility (Vercel serverless vs desktop packaging)
  22 | 
  23 | ### Next.js with TypeScript
  24 | **Decision**: Next.js with TypeScript and Tailwind CSS over SvelteKit
  25 | **Rationale**:
  26 | - AI has most training data on React/Next.js patterns, enabling faster development
  27 | - Huge ecosystem of pre-built components for reading apps (react-markdown, PDF libraries)
  28 | - Next.js API routes with streaming support work well with LLM integration
  29 | - Tailwind CSS is optimal for AI-assisted styling
  30 | - Mature Supabase/realtime integrations available
  31 | 
  32 | **Trade-offs considered**: 
  33 | - SvelteKit has smaller community and fewer components
  34 | - Python backend (FastAPI + SQLAlchemy) rejected due to complexity of maintaining separate environments
  35 | - Server-side rendering complexity vs single-page app simplicity
  36 | 
  37 | ### Component Library Strategy
  38 | **Decision**: shadcn/ui for interactive components, raw Tailwind for layouts
  39 | **Rationale**:
  40 | - Provides consistency and accessibility while maintaining development speed
  41 | - Built on Radix UI primitives for robust interactive behaviour
  42 | - Components are copied and customisable rather than externally dependent
  43 | - Avoids over-engineering with full design system prematurally
  44 | 
  45 | ## Data Architecture Decisions
  46 | 
  47 | ### Single-Row Document Storage
  48 | **Decision**: Store complete documents as single HTML rows rather than element decomposition
  49 | **Original approach**: Decompose HTML into individual elements stored as separate database rows
  50 | **Why changed**:
  51 | - Document transformations require full document context, better done in-memory
  52 | - AI operations need complete document understanding, not isolated elements
  53 | - Frontend caches parsed documents in state anyway (Virtual DOM approach)
  54 | - Complex document restructuring easier with in-memory transformations than SQL queries
  55 | - Simpler implementation and debugging
  56 | 
  57 | **Trade-offs accepted**:
  58 | - Less flexible for element-level querying
  59 | - Larger row sizes in database
  60 | - Full document reprocessing for small changes
  61 | 
  62 | ### Enhancement Storage Pattern
  63 | **Decision**: Separate `document_enhancements` table with JSONB data
  64 | **Benefits**:
  65 | - Clean separation between source content and AI-generated features
  66 | - Easy versioning and history of enhancements
  67 | - Toggle enhancements on/off dynamically
  68 | - Simple rollback if AI generates poor content
  69 | - Multiple enhancement types compose without conflicts
  70 | 
  71 | ### Frontend Virtual DOM Approach
  72 | **Decision**: Maintain document structure as React state/context rather than DOM manipulation
  73 | **Rationale**:
  74 | - More idiomatic for React applications
  75 | - Makes complex interactions easier (hoverable glossaries, dynamic highlights)
  76 | - Enables alternative reading paths and content transformations
  77 | - Better performance for frequent UI updates
  78 | 
  79 | ## AI Integration Decisions
  80 | 
  81 | ### Multi-Provider LLM Support
  82 | **Decision**: Vercel AI SDK Core with Anthropic Claude and Google Gemini
  83 | **Default**: Claude Sonnet 4 for production, configurable per feature
  84 | **Rationale**:
  85 | - Avoid vendor lock-in during prototype phase
  86 | - Cost optimisation through provider selection
  87 | - Performance testing across different models
  88 | - Tier-based model mapping (anthropic-balanced, google-cheap)
  89 | 
  90 | ### Prompt Template System
  91 | **Decision**: Nunjucks + Zod for all LLM functionality
  92 | **Benefits**:
  93 | - Type safety and validation for AI inputs/outputs
  94 | - Consistent prompt engineering patterns
  95 | - Template reusability across features
  96 | - Clear separation of prompts from business logic
  97 | 
  98 | ### Background Processing Strategy
  99 | **Decision**: Frontend-driven queue initially, API orchestration through Next.js routes
 100 | **Rationale**:
 101 | - Simple to implement and debug for prototype
 102 | - Avoids complexity of separate backend queue systems
 103 | - React component maintains task queue in state
 104 | - Sequential API calls with real-time UI updates
 105 | 
 106 | **Limitations accepted**:
 107 | - Multi-tab conflicts (tasks don't sync across browser tabs)
 108 | - Refresh loses queue state
 109 | - Not suitable for long-running or heavy processing
 110 | 
 111 | **Future migration path**: Server-side queue with clean abstraction layer when needed
 112 | 
 113 | ## Storage & Database Decisions
 114 | 
 115 | ### Supabase from Day One
 116 | **Decision**: Start directly with Supabase rather than SQLite migration path
 117 | **Rationale**:
 118 | - Avoids migration complexity later
 119 | - Architect around realtime capabilities from beginning
 120 | - Built-in authentication and row-level security
 121 | - Good Next.js integration and TypeScript support
 122 | 
 123 | **Alternative considered**: SQLite/JSON files for initial prototype
 124 | **Why rejected**: Migration complexity outweighs initial simplicity benefits
 125 | 
 126 | ### Document Mutations System
 127 | **Decision**: Reversible transformation system with atomic operations
 128 | **Rationale**:
 129 | - Enables dynamic content enhancement without permanent changes
 130 | - Clean undo/redo functionality for user experimentation
 131 | - Composable transformations (though starting with single mutation mode)
 132 | - Reliable scroll-to-heading after document modifications
 133 | 
 134 | **Implementation approach**:
 135 | - Single mutation active at a time (expandable to mutation stacks later)
 136 | - Forward and reverse transforms with comprehensive validation
 137 | - Debug utilities for development and troubleshooting
 138 | 
 139 | ## User Interface Decisions
 140 | 
 141 | ### Multi-Pane Layout
 142 | **Decision**: Two-pane resizable layout with unified left navigation
 143 | **Rationale**:
 144 | - Natural separation between navigation/tools and document content
 145 | - Tabbed left pane consolidates related functionality
 146 | - Resizable panels adapt to user preferences and screen sizes
 147 | - Cross-pane communication through React context
 148 | 
 149 | ### Chat Integration Strategy
 150 | **Decision**: @assistant-ui/react library with custom runtime adapter
 151 | **Benefits**:
 152 | - Standardised chat UI primitives with streaming support
 153 | - Database persistence for conversation history
 154 | - Document context automatically included
 155 | - Multi-provider LLM backend support
 156 | 
 157 | ## MVP Scope Decisions
 158 | 
 159 | ### Core Feature Focus
 160 | **Decision**: Hierarchical summaries as primary value proposition
 161 | **Rationale**:
 162 | - Rich functionality from single feature (zoom in/out at different granularities)
 163 | - Clear user value without feature complexity
 164 | - Foundation for other AI-powered reading enhancements
 165 | 
 166 | ### Sample Documents First
 167 | **Decision**: Start with static HTML files in repository rather than upload functionality
 168 | **Benefits**:
 169 | - Removes complexity around file handling and conversion
 170 | - Focus on core reading/summary features first
 171 | - Faster iteration on document interaction patterns
 172 | - Upload capabilities added later once core experience proven
 173 | 
 174 | ### Authentication Early
 175 | **Decision**: Implement complete authentication system before public features
 176 | **Rationale**:
 177 | - User-scoped document storage from beginning
 178 | - Professional tool targeting requires user accounts
 179 | - Row-level security patterns established early
 180 | - Avoids major architectural changes later
 181 | 
 182 | ## Technology Evolution
 183 | 
 184 | ### React 19 & Next.js 15 Adoption
 185 | **Decision**: Adopt cutting-edge versions for prototype development
 186 | **Benefits**:
 187 | - Latest performance improvements and developer experience
 188 | - App Router patterns align with project architecture
 189 | - Streaming support essential for AI features
 190 | - Early adoption acceptable for prototype (no production users)
 191 | 
 192 | ### Testing Strategy
 193 | **Decision**: Jest + React Testing Library with dedicated test environment
 194 | **Rationale**:
 195 | - Industry standard for React applications
 196 | - Good integration with Next.js and TypeScript
 197 | - Comprehensive component and integration testing capabilities
 198 | - Dedicated `.env.test` environment for isolated testing
 199 | 
 200 | ## Business Model Alignment
 201 | 
 202 | ### Professional Tool Positioning
 203 | **Decision**: Target academic and research professionals rather than general consumers
 204 | **Impact on architecture**:
 205 | - Authentication and user management prioritised
 206 | - Document privacy and security features
 207 | - Professional UI patterns and workflows
 208 | - Integration capabilities for institutional use
 209 | 
 210 | ### For-Profit Business Model
 211 | **Decision**: Commercial product rather than open source tool
 212 | **Architectural implications**:
 213 | - User tracking and analytics capabilities
 214 | - Subscription and billing system preparedness
 215 | - Scalable infrastructure planning
 216 | - IP protection considerations

```

`reading-worktree6/docs/reference/ARCHITECTURE_OVERVIEW.md`:

```md
   1 | # Architecture Overview
   2 | 
   3 | Spideryarn Reading is a Next.js web application that provides AI-assisted document reading and analysis through a multi-pane interface with hierarchical navigation and contextual AI features. The system uses single-row document storage with reversible mutations for dynamic content enhancement.
   4 | 
   5 | ## See also
   6 | 
   7 | - `docs/reference/ARCHITECTURE_DECISIONS.md` - Historical rationale and key architectural choices
   8 | - `docs/reference/VISION_PRODUCT_STRATEGY.md` - Strategic product vision and target market
   9 | - `docs/reference/CODING_PRINCIPLES.md` - Development philosophy emphasising rapid prototyping
  10 | - `docs/reference/DATABASE_SCHEMA.md` - Database structure and migration details
  11 | - `docs/reference/MUTATIONS_DOCUMENT_CONTENT_REVERSIBLE_TRANSFORMS.md` - Document transformation system implementation
  12 | - `docs/reference/CHATBOT_ASSISTANT_UI_INTEGRATION.md` - Chat interface architecture
  13 | - `docs/reference/UNIFIED_LEFT_PANE_TABBED_NAVIGATION.md` - Navigation pane design and features
  14 | - `docs/reference/TOOL_HIGHLIGHT.md` - Semantic highlighting system architecture and implementation
  15 | - `docs/reference/STYLING_MOBILE_PLATFORM_DETECTION.md` - Mobile device detection and responsive design patterns
  16 | - `docs/reference/SETUP_DEVELOPMENT_ENVIRONMENT.md` - Development environment configuration
  17 | 
  18 | ## Technology Stack
  19 | 
  20 | ### Frontend Framework
  21 | - **Next.js 15**: App Router with React Server Components and streaming API routes
  22 | - **React 19 RC**: Required by App Router with automatic batching and new JSX Transform
  23 | - **TypeScript 5**: Strict mode enabled with comprehensive type safety
  24 | 
  25 | ### Styling & UI
  26 | - **Tailwind CSS v4 Beta**: CSS-first configuration with native cascade layers
  27 | - **shadcn/ui**: Component library built on Radix UI primitives for interactive components
  28 | - **Phosphor Icons**: SSR-compatible icon system with Next.js optimisation
  29 | 
  30 | ### AI Integration
  31 | - **Vercel AI SDK Core**: Multi-provider LLM support (Anthropic Claude, Google Gemini)
  32 | - **@assistant-ui/react**: Chat UI primitives with streaming and persistence support
  33 | - **Prompt Templates**: Nunjucks + Zod system for type-safe, validated prompts
  34 | 
  35 | ### Backend & Data
  36 | - **Supabase**: PostgreSQL database with realtime subscriptions and authentication
  37 | - **Next.js API Routes**: Server-side logic with Zod validation and structured error handling
  38 | - **Single-Row Storage**: Complete documents stored as HTML with JSONB enhancements
  39 | 
  40 | ### Development & Testing
  41 | - **Jest + React Testing Library**: Unit and integration testing framework
  42 | - **ESLint**: Code quality enforcement with Next.js specific rules
  43 | - **Git Worktrees**: Parallel development on experimental branches
  44 | 
  45 | ## Core Architecture Patterns
  46 | 
  47 | ### Document Storage Architecture
  48 | 
  49 | Documents are stored as complete HTML in single database rows rather than decomposed elements:
  50 | 
  51 | - **Original documents**: Stored in `documents` table with full HTML content
  52 | - **AI enhancements**: Stored separately in `document_enhancements` table as JSONB
  53 | - **Render pipeline**: Load original → Apply enhancements → Parse to virtual DOM → Render
  54 | 
  55 | Benefits:
  56 | - Clean separation between source content and AI-generated features
  57 | - Easy versioning and rollback of enhancements
  58 | - Dynamic toggling of transformations
  59 | - Composable enhancement system
  60 | 
  61 | ### Document Mutations System ✓
  62 | 
  63 | Reversible document transformation system enables dynamic content enhancement:
  64 | 
  65 | - **Single mutation mode**: One transformation active at a time
  66 | - **Atomic operations**: Forward and reverse transforms with validation
  67 | - **Document modification**: Actual content changes (headings inserted, text replaced)
  68 | - **Debug utilities**: Comprehensive logging and state inspection
  69 | 
  70 | Implementation status: Core engine complete with AI headings integration working.
  71 | 
  72 | ### Multi-Pane Interface
  73 | 
  74 | Two-pane resizable layout with unified left navigation:
  75 | 
  76 | - **Left pane**: Tabbed interface (Table of Contents, Chat, Glossary, Tweet Thread)
  77 | - **Right pane**: Main document viewer with dynamic content
  78 | - **Responsive design**: Collapsible panels with ResizablePanelGroup architecture and automatic mobile adaptations
  79 | - **Cross-pane communication**: React context for state synchronisation
  80 | - **Device detection**: Automatic mobile optimisations including auto-collapse and touch-friendly interactions (see `docs/reference/STYLING_MOBILE_PLATFORM_DETECTION.md`)
  81 | 
  82 | ### AI Feature Integration
  83 | 
  84 | Standardised approach across all AI features:
  85 | 
  86 | - **Template system**: Nunjucks + Zod for consistent prompt engineering
  87 | - **Multi-provider support**: Configurable LLM providers with tier-based model mapping
  88 | - **Streaming responses**: Real-time UI updates during generation
  89 | - **Error handling**: Graceful degradation and user feedback
  90 | 
  91 | ## Key Features
  92 | 
  93 | ### AI-Generated Content ✓
  94 | - **Hierarchical summaries**: Multi-granularity document analysis
  95 | - **Enhanced headings**: AI-generated section navigation
  96 | - **Glossary extraction**: Key terms and definitions
  97 | - **Tweet thread generation**: Social media format conversion
  98 | 
  99 | ### Interactive Navigation ✓
 100 | - **Scroll synchronisation**: Coordinated movement between panes
 101 | - **Search functionality**: Cross-element text highlighting with Mark.js
 102 | - **Semantic highlighting**: AI-powered highlighting with confidence-based visual intensity
 103 | - **Tooltip summaries**: Hover-based section previews
 104 | - **Collapsible structure**: Hierarchical content organisation
 105 | 
 106 | ### Chat Interface ✓
 107 | - **Document context**: Conversations include current document content
 108 | - **Database persistence**: Chat history storage and restoration
 109 | - **Multi-provider support**: Claude and Gemini LLM backends
 110 | - **Streaming responses**: Real-time conversation flow
 111 | 
 112 | ### Authentication & Data Management ✓
 113 | - **Supabase Auth**: Email/password and Google OAuth integration
 114 | - **User-scoped documents**: Row-level security with profile management
 115 | - **Long-lasting sessions**: 1-week duration with automatic refresh
 116 | - **Profile management**: User settings and document ownership
 117 | 
 118 | ## Background Processing
 119 | 
 120 | Frontend-driven task orchestration:
 121 | 
 122 | - **Simple queue**: React component maintains task queue in state
 123 | - **API orchestration**: Sequential calls to Next.js API routes
 124 | - **Real-time updates**: UI reflects progress as results arrive
 125 | - **Prototype approach**: Accepts limitations (multi-tab conflicts) for simplicity
 126 | 
 127 | Future migration to server-side queuing planned as system matures.
 128 | 
 129 | ## Environment Configuration
 130 | 
 131 | ### Development
 132 | - **Local server**: `npm run dev` with hot reloading
 133 | - **Database types**: Auto-generated TypeScript definitions from Supabase schema
 134 | - **Testing**: Jest with React Testing Library and dedicated test environment
 135 | 
 136 | ### Production (Planned)
 137 | - **Deployment**: Vercel platform integration
 138 | - **Environment variables**: Supabase connection and API keys
 139 | - **Model selection**: Configurable LLM providers per feature
 140 | 
 141 | ## Status Indicators
 142 | 
 143 | - ✓ **Core architecture implemented**: Document storage, mutations, multi-pane UI
 144 | - ✓ **AI features complete**: Summaries, glossary, headings, chat interface
 145 | - ✓ **Authentication system**: Full user management and data security
 146 | - 📋 **File upload**: PDF conversion and document import functionality
 147 | - 📋 **Production deployment**: Vercel hosting and environment configuration

```

`reading-worktree6/docs/reference/CODING_GUIDELINES.md`:

```md
   1 | # CODING_GUIDELINES.md - Code Quality Standards for Spideryarn Reading
   2 | 
   3 | This document defines code quality standards and patterns to maintain consistency and prevent common issues across the Spideryarn Reading codebase.
   4 | 
   5 | ## See also
   6 | 
   7 | - `docs/reference/CODING_PRINCIPLES.md` - High-level development principles and philosophy
   8 | - `docs/reference/ARCHITECTURE_DECISIONS.md` - System architecture and technical decisions
   9 | - `docs/reference/TESTING_OVERVIEW.md` - Testing approach and patterns
  10 | - `docs/instructions/GIT_COMMIT_CHANGES.md` - Git workflow and commit guidelines
  11 | - `docs/reference/VERCEL_AI_SDK_REFERENCE.md` - Vercel AI SDK patterns and multi-provider support
  12 | - `docs/reference/AI_CHATBOT_ASSISTANT_UI_INTEGRATION.md` - Chat UI implementation with @assistant-ui/react
  13 | - `docs/reference/TOOL_SEARCH_TEXT.md` - Document search functionality using HTML text extraction
  14 | - `.eslintrc.json` and `tsconfig.json` - Linting and TypeScript configuration
  15 | 
  16 | ## Code Quality Checks
  17 | 
  18 | Before committing code, always run these commands to ensure quality:
  19 | 
  20 | ```bash
  21 | npm run lint    # Check for ESLint issues
  22 | npm run build   # Check for TypeScript compilation errors
  23 | npm test        # Run test suite
  24 | ```
  25 | 
  26 | ## Database Operations Safety
  27 | 
  28 | **CRITICAL**: Never run ANY database commands without explicit user permission:
  29 | 
  30 | ```bash
  31 | # DESTRUCTIVE COMMANDS - require explicit user permission:
  32 | npm run db:reset:DANGEROUS     # Deletes all local database data
  33 | npx supabase db reset # Deletes all local database data
  34 | npx supabase db push # Applies migrations to database
  35 | npx supabase migration new # Creates new migration files
  36 | 
  37 | # SAFE READ-ONLY COMMANDS - can be run as needed:
  38 | npm run db:types     # Only regenerates TypeScript types
  39 | npx supabase status  # Read-only status check
  40 | ```
  41 | 
  42 | ⚠️ **ALWAYS ERR ON THE SIDE OF CAUTION**: When working with databases, production systems, or any operations that could affect data or functionality, always ask for explicit user permission first. If unsure whether something requires permission, ask!
  43 | 
  44 | ## Import Standards
  45 | 
  46 | ### Import Hygiene
  47 | - Remove unused imports immediately - they increase bundle size unnecessarily
  48 | - Use ES6 imports consistently throughout the codebase
  49 | - Never use CommonJS `require()` syntax except where absolutely necessary (e.g., dynamic imports)
  50 | 
  51 | ### Import Organization
  52 | Group imports in this order, with blank lines between groups:
  53 | ```typescript
  54 | // 1. React and core libraries
  55 | import React, { useState, useCallback } from 'react'
  56 | import { useRouter } from 'next/navigation'
  57 | 
  58 | // 2. Third-party libraries
  59 | import { Dialog } from '@radix-ui/react-dialog'
  60 | import { Info } from '@phosphor-icons/react'
  61 | 
  62 | // 3. Local utilities and services
  63 | import { cn } from '@/lib/utils'
  64 | import { llmProvider } from '@/lib/services/llm-provider'
  65 | 
  66 | // 4. Local components
  67 | import { Button } from '@/components/ui/button'
  68 | import { DocumentViewer } from '@/components/document-viewer'
  69 | 
  70 | // 5. Types (if separate from their modules)
  71 | import type { Document, Mutation } from '@/lib/types'
  72 | ```
  73 | 
  74 | ### ES6 Module Syntax
  75 | ```typescript
  76 | // ❌ Bad - CommonJS
  77 | const fs = require('fs')
  78 | const { parse } = require('path')
  79 | 
  80 | // ✅ Good - ES6
  81 | import fs from 'fs'
  82 | import { parse } from 'path'
  83 | ```
  84 | 
  85 | ## TypeScript Best Practices
  86 | 
  87 | ### Avoid `any` Types
  88 | Use specific types instead of `any` to maintain type safety:
  89 | 
  90 | ```typescript
  91 | // ❌ Bad
  92 | function processElement(element: any) {
  93 |   return element.innerHTML
  94 | }
  95 | 
  96 | // ✅ Good
  97 | function processElement(element: Element) {
  98 |   return element.innerHTML
  99 | }
 100 | 
 101 | // ✅ Good - union types for flexibility
 102 | interface Metadata {
 103 |   [key: string]: string | number | boolean | undefined
 104 | }
 105 | 
 106 | // ✅ Good - type assertions when necessary
 107 | const windowWithDebugger = window as Window & { debugger?: MutationDebugger }
 108 | ```
 109 | 
 110 | ### Exception: Test Mocks
 111 | In test files, `any` types are sometimes necessary for mocking:
 112 | ```typescript
 113 | // Acceptable in tests
 114 | const mockFunction = jest.fn() as any
 115 | const mockAdapter = { run: jest.fn() } as any
 116 | ```
 117 | 
 118 | ### Interface Definitions
 119 | Define clear interfaces for complex objects:
 120 | ```typescript
 121 | // ✅ Good
 122 | interface WindowWithDebugger extends Window {
 123 |   mutationDebugger?: MutationDebugger
 124 | }
 125 | 
 126 | interface MockRequestOptions {
 127 |   method?: string
 128 |   headers?: Record<string, string>
 129 |   body?: unknown
 130 | }
 131 | ```
 132 | 
 133 | ## React Patterns
 134 | 
 135 | ### Hook Dependencies
 136 | Always include all dependencies in React hooks or use `useCallback` for stable references:
 137 | 
 138 | ```typescript
 139 | // ❌ Bad - missing dependency
 140 | useEffect(() => {
 141 |   generateSummary(content)
 142 | }, []) // Missing 'content' dependency
 143 | 
 144 | // ✅ Good - with dependency
 145 | useEffect(() => {
 146 |   generateSummary(content)
 147 | }, [content, generateSummary])
 148 | 
 149 | // ✅ Good - stable reference with useCallback
 150 | const generateSummary = useCallback(async () => {
 151 |   // Function implementation
 152 | }, [content])
 153 | 
 154 | useEffect(() => {
 155 |   generateSummary()
 156 | }, [generateSummary])
 157 | ```
 158 | 
 159 | ### Component Props
 160 | Use TypeScript interfaces for component props:
 161 | ```typescript
 162 | // ✅ Good
 163 | interface DocumentViewerProps {
 164 |   document: Document
 165 |   className?: string
 166 |   onScroll?: (position: number) => void
 167 | }
 168 | 
 169 | export function DocumentViewer({ document, className, onScroll }: DocumentViewerProps) {
 170 |   // Component implementation
 171 | }
 172 | ```
 173 | 
 174 | ### Phosphor Icons SSR
 175 | Use correct imports based on component type:
 176 | ```typescript
 177 | // Server components - SSR imports
 178 | import { Warning } from "@phosphor-icons/react/dist/ssr/Warning"
 179 | import { Info } from "@phosphor-icons/react/dist/ssr/Info"
 180 | 
 181 | // Client components - standard imports
 182 | 'use client'
 183 | import { Warning, Info } from "@phosphor-icons/react"
 184 | ```
 185 | 
 186 | ### AI Integration
 187 | - Use Vercel AI SDK Core (`generateText`, `streamText`) for LLM calls
 188 | - Follow multi-provider pattern in `lib/services/llm-provider.ts`
 189 | - Always include `version` parameter when using `aiCallService.startCall()` or `create()`
 190 | - See `docs/reference/VERCEL_AI_SDK_REFERENCE.md` for detailed patterns
 191 | 
 192 | ### Chat UI
 193 | - Use @assistant-ui/react primitives for chat interfaces
 194 | - Follow implementation patterns in `components/assistant-chat.tsx`
 195 | - See `docs/reference/AI_CHATBOT_ASSISTANT_UI_INTEGRATION.md` for integration guide
 196 | 
 197 | ## Client/Server Components
 198 | 
 199 | Use `'use client'` directive for components with:
 200 | - React hooks (useState, useEffect, etc.)
 201 | - Event handlers
 202 | - Browser-only APIs
 203 | 
 204 | ```typescript
 205 | // Client component
 206 | 'use client'
 207 | import { useState } from 'react'
 208 | 
 209 | // Server component (default - no directive)
 210 | import { headers } from 'next/headers'
 211 | ```
 212 | 
 213 | ## API Route Patterns
 214 | 
 215 | ### Structure
 216 | ```typescript
 217 | export async function POST(request: Request) {
 218 |   try {
 219 |     const body = await request.json()
 220 |     const result = schema.safeParse(body)
 221 |     
 222 |     if (!result.success) {
 223 |       return NextResponse.json(
 224 |         { error: 'Invalid request', details: result.error.format() },
 225 |         { status: 400 }
 226 |       )
 227 |     }
 228 |     
 229 |     // Process valid data
 230 |     console.log('[API Name] Processing:', result.data)
 231 |     
 232 |   } catch (error) {
 233 |     console.error('[API Name] Error:', error)
 234 |     return NextResponse.json(
 235 |       { error: 'Internal server error' },
 236 |       { status: 500 }
 237 |     )
 238 |   }
 239 | }
 240 | ```
 241 | 
 242 | ## Type-First Development
 243 | 
 244 | ### Zod Schemas
 245 | Define validation schemas for all API inputs/outputs:
 246 | ```typescript
 247 | export const requestSchema = z.object({
 248 |   content: z.string().min(1),
 249 |   options: z.object({
 250 |     temperature: z.number().optional(),
 251 |   })
 252 | })
 253 | 
 254 | type RequestData = z.infer<typeof requestSchema>
 255 | ```
 256 | 
 257 | ### Strict TypeScript
 258 | - Define explicit return types for complex functions
 259 | - Use discriminated unions for variants
 260 | - Prefer `type` for unions, `interface` for objects
 261 | 
 262 | ## Component Patterns
 263 | 
 264 | ### File Structure
 265 | ```typescript
 266 | 'use client' // If needed
 267 | 
 268 | import React from 'react'
 269 | // Other imports...
 270 | 
 271 | interface ComponentProps {
 272 |   isLoading?: boolean  // Boolean prefix: is/has/should
 273 |   onSubmit?: () => void  // Callback prefix: on
 274 |   children: React.ReactNode
 275 | }
 276 | 
 277 | export function ComponentName({ isLoading, onSubmit, children }: ComponentProps) {
 278 |   // Component logic
 279 | }
 280 | ```
 281 | 
 282 | ### Hooks
 283 | - Always prefix with `use`
 284 | - Return objects with clear property names
 285 | - Include cleanup in useEffect
 286 | 
 287 | ```typescript
 288 | export function useFeatureName(): {
 289 |   data: Data | null
 290 |   isLoading: boolean
 291 |   error: Error | null
 292 | } {
 293 |   // Hook implementation
 294 | }
 295 | ```
 296 | 
 297 | ## File Naming
 298 | 
 299 | - Components: `kebab-case.tsx`
 300 | - Hooks: `camelCase.ts` (useElementVisibility.ts)
 301 | - Types: `kebab-case.ts`
 302 | - Tests: `component-name.test.tsx`
 303 | 
 304 | ## Import Paths
 305 | 
 306 | Always use absolute imports with `@/` prefix:
 307 | ```typescript
 308 | // ❌ Bad
 309 | import { Button } from '../../../components/ui/button'
 310 | 
 311 | // ✅ Good
 312 | import { Button } from '@/components/ui/button'
 313 | ```
 314 | 
 315 | ## Testing Patterns
 316 | 
 317 | ### Structure
 318 | ```typescript
 319 | describe('ComponentName', () => {
 320 |   it('should handle specific behavior', () => {
 321 |     // Test implementation
 322 |   })
 323 | })
 324 | ```
 325 | 
 326 | ### Mock Next.js Components
 327 | ```typescript
 328 | jest.mock('next/link', () => ({
 329 |   __esModule: true,
 330 |   default: ({ children, href, ...props }: any) => 
 331 |     <a href={href} {...props}>{children}</a>
 332 | }))
 333 | ```
 334 | 
 335 | ## Logging Patterns
 336 | 
 337 | ```typescript
 338 | // API/Service logs with context
 339 | console.log('[ComponentName] Action:', { data, timestamp: new Date().toISOString() })
 340 | console.error('[ComponentName] Error:', error)
 341 | 
 342 | // Remove debug logs before committing
 343 | // console.log('DEBUG:', temporaryValue)  // ❌ Don't commit
 344 | ```
 345 | 
 346 | ## Async Patterns
 347 | 
 348 | Always use async/await over promises:
 349 | ```typescript
 350 | // ❌ Bad
 351 | fetch('/api/data').then(res => res.json()).then(data => ...)
 352 | 
 353 | // ✅ Good
 354 | const response = await fetch('/api/data')
 355 | const data = await response.json()
 356 | ```
 357 | 
 358 | Use early returns to reduce nesting:
 359 | ```typescript
 360 | if (!data) {
 361 |   return null  // Early return
 362 | }
 363 | 
 364 | if (error) {
 365 |   return <ErrorComponent error={error} />
 366 | }
 367 | 
 368 | // Main logic here
 369 | ```
 370 | 
 371 | ## ESLint Disable Comments
 372 | 
 373 | Only use with specific reason:
 374 | ```typescript
 375 | // eslint-disable-next-line @next/next/no-img-element -- Mock component for testing
 376 | ```
 377 | 
 378 | ## Common Anti-Patterns
 379 | 
 380 | - Dead code and unused imports
 381 | - Debug console.logs in production code
 382 | - TODO comments (use planning docs instead)
 383 | - Magic numbers (use named constants)
 384 | - Relative imports beyond siblings
 385 | - Promise chains instead of async/await
 386 | 
 387 | ## Tailwind CSS v4 Considerations
 388 | 
 389 | We use Tailwind CSS v4 beta, which has breaking changes from v3:
 390 | 
 391 | ### Typography/Prose Classes
 392 | ```css
 393 | /* ❌ v3 syntax - causes errors */
 394 | @import "@tailwindcss/typography";
 395 | 
 396 | /* Current implementation - using plugin directive */
 397 | @plugin "@tailwindcss/typography";
 398 | ```
 399 | 
 400 | ### Key Differences from v3
 401 | - Plugin system uses `@plugin` directive instead of JavaScript config
 402 | - CSS-first configuration with `@theme` directives
 403 | - Some v3 plugins need updates for v4 compatibility
 404 | 
 405 | ### Current Setup
 406 | - PostCSS via `@tailwindcss/postcss` v4
 407 | - Typography plugin: `@plugin "@tailwindcss/typography"`
 408 | - Theme customization in `app/globals.css`
 409 | 
 410 | ## Web Search Notes
 411 | 
 412 | **Last updated: 31/05/2025**
 413 | 
 414 | ### Next.js 15 & React 19 (Searched 31/05/2025)
 415 | - App Router requires React 19 RC (not 18)
 416 | - Use Server Components by default
 417 | - Enable `bundlePagesRouterDependencies` for optimization
 418 | - Sources: augustinfotech.com/blogs/nextjs-best-practices-in-2025, nextjs.org/blog/next-15
 419 | 
 420 | ### Tailwind CSS v4 Beta (Searched 31/05/2025)
 421 | - 100x faster with Vite plugin
 422 | - Native CSS features: cascade layers, container queries
 423 | - Most projects ship <10kB CSS
 424 | - Source: tailwindcss.com/blog/tailwindcss-v4-beta
 425 | 
 426 | ### Vercel AI SDK (Searched 31/05/2025)
 427 | - Use streaming-first for chat UIs
 428 | - Set proper headers: `x-vercel-ai-data-stream: v1`
 429 | - Edge Runtime recommended for performance
 430 | - Sources: ai-sdk.dev, vercel.com/blog/introducing-the-vercel-ai-sdk
 431 | 
 432 | ### Supabase Security (Searched 31/05/2025)
 433 | - Always enable Row Level Security (RLS)
 434 | - Use `supabase-ssr` for cookie-based auth
 435 | - Never expose service role key client-side
 436 | - Source: supabase.com/docs/guides/auth/server-side/nextjs
 437 | 
 438 | ## URL Slugification
 439 | 
 440 | ### Library Choice: `slug`
 441 | 
 442 | Use the `slug` library for all URL-friendly slug generation throughout the application:
 443 | 
 444 | ```typescript
 445 | import slug from 'slug'
 446 | import { generateSlug, findDocumentBySlug } from '@/lib/utils/slug'
 447 | 
 448 | // ❌ Bad - manual implementation
 449 | const badSlug = title
 450 |   .toLowerCase()
 451 |   .replace(/[^a-z0-9]+/g, '-')
 452 |   .replace(/^-|-$/g, '')
 453 | 
 454 | // ✅ Good - use utility functions
 455 | const goodSlug = generateSlug(title)
 456 | const document = findDocumentBySlug(documents, targetSlug)
 457 | ```
 458 | 
 459 | ### Why `slug` Library?
 460 | 
 461 | 1. **Active maintenance** - Updated regularly (as of 2024)
 462 | 2. **Native TypeScript support** - No need for separate type packages
 463 | 3. **Unicode handling** - Properly handles international characters
 464 | 4. **Small bundle size** - Lightweight and performant
 465 | 5. **Robust edge cases** - Handles special characters, spacing, etc.
 466 | 
 467 | ### Usage Patterns
 468 | 
 469 | ```typescript
 470 | // Document URL generation
 471 | const documentSlug = generateSlug(document.title)
 472 | const url = `/read/${documentSlug}`
 473 | 
 474 | // Slug-to-document mapping
 475 | const foundDoc = findDocumentBySlug(allDocuments, urlSlug)
 476 | ```
 477 | 
 478 | ### Utility Functions
 479 | 
 480 | All slug-related operations should use these centralized functions:
 481 | 
 482 | - `generateSlug(text)` - Convert text to URL-friendly slug
 483 | - `findDocumentBySlug(documents, slug)` - Find document by matching title to slug
 484 | 
 485 | **Location**: `@/lib/utils/slug.ts`
 486 | 
 487 | This ensures consistent slug generation across document listing, routing, and API endpoints.
 488 | 
 489 | ## Utility Functions
 490 | 
 491 | ### HTML Text Extraction
 492 | 
 493 | For extracting clean text from HTML content, use the centralised `extractCleanText()` utility:
 494 | 
 495 | ```typescript
 496 | import { extractCleanText } from '@/lib/utils/html-text-extraction'
 497 | 
 498 | // ❌ Bad - regex-based HTML stripping
 499 | const badText = htmlContent.replace(/<[^>]*>/g, '')
 500 | 
 501 | // ✅ Good - DOM-based extraction
 502 | const goodText = extractCleanText(htmlContent)
 503 | ```
 504 | 
 505 | #### Why Use DOM Parsing?
 506 | 
 507 | 1. **Security** - Avoids regex vulnerabilities with malformed HTML
 508 | 2. **Accuracy** - Properly handles nested tags and special characters
 509 | 3. **Filtering** - Automatically removes script/style content
 510 | 4. **Edge cases** - Handles self-closing tags, comments, CDATA sections
 511 | 5. **Normalisation** - Consistent whitespace handling
 512 | 
 513 | #### Usage Examples
 514 | 
 515 | ```typescript
 516 | // Simple HTML
 517 | const html = '<p>The <strong>important</strong> text</p>'
 518 | const text = extractCleanText(html) // "The important text"
 519 | 
 520 | // Complex HTML with scripts
 521 | const complex = `
 522 |   <div>
 523 |     <h1>Title</h1>
 524 |     <script>alert('ignored')</script>
 525 |     <p>Paragraph</p>
 526 |   </div>
 527 | `
 528 | const clean = extractCleanText(complex) // "Title Paragraph"
 529 | 
 530 | // Search functionality
 531 | const searchableText = extractCleanText(element.content)
 532 | const matches = searchableText.toLowerCase().includes(query.toLowerCase())
 533 | ```
 534 | 
 535 | #### Implementation Details
 536 | 
 537 | - **Browser**: Uses native DOMParser for robust HTML parsing
 538 | - **Server**: Falls back to enhanced regex (avoids jsdom bundle issues)
 539 | - **Error handling**: Graceful fallback for malformed HTML
 540 | - **Performance**: Early return for non-HTML strings
 541 | 
 542 | **Location**: `@/lib/utils/html-text-extraction.ts`
 543 | 
 544 | This utility ensures consistent, secure text extraction across document search, previews, and AI processing.
 545 | 
 546 | ### Search Context Extraction
 547 | 
 548 | For creating contextual search snippets around matches, use the dedicated context extraction utilities:
 549 | 
 550 | ```typescript
 551 | import { 
 552 |   extractAllMatchContexts, 
 553 |   generateTooltipContent,
 554 |   extractMatchContext 
 555 | } from '@/lib/utils/search-context-extraction'
 556 | 
 557 | // ❌ Bad - Manual string slicing without context
 558 | const badSnippet = text.substring(matchIndex - 50, matchIndex + 50)
 559 | 
 560 | // ✅ Good - Context-aware snippet extraction
 561 | const contexts = extractAllMatchContexts(text, query, 50, caseSensitive)
 562 | 
 563 | // ✅ Good - Tooltip content with intelligent truncation
 564 | const tooltipText = generateTooltipContent(fullText, query, 500, caseSensitive)
 565 | ```
 566 | 
 567 | #### Search Snippet Best Practices
 568 | 
 569 | 1. **Use context extraction functions**: Always use `extractAllMatchContexts()` for search result snippets
 570 | 2. **Preserve word boundaries**: Context extraction respects word boundaries and adds ellipsis appropriately
 571 | 3. **Multiple matches**: Show separate snippets for each match in the same element
 572 | 4. **Safe highlighting**: Use `HighlightedSearchText` component for React-based highlighting
 573 | 5. **Rich tooltips**: Provide expanded context using `generateTooltipContent()` for better user experience
 574 | 
 575 | ```typescript
 576 | // Multiple snippet rendering pattern
 577 | {result.contexts.map((context, index) => (
 578 |   <Tooltip key={index}>
 579 |     <TooltipTrigger asChild>
 580 |       <div className="search-snippet-container">
 581 |         <HighlightedSearchText 
 582 |           text={context.text} 
 583 |           query={searchQuery} 
 584 |           caseSensitive={caseSensitive} 
 585 |         />
 586 |       </div>
 587 |     </TooltipTrigger>
 588 |     <TooltipContent>
 589 |       <HighlightedSearchText 
 590 |         text={generateTooltipContent(result.fullText, searchQuery, 500, caseSensitive)} 
 591 |         query={searchQuery} 
 592 |         caseSensitive={caseSensitive} 
 593 |       />
 594 |     </TooltipContent>
 595 |   </Tooltip>
 596 | ))}
 597 | ```
 598 | 
 599 | **Location**: `@/lib/utils/search-context-extraction.ts`
 600 | 
 601 | ## Appendix: Future Considerations
 602 | 
 603 | ### Performance
 604 | - React Server Components optimization
 605 | - Web Vitals monitoring  
 606 | - Virtual scrolling for long documents
 607 | 
 608 | ### Accessibility
 609 | - ARIA patterns for custom components
 610 | - Keyboard navigation testing
 611 | 
 612 | ### Security (Post-MVP)
 613 | - Input sanitization
 614 | - Rate limiting
 615 | - CSP headers
 616 | 
 617 | These topics will be addressed as the project matures beyond prototype phase.

```

`reading-worktree6/docs/reference/CODING_PRINCIPLES.md`:

```md
   1 | # Coding principles
   2 | 
   3 | see also:
   4 | - `docs/reference/CODING_GUIDELINES.md` - Specific code quality standards and patterns
   5 | - `docs/reference/ARCHITECTURE_DECISIONS.md` - Technical architecture decisions
   6 | - `docs/reference/TESTING_OVERVIEW.md` - Testing approach and patterns
   7 | 
   8 | - Prioritise code that's simple, easy-to-understand, debuggable, and readable.
   9 | - This is early-stage development with AI-first methods. We want to develop fast and experiment using AI agents, so we can figure out which features are most valuable. The comprehensive documentation, typing, and testing infrastructure exists to support AI productivity and prevent regressions.
  10 | - Fix the root cause rather than putting on a band-aid. Avoid fallbacks & defaults - better to fail if input assumptions aren't being met.
  11 | - **Never implement silent data modifications**: No truncation, silent filtering, or quiet data transformations without explicit user consent. If data doesn't fit constraints, fail clearly with a descriptive error rather than modifying it silently.
  12 | - **Always err on the side of caution**: Be especially careful about any operations that could affect databases, production systems, or user data. When in doubt, ask for explicit permission first.
  13 | - Be cautious about irreversible changes, e.g. deleting files, dropping/truncating tables, throwing away data, running database migrations, etc.
  14 | - If you hit any nasty surprises, stop & discuss with the user.
  15 | - Raise errors early, clearly & fatally. Prefer not to wrap in try/except so that our tracebacks are obvious.
  16 |   - Database services propagate errors instead of silently returning null
  17 |   - API routes can catch and map to appropriate HTTP responses
  18 |   - "Not found" is a valid state, not an error (return null, don't throw)
  19 | - Don't try and write a full, final version immediately. Get a simple version working end-to-end first, and then gradually layer in complexity in stages.
  20 | - Follow software engineering best practices, e.g.
  21 |   - reuse code where it makes sense to do so
  22 |   - pull out core reusable functionality into utility functions
  23 |   - break long/complex functions down
  24 | - Write code that's easy to test, i.e. prefer functional. Avoid object-oriented unless it's a particularly good fit.
  25 | - Aim to keep changes minimal, and focused on the task at hand.
  26 | - Try to keep things concise, don't over-engineer.
  27 | - Remember YAGNI - but at the same time, it can be useful to understand the overall vision for the product, because that may inform the current design/architecture decisions.
  28 | - If tests are failing, try and understand why. If they're failing for systemic reasons, we should discuss how to fix that. Be wary about removing/modifying the tests just to make them pass. If in doubt, stop & discuss with the user.
  29 | - Keep documentation etc up-to-date as you go.
  30 | - When picking 3rd-party libraries, prefer ones with large communities (so there will be lots of pretraining data for LLMs).
  31 | - If you notice other things that should be changed/updated, ask/suggest to the user.
  32 | - If things don't make sense or seem like a bad idea, ask questions or discuss rather than just going a- long with it. Be a good collaborator, and help me make good decisions, rather than just obeying blindly.
  33 | - Eventually we'll need to be a bit more careful about security & privacy. But to begin with while prototyping, we'll want to be quick-and-dirty. Flag concerns as they come up, and let the user decide.

```

`reading-worktree6/package.json`:

```json
   1 | {
   2 |     "name": "syr",
   3 |     "version": "0.1.0",
   4 |     "private": true,
   5 |     "scripts": {
   6 |         "dev": "./scripts/dev-with-restart.sh",
   7 |         "dev:daemon": "./scripts/dev-with-restart.sh --daemon",
   8 |         "dev:stop": "./scripts/dev-with-restart.sh --stop",
   9 |         "dev:status": "./scripts/dev-with-restart.sh --status",
  10 |         "dev:safe": "PATH=\"/opt/homebrew/bin:$PATH\" dotenv -e .env.local -- next dev --turbopack > dev.log 2>&1",
  11 |         "build": "next build",
  12 |         "start": "next start",
  13 |         "lint": "next lint",
  14 |         "test": "jest",
  15 |         "test:watch": "jest --watch",
  16 |         "test:coverage": "jest --coverage",
  17 |         "test:e2e": "playwright test",
  18 |         "test:e2e:ui": "playwright test --ui",
  19 |         "test:e2e:debug": "playwright test --debug",
  20 |         "test:e2e:setup": "playwright test --project=setup",
  21 |         "db:types": "supabase gen types typescript --local > lib/types/database.ts",
  22 |         "db:reset:DANGEROUS": "echo '⚠️  WARNING: This will DELETE ALL DATA and invalidate ALL worktree auth files! Type YES to continue:' && read confirm && [ \"$confirm\" = \"YES\" ] && supabase db reset && npm run db:types && npm run import-documents && rm -f playwright/.auth/*.json && echo '✅ Database reset complete. Run ./scripts/setup-auth-all-worktrees.ts to re-setup authentication in all worktrees.'",
  23 |         "db:backup": "./scripts/backup-database.ts",
  24 |         "cleanup:test-data": "tsx scripts/cleanup-test-data.ts",
  25 |         "import-documents": "dotenv -e .env.local -- npx tsx scripts/import-static-documents.ts",
  26 |         "analyze-fidelity": "dotenv -e .env.local -- npx tsx scripts/analyze-content-fidelity.ts",
  27 |         "deploy:production": "npm run build && git push origin main",
  28 |         "python:install": "echo 'No Python dependencies to install'",
  29 |         "python:check": "python --version",
  30 |         "critique": "./scripts/o3-critique-as-api.ts"
  31 |     },
  32 |     "dependencies": {
  33 |         "@ai-sdk/anthropic": "^1.2.12",
  34 |         "@ai-sdk/google": "^1.2.18",
  35 |         "@ai-sdk/openai": "^1.3.22",
  36 |         "@anthropic-ai/sdk": "^0.52.0",
  37 |         "@assistant-ui/react": "^0.10.13",
  38 |         "@assistant-ui/react-markdown": "^0.10.4",
  39 |         "@hookform/resolvers": "^5.0.1",
  40 |         "@mozilla/readability": "^0.6.0",
  41 |         "@phosphor-icons/react": "^2.1.10",
  42 |         "@radix-ui/react-checkbox": "^1.3.2",
  43 |         "@radix-ui/react-collapsible": "^1.1.11",
  44 |         "@radix-ui/react-dialog": "^1.1.14",
  45 |         "@radix-ui/react-label": "^2.1.7",
  46 |         "@radix-ui/react-popover": "^1.1.14",
  47 |         "@radix-ui/react-select": "^2.2.5",
  48 |         "@radix-ui/react-slot": "^1.2.3",
  49 |         "@radix-ui/react-tooltip": "^1.2.7",
  50 |         "@stripe/stripe-js": "^7.3.1",
  51 |         "@supabase/ssr": "^0.6.1",
  52 |         "@supabase/supabase-js": "^2.49.8",
  53 |         "@types/dompurify": "^3.0.5",
  54 |         "@types/js-beautify": "^1.14.3",
  55 |         "@types/jsonwebtoken": "^9.0.9",
  56 |         "@types/nunjucks": "^3.2.6",
  57 |         "@types/turndown": "^5.0.5",
  58 |         "ai": "^4.3.16",
  59 |         "cheerio": "^1.0.0",
  60 |         "class-variance-authority": "^0.7.1",
  61 |         "clsx": "^2.1.1",
  62 |         "cmdk": "^1.1.1",
  63 |         "date-fns": "^4.1.0",
  64 |         "dompurify": "^3.2.6",
  65 |         "isomorphic-dompurify": "^2.25.0",
  66 |         "js-beautify": "^1.15.4",
  67 |         "jsdom": "^26.1.0",
  68 |         "jsonwebtoken": "^9.0.2",
  69 |         "lucide-react": "^0.511.0",
  70 |         "mark.js": "^8.11.1",
  71 |         "next": "15.3.2",
  72 |         "nunjucks": "^3.2.4",
  73 |         "nuqs": "^2.4.3",
  74 |         "pino": "^9.7.0",
  75 |         "react": "^19.0.0",
  76 |         "react-dom": "^19.0.0",
  77 |         "react-hook-form": "^7.57.0",
  78 |         "react-resizable-panels": "^3.0.2",
  79 |         "react-responsive": "^10.0.1",
  80 |         "rehype-parse": "^9.0.1",
  81 |         "remark-gfm": "^4.0.1",
  82 |         "slug": "^11.0.0",
  83 |         "stripe": "^18.2.1",
  84 |         "tailwind-merge": "^3.3.0",
  85 |         "turndown": "^7.2.0",
  86 |         "tw-animate-css": "^1.3.2",
  87 |         "unified": "^11.0.5",
  88 |         "uuid": "^11.1.0",
  89 |         "zod": "^3.25.46"
  90 |     },
  91 |     "devDependencies": {
  92 |         "@eslint/eslintrc": "^3",
  93 |         "@playwright/test": "^1.53.0",
  94 |         "@tailwindcss/postcss": "^4",
  95 |         "@tailwindcss/typography": "^0.5.16",
  96 |         "@testing-library/jest-dom": "^6.6.3",
  97 |         "@testing-library/react": "^16.3.0",
  98 |         "@testing-library/user-event": "^14.6.1",
  99 |         "@types/jest": "^29.5.14",
 100 |         "@types/node": "^20",
 101 |         "@types/react": "^19",
 102 |         "@types/react-dom": "^19",
 103 |         "@types/slug": "^5.0.9",
 104 |         "@types/uuid": "^10.0.0",
 105 |         "clipanion": "^4.0.0-rc.4",
 106 |         "dotenv-cli": "^8.0.0",
 107 |         "eslint": "^9",
 108 |         "eslint-config-next": "15.3.2",
 109 |         "jest": "^29.7.0",
 110 |         "jest-environment-jsdom": "^29.7.0",
 111 |         "next-test-api-route-handler": "^4.0.16",
 112 |         "node-fetch": "^3.3.2",
 113 |         "pino-pretty": "^13.0.0",
 114 |         "tailwindcss": "^4",
 115 |         "ts-node": "^10.9.2",
 116 |         "tsx": "^4.19.4",
 117 |         "typescript": "^5"
 118 |     }
 119 | }

```

`reading-worktree6/tsconfig.json`:

```json
   1 | {
   2 |   "compilerOptions": {
   3 |     "target": "ES2017",
   4 |     "lib": ["dom", "dom.iterable", "esnext"],
   5 |     "allowJs": true,
   6 |     "skipLibCheck": true,
   7 |     "strict": true,
   8 |     "noEmit": true,
   9 |     "esModuleInterop": true,
  10 |     "module": "esnext",
  11 |     "moduleResolution": "bundler",
  12 |     "resolveJsonModule": true,
  13 |     "isolatedModules": true,
  14 |     "jsx": "preserve",
  15 |     "incremental": true,
  16 |     
  17 |     // Additional strict checks for AI-first development
  18 |     "exactOptionalPropertyTypes": true,
  19 |     "useDefineForClassFields": true,
  20 |     "noUncheckedIndexedAccess": true,
  21 |     
  22 |     "plugins": [
  23 |       {
  24 |         "name": "next"
  25 |       }
  26 |     ],
  27 |     "paths": {
  28 |       "@/*": ["./*"]
  29 |     }
  30 |   },
  31 |   "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  32 |   "exclude": [
  33 |     "node_modules",
  34 |     
  35 |     // Test files and directories
  36 |     "**/*.test.ts",
  37 |     "**/*.test.tsx",
  38 |     "**/*.spec.ts", 
  39 |     "**/*.spec.tsx",
  40 |     "__tests__/**/*",
  41 |     "__mocks__/**/*",
  42 |     "tests/**/*",
  43 |     "playwright/**/*",
  44 |     "playwright.config.ts",
  45 |     
  46 |     // Development and build artifacts
  47 |     "scripts/**/*",
  48 |     "dev.log",
  49 |     "*.log",
  50 |     "*.tsbuildinfo",
  51 |     "screenshots/**/*",
  52 |     "playwright-report/**/*",
  53 |     
  54 |     // Documentation and planning
  55 |     "docs/**/*",
  56 |     "planning/**/*",
  57 |     "README.md",
  58 |     "CLAUDE.md",
  59 |     
  60 |     // Legacy and backup content
  61 |     "backup/**/*",
  62 |     "obsolete_alternative_version/**/*",
  63 |     "gjdutils/**/*",
  64 |     "static/examples/**/*",
  65 |     
  66 |     // Temporary files
  67 |     "temp-*",
  68 |     "test-*"
  69 |   ]
  70 | }

```