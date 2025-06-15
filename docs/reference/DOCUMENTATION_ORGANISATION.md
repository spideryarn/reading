# Documentation Organisation

## References

- `README.md` - Project overview, goals, and key features
- `CLAUDE.md` - Essential context and instructions for AI agents working on this codebase
- `docs/instructions/WRITE_EVERGREEN_DOC.md` - Guidelines for writing documentation

## Getting Started (Key Docs for Newcomers)

**Start here for understanding the project:**
- `README.md` - Project goals, features, and high-level overview
- `docs/reference/VISION.md` - Comprehensive product vision and strategic direction  
- `docs/reference/ARCHITECTURE_OVERVIEW.md` - Current system architecture and implementation

**Essential for development:**
- `CLAUDE.md` - AI agent context and development instructions
- `docs/reference/CODING_PRINCIPLES.md` - Core development philosophy and principles
- `docs/reference/SETUP.md` - Development environment setup guide

## Evergreen Documentation Reference

Available evergreen documentation in `docs/` organised by category:

### Coding & Infrastructure
- `docs/reference/CODING_PRINCIPLES.md` - Development philosophy prioritising simplicity, readability, debugging, and rapid prototyping ⭐ **Essential**
- `docs/reference/CODING_GUIDELINES.md` - Code quality standards including linting, TypeScript patterns, React best practices, and import conventions ⭐ **Essential**
- `docs/reference/ARCHITECTURE_OVERVIEW.md` - Current system architecture and implementation details ⭐ **Essential**
- `docs/reference/ARCHITECTURE_DECISIONS.md` - Key architectural decisions including framework choices, data structures, storage approach, and MVP features
- `docs/reference/SETUP.md` - Development environment setup guide including Node.js, Supabase, Git worktree configuration ⭐ **Start here**
- `docs/reference/SETUP_DEPLOYMENT_PRODUCTION.md` - Production deployment guide covering Vercel setup, custom domain configuration, environment management, and troubleshooting ⭐ **Essential for deployment**
- `docs/reference/LOGGING_BEST_PRACTICES.md` - Comprehensive logging guide covering library choices (Pino vs Winston), Vercel observability, and production monitoring strategies
- `docs/reference/TESTING_OVERVIEW.md` - Testing approach documentation covering Jest with React Testing Library setup, test structure, and current test coverage
- `docs/reference/TESTING_SETUP.md` - Test configuration and environment setup including Jest, .env.test, and module resolution
- `docs/reference/TESTING_TROUBLESHOOTING.md` - Known testing issues, workarounds, and debugging strategies including NextRequest mocking and Supabase ESM module solutions
- `docs/reference/TESTING_DATABASE.md` - Database-specific testing patterns and integration testing strategies
- `docs/reference/archive/TESTING_DATABASE_SUPABASE_OPTIONS_RESEARCH.md` - Historical research on different test database approaches for Supabase local development
- `docs/reference/TESTING_AUTHENTICATION.md` - Redirect to AUTHENTICATION_TESTING.md for authentication testing patterns
- `docs/reference/TESTING_WITH_BROWSER_AUTOMATION.md` - Comprehensive analysis of browser automation testing options (Playwright, Cypress, Puppeteer) for AI-assisted development ⭐ **Essential for E2E testing**
- `docs/reference/COMMAND_LINE_SCRIPTS.md` - Guidelines for writing command-line scripts using shell scripts or TypeScript/Clipanion
- `docs/reference/STYLING_OVERVIEW.md` - Overview of CSS and visual styling configuration with links to specialized styling documentation ⭐ **Start here for styling**
- `docs/reference/GIT_WORKTREES.md` - Multi-worktree development setup using hub-and-spoke model
- `docs/reference/SITE_ORGANISATION.md` - Application routes, component hierarchy, and navigation patterns (may be outdated)

### Database
- `docs/reference/DATABASE_OVERVIEW.md` - Database architecture and Supabase integration overview
- `docs/reference/DATABASE_SCHEMA.md` - Database schema reference showing transition from element decomposition to single-row storage
- `docs/reference/DATABASE_MIGRATIONS.md` - Guide for managing database schema changes through Supabase migrations
- `docs/reference/DATABASE_SUPABASE_INTEGRATION_REFERENCE.md` - Comprehensive Supabase.js usage patterns, RLS best practices, and security considerations
- `docs/reference/DATABASE_SUPABASE_STORAGE_REFERENCE.md` - File storage integration with Supabase Storage
- `docs/reference/DATABASE_SECURITY.md` - Database security practices and RLS policies

### Authentication & Security
- `docs/reference/AUTHENTICATION_OVERVIEW.md` - Authentication system architecture and flows using Supabase Auth
- `docs/reference/AUTHENTICATION_SETUP.md` - Configuration and deployment guide for authentication
- `docs/reference/AUTHENTICATION_UI.md` - UI components and forms for authentication flows
- `docs/reference/AUTHENTICATION_DATABASE.md` - Database integration and Row Level Security for authentication
- `docs/reference/AUTHENTICATION_SECURITY.md` - Security practices and troubleshooting for authentication
- `docs/reference/AUTHENTICATION_TESTING.md` - Testing authentication flows and security
- `docs/reference/WEBPAGE_HTML_SANITIZATION_FOR_ACADEMIC_CONTENT.md` - Comprehensive guide for HTML sanitization balancing XSS protection with academic content preservation ⭐ **Essential for content security**

### AI Features & Implementation
- `docs/reference/LLM_PROMPT_TEMPLATES.md` - Guide for creating AI/LLM calls using Nunjucks + Zod template system ⭐ **Essential for AI features**
- `docs/reference/LLM_MODELS_REFERENCE.md` - LLM model configuration and provider integration
- `docs/reference/LLM_TRACKING_TOKEN_USAGE_LOGGING.md` - Comprehensive guide for tracking LLM token usage and costs across AI operations
- `docs/reference/VERCEL_AI_SDK_REFERENCE.md` - Vercel AI SDK integration patterns and usage
- `docs/reference/TOOL_SUMMARISE.md` - AI summarise feature generating hierarchical summaries at multiple granularities
- `docs/reference/TOOL_GLOSSARY.md` - Glossary feature extracting key entities from documents using LLM analysis
- `docs/reference/TOOL_HIGHLIGHT.md` - Semantic highlighting system with confidence-based visual intensity and React-first architecture
- `docs/reference/TOOL_HEADINGS.md` - AI-generated heading system for document structure enhancement
- `docs/reference/TOOL_TWEET_THREAD_VIEW.md` - Tweet thread generation from document content
- `docs/reference/TOOL_CHATBOT_ASSISTANT_UI_INTEGRATION.md` - @assistant-ui/react integration for chatbot interface
- `docs/reference/TOOL_CHATBOT_ASSISTANT_UI_PERSISTENCE_DEBUGGING.md` - Debugging guide for chat persistence
- `docs/reference/TOOL_CHATBOT_ASSISTANT_UI_DATABASE_PERSISTENCE.md` - Database persistence for chat conversations

### UI Components & Interface
- `docs/reference/UI_COMPONENTS.md` - Available UI components and usage patterns
- `docs/reference/UI_INTERFACE.md` - Multi-pane layout with tabbed navigation architecture
- `docs/reference/STYLING_SHADCN_UI_REFERENCE.md` - shadcn/ui component library integration and customisation
- `docs/reference/STYLING_COLORS_FONTS.md` - Complete color system, typography hierarchy, and theme configuration
- `docs/reference/STYLING_ICONS.md` - Phosphor Icons usage patterns, SSR compatibility, and sizing standards
- `docs/reference/STYLING_TOOLTIPS.md` - Tooltip styling patterns with default light theme and implementation examples
- `docs/reference/STYLING_COLLAPSIBLE.md` - Comprehensive guide for expand/collapse component patterns
- `docs/reference/STYLING_MOBILE_PLATFORM_DETECTION.md` - Mobile device detection and responsive design system
- `docs/reference/STYLING_OVERLAPPING_TEXT_HIGHLIGHTS.md` - Comprehensive guide for implementing overlapping text highlighting using CSS Custom Highlight API and Mark.js fallbacks ⭐ **Essential for highlighting features**
- `docs/reference/UNIFIED_LEFT_PANE.md` - Architecture of unified left pane with tabbed interface, ToC, and tooltip summaries
- `docs/reference/COMMAND_PALETTE.md` - Command palette implementation and usage
- `docs/reference/CROSS_PANE_COMMUNICATION.md` - Inter-pane communication patterns and architecture
- `docs/reference/KEYBOARD_SHORTCUTS.md` - Application keyboard shortcuts and navigation
- `docs/reference/MUTATIONS.md` - Reversible document transformation system for applying/reverting changes

### Content Processing & Search
- `docs/reference/TOOL_SEARCH_TEXT.md` - Cross-element text search functionality using Mark.js with DOM-based highlighting
- `docs/reference/UPLOAD.md` - Comprehensive document upload and import system reference covering all ingestion methods ⭐ **Essential for content import**
- `docs/reference/UPLOAD_HTML_SANITISATION_AND_PRETTIFICATION.md` - Comprehensive guide for HTML sanitisation and prettification with academic content preservation
- `docs/reference/HTML_DOCUMENT_PROCESSOR.md` - Shared HTML processing service documentation for DRY architecture
- `docs/reference/PDF_TO_HTML_CONVERSION_OVERVIEW.md` - PDF processing and HTML conversion overview
- `docs/reference/WEBPAGE_HTML_CONTENT_EXTRACTION.md` - Web content extraction and processing
- `docs/reference/OPTIMAL_TEXT_FORMATTING.md` - Text formatting standards and typography

### Strategic Vision & Business
- `docs/reference/VISION.md` - Comprehensive product vision including target users, business model, competitive positioning ⭐ **Important**
- `docs/reference/PROJECT_STATUS.md` - Current development state showing implemented and planned features
- `docs/reference/MARKETING_BRANDING.md` - Marketing strategy, branding guidelines, and positioning
- `docs/reference/RESEARCH_POTENTIAL_LIBRARY_CHANGES_GOTCHAS.md` - Research notes on potential library changes and considerations

### Project Management & Meta
- `docs/reference/OBSOLETE_ALTERNATIVE_VERSION.md` - Documentation of deprecated Python version for reference

## Instructions & Modes Documentation

Process and workflow documentation in `docs/instructions/`:

### Core Workflow Instructions
- `docs/instructions/UPDATE_HOUSEKEEPING_DOCUMENTATION.md` - Process for keeping project documentation up-to-date ⭐ **Run regularly**
- `docs/instructions/UPDATE_DOCUMENTATION_ORGANISATION_DOC.md` - Instructions for updating this organisation guide
- `docs/instructions/WRITE_EVERGREEN_DOC.md` - Guidelines for writing evergreen documentation ⭐ **Essential for doc writers**
- `docs/instructions/WRITE_PLANNING_DOC.md` - Guide for writing planning documents with file naming conventions
- `docs/instructions/UPDATE_CLAUDE_INSTRUCTIONS.md` - Guidelines for maintaining CLAUDE.md for AI agents

### Development Process Instructions
- `docs/instructions/GIT_COMMIT_CHANGES.md` - Git commit best practices including batching changes and message format
- `docs/instructions/FIX_NPM_LINT_ISSUES.md` - Process for resolving linting and code quality issues
- `docs/instructions/UPDATE_HOUSEKEEPING_TESTS.md` - Maintaining test quality and organisation
- `docs/instructions/WRITE_UPDATE_CODING_GUIDELINES.md` - Process for updating coding standards

### Working Modes & Collaboration
- `docs/instructions/SOUNDING_BOARD_MODE.md` - Collaborative discussion mode for exploring ideas before implementation
- `docs/instructions/DETECTIVE_SCIENTIST_MODE.md` - Systematic investigation and analysis mode
- `docs/instructions/NONINTERACTIVE.md` - Guidelines for non-interactive batch processing
- `docs/instructions/AUDIT_ARCHITECTURE_MODE.md` - Comprehensive architecture review and analysis mode

### Specialised Tasks
- `docs/instructions/RESOLVE_MERGE_CONFLICTS.md` - Git merge conflict resolution process
- `docs/instructions/RENAME_OR_MOVE.md` - File and directory renaming/moving procedures
- `docs/instructions/PORT_DOCS_TO_GJDUTILS.md` - Documentation porting process
- `docs/instructions/WRITE_DEEP_DIVE_AS_DOC.md` - Creating comprehensive technical deep-dive documentation
- `docs/instructions/DEBRIEF_PROGRESS.md` - Progress review and retrospective process
- `docs/instructions/CRITIQUE_OF_PLANNING_DOC.md` - Planning document review and improvement process
- `docs/instructions/DO_EXECUTE_PLANNING_DOC.md` - Execute actions from planning documents

## Planning Documentation

Recent planning decisions & progress tracking in `planning/`.

### Completed Planning
See `planning/finished/` for historical planning documents and implementation records.

Recent completions:
- `planning/finished/250613e_Vercel_deployment_initial_setup.md` - Complete Vercel deployment with custom domain, database migrations, and production environment setup

### Future Planning
See `planning/later/` for deferred features and future enhancements.

## Navigation Tips

**For newcomers**: Start with README.md → VISION.md → ARCHITECTURE_OVERVIEW.md → SETUP.md
**For developers**: Focus on CODING_PRINCIPLES.md → CODING_GUIDELINES.md → TESTING_OVERVIEW.md → TESTING_SETUP.md
**For AI features**: Begin with LLM_PROMPT_TEMPLATES.md → TOOL_SUMMARISE.md → TOOL_GLOSSARY.md
**For highlighting work**: Use STYLING_OVERLAPPING_TEXT_HIGHLIGHTS.md → TOOL_SEARCH_TEXT.md → TOOL_HIGHLIGHT.md
**For documentation work**: Use WRITE_EVERGREEN_DOC.md → UPDATE_HOUSEKEEPING_DOCUMENTATION.md
**For E2E testing**: Start with TESTING_WITH_BROWSER_AUTOMATION.md → TESTING_OVERVIEW.md

⭐ Marks essential starting points for different development areas.