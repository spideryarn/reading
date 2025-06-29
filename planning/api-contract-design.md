# Database-First Chat API Contract Design

## New Response Format

### POST `/api/tools/chat` - Atomic Message Operations

**Request Format (unchanged):**
```typescript
{
  action: 'execute' | 'send',
  parameters: {
    messages: Array<{ role: 'user' | 'assistant', content: string }>,
    documentContext?: string,
    threadId?: string,        // Optional - if not provided, creates new thread
    documentId?: string       // Required for new thread creation
  },
  metadata: {
    correlationId: string,
    source: string,
    timestamp: string
  }
}
```

**New Response Format:**
```typescript
{
  // Core data - replaces current individual fields
  thread: {
    id: string,
    document_id: string,
    model_string: string,
    title: string,
    created_by: string | null,
    created_at: string,
    updated_at: string,
    extra: JsonObject
  },
  messages: Array<{
    id: string,
    thread_id: string,
    sequence_number: number,
    role: 'user' | 'assistant',
    content: string,
    ai_call_id: string | null,
    created_at: string,
    updated_at: string,
    extra: JsonObject
  }>,
  
  // Metadata (existing pattern)
  type: 'conversation',
  cached: false,
  tool: 'chat',
  executionTime: number,
  tokensUsed?: number,
  
  // Legacy compatibility (deprecated)
  response?: string,        // For backward compatibility, = messages.last.content
  aiCallId?: string,        // For backward compatibility, = messages.last.ai_call_id  
  threadId?: string         // For backward compatibility, = thread.id
}
```

## Implementation Strategy

### Single Transaction Flow
```typescript
// New atomic flow in chat handler
const result = await handleSendMessage({
  messages,
  documentContext,
  threadId,
  documentId
})

// Returns:
// 1. Either existing thread or newly created thread
// 2. Complete message array including both user message and AI response
// 3. All data sourced from authoritative database rows
```

### Database Transaction Pattern
```sql
BEGIN TRANSACTION;

-- 1. Create or verify thread exists
INSERT INTO chat_threads (...) ON CONFLICT DO NOTHING;

-- 2. Insert user message
INSERT INTO chat_messages (thread_id, role, content, sequence_number, ...) 
VALUES (...);

-- 3. Generate AI response (external API call)

-- 4. Insert AI response message  
INSERT INTO chat_messages (thread_id, role, content, sequence_number, ai_call_id, ...)
VALUES (...);

-- 5. Return complete thread + messages from DB
SELECT * FROM chat_threads WHERE id = ?;
SELECT * FROM chat_messages WHERE thread_id = ? ORDER BY sequence_number;

COMMIT;
```

## Migration Approach

### Phase 1: Extend Current API
- Add new response fields (`thread`, `messages`) alongside existing ones
- Maintain backward compatibility with existing clients
- New `useChatStore` can consume the new format
- Old `usePersistentChat` continues using legacy fields

### Phase 2: Client Migration  
- Implement `useExternalStoreRuntime` consuming new format
- Remove dependency on legacy response fields
- Test thoroughly with existing chat data

### Phase 3: API Cleanup
- Mark legacy fields as deprecated
- Eventually remove legacy response fields

## Benefits

1. **Atomic Operations**: Thread + message creation in single transaction
2. **Single Source of Truth**: Client receives authoritative database state
3. **Race Condition Elimination**: No separate save operations
4. **Simplified Error Handling**: Either entire operation succeeds or fails
5. **Multi-session Consistency**: All clients get same database state
6. **Backward Compatibility**: Gradual migration path