# Structure Tab: Document Headings and AI Enhancement

The Structure tab provides a unified interface for viewing and enhancing document structure with AI-generated headings. It consolidates the original document outline with optional AI-powered enhancements in a single, intuitive interface.

## Overview

The Structure tab replaces the previous separate "Original" and "AI-Generated" headings tabs with a unified experience that:

- **Displays document structure** in its current state (original or AI-enhanced)
- **Provides explicit AI enhancement** through user-initiated generation
- **Supports seamless switching** between original and AI-enhanced views
- **Maintains all existing functionality** including tooltips, navigation, and mutation handling

## See also

- `docs/reference/LLM_PROMPT_TEMPLATES.md` - Guide to creating and using LLM prompt templates
- `docs/reference/MUTATIONS_DOCUMENT_CONTENT_REVERSIBLE_TRANSFORMS.md` - Documents the reversible document transformation system
- `planning/250627a_consolidate_headings_tabs_into_structure_tab.md` - Implementation planning for Structure tab consolidation
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
| Original headings | "Original" (blue) | "Generate AI headings" button | Showing document's original structure |
| AI headings active | "AI-enhanced" (green) | Trashcan (remove) button | Showing AI-generated enhanced structure |
| Generating | "Original" (blue) | Loading spinner | AI enhancement in progress |
| Removing | "AI-enhanced" (green) | Loading spinner | Reverting to original structure |

### Button Behaviors

#### Generate AI Headings Button
- **Appearance**: Green text, appears when in original state
- **Function**: Initiates AI analysis and heading generation
- **Loading state**: Shows "Generating..." with spinner during processing
- **Success**: Transitions to AI-enhanced state with trashcan button
- **Error handling**: Shows error message with retry option

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
```
Initial State: Original headings displayed
     ↓ User clicks "Generate AI headings"
Loading State: Shows "Generating..." with spinner
     ↓ API call completes successfully
AI State: AI headings displayed with trashcan button
     ↓ User clicks trashcan button
Loading State: Shows spinner during removal
     ↓ Mutation reverted successfully
Original State: Back to original headings with generate button
```

### Data Flow
1. **Document loaded** → Extract original headings → Display in Structure tab
2. **Generate button clicked** → API call to `/api/headings` → Apply mutation → Update UI
3. **Remove button clicked** → Revert mutation → Clear cache → Update UI
4. **Page refresh** → Check for cached headings → Apply if available → Update UI

## AI Heading Generation

### Generation Process
1. **Content analysis**: Extract document HTML with element IDs
2. **LLM processing**: Send to configured AI model (Claude/Gemini)
3. **Heading generation**: LLM analyzes content and suggests appropriate headings
4. **Semantic insertion**: Headings use insert-before semantics for correct positioning
5. **Mutation application**: Generated headings inserted as reversible document transforms
6. **UI update**: Interface updates to show AI-enhanced state

### Insert-Before Semantics

AI-generated headings use **insert-before** semantics, meaning they appear **before** the content they introduce. This matches user expectations from other document editors:

- **Semantic correctness**: Headings introduce content sections rather than concluding them
- **Proper hierarchy**: Multiple headings at the same insertion point appear in logical order (H2 → H3 → H4)
- **Accessibility**: Screen readers navigate by headings in correct document flow
- **Industry standard**: Matches patterns from Google Docs, Word, Notion

### Multiple Heading Ordering

When multiple AI headings target the same insertion point:

1. **Non-chaining approach**: All headings target original document elements
2. **Mutation engine sorting**: Handles correct precedence automatically
3. **Serial insertion behavior**: Last transform appears closest to target
4. **Deterministic ordering**: Consistent results across regeneration scenarios

**Example**:
```
Input: Generate H2 "Introduction" and H3 "Overview" before paragraph-123
Result: H2 Introduction → H3 Overview → paragraph-123 (correct logical order)
```

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
  html_content: string,        // Document HTML content to analyze
  documentId: string,          // Document identifier for caching
  context?: string,            // Additional context about document
  style?: string,             // Heading style preferences
  max_headings?: number       // Maximum number of headings to generate
}
```

### Generated Heading Structure
```typescript
{
  insertNewBeforeExistingId: string,  // Target element ID for semantic insertion
  html: string,                       // Generated heading HTML content
  level: number,                      // Heading level (1-6)
  text: string                        // Plain text content
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
- **LLM processing time**: Generation can take 30-60 seconds for large documents
- **Model dependency**: Quality depends on selected LLM model capabilities
- **Content analysis**: Best results with structured, well-formatted documents
- **Language support**: Optimized for English content
- **Single mutation**: Only one heading mutation active at a time
- **No intra-mutation dependencies**: Headings within same mutation cannot reference each other's generated IDs

### Future Enhancements
- **Batch processing**: Generate headings for multiple documents
- **Quality scoring**: Automatic assessment of heading quality
- **User preferences**: Customizable generation parameters
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