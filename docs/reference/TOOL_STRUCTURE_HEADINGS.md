# Structure Tab: Document Headings and AI Enhancement

The Structure tab provides a unified interface for viewing and enhancing document structure with AI-generated headings. It consolidates the original document outline with optional AI-powered enhancements in a single, intuitive interface, now featuring an iterative approach for progressive improvement.

## Overview

The Structure tab replaces the previous separate "Original" and "AI-Generated" headings tabs with a unified experience that:

- **Displays document structure** in its current state (original or AI-enhanced)
- **Provides iterative AI enhancement** through user-initiated progressive improvements
- **Supports seamless switching** between original and AI-enhanced views
- **Maintains all existing functionality** including tooltips, navigation, and mutation handling
- **Enables progressive refinement** with up to 10 heading operations per iteration

## See also

- `docs/reference/LLM_PROMPT_TEMPLATES.md` - Guide to creating and using LLM prompt templates
- `docs/reference/MUTATIONS_DOCUMENT_CONTENT_REVERSIBLE_TRANSFORMS.md` - Documents the reversible document transformation system
- `lib/prompts/templates/headings.ts` - Schema and prompt configuration for heading generation
- `components/tools/StructurePanel.tsx` - Unified Structure tab component

## Key Features

### Unified Interface Design
- **Single Structure tab** with TreeStructure icon replaces dual-tab system
- **Status badge** clearly indicates current state (Original vs AI-enhanced)
- **Context-aware buttons** show appropriate actions (Generate vs Remove)

### AI Enhancement Workflow

#### Iterative Generation Mode
- **Progressive improvement**: AI enhances document structure iteratively, making up to 10 heading operations per iteration
- **User control at each step**: After each iteration, users can choose to continue improving or stop
- **Iteration limits**: Maximum 5 iterations and 50 total operations per document for safety
- **Clear progress tracking**: Shows current iteration count and operations performed

#### Traditional Single-Pass Mode (Legacy)
- **Explicit user control**: AI generation only occurs when user clicks "Generate AI headings"
- **Reversible changes**: Trashcan button removes AI enhancements and reverts to original

### Enhanced User Experience
- **Simplified navigation**: Single tab reduces cognitive load
- **User control**: Manual "Finish" button allows stopping at any point
- **Keyboard accessibility**: Cmd+1/Ctrl+1 shortcut provides quick access

## User Interface

### State Matrix

| Current State | Status Badge | Available Actions | Description |
|---------------|--------------|-------------------|-------------|
| Original headings | "Original" (blue) | "Improve Headings" button | Showing document's original structure |
| AI headings active | "AI-enhanced" (green) | Trashcan (remove) button | Showing AI-generated enhanced structure |
| Iterating | "AI-enhanced" (green) | "Generating iteration X..." spinner | Progressive improvement in progress |
| Iteration complete | "AI-enhanced" (green) | "Continue Improving" / "Finish" buttons | User choice point after each iteration |
| Limits reached | "AI-enhanced" (green) | "Maximum iterations reached" message | Safety limits prevent further iterations |
| Removing | "AI-enhanced" (green) | Loading spinner | Reverting to original structure |

### Button Behaviors

#### Improve Headings Button
- **Appearance**: Green text, appears when in original state
- **Function**: Initiates iterative AI analysis and heading improvement
- **Loading state**: Shows "Generating iteration X..." with spinner during processing
- **Success**: Shows iteration summary with Continue/Finish options
- **Error handling**: Shows error message with retry option

#### Continue Improving Button
- **Appearance**: Green text, appears after each iteration completes
- **Function**: Triggers next iteration of heading improvements
- **Disabled state**: When iteration or operation limits are reached
- **Loading state**: Shows current iteration progress

#### Finish Button
- **Appearance**: Blue text, appears alongside Continue button
- **Function**: Accepts current heading state and completes the process
- **Result**: Transitions to AI-enhanced state with trashcan button

#### Remove AI Headings Button (Trashcan)
- **Appearance**: Red trashcan icon, appears when in AI-enhanced state
- **Function**: Removes AI headings and reverts to original structure
- **Loading state**: Shows spinner during reversion process
- **Success**: Transitions back to original state with generate button

## Technical Architecture

### Component Structure
```
StructurePanel
├── Header
│   ├── TreeStructure icon
│   ├── "Structure" title
│   ├── Status badge (Original/AI-enhanced)
│   └── Action button (Generate/Remove)
├── HeadingTree (unified display)
│   ├── Heading items with tooltips
│   ├── Level filtering controls
│   └── Collapse/expand functionality
└── Loading/Error states
```

### State Management Flow

#### Iterative Enhancement Flow
```
Initial State: Original headings displayed
     ↓ User clicks "Improve Headings"
Iterating State: Shows "Generating iteration 1..." with spinner
     ↓ First iteration completes (up to 10 operations)
Choice State: Shows iteration summary + Continue/Finish buttons
     ↓ User clicks "Continue Improving"
Iterating State: Shows "Generating iteration 2..." with spinner
     ↓ Iteration completes
Choice State: Shows updated summary + Continue/Finish buttons
     ... (repeats until user clicks Finish or limits reached)
     ↓ User clicks "Finish" or limits reached
AI State: Final AI headings displayed with trashcan button
     ↓ User clicks trashcan button
Loading State: Shows spinner during removal
     ↓ Mutation reverted successfully
Original State: Back to original headings with improve button
```

#### Safety Limits
- **Iteration limit**: Maximum 10 iterations per document
- **Per-iteration limit**: Maximum 10 operations in a single iteration
- **Concurrent prevention**: Only one iteration can run at a time

### Data Flow
1. **Document loaded** → Extract original headings → Display in Structure tab
2. **Generate button clicked** → API call to `/api/headings` → Apply mutation → Update UI
3. **Remove button clicked** → Revert mutation → Clear cache → Update UI
4. **Page refresh** → Check for cached headings → Apply if available → Update UI

## AI Heading Generation

### Generation Process

#### Iterative Generation (Current)
1. **Initial analysis**: Extract document HTML with element IDs and existing headings
2. **First iteration**: LLM analyzes and suggests up to 10 heading improvements
3. **User review**: Display summary of changes with option to continue or finish
4. **Subsequent iterations**: If continuing, LLM builds on previous changes
5. **Progressive refinement**: Each iteration improves structure incrementally
6. **Completion**: User chooses when structure is satisfactory or limits reached
7. **Final application**: All accumulated operations applied as single mutation

#### Single-Pass Generation (Legacy)
1. **Content analysis**: Extract document HTML with element IDs and existing headings
2. **Operations generation**: LLM analyzes content and generates all heading operations at once
3. **Mutation application**: Operations applied as reversible document transforms

### Key Features
- **Iterative improvement**: Progressive enhancement through multiple focused iterations (max 10)
- **Full mutation capabilities**: Can insert new headings, replace existing ones, or remove headings
- **Context-aware**: AI receives complete document structure including original headings
- **Iteration memory**: Each iteration knows what previous iterations accomplished

### Operations Format

The AI generates heading modifications using a flexible operations system:

#### Operation Types

1. **Insert Operation** - Adds new headings at specific positions
2. **Replace Operation** - Updates existing headings while maintaining position
3. **Remove Operation** - Removes unnecessary or redundant headings

#### Operation Schema
```typescript
type HeadingOperation = 
  | { type: 'insert'; insertNewBeforeExistingId: string; html: string; level: number; text: string }
  | { type: 'replace'; existingId: string; html: string; level: number; text: string }
  | { type: 'remove'; existingId: string }
```

#### Schema Validation
- **Type safety**: Zod schemas ensure operations are well-formed
- **Iteration signals**: Additional fields for controlling iterative flow

### Preserving Author Intent

The system is designed to enhance, not replace, the author's original structure:

- **Original headings as context**: AI sees all existing headings during analysis
- **Hierarchical priorities**: AI follows structured approach (H1 → H2 → H3)
- **Intelligent enhancement**: AI can choose to keep, modify, or remove headings
- **User control**: All changes can be reverted with one click

### Technical Implementation
- **Full HTML context**: Document HTML sent with all original headings intact
- **Operations to transforms**: Each operation converted to a mutation transform
- **Atomic application**: All operations applied as single reversible mutation

### Caching and Persistence
- **Database storage**: Generated headings stored in Supabase for reuse
- **Automatic loading**: Cached headings applied on page load if available
- **Cache invalidation**: Remove button clears both UI and database cache

### Multi-Provider Support
- **Development**: Use Gemini Flash or Claude Haiku for cost efficiency
- **Production**: Use Claude Sonnet 4 for quality
- **Configuration**: Switch models using `LLM_MODEL` environment variable

## Template System

The heading generation uses the standard prompt template system with `.njk` files and Zod schema validation.

### Heading Schema
```typescript
{
  html_content: string,        // Document HTML content to analyze (includes original headings)
  documentId: string,          // Document identifier for caching
  context?: string,            // Additional context about document
  style?: string,             // Heading style preferences
  max_headings?: number,      // Maximum number of headings to generate
  // Iteration-specific fields:
  iteration_count?: number,    // Current iteration (0-indexed)
  previous_iteration_summary?: string,  // What was done in previous iterations
  existing_operations?: HeadingOperation[]  // Operations from previous iterations
}
```

### Generated Operations Structure
```typescript
{
  operations: Array<
    | {
        type: 'insert';
        insertNewBeforeExistingId: string;  // Target element ID for insertion
        html: string;                       // New heading HTML content
        level: number;                      // Heading level (1-6)
        text: string;                       // Plain text content
      }
    | {
        type: 'replace';
        existingId: string;                 // ID of heading to replace
        html: string;                       // Replacement HTML content
        level: number;                      // New heading level (1-6)
        text: string;                       // New plain text content
      }
    | {
        type: 'remove';
        existingId: string;                 // ID of heading to remove
      }
  >,
  // Iteration control fields:
  more_changes_required: boolean,    // Whether another iteration would be beneficial
  iteration_summary: string,         // Human-readable summary of this iteration's changes
  safety_check: {
    current_iteration: number,       // Current iteration count (0-indexed)
    total_operations_so_far: number, // Cumulative operations across all iterations
    max_iterations_reached: boolean  // Whether we've hit the 5-iteration limit
  }
}
```

## Tool Registry Integration

The Structure tab is integrated with the unified tool registry system:

- **Tool ID**: `structure`
- **Icon**: TreeStructure (Phosphor Icons)
- **Category**: Navigation
- **Shortcuts**: `Cmd+1`, `Ctrl+1`
- **Keywords**: `['headings', 'toc', 'table of contents', 'structure', 'outline', 'ai', 'generate']`
- **Requirements**: Requires document to be loaded

### API Usage Note

The unified tool-executor always issues **POST** requests, even for read-only operations.  For convenience, the *Structure* handler accepts multiple actions:

#### Available Actions
- `"get"` or `"list"`: Fetch cached heading operations
- `"generate"`: Generate all headings at once (legacy single-pass mode)
- `"iterate"`: Generate headings iteratively (adaptive based on parameters)
- `"delete"`: Remove cached heading operations

#### Iterative Mode Example
```ts
// First iteration (no existing_operations)
await executeTool('structure', 'iterate', { documentId })

// Subsequent iterations (with accumulated operations)
await executeTool('structure', 'iterate', { 
  documentId,
  existing_operations: previousOperations 
})
```

The `iterate` action adapts its behavior based on the presence of `existing_operations`.

### Command Palette Integration
- **Auto-generation**: Commands automatically generated from tool registry
- **Search**: Discoverable via keywords in command palette
- **Navigation**: `nav-structure` command opens Structure tab

## Responsive Design

The interface adapts across desktop and mobile devices with touch-friendly controls.

## Error Handling

- **API failures**: Clear error messages with retry options
- **State corruption**: Automatic recovery and fallback to original state
- **Loading indicators**: Clear visual feedback during all operations

## Performance

- **Caching**: Aggressive caching of generated content
- **State efficiency**: Minimal re-renders and optimized React patterns
- **API optimization**: Efficient backend processing with correlation tracking

## Limitations

- **Processing time**: Each iteration takes 10-20 seconds
- **Iteration limits**: Maximum 10 iterations per document
- **Operation limits**: Maximum 10 operations per iteration
- **Single mutation**: Only one heading mutation active at a time

## Testing Status

- **Functional status**: ✅ Feature is fully implemented and working in production
- **Test alignment**: ⚠️ Some tests expect legacy behavior vs current implementation

## Troubleshooting

**Generate button not responding**: Check dev tools for API errors, verify authentication

**Generated headings not displaying**: Refresh page to trigger cache reload

**Poor heading quality**: Try different LLM model configurations

