# Assistant-UI Database Persistence Patterns

> ✅ **CURRENT** - Research completed June 2025 covering assistant-ui chat persistence strategies and integration patterns.

## Overview

This document provides a comprehensive analysis of database persistence patterns for assistant-ui React chat applications, based on current best practices, library capabilities, and architectural considerations for June 2025.

**Context**: Written to support chat database integration planning for Spideryarn Reading application, specifically addressing how to integrate @assistant-ui/react with database-backed conversation persistence while maintaining the existing UI/UX.

## Research Summary

Based on research conducted June 5, 2025, official assistant-ui persistence solutions are still in development:

### Current State of assistant-ui Persistence (June 2025)

**Official Status**: 
- Chat persistence is listed on the assistant-ui roadmap for Q1 2025
- "assistant-cloud" service mentioned as future official persistence solution  
- No official database persistence examples or documentation available yet
- Library currently focuses on in-memory chat management

**Community Approach**:
- Developers implementing custom persistence solutions
- Two main architectural approaches emerging in the community
- Focus on integrating with existing database schemas

### Runtime Architecture Options

#### Option A: `useLocalRuntime` with Background Persistence

**How it works**:
- assistant-ui manages chat state internally via `useLocalRuntime`
- Developer adds transparent persistence layer that saves/loads conversation history
- Chat UI continues to work as-is, with background database synchronization

**Implementation Pattern**:
```typescript
const usePersistentChat = (documentId: string) => {
  const [isLoaded, setIsLoaded] = useState(false)
  
  const chatModelAdapter: ChatModelAdapter = {
    run: async ({ messages, abortSignal }) => {
      // Normal API call
      const response = await fetch('/api/chat', { 
        /* standard implementation */ 
      })
      
      // Background: Save conversation to database
      await saveChatToDatabase(documentId, messages, response)
      
      return response
    }
  }
  
  const runtime = useLocalRuntime(chatModelAdapter)
  
  // On mount: Load conversation history from database
  useEffect(() => {
    loadChatFromDatabase(documentId).then(messages => {
      // Populate runtime with historical messages
      runtime.setMessages(messages)
      setIsLoaded(true)
    })
  }, [documentId])
  
  return { runtime, isLoaded }
}
```

**Pros**:
- Minimal changes to existing UI code
- assistant-ui continues to handle all chat logic
- Transparent to user experience
- Maintains all assistant-ui features (editing, branching, etc.)

**Cons**:
- Potential state synchronization issues
- Limited control over persistence timing
- May not expose all necessary persistence hooks

#### Option B: `useExternalStoreRuntime` with Full State Control

**How it works**:
- Developer takes complete control of chat state management
- Database becomes the primary source of truth for conversation history
- assistant-ui renders UI but doesn't manage state

**Implementation Pattern**:
```typescript
const useExternalChatStore = (documentId: string) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [isRunning, setIsRunning] = useState(false)
  
  // Load from database on mount
  useEffect(() => {
    loadChatThread(documentId).then(setMessages)
  }, [documentId])
  
  const runtime = useExternalStoreRuntime({
    messages,
    isRunning,
    convertMessage: (msg) => ({ /* format for assistant-ui */ }),
    onNew: async (message) => {
      setIsRunning(true)
      try {
        // Save user message to database immediately
        await saveChatMessage(documentId, message)
        setMessages(prev => [...prev, message])
        
        // Generate AI response
        const response = await generateResponse(message)
        
        // Save AI response to database
        await saveChatMessage(documentId, response) 
        setMessages(prev => [...prev, response])
      } finally {
        setIsRunning(false)
      }
    },
    onEdit: async (messageId, newContent) => {
      await updateChatMessage(messageId, newContent)
      // Update local state
    },
    onReload: async (messageId) => {
      await regenerateChatMessage(messageId)
      // Update local state
    }
  })
  
  return runtime
}
```

**Pros**:
- Complete control over persistence behavior
- Database is single source of truth
- Can implement custom chat features easily
- Clear separation of concerns

**Cons**:
- More complex implementation
- Need to reimplement chat state logic
- Must handle all edge cases manually
- May lose some assistant-ui advanced features

### Database Schema Considerations

#### Thread Management Patterns

**Single Thread per Document** (Recommended for MVP):
```sql
-- One ongoing conversation per document
CREATE TABLE chat_threads (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents(id),
  title TEXT DEFAULT 'Chat',
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Unique constraint ensures one thread per document
ALTER TABLE chat_threads ADD CONSTRAINT unique_document_thread 
UNIQUE (document_id);
```

**Multiple Threads per Document** (Future enhancement):
```sql
-- Multiple conversations per document
CREATE TABLE chat_threads (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents(id),
  title TEXT NOT NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- No unique constraint - multiple threads allowed
```

#### Message Storage Patterns

**Append-only with Sequence Numbers**:
```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY,
  thread_id UUID REFERENCES chat_threads(id),
  sequence_number INTEGER NOT NULL,
  role TEXT CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  ai_call_id UUID REFERENCES ai_calls(id), -- For assistant messages
  created_at TIMESTAMP,
  
  UNIQUE(thread_id, sequence_number)
);
```

**Benefits**:
- Prevents race conditions with sequence numbering
- Links assistant messages to AI call tracking
- Supports conversation branching (future)
- Compatible with assistant-ui message format

### Integration Best Practices

#### Loading Strategy

**Lazy Loading** (Recommended):
```typescript
// Load conversation history only when chat tab is accessed
const ChatPane = ({ documentId }) => {
  const [isTabActive, setIsTabActive] = useState(false)
  const { runtime, isLoaded } = usePersistentChat(documentId, isTabActive)
  
  if (!isTabActive) {
    return <ChatTabButton onClick={() => setIsTabActive(true)} />
  }
  
  if (!isLoaded) {
    return <ChatLoadingSkeleton />
  }
  
  return <AssistantRuntimeProvider runtime={runtime}>
    <Thread />
  </AssistantRuntimeProvider>
}
```

#### Error Handling

**Fail-Fast Approach** (Aligned with project principles):
```typescript
const saveChatMessage = async (message: Message) => {
  try {
    await database.chatMessages.create(message)
  } catch (error) {
    // Don't mask errors - let them bubble up
    throw new Error(`Chat persistence failed: ${error.message}`)
  }
}

// In UI component:
const handleChatError = (error: Error) => {
  // Clear, immediate error display
  setErrorMessage(`Chat unavailable: ${error.message}`)
  // Don't continue in degraded mode
}
```

#### Thread Title Generation

**Auto-generation Pattern**:
```typescript
const generateThreadTitle = (firstUserMessage: string): string => {
  // Truncate to reasonable length
  const maxLength = 50
  const cleaned = firstUserMessage.trim()
  
  if (cleaned.length <= maxLength) {
    return cleaned
  }
  
  // Find natural break point
  const truncated = cleaned.slice(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')
  
  return lastSpace > 20 
    ? truncated.slice(0, lastSpace) + '...'
    : truncated + '...'
}
```

### Performance Considerations

#### Message Loading

**Full History Loading** (Acceptable for current scale):
```typescript
// Simple approach: Load all messages for a thread
const loadChatThread = async (documentId: string): Promise<Message[]> => {
  const thread = await findOrCreateThread(documentId)
  const messages = await database.chatMessages
    .findMany({
      where: { threadId: thread.id },
      orderBy: { sequenceNumber: 'asc' }
    })
  
  return messages.map(formatForAssistantUI)
}
```

**Future Enhancement**: Pagination for very long conversations
```typescript
// Load recent messages + pagination
const loadRecentMessages = async (threadId: string, limit = 50) => {
  return database.chatMessages.findMany({
    where: { threadId },
    orderBy: { sequenceNumber: 'desc' },
    limit,
  }).reverse() // Most recent first, then reverse for chronological order
}
```

## Recommendations for Spideryarn Implementation

### Phase 1: Simple Persistence (Recommended)

**Approach**: Option A (`useLocalRuntime` + Background Persistence)
- Keep existing assistant-ui chat UI working as-is
- Add transparent database persistence layer
- One thread per document initially
- Auto-generate thread titles from first user message

**Benefits**:
- Minimal code changes required
- Preserves all current UI functionality
- Low risk implementation
- Can enhance later without major refactoring

### Phase 2: Enhanced Features (Future)

**Multi-thread Support**:
- Add thread selection UI
- Implement thread creation/deletion
- Thread title editing

**Advanced Persistence**:
- Message branching support
- Conversation search
- Export/import functionality

## References

**External Sources**:
- [assistant-ui GitHub Repository](https://github.com/assistant-ui/assistant-ui) - Main library repository and examples
- [assistant-ui Documentation](https://www.assistant-ui.com/docs/) - Official documentation (persistence features TBD)
- Vercel AI SDK documentation - Chat session management patterns
- React chat application architecture patterns (2024-2025)

**Internal Documentation**:
- `docs/reference/AI_CHATBOT_ASSISTANT_UI_INTEGRATION.md` - Current assistant-ui integration guide  
- `docs/reference/DATABASE_SCHEMA.md` - Database table specifications including chat_threads and chat_messages
- `lib/services/database/chat.ts` - Existing ChatService implementation ready for use
- `components/assistant-chat.tsx` - Current working assistant-ui implementation
- `src/lib/hooks/useChatRuntime.ts` - Current runtime management hook

## Implementation Notes

**Critical Considerations**:
1. **State Synchronization**: Ensure assistant-ui state stays in sync with database
2. **Error Handling**: Follow project principle of "fail fast and clear" - don't mask database errors
3. **Performance**: Simple full-history loading acceptable for current scale
4. **Thread Management**: Start with one thread per document, design for future multi-thread support
5. **Message Sequencing**: Use database sequence numbers to prevent race conditions

**Timeline Expectations**:
- Official assistant-ui persistence features likely available later in 2025
- Current custom implementation will be migration path to official solution
- Focus on simple, working solution that can evolve
