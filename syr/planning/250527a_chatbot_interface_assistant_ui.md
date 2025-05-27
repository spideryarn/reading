# Chatbot Interface with assistant-ui Integration

## Goal, context

Implement a chatbot interface for document analysis using the assistant-ui React library. The chatbot will provide AI-powered assistance for reading and analyzing documents, with access to the currently active version of the document being read.

### Key Requirements
- Integrate assistant-ui library for AI chat interface
- Add chatbot as a new tab in the "Tools" pane (renamed from "Glossary" pane)
- Generalize existing tab system from Table of Contents for reuse
- Support conversational interaction about the current document
- Provide document context to AI in conversations
- Handle streaming responses (future enhancement)
- Store conversation history in Supabase (future enhancement)

### Context Integration
- Chatbot will have access to the currently-active version of the document
- Initially provide full document content in first message prompt
- Later stages will add web search capability with user consent
- For now, conversations reset on page reload (no persistence)

## Principles, key decisions

### Library Selection
- **assistant-ui chosen** over alternatives (nlux, @chatscope/chat-ui-kit-react, react-chat-elements)
- Rationale: AI-first design, built for LLM integration, composable architecture, Tailwind integration, active community
- Built on shadcn/ui and Tailwind CSS for consistent styling with existing codebase

### UI/UX Architecture
- **Tools Pane**: Rename current "Glossary" pane to "Tools" to accommodate multiple tool types
- **Tab System**: Generalize existing tab behaviour from Table of Contents component for reuse
- **Tab Structure**: Tools pane will contain "Glossary" and "Chat" tabs
- **Layout**: Maintain existing 3-column layout (Document Structure, Element Details, Tools)

### Technical Approach
- **Fake API First**: Start with mock responses to test interface before LLM integration
- **Progressive Enhancement**: Begin with basic chat, layer in complexity gradually
- **Existing Patterns**: Reuse existing API patterns from lib/config.ts (Sonnet 4, temp 0)
- **Error Handling**: Use Phosphor icons for loading/error states per docs/STYLING.md

### Conversation Management
- **Single Thread**: One conversation thread per session initially
- **Page Reload Reset**: Conversations reset on page reload (no persistence yet)
- **Document Context**: Provide full document content in system/first message
- **Future Persistence**: Plan for Supabase storage and conversation history browsing

## Actions

### Stage 1: Research and Documentation ✅ **COMPLETED**
- [x] **Research assistant-ui library thoroughly**
  - [x] Use subagent to search web for comprehensive documentation
  - [x] Gather installation instructions, API examples, and integration patterns
  - [x] Find examples of document/context integration
  - [x] Document findings in `docs/ASSISTANT_UI_INTEGRATION.md` following `docs/WRITING_EVERGREEN_DOCS.md`
  - [x] Include code snippets, configuration options, and best practices
  - [x] Test accessibility: ensure docs are complete enough for future development

### Stage 2: Tab System Generalization ✅ **COMPLETED**
- [x] **Extract and generalize tab behaviour from Table of Contents**
  - [x] Use subagent to analyze existing tab implementation in `components/table-of-contents.tsx:363-387`. Does this stage make sense? Is there some existing Tailwind component etc that we could be making use of to avoid reinventing the wheel. Discuss with user if needed.
  - [x] Create reusable `TabContainer` component accepting tab definitions and content renderers
  - [x] Move tab styling to shared component (active/inactive states, borders, hover effects)
  - [x] Ensure TypeScript types support dynamic tab configurations
  - [x] Test with current Table of Contents to ensure no regression

- [x] **Rename Glossary pane to Tools pane**
  - [x] Update `components/document-viewer.tsx:235` header from "Glossary" to "Tools"
  - [x] Implement Tools pane with tabbed interface using new TabContainer
  - [x] Create "Glossary" tab containing existing glossary functionality
  - [x] Preserve all existing glossary features (loading, error states, click-to-scroll)
  - [x] Test with existing glossary workflow to ensure no functionality lost

- [x] **Visual verification with Playwright**
  - [x] Use Playwright MCP to take screenshots of Tools pane
  - [x] Verify tab styling matches Table of Contents design language
  - [x] Check responsive behaviour and hover states
  - [x] Ensure accessibility (keyboard navigation, screen reader support)

- [x] **STOP AND REVIEW with user after this stage**

**Stage 1-2 Implementation Notes:**
- Created comprehensive `docs/ASSISTANT_UI_INTEGRATION.md` with library research findings
- Built reusable `components/tab-container.tsx` component with TypeScript support
- Successfully generalized tab system from Table of Contents
- Renamed Glossary pane to Tools pane with "Glossary" and "Chat" tabs
- All existing functionality preserved, no regressions detected
- Pages loading successfully (HTTP 200), build errors resolved

### Stage 3: Fake API Implementation
- [ ] **Create mock chat API endpoint**
  - [ ] Create `app/api/chat/route.ts` following existing API patterns
  - [ ] Implement 1.5s artificial delay using `setTimeout`
  - [ ] Return hardcoded conversational responses about document analysis
  - [ ] Include sample responses for common questions (summarize, explain concepts, etc.)
  - [ ] Add error simulation for testing error handling

- [ ] **Add loading and error UI components**
  - [ ] Import Phosphor icons: `Spinner` for loading, `ExclamationMark` for errors per `docs/STYLING.md:64-88`
  - [ ] Create loading state with spinning icon during API calls
  - [ ] Implement error display with warning icon and retry functionality
  - [ ] Use existing error patterns from glossary implementation as reference

### Stage 4: Assistant-UI Integration
- [ ] **Install and configure assistant-ui**
  - [ ] Run `npm install @assistant-ui/react` or use their CLI setup
  - [ ] Follow assistant-ui documentation for Next.js integration
  - [ ] Configure Tailwind CSS integration for styling consistency
  - [ ] Set up basic chat component with default configuration

- [ ] **Create Chat tab component**
  - [ ] Create `components/chat-interface.tsx` using assistant-ui components
  - [ ] Integrate with fake API endpoint from Stage 3
  - [ ] Implement document context injection in first message (look to reuse existing code that either converts the current doc to Markdown or uses element.content - if you can't find it, ask the user)
  - [ ] Add basic conversation display with user/assistant messages
  - [ ] Include input field with send button functionality

- [ ] **Integrate Chat tab into Tools pane**
  - [ ] Add "Chat" tab to Tools pane alongside "Glossary" tab
  - [ ] Use TabContainer from Stage 2 for consistent tab behaviour
  - [ ] Set proper tab order and default selection
  - [ ] Ensure smooth switching between Glossary and Chat tabs

- [ ] **Test complete integration**
  - [ ] Verify chat interface works with fake responses
  - [ ] Test document context is properly provided to chat
  - [ ] Confirm loading and error states display correctly
  - [ ] Test tab switching preserves chat state during session

### Stage 5: Document Context Integration
- [ ] **Implement document content injection**
  - [ ] Modify chat API to accept document content parameter
  - [ ] Extract document text from elements in document viewer
  - [ ] Include document title, headings, and content in system prompt
  - [ ] Format document context for optimal LLM understanding
  - [ ] Test that AI responses reference document content appropriately

- [ ] **Add context indicator in UI**
  - [ ] Display document title or indicator showing context is loaded
  - [ ] Add tooltip or info section explaining AI has document access
  - [ ] Show character/token count of document context (optional)

### Stage: update documentation
- [ ] Update docs like `docs/ARCHITECTURE.md`, `SITE_ORGANISATION.md` etc any anywhere else that refers to the 'Glossary' pane to refer to the 'Tools' pane, and mention the new chatbot & APIs. Use a subagent

### Stage 6: Real LLM Integration
- [ ] **Replace fake API with actual LLM calls**
  - [ ] Integrate with existing LLM configuration from `lib/config.ts`
  - [ ] Use Anthropic Claude Sonnet 4 with temperature 0 as configured
  - [ ] Implement proper error handling for API failures
  - [ ] Add retry logic for transient failures
  - [ ] Test with various document types and conversation flows

- [ ] **Optimize prompt engineering**
  - [ ] Create system prompt template for document analysis
  - [ ] Include instructions for helpful, accurate responses
  - [ ] Add guidelines for citing document sections
  - [ ] Test prompt effectiveness with sample conversations

### Stage 7: Enhanced Features
- [ ] **Add conversation management**
  - [ ] Implement "Clear conversation" button
  - [ ] Add confirmation dialog for conversation reset
  - [ ] Preserve conversation state during tab switches
  - [ ] Test conversation clearing functionality

- [ ] **Add web search toggle**
  - [ ] Create checkbox for "Allow web search" (default: false)
  - [ ] Integrate with existing web search capabilities if available
  - [ ] Update system prompt based on web search permission
  - [ ] Add UI indicator when web search is enabled/disabled

### Stage 8: Future Enhancements (Later Stages)
- [ ] **Implement conversation persistence**
  - [ ] Design database schema for chat conversations in Supabase
  - [ ] Store conversation threads with document associations
  - [ ] Add conversation history browsing interface
  - [ ] Implement conversation search functionality

- [ ] **Add streaming response support**
  - [ ] Implement Server-Sent Events for real-time response streaming
  - [ ] Update assistant-ui configuration for streaming
  - [ ] Add proper loading states for streaming responses
  - [ ] Test streaming performance and error handling

- [ ] **Advanced features**
  - [ ] Message editing with conversation fork/branch handling
  - [ ] File attachment support for additional context
  - [ ] Export conversation transcripts
  - [ ] Integration with document annotation system

### Testing and Quality Assurance
- [ ] **Write automated tests**
  - [ ] Create unit tests for TabContainer component
  - [ ] Add integration tests for chat functionality
  - [ ] Test document context injection
  - [ ] Verify error handling scenarios

- [ ] **Performance testing**
  - [ ] Test with large documents (performance impact)
  - [ ] Verify memory usage during long conversations
  - [ ] Check tab switching performance
  - [ ] Monitor API response times

- [ ] **Accessibility testing**
  - [ ] Verify keyboard navigation works for tabs and chat
  - [ ] Test screen reader compatibility
  - [ ] Check color contrast ratios
  - [ ] Ensure focus management is correct

### Git Management
- [ ] **Create feature branch**
  - [ ] Create `250527a_chatbot_interface` branch
  - [ ] Move any existing changes to feature branch
  - [ ] Commit progress incrementally following `docs/GIT_COMMITS.md`

- [ ] **Final integration**
  - [ ] Merge feature branch back to main after testing
  - [ ] Update documentation with new chatbot features
  - [ ] Create summary of implementation decisions

## Appendix

### Assistant-UI Library Context
- GitHub: https://github.com/assistant-ui/assistant-ui
- Strong adoption with 100+ companies using it
- Built specifically for AI/LLM chat interfaces
- Composable architecture inspired by Radix UI
- First-class Vercel AI SDK integration
- Tailwind CSS integration for styling control

### Existing Tab Implementation Reference
Current tab system in `components/table-of-contents.tsx:363-387`:
```tsx
<div className="border-b border-gray-200 mb-4">
  <nav className="flex space-x-8" aria-label="Tabs">
    <button
      onClick={() => setActiveTab('original')}
      className={`py-2 px-1 border-b-2 font-medium text-sm ${
        activeTab === 'original'
          ? 'border-blue-500 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      Original
    </button>
    {/* Additional tabs... */}
  </nav>
</div>
```

### Document Context Structure
Document elements from `lib/types/document.ts` will provide:
- Document title and metadata
- Hierarchical heading structure  
- Full text content in reading order
- Element relationships for context understanding

### API Integration Patterns
Following existing patterns from:
- `app/api/glossary/route.ts` for API structure
- `app/api/summarise/route.ts` for LLM integration
- `lib/config.ts` for AI model configuration