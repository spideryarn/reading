# Goal

Add a tweet thread view to the document pane that recasts academic papers and complex documents as digestible tweet-style threads, helping academics efficiently grasp key concepts and findings.

## Context

User wants to add a special view to the document pane as a new tab that displays documents reformatted as tweet threads. This feature is inspired by academics who find tweet threads an efficient way to digest scientific papers - typically getting the overall essence in 12-15 well-structured tweets.

The feature will use AI to automatically generate tweet threads that follow best practices for academic content on social media, making complex documents more accessible while maintaining academic rigour.

Key requirements from user:
- Simple implementation first, complexity later
- Tab in middle pane: "Document" (default) and "Tweet thread" 
- Automatic AI generation (no manual editing initially)
- Read-only display with attractive Twitter-inspired styling
- Primary use case: academics reading new papers efficiently

## References

- `docs/CODING_PRINCIPLES.md` - Emphasises simple prototyping, gradual complexity
- `docs/ARCHITECTURE.md` - Document storage and mutation system architecture
- `docs/UI_INTERFACE.md` - Current multi-pane layout with tabs
- `docs/MUTATIONS_DOCUMENT_CONTENT_REVERSIBLE_TRANSFORMS.md` - Existing document transformation system (not used for v1)
- `components/document-viewer.tsx` - Current document viewer implementation
- `components/tab-container.tsx` - Reusable tab component
- `docs/planning/250530a_shadcn_ui_adoption.md` - Ongoing shadcn/ui adoption (assume completed)
- `docs/LLM_PROMPT_TEMPLATES.md` - Template system for AI calls

## Principles & Key Decisions

1. **Separate from mutations system** - Tweet threads are a view, not a document transformation
2. **Simple first** - No editing, persistence, or export in v1
3. **Twitter aesthetic** - Borrow visual design but these aren't actual tweets
4. **AI decides structure** - Let Claude determine optimal thread length and flow
5. **280-char constraint** - Respect Twitter's character limit for authenticity
6. **Academic focus** - Optimise for paper comprehension, not engagement
7. **Dedicated page** - Separate route for full-screen tweet thread experience (changed from tab-based)

## Actions

### Stage 1: Research & Design

- [x] Research best practices for academic tweet threads
  - ✅ Found comprehensive guidelines from Nature, PLOS, academic Twitter guides
  - ✅ Key findings: 10-15 tweets optimal, story structure crucial, visual breaks important
  - ✅ Structure: Hook → Context → Key findings → Implications → Credits

- [x] Create prompt template for tweet thread generation
  - ✅ Created `lib/prompts/templates/tweet-thread.njk` with academic focus
  - ✅ Created `lib/prompts/templates/tweet-thread.ts` with Zod validation
  - ✅ Implemented 280-character limit validation per tweet
  - ✅ Default target length of 12 tweets (3-20 range allowed)
  - ✅ Academic narrative structure: hook → context → findings → implications
  - ✅ JSON response format with numbered tweets and summary

- [x] Design tweet card component mockup
  - ✅ Analyzed existing component styling patterns in codebase
  - ✅ Designed card structure following Spideryarn conventions:
    - `border-l-2 border-gray-200` left accent (like glossary items)
    - `hover:bg-gray-50` hover states for interactivity
    - Typography: `text-base leading-relaxed` for tweet content
    - Number display: `text-xs text-gray-500` for tweet numbering (1/n)
    - Consistent spacing: `py-2 px-3` padding with `space-y-2` content gaps
  - ✅ Twitter-inspired but Spideryarn-consistent visual elements
  - ✅ Planned structure for future image support in card layout

- [x] Update this planning doc with design decisions
  - ✅ Template system: Using Nunjucks + Zod with 280-char validation
  - ✅ JSON response format: Array of numbered tweets with summary
  - ✅ UI styling: Following existing Spideryarn component patterns
  - ✅ Target length: 12 tweets default (3-20 range) based on research

### Stage 2: API Implementation

- [x] Create `/api/tweet-thread` endpoint
  - ✅ Created `app/api/tweet-thread/route.ts` with full input validation
  - ✅ Accept document HTML/content with Zod schema validation
  - ✅ Use tweet-thread prompt template with LLM integration
  - ✅ Return array of tweet objects with text and metadata
  - ✅ Handle content truncation for large documents (50k+ chars)
  - ✅ Include processing metadata (content length, truncation status, tweet count)

- [x] Write tests for API endpoint
  - ✅ Created comprehensive test suite with 7 test cases
  - ✅ Test with sample academic paper content
  - ✅ Verify tweet length constraints (280 characters)
  - ✅ Check thread coherence and structure validation
  - ✅ Test input parameter validation and error handling
  - ✅ Test LLM error scenarios and JSON parsing failures

- [x] Run tests and fix any issues
  - ✅ All 7 tests passing successfully
  - ✅ Fixed syntax errors and import issues
  - ✅ Resolved schema naming conflicts
  - ✅ Fixed TypeScript linting issues

- [x] Git commit: "feat: add tweet thread generation API endpoint"
  - ✅ Committed with hash `a31aae6`
  - ✅ Follows established git commit message patterns

### Stage 3: UI Components

- [ ] Create `TweetCard` component
  - Display individual tweet with number
  - Twitter-inspired styling using Tailwind
  - Proper typography and spacing
  - Visual separator between tweets

- [ ] Create `TweetThreadView` component
  - Container for tweet cards
  - Scrollable list layout
  - Loading state while generating
  - Error handling

- [ ] Write component tests
  - Test rendering of tweets
  - Test loading/error states

- [ ] Git commit: "feat: add tweet thread UI components"

### Stage 4: Integration

- [ ] Create tweet thread page route
  - Add `/documents/[slug]/tweets` page
  - Use existing TweetThreadView component
  - Add navigation back to document

- [ ] Add "Tweet thread" button to document header
  - Place next to "View original" button
  - Link to tweet thread page route
  - Use consistent button styling

- [ ] Test full integration
  - Navigate to tweet thread page
  - Verify thread generation works
  - Test back navigation to document

- [ ] Git commit: "feat: add dedicated tweet thread page with navigation"

### Stage 5: Styling & Polish

- [ ] Enhance tweet card styling
  - Add subtle shadows/borders
  - Improve spacing and alignment
  - Add tweet number styling (1/15 format)
  - Consider adding timestamp-like elements

- [ ] Add smooth transitions
  - Fade in tweets on load
  - Smooth tab switching
  - Loading animation

- [ ] Test with various documents
  - Try different paper types
  - Check thread quality
  - Verify styling consistency

- [ ] Git commit: "style: enhance tweet thread visual design"

### Stage 6: Documentation & Cleanup

- [ ] Create `docs/TWEET_THREAD_VIEW.md`
  - Document feature architecture
  - Explain design decisions
  - Note future enhancement ideas

- [ ] Update `docs/UI_INTERFACE.md`, `docs/UI_COMPONENTS.md`, `docs/DESIGN_OVERVIEW.md` etc
  - Document new tab structure
  - Update component hierarchy

- [ ] Review with user
  - Demo functionality
  - Gather feedback
  - Note future enhancements

- [ ] Move this doc to `docs/planning/finished/`
- [ ] Final git commit

## Future Enhancements (Not for v1)

Based on user suggestions and research:

- **Audience targeting**: Different thread styles for different audiences
- **Image extraction**: Include key figures/charts from papers
- **Citations**: Link tweets back to document sections
- **Web context**: Search for additional paper context/background
- **Export**: Copy thread to clipboard or save as text
- **Editing**: Allow manual refinement of generated threads
- **Templates**: Pre-defined thread structures (findings, story, takeaways)
- **Persistence**: Save generated threads for later viewing
- **Sharing**: Generate shareable links to threads

## Appendix

### Key Tweet Thread Best Practices (from research)

1. **Hook is crucial**: First tweet determines if people read the thread
2. **One idea per tweet**: Each tweet should stand alone
3. **Tell a story**: Academic narrative from problem → findings → impact
4. **Visual breaks**: Use line breaks and bullet points
5. **Credit properly**: Tag co-authors, journals, funders
6. **Ideal length**: 10-15 tweets for academic content
7. **Clear language**: Avoid jargon, explain technical terms
8. **Action-oriented**: What should readers do with this knowledge?

### Example Thread Structure for Academic Papers

1. Hook: Exciting announcement + main finding
2. Context: Why this research matters
3. Problem: What gap does this fill?
4. Method: How was it studied? (simplified)
5-10. Key findings: One per tweet
11. Implications: What does this mean?
12. Limitations: What's still unknown?
13. Next steps: Future research
14. Credits: Team, funding, journal
15. Link: Full paper access

### Technical Notes

- Character counting should exclude URLs (Twitter auto-shortens)
- Consider Unicode characters (emojis, special symbols)
- Line breaks count as characters
- Future: Could use Twitter's actual API constraints