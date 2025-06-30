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
- `planning/250627a_consolidate_headings_tabs_into_structure_tab.md` - Implementation planning for Structure tab consolidation
- `docs/conversations/250628b_conversation_headings_generation_full_mutation_support.md` - Implementation of full mutation support for heading operations
- `lib/prompts/templates/headings.ts` - Schema and prompt configuration for heading generation
- `lib/prompts/templates/headings.njk` - LLM prompt template for heading generation
- `/api/headings/route.ts` - API endpoint for generating document headings
- `components/tools/StructurePanel.tsx` - Unified Structure tab component
- `components/unified-left-pane.tsx` - Main left pane that includes Structure tab

## Key Features

### Unified Interface Design
- **Single Structure tab** with TreeStructure icon replaces dual-tab system
- **Status badge** clearly indicates current state (Original vs AI-enhanced)
- **Context-aware buttons** show appropriate actions (Generate vs Remove)
- **Seamless state transitions** between original and enhanced views

### AI Enhancement Workflow

#### Iterative Generation Mode
- **Progressive improvement**: AI enhances document structure iteratively, making up to 10 heading operations per iteration
- **User control at each step**: After each iteration, users can choose to continue improving or stop
- **Iteration limits**: Maximum 5 iterations and 50 total operations per document for safety
- **Clear progress tracking**: Shows current iteration count and operations performed

#### Traditional Single-Pass Mode (Legacy)
- **Explicit user control**: AI generation only occurs when user clicks "Generate AI headings"
- **Visual feedback**: Loading states and progress indicators during generation
- **Persistent state**: Generated headings are cached and survive page refreshes
- **Reversible changes**: Trashcan button removes AI enhancements and reverts to original

### Enhanced User Experience
- **Simplified navigation**: Single tab reduces cognitive load
- **Clear state indication**: Badge tooltips explain current enhancement status
- **Responsive design**: Works seamlessly across desktop, tablet, and mobile devices
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
- **Iteration limit**: Maximum 5 iterations per document
- **Operation limit**: Maximum 50 total operations across all iterations
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
2. **LLM processing**: Send to configured AI model (Claude/Gemini) with full context
3. **Operations generation**: LLM analyzes content and generates all heading operations at once
4. **Mutation application**: Operations applied as reversible document transforms
5. **UI update**: Interface updates to show AI-enhanced state

### Key Features
- **Iterative improvement**: Progressive enhancement through multiple focused iterations
- **Operation limits**: Constrained to 10 operations per iteration for focused improvements
- **Hierarchical priorities**: AI follows smart ordering (H1 → H2 → H3) through prompt guidance
- **Preserves original headings**: AI sees and respects author's original structure
- **Full mutation capabilities**: Can insert new headings, replace existing ones, or remove headings
- **Context-aware**: AI receives complete document structure including original headings
- **Operations-based**: Uses flexible operations format for comprehensive heading modifications
- **Iteration memory**: Each iteration knows what previous iterations accomplished

### Operations Format

The AI generates heading modifications using a flexible operations system:

#### Operation Types

1. **Insert Operation**
   - Adds new headings at specific positions
   - Uses insert-before semantics for intuitive placement
   - Preserves document flow and hierarchy

2. **Replace Operation**
   - Updates existing headings while maintaining position
   - Preserves original heading IDs for stability
   - Allows refinement of author's structure

3. **Remove Operation**
   - Removes unnecessary or redundant headings
   - Helps clean up over-structured documents
   - Maintains document coherence

#### Operation Schema
```typescript
type HeadingOperation = 
  | { type: 'insert'; insertNewBeforeExistingId: string; html: string; level: number; text: string }
  | { type: 'replace'; existingId: string; html: string; level: number; text: string }
  | { type: 'remove'; existingId: string }
```

#### Schema Validation
- **Conditional validation**: Each operation type has specific required fields
- **Type safety**: Zod schemas ensure operations are well-formed
- **Error prevention**: Invalid operations rejected before application
- **Iteration signals**: Additional fields for controlling iterative flow
  - `more_changes_required`: Boolean indicating if another iteration would help
  - `iteration_summary`: Description of changes made in this iteration
  - `safety_check`: Current iteration count and operation totals

### Preserving Author Intent

The system is designed to enhance, not replace, the author's original structure:

- **First iteration guidance**: Special prompt instructions to respect author's original structure
- **Original headings as context**: AI sees all existing headings during analysis
- **Hierarchical priorities**: AI follows structured approach:
  1. Establish clear H1 document title if missing
  2. Create H2 major sections before subdividing
  3. Improve existing headings following best practices
  4. Add H3+ subdivisions where sections exceed ~400 words
- **Intelligent enhancement**: AI can choose to keep, modify, or remove headings
- **Respectful modifications**: Changes aim to clarify and improve, not rewrite
- **User control**: All changes can be reverted with one click

### Technical Implementation Details

#### Content Processing
- **Full HTML context**: Document HTML sent with all original headings intact
- **Element preservation**: Original heading IDs maintained for stability
- **Structured extraction**: Headings extracted with hierarchy information
- **AI visibility**: LLM receives complete document structure for informed decisions

#### Mutation Engine Integration
- **Operations to transforms**: Each operation converted to a mutation transform
- **Transform types**: Maps to `add-element`, `replace-element`, or `remove-element`
- **Atomic application**: All operations applied as single reversible mutation
- **Rollback support**: Complete mutation can be reverted with one action

#### Backward Compatibility
- **Legacy format support**: Removed to simplify codebase
- **Clean migration**: Old insert-only format no longer supported
- **Simplified validation**: Single operations-based schema with conditional rules

### Caching and Persistence
- **Database storage**: Generated headings stored in Supabase for reuse
- **Automatic loading**: Cached headings applied on page load if available
- **Performance optimization**: Avoids re-generation for previously processed documents
- **Cache invalidation**: Remove button clears both UI and database cache

### Multi-Provider Support
Uses the centralized provider-tier system from `lib/config.ts`:
- **Development**: Use `google:gemini-2.0-flash:latest` or `anthropic:claude-3-5-haiku:20241022` for cost efficiency
- **Production**: Use `anthropic:claude-sonnet-4:20250514` for quality
- **Configuration**: Switch models using `LLM_MODEL` environment variable

## Template System

The heading generation uses the standard prompt template system:

- **Template files**: `.njk` files for prompt text with variable interpolation
- **Schema validation**: Zod schemas ensure type safety for prompt parameters
- **Content analysis**: Sophisticated prompts for understanding document structure
- **Error handling**: Robust validation throughout the prompt pipeline

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

### Cross-Device Compatibility
- **Desktop (1200px+)**: Full interface with all features visible
- **Tablet (768px-1024px)**: Optimized layout with maintained functionality
- **Mobile (320px-768px)**: Touch-friendly interface with accessible controls
- **Adaptive layout**: UI elements reflow appropriately at all screen sizes

### Touch Interface Support
- **Button sizing**: Appropriate touch targets for mobile devices
- **Tooltip behavior**: Optimized for touch interactions
- **Scroll handling**: Smooth scrolling and navigation on touch devices

## Error Handling and Recovery

### Common Error Scenarios
- **API failures**: Clear error messages with retry options
- **Network issues**: Graceful degradation with offline indicators
- **State corruption**: Automatic recovery and fallback to original state
- **Cache mismatches**: Intelligent cache validation and repair

### User Feedback
- **Loading indicators**: Clear visual feedback during all operations
- **Success confirmation**: Immediate UI updates on successful operations
- **Error messages**: Descriptive error messages with actionable solutions
- **State clarity**: Always clear what state the interface is in

## Performance Considerations

### Optimization Strategies
- **Lazy loading**: Content loaded on demand
- **Caching**: Aggressive caching of generated content
- **State efficiency**: Minimal re-renders and optimized React patterns
- **API optimization**: Efficient backend processing with correlation tracking

### Monitoring and Observability
- **Correlation IDs**: All operations tracked with unique identifiers
- **Performance timing**: Generation and loading times monitored
- **Error tracking**: Comprehensive error logging for debugging
- **User analytics**: Understanding of feature usage patterns

## Limitations and Considerations

### Current Limitations
- **LLM processing time**: Each iteration takes 10-20 seconds (faster than single-pass 30-60s)
- **Iteration limits**: Maximum 5 iterations and 50 total operations per document
- **Operation limits**: Maximum 10 operations per iteration
- **Model dependency**: Quality depends on selected LLM model capabilities
- **Content analysis**: Best results with structured, well-formatted documents
- **Language support**: Optimized for English content
- **Single mutation**: Only one heading mutation active at a time
- **No intra-mutation dependencies**: Operations within same mutation cannot reference each other's generated IDs
- **Concurrent iterations**: Only one iteration can run at a time (UI prevents concurrent requests)

### Future Enhancements
- **Prompt caching**: Implement Anthropic prompt caching for 90% cost reduction
- **Adaptive iteration limits**: Adjust limits based on document size and complexity
- **Iteration history**: View and revert to previous iteration states
- **Batch processing**: Generate headings for multiple documents
- **Quality scoring**: Automatic assessment of heading quality
- **User preferences**: Customizable generation parameters (iteration limits, priorities)
- **Real-time collaboration**: Multi-user editing of generated headings
- **Smart suggestions**: Context-aware heading recommendations

## Troubleshooting

### Common Issues

**Problem**: Generate button not responding
- **Solution**: Check dev tools for API errors, verify authentication

**Problem**: Generated headings not displaying
- **Solution**: Refresh page to trigger cache reload, check for state sync issues

**Problem**: Loading state stuck
- **Solution**: This was fixed in recent updates; ensure component state management is working

**Problem**: Headings appearing in wrong order
- **Solution**: This was fixed with insert-before semantics and proper mutation sorting

**Problem**: Multiple headings at same insertion point reversed
- **Solution**: Fixed with non-chaining approach and precedence sorting

**Problem**: Responsive layout issues
- **Solution**: Check CSS media queries and viewport meta tag

**Problem**: Poor heading quality
- **Solution**: Try different LLM model configurations, check document structure

### Development Debugging
- **Browser dev tools**: Check console for state management issues
- **Network tab**: Monitor API calls and response timing
- **React dev tools**: Inspect component state and props
- **Server logs**: Check backend processing with correlation IDs

## Migration Notes

### From Dual-Tab System
Users familiar with the previous "Original" and "AI-Generated" tabs will find:
- **Functionality preserved**: All previous features available in unified interface
- **Clearer workflow**: Single tab reduces confusion about state
- **Improved UX**: More discoverable AI enhancement features
- **Better performance**: Optimized state management and rendering

### Breaking Changes
- **Component references**: `OriginalHeadingsTab` and `AIGeneratedHeadingsTab` removed
- **URL routes**: Previous tab routes redirect to unified `structure` tab
- **Tool registry**: Old `toc-original` and `toc-ai` tools replaced with `structure`
- **Field names**: `afterId` replaced with explicit `insertNewBeforeExistingId` throughout
- **Insertion semantics**: Switched from insert-after to insert-before for semantic correctness
- **Chaining logic**: Eliminated complex chaining in favor of robust non-chaining approach
- **Response format**: Changed from array of headings to operations-based format
- **AI context**: Original headings now provided to AI (previously stripped)
- **Mutation types**: Expanded from insert-only to full insert/replace/remove operations