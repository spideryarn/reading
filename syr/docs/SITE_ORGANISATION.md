# Site Organisation

Spideryarn Reading uses a hierarchical, document-centric architecture built on Next.js with AI-powered features for enhanced document comprehension.

## See also

- `README.md` - Project goals and high-level implementation approach
- `docs/ARCHITECTURE.md` - Detailed architectural decisions and data structure choices
- `docs/PROJECT_STATUS.md` - Current development state and missing features
- `docs/SETUP.md` - Development environment setup and Supabase configuration

## Key Organisational Principles

- **Document-centric routing**: Documents accessible via `/documents/[slug]` pattern
- **Component-based UI**: Reusable React components for document viewing, summaries, and navigation
- **AI-first design**: Core features (summaries, glossaries, ToC) powered by Anthropic Claude integration
- **Hierarchical data structure**: HTML elements stored with parent/child relationships for flexible navigation
- **Static-to-dynamic transition**: Currently using sample files, architected for database-driven content

## Site Structure

### **Application Routes** (`app/`)

```
/ (homepage)
├── Dynamic document listing from static/examples/
└── Navigation to individual documents

/documents/[slug]
├── Server-side HTML parsing and preparation
├── Client-side interactive document viewer
├── Three-column layout: structure tree, content, glossary
└── AI-powered features (summaries, ToC, glossary)

/api/summarise
└── Anthropic Claude integration for hierarchical summaries

/api/glossary
└── AI-powered glossary term generation
```

### **Component Hierarchy**

**Document Viewing**
- `DocumentViewer` - Primary 3-column layout container
- `DocumentSummary` - Document-level AI summary generation
- `TableOfContents` - Interactive ToC with hover tooltips

**Navigation & Structure**
- Root layout with consistent header/branding
- Dynamic slug-based routing for documents
- Hierarchical element tree display

### **Data Flow Architecture**

**Document Processing Pipeline**
1. **Source**: HTML files in `static/examples/` (temporary)
2. **Parsing**: Cheerio-based HTML → structured elements (`document-parser.ts`)
3. **AI Processing**: Parallel markdown conversion for Claude integration
4. **Storage**: Hierarchical element structure with parent/child relationships
5. **Display**: Virtual DOM approach with React state management

**AI Feature Integration**
- Template-based prompts with Zod validation (`lib/prompts/`)
- Configurable granularity levels (phrase → paragraph → section → page)
- Streaming responses for real-time summary generation
- Parallel processing for multiple document sections

### **Asset Organisation**

**Static Content**
- `public/` - Standard Next.js assets (favicons, logos)
- `static/examples/` - Sample HTML documents for development
- `static/img/` - Project branding and images

**Configuration**
- Environment-based setup (`env.local`)
- Supabase with custom port configuration to avoid conflicts
- AI model configuration in `lib/config.ts`

## Navigation Patterns

### **User Journey**
1. **Homepage**: Browse available documents via auto-generated listing
2. **Document Selection**: Click through to individual document viewer
3. **Reading Experience**: Three-pane interface with:
   - Left: Hierarchical document structure tree
   - Centre: Element details and content
   - Right: AI-generated glossary and contextual information
4. **AI Features**: Hover tooltips, dynamic summaries, enhanced navigation

### **Developer Navigation**
- Component-based architecture enables feature isolation
- Service layer (`lib/services/`) for reusable functionality
- Type-safe interfaces throughout (`lib/types/`)
- Documentation-driven development with comprehensive docs

## Planned Enhancements

**Storage Migration**
- Transition from static files to Supabase database storage
- Implementation of document upload functionality
- User authentication and personalised document libraries

**AI Feature Expansion**
- Background processing queue for AI operations
- Multiple document comparison and analysis
- Custom lens/filter functionality for different reading modes

**User Experience**
- Mobile-responsive design optimisation
- Advanced search and filtering capabilities
- Collaborative reading features

## Architecture Benefits

This organisation supports the core goal of AI-assisted document comprehension through:

- **Scalable AI Integration**: Template-based prompts enable consistent, configurable AI interactions
- **Flexible Document Structure**: Hierarchical storage allows multiple navigation modes and reading paths
- **Component Modularity**: Feature isolation enables rapid experimentation and iteration
- **Progressive Enhancement**: Static file foundation allows quick prototyping while architecting for dynamic functionality