# Document Mutations System

## Introduction

The mutations system enables reversible transformations of document content, allowing users to apply and revert changes like AI-generated headings, paragraph summarisation, or content filtering. This document describes the architecture, implementation patterns, and usage of the mutation framework.

## See also

- `lib/types/mutation.ts` - Core TypeScript interfaces for mutations
- `lib/services/mutation-engine.ts` - Implementation of mutation application logic
- `planning/250527a_reversible_document_mutations.md` - Detailed design decisions and implementation plan
- `docs/reference/ARCHITECTURE_OVERVIEW.md` - High-level architectural overview
- `tests/test-mutation-engine.ts` - Test suite demonstrating mutation usage patterns
- `docs/LLM_PROMPT_TEMPLATES.md` - Required for implementing AI-generated content transformations

## Status

- Core mutation engine ✓
- AI headings integration 🚧
- State management hooks 📋
- Mutation composition 📋
- Persistence layer 📋

## Key Concepts

### Mutation Structure

A mutation consists of:
- **Forward transforms**: Changes to apply when activating the mutation
- **Reverse transforms**: Changes to undo the mutation
- **Metadata**: Additional information for UI display or debugging

### Transform Types

The system supports four atomic transform operations:

1. **Insert**: Add new elements to the document
2. **Replace**: Change existing element content
3. **Remove**: Delete elements from the document
4. **Modify**: Update element attributes

### Reversibility

Every mutation must be fully reversible. The framework enforces this by requiring both forward and reverse transforms in the mutation definition.

## Architecture

### Hybrid State Management

The system uses a hybrid approach for v1:
- Direct React state updates for immediate UI responsiveness
- Mutation history tracking for debugging and validation
- Single active mutation at a time (composition planned for future)

### Error Handling

The mutation engine fails loudly and immediately when:
- Referenced elements don't exist
- Transforms are malformed
- Validation fails

This ensures data integrity and makes debugging easier during development.

## Usage Patterns

### Creating a Mutation

```typescript
const headingMutation: Mutation = {
  id: 'ai-headings-' + Date.now(),
  type: 'insert-headings',
  forward: [
    {
      action: 'insert',
      afterId: 'para-123',
      content: {
        id: 'ai-heading-1',
        tag_name: 'h2',
        content: 'Generated Section Title'
      }
    }
  ],
  reverse: [
    {
      action: 'remove',
      targetId: 'ai-heading-1'
    }
  ],
  metadata: {
    description: 'AI-generated semantic headings',
    generatedCount: 1
  }
}
```

### Applying Mutations

```typescript
const result = MutationEngine.applyMutation(document, mutation);
if (result.success) {
  setDocument(result.document);
  setActiveMutation(mutation);
} else {
  console.error('Mutation failed:', result.error);
}
```

### Reverting Mutations

```typescript
const result = MutationEngine.revertMutation(document, activeMutation);
if (result.success) {
  setDocument(result.document);
  setActiveMutation(null);
}
```

## Testing

All mutation tests now use Jest. Run with:

```bash
npm test
```

Key test files:
- `tests/test-mutation-engine.ts` - Comprehensive mutation engine tests
- `tests/test-document-rendering.ts` - Document rendering with mutations
- `tests/test-edge-cases.ts` - Edge case testing
- `tests/test-heading-mutation-generator.ts` - Heading mutation generator tests
- `tests/test-mutation-edge-cases.ts` - Additional edge cases

See `docs/TESTING.md` for complete testing approach.

## Limitations

Current limitations (v1):
- Only one mutation active at a time
- No persistence between sessions
- No conflict resolution for overlapping mutations
- Performance not optimised for very large documents

## Future Work

Planned enhancements:
- Mutation composition (applying multiple mutations)
- Persistence to database
- Optimistic updates with rollback
- Performance optimisation for large documents
- Undo/redo stack
- Collaborative mutations (multiple users)