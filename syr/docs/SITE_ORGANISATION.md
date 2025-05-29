# Site Organisation

Spideryarn Reading uses a hierarchical, document-centric architecture built on Next.js with AI-powered features for enhanced document comprehension.

## See also

- `README.md` - Project goals and high-level implementation approach
- `docs/DOCUMENTATION_ORGANISATION.md` - Summarises the main evergreen docs
- `docs/ARCHITECTURE.md` - Detailed architectural decisions and data structure choices
- `docs/PROJECT_STATUS.md` - Current development state and missing features
- `docs/SETUP.md` - Development environment setup and Supabase configuration
- `docs/TABLE_OF_CONTENTS_PANE.md` - ToC implementation with tabs and AI features
- `docs/AI_GLOSSARY.md` - Glossary feature documentation
- `docs/LLM_PROMPT_TEMPLATES.md` - Prompt template system architecture

## Site Structure

### **Application Routes** (`app/`)

```
/ (homepage)
├── Dynamic document listing from static/examples/
└── Navigation to individual documents

/documents/[slug]
├── Server-side HTML parsing and preparation
├── Client-side interactive document viewer
├── Three-column layout: ToC, content, glossary
└── AI-powered features (summaries, headings, glossary)

/api/summarise
└── Anthropic Claude integration for hierarchical summaries

/api/glossary
└── AI-powered entity extraction and categorisation

/api/headings
└── Semantic heading generation for documents

/api/fake_success_delay
/api/fake_error
└── Test endpoints for UI development
```

### **Component Hierarchy**

**Document Viewing**
- `DocumentViewer` - Primary 3-column layout container
  - Left: `TableOfContents` with Original/AI tabs
  - Middle: Document content with element details
  - Right: Glossary pane with extracted entities
- `DocumentSummary` - Document-level AI summary display
- `TableOfContents` - Interactive ToC with:
  - Tabbed interface (Original vs AI-generated headings)
  - Hover tooltips showing AI summaries (Tippy.js)
  - Loading states and error handling

**Navigation & Structure**
- Root layout with consistent header/branding
- Dynamic slug-based routing for documents
- Hierarchical element tree display with deterministic IDs

### **Data Flow Architecture**

**Document Processing Pipeline**
1. **Source**: HTML files in `static/examples/`
2. **Parsing**: Cheerio-based HTML → structured elements (`document-parser.ts`)
3. **ID Generation**: Deterministic UUIDs using UUID v5 (`deterministicId.ts`)
4. **AI Processing**: On-demand via user-triggered buttons
5. **Display**: Virtual DOM approach with React state management

**AI Feature Integration**
- Nunjucks template system with Zod validation (`lib/prompts/templates/`)
- Configurable granularity levels (phrase → paragraph → section → page)
- Caching to prevent duplicate API calls
- Loading/error button pattern with Phosphor icons

### **Asset Organisation**

**Static Content**
- `public/` - Standard Next.js assets (favicons, logos, manifest)
- `static/examples/` - Sample HTML documents:
  - Chalmers (1995) - Facing Up to the Problem of Consciousness
  - Rhizome - 1000 Plateaus introduction
  - The Bitter Lesson
- `static/img/` - Project branding and images

**Configuration**
- Environment-based setup (`.env.local`)
- Supabase configuration with custom ports
- AI model configuration in `lib/config.ts`
- TypeScript types in `lib/types/`

## Navigation Patterns

### **User Journey**
1. **Homepage**: Browse available documents via auto-generated listing
2. **Document Selection**: Click through to individual document viewer
3. **Reading Experience**: Three-column interface with:
   - Left: Table of Contents with tabs for Original/AI headings
   - Centre: Document content (currently shows element structure)
   - Right: Glossary with categorised entities
4. **AI Features**: 
   - Generate buttons for on-demand processing
   - Hover tooltips for section summaries
   - Tabbed views for different perspectives

### **Developer Navigation**
- Component-based architecture enables feature isolation
- Service layer (`lib/services/`) for reusable functionality
- Prompt templates (`lib/prompts/templates/`) for AI features
- Type-safe interfaces throughout (`lib/types/`)
- Planning docs (`planning/`) for feature development tracking
- Git worktree setup for parallel development branches