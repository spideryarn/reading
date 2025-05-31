# Unified Left Pane Data Flow Analysis

## Overview

This document analyzes the current data flow between components in the 3-pane layout to inform the creation of the unified left pane in the 2-pane architecture.

## Current Component Structure

### DocumentPageClient (Layout Coordinator)
- **State Management**:
  - `mutatedDocument` - From mutation context
  - `selectedElement` - Currently selected element
  - `glossaryEntities` - Glossary data
  - `isLoadingGlossary` - Loading state
  - `showGlossary` - Display state
  - `glossaryError` - Error state
  - `headingVisibility` - Map of heading IDs to visibility status
  - `elementVisibility` - Map of element IDs to visibility

- **Key Functions**:
  - `fetchGlossary()` - Fetches glossary entities
  - `handleHeadingClick()` - Handles ToC heading clicks
  - `handleElementClick()` - Handles document element clicks
  - `findNearestHeading()` - Finds heading for clicked element
  - `triggerTocScrollToHeading()` - Scrolls ToC to specific heading

### TableOfContents Component
- **Props**:
  - `content: string` - HTML content
  - `elements?: DocumentElement[]` - Document elements
  - `onHeadingClick?: (text, id) => void` - Heading click handler
  - `documentId: string` - Document identifier
  - `markdownContent: string` - Markdown for summaries
  - `headingVisibility?: Map<string, 'visible' | 'not-visible'>` - Visibility states

- **Internal State**:
  - `headings` - Extracted headings
  - `aiHeadings` - AI-generated headings
  - `loadingStates` - Set of loading heading IDs
  - `contentCache` - Map of heading summaries
  - `collapsedStates` - Expand/collapse states per tab
  - `granularityLevels` - Heading depth settings
  - `activeTab` - Current active tab

- **Tabs**:
  1. Original - Shows document headings
  2. AI-generated - Shows AI-generated headings
  3. Summary - Shows document summary

### DocumentViewer Component
- **Props**:
  - `elements: DocumentElement[]` - Document elements
  - `selectedElement?: DocumentElement | null` - Selected element
  - `onElementSelect?: (element) => void` - Selection handler
  - `glossaryEntities?: Entity[]` - Glossary data
  - `isLoadingGlossary?: boolean` - Loading state
  - `showGlossary?: boolean` - Display state
  - `onLoadGlossary?: () => void` - Load handler
  - `glossaryError?: string | null` - Error state
  - `onElementVisibilityChange?: (id, visible) => void` - Visibility handler
  - `onElementClick?: (element) => void` - Click handler

- **Internal Functions**:
  - `handleScrollToEntity()` - Scrolls to glossary entity
  - `renderElement()` - Renders document structure
  - `getDocumentContext()` - Extracts context for chat

- **Tabs** (in Tools pane):
  1. Chat - AI chat interface
  2. Glossary - Entity list

## Data Flow for Unified Component

### Required Props for UnifiedLeftPane

```typescript
interface UnifiedLeftPaneProps {
  // From TableOfContents
  content: string
  elements: DocumentElement[]
  documentId: string
  markdownContent: string
  headingVisibility?: Map<string, 'visible' | 'not-visible'>
  
  // From DocumentViewer (Tools)
  glossaryEntities: Entity[]
  isLoadingGlossary: boolean
  showGlossary: boolean
  glossaryError: string | null
  
  // Callbacks
  onHeadingClick: (headingText: string, headingId?: string) => void
  onLoadGlossary: () => void
  onScrollToEntity: (elementId: string) => void
  
  // For chat context
  documentContext: string
}
```

### State Management Requirements

1. **Tab Management**:
   - Single TabContainer with 5 tabs
   - Maintain active tab state
   - Tab-specific onActivate callbacks

2. **Heading States**:
   - Original headings extraction
   - AI heading generation and storage
   - Collapsed/expanded states per tab
   - Granularity levels per tab
   - Loading states for summaries

3. **Glossary States**:
   - Entity list management
   - Loading/error states
   - Auto-load on tab activation

4. **Chat Context**:
   - Document context extraction
   - Integration with chat runtime

### Event Flow

1. **Heading Clicks**:
   - ToC → onHeadingClick → DocumentPageClient → Scroll document

2. **Glossary Entity Clicks**:
   - Glossary → onScrollToEntity → DocumentPageClient → Scroll document

3. **Tab Activations**:
   - AI-generated tab → Auto-generate headings
   - Glossary tab → Auto-load glossary
   - Summary tab → Auto-generate summary

4. **Visibility Updates**:
   - Document scroll → elementVisibility → headingVisibility → ToC highlight

## Migration Strategy

1. **Phase 1**: Create UnifiedLeftPane with all 5 tabs
2. **Phase 2**: Extract SimpleDocumentViewer from DocumentViewer
3. **Phase 3**: Replace 3-pane layout with ResizablePanelGroup
4. **Phase 4**: Clean up old components and CSS

## Key Considerations

- Preserve all existing functionality
- Maintain state management patterns
- Keep callback signatures consistent
- Ensure proper height inheritance for scrolling
- Handle tab-specific auto-activation behaviors