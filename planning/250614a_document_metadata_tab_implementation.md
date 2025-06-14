# Document Metadata Tab Implementation Plan

## Document Metadata
- **Goal**: Create a new metadata tab in the lefthand pane displaying comprehensive document information
- **Priority**: P2 - Important quality-of-life feature for document understanding
- **Primary Owner**: Engineering
- **Secondary Owner**: Product/Design
- **Dependencies**: Existing database fields, future LLM integration for author extraction
- **Target**: MVP implementation within current sprint

## Background

Users need visibility into document metadata to understand context, source, and processing status. Currently this information is scattered or not visible at all. A dedicated metadata tab will provide a centralised location for all document information.

## Key Requirements

### Core Metadata to Display
1. **Document Information**
   - Title (from `documents.title`)
   - Upload date (from `documents.created_at`)
   - Source URL (if URL-based document)
   - File type/format
   - Document length (word count, character count)
   - Estimated reading time (based on 200-250 words per minute)

2. **Reading Difficulty Metrics**
   - Flesch-Kincaid Grade Level (primary metric)
   - Flesch Reading Ease Score (0-100 scale)
   - Interpretation text (e.g., "College level", "Similar to Time Magazine")

3. **AI Processing Status**
   - Glossary generation status
   - AI headings generation status
   - Summary generation status
   - Token usage statistics (from `ai_calls` table)
   - Processing timestamps

4. **Access & Sharing**
   - Privacy status (private/public - currently all private)
   - Owner information
   - Future: sharing permissions

### Technical Approach
- Read-only display for Stage 1 (all automatically extracted)
- Use existing database fields where possible
- Calculate derived metrics (word count, reading time) on the fly
- Future stages: LLM extraction for author, publication date, etc.

## Stage-Based Implementation Plan

### Stage 1: Basic Metadata Display (MVP) ✅ COMPLETE
**Goal**: Display existing metadata in a clean, organised interface

Actions:
- [x] Create `MetadataPanel.tsx` component in `components/tools/`
- [x] Add Tag icon to vertical navigation with "Metadata" tooltip
- [x] Implement basic UI layout with sections:
  - Document Information
  - Document Statistics
  - Processing Status
- [x] Calculate basic metrics:
  - Word count from document content
  - Reading time estimate (words ÷ 225 wpm)
  - Character count
- [x] Display existing database fields:
  - Title, created_at, source_url
  - Processing status from various flags
- [x] Add to unified left pane tab system
- [x] Style with consistent design patterns

**Implementation Notes**:
- Used Tag icon from Phosphor Icons with duotone weight
- Added to position 8 in tab navigation (Cmd/Ctrl+8 keyboard shortcut)
- Used date-fns for relative date formatting
- Implemented clean sectioned UI with consistent spacing and icons
- Processing status shows glossary, AI headings, and summary generation states
- Word count and reading time calculated from extracted element text

### Stage 2: Reading Difficulty Metrics ✅ COMPLETE
**Goal**: Add readability scoring to help users gauge document complexity

Actions:
- [x] Create utility functions for readability calculations:
  - Flesch Reading Ease
  - Flesch-Kincaid Grade Level
- [x] Add readability section to metadata panel
- [x] Display scores with user-friendly interpretations:
  - Grade level (e.g., "12th grade")
  - Difficulty category (e.g., "Fairly Difficult")
  - Comparison benchmark (e.g., "Similar to academic journals")
- [x] Add visual indicator (colour-coded badge or meter)

**Implementation Notes**:
- Created `lib/utils/readability-metrics.ts` with comprehensive readability calculations
- Created `lib/utils/text-statistics.ts` with reusable word counting utilities (consistent word boundary detection)
- Added Reading Difficulty section to MetadataPanel with:
  - Flesch Reading Ease score with color-coded badge (green/blue/yellow/orange/red)
  - User-friendly difficulty interpretation and comparison benchmarks
  - Flesch-Kincaid Grade Level with education level description
- Also added Access & Sharing section showing:
  - Privacy status (currently all documents are private)
  - Owner email address
- Full test suite created for readability calculations
- Successfully integrated owner email through component hierarchy
- Updated multi-summary display to show word counts instead of character counts


### Stage 4: Editable Privacy Toggle
**Goal**: Allow users to toggle document privacy status with smooth UX

**Key Decisions**:
- Use direct Supabase client updates (no API endpoint needed)
- Checkbox UI pattern for simple on/off toggle
- Optimistic updates with error recovery
- Visual feedback: loading state + success/error states
- Later: helpful tooltip and clear error messages

Actions:
- [ ] Add checkbox toggle for `is_public` field in Access & Sharing section
  - Use standard HTML checkbox with label
  - Show current state clearly
  - Add loading state during update
- [ ] Implement optimistic update pattern with Supabase client
  - Update UI immediately on click
  - Call `supabase.from('documents').update({ is_public: newValue }).eq('id', documentId)`
  - Revert UI state if update fails
- [ ] Add error handling and user feedback
  - Show loading spinner/disabled state during update
  - Display success confirmation (subtle)
  - Clear error messages if update fails
- [ ] Stop & review functionality with user
- [ ] Later enhancement: Add helpful tooltip explaining privacy implications
- [ ] Later enhancement: Improve visual feedback (toast notifications, better loading states)

### Stage 5: LLM-Extracted Metadata
**Goal**: Use AI to extract missing metadata from document content

Actions:
- [ ] Create LLM prompt template for metadata extraction
- [ ] Target fields:
  - Author(s) with affiliations
  - Publication date
  - Publisher/source
  - Document type/genre
  - Key topics/themes
- [ ] Design database schema for structured author data
- [ ] Implement extraction API endpoint
- [ ] Add "Extract metadata" button with loading state
- [ ] Handle multiple authors and complex attribution
- [ ] Cache extracted data to avoid re-processing


## UI/UX Design Decisions

### Layout Structure
1. **Sectioned Design**
   - Clear visual separation between sections
   - Collapsible sections for long metadata
   - Consistent spacing and typography

2. **Information Hierarchy**
   - Most important info (title, reading time) at top
   - Technical details in expandable sections
   - Processing status as visual indicators

3. **Visual Elements**
   - Icons for each metadata type
   - Progress bars for processing status
   - Colour-coded difficulty indicators
   - Badges for status (cached, public/private)

### Read-Only vs Editable Fields

**Always Read-Only**:
- System-generated IDs
- Upload timestamps
- Processing timestamps
- Token usage/costs
- Calculated metrics (word count, readability)

**Future Editable Fields**:
- Document title (override)
- User description/notes
- Tags/categories
- Custom metadata fields

**Future LLM-Extracted (Editable After Extraction)**:
- Author(s)
- Publication date
- Publisher
- Document type

## Success Metrics
- User engagement with metadata tab
- Reduction in support queries about document information
- Usage of editable fields (when implemented)
- Performance impact < 100ms for calculations

## Technical Considerations
- Memoize expensive calculations (readability scores)
- Lazy load AI processing statistics
- Consider WebWorker for readability calculations on large documents
- Implement proper error boundaries
- Ensure responsive design for smaller screens

## Future Enhancements
- Export metadata as JSON/CSV
- Bulk metadata editing across multiple documents
- Metadata-based filtering in document library
- API access to document metadata
- Integration with citation managers

---

*Created: 14 June 2025*  
*Last Updated: 14 June 2025 - Stage 4 planning complete*  
*Status: 🟢 In Progress - Stages 1-2 Complete, Stage 4 ready for implementation*  
*Next Review: After Stage 4 completion*