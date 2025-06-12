# Site Organisation

Spideryarn Reading is a database-driven, user-centric AI document analysis application built on Next.js App Router with comprehensive authentication, document management, and AI-powered reading enhancement features.

## See also

- `README.md` - Project goals and high-level implementation approach
- `docs/reference/DOCUMENTATION_ORGANISATION.md` - Comprehensive overview of all project documentation
- `docs/reference/ARCHITECTURE_DECISIONS.md` - Key architectural decisions and data structure choices
- `docs/reference/ARCHITECTURE_OVERVIEW.md` - Current system architecture implementation
- `docs/reference/DATABASE_SCHEMA.md` - Complete database schema and data model
- `docs/reference/AUTHENTICATION_OVERVIEW.md` - Authentication system architecture and flows
- `docs/reference/UNIFIED_LEFT_PANE.md` - Unified left pane implementation with tabbed interface
- `docs/reference/COMMAND_PALETTE.md` - Global command palette implementation

## Application Architecture Overview

**Core Philosophy**: Database-driven document management with user authentication, AI-powered analysis features, and modern responsive UI components built on Next.js App Router.

**Key Design Principles**:
- **User-centric**: Authentication-first with document ownership and privacy controls
- **Database-driven**: Supabase storage with Row Level Security for data isolation
- **AI-enhanced**: Multiple AI providers with comprehensive usage tracking
- **Real-time ready**: Live updates for chat, AI processing, and collaborative features

## Application Routes Structure

### **Public Routes**
```
/ (homepage)
├── Landing page with app description
├── Document discovery (for authenticated users)
└── Authentication prompts for anonymous users

/documents/[slug]/share
├── Public document sharing (no authentication required)
├── Read-only document viewer
└── SEO-friendly for public content
```

### **Authentication Routes** (`/auth/*`)
```
/auth/login
├── Email/password and Google OAuth login
├── Next parameter for post-login redirects
└── Form validation with error handling

/auth/signup
├── Email/password registration
├── Automatic profile creation
└── Immediate login after signup

/auth/profile
├── User profile management
├── Document listing and management
└── Account settings and preferences

/auth/reset-password
├── Email-based password reset flow
├── /auth/reset-password/confirm for reset completion
└── Gmail SMTP integration

/auth/callback
├── OAuth callback handling
├── Session creation and redirect logic
└── Error handling for failed authentication

/auth/logout
/auth/signout
└── Session termination and cleanup
```

### **Protected Document Routes** (`/documents/*`)
```
/documents
├── User's document library
├── Upload workflow entry point
├── Document management and deletion
└── Requires authentication

/documents/[slug]
├── Interactive document viewer
├── Two-pane resizable layout (navigation/tools + document)
├── AI-powered features (summaries, headings, glossary, chat)
├── User ownership validation
└── Full document analysis workflow

/documents/[slug]/tweets
├── AI-generated Twitter thread view
├── Thread editing and management
└── Social media integration features
```

### **Upload & Content Management**
```
/upload
├── PDF upload with drag-and-drop
├── URL-based document extraction
├── Upload progress and validation
└── Metadata capture and processing

/settings
├── User preferences and configuration
├── AI model selection
└── Privacy and sharing settings
```

### **API Endpoints** (`/api/*`)

**Document Management**:
```
/api/upload-pdf
├── PDF file upload to Supabase Storage
├── PDF-to-HTML conversion with AI assistance
└── Document metadata tracking

/api/extract-url
├── Web page content extraction
├── HTML cleaning and processing
└── Document creation from URLs

/api/delete-document
└── Secure document deletion with ownership validation

/api/documents/[slug]/download
/api/documents/[slug]/original
└── Document file access and retrieval
```

**AI Processing**:
```
/api/chat
├── Document-contextual AI chat
├── Chat thread persistence
└── Multi-provider LLM support

/api/summarise
├── Multi-granularity document summaries
├── Hierarchical content analysis
└── Configurable summary levels

/api/multi-summarise
└── Batch summary generation at multiple granularities

/api/glossary
├── AI-powered entity extraction
├── Term categorisation and definitions
└── Searchable glossary generation

/api/headings
├── Semantic heading generation
├── Document structure enhancement
└── Navigation improvement

/api/semantic-search
├── Vector-based document search
├── Context-aware query processing
└── Semantic similarity matching

/api/tweet-thread
├── AI-generated Twitter thread creation
├── Content adaptation for social media
└── Thread structure optimisation
```

**Development & Testing**:
```
/api/fake_success_delay
/api/fake_error
└── UI testing endpoints for loading states and error handling

/api/realtime-demo
└── Real-time feature testing and demonstration
```

## Component Architecture

### **Application Layout**
- `app/layout.tsx` - Root layout with authentication providers
- `app/client-layout.tsx` - Client-side layout wrapper
- `middleware.ts` - Session management and automatic token refresh

### **Authentication System**
- `components/auth/login-form.tsx` - Email/password login with validation
- `components/auth/signup-form.tsx` - Registration form with error handling
- `components/auth/oauth-button.tsx` - Google OAuth integration
- `components/auth/profile-dropdown.tsx` - User navigation and logout
- `lib/auth/` - Server-side authentication utilities and route protection

### **Document Interface Architecture**

**Main Layout Components**:
- `resizable-document-layout.tsx` - Primary layout coordinator with panel management
- `unified-left-pane.tsx` - Consolidated navigation and AI tools (6 tabs)
- `vertical-icon-nav.tsx` - Collapsible icon navigation bar (VSCode-style)
- `simple-document-viewer.tsx` - Document content display with search integration
- `document-header.tsx` - Document title, actions, and metadata
- `document-header-actions.tsx` - Document management controls

**Unified Left Pane Tabs**:
1. **Original** (`Article` icon) - Source document table of contents
2. **AI-generated** (`Robot` icon) - AI-enhanced heading structure
3. **Summary** (`ListBullets` icon) - Multi-granularity summaries
4. **Chat** (`ChatCircle` icon) - Document-contextual AI chat
5. **Glossary** (`BookOpen` icon) - AI-extracted terms and definitions
6. **Search** (`MagnifyingGlass` icon) - Cross-document and semantic search

**Navigation & Interaction**:
- `tab-container.tsx` - Tabbed interface state management
- `heading-tree.tsx` - Hierarchical content navigation
- `command-palette.tsx` - Global keyboard-driven command interface (Cmd+K)

### **AI Features Integration**

**Chat System**:
- `assistant-chat.tsx` - Advanced chat with @assistant-ui/react integration
- `chat-markdown.tsx` - Rich text rendering for AI responses
- `chat-ui-states.tsx` - Loading states and error handling

**Content Analysis**:
- `summary-pane.tsx` - Summary display with expandable sections
- `multi-summary-pane.tsx` - Multiple granularity summary management
- `dual-summary-sliders.tsx` - Granularity level controls

**Social Features**:
- `tweet-thread-view.tsx` - Twitter thread generation and editing
- `tweet-card.tsx` - Individual tweet display and management

### **UI Component System**

**shadcn/ui Integration**:
- `components/ui/` - shadcn/ui components with custom Spideryarn theme
- `Button` - Primary action component with orange brand theming
- `Dialog` - Modal interfaces for document actions
- `Alert` - Error and success state messaging
- `Loading` - Standardised loading indicators

**Application Components**:
- `app-header.tsx` - Flexible page header with actions
- `footer.tsx` - Application footer
- `delete-document-button.tsx` - Secure document deletion interface

## Data Flow Architecture

### **Database-Driven Document Management**

**Document Storage Model** (Single-row approach):
1. **Upload**: PDF/URL → Supabase Storage + metadata extraction
2. **Processing**: AI-powered HTML conversion and content analysis
3. **Storage**: Full HTML + plaintext content in `documents` table
4. **Enhancement**: AI-generated content in `document_enhancements` table
5. **Access**: User ownership validation via Row Level Security policies

**User Data Model**:
- **Authentication**: Supabase Auth with automatic profile creation
- **Document Ownership**: Foreign key relationships with `created_by` fields
- **Privacy Controls**: `is_public` flags for sharing and SEO
- **Usage Tracking**: Comprehensive AI call tracking and cost analysis

### **AI Processing Pipeline**

**Multi-Provider Support**:
- Anthropic Claude (Sonnet 4, Haiku) for primary processing
- Google Gemini for alternative processing
- Configurable model tiers via `lib/config.ts`
- Comprehensive token usage and cost tracking

**Template System**:
- Nunjucks templates with Zod validation (`lib/prompts/templates/`)
- Type-safe prompt generation and response parsing
- Consistent AI call patterns across features

**Real-time Updates**:
- Supabase real-time subscriptions for live AI processing updates
- Chat message synchronisation across browser tabs
- Document enhancement progress tracking

### **Authentication & Security**

**Session Management**:
- Cookie-based sessions with @supabase/ssr
- Long-lasting sessions (1 week JWT, never-expiring refresh tokens)
- Automatic token refresh via middleware
- Cross-domain support for production deployment

**Data Security**:
- Row Level Security policies for user data isolation
- Server-side route protection with proper 401 responses
- Secure document ownership validation
- Protected API endpoints with authentication requirements

## User Workflow Patterns

### **New User Journey**
1. **Discovery**: Public document sharing links or marketing materials
2. **Registration**: Email/password or Google OAuth signup
3. **Onboarding**: Upload first document (PDF or URL)
4. **Analysis**: AI-powered document enhancement and exploration
5. **Productivity**: Chat, summaries, glossary, and navigation tools

### **Document Processing Workflow**
1. **Upload**: Drag-and-drop PDF or paste URL at `/upload`
2. **Processing**: AI-powered content extraction and HTML conversion
3. **Storage**: Document saved to user's library with metadata
4. **Enhancement**: On-demand AI analysis (summaries, glossary, headings)
5. **Interaction**: Chat, search, and navigation within document viewer

### **Reading & Analysis Experience**
1. **Document Selection**: Browse library at `/documents`
2. **Interface Setup**: Two-pane layout with customisable panel sizes
3. **Navigation**: Table of contents, AI headings, or search-based navigation
4. **AI Assistance**: Chat queries, summaries, glossary lookups
5. **Sharing**: Public sharing via `/documents/[slug]/share` URLs

### **Command-Driven Interaction**
- **Global Command Palette** (Cmd+K): Quick access to all features
- **Keyboard Shortcuts**: Efficient navigation and tool switching
- **Cross-Element Search**: Unified search across document content
- **Semantic Search**: AI-powered content discovery

## Development Architecture

### **Service Layer Organisation**
- `lib/services/database/` - Type-safe database operations for all tables
- `lib/services/llm-provider.ts` - Multi-provider AI integration
- `lib/services/storage.ts` - Supabase Storage file management
- `lib/services/document-parser.ts` - HTML processing and content extraction

### **Configuration Management**
- `lib/config.ts` - Centralised application configuration
- Environment-based settings (`.env.local`, `.env.test`)
- AI model tier configuration and provider selection
- Database connection and authentication settings

### **Type Safety & Validation**
- `lib/types/database.ts` - Auto-generated Supabase types
- `lib/types/document.ts` - Document structure interfaces  
- `lib/types/mutation.ts` - AI enhancement type definitions
- Zod schemas for API validation and prompt templates

### **Testing Infrastructure**
- Jest with React Testing Library for component testing
- API route testing with Supabase integration
- Authentication workflow testing
- Database security and RLS policy validation

## Performance & Scaling Considerations

### **Database Optimisation**
- GIN indexes for full-text search on document content
- Optimised queries for user-scoped document access
- Efficient AI call tracking and analytics
- Real-time subscription patterns for live updates

### **Asset Management**
- Next.js optimisation for Phosphor Icons with SSR support
- Supabase Storage for large file handling (PDFs, images)
- Efficient HTML storage in database for query performance
- Compressed and cached static assets

### **AI Integration Efficiency**
- Template-based prompt generation for consistency
- Comprehensive caching to prevent duplicate AI calls
- Multi-granularity processing for scalable summarisation
- Token usage tracking for cost management and optimisation

This architecture supports both rapid prototyping for feature development and scalable production deployment with comprehensive user management, security, and AI integration capabilities.