# Project Status

**see `docs/reference/VISION.md` for long-term strategic vision and target market**

## Current State (Early Prototype)

Spideryarn Reading is in active development with core AI features now implemented. The application provides AI-assisted document reading with hierarchical summaries, glossaries, and intelligent navigation.

### What's Working

**Document Infrastructure**
- HTML document parsing using Cheerio (`lib/services/document-parser.ts`)
- Document elements with deterministic ID generation using UUID v5
- **PDF upload and conversion** - Direct PDF to HTML conversion using Claude/Gemini APIs with Supabase Storage
- **File storage system** - Original PDFs stored in Supabase Storage with database references
- Two-pane resizable document viewer layout:
  - Left: Unified pane with 6 tabs (Original ToC, AI headings, Summary, Chat, Glossary, Search)
  - Right: Document viewer with element details and highlighting
  - Collapsible left pane with keyboard shortcuts (Ctrl+B)
- **Document header** - PDF icon for documents with stored files, File icon for HTML-only documents
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

**Search Features (Implemented)** ✓
- **Cross-element text search** - DOM-based search using Mark.js library finds phrases spanning inline elements within block containers
- **Precise text highlighting** - Yellow background highlights on exact matched text, not just element highlighting
- **Enhanced navigation** - Search results scroll to specific text matches with pulse animations and visual feedback
- **Auto-focus search input** - Automatically focuses when Search tab is clicked for immediate typing
- **Pinned search header** - Search input stays visible at top when scrolling through results
- **Case sensitivity toggle** - Advanced options with case-sensitive matching (default: case-insensitive)
- **Debounced search** - 300ms delay with proper highlight clearing for optimal performance
- **Smart result display** - Element type metadata, text excerpts, and accurate match counts
- **Click-to-navigate** - Results scroll to document elements with specific text selection highlighting
- **Edge case handling** - Empty queries, whitespace normalization, rapid typing, and multiple matches per element
- **Comprehensive testing** - Full test coverage including Mark.js integration, UI enhancements, and cross-element scenarios

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
- `/api/upload-pdf` - PDF upload, storage, and conversion to HTML
- `/api/documents/[slug]/download` - Original file download with access control
- `/api/documents/[slug]/original` - Original HTML document viewing
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
- **Storage**: Supabase Storage bucket configured for PDF and document file management
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
1. **Fix ToC auto-scroll regression** - Restore bidirectional navigation between document and ToC
2. **Enhanced vertical icon navigation** - 3-pane approach with icons on far left
3. **Social media integration** - Direct posting to Twitter/X and Bluesky
4. **Persistent AI content** - Store generated summaries/headings in Supabase
5. **Enhanced document upload** - Support for additional file formats beyond PDF
6. **User authentication** - Personal document libraries
7. **Document expand/collapse** - Granular content visibility controls

### Infrastructure Improvements
1. **Background processing** - Move from frontend-driven to proper job queue
2. **Comprehensive testing** - Unit and integration tests
3. **Performance optimisation** - Lazy loading for large documents
4. **Enhanced error handling** - User-friendly error messages

### Next Immediate Steps

1. **Fix ToC auto-scroll regression** - Resolve issue where document element clicks don't scroll ToC
2. **Social media posting** - Complete Bluesky integration for tweet threads
3. **Vertical icon navigation** - Add far-left icon strip for 3-pane approach
4. **Document visibility controls** - Add expand/collapse functionality for sections
5. **Persist AI content** - Save generated summaries and headings to database

see also:
- `docs/ARCHITECTURE.md` - System architecture and design decisions
- `planning/250527a_reversible_document_mutations.md` - Upcoming mutations system
- `docs/UNIFIED_LEFT_PANE.md` - Unified left pane implementation details
- `docs/AI_GLOSSARY.md` - Glossary feature documentation