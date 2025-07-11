# Documentation Organisation

A navigational guide to all project documentation for the Spideryarn Reading codebase.

Last updated: 2025-06-28

## References

- `README.md` - Project overview, goals, and key features
- `CLAUDE.md` - Essential context and instructions for AI agents working on this codebase
- `docs/instructions/WRITE_EVERGREEN_DOC.md` - Guidelines for writing documentation

## Getting Started (Key Docs for Newcomers)

**Start here for understanding the project:**
- `README.md` - Project goals, features, and high-level overview
- `docs/reference/VISION_PRODUCT_STRATEGY.md` - Comprehensive product vision and strategic direction  
- `docs/reference/ARCHITECTURE_OVERVIEW.md` - Current system architecture and implementation

**Essential for development:**
- `CLAUDE.md` - AI agent context and development instructions
- `docs/reference/CODING_PRINCIPLES.md` - Core development philosophy and principles
- `docs/reference/SETUP_DEVELOPMENT_ENVIRONMENT.md` - Development environment setup guide

## Evergreen Documentation Reference

Available evergreen documentation in `docs/` organised by category:

### Coding & Infrastructure
- `docs/reference/CODING_PRINCIPLES.md` - Development philosophy prioritising simplicity, readability, debugging, and rapid prototyping ⭐ **Essential**
- `docs/reference/CODING_GUIDELINES.md` - Code quality standards including linting, TypeScript patterns, React best practices, and import conventions ⭐ **Essential**
- `docs/reference/ARCHITECTURE_OVERVIEW.md` - Current system architecture and implementation details ⭐ **Essential**
- `docs/reference/ARCHITECTURE_DECISIONS.md` - Key architectural decisions including framework choices, data structures, storage approach, and MVP features
- `docs/reference/SETUP_DEVELOPMENT_ENVIRONMENT.md` - Development environment setup guide including Node.js, Supabase, Git worktree configuration ⭐ **Start here**
- `docs/reference/SETUP_DEV_SERVER_AUTOMATION.md` - Enhanced dev server management with background daemon mode for AI-first development and multi-worktree isolation ⭐ **Essential for AI agents**
- `docs/reference/SETUP_DEPLOYMENT_PRODUCTION.md` - Production deployment guide covering Vercel setup, custom domain configuration, environment management, and troubleshooting ⭐ **Essential for deployment**
- `docs/reference/SETUP_PYTHON.md` - Python environment setup and dependencies for critique generation features
- `docs/reference/ENVIRONMENT_DETECTION_RUNTIME_PATTERNS.md` - Environment-aware error handling for distinguishing between local development and cloud/production environments
- `docs/reference/LOGGING_BEST_PRACTICES.md` - Comprehensive logging guide covering library choices (Pino vs Winston), Vercel observability, and production monitoring strategies
- `docs/reference/TESTING_OVERVIEW.md` - Testing approach documentation covering Jest with React Testing Library setup, test structure, and current test coverage
- `docs/reference/TESTING_SETUP.md` - Test configuration and environment setup including Jest, .env.test, and module resolution
- `docs/reference/TESTING_TROUBLESHOOTING.md` - Known testing issues, workarounds, and debugging strategies including NextRequest mocking and Supabase ESM module solutions
- `docs/reference/TESTING_DATABASE.md` - Database-specific testing patterns and integration testing strategies
- `docs/reference/archive/TESTING_DATABASE_SUPABASE_OPTIONS_RESEARCH.md` - Historical research on different test database approaches for Supabase local development
- `docs/reference/TESTING_AUTHENTICATION.md` - Redirect to AUTHENTICATION_TESTING.md for authentication testing patterns
- `docs/reference/TESTING_BROWSER_AUTOMATION_OVERVIEW.md` - Comprehensive analysis of browser automation testing options (Playwright, Cypress, Puppeteer) for AI-assisted development ⭐ **Essential for E2E testing**
- `docs/reference/TESTING_BROWSER_AUTOMATION_IMPLEMENTATION.md` - Playwright implementation guide for E2E testing with authentication setup
- `docs/reference/TESTING_E2E_COVERAGE.md` - E2E test coverage tracking and test suite organisation
- `docs/reference/TESTING_SERVICE_MOCKS.md` - Service mocking patterns for unit and integration tests
- `docs/reference/TEST_INVENTORY_HOOKS_UTILS_API.md` - Inventory of test utilities, hooks, and API helpers
- `docs/reference/COMMAND_LINE_SCRIPTS.md` - Guidelines for writing command-line scripts using shell scripts or TypeScript/Clipanion
- `docs/reference/DESIGN_OVERVIEW.md` - Overview of CSS and visual styling configuration with links to specialized styling documentation ⭐ **Start here for styling**
- `docs/reference/GIT_WORKTREES.md` - Multi-worktree development setup using hub-and-spoke model
- `docs/reference/NUNJUCKS_USAGE.md` - Nunjucks template engine usage patterns and best practices
- `docs/reference/VERCEL_SERVERLESS_CONSTRAINTS.md` - Vercel platform limitations and workarounds for serverless functions
- `docs/reference/SETUP_FOR_AI_FIRST_CODING.md` - AI-first development workflow setup and best practices
- `docs/reference/SETUP_SECRETS_AND_ENVIRONMENT_VARIABLES.md` - Environment variable management and secret configuration
- `docs/reference/SITE_ORGANISATION_WEBSITE_STRUCTURE.md` - Application routes, component hierarchy, and navigation patterns (may be outdated)

### Database
- `docs/reference/DATABASE_OVERVIEW.md` - Database architecture and Supabase integration overview
- `docs/reference/DATABASE_SCHEMA.md` - Database schema reference showing transition from element decomposition to single-row storage (Updated 2025-06-28)
- `docs/reference/DATABASE_MIGRATIONS.md` - Guide for managing database schema changes through Supabase migrations
- `docs/reference/DATABASE_NAMING.md` - Database naming conventions and standards
- `docs/reference/DATABASE_SUPABASE_INTEGRATION_REFERENCE.md` - Comprehensive Supabase.js usage patterns, RLS best practices, and security considerations
- `docs/reference/DATABASE_SUPABASE_STORAGE_REFERENCE.md` - File storage integration with Supabase Storage
- `docs/reference/DATABASE_SECURITY.md` - Database security practices and RLS policies
- `docs/reference/DATABASE_LOCAL.md` - Local database setup and development environment
- `docs/reference/DATABASE_PRODUCTION.md` - Production database configuration and deployment
- `docs/reference/DATABASE_BACKUP.md` - Database backup strategies and procedures

### Authentication & Security
- `docs/reference/AUTHENTICATION_OVERVIEW.md` - Authentication system architecture and flows using Supabase Auth
- `docs/reference/AUTHENTICATION_SETUP.md` - Configuration and deployment guide for authentication
- `docs/reference/AUTHENTICATION_UI.md` - UI components and forms for authentication flows
- `docs/reference/AUTHENTICATION_DATABASE.md` - Database integration and Row Level Security for authentication
- `docs/reference/AUTHENTICATION_SECURITY.md` - Security practices and troubleshooting for authentication
- `docs/reference/AUTHENTICATION_TESTING.md` - Testing authentication flows and security
- `docs/reference/AUTHENTICATION_ADMIN.md` - Admin features and user management capabilities
- `docs/reference/HTML_SANITISATION_AND_PRETTIFICATION.md` - Comprehensive guide for HTML sanitisation and prettification balancing XSS protection with academic content preservation ⭐ **Essential for content security**

### AI Features & Implementation
- `docs/reference/LLM_PROMPT_TEMPLATES.md` - Guide for creating AI/LLM calls using Nunjucks + Zod template system ⭐ **Essential for AI features**
- `docs/reference/LLM_MODEL_CONFIGURATION.md` - LLM model configuration and provider integration (Updated 2025-06-28)
- `docs/reference/LLM_PROMPT_CACHING.md` - Comprehensive comparison of prompt caching across Anthropic, Google, and OpenAI with cost optimization strategies
- `docs/reference/LLM_TRACKING_TOKEN_USAGE_LOGGING.md` - Comprehensive guide for tracking LLM token usage and costs across AI operations
- `docs/reference/VERCEL_AI_SDK_REFERENCE.md` - Vercel AI SDK integration patterns and usage
- `docs/reference/TOOL_ARCHITECTURE_AND_DEVELOPMENT_GUIDE.md` - Comprehensive guide for tool architecture, creation patterns, and consolidation ⭐ **Essential for tool development**
- `docs/reference/TOOL_EXECUTION_FRAMEWORK.md` - Tool execution orchestration and queueing system
- `docs/reference/TOOL_SUMMARISE.md` - AI summarise feature generating hierarchical summaries at multiple granularities
- `docs/reference/TOOL_GLOSSARY.md` - Glossary feature extracting key entities from documents using LLM analysis
- `docs/reference/TOOL_HIGHLIGHT.md` - Semantic highlighting system with confidence-based visual intensity and React-first architecture
- `docs/reference/TOOL_STRUCTURE_HEADINGS.md` - Consolidated AI-generated heading system with iterative generation (combines Original + AI-generated views)
- `docs/reference/TOOL_READING_DIFFICULTY.md` - AI-powered reading difficulty assessment using academic levels with tooltips and collapsible UI
- `docs/reference/TOOL_TWEET_THREAD_VIEW.md` - Tweet thread generation from document content (Deprecated - removed from UI)
- `docs/reference/TOOL_CHATBOT_ASSISTANT_UI_INTEGRATION.md` - @assistant-ui/react integration for chatbot interface
- `docs/reference/TOOL_VOICE_INPUT_SPEECH_TO_TEXT.md` - Voice input integration for chatbot using browser speech recognition

### UI Components & Interface
- `docs/reference/UI_COMPONENTS.md` - Available UI components and usage patterns
- `docs/reference/UI_INTERFACE.md` - Multi-pane layout with tabbed navigation architecture
- `docs/reference/UI_DOCUMENT_LISTING_COMPONENT.md` - Document list component implementation and filtering
- `docs/reference/DESIGN_SHADCN_UI_REFERENCE.md` - shadcn/ui component library integration and customisation
- `docs/reference/DESIGN_COLORS_FONTS.md` - Complete color system, typography hierarchy, and theme configuration
- `docs/reference/DESIGN_ICONS.md` - Phosphor Icons usage patterns, SSR compatibility, and sizing standards
- `docs/reference/DESIGN_TOOLTIPS.md` - Tooltip styling patterns with default light theme and implementation examples
- `docs/reference/DESIGN_COLLAPSIBLE.md` - Comprehensive guide for expand/collapse component patterns
- `docs/reference/DESIGN_MOBILE_PLATFORM_DETECTION.md` - Mobile device detection and responsive design system
- `docs/reference/DESIGN_LOGO.md` - Logo animation system with shared definitions and random selection for header interactivity
- `docs/reference/DESIGN_HIGHLIGHTING.md` - Text highlighting patterns and visual design system
- `docs/reference/DESIGN_OVERLAPPING_TEXT_HIGHLIGHTS.md` - Comprehensive guide for implementing overlapping text highlighting using CSS Custom Highlight API and Mark.js fallbacks ⭐ **Essential for highlighting features**
- `docs/reference/DESIGN_LOADING.md` - Comprehensive guide to loading states, spinners, and async operation handling including full-page loading screens and UX best practices
- `docs/reference/UNIFIED_LEFT_PANE_TABBED_NAVIGATION.md` - Architecture of unified left pane with tabbed interface, ToC, and tooltip summaries
- `docs/reference/COMMAND_PALETTE_KEYBOARD_INTERFACE.md` - Command palette implementation and usage
- `docs/reference/COMMAND_PALETTE_FUZZY_SEARCH_CMDK.md` - Fuzzy search configuration and tuning with cmdk library for command palette search precision
- `docs/reference/COMMAND_PALETTE_ENHANCED_SEARCH_PROPOSAL.md` - Proposed enhancements to command palette search functionality
- `docs/reference/COMMAND_PALETTE_MIGRATION_GUIDE.md` - Migration guide for command palette implementation changes
- `docs/reference/CROSS_PANE_COMMUNICATION_MESSAGING_ARCHITECTURE.md` - Inter-pane communication patterns and architecture
- `docs/reference/KEYBOARD_SHORTCUTS.md` - Application keyboard shortcuts and navigation
- `docs/reference/CLIPBOARD_LIBRARY_INTEGRATION.md` - Clipboard operations integration using usehooks-ts for copying text to clipboard
- `docs/reference/MUTATIONS_DOCUMENT_CONTENT_REVERSIBLE_TRANSFORMS.md` - Reversible document transformation system for applying/reverting changes
- `docs/reference/ARCHITECTURE_URL_STATE.md` - URL-based state management for shareable tool states and browser history navigation ⭐ **Essential for tool state persistence**

### Content Processing & Search
- `docs/reference/TOOL_SEARCH_TEXT.md` - Cross-element text search functionality using Mark.js with DOM-based highlighting
- `docs/reference/UPLOAD_DOCUMENT_PROCESSING_PIPELINE.md` - Comprehensive document upload and import system reference covering all ingestion methods ⭐ **Essential for content import**
- `docs/reference/HTML_CONTENT_PROCESSING_OVERVIEW.md` - Complete HTML content processing pipeline including extraction, sanitisation, and quality assurance ⭐ **Essential for web content**
- `docs/reference/PDF_TO_HTML_CONVERSION_OVERVIEW.md` - PDF processing and HTML conversion overview
- `docs/reference/PDF_TO_HTML_LLM_APPROACHES.md` - LLM-based PDF to HTML conversion strategies
- `docs/reference/PDF_TO_HTML_OPEN_SOURCE.md` - Open source PDF conversion tools and libraries
- `docs/reference/PDF_TO_HTML_PAID_SERVICES.md` - Commercial PDF conversion services evaluation
- `docs/reference/PDF_EVALUATION_FRAMEWORK.md` - Framework for evaluating PDF processing quality and accuracy
- `docs/reference/PDF_JS_INTEGRATION_GUIDE.md` - PDF.js integration for client-side PDF rendering
- `docs/reference/RESEARCH_ON_OPTIMAL_TEXT_FORMATTING.md` - Text formatting standards and typography

### Strategic Vision & Business
- `docs/reference/VISION_PRODUCT_STRATEGY.md` - Comprehensive product vision including target users, business model, competitive positioning ⭐ **Important**
- `docs/reference/PROJECT_STATUS.md` - Current development state showing implemented and planned features
- `docs/reference/USER_PROFILES.md` - User personas and target audience analysis
- `docs/reference/MARKETING_BRANDING_GUIDELINES.md` - Marketing strategy, branding guidelines, and positioning
- `docs/reference/ARCHITECTURE_ANALYTICS.md` - Analytics and telemetry architecture planning

### Research & Analysis
- `docs/reference/RESEARCH_READING_DIFFICULTY_METRICS.md` - Reading difficulty assessment methodologies
- `docs/reference/RESEARCH_READING_SPEED_COMPLEXITY_ADJUSTMENTS.md` - Reading speed and complexity adjustment algorithms
- `docs/reference/RESEARCH_ON_OPTIMAL_TEXT_FORMATTING.md` - Typography and text formatting research
- `docs/reference/RESEARCH_ON_LLM_FRAMEWORK_EFFECTIVENESS.md` - LLM framework comparison and effectiveness analysis
- `docs/reference/RESEARCH_ON_TESTING_BROWSER_AUTOMATION.md` - Browser automation testing research
- `docs/reference/RESEARCH_ON_SPEECH_TO_TEXT.md` - Speech recognition and voice input research
- `docs/reference/RESEARCH_UPLOAD_PDF_PROCESSING_LLMWHISPERER.md` - LLMWhisperer PDF processing service research
- `docs/reference/LLM_EVALUATION_FRAMEWORKS_FOR_CONTENT_EXTRACTION.md` - LLM content extraction evaluation methods
- `docs/instructions/RESEARCH_POTENTIAL_LIBRARY_CHANGES_GOTCHAS.md` - Research notes on potential library changes and considerations

### Project Management & Meta
- `docs/reference/OBSOLETE_ALTERNATIVE_VERSION.md` - Documentation of deprecated Python version for reference

## Instructions & Modes Documentation

Process and workflow documentation in `docs/instructions/`:

### Core Workflow Instructions
- `docs/instructions/UPDATE_INDEX_FOR_DOCUMENTATION.md` - Process for keeping project documentation up-to-date ⭐ **Run regularly**
- `docs/instructions/UPDATE_DOCUMENTATION_ORGANISATION_DOC.md` - Instructions for updating this organisation guide
- `docs/instructions/WRITE_EVERGREEN_DOC.md` - Guidelines for writing evergreen documentation ⭐ **Essential for doc writers**
- `docs/instructions/WRITE_PLANNING_DOC.md` - Guide for writing planning documents with file naming conventions
- `docs/instructions/UPDATE_CLAUDE_INSTRUCTIONS.md` - Guidelines for maintaining CLAUDE.md for AI agents
- `docs/instructions/TASKS_SUBAGENTS.md` - Detailed guidelines for effective subagent usage and context management ⭐ **Essential for AI agents**

### Development Process Instructions
- `docs/instructions/GIT_COMMIT_CHANGES.md` - Git commit best practices including batching changes and message format
- `docs/instructions/GIT_CREATE_BRANCH.md` - Branch creation and worktree management procedures
- `docs/instructions/GITHUB_ACTIONS_LOGS_ACCESS.md` - How to share GitHub Actions logs with Claude Code for debugging CI/CD issues
- `docs/instructions/FIX_HOUSEKEEPING_BUILD_TYPECHECK_LINT.md` - Process for resolving build, type checking, and linting issues
- `docs/instructions/UPDATE_HOUSEKEEPING_TESTS.md` - Maintaining test quality and organisation
- `docs/instructions/WRITE_UPDATE_CODING_GUIDELINES.md` - Process for updating coding standards

### Working Modes & Collaboration
- `docs/instructions/SOUNDING_BOARD_MODE.md` - Collaborative discussion mode for exploring ideas before implementation
- `docs/instructions/DETECTIVE_SCIENTIST_MODE.md` - Systematic investigation and analysis mode
- `docs/instructions/NONINTERACTIVE.md` - Guidelines for non-interactive batch processing
- `docs/instructions/AUDIT_ARCHITECTURE_MODE.md` - Comprehensive architecture review and analysis mode
- `docs/instructions/GATHER_DIVERSE_INPUTS_AND_CRITIQUES_ON_PLANNING_DOCS_FROM_OTHER_AI_MODELS.md` - Overview of gathering external AI critiques
- `docs/instructions/GATHER_DIVERSE_INPUTS_AND_CRITIQUES_ON_PLANNING_DOCS_FROM_OTHER_AI_MODELS_API_APPROACH.md` - API-based critique gathering
- `docs/instructions/GATHER_DIVERSE_INPUTS_AND_CRITIQUES_ON_PLANNING_DOCS_FROM_OTHER_AI_MODELS_CODEX_CLI_APPROACH.md` - CLI-based critique gathering

### Research & Documentation
- `docs/instructions/DOCUMENT_RESEARCH.md` - Research methodology for documentation analysis
- `docs/instructions/WRITE_RESEARCH_DOC.md` - Process for documenting research findings
- `docs/instructions/RESEARCH_THIS_TOPIC.md` - General research methodology and approach
- `docs/instructions/CAPTURE_SOUNDING_BOARD_CONVERSATION.md` - Capturing collaborative discussion outcomes

### Specialised Tasks
- `docs/instructions/RESOLVE_MERGE_CONFLICTS.md` - Git merge conflict resolution process
- `docs/instructions/RENAME_OR_MOVE.md` - File and directory renaming/moving procedures
- `docs/instructions/PORT_DOCS_AND_SCRIPTS_TO_GJDUTILS.md` - Documentation and script porting process
- `docs/instructions/DEBRIEF_PROGRESS.md` - Progress review and retrospective process
- `docs/instructions/DEBRIEF_UPDATE_COMMIT.md` - Post-update debrief and commit process
- `docs/instructions/CRITIQUE_OF_PLANNING_DOC.md` - Planning document review and improvement process
- `docs/instructions/DO_EXECUTE_PLANNING_DOC.md` - Execute actions from planning documents
- `docs/instructions/HOUSEKEEPING_OLD_PLANNING_DOC.md` - Archiving and managing old planning documents

## Planning Documentation

Recent planning decisions & progress tracking in `docs/planning/`.

### Active Planning
Current feature development and planning:
- `docs/planning/250612b_stripe_subscription_integration.md` - Stripe subscription and payment integration planning
- `docs/planning/250614e_llm_tool_function_calling.md` - LLM tool function calling architecture
- `docs/planning/250616a_multi_chat_threads.md` - Multiple chat thread support
- `docs/planning/250627b_voice_input_microphone_chatbot.md` - Voice input for chatbot interface
- `docs/planning/250627c_vision_based_pdf_processing_pipeline.md` - Vision-based PDF processing approach

### Completed Planning
See `docs/planning/finished/` for historical planning documents and implementation records.

Recent completions:
- Production deployment is now live at https://www.spideryarn.com with SSL, Google SSO, and full database integration

### Future Planning
See `docs/planning/later/` for deferred features and future enhancements.

## Conversation Archives

Technical discussions and design decisions captured in `docs/conversations/`:
- Architecture explorations (ProseMirror, JSON Patch, tool frameworks)
- Implementation solutions (glossary timeouts, PDF processing, dev server management)
- Evaluation research (OpenAPI adoption, voice input, vision-based processing)

These provide historical context for architectural decisions and implementation approaches.

## Navigation Tips

**For newcomers**: Start with README.md → VISION_PRODUCT_STRATEGY.md → ARCHITECTURE_OVERVIEW.md → SETUP_DEVELOPMENT_ENVIRONMENT.md
**For developers**: Focus on CODING_PRINCIPLES.md → CODING_GUIDELINES.md → TESTING_OVERVIEW.md → TESTING_SETUP.md
**For AI agents**: Essential reads: CLAUDE.md → TASKS_SUBAGENTS.md → SETUP_DEV_SERVER_AUTOMATION.md → GIT_WORKTREES.md
**For tool development**: Begin with TOOL_ARCHITECTURE_AND_DEVELOPMENT_GUIDE.md → TOOL_EXECUTION_FRAMEWORK.md → LLM_PROMPT_TEMPLATES.md
**For AI features**: Start with LLM_PROMPT_TEMPLATES.md → TOOL_SUMMARISE.md → TOOL_GLOSSARY.md → TOOL_STRUCTURE_HEADINGS.md
**For highlighting work**: Use DESIGN_OVERLAPPING_TEXT_HIGHLIGHTS.md → TOOL_SEARCH_TEXT.md → TOOL_HIGHLIGHT.md
**For documentation work**: Use WRITE_EVERGREEN_DOC.md → UPDATE_INDEX_FOR_DOCUMENTATION.md → UPDATE_DOCUMENTATION_ORGANISATION_DOC.md
**For E2E testing**: Start with TESTING_BROWSER_AUTOMATION_OVERVIEW.md → TESTING_BROWSER_AUTOMATION_IMPLEMENTATION.md → TESTING_E2E_COVERAGE.md
**For production deployment**: See SETUP_DEPLOYMENT_PRODUCTION.md → DATABASE_PRODUCTION.md → AUTHENTICATION_SETUP.md

⭐ Marks essential starting points for different development areas.