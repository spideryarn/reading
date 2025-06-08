# Assistant-UI Chat Persistence Debugging Guide

## Current Issue Summary

**Problem**: Chat interface hangs on "Loading conversation..." indefinitely after implementing ThreadHistoryAdapter for conversation persistence.

**Status**: Active debugging required - ThreadHistoryAdapter implementation causing UI loading state to never resolve.

## Background Context

### Objective
Implement conversation persistence so that chat messages are restored when users refresh the page or navigate back to a document. Messages should save to database and load seamlessly.

### Library Used
- **@assistant-ui/react**: Official chat UI library with built-in persistence adapters
- **ThreadHistoryAdapter**: The library's recommended approach for conversation persistence
- **useLocalRuntime**: Hook that manages chat state and integrates with adapters

## Technical Implementation

### Current Implementation (Problematic)

The current implementation uses ThreadHistoryAdapter as recommended by assistant-ui documentation:

```typescript
// src/lib/hooks/usePersistentChat.ts
const historyAdapter: ThreadHistoryAdapter = useMemo(() => ({
  // Called once when runtime initializes
  async load() {
    if (!chatService) return { messages: [] };

    try {
      const existingId = await findOrCreateThread();
      if (existingId) {
        setThreadId(existingId);
        const history = await loadConversationHistory(existingId);
        setIsLoaded(true); // ⚠️ PROBLEMATIC: State set inside adapter
        return { messages: history };
      }
      setIsLoaded(true);
      return { messages: [] };
    } catch (err) {
      setError('Failed to load chat history');
      setIsLoaded(true);
      return { messages: [] };
    }
  },

  async append(message) {
    // Save new messages to database
    await chatService.addMessage({...});
  },
}), [dependencies]);

const runtime = useLocalRuntime(chatModelAdapter, {
  adapters: { history: historyAdapter as any }
});
```

### UI Loading Logic

The component shows loading state based on `isLoaded`:

```typescript
// components/assistant-chat.tsx
const { runtime, isLoaded, threadId, error } = usePersistentChat({...});

if (!isLoaded) {
  return <div>Loading conversation...</div>; // ⚠️ Never resolves
}

return (
  <AssistantRuntimeProvider runtime={runtime}>
    <Thread />
  </AssistantRuntimeProvider>
);
```

## Root Cause Analysis

### Primary Issue: Async State Management in Adapter

**Problem**: Setting `isLoaded` state inside the `historyAdapter.load()` method doesn't trigger React re-renders properly.

**Why This Happens**:
1. `historyAdapter.load()` is called by assistant-ui during runtime initialization
2. This happens outside of React's normal render cycle
3. State updates inside the adapter may not trigger component re-renders
4. The UI remains stuck on the loading state indefinitely

### Secondary Issues

1. **Timing Dependencies**: The adapter relies on `chatService` being ready, but there may still be async initialization delays
2. **Error Handling**: Errors in the adapter may not surface properly to the UI
3. **Adapter Lifecycle**: Unclear when assistant-ui considers the adapter "complete"

## Debugging History

### Attempt 1: initialMessages with Conditional Runtime ❌
```typescript
const runtime = useMemo(() => {
  if (!messagesLoaded) return null;
  return useLocalRuntime(chatModelAdapter, { initialMessages });
}, [messagesLoaded, initialMessages]);
```
**Result**: React "Rules of Hooks" violation - can't conditionally call hooks

### Attempt 2: Manual Message Appending ❌  
```typescript
const runtime = useLocalRuntime(chatModelAdapter);
// Later: runtime.append() for each loaded message
```
**Result**: Messages appended but didn't persist properly or display on refresh

### Attempt 3: ThreadHistoryAdapter (Current) ⚠️
```typescript
const runtime = useLocalRuntime(chatModelAdapter, {
  adapters: { history: historyAdapter }
});
```
**Result**: Infinite loading state - adapter loads data but UI doesn't update

## Potential Solutions

### Option A: External Loading State Management
Move loading state management outside the adapter:

```typescript
const [isLoaded, setIsLoaded] = useState(false);

// Separate effect to track adapter completion
useEffect(() => {
  const trackAdapterCompletion = async () => {
    // Wait for adapter to complete
    await historyAdapter.load();
    setIsLoaded(true);
  };
  trackAdapterCompletion();
}, []);
```

### Option B: Conditional Component Rendering
Don't render the chat component until data is loaded:

```typescript
// In parent component
const [chatData, setChatData] = useState(null);

useEffect(() => {
  const loadChatData = async () => {
    const data = await loadConversationHistory(documentId);
    setChatData(data);
  };
  loadChatData();
}, [documentId]);

return chatData ? (
  <AssistantChat initialMessages={chatData.messages} />
) : (
  <div>Loading conversation...</div>
);
```

### Option C: Investigate Runtime State Hooks
Check if assistant-ui provides hooks to track adapter status:

```typescript
// Hypothetical - need to research if this exists
const { isAdapterReady } = useRuntimeState(runtime);
```

### Option D: Callback-Based Completion
Use callbacks to signal when the adapter has finished:

```typescript
const historyAdapter = useMemo(() => ({
  async load() {
    const result = await loadConversationHistory();
    // Signal completion via callback instead of state
    onLoadComplete?.(result);
    return result;
  }
}), [onLoadComplete]);
```

## Next Debugging Steps

### Immediate Actions
1. **Add Comprehensive Logging**: Log every step of the adapter lifecycle
2. **Check Runtime State**: Inspect the runtime object to see if it has completion indicators
3. **Research Library Documentation**: Look for official async loading patterns
4. **Test Minimal Implementation**: Create the simplest possible ThreadHistoryAdapter

### Investigation Questions
1. Does assistant-ui provide any hooks or events for adapter completion?
2. Is there a specific way the library expects loading states to be managed?
3. Are there working examples of ThreadHistoryAdapter with async data loading?
4. Could the issue be related to React's Strict Mode or development environment?

### Code to Add for Debugging
```typescript
const historyAdapter: ThreadHistoryAdapter = useMemo(() => ({
  async load() {
    console.log('[DEBUG] Adapter load() called');
    const start = Date.now();
    
    try {
      const result = await loadConversationHistory();
      console.log('[DEBUG] Adapter load() completed in', Date.now() - start, 'ms');
      console.log('[DEBUG] Loaded messages:', result.messages.length);
      
      // Try different approaches to signal completion
      setTimeout(() => setIsLoaded(true), 0);
      Promise.resolve().then(() => setIsLoaded(true));
      
      return result;
    } catch (err) {
      console.error('[DEBUG] Adapter load() failed:', err);
      throw err;
    }
  }
}), []);
```

## Alternative Architecture Considerations

If ThreadHistoryAdapter continues to be problematic, consider:

1. **Different Chat Library**: Evaluate alternatives like @chatui/core or custom implementation
2. **Manual State Management**: Use useExternalStoreRuntime for full control
3. **Simplified Persistence**: Implement basic persistence without adapter system
4. **Hybrid Approach**: Use assistant-ui for UI primitives but custom persistence logic

## Success Criteria

The persistence implementation will be considered successful when:

1. ✅ Chat messages save to database automatically
2. ✅ Messages load correctly on page refresh  
3. ✅ Loading states resolve promptly (< 2 seconds)
4. ✅ Error states handle failures gracefully
5. ✅ No React hook violations or performance issues
6. ✅ Thread isolation per document works correctly

## Resources for Further Investigation

- **Assistant-UI Documentation**: https://www.assistant-ui.com/docs/
- **GitHub Issues**: Check for similar persistence problems
- **Discord Community**: Ask maintainers about adapter lifecycle
- **Source Code**: Review assistant-ui ThreadHistoryAdapter implementation
- **Working Examples**: Find real-world ThreadHistoryAdapter usage