# Project Status

## Current State (Early Prototype)

Spideryarn Reading is in very early development. The foundational document parsing and viewing infrastructure is implemented, but core AI features are not yet built.

### What's Working

**Document Infrastructure**
- HTML document parsing using Cheerio (`lib/services/document-parser.ts`)
- Decomposition of HTML into structured `DocumentElement` objects with parent/child relationships
- Two-pane document viewer (`components/document-viewer.tsx`):
  - Left: Hierarchical tree view of document structure
  - Right: Element details (tag, content, attributes)
- Sample documents loaded from `static/examples/` (Chalmers consciousness paper, Rhizome text)
- Next.js app with basic routing (`app/`, `app/documents/[slug]/`)

**Data Model & Database Schema**
- **3-table Supabase/PostgreSQL schema** (`supabase/migrations/`):
  - `documents` - Document metadata (title, source_url)
  - `document_elements` - **Core table** - each HTML element as separate row with parent/child relationships
  - `summaries` - AI-generated summaries linked to elements at different granularities
- **Document parsing pipeline**: HTML → Cheerio → `DocumentElement[]` objects
  - Each HTML tag becomes database row with `parent_id`, `position`, `level`, `content`, `attributes`
  - Preserves hierarchy and sequential order for reconstruction
- **Virtual DOM approach**: Document structure as React state, rendered as interactive tree view
- TypeScript interfaces for `DocumentElement`, `Document`, `Summary` (`lib/types/document.ts`)

**Completed Architectural Decisions**
- Next.js + TypeScript + Tailwind CSS
- **Granular HTML decomposition**: Each element → separate database row with relational hierarchy
- **3-table schema**: documents, document_elements (core), summaries
- Virtual DOM approach for frontend state management
- Supabase/PostgreSQL with Row Level Security policies
- Frontend-driven queue for background processing (designed, not implemented)


### Development Status

- **Environment**: Local development server (`npm run dev`)
- **Dependencies**: Core packages installed (Next.js, Cheerio, Supabase client, UUID)
- **Static Assets**: Sample HTML documents in `static/examples/`
- **Database**: Supabase project configured, schema migrations ready (`20240101000000_create_documents_schema.sql`), but not connected to app yet

The codebase is well-structured for the planned architecture but needs the core AI summarization features to become a functional MVP.


## Future

### What's Missing (Priority Order)

**Core MVP Features**
1. **Hierarchical summaries** - The main value proposition, not yet implemented
2. **AI integration** - No Claude API integration yet (`lib/services/anthropic.ts` exists but unused)
3. **Summary generation workflow** - Backend processing queue for AI calls
4. **Summary display UI** - Separate pane for hierarchical summaries

**Infrastructure Gaps**
1. **Supabase integration** - Schema ready, client/server setup exists, but no database operations wired up
2. **Background processing** - Frontend queue for AI tasks not implemented
3. **Error handling** - Minimal error handling throughout
4. **Testing** - No tests for new Next.js codebase
5. **Environment variables** - `.env` setup needed for Supabase connection

**Secondary Features**
1. **Auto-generated table of contents**
2. **Glossary generation**
3. **Document upload functionality** (currently using static files)
4. **User authentication**

### Architecture pending

 **Pending Implementation**
- AI integration with Claude Sonnet 4
- Background processing queue
- Database connectivity
- Summary generation pipeline

### Next Steps

1. **Connect to Supabase** - Wire up database operations
2. **Implement basic AI service** - Claude API integration for summaries
3. **Build summary generation** - Core MVP feature
4. **Add summary display UI** - Show hierarchical summaries in separate pane
5. **Implement background queue** - For processing documents with AI
