# Architecture Decisions

Historical rationale and key architectural choices that shaped the Spideryarn Reading system. This document captures the decision-making process and trade-offs considered during development.

## See also

- `docs/reference/ARCHITECTURE_OVERVIEW.md` - Current system architecture and implementation status
- `docs/reference/VISION_PRODUCT_STRATEGY.md` - Strategic vision informing architectural choices
- `docs/reference/CODING_PRINCIPLES.md` - Development philosophy guiding decisions
- `planning/*.md` - Detailed planning documents for major features
- `docs/reference/DATABASE_SCHEMA.md` - Database design evolution and migration decisions

## Platform & Framework Decisions

### Web-based Application
**Decision**: Build as web application rather than desktop app
**Rationale**: 
- Faster iteration and deployment cycles for prototype phase
- Cross-platform compatibility without additional development overhead
- Easier user onboarding (no installation required)
- Future deployment flexibility (Vercel serverless vs desktop packaging)

### Next.js with TypeScript
**Decision**: Next.js with TypeScript and Tailwind CSS over SvelteKit
**Rationale**:
- AI has most training data on React/Next.js patterns, enabling faster development
- Huge ecosystem of pre-built components for reading apps (react-markdown, PDF libraries)
- Next.js API routes with streaming support work well with LLM integration
- Tailwind CSS is optimal for AI-assisted styling
- Mature Supabase/realtime integrations available

**Trade-offs considered**: 
- SvelteKit has smaller community and fewer components
- Python backend (FastAPI + SQLAlchemy) rejected due to complexity of maintaining separate environments
- Server-side rendering complexity vs single-page app simplicity

### Component Library Strategy
**Decision**: shadcn/ui for interactive components, raw Tailwind for layouts
**Rationale**:
- Provides consistency and accessibility while maintaining development speed
- Built on Radix UI primitives for robust interactive behaviour
- Components are copied and customisable rather than externally dependent
- Avoids over-engineering with full design system prematurally

## Data Architecture Decisions

### Single-Row Document Storage
**Decision**: Store complete documents as single HTML rows rather than element decomposition
**Original approach**: Decompose HTML into individual elements stored as separate database rows
**Why changed**:
- Document transformations require full document context, better done in-memory
- AI operations need complete document understanding, not isolated elements
- Frontend caches parsed documents in state anyway (Virtual DOM approach)
- Complex document restructuring easier with in-memory transformations than SQL queries
- Simpler implementation and debugging

**Trade-offs accepted**:
- Less flexible for element-level querying
- Larger row sizes in database
- Full document reprocessing for small changes

### Enhancement Storage Pattern
**Decision**: Separate `document_enhancements` table with JSONB data
**Benefits**:
- Clean separation between source content and AI-generated features
- Easy versioning and history of enhancements
- Toggle enhancements on/off dynamically
- Simple rollback if AI generates poor content
- Multiple enhancement types compose without conflicts

### Frontend Virtual DOM Approach
**Decision**: Maintain document structure as React state/context rather than DOM manipulation
**Rationale**:
- More idiomatic for React applications
- Makes complex interactions easier (hoverable glossaries, dynamic highlights)
- Enables alternative reading paths and content transformations
- Better performance for frequent UI updates

## AI Integration Decisions

### Multi-Provider LLM Support
**Decision**: Vercel AI SDK Core with Anthropic Claude and Google Gemini
**Default**: Claude Sonnet 4 for production, configurable per feature
**Rationale**:
- Avoid vendor lock-in during prototype phase
- Cost optimisation through provider selection
- Performance testing across different models
- Tier-based model mapping (anthropic-balanced, google-cheap)

### Prompt Template System
**Decision**: Nunjucks + Zod for all LLM functionality
**Benefits**:
- Type safety and validation for AI inputs/outputs
- Consistent prompt engineering patterns
- Template reusability across features
- Clear separation of prompts from business logic

### Background Processing Strategy
**Decision**: Frontend-driven queue initially, API orchestration through Next.js routes
**Rationale**:
- Simple to implement and debug for prototype
- Avoids complexity of separate backend queue systems
- React component maintains task queue in state
- Sequential API calls with real-time UI updates

**Limitations accepted**:
- Multi-tab conflicts (tasks don't sync across browser tabs)
- Refresh loses queue state
- Not suitable for long-running or heavy processing

**Future migration path**: Server-side queue with clean abstraction layer when needed

## Storage & Database Decisions

### Supabase from Day One
**Decision**: Start directly with Supabase rather than SQLite migration path
**Rationale**:
- Avoids migration complexity later
- Architect around realtime capabilities from beginning
- Built-in authentication and row-level security
- Good Next.js integration and TypeScript support

**Alternative considered**: SQLite/JSON files for initial prototype
**Why rejected**: Migration complexity outweighs initial simplicity benefits

### Document Mutations System
**Decision**: Reversible transformation system with atomic operations
**Rationale**:
- Enables dynamic content enhancement without permanent changes
- Clean undo/redo functionality for user experimentation
- Composable transformations (though starting with single mutation mode)
- Reliable scroll-to-heading after document modifications

**Implementation approach**:
- Single mutation active at a time (expandable to mutation stacks later)
- Forward and reverse transforms with comprehensive validation
- Debug utilities for development and troubleshooting

## User Interface Decisions

### Multi-Pane Layout
**Decision**: Two-pane resizable layout with unified left navigation
**Rationale**:
- Natural separation between navigation/tools and document content
- Tabbed left pane consolidates related functionality
- Resizable panels adapt to user preferences and screen sizes
- Cross-pane communication through React context

### Chat Integration Strategy
**Decision**: @assistant-ui/react library with custom runtime adapter
**Benefits**:
- Standardised chat UI primitives with streaming support
- Database persistence for conversation history
- Document context automatically included
- Multi-provider LLM backend support

## MVP Scope Decisions

### Core Feature Focus
**Decision**: Hierarchical summaries as primary value proposition
**Rationale**:
- Rich functionality from single feature (zoom in/out at different granularities)
- Clear user value without feature complexity
- Foundation for other AI-powered reading enhancements

### Sample Documents First
**Decision**: Start with static HTML files in repository rather than upload functionality
**Benefits**:
- Removes complexity around file handling and conversion
- Focus on core reading/summary features first
- Faster iteration on document interaction patterns
- Upload capabilities added later once core experience proven

### Authentication Early
**Decision**: Implement complete authentication system before public features
**Rationale**:
- User-scoped document storage from beginning
- Professional tool targeting requires user accounts
- Row-level security patterns established early
- Avoids major architectural changes later

## Technology Evolution

### React 19 & Next.js 15 Adoption
**Decision**: Adopt cutting-edge versions for prototype development
**Benefits**:
- Latest performance improvements and developer experience
- App Router patterns align with project architecture
- Streaming support essential for AI features
- Early adoption acceptable for prototype (no production users)

### Testing Strategy
**Decision**: Jest + React Testing Library with dedicated test environment
**Rationale**:
- Industry standard for React applications
- Good integration with Next.js and TypeScript
- Comprehensive component and integration testing capabilities
- Dedicated `.env.test` environment for isolated testing

## Business Model Alignment

### Professional Tool Positioning
**Decision**: Target academic and research professionals rather than general consumers
**Impact on architecture**:
- Authentication and user management prioritised
- Document privacy and security features
- Professional UI patterns and workflows
- Integration capabilities for institutional use

### For-Profit Business Model
**Decision**: Commercial product rather than open source tool
**Architectural implications**:
- User tracking and analytics capabilities
- Subscription and billing system preparedness
- Scalable infrastructure planning
- IP protection considerations