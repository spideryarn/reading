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
   - **Implementation Note**: See `docs/reference/TOOL_READING_DIFFICULTY.md` for final AI-powered assessment approach

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


### Stage 4: Editable Privacy Toggle ✅ COMPLETE
**Goal**: Allow users to toggle document privacy status with smooth UX

**Key Decisions**:
- Use direct Supabase client updates (no API endpoint needed)
- Checkbox UI pattern for simple on/off toggle
- Optimistic updates with error recovery
- Visual feedback: loading state + success/error states
- Later: helpful tooltip and clear error messages

Actions:
- [x] Add checkbox toggle for `is_public` field in Access & Sharing section
  - Use standard HTML checkbox with label
  - Show current state clearly
  - Add loading state during update
- [x] Implement optimistic update pattern with Supabase client
  - Update UI immediately on click
  - Call `supabase.from('documents').update({ is_public: newValue }).eq('id', documentId)`
  - Revert UI state if update fails
- [x] Add error handling and user feedback
  - Show loading spinner/disabled state during update
  - Display success confirmation (subtle)
  - Clear error messages if update fails
- [x] Thread props through component hierarchy (DocumentPageClient → ResizableDocumentLayout → UnifiedLeftPane → MetadataPanel)
- [ ] Later enhancement: Add helpful tooltip explaining privacy implications
- [ ] Later enhancement: Improve visual feedback (toast notifications, better loading states)

**Implementation Notes**:
- Successfully implemented checkbox UI in Access & Sharing section with proper labeling
- Added optimistic update pattern with immediate UI feedback and error recovery
- Comprehensive error handling with user-friendly messages
- Visual feedback includes loading spinner and disabled states during updates
- Props threaded through entire component hierarchy to enable functionality
- All functionality tested and committed successfully

### Stage 4.5: Enhanced Visual Design ✅ COMPLETE
**Goal**: Improve MetadataPanel aesthetics and user experience

Actions:
- [x] Replace flat gray backgrounds with card-based design
- [x] Add gradient icon backgrounds for visual hierarchy
- [x] Implement hover effects and smooth transitions
- [x] Enhanced typography with better font weights and spacing
- [x] Improved color scheme using slate variants for better contrast
- [x] Add subtle shadows and borders for depth
- [x] Refined status badges with color-coded states
- [x] Enhanced readability score display with better visual feedback
- [x] Improved section headers with colored accent bars
- [x] Better structured information hierarchy

**Implementation Notes**:
- Used card-based layout with `bg-white rounded-xl border border-slate-200 shadow-sm`
- Added gradient backgrounds for icons using `bg-gradient-to-br from-{color}-500 to-{color}-600`
- Implemented hover states with `hover:shadow-md transition-all duration-200`
- Enhanced typography with slate color variants and improved font weights
- Added visual accent bars for section headers using gradient pill elements
- Improved status indicators with conditional color coding and rounded badges
- Enhanced privacy toggle with better visual feedback and emoji indicators

### Stage 5: Critical Bug Fixes & Data Integrity ✅ COMPLETE
**Goal**: Fix broken Processing Status and ensure fail-fast error handling

**Critical Issues Identified**:
- Processing Status indicators read from non-existent database fields (`ai_headings_generated`, `summary_generated`)
- These fields were removed when moving to `document_enhancements` table but code still references them
- Values default to `false`, showing "Not generated" even when data exists
- Violates CODING_PRINCIPLES.md: "Fix the root cause rather than putting on a band-aid"

Actions:
- [x] **URGENT: Fix Processing Status data source**
  - Replace database queries from non-existent `documents.ai_headings_generated` and `documents.summary_generated` fields
  - Update `page.tsx` to query `document_enhancements` table for `type = 'headings'` and `type = 'summary'` records
  - Create helper function in DocumentService or EnhancementService to check enhancement existence
  - Return boolean flags based on actual database state, not UI interaction state
- [x] **Full metadata audit for silent failures**
  - Review all metadata fields in MetadataPanel for similar issues
  - Check if any other database fields are referenced but don't exist
  - Ensure all calculations and data sources are actually working as intended
  - Add proper error boundaries and fail-fast validation

**Implementation Notes**:
- Created three generalizable methods in DocumentService:
  - `getExistingEnhancementTypes()`: Returns Set of all enhancement types (most flexible)
  - `hasEnhancement()`: Check for specific enhancement type (simple boolean check)
  - `getEnhancementFlags()`: Backward-compatible method for UI components
- Updated `page.tsx` to use `getEnhancementFlags()` instead of non-existent database fields
- All Processing Status indicators now accurately reflect database state
- Build successful with no TypeScript errors
- Solution is reusable and extensible for future enhancement types
- **CRITICAL FIX**: Found and fixed missing `glossaryGenerated` prop threading:
  - Added `glossaryGenerated` prop to DocumentPageClient interface and parameters
  - Added prop threading through ResizableDocumentLayout component
  - Added prop to UnifiedLeftPane interface and replaced runtime computation with database flag
  - Fixed MetadataPanel to correctly show "Generated" when glossary exists in database
  - Completed the entire prop chain from page.tsx → DocumentPageClient → ResizableDocumentLayout → UnifiedLeftPane → MetadataPanel

### Stage 6: Document Statistics Cleanup ✅ COMPLETE
**Goal**: Remove redundant metrics and improve information density

Actions:
- [x] **Remove character count from Document Statistics**
  - Character count provides little value compared to word count
  - Reduces visual clutter in the statistics grid
- [x] **Remove element count from Document Statistics**  
  - Element count is an internal technical metric not useful to users
  - Simplify statistics to focus on user-relevant metrics

**Implementation Notes**:
- Cleaned up Document Statistics section to show only Words and Reading Time
- Changed grid from 2x2 (4 cards) to 1x2 (2 cards) layout for better visual balance
- Removed characterCount and elementCount from documentStats calculation
- Maintained existing styling and hover effects for remaining cards
- Build successful with no TypeScript errors

### Stage 7: Enhanced Reading Time Calculation ⚠️ RESEARCH COMPLETE - READY FOR IMPLEMENTATION
**Goal**: Implement evidence-based reading time estimation using AI academic complexity levels

**Research Foundation**: Comprehensive parallel research (June 2025) validates 2-5x reading speed variations for academic complexity. See `docs/reference/RESEARCH_READING_SPEED_COMPLEXITY_ADJUSTMENTS.md` for complete evidence base.

**Evidence-Based Approach**: Use existing AI academic difficulty assessment with research-backed multipliers rather than traditional readability metrics (which were deliberately removed due to inferior accuracy).

**Implementation Strategy**:
- **Leverage existing AI assessment**: "High school or below", "Undergraduate", "Masters/PhD", "Post-doctoral/expert"
- **Research-backed multipliers**: 1.0x, 0.80x, 0.65x, 0.55x respectively
- **Confidence weighting**: Reduce adjustments for low-confidence AI assessments
- **238 WPM baseline**: Replace current 225 WPM with Brysbaert 2019 meta-analysis standard

Actions:
- [ ] **Update baseline and implement AI-level multipliers**
  - Update from 225 WPM to research-backed 238 WPM base (Brysbaert 2019 meta-analysis)
  - Integrate AI academic level multipliers:
    - "High school or below": 1.0× (238 WPM) - Accessible content maintains baseline
    - "Undergraduate": 0.80× (190 WPM) - 20% reduction for academic vocabulary + cognitive load
    - "Masters/PhD": 0.65× (155 WPM) - 35% reduction for complex syntax + specialized terminology  
    - "Post-doctoral/expert": 0.55× (131 WPM) - 45% reduction for dense theoretical content
  - Apply confidence weighting: `adjustedMultiplier = 1.0 - ((1.0 - multiplier) * confidenceWeight)`
  - Use conservative fallback (0.80x) for unknown academic levels
- [ ] **Create enhanced reading time utility**
  - Move calculation logic to `lib/utils/enhanced-reading-time.ts`
  - Integrate with existing AI reading difficulty data from MetadataPanel
  - Return detailed breakdown for tooltip display including confidence adjustments
  - Add comprehensive unit tests for all academic levels and confidence scenarios
- [ ] **Add detailed reading time tooltip**
  - Explain evidence-based calculation method
  - Show: word count, base speed (238 WPM), academic level, confidence, final adjusted speed
  - Include individual variation disclaimer
  - Format: "Reading Time: X minutes\n\nCalculated using:\n• Word count: X,XXX words\n• Base reading speed: 238 WPM (research-backed)\n• Academic level: [level] (confidence: [high/medium/low])\n• Adjusted speed: XXX WPM\n\nThis estimate uses AI-powered complexity assessment and accounts for academic reading patterns. Individual reading speeds vary significantly."
- [ ] **Performance optimization**
  - Memoize calculation results to avoid recomputation
  - Ensure minimal impact on MetadataPanel rendering performance
  - Cache AI difficulty data integration

**Technical Integration**:
- Reading difficulty data already available in MetadataPanel via existing AI assessment
- No additional API calls required - uses cached `document_enhancements` data
- Maintains existing UI structure while enhancing calculation accuracy
- Backwards compatible with documents that don't have reading difficulty assessments

**Success Criteria**:
- Reading time estimates reflect meaningful differences between academic complexity levels
- Tooltip provides clear explanation of methodology without overwhelming users
- Performance impact remains under 100ms for calculations
- User feedback indicates improved reading time estimate usefulness

### Stage 8: LLM-Extracted Metadata
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
*Last Updated: 14 June 2025 - Critical bug fixes and improvements planned (Stages 5-7)*  
*Status: 🔴 Critical Issues - Stages 1-2-4-4.5 Complete, Stage 5 (Bug Fixes) URGENT*  
*Next Review: After Stage 5 critical fixes*