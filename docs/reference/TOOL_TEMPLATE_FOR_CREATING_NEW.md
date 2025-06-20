# Tool Creation Template

This document provides a comprehensive template for creating new tools in Spideryarn Reading, covering UI integration, cross-pane communication, persistence, and all necessary implementation steps.

## See also

- `docs/reference/TOOL_GLOSSARY.md` - Example of analysis tool implementation with LLM integration
- `docs/reference/TOOL_READING_DIFFICULTY.md` - Example of AI-powered assessment tool with JSON output and UI enhancements
- `docs/reference/TOOL_SEARCH_TEXT.md` - Example of search functionality with real-time UI updates
- `docs/reference/TOOL_HIGHLIGHT.md` - Example of semantic highlighting with confidence-based visuals
- `docs/reference/UNIFIED_LEFT_PANE.md` - Tab system architecture and vertical icon navigation
- `docs/reference/CROSS_PANE_COMMUNICATION.md` - DocumentCommunicationContext integration patterns
- `docs/reference/COMMAND_PALETTE.md` - Keyboard shortcut integration and command definitions
- `docs/reference/LLM_PROMPT_TEMPLATES.md` - AI-powered tool development with Nunjucks + Zod
- `planning/250613c_unified_tool_architecture_url_state_llm_integration.md` - Future unified tool architecture vision
- `components/unified-left-pane.tsx` - Main pane implementation for reference
- `components/vertical-icon-nav.tsx` - Icon navigation system integration
- `components/command-palette.tsx` - Command registration patterns

## Key Principles for Tool Development

- **Function-first design**: Tools solve specific user problems (document analysis, navigation, content transformation)
- **Consistent patterns**: Follow established UI, state management, and API conventions
- **Cross-pane integration**: Tools coordinate with document pane through DocumentCommunicationContext
- **Accessible by default**: Keyboard shortcuts, screen reader support, platform-specific conventions
- **Progressive enhancement**: Basic functionality first, advanced features iteratively
- **LLM-friendly architecture**: Design for future function calling and URL state integration

## Tool Categories and Characteristics

### Analysis Tools
**Examples**: Glossary, Highlights, Search, Reading Difficulty Assessment
- **Purpose**: Extract insights from document content
- **LLM Integration**: Usually required for content analysis (see [TOOL_READING_DIFFICULTY.md](TOOL_READING_DIFFICULTY.md) for AI-powered assessment example)
- **Persistence**: Often cache results in document state
- **UI Pattern**: Tab-based with loading states and result lists

### Navigation Tools  
**Examples**: Original ToC, AI-generated ToC, Summary
- **Purpose**: Help users navigate and understand document structure
- **LLM Integration**: Optional (Original ToC) or required (AI headings)
- **Persistence**: Memory-only for UI state, database for generated content
- **UI Pattern**: Hierarchical lists with click-to-scroll functionality

### Generation Tools
**Examples**: Chat, Summary, AI headings
- **Purpose**: Create new content based on document analysis
- **LLM Integration**: Always required
- **Persistence**: Results often saved to database for reuse
- **UI Pattern**: Input/output interfaces with streaming support

### Transform Tools
**Examples**: Tweet thread view (future)
- **Purpose**: Present document content in alternative formats
- **LLM Integration**: May be required for content restructuring
- **Persistence**: Usually temporary/memory-only
- **UI Pattern**: Separate routes or modal overlays

## Implementation Stages & Actions

### Stage: Planning and Design

- [ ] **Define tool purpose and category**
  - [ ] Write clear problem statement: "Users need to..."
  - [ ] Identify tool category (analysis, navigation, generation, transform)
  - [ ] Research existing similar tools for patterns and conventions
  - [ ] Document expected user workflows and interaction patterns

- [ ] **Design data flow and persistence strategy**
  - [ ] Determine if tool needs LLM integration
  - [ ] Decide on data persistence (memory-only, document state, database)
  - [ ] Plan API endpoints if data processing is required
  - [ ] Design error handling and loading states

- [ ] **Plan UI integration points**
  - [ ] Choose icon from Phosphor Icons library (duotone weight)
  - [ ] Design tab content layout and interactive elements
  - [ ] Plan keyboard shortcuts (follow Cmd+[number] pattern)
  - [ ] Design cross-pane communication needs

### Stage: Basic Infrastructure

- [ ] **Create component structure**
  - [ ] Create main tool component in `components/tools/[ToolName]Panel.tsx`
  - [ ] Implement basic UI layout with loading and error states
  - [ ] Add TypeScript interfaces for tool data and state
  - [ ] Follow shadcn/ui component patterns for consistency

- [ ] **Add to vertical icon navigation**
  - [ ] Update `components/vertical-icon-nav.tsx` with new icon
  - [ ] Add to `TAB_CONFIG` array with icon, tooltip, and shortcut
  - [ ] Assign next available keyboard shortcut number
  - [ ] Test icon appears correctly and tooltip shows

- [ ] **Integrate with unified left pane**
  - [ ] Add tab case to `components/unified-left-pane.tsx`
  - [ ] Import and render tool component in appropriate tab
  - [ ] Ensure tab switching works with new tool
  - [ ] Test pane collapse/expand behavior

### Stage: Core Functionality

- [ ] **Implement tool logic**
  - [ ] Create API endpoint in `app/api/[tool-name]/route.ts` if needed
  - [ ] Implement core functionality with proper error handling
  - [ ] Add TypeScript types for API request/response
  - [ ] Follow existing API patterns for consistency

- [ ] **Add LLM integration (if required)**
  - [ ] Create prompt template in `lib/prompts/templates/[tool-name].njk`
  - [ ] Define Zod schema in `lib/prompts/templates/[tool-name].ts`
  - [ ] Use multi-provider system with `LLM_MODEL` environment variable
  - [ ] Follow patterns from `docs/reference/LLM_PROMPT_TEMPLATES.md`

- [ ] **Implement loading and error states**
  - [ ] Add spinner animations using Phosphor icons
  - [ ] Create user-friendly error messages with retry options
  - [ ] Follow patterns from `docs/reference/STYLING_OVERVIEW.md`
  - [ ] Test all failure scenarios

### Stage: Cross-Pane Communication

- [ ] **Integrate with DocumentCommunicationContext**
  - [ ] Use `useDocumentCommunication()` hook for state access
  - [ ] Implement navigation actions (scroll to elements, highlight terms)
  - [ ] Add tool-specific actions if needed to context interface
  - [ ] Test bidirectional communication with document pane

- [ ] **Add document coordination**
  - [ ] Implement click-to-scroll functionality for tool results
  - [ ] Update document position state when tool triggers navigation
  - [ ] Ensure tool responds to document position changes
  - [ ] Test cross-tab position synchronization

- [ ] **Handle highlighting and selection**
  - [ ] Use existing highlighting system for text/element selection
  - [ ] Coordinate with other tools that use highlighting
  - [ ] Implement temporary highlight effects for interactions
  - [ ] Test highlight conflicts and resolution

### Stage: Command Palette Integration

- [ ] **Add keyboard shortcuts**
  - [ ] Update `components/command-palette.tsx` with new command
  - [ ] Follow platform detection patterns (Cmd/Ctrl)
  - [ ] Assign numbered shortcut (Cmd/Ctrl+[next number])
  - [ ] Test shortcuts work from any application context

- [ ] **Create command definition**
  - [ ] Add to navigation commands category
  - [ ] Include descriptive name and search keywords
  - [ ] Implement action using DocumentCommunicationContext
  - [ ] Add conditional visibility if context-dependent

- [ ] **Test command palette integration**
  - [ ] Verify command appears in search results
  - [ ] Test keyboard navigation to command
  - [ ] Confirm command execution activates tool
  - [ ] Test edge cases (no document loaded, etc.)

### Stage: Data Persistence

- [ ] **Implement caching strategy**
  - [ ] Add client-side caching for expensive operations
  - [ ] Implement cache invalidation when document changes
  - [ ] Use memory-only caching for session data
  - [ ] Consider database storage for permanent results

- [ ] **Add database schema (if needed)**
  - [ ] Create Supabase migration for tool data storage
  - [ ] Add TypeScript types to `lib/types/database.ts`
  - [ ] Implement Row Level Security policies
  - [ ] Follow patterns from existing tool storage

- [ ] **Handle data synchronization**
  - [ ] Sync tool state across browser tabs if needed
  - [ ] Handle offline/online state transitions
  - [ ] Implement data refresh on document reload
  - [ ] Test data consistency edge cases

### Stage: Advanced Features

- [ ] **Add search and filtering (if applicable)**
  - [ ] Implement real-time search with debouncing (300ms)
  - [ ] Add search result highlighting
  - [ ] Create filter controls for different data types
  - [ ] Test search performance with large datasets

- [ ] **Implement granularity controls (if applicable)**
  - [ ] Add sliders or toggles for detail levels
  - [ ] Preserve user preferences in session storage (or URL state - see `docs/reference/ARCHITECTURE_URL_STATE.md`)
  - [ ] Update tool output based on granularity selection
  - [ ] Test all granularity levels

- [ ] **Add export functionality (if applicable)**
  - [ ] Implement data export in common formats (JSON, CSV, etc.)
  - [ ] Add copy-to-clipboard functionality
  - [ ] Create shareable URL generation
  - [ ] Test export across different browsers

### Stage: Testing and Documentation

- [ ] **Write comprehensive tests**
  - [ ] Create unit tests in `components/__tests__/[tool-name].test.tsx`
  - [ ] Test all user interaction flows
  - [ ] Mock API endpoints and test error scenarios
  - [ ] Follow patterns from `docs/reference/TESTING_OVERVIEW.md`

- [ ] **Create tool documentation**
  - [ ] Write `docs/reference/TOOL_[NAME].md` following evergreen doc patterns
  - [ ] Document user features, technical implementation, and limitations
  - [ ] Include code examples and configuration options
  - [ ] Add cross-references to related documentation

- [ ] **Test user experience**
  - [ ] Use subagent with Puppeteer MCP for UI testing
  - [ ] Test keyboard accessibility and screen reader support
  - [ ] Verify mobile responsiveness (tools may be hidden on mobile)
  - [ ] Test with long documents and edge cases

### Stage: Performance and Polish

- [ ] **Optimize performance**
  - [ ] Add debouncing for frequent operations (search, scroll)
  - [ ] Implement virtualization for large datasets if needed
  - [ ] Optimize re-renders with React.memo and useMemo
  - [ ] Test performance with maximum document sizes

- [ ] **Add analytics tracking (future)**
  - [ ] Define analytics events for tool usage
  - [ ] Implement tracking points following privacy guidelines
  - [ ] Create no-op implementation until analytics system ready
  - [ ] Document tracking for future implementation

- [ ] **Polish visual design**
  - [ ] Ensure consistent spacing and typography
  - [ ] Test light/dark theme compatibility
  - [ ] Add smooth animations for state transitions
  - [ ] Verify accessibility color contrast requirements

### Stage: Integration Testing and Release

- [ ] **Comprehensive integration testing**
  - [ ] Test tool with all document types (PDF, URL, different sizes)
  - [ ] Verify compatibility with existing tools (no conflicts)
  - [ ] Test cross-pane communication edge cases
  - [ ] Run full test suite and ensure no regressions

- [ ] **Update architecture documentation**
  - [ ] Add tool to `docs/reference/ARCHITECTURE_OVERVIEW.md`
  - [ ] Update `docs/reference/UNIFIED_LEFT_PANE.md` if needed
  - [ ] Document any new architectural patterns introduced
  - [ ] Update API documentation if endpoints added

- [ ] **Final review and deployment**
  - [ ] Code review focusing on consistency with existing patterns
  - [ ] Test with real user scenarios and edge cases
  - [ ] Verify all documentation is accurate and complete
  - [ ] Git commit following `docs/instructions/GIT_COMMIT_CHANGES.md`

## Component Template Structure

### Basic Tool Panel Component

```typescript
// components/tools/ExampleToolPanel.tsx
'use client'

import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@phosphor-icons/react'
import { useDocumentCommunication } from '@/lib/contexts/document-communication-context'

interface ExampleToolData {
  // Define your tool's data structure
  id: string
  name: string
  // ... other fields
}

interface ExampleToolPanelProps {
  documentId: string
  documentContent: string
}

export function ExampleToolPanel({ documentId, documentContent }: ExampleToolPanelProps) {
  const [data, setData] = useState<ExampleToolData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { actions } = useDocumentCommunication()

  const generateData = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/example-tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          documentId, 
          documentContent 
        })
      })
      
      if (!response.ok) {
        throw new Error(`Failed to generate: ${response.statusText}`)
      }
      
      const result = await response.json()
      setData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [documentId, documentContent])

  const handleItemClick = useCallback((item: ExampleToolData) => {
    // Scroll to related content in document
    actions.scrollToElement(item.id)
  }, [actions])

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 p-4 border-b">
        <Button 
          onClick={generateData}
          disabled={loading}
          className="w-full"
        >
          {loading && <Spinner className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? 'Generating...' : 'Generate Tool Data'}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <div className="text-red-600 mb-4 p-3 bg-red-50 rounded">
            ⚠️ {error}
          </div>
        )}

        {data.length > 0 && (
          <div className="space-y-2">
            {data.map((item) => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className="p-3 border rounded cursor-pointer hover:bg-gray-50"
              >
                <div className="font-medium">{item.name}</div>
                {/* Add more item content */}
              </div>
            ))}
          </div>
        )}

        {!loading && data.length === 0 && !error && (
          <div className="text-gray-500 text-center py-8">
            Click "Generate Tool Data" to analyze the document
          </div>
        )}
      </div>
    </div>
  )
}
```

### API Route Template

```typescript
// app/api/example-tool/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRequestLogger, generateCorrelationId } from '@/lib/services/logger'

const requestSchema = z.object({
  documentId: z.string(),
  documentContent: z.string(),
})

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId()
  const requestLogger = createRequestLogger('/api/example-tool', correlationId)
  
  try {
    const body = await request.json()
    const validatedData = requestSchema.parse(body)
    
    requestLogger.info({
      documentId: validatedData.documentId,
      contentLength: validatedData.documentContent.length,
      correlationId
    }, 'Tool processing started')

    // Implement your tool logic here
    // - LLM calls if needed
    // - Data processing
    // - Database operations

    const result = {
      data: [
        // Your processed data
      ]
    }

    requestLogger.info({
      documentId: validatedData.documentId,
      resultCount: result.data.length,
      correlationId
    }, 'Tool processing completed')

    return NextResponse.json(result)

  } catch (error) {
    requestLogger.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      correlationId
    }, 'Tool processing failed')

    return NextResponse.json(
      { error: 'Failed to process document' },
      { status: 500 }
    )
  }
}
```

## Integration Checklist

### Visual Integration
- [ ] Icon added to vertical navigation rail
- [ ] Tab content renders in unified left pane
- [ ] Consistent spacing and typography with existing tools
- [ ] Loading states use Phosphor icons and standard patterns
- [ ] Error states follow established messaging patterns

### Functional Integration
- [ ] Keyboard shortcut registered and functional
- [ ] Command palette command added and working
- [ ] DocumentCommunicationContext integration complete
- [ ] Cross-pane navigation working (click results scroll document)
- [ ] Tool responds to document position changes

### Technical Integration
- [ ] TypeScript interfaces properly defined
- [ ] API endpoints follow established patterns
- [ ] Error handling comprehensive and user-friendly
- [ ] Logging integrated using Pino structured logging
- [ ] Tests written and passing

### Performance Integration
- [ ] Debounced operations for frequent interactions
- [ ] Memoized components to prevent unnecessary re-renders
- [ ] Proper cleanup of event listeners and timers
- [ ] Tested with maximum document sizes

## Future Architecture Considerations

Based on `planning/250613c_unified_tool_architecture_url_state_llm_integration.md`, future tool development will evolve toward:

### Unified Tool Interface
Tools will implement a standardized interface:
```typescript
interface Tool {
  id: string
  name: string
  description: string
  category: ToolCategory
  icon: ComponentType
  execute: (params: ToolParams) => Promise<ToolResult>
  schema: { required: z.ZodSchema; optional: z.ZodSchema }
  // ... additional properties
}
```

### URL State Management
Tools will support URL serialization for shareability:
- Essential parameters in human-readable URLs
- Debounced updates for real-time parameters (search queries)
- History management (push vs replace decisions)

### LLM Function Calling
Tools will auto-generate LLM function schemas:
- OpenAPI schema generation from tool definitions
- Type-safe parameter validation
- Bidirectional state mapping (URLs ↔ Function calls)

### Migration Strategy
When the unified architecture is implemented:
1. Tools following this template will require minimal migration
2. Current patterns (DocumentCommunicationContext, component structure) will be preserved
3. Additional metadata and URL state support will be added incrementally
4. LLM function generation will be automatic from existing tool definitions

## Troubleshooting Common Issues

### Tool Not Appearing in Navigation
- Verify icon added to `components/vertical-icon-nav.tsx`
- Check tab case added to `components/unified-left-pane.tsx`
- Ensure imports are correct and components export properly

### Cross-Pane Communication Not Working
- Confirm `useDocumentCommunication()` hook is used correctly
- Verify actions are called with proper parameters
- Check DocumentCommunicationContext provider wraps components

### Keyboard Shortcuts Not Working
- Verify command added to `components/command-palette.tsx`
- Check platform detection logic (Mac vs PC)
- Ensure shortcut not conflicting with browser shortcuts

### Performance Issues
- Add debouncing for frequent operations (search, scroll)
- Use React.memo for expensive components
- Check for memory leaks in useEffect cleanup

### Styling Inconsistencies
- Follow shadcn/ui component patterns
- Use existing CSS classes and design tokens
- Test with both light and dark themes
- Verify mobile responsiveness

## Related Resources

### Code Examples
- `components/tools/GlossaryPanel.tsx` - Complete analysis tool implementation
- `components/tools/SearchPanel.tsx` - Real-time search with highlighting
- `components/tools/HighlightManagement.tsx` - Visual highlighting coordination

### API Patterns
- `app/api/glossary/route.ts` - LLM integration with structured output
- `app/api/search/route.ts` - Text processing and result formatting
- `app/api/headings/route.ts` - Document analysis and generation

### Integration Examples
- `components/unified-left-pane.tsx` - Tab system integration
- `components/command-palette.tsx` - Keyboard shortcut patterns
- `lib/contexts/document-communication-context.tsx` - Cross-pane communication

---

*Last updated: 14 June 2025*  
*Status: ✅ Complete template for current architecture*  
*Future: Will evolve with unified tool architecture implementation*