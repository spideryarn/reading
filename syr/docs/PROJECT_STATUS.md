# Project Status

## Current State (Early Prototype)

Spideryarn Reading is in active development with core AI features now implemented. The application provides AI-assisted document reading with hierarchical summaries, glossaries, and intelligent navigation.

### What's Working

**Document Infrastructure**
- HTML document parsing using Cheerio (`lib/services/document-parser.ts`)
- Document elements with deterministic ID generation using UUID v5
- Three-column document viewer layout:
  - Left: Table of Contents with tabs for Original/AI-generated headings
  - Middle: Document content with element details
  - Right: Glossary pane with entity extraction
- Sample documents loaded from `static/examples/` (Chalmers consciousness paper, Rhizome text, The Bitter Lesson)
- Next.js app with routing (`app/`, `app/documents/[slug]/`)

**AI Features (Implemented)**
- **Hierarchical summaries** - AI-generated summaries at multiple granularities with hover tooltips
- **Glossary generation** - Entity extraction with categorisation (person, concept, place, etc.)
- **AI-generated headings** - Semantic document structure generation for better navigation
- **Tweet thread generation** - AI-powered conversion of documents to Twitter thread format
- **Multi-LLM provider support** - Anthropic Claude and Google Gemini via Vercel AI SDK
- **Advanced chat interface** - Full @assistant-ui integration with document context
- **Prompt template system** - Nunjucks templates with Zod validation (`lib/prompts/templates/`)

**Data Model & UI Components**
- **Document parsing pipeline**: HTML → Cheerio → structured elements with hierarchical relationships
- **Table of Contents** component with:
  - Original headings extraction
  - AI-generated headings in separate tab
  - Hover tooltips showing AI summaries (using Tippy.js)
  - Loading states and error handling
- **Glossary component** with ordered entity display
- **Tweet thread view** with copy-to-clipboard and social sharing (Bluesky integration planned)
- **Chat interface** with assistant-ui primitives and document context integration
- **shadcn/ui component library** - Standardized interactive components (Button, Dialog, Alert, Loading)
- **Phosphor Icons SSR** - Server-side rendering compatible icon system

**API Endpoints**
- `/api/summarise` - Text summarisation with configurable granularity
- `/api/glossary` - Entity extraction from documents
- `/api/headings` - AI-powered heading generation
- `/api/tweet-thread` - Convert documents to Twitter thread format
- `/api/chat` - Chat interface with document context
- `/api/fake_success_delay` & `/api/fake_error` - Test endpoints

### Development Status

- **Environment**: Local development server (`npm run dev`)
- **Dependencies**: Core packages installed (Next.js, Cheerio, Supabase client, UUID, Tippy.js, Nunjucks, Zod)
- **Static Assets**: Sample HTML documents in `static/examples/`
- **Database**: Supabase project configured with migrations, connection established
- **Testing**: Console-first approach for new features

## Architecture

see `docs/ARCHITECTURE.md` for detailed system architecture

### Key Architectural Decisions (Implemented)
- Next.js + TypeScript + Tailwind CSS
- shadcn/ui component library for interactive components
- Multi-provider LLM support (Anthropic Claude, Google Gemini) via Vercel AI SDK
- Single-row document storage (not decomposed elements) for MVP simplicity
- Virtual DOM approach for frontend state management
- On-demand AI processing with user-triggered buttons
- Reversible document mutations system for AI transformations
- Prompt template system with Nunjucks + Zod validation
- Git worktree setup for parallel feature development

## Future Enhancements

### Planned Features (see `planning/*.md` for details)
1. **Enhanced glossary** - Click-to-scroll navigation and text highlighting
2. **Social media integration** - Direct posting to Twitter/X and Bluesky
3. **Persistent AI content** - Store generated summaries/headings in Supabase
4. **Document upload** - Allow users to upload their own HTML documents
5. **User authentication** - Personal document libraries
6. **Collapsible/resizable panes** - Improved layout flexibility
7. **Document expand/collapse** - Granular content visibility controls

### Infrastructure Improvements
1. **Background processing** - Move from frontend-driven to proper job queue
2. **Comprehensive testing** - Unit and integration tests
3. **Performance optimisation** - Lazy loading for large documents
4. **Enhanced error handling** - User-friendly error messages

### Next Immediate Steps

1. **Complete glossary navigation** - Implement click-to-scroll functionality
2. **Social media posting** - Complete Bluesky integration for tweet threads
3. **Collapsible panes** - Implement resizable and collapsible layout system
4. **Document visibility controls** - Add expand/collapse functionality for sections
5. **Persist AI content** - Save generated summaries and headings to database

see also:
- `docs/ARCHITECTURE.md` - System architecture and design decisions
- `planning/250527a_reversible_document_mutations.md` - Upcoming mutations system
- `docs/TABLE_OF_CONTENTS_PANE.md` - ToC implementation details
- `docs/AI_GLOSSARY.md` - Glossary feature documentation