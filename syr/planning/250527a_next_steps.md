# Next Steps for Chatbot Interface

## Immediate Testing Required
1. **Manual Testing with Real Documents**
   - Load a document and test the chat functionality
   - Verify error messages display correctly
   - Check that document context is being used in responses
   - Test with different document sizes
   - Monitor console logs for debugging information

## Priority Tasks After Testing

### 1. Component Refactoring (Stage 5A)
Split `assistant-chat.tsx` into smaller, focused components:
- `components/chat/ChatThread.tsx` - Thread viewport and messages
- `components/chat/ChatComposer.tsx` - Input and send functionality  
- `components/chat/ChatMessage.tsx` - Message display with role-based styling

Benefits:
- Better separation of concerns
- Easier testing
- More maintainable code

### 2. Type Safety Improvements (Stage 6A)
- Create shared types in `lib/types/chat.ts`
- Add proper TypeScript interfaces for:
  - Chat messages
  - Error responses
  - API requests/responses
- Implement Zod validation throughout

### 3. UI Enhancements (Stage 5)
- Add document title indicator in chat
- Show when document context is loaded
- Display character count of context
- Consider adding a manual "Retry" button for failed messages

### 4. Enhanced Features (Stage 7)
- Add "Clear conversation" button
- Implement conversation reset functionality
- Consider web search toggle (with user permission)

## Testing Checklist
- [ ] Chat loads successfully in Tools pane
- [ ] Can send messages and receive responses
- [ ] Error messages display with proper formatting
- [ ] Console logs show message flow
- [ ] Document context is included in API calls
- [ ] Tab switching preserves conversation
- [ ] Empty state shows suggestions
- [ ] Suggestions auto-send when clicked

## Known Issues to Watch For
- Jest tests failing due to ESM module configuration (not blocking)
- Need to verify API key is properly configured
- Monitor for rate limiting during testing