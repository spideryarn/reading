# Document Metadata Tab

The Document Metadata Tab provides comprehensive information about uploaded documents, including processing status, readability metrics, and document statistics. This tool gives users visibility into document context, source information, and AI processing history.

## See also

- `docs/reference/TOOL_READING_DIFFICULTY.md` - AI-powered reading difficulty assessment feature documentation
- `docs/reference/RESEARCH_READING_DIFFICULTY_METRICS.md` - Comprehensive research on readability assessment for professional documents
- `docs/reference/RESEARCH_ON_OPTIMAL_TEXT_FORMATTING.md` - Typography and reading research
- `components/tools/MetadataPanel.tsx` - Main metadata tab component implementation
- `lib/utils/readability-metrics.ts` - Readability calculation utilities (Flesch scores)
- `lib/utils/text-statistics.ts` - Text analysis utilities for word counting
- `lib/services/document-service.ts` - Database queries for document and enhancement data
- `docs/reference/TOOL_TEMPLATE_FOR_CREATING_NEW.md` - General tool development patterns
- `docs/reference/UNIFIED_LEFT_PANE_TABBED_NAVIGATION.md` - Tab system architecture and integration
- `docs/reference/DATABASE_SCHEMA.md` - Document and enhancement table structures
- `planning/250614a_document_metadata_tab_implementation.md` - Implementation planning and decisions

## Key Features

### Document Information ✅
- **Title**: Document title from database
- **Upload Date**: Creation timestamp with relative formatting
- **Source URL**: For URL-based documents (if applicable)
- **File Type**: Document format identification

### Document Statistics ✅
- **Word Count**: Calculated from extracted document text
- **Reading Time**: Research-based estimation (225 WPM baseline)

### Reading Difficulty Metrics ✅
- **Flesch-Kincaid Grade Level**: Educational level requirements with comprehensive tooltips
- **Academic Context Guidelines**: Grade 12-16 typical for scholarly content
- **Limitation Warnings**: Clear explanations of formula constraints and appropriate usage
- **Color-coded Display**: Visual indication of complexity level for professional users

### AI Processing Status ✅
- **Glossary Generation**: Shows if glossary has been created
- **AI Headings**: Indicates AI-generated heading enhancement status
- **Summary Generation**: Multi-level summary creation status

### Access & Sharing ✅
- **Privacy Status**: Public/private toggle with optimistic updates
- **Owner Information**: Document owner email address
- **Interactive Privacy Control**: Checkbox for toggling document visibility

## Technical Implementation

### Component Architecture
```typescript
// Location: components/tools/MetadataPanel.tsx
interface MetadataPanelProps {
  document: Document
  documentContent: string
  user: User
  onDocumentUpdate: (updates: Partial<Document>) => Promise<void>
  // Enhancement status flags
  glossaryGenerated: boolean
  aiHeadingsGenerated: boolean
  summaryGenerated: boolean
}
```

### Data Sources
- **Document metadata**: `documents` table fields
- **Processing status**: `document_enhancements` table queries
- **Readability metrics**: Calculated on-demand from document content
- **Statistics**: Real-time calculation from extracted text

### Navigation Integration
- **Tab Position**: 8th position in unified left pane
- **Icon**: Tag icon (Phosphor Icons, duotone weight)
- **Keyboard Shortcut**: Cmd/Ctrl+8
- **Tooltip**: "Metadata" in vertical navigation

## Readability Calculations

### Flesch Reading Ease Formula
```
206.835 - (1.015 × ASL) - (84.6 × ASW)
```
Where:
- ASL = Average Sentence Length (words per sentence)
- ASW = Average Syllable count per Word

### Score Interpretations
- **90-100**: Very Easy (5th grade) - Green badge
- **80-89**: Easy (6th grade) - Blue badge  
- **70-79**: Fairly Easy (7th grade) - Blue badge
- **60-69**: Standard (8th-9th grade) - Yellow badge
- **50-59**: Fairly Difficult (10th-12th grade) - Orange badge
- **30-49**: Difficult (College level) - Red badge
- **0-29**: Very Difficult (Graduate level) - Red badge

### Flesch-Kincaid Grade Level Formula
```
(0.39 × ASL) + (11.8 × ASW) - 15.59
```

## Privacy Controls

### Optimistic Update Pattern
```typescript
const handlePrivacyToggle = async (newValue: boolean) => {
  // Immediate UI update
  setOptimisticPrivacy(newValue)
  setIsUpdating(true)
  
  try {
    // Database update
    await onDocumentUpdate({ is_public: newValue })
  } catch (error) {
    // Revert on failure
    setOptimisticPrivacy(!newValue)
    setError('Failed to update privacy setting')
  } finally {
    setIsUpdating(false)
  }
}
```

### Visual Feedback
- **Loading State**: Disabled checkbox with spinner
- **Success State**: Immediate visual update
- **Error State**: User-friendly error messages with retry option
- **Visual Indicators**: Lock/unlock emoji indicators

## Component Hierarchy

Data flow through component tree:
```
page.tsx (document data + enhancement flags)
  ↓
DocumentPageClient (props threading)
  ↓
ResizableDocumentLayout (layout management)
  ↓
UnifiedLeftPane (tab system)
  ↓
MetadataPanel (final implementation)
```

## Visual Design

### Card-Based Layout ✅
- White background with subtle shadows
- Rounded corners and border styling
- Gradient icon backgrounds for visual hierarchy

### Section Organization
1. **Document Information**: Title, date, source details
2. **Document Statistics**: Word count and reading time
3. **Reading Difficulty**: Readability scores with visual indicators
4. **Processing Status**: AI enhancement generation status
5. **Access & Sharing**: Privacy controls and ownership

### Colour Coding
- **Status Badges**: Green (complete), yellow (pending), red (failed)
- **Readability Scores**: Traffic light system (green → red)
- **Interactive Elements**: Hover states and smooth transitions

## Performance Considerations

### Calculation Efficiency
- **Memoized Readability**: Expensive calculations cached per document
- **Debounced Updates**: Privacy toggle updates debounced to prevent spam
- **Lightweight Statistics**: Word counting optimized for large documents

### Data Loading
- **Enhancement Status**: Single query for all enhancement types
- **Real-time Metrics**: Calculated from already-loaded document content
- **No Additional API Calls**: Uses existing document data

## Current Limitations

### Static Data Sources
- Most metadata is read-only from existing database fields
- Limited editing capabilities (only privacy toggle)
- No custom metadata fields or user annotations

### Missing Features 📋
- **LLM-Extracted Metadata**: Author, publication date, publisher identification
- **Enhanced Reading Time**: Complexity-adjusted calculations with detailed tooltips
- **Export Functionality**: Metadata export in JSON/CSV formats
- **Bulk Operations**: Privacy settings across multiple documents

## Future Enhancements

### Stage 7: Enhanced Reading Time Calculation 📋
- Research-backed 238 WPM baseline (Brysbaert 2019)
- Flesch Reading Ease adjustments (0.8× to 1.6× multipliers)
- Grade Level complexity factors
- Detailed calculation tooltips

### Stage 8: LLM-Extracted Metadata 📋
- AI-powered author and publication date extraction
- Publisher and document type identification
- Key topics and themes analysis
- Structured metadata storage in database

### Advanced Features 📋
- Custom metadata fields and user annotations
- Metadata-based document filtering and search
- Citation manager integration
- Bulk metadata editing across document collections

## Troubleshooting

### Processing Status Issues
**Problem**: Status shows "Not generated" despite existing data
**Solution**: Verify `document_enhancements` table queries are working
**Check**: `DocumentService.getEnhancementFlags()` method accuracy

### Privacy Toggle Not Working
**Problem**: Checkbox doesn't update document privacy
**Solution**: Ensure `onDocumentUpdate` prop is properly threaded through component hierarchy
**Check**: Network requests in browser dev tools

### Readability Calculations Incorrect
**Problem**: Unexpected readability scores
**Solution**: Verify text preprocessing removes HTML and formatting
**Check**: `lib/utils/text-statistics.ts` word boundary detection

### Performance Issues
**Problem**: Slow metadata panel loading
**Solution**: Check for unnecessary re-calculations and missing memoization
**Check**: React DevTools profiler for component render frequency

## Testing

### Unit Tests
- **Readability Calculations**: Comprehensive test suite in `lib/utils/__tests__/`
- **Component Rendering**: React Testing Library tests for UI components
- **Privacy Toggle**: Mock Supabase client for update operations

### Integration Tests
- **Enhancement Status**: Real database queries with test data
- **Cross-component Communication**: Props threading validation
- **Error Handling**: Network failure and recovery scenarios

---

*Last updated: 17 June 2025*  
*Status: ✅ Core implementation complete (Stages 1-2-4-4.5-5-6)*  
*Next: Enhanced reading time calculation and LLM metadata extraction*