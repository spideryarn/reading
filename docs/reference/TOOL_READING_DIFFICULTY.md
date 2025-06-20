# Reading Difficulty Assessment

AI-powered analysis of document complexity using academic-level categorisation, replacing traditional readability formulas with comprehensive LLM evaluation. Displays academic levels (High school to Post-doctoral) with interactive tooltips and collapsible assessment details.

## See also

- `docs/reference/RESEARCH_READING_DIFFICULTY_METRICS.md` - Research background and methodology comparison for AI vs traditional metrics
- `docs/reference/TOOL_METADATA_TAB.md` - Parent metadata tab containing the reading difficulty section
- `components/tools/MetadataPanel.tsx` - Implementation of reading difficulty UI components
- `app/api/reading-difficulty/route.ts` - API endpoint for AI-powered difficulty assessment
- `lib/prompts/templates/reading-difficulty.ts` - LLM prompt template and response parsing
- `docs/reference/STYLING_TOOLTIPS.md` - TooltipOrPopover implementation patterns used for academic level descriptions
- `docs/reference/STYLING_COLLAPSIBLE.md` - Collapsible component patterns for assessment factors

## Key Features

### Academic Level Classification ✅
- **Four-tier system**: High school or below → Undergraduate → Masters/PhD → Post-doctoral/expert
- **Interactive tooltips**: Hover descriptions using TooltipOrPopover with dotted underlines
- **Colour-coded badges**: Green (accessible) to orange (expert-level)

### AI-Powered Assessment ✅
- **LLM analysis**: Comprehensive evaluation of vocabulary, concepts, and domain expertise
- **Confidence reporting**: High/Medium/Low confidence levels
- **Assessment factors**: Specific rationale available via collapsible toggle
- See `docs/reference/RESEARCH_READING_DIFFICULTY_METRICS.md` for methodology details

### Clean User Interface ✅
- **Minimal design**: Key information visible, details available on demand
- **Collapsible factors**: Assessment rationale hidden by default
- **Smooth animations**: CaretDown rotation and slide-in effects

## Technical Implementation

### Core Components
- **API endpoint**: `/api/reading-difficulty` - LLM analysis with JSON output
- **UI component**: `MetadataPanel.tsx` - Academic level display with tooltips
- **Prompt template**: `reading-difficulty.ts` - Zod schema validation

### Academic Level Mappings
Four levels with colour coding and descriptions - see `getAcademicLevelColor()` and `getAcademicLevelDescription()` functions in `components/tools/MetadataPanel.tsx`.

### UI Pattern
TooltipOrPopover with dotted underlines for academic levels, collapsible CaretDown toggle for assessment factors. See styling documentation for implementation details.

## Assessment Methodology

See `docs/reference/RESEARCH_READING_DIFFICULTY_METRICS.md` for comprehensive methodology comparison.

### LLM Analysis
Evaluates vocabulary sophistication, conceptual complexity, domain expertise, and contextual assumptions. Returns academic level classification with confidence rating and specific assessment factors.

### Output Format
```json
{
  "level": "Masters/PhD",
  "confidence": "High", 
  "factors": ["Advanced theoretical concepts", "Technical terminology"]
}
```

## Recent UI Improvements ✅

- **Removed redundant content**: Eliminated "International Context" section
- **Added tooltips**: Academic level descriptions via TooltipOrPopover
- **Collapsible factors**: Assessment rationale hidden by default
- **Visual indicators**: Dotted underlines signal tooltips
- **Touch-friendly**: Mobile-compatible interactions with keyboard accessibility

## Database Storage ✅

Reading difficulty assessments are now permanently stored in the `document_enhancements` table:

### Storage Structure
```typescript
// document_enhancements table entry
{
  type: "reading_difficulty",
  subtype: "ai_assessment", 
  content: {
    level: "Masters/PhD",
    confidence: 0.85,
    factors: ["Advanced theoretical concepts...", "Technical terminology..."]
  },
  extra: {
    content_length: 15420,
    model_provider: "anthropic",
    assessment_version: "1.0"
  },
  ai_call_id: "uuid-reference-to-ai-calls-table"
}
```

### Key Benefits
- **Cost efficiency**: Eliminates repeated LLM calls for same document
- **Performance**: Instant loading from database cache
- **AI call tracking**: Full traceability via `ai_calls` table foreign key
- **User attribution**: Tracks who initiated the assessment
- **Audit trail**: Created/updated timestamps for assessment history

### Caching Logic
1. **Check database first**: `EnhancementService.get()` queries for existing assessment
2. **Use cached result**: If found, display immediately without API call
3. **Generate new assessment**: Only if no cached result exists
4. **Store result**: API saves both `ai_calls` record and `document_enhancements` entry

## Performance & Loading

- **Database caching**: Assessment results stored permanently to avoid repeated LLM calls
- **Intelligent loading**: Check cache first, generate only when needed
- **Progressive display**: Academic level shown immediately, factors on demand
- **Error handling**: Graceful degradation with retry functionality
- **Spinner states**: CircleNotch animation during API calls

## Current Limitations

- **Text requirements**: ~50+ characters, English language, text-only analysis
- **LLM dependency**: Requires API availability, 2-5 second processing time
- **Domain agnostic**: No field-specific complexity assessment
- **Response variability**: AI assessment may vary slightly between runs

## Future Enhancements 📋

- **Field-specific assessment**: STEM, humanities, business domain specialisation
- **Multi-language support**: Non-English document analysis
- **Comparative analysis**: Side-by-side difficulty comparison
- **Export functionality**: Share or download assessments

---

*Last updated: 20 June 2025*  
*Status: ✅ Core implementation complete with database storage and caching*  
*Next: Field-specific complexity assessment and multi-language support*