# Document Mutations System

## Introduction

The mutations system enables reversible transformations of document content, allowing users to apply and revert changes like AI-generated headings, paragraph summarisation, or content filtering. This document describes the architecture, implementation patterns, and usage of the mutation framework.

## See also

- `lib/types/mutation.ts` - Core TypeScript interfaces for mutations
- `lib/services/mutation-engine.ts` - Implementation of mutation application logic
- `lib/prompts/templates/headings.ts` - Headings operation schemas with conditional validation
- `lib/prompts/templates/headings.njk` - AI prompt template showing how headings are generated
- `planning/250527a_reversible_document_mutations.md` - Detailed design decisions and implementation plan
- `docs/reference/ARCHITECTURE_OVERVIEW.md` - High-level architectural overview
- `docs/reference/TOOL_HEADINGS.md` - AI-generated heading system documentation
- `tests/test-mutation-engine.ts` - Test suite demonstrating mutation usage patterns
- `docs/reference/LLM_PROMPT_TEMPLATES.md` - Required for implementing AI-generated content transformations

## Status

- Core mutation engine ✓
- Dual insertion types (before/after) ✓
- Mixed insertion precedence ✓
- AI headings integration with full operations support ✓
- Insert-before semantic correctness ✓
- State management hooks 📋
- Mutation composition 📋
- Persistence layer 📋

## Key Concepts

### Mutation Structure

A mutation consists of:
- **Forward transforms**: Changes to apply when activating the mutation
- **Reverse transforms**: Changes to undo the mutation
- **Metadata**: Additional information for UI display or debugging

### AI-Aware Document Enhancement

The mutation system now supports AI-driven document improvements that preserve author intent:
- **Preserve Good Structure**: AI can recognize and keep well-written original headings
- **Improve Unclear Content**: Replace poorly written headings with clearer alternatives
- **Add Missing Structure**: Insert new headings where semantic structure is lacking
- **Remove Redundancy**: Delete duplicate or unnecessary headings that disrupt flow

### Transform Types

The system supports four atomic transform operations:

1. **Insert**: Add new elements to the document (supports both before and after insertion)
2. **Replace**: Change existing element content or structure (e.g., improve existing headings)
3. **Remove**: Delete elements from the document (e.g., remove redundant headings)
4. **Modify**: Update element attributes

#### Insertion Types

The insert operation supports two semantic modes:

- **Insert Before** (`insertNewBeforeExistingId`): Places new content before the target element. Used for headings that introduce content sections.
- **Insert After** (`insertNewAfterExistingId`): Places new content after the target element. Used for content that extends or follows from existing elements.

**Mixed Insertion Precedence**: When both insertion types target the same element, the system enforces deterministic ordering:
```
before-insertions → original-element → after-insertions
```

Example: `H2 (before) + paragraph-123 + bullet-list (after)` results in correct semantic order.

### Reversibility

Every mutation must be fully reversible. The framework enforces this by requiring both forward and reverse transforms in the mutation definition.

## Architecture

### Hybrid State Management

The system uses a hybrid approach for v1:
- Direct React state updates for immediate UI responsiveness
- Mutation history tracking for debugging and validation
- Single active mutation at a time (composition planned for future)

### Conditional Validation

The headings system uses Zod schemas with conditional validation to ensure operation integrity:

```typescript
// Operations have different requirements based on action type:
- Insert: Requires insertNewBeforeExistingId and content
- Replace: Requires targetId and content
- Remove: Requires targetId only (no content)
```

This validation is enforced at the schema level using Zod's `.refine()` method, providing clear error messages when operations are malformed.

### Error Handling

The mutation engine fails loudly and immediately when:
- Referenced elements don't exist
- Transforms are malformed
- Validation fails (e.g., missing required fields for operation type)
- Invalid operation configurations

This ensures data integrity and makes debugging easier during development.

## Usage Patterns

### Creating a Mutation

#### AI Headings Operations Examples

The AI headings system now supports comprehensive document structure improvements through three operation types:

##### Insert Operation (Add New Headings)
```typescript
const insertHeadingOp: HeadingOperation = {
  action: 'insert',
  insertNewBeforeExistingId: 'para-123',  // Insert before this element
  content: {
    tag_name: 'h2',
    content: 'Generated Section Title'
  }
}
```

##### Replace Operation (Improve Existing Headings)
```typescript
const replaceHeadingOp: HeadingOperation = {
  action: 'replace',
  targetId: 'existing-heading-456',  // ID of heading to replace
  content: {
    tag_name: 'h2',  // Can change heading level
    content: 'Improved and Clearer Heading Text'
  }
}
```

##### Remove Operation (Delete Redundant Headings)
```typescript
const removeHeadingOp: HeadingOperation = {
  action: 'remove',
  targetId: 'redundant-heading-789'  // ID of heading to remove
}
```

##### Complete Mutation Example
```typescript
const headingMutation: Mutation = {
  id: 'ai-headings-' + Date.now(),
  type: 'headings-improvement',
  forward: [
    // Add new H1 at document start
    {
      action: 'insert',
      insertNewBeforeExistingId: 'first-para',
      content: {
        id: 'ai-h1-new',
        tag_name: 'h1',
        content: 'Document Title'
      }
    },
    // Improve unclear existing heading
    {
      action: 'replace',
      targetId: 'author-h2-unclear',
      content: {
        id: 'ai-h2-improved',
        tag_name: 'h2',
        content: 'Clear Section Title'
      }
    },
    // Remove redundant heading
    {
      action: 'remove',
      targetId: 'author-h3-redundant'
    }
  ],
  reverse: [
    // Reverse operations in opposite order
    {
      action: 'insert',
      insertNewBeforeExistingId: 'next-element',
      content: {
        id: 'author-h3-redundant',
        tag_name: 'h3',
        content: 'Original Redundant Heading'
      }
    },
    {
      action: 'replace',
      targetId: 'ai-h2-improved',
      content: {
        id: 'author-h2-unclear',
        tag_name: 'h2',
        content: 'Original Unclear Heading'
      }
    },
    {
      action: 'remove',
      targetId: 'ai-h1-new'
    }
  ],
  metadata: {
    description: 'AI-improved document structure',
    operationCounts: {
      inserted: 1,
      replaced: 1,
      removed: 1
    }
  }
}
```

#### Insert-After Example (Content Extensions)
```typescript
const contentMutation: Mutation = {
  id: 'content-extension-' + Date.now(),
  type: 'extend-content',
  forward: [
    {
      action: 'insert',
      insertNewAfterExistingId: 'para-123',  // Explicit field name
      content: {
        id: 'bullet-list-1',
        tag_name: 'ul',
        content: '<li>Additional point</li>'
      }
    }
  ],
  reverse: [
    {
      action: 'remove',
      targetId: 'bullet-list-1'
    }
  ]
}
```

#### Mixed Insertion Example
```typescript
const mixedMutation: Mutation = {
  id: 'mixed-insertion-' + Date.now(),
  type: 'enhance-section',
  forward: [
    // Insert heading before
    {
      action: 'insert',
      insertNewBeforeExistingId: 'para-123',
      content: { id: 'h2-intro', tag_name: 'h2', content: 'Introduction' }
    },
    // Insert content after
    {
      action: 'insert', 
      insertNewAfterExistingId: 'para-123',
      content: { id: 'summary-box', tag_name: 'div', content: 'Key Points...' }
    }
  ],
  // Results in: h2-intro → para-123 → summary-box
  reverse: [/* reverse transforms */]
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
- `lib/services/__tests__/mutation-engine.test.ts` - Core mutation engine with insertion precedence
- `lib/services/__tests__/headings-integration.test.ts` - AI headings with insert-before semantics
- `lib/services/__tests__/mixed-insertion-precedence.test.ts` - Mixed insertion type validation
- `lib/services/__tests__/heading-mutation-generator.test.ts` - Heading generation and chaining
- `tests/e2e/ai-headings-insertion-order.spec.ts` - E2E browser validation

See `docs/reference/TESTING_OVERVIEW.md` for complete testing approach.

## Limitations

Current limitations (v1):
- Only one mutation active at a time
- No persistence between sessions
- No conflict resolution for overlapping mutations
- Performance not optimised for very large documents
- Intra-mutation dependencies not supported (transforms within same mutation cannot reference each other)

Note: The previous limitation where "AI cannot see existing headings" has been resolved. The AI now receives the full HTML content including existing headings and can make intelligent decisions about which to keep, improve, or remove.

## Future Work

Planned enhancements:
- Mutation composition (applying multiple mutations)
- Persistence to database
- Optimistic updates with rollback
- Performance optimisation for large documents
- Undo/redo stack
- Collaborative mutations (multiple users)