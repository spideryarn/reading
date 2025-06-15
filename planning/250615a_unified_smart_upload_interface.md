# Unified Smart Upload Interface

## Goal

Transform the current dual-tab upload interface (`/upload`) into a unified, intelligent single-input interface that can handle both URLs and file uploads seamlessly. The interface should auto-detect input type and present appropriate processing options contextually.

## Context

The current upload page has two separate tabs:
- "Paste URL" - for web page and PDF URL extraction
- "Upload PDF or HTML" - for file upload with drag-and-drop

This creates unnecessary cognitive load and complexity. Users need to choose between tabs before they can even provide their input, and the processing options are confusing (especially the conditional provider selection).

## References

- `docs/reference/UPLOAD.md` - Comprehensive upload system documentation with current capabilities and processing pipeline
- `app/upload/page.tsx` - Current implementation with dual-tab interface and complex state management
- `app/api/upload-pdf/route.ts` - PDF upload API endpoint
- `app/api/extract-url/route.ts` - URL extraction API endpoint
- `app/api/upload-html/route.ts` - HTML file upload API endpoint (if exists)

## Principles, Key Decisions

### User Experience Principles
- **Smart Single Input**: One input field that accepts both URLs and file drops/selection
- **Auto-detection**: Automatically determine input type and adjust UI accordingly
- **Contextual Options**: Show only relevant processing options based on input type
- **Validation on Submit**: Allow users to select incompatible options but validate and provide clear error messages on submit
- **Preserve Error Handling**: Maintain the sophisticated error handling from current implementation

### Technical Approach
- **Option A Implementation**: Smart single input field that handles both URLs and files
- **Mutual Exclusivity**: When one input type is provided, the other is disabled/cleared
- **Progressive Disclosure**: Processing options appear based on detected input type
- **Unified State Management**: Consolidate URL and file state into cohesive state structure

### Processing Method Simplification
- **For HTML sources** (URLs or HTML files): "Use As-is", "Mozilla Readability", "AI Transcription"
- **For PDF sources** (PDF URLs or PDF files): "AI Transcription" only
- **Provider Selection**: Simplified to "Claude Sonnet (recommended)" and "Gemini (for longer docs)"

## Stages & Actions

### Stage: Research and Validation
- [ ] Run `./scripts/sync-worktrees.ts` in subagent to sync latest changes
- [ ] Research similar "smart input" patterns in other applications
  - Look at file upload interfaces that handle both URLs and files
  - Study drag-and-drop zones that also accept text input
- [ ] Validate technical feasibility of URL file type detection
  - Test URL detection for PDFs vs HTML pages
  - Verify current backend handles PDF URL detection correctly
- [ ] Review current state management complexity
  - Map all current state variables in upload page
  - Identify which states can be consolidated or eliminated

### Stage: Design and Architecture
- [ ] Design unified state structure
  - Create single state object for input (URL or file)
  - Design processing options state that updates based on input type
  - Plan validation logic for incompatible option combinations
- [ ] Design smart input component interface
  - Single input field with placeholder text that changes based on context
  - File drop zone that overlays or integrates with text input
  - Clear visual feedback for input type detection
- [ ] Create processing options display logic
  - Map input types to available processing methods
  - Design conditional rendering for provider selection
  - Plan validation error messages for incompatible selections

### Stage: Implementation - Core Smart Input
- [ ] Create new unified state management
  - Replace separate URL and file states with single input state
  - Implement input type detection logic
  - Add state for dynamically showing/hiding processing options
- [ ] Implement smart input component
  - Create input field that accepts both URLs and handles file drops
  - Add visual feedback for different input types
  - Implement mutual exclusivity (URL input disables file, file selection clears URL)
- [ ] Add input type detection
  - Detect URLs vs file selection
  - For URLs, attempt to detect if pointing to PDF
  - Update processing options based on detected type
- [ ] Test basic input functionality
  - URL input detection and validation
  - File drop and selection
  - State management between different input types

### Stage: Processing Options Integration
- [ ] Implement contextual processing options
  - Show "Use As-is" and "Mozilla Readability" only for HTML sources
  - Show simplified AI transcription options for all sources
  - Hide/show provider selection based on AI transcription selection
- [ ] Add validation logic
  - Validate processing method compatibility with input type on submit
  - Provide clear error messages for incompatible combinations
  - Preserve existing error handling for extraction failures
- [ ] Update submit handler
  - Route to appropriate API endpoint based on input type
  - Include proper error handling for each path
  - Maintain navigation to document page on success

### Stage: Error Handling and Edge Cases
- [ ] Implement comprehensive error handling
  - Port sophisticated error handling from current implementation
  - Add specific error messages for incompatible option selections
  - Handle edge cases like invalid URLs, unsupported file types
- [ ] Add loading states and feedback
  - Show appropriate loading messages based on processing type
  - Disable input during processing
  - Provide progress indication for long-running operations
- [ ] Test error scenarios
  - Test all error paths with appropriate error messages
  - Verify fallback suggestions work correctly
  - Test edge cases like very large files, malformed URLs

### Stage: UI Polish and Accessibility
- [ ] Implement responsive design
  - Ensure smart input works well on mobile devices
  - Test drag-and-drop functionality across devices
  - Verify accessibility with keyboard navigation
- [ ] Add visual enhancements
  - Smooth transitions when processing options appear/disappear
  - Clear visual indication of input type detection
  - Consistent styling with existing design system
- [ ] Test with Puppeteer MCP in subagent
  - Verify all interaction flows work correctly
  - Test drag-and-drop functionality
  - Verify error states display properly

### Stage: Testing and Validation
- [ ] Write comprehensive unit tests
  - Test input type detection logic
  - Test state management for different input types
  - Test validation logic for processing options
- [ ] Write integration tests
  - Test full upload flow for URLs
  - Test full upload flow for files
  - Test error handling scenarios
- [ ] Run existing test suites in subagent
  - Ensure no regressions in current functionality
  - Fix any broken tests due to interface changes
- [ ] Manual testing with real content
  - Test with various URL types (HTML pages, PDFs)
  - Test with different file types and sizes
  - Verify processing options work correctly

### Stage: Documentation and Cleanup
- [ ] Update documentation
  - Update `docs/reference/UPLOAD.md` with new interface description
  - Document new state management approach
  - Update any relevant architectural documentation
- [ ] Code cleanup
  - Remove unused state variables and handlers
  - Consolidate duplicate logic
  - Add proper TypeScript types for new state structure
- [ ] Git commit with subagent
  - Commit implementation with comprehensive commit message
  - Include before/after screenshots if helpful

### Stage: Review and Deployment
- [ ] Review implementation with user
  - Demo new interface functionality
  - Verify all requirements are met
  - Address any feedback or concerns
- [ ] Final testing in production-like environment
  - Test with real API endpoints
  - Verify file upload limits and validation
  - Test with various browser types
- [ ] Move planning document to `planning/finished/`
- [ ] Commit final changes

## Appendix

### Current State Structure Analysis
The current implementation has complex state management with separate trees for:
- URL state: `url`, `urlError`, `extractionMethod`, `urlProvider`, `isExtractingUrl`
- File state: `selectedFile`, `error`, `selectedProvider`, `htmlProcessingMethod`, `htmlProvider`, `isUploading`
- Shared state: `isPublic`, `convertedHtml`, `isDragging`

### Smart Input Design Considerations
The smart input should:
- Accept text input for URLs with real-time validation
- Accept file drops and show selected file info
- Provide clear visual feedback about input type
- Handle the mutual exclusivity between URL and file input
- Maintain accessibility for keyboard users

### Processing Method Mapping
```
HTML URL/File:
- Use As-is ✓
- Mozilla Readability ✓  
- AI Transcription ✓

PDF URL/File:
- Use As-is ✗ (validation error)
- Mozilla Readability ✗ (validation error)
- AI Transcription ✓
```

### Error Handling Requirements
Must preserve existing sophisticated error handling:
- Readability failures with suggestions to try AI transcription
- File size limit errors with specific limits
- Network errors with appropriate retry suggestions
- Invalid URL format errors
- Unsupported file type errors

### User Feedback from Sounding Board Discussion
Key decisions from user:
- Prefer "Option A: Smart Single Input" over tabbed interface
- Handle URL + file conflict by mutual exclusivity
- Validate incompatible processing options on submit with clear error messages
- Preserve existing error handling sophistication
- Simplify provider selection to "Claude Sonnet" and "Gemini (for longer docs)"