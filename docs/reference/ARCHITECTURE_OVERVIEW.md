# Architecture Overview

Spideryarn Reading is a Next.js web application that provides AI-assisted document reading and analysis through a multi-pane interface with hierarchical navigation and contextual AI features. The system uses single-row document storage with reversible mutations for dynamic content enhancement.

## See also

- `docs/reference/ARCHITECTURE_DECISIONS.md` - Historical rationale and key architectural choices
- `docs/reference/VISION_PRODUCT_STRATEGY.md` - Strategic product vision and target market
- `docs/reference/CODING_PRINCIPLES.md` - Development philosophy emphasising rapid prototyping
- `docs/reference/DATABASE_SCHEMA.md` - Database structure and migration details
- `docs/reference/MUTATIONS_DOCUMENT_CONTENT_REVERSIBLE_TRANSFORMS.md` - Document transformation system implementation
- `docs/reference/CHATBOT_ASSISTANT_UI_INTEGRATION.md` - Chat interface architecture
- `docs/reference/UNIFIED_LEFT_PANE_TABBED_NAVIGATION.md` - Navigation pane design and features
- `docs/reference/TOOL_HIGHLIGHT.md` - Semantic highlighting system architecture and implementation
- `docs/reference/DESIGN_MOBILE_PLATFORM_DETECTION.md` - Mobile device detection and responsive design patterns
- `docs/reference/SETUP_DEVELOPMENT_ENVIRONMENT.md` - Development environment configuration

## Technology Stack

### Frontend Framework
- **Next.js 15**: App Router with React Server Components and streaming API routes
- **React 19 RC**: Required by App Router with automatic batching and new JSX Transform
- **TypeScript 5**: Strict mode enabled with comprehensive type safety

### Styling & UI
- **Tailwind CSS v4 Beta**: CSS-first configuration with native cascade layers
- **shadcn/ui**: Component library built on Radix UI primitives for interactive components
- **Phosphor Icons**: SSR-compatible icon system with Next.js optimisation

### AI Integration
- **Vercel AI SDK Core**: Multi-provider LLM support (Anthropic Claude, Google Gemini)
- **@assistant-ui/react**: Chat UI primitives with streaming and persistence support
- **Prompt Templates**: Nunjucks + Zod system for type-safe, validated prompts

### Backend & Data
- **Supabase**: PostgreSQL database with realtime subscriptions and authentication
- **Next.js API Routes**: Server-side logic with Zod validation and structured error handling
- **Single-Row Storage**: Complete documents stored as HTML with JSONB enhancements

### Development & Testing
- **Jest + React Testing Library**: Unit and integration testing framework
- **ESLint**: Code quality enforcement with Next.js specific rules
- **Git Worktrees**: Parallel development on experimental branches

## Core Architecture Patterns

### Document Storage Architecture

Documents are stored as complete HTML in single database rows rather than decomposed elements:

- **Original documents**: Stored in `documents` table with full HTML content
- **AI enhancements**: Stored separately in `document_enhancements` table as JSONB
- **Render pipeline**: Load original → Apply enhancements → Parse to virtual DOM → Render

Benefits:
- Clean separation between source content and AI-generated features
- Easy versioning and rollback of enhancements
- Dynamic toggling of transformations
- Composable enhancement system

### Document Mutations System ✓

Reversible document transformation system enables dynamic content enhancement:

- **Single mutation mode**: One transformation active at a time
- **Atomic operations**: Forward and reverse transforms with validation
- **Document modification**: Actual content changes (headings inserted, text replaced)
- **Debug utilities**: Comprehensive logging and state inspection

Implementation status: Core engine complete with AI headings integration working.

### Multi-Pane Interface

Two-pane resizable layout with unified left navigation:

- **Left pane**: Tabbed interface (Table of Contents, Chat, Glossary, Tweet Thread)
- **Right pane**: Main document viewer with dynamic content
- **Responsive design**: Collapsible panels with ResizablePanelGroup architecture and automatic mobile adaptations
- **Cross-pane communication**: React context for state synchronisation
- **Device detection**: Automatic mobile optimisations including auto-collapse and touch-friendly interactions (see `docs/reference/DESIGN_MOBILE_PLATFORM_DETECTION.md`)

### AI Feature Integration

Standardised approach across all AI features:

- **Template system**: Nunjucks + Zod for consistent prompt engineering
- **Multi-provider support**: Configurable LLM providers with tier-based model mapping
- **Streaming responses**: Real-time UI updates during generation
- **Error handling**: Graceful degradation and user feedback

## Key Features

### AI-Generated Content ✓
- **Hierarchical summaries**: Multi-granularity document analysis
- **Enhanced headings**: AI-generated section navigation
- **Glossary extraction**: Key terms and definitions
- **Tweet thread generation**: Social media format conversion

### Interactive Navigation ✓
- **Scroll synchronisation**: Coordinated movement between panes
- **Search functionality**: Cross-element text highlighting with Mark.js
- **Semantic highlighting**: AI-powered highlighting with confidence-based visual intensity
- **Tooltip summaries**: Hover-based section previews
- **Collapsible structure**: Hierarchical content organisation

### Chat Interface ✓
- **Document context**: Conversations include current document content
- **Database persistence**: Chat history storage and restoration
- **Multi-provider support**: Claude and Gemini LLM backends
- **Streaming responses**: Real-time conversation flow

### Authentication & Data Management ✓
- **Supabase Auth**: Email/password and Google OAuth integration
- **User-scoped documents**: Row-level security with profile management
- **Long-lasting sessions**: 1-week duration with automatic refresh
- **Profile management**: User settings and document ownership

## Background Processing

Frontend-driven task orchestration:

- **Simple queue**: React component maintains task queue in state
- **API orchestration**: Sequential calls to Next.js API routes
- **Real-time updates**: UI reflects progress as results arrive
- **Prototype approach**: Accepts limitations (multi-tab conflicts) for simplicity

Future migration to server-side queuing planned as system matures.

## Environment Configuration

### Development
- **Local server**: `npm run dev` with hot reloading
- **Database types**: Auto-generated TypeScript definitions from Supabase schema
- **Testing**: Jest with React Testing Library and dedicated test environment

### Production (Planned)
- **Deployment**: Vercel platform integration
- **Environment variables**: Supabase connection and API keys
- **Model selection**: Configurable LLM providers per feature

## Status Indicators

- ✓ **Core architecture implemented**: Document storage, mutations, multi-pane UI
- ✓ **AI features complete**: Summaries, glossary, headings, chat interface
- ✓ **Authentication system**: Full user management and data security
- 📋 **File upload**: PDF conversion and document import functionality
- 📋 **Production deployment**: Vercel hosting and environment configuration