# Chatbot Interface with assistant-ui Integration

## Goal, context

Implement a chatbot interface for document analysis using the assistant-ui React library. The chatbot will provide AI-powered assistance for reading and analyzing documents, with access to the currently active version of the document being read.

## References

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

**Stage 1-3+ Implementation Notes:**
- Created comprehensive `docs/CHATBOT_ASSISTANT_UI_INTEGRATION.md` with library research findings
- Built reusable `components/tab-container.tsx` component with TypeScript support
- Successfully generalized tab system from Table of Contents
- Renamed Glossary pane to Tools pane with "Glossary" and "Chat" tabs
- All existing functionality preserved, no regressions detected
- Created mock `app/api/chat/route.ts` API endpoint with 1.5s delay and contextual responses
- Built `components/chat-ui-states.tsx` with loading/error components using Phosphor icons
- API tested successfully: returns JSON responses, handles errors, simulates processing delay
- **Bonus: Built functional `components/simple-chat.tsx` UI for immediate testing**
  - Full chat interface working with fake API integration
  - Document context automatically extracted and passed to API (10k char limit)
  - Conversation persistence during tab switching (until page reload)
  - Loading states, error handling with retry, message history with timestamps
  - Enter key to send, styled user/assistant bubbles with Phosphor icons
- Foundation ready for assistant-ui integration in Stage 4

### Stage 3: Fake API Implementation ✅ **COMPLETED**
- [x] **Create mock chat API endpoint**
  - [x] Create `app/api/chat/route.ts` following existing API patterns
  - [x] Implement 1.5s artificial delay using `setTimeout`
  - [x] Return hardcoded conversational responses about document analysis
  - [x] Include sample responses for common questions (summarize, explain concepts, etc.)
  - [x] Add error simulation for testing error handling

- [x] **Add loading and error UI components**
  - [x] Import Phosphor icons: `CircleNotch` for loading, `Warning` for errors per `docs/STYLING.md:64-88`
  - [x] Create loading state with spinning icon during API calls
  - [x] Implement error display with warning icon and retry functionality
  - [x] Use existing error patterns from glossary implementation as reference

### Stage 4: Assistant-UI Integration ✅ **COMPLETED**
- [x] **Install and configure assistant-ui**
  - [x] Run `npm install @assistant-ui/react` (manual installation approach)
  - [x] Follow assistant-ui documentation for Next.js integration
  - [x] Configure Tailwind CSS integration for styling consistency
  - [x] Set up basic chat component with default configuration

- [x] **Create Chat tab component**
  - [x] Create `components/assistant-chat.tsx` using assistant-ui components
  - [x] Integrate with fake API endpoint from Stage 3
  - [x] Implement document context injection using existing `getDocumentContext()` function
  - [x] Add conversation display with separate User/Assistant message components
  - [x] Include composer with input field and send button functionality

- [x] **Integrate Chat tab into Tools pane**
  - [x] Add "Chat" tab to Tools pane alongside "Glossary" tab
  - [x] Use TabContainer from Stage 2 for consistent tab behaviour
  - [x] Set proper tab order and default selection (Glossary first, then Chat)
  - [x] Ensure smooth switching between Glossary and Chat tabs

- [x] **Test complete integration**
  - [x] Verify chat interface works with fake responses
  - [x] Test document context is properly provided to chat
  - [x] Confirm loading and error states display correctly
  - [x] Test tab switching preserves chat state during session

**Stage 4 Implementation Notes:**
- Successfully integrated assistant-ui v0.10.13 using primitive components architecture
- Created comprehensive `components/assistant-chat.tsx` with proper component composition:
  - `UserMessage` component with User icon and blue avatar background
  - `AssistantMessage` component with Robot icon and gray avatar background  
  - `Composer` component with auto-resizing input and send button
  - `ThreadSuggestions` component for empty state with clickable prompts
- Used `useLocalRuntime` (recommended approach) instead of `useExternalStoreRuntime` for simpler state management
- Implemented thread suggestions for common document questions that auto-send when clicked
- Proper styling with Phosphor icons (User, Robot, PaperPlaneTilt) matching existing design language
- Full integration with existing fake API including document context passing
- Build succeeds with no compilation errors (only unrelated ESLint warnings)
- Chat conversation state properly persists during tab switching within same session

**Key Learnings and Gotchas:**
- assistant-ui uses primitive component architecture (ThreadPrimitive, ComposerPrimitive, MessagePrimitive)
- `ThreadPrimitive.Messages` requires `components` prop with UserMessage/AssistantMessage definitions
- `useLocalRuntime` provides better built-in state management than `useExternalStoreRuntime`
- Phosphor icon names differ from expected (Robot not Bot, PaperPlaneTilt not Send)
- Document context automatically extracted via existing `getDocumentContext()` method (10k char limit)
- assistant-ui handles complex chat interactions while maintaining full styling control

### Stage 5: Document Context Integration
- [ ] **Implement document content injection**
  - [x] Document context already extracted via existing `getDocumentContext()` method (10k char limit)
  - [x] Chat API already accepts `documentContext` parameter  
  - [x] Document text automatically included in API calls
  - [ ] **ENHANCEMENT**: Format document context for optimal LLM understanding
    - [ ] Add document title and metadata to context
    - [ ] Include hierarchical heading structure for better navigation
    - [ ] Consider chunking strategy for very large documents (>10k chars)
  - [ ] **TESTING**: Test that AI responses reference document content appropriately
    - [ ] Verify fake API responses acknowledge document context
    - [ ] Test with various document types and sizes

- [ ] **Add context indicator in UI**
  - [ ] Display document title or indicator showing context is loaded
  - [ ] Add tooltip or info section explaining AI has document access  
  - [ ] Show character/token count of document context (optional)
  
**Stage 5 Implementation Notes:**
- Document context integration is mostly complete from Stage 4 implementation
- The `getDocumentContext()` function in `document-viewer.tsx:252-258` already extracts and limits content
- Focus should be on enhancing context formatting and adding UI indicators

### Stage: update documentation
- [ ] Update docs - this doc should point to `docs/CHATBOT_ASSISTANT_UI_INTEGRATION.md` and vice versa
- [ ] Update that `CHATBOT_ASSISTANT_UI_INTEGRATION.md` - it may not be accurate/up-to-date
- [ ] Update docs like `docs/ARCHITECTURE.md`, `SITE_ORGANISATION.md` etc any anywhere else that refers to the 'Glossary' pane to refer to the 'Tools' pane, and mention the new chatbot & APIs. Use a subagent

### Stage 6: Real LLM Integration
- [ ] **Replace fake API with actual LLM calls**
  - [ ] **EASY WIN**: Replace mock responses in `app/api/chat/route.ts` with real LLM calls
  - [ ] **REUSE**: Integrate with existing LLM configuration from `lib/config.ts`
  - [ ] **CONSISTENCY**: Use Anthropic Claude Sonnet 4 with temperature 0 as configured
  - [ ] **ROBUSTNESS**: Implement proper error handling for API failures
  - [ ] **RESILIENCE**: Add retry logic for transient failures  
  - [ ] **TESTING**: Test with various document types and conversation flows

- [ ] **Optimize prompt engineering**
  - [ ] **TEMPLATE**: Create system prompt template for document analysis
    - [ ] Include document title, context, and analysis instructions
    - [ ] Add guidelines for helpful, accurate responses about the document
    - [ ] Include instructions for citing specific document sections
  - [ ] **REUSE PATTERNS**: Look at existing prompts in `app/api/summarise/route.ts` and `app/api/glossary/route.ts`
  - [ ] **ITERATIVE**: Test prompt effectiveness with sample conversations
  
**Stage 6 Implementation Guidance:**
- Current fake API structure in `app/api/chat/route.ts` is ready for LLM integration
- Just replace the mock response logic with real LLM calls using existing patterns
- Document context is already being passed in `documentContext` parameter
- Consider implementing streaming responses for better UX (assistant-ui supports this)
- Look at `lib/prompts/templates/` for existing prompt template patterns

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