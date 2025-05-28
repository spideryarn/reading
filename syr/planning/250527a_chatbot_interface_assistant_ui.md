# Chatbot Interface with assistant-ui Integration

## Current Status (Updated: 28 May 2025)

✅ **Stage 1-4**: Research, Tab System, Fake API, assistant-ui Integration - COMPLETED  
✅ **Stage 5A** (partial): Removed duplicate `chat-interface.tsx` implementation  
✅ **Stage 6**: Real LLM Integration - COMPLETED with enhanced error handling  
✅ **Testing**: Comprehensive unit tests added for core components (37/38 passing)  
🔄 **Next**: Manual testing with real documents, address Next.js build issues, then component refactoring (Stage 5A)

### Recent Updates (28 May 2025)
- Removed automatic retry logic per user feedback
- Added comprehensive error logging on both client and server
- Enhanced error messages with specific codes and actionable details
- Integrated real Anthropic Claude API with proper error handling
- Created prompt template system for document analysis
- Added comprehensive unit tests for chat components and hooks
- Fixed Jest configuration issues for ESM module support
- Enhanced useChatRuntime with network error handling
- Fixed test suite issues: 37/38 tests now passing
- Improved TabContainer to validate defaultTab properly
- Identified Next.js build cache issues requiring attention

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

**IMMEDIATE NEXT STEPS** (Updated after implementation):
1. ✅ Remove `chat-interface.tsx` - single implementation reduces confusion
2. ✅ Focus on real LLM integration (Stage 6) as highest priority
3. Test the chat functionality with real documents
4. Then refactor components (Stage 5A) for better architecture
5. Add type safety and error handling improvements (Stage 6A)

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
- [x] Update docs - this doc should point to `docs/CHATBOT_ASSISTANT_UI_INTEGRATION.md` and vice versa
  - See also: [Assistant-UI Integration Guide](/docs/CHATBOT_ASSISTANT_UI_INTEGRATION.md)
- [x] Update that `CHATBOT_ASSISTANT_UI_INTEGRATION.md` - it may not be accurate/up-to-date

### Stage 5A: Component Architecture Refactoring (NEW)

**Context**: We currently have two chat implementations:
1. `components/assistant-chat.tsx` - Uses primitive components (ThreadPrimitive, ComposerPrimitive, etc.)
2. `components/chat-interface.tsx` - Uses high-level components (Thread, Composer, etc.)

**Analysis**:
- assistant-ui documentation recommends primitive components for maximum customization
- Primitives pattern aligns with modern React libraries (Radix UI, shadcn/ui)
- Need to split components for better separation of concerns and testability
- Web best practices emphasize separating view and non-view logic

**Decision**: Keep primitive components approach and refactor
- [x] **DECISION MADE**: Use `assistant-chat.tsx` with primitives as primary implementation
- [x] **Remove** `chat-interface.tsx` to avoid confusion and maintenance burden ✅ **COMPLETED**
  - Deleted the file from `components/`
  - No import updates needed as it was not currently used

- [ ] **Refactor** `assistant-chat.tsx` into separate components:
  - [ ] Create `components/chat/ChatThread.tsx`
    - Move `Thread` component logic
    - Handle thread viewport and message display
    - Include empty state with suggestions
  - [ ] Create `components/chat/ChatComposer.tsx`
    - Move `Composer` component logic
    - Handle input field and send button
    - Include keyboard event handling
  - [ ] Create `components/chat/ChatMessage.tsx`
    - Move `UserMessage` and `AssistantMessage` components
    - Accept role prop to determine styling
    - Keep Phosphor icon integration
  - [ ] Update `components/assistant-chat.tsx`
    - Import new split components
    - Keep as main container with runtime provider
    - Pass documentContext through to child components

- [ ] **Testing**: Verify refactored components work identically
  - [ ] Test tab switching preserves chat state
  - [ ] Test message sending and display
  - [ ] Test empty state suggestions
  - [ ] Run existing unit tests for `useChatRuntime`

### Stage 6: Real LLM Integration ✅ **COMPLETED**

#### Immediate Action Required:
1. **Restart dev server** - The Next.js build cache has been cleared to fix ENOENT errors
2. **Manual testing** - Load a document and test the chat interface with real questions
3. **Monitor for issues** - Check dev.log for any new errors during testing
- [x] **Replace fake API with actual LLM calls** ✅ **COMPLETED**
  - [x] **EASY WIN**: Replace mock responses in `app/api/chat/route.ts` with real LLM calls
  - [x] **REUSE**: Integrate with existing LLM configuration from `lib/config.ts`
  - [x] **CONSISTENCY**: Use Anthropic Claude Sonnet 4 with temperature 0 as configured
  - [x] **ROBUSTNESS**: Implement proper error handling for API failures
  - [x] **ERROR VISIBILITY**: Enhanced error handling with detailed logging and user-friendly messages
    - Removed automatic retry logic per user feedback
    - Added comprehensive error logging on both client and server
    - Error messages include specific details and error codes
    - Clear error display in chat interface
  - [ ] **TESTING**: Test with various document types and conversation flows
    - [ ] Load various document types and verify chat functionality
    - [ ] Test different question types (summary, explanation, analysis)
    - [ ] Verify document context is being used effectively in responses
    - [ ] Check error handling scenarios (API key missing, network issues)
    - [ ] Confirm console logs show message flow for debugging
    - [ ] Test tab switching preserves conversation state
    - [ ] Verify empty state suggestions auto-send when clicked

- [x] **Optimize prompt engineering** ✅ **COMPLETED**
  - [x] **TEMPLATE**: Create system prompt template for document analysis
    - [x] Include document title, context, and analysis instructions
    - [x] Add guidelines for helpful, accurate responses about the document
    - [x] Include instructions for citing specific document sections
  - [x] **REUSE PATTERNS**: Look at existing prompts in `app/api/summarise/route.ts` and `app/api/glossary/route.ts`
  - [ ] **ITERATIVE**: Test prompt effectiveness with sample conversations
  
**Stage 6 Implementation Notes:**
- Successfully integrated real LLM (Anthropic Claude) replacing mock responses
- Created comprehensive prompt template at `lib/prompts/templates/chat.njk` with:
  - Clear role definition for document analysis assistant
  - Document context injection with proper formatting
  - Specific instructions for accurate, document-based responses
  - Guidelines for acknowledging limitations and suggesting follow-ups
- Implemented chat-specific template configuration in `lib/prompts/templates/chat.ts`:
  - Input validation using Zod schema (message: max 10k chars, documentContext: max 10k chars)
  - Increased maxTokens to 2000 for detailed explanations
  - Temperature set to 0 for consistent, deterministic responses
- Enhanced error handling with specific messages and error codes:
  - API_KEY_ERROR: Missing or invalid Anthropic API key
  - RATE_LIMIT_ERROR: Too many requests
  - MODEL_ERROR: AI model configuration issues
  - NETWORK_ERROR: Connection failures
  - UNKNOWN_ERROR: Generic fallback
- Comprehensive logging on both client and server:
  - Server logs: Request details, response success, full error context
  - Client logs: Message sending, response receipt, API errors
- User-friendly error messages with actionable details
- No automatic retry - errors are immediately visible to users
- Follows existing patterns from summarise and glossary endpoints for consistency
- Ready for testing with real documents and various conversation scenarios

**Technical Decisions Made:**
1. **Architecture**: Primitive components over high-level components for maximum customization
2. **Error Handling**: Graceful degradation with user-friendly error messages (no automatic retry)
3. **Prompt Design**: Document-focused with clear boundaries and limitations
4. **Model Config**: Claude Sonnet 4 with temperature 0 for consistency
5. **Implementation Pattern**: Followed existing codebase patterns for consistency

**Current State:**
- Chat interface fully integrated with assistant-ui primitives
- Real LLM responses from Anthropic Claude
- Document context automatically passed with each message (10k char limit)
- Enhanced error handling with detailed logging
- Tab system working (Chat tab in Tools pane)
- Conversation persists during tab switching (until page reload)

### Stage 6A: Chat UI Fixes and Code Quality Improvements

**URGENT** - [ ] **Fix Chat Height and Input Visibility Issue** 🐛
  - **Problem**: 
    1. Users cannot scroll to the bottom of long chat responses, preventing them from seeing the full response
    2. Text input box is only visible when zooming out, not at normal zoom levels
    3. Chat container doesn't dynamically use available vertical space
  - **Root Cause**: Complex height constraint flow issue through multiple container layers
    - **Height Chain**: Tools pane → TabContainer → Chat tab → AssistantChat → Thread → Viewport/Composer
    - **Primary Issue**: `h-full` and flexbox constraints are not flowing correctly through the container hierarchy
    - **Secondary Issue**: Fixed height (500px) works but doesn't scale with available space
  - **Technical Analysis**:
    1. **Tools pane**: `overflow-y-auto p-4 h-full` (document-viewer.tsx:326)
    2. **TabContainer**: `flex flex-col h-full` with content using `flex-1 min-h-0 overflow-hidden` (tab-container.tsx:58)
    3. **Chat tab wrapper**: No wrapper div (document-viewer.tsx:264)  
    4. **AssistantChat**: Currently using `style={{ height: '500px' }}` (WORKING but not dynamic)
    5. **Thread**: `h-full flex flex-col` with Viewport `flex-1 min-h-0 overflow-y-auto` and Composer `flex-shrink-0`
  - **Investigation History**:
    - ✅ **Fixed 500px**: Text input visible, scrolling works, but doesn't scale with monitor size
    - ❌ **h-full approach**: Input box disappears, height constraints don't flow properly
    - ❌ **CSS Grid approach**: `grid-rows-[1fr_auto]` - Input box disappears
    - ❌ **max-h constraint**: `max-h-[600px]` - Input only visible when zoomed out
  - **Current Working Solution**: Fixed 500px height
    ```tsx
    // In components/assistant-chat.tsx:149
    <div style={{ height: '500px' }} className="flex flex-col">
      <AssistantRuntimeProvider runtime={runtime}>
        <Thread />
      </AssistantRuntimeProvider>
    </div>
    ```
  - **Attempted Solutions That Failed**:
    1. **Pure h-full chain**: Height doesn't flow through TabContainer properly
    2. **CSS Grid**: `grid-rows-[1fr_auto]` breaks assistant-ui's internal height expectations
    3. **Flex with min-h-0**: Still results in height calculation issues
    4. **Additional wrapper divs**: Adding height constraints at various levels
  - **Potential Root Causes**:
    1. **assistant-ui expectations**: ThreadPrimitive.Root may expect specific height behavior
    2. **TabContainer constraints**: Content area may not be providing proper height flow
    3. **Tools pane layout**: Complex interaction between `overflow-y-auto` and flex children
    4. **CSS specificity**: Tailwind classes may be conflicting with assistant-ui's internal styles
  - **Next Investigation Ideas**:
    1. **Viewport height units**: Try `height: 'calc(100vh - 200px)'` or similar viewport-relative height
    2. **CSS custom properties**: Use CSS variables to pass height constraints down the component tree
    3. **ResizeObserver**: Dynamically measure available space and set height programmatically
    4. **assistant-ui alternatives**: Check if different assistant-ui component configurations work better
    5. **Simplified layout**: Remove intermediate wrapper divs and flatten the component hierarchy
    6. **CSS-in-JS**: Use styled-components or emotion for more precise style control
  - **Testing**: 
    - Verify that text input is visible at normal zoom levels (100%)
    - Test that chat container scales with different monitor sizes and browser window sizes  
    - Confirm that long chat responses can be scrolled completely
    - Ensure input field remains accessible after long conversations

### Stage 6B: Code Quality & Architecture Improvements

- [ ] **Type Safety Improvements**
  - [ ] Create `lib/types/chat.ts` with shared types:
    ```typescript
    export interface ChatMessage {
      role: 'user' | 'assistant' | 'system';
      content: string;
      timestamp?: string;
      metadata?: Record<string, any>;
    }
    
    export interface ChatRequest {
      message: string;
      documentContext: string;
      conversationId?: string;
    }
    
    export interface ChatResponse {
      response: string;
      timestamp: string;
      error?: string;
    }
    ```
  - [ ] Add Zod schema validation in `/api/chat/route.ts`:
    ```typescript
    import { z } from 'zod';
    
    const chatRequestSchema = z.object({
      message: z.string().min(1).max(10000),
      documentContext: z.string().max(10000),
      conversationId: z.string().optional()
    });
    ```
  - [ ] Update `useChatRuntime` hook to use shared types
  - [ ] Ensure API route validates incoming requests

- [ ] **Error Handling Enhancement**
  - [ ] Update `useChatRuntime` to bubble errors properly:
    ```typescript
    // Instead of returning error as message content
    // Use runtime status or throw for UI to catch
    if (!res.ok) {
      const error = new Error(`API Error: ${res.status}`);
      error.cause = await res.json();
      throw error;
    }
    ```
  - [ ] Create error boundary component for chat interface
  - [ ] Add specific error states in UI:
    - Network errors: "Connection failed. Please check your internet."
    - API errors: "Service unavailable. Please try again."
    - Rate limit: "Too many requests. Please wait a moment."
  - [ ] Add console.error logging with context:
    ```typescript
    console.error('[Chat Error]', {
      error,
      documentId: documentContext?.substring(0, 50),
      timestamp: new Date().toISOString()
    });
    ```

- [ ] **Performance Optimizations**
  - [ ] Update `getDocumentContext()` to avoid mid-word truncation:
    ```typescript
    // Find last complete sentence within limit
    const truncated = content.substring(0, 10000);
    const lastPeriod = truncated.lastIndexOf('.');
    return lastPeriod > 8000 ? truncated.substring(0, lastPeriod + 1) : truncated;
    ```
  - [ ] Add memoization to document context:
    ```typescript
    const documentContextCache = new Map<string, string>();
    
    const getMemoizedContext = (slug: string, elements: DocumentElement[]) => {
      const cacheKey = `${slug}-${elements.length}`;
      if (!documentContextCache.has(cacheKey)) {
        documentContextCache.set(cacheKey, getDocumentContext(elements));
      }
      return documentContextCache.get(cacheKey)!;
    };
    ```
  - [ ] Consider react-window for virtual scrolling if >100 messages

### Stage 7: Enhanced Features
- [ ] **Add conversation management**
  - [ ] Implement "Clear conversation" button
  - [ ] Expose `resetConversation()` method via runtime (per o3)
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

**Current Testing Status** (Updated: 28 May 2025)
- ✅ Jest and React Testing Library configured with Next.js
- ✅ Enhanced `useChatRuntime` tests with comprehensive error scenarios
- ✅ Created tests for `assistant-chat.tsx` components
- ✅ Created tests for `tab-container.tsx` component
- 🔄 Need to add integration tests for chat API endpoint
- 🔄 Some tests need fixing due to mock issues

**Test Coverage Added:**
1. **useChatRuntime Hook Tests** (`src/lib/hooks/__tests__/useChatRuntime.test.ts`):
   - Basic functionality and API calls
   - Error handling (HTTP errors, network errors, rate limits)
   - Abort signal handling
   - Empty messages and multi-part content handling
   - Enhanced with detailed error scenarios

2. **AssistantChat Component Tests** (`components/__tests__/assistant-chat.test.tsx`):
   - Component rendering and structure
   - Thread suggestions display
   - User/Assistant message styling
   - Composer functionality
   - Document context passing

3. **TabContainer Component Tests** (`components/__tests__/tab-container.test.tsx`):
   - Tab rendering and switching
   - Active state management
   - Default tab selection
   - Custom className and title support
   - Edge cases (empty tabs, invalid default)
   - ARIA attributes for accessibility

**Testing Approach:**
- Using Jest with React Testing Library for component testing
- Comprehensive mocking of external dependencies (assistant-ui, fetch API)
- Focus on user behavior and integration rather than implementation details
- Console logging preserved in tests for debugging
- Using subagents to run tests to avoid context window overload

- [x] **Unit Tests** ✅ **MOSTLY COMPLETED**
  - [x] Test `TabContainer` component ✅
    - Switches tabs on click
    - Maintains active tab state  
    - Renders correct content for active tab
    - Handles edge cases and custom props
  - [x] Enhanced `useChatRuntime` tests ✅
    - Abort signal handling
    - Error scenarios (network, API errors, rate limits)
    - Message content extraction
    - Empty messages and multi-part content
  - [x] Test `AssistantChat` component ✅
    - Component rendering and structure
    - Thread suggestions and message display
    - Composer functionality
  - [ ] Test split chat components (after Stage 5A refactor):
    - ChatThread: message display, empty state
    - ChatComposer: input handling, submit
    - ChatMessage: role-based styling

- [ ] **Integration Tests** (React Testing Library + MSW)
  - [ ] Create `__tests__/assistant-chat.integration.test.tsx`:
    ```typescript
    import { render, screen, userEvent } from '@testing-library/react';
    import { setupServer } from 'msw/node';
    import { rest } from 'msw';
    
    const server = setupServer(
      rest.post('/api/chat', (req, res, ctx) => {
        return res(ctx.json({ response: 'Test response' }));
      })
    );
    
    test('sends message and displays response', async () => {
      // Render AssistantChat
      // Type message
      // Click send
      // Expect response to appear
    });
    ```
  - [ ] Test error handling with MSW error responses
  - [ ] Test loading states during API calls
  - [ ] Test document context inclusion in requests

- [ ] **E2E Tests** (Playwright)
  - [ ] Create `e2e/chat-assistant.spec.ts`:
    ```typescript
    test('chat assistant workflow', async ({ page }) => {
      // Navigate to document page
      // Open Tools pane
      // Switch to Chat tab
      // Send message
      // Verify response appears
      // Test tab switching preserves conversation
    });
    ```
  - [ ] Test conversation persistence during tab switches
  - [ ] Test error recovery flows
  - [ ] Test with different document sizes

- [ ] **Performance Testing**
  - [ ] Create performance benchmark suite:
    - Measure render time with 0, 50, 100+ messages
    - Profile memory usage during long conversations
    - Test document context extraction speed
  - [ ] Use React DevTools Profiler to identify bottlenecks
  - [ ] Monitor bundle size impact of assistant-ui

- [ ] **Accessibility Testing**
  - [ ] Automated tests with jest-axe:
    ```typescript
    import { axe } from 'jest-axe';
    
    test('chat interface has no accessibility violations', async () => {
      const { container } = render(<AssistantChat />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
    ```
  - [ ] Manual testing checklist:
    - Tab navigation through all interactive elements
    - Screen reader announces messages correctly
    - Focus visible indicators present
    - Keyboard shortcuts (Enter to send, Esc to cancel)
  - [ ] Color contrast validation (WCAG AA compliance)

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

### Key Implementation Notes

**Runtime Adapter Pattern**: The `useLocalRuntime` hook requires a `ChatModelAdapter` with a `run` function. This was the root cause of initial runtime errors. The solution was implemented in `src/lib/hooks/useChatRuntime.ts` which encapsulates the adapter logic.

**Component Architecture**: Following assistant-ui's composable primitives pattern provides maximum customization while the library handles complex features like auto-scrolling, streaming, and accessibility.

**Network Logic**: Keep API calls outside render functions using `useCallback` to prevent re-creation loops and unnecessary re-renders.

**State Management**: Chat state lives in memory via assistant-ui's runtime. For conversation clearing, expose methods through the runtime rather than manipulating state directly.

