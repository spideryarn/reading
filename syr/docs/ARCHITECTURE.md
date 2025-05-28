# Architecture questions & decisions

see:
- `README.md`
- `docs/TABLE_OF_CONTENTS_PANE.md`

## High-level background & decisions

- Web or mobile?
  - Web for now.

- Online or desktop?
  - Start with a local dev webserver, then we can decide later whether to host (e.g. on Vercel serverless), or Tauri for a local app experience.

- Open source vs paid?
  - Eventually this will be a for-profit business in some way, though I haven't figured out any details.

- AI
  - We'll probably use Anthropic Claude Sonnet 4 for almost everything AI-related, including chat, searching the web, manipulating HTML, transcribing PDFs, etc.
  - For voice recognition, we'll probably use OpenAI Whisper API.
  - **Implementation Standard**: All LLM functionality uses our standardised Nunjucks + Zod template system. See [LLM_PROMPT_TEMPLATES.md](LLM_PROMPT_TEMPLATES.md) for complete implementation guidance.

- Background processing
  - Lots of what we'll want to do will involve slow calls to an LLM. And some of it can be done upfront or in the background. So we'll want to be able to call the LLMs in the background, update our storage, and for that to immediately update & be reflected in the frontend.
  - Perhaps one day we'll use a backend message queue that somehow syncs to the frontend. But to start with, let's keep things simple - so perhaps the frontend will maintain a simple queue data structure of work that needs to be done, and orchestrate the backend via API calls.
  - USER/AI AGREED: Frontend-driven queue to start - React component maintains task queue in state, calls Next.js API routes sequentially, updates UI as results arrive. Simple to implement and debug. We'll structure the queue manager as a clean abstraction to enable future migration to server-side queue if needed. Accept limitations (multi-tab conflicts, refresh loses queue) for prototype simplicity.

- Programming languages/frameworks? 
  - Python is my favourite language by far, and I have lots of utility code that I love to reuse. I'm tempted to use Python for the backend (e.g. with FastAPI, and SQLAlchemy). Or at least to begin with.
  - But I want this app to be very interactive, and so probably most/all of the app will be TypeScript. In the past, I've used SvelteKit, but the community is much smaller, fewer components (e.g. Supabase realtime support), so I'm open to using React.
  - I really hate writing CSS, so I'd like the LLM to do all of that work, and my preference would be for it to pick the framework that it knows best (presumably with the most pretraining data), and that works best with the frontend framework.
  - In the past, I've built an app hosted on Vercel that had two separate environments - a Python serverless backend, and then a SvelteKit backend for server-side rendering, with Svelte on the frontend. It worked fairly well after a lot of tinkering. But I'm a bit wary about the complexity. So I'm at least considering doing everything in SvelteKit, or ditching server-side rendering, or any other ideas that would simplify things.
  - USER/AI AGREED: Next.js with TypeScript and Tailwind CSS. The AI will handle all programming, and this stack enables fastest development because: (1) AI has most training data on React/Next.js patterns, (2) huge ecosystem of pre-built components for reading apps (react-markdown, PDF libraries, highlighting, etc.), (3) Next.js API routes with streaming support work well with LLM integration, (4) Tailwind CSS is what AI knows best for styling, (5) mature Supabase/realtime integrations if needed later.

- Storage
  - I like Sqlite, Postgres, and Supabase as technologies.
  - I'm tempted to start with Sqlite (or even just JSON flat files to start with), just to get things moving, and switch over to Supabase soon after.
  - That said, I'm wondering about building everything from scratch using Supabase's realtime functionality...
  - USER/AI AGREED: Start directly with Supabase from the beginning. This avoids migration complexity later and lets us architect around realtime capabilities from day one. Supabase provides Postgres database, realtime subscriptions, built-in auth, and good Next.js integration.

- Data structures
  - We'll ultimately be displaying the document on the frontend as a webpage.
  - But we'll be doing a lot of stuff to it, e.g. providing hover-able glossaries, providing hierarchical summaries and rewrites of sections at different granularities, providing alternative tables of contents, annotating sections with commentary, highlighting subsets/passages based on different criteria or searches, refactoring the document sometimes to provide alternative reading trajectories, different UI panes (e.g. with table of contents, index, glossary, chat interface).
  - Sometimes we'll want to iterate through the document forwards like a list (get me the text in the order it will be displayed). Sometimes we'll want to walk it like a tree (e.g. represent the table of contents hierarchically with paragraphs nested inside). Sometimes we'll want to swap out components. Sometimes we'll want to create links between sections of the document. Sometimes we'll want to filter it, or (less often) reorder it.
  - On the backend, should we store the document a single big row containing all the HTML? Or should we break all the elements of the HTML up into separate rows, using the SQL relational structure to represent the hierarchy & ordering so we can rebuild it dynamically into an HTML document (perhaps in different ways based on queries)?
  - On the frontend, should we store all that in some core data structure that gets rendered into HTML? Or should we store all of that metadata on the HTML/DOM itself?
  - USER/AI AGREED: Decompose HTML documents into individual elements stored as separate database rows with parent/child relationships. This enables flexible querying, reordering, and annotation. We'll implement HTML parsing/reconstruction in TypeScript using libraries like Cheerio or jsdom, keeping everything in one codebase without needing a separate Python service.
    - UPDATE We changed our mind. We're going to store entire doc as a single row. see below
  - USER/AI AGREED: Use Virtual DOM approach on frontend - maintain document structure as React state/context (array/tree of element objects) and render to JSX components. This is more idiomatic for React and makes complex interactions easier to implement (hoverable glossaries, dynamic highlights, alternative reading paths, etc.).

## MVP Features

- USER/AI AGREED: Focus on basic document upload/display with hierarchical summaries as the core feature. This alone provides rich functionality - users can zoom in/out of content at different granularities. We'll add a few simple features early (auto-generated ToC, glossary) but the hierarchical summaries are the main value proposition for the MVP.
- USER/AI AGREED: Start with separate pane for hierarchical summaries - shows only the summarized version in a dedicated panel. This is simplest to implement and allows easy experimentation with different summary interactions later. Can iterate on the UX as we learn what works best.
- USER/AI AGREED: Start with sample HTML files stored in the repo - no upload functionality initially. This removes complexity around file handling, conversion, and user content management. Can focus on core reading/summary features first, then add upload capabilities later.

## Document Storage Architecture

- USER/AI AGREED: Store documents as single rows in the database with HTML content as text, rather than decomposing into element-level rows. This simplifies implementation and better supports our use case where:
  - Document transformations (lenses) require full document context and are better done in-memory than through SQL
  - AI operations need complete document understanding, not isolated elements
  - Frontend will cache parsed documents in state anyway (Virtual DOM approach)
  - Complex document restructuring is easier with in-memory transformations than SQL queries

- Enhancement storage pattern:
  - Original documents stored in `documents` table with full HTML content
  - Document enhancements (better ToC, glossaries, summaries, etc.) stored in separate `document_enhancements` table:
    ```
    document_id | enhancement_type | data (JSONB)
    ```
  - Apply transformations during render pipeline:
    1. Load original HTML from database
    2. Load relevant enhancements
    3. Parse HTML to virtual DOM structure
    4. Apply enhancements (inject new headings, add glossary terms, etc.)
    5. Render transformed document
  
  - Benefits:
    - Clean separation between source content and AI-generated enhancements
    - Easy versioning and history of enhancements
    - Toggle lenses/enhancements on/off dynamically
    - Simple rollback if AI generates poor content
    - Multiple enhancement types can compose without conflicts

## Document Mutations System

- USER/AI AGREED: Implement reversible document transformation system for applying/reverting "lenses" like AI-generated headings, paragraph summarisation, content filtering, etc.
- Start with single mutation mode - only one transformation active at a time, with later expansion to composable mutation stacks
- Each mutation includes both forward transforms (apply changes) and reverse transforms (undo changes)
- Document structure is actually modified (headings inserted, content replaced) rather than just changing navigation
- **Implementation Status**: Core mutation engine complete with atomic operations, comprehensive validation, and debug utilities. AI headings integration working with reliable scroll-to-heading functionality.
- See detailed design and implementation plan: `planning/250527a_reversible_document_mutations.md`
- See implementation documentation: `docs/MUTATIONS.md`

