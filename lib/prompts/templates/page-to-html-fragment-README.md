# Page-to-HTML Fragment Prompt Template

This document describes the design and implementation of the page-to-HTML fragment prompt template for vision-based PDF processing in the Spideryarn Reading project.

## Overview

The `page-to-html-fragment` template is part of a multi-stage vision-based PDF processing pipeline that converts individual PDF page images to HTML fragments. This template is specifically designed for Stage 3 of the pipeline, where each page is processed individually through Gemini Flash 2.5 for speed and cost optimization.

## Architecture

### Processing Pipeline Context

1. **Stage 1**: PDF to page images using MuPDF.js/PDF.js (being researched)
2. **Stage 2**: Batch preparation and context gathering
3. **Stage 3**: Individual page processing ← **This template**
4. **Stage 4**: Fragment assembly and refinement
5. **Stage 5**: Final refinement with Claude Sonnet 4

### Template Components

- **Schema file**: `page-to-html-fragment.ts` - TypeScript schema and configuration
- **Template file**: `page-to-html-fragment.njk` - Nunjucks prompt template
- **Test file**: `__tests__/page-to-html-fragment.test.ts` - Comprehensive test suite
- **Example file**: `page-to-html-fragment-example.ts` - Usage examples and patterns

## Key Design Decisions

### 1. Gemini Flash 2.5 Optimization

**Decision**: Default to Gemini Flash 2.5 for primary processing
**Rationale**: 
- Speed/cost optimization as specified in requirements
- Good vision capabilities for academic content
- Suitable for individual page processing workload
- Claude Sonnet 4 available as fallback option

```typescript
export function createPageToHtmlFragmentPrompt(provider: 'claude' | 'gemini' = 'gemini') {
  const modelString = provider === 'gemini' 
    ? 'google:gemini-2.5-flash:latest' 
    : 'anthropic:claude-sonnet-4:20250514'
```

### 2. HTML Fragment Output

**Decision**: Generate HTML fragments without document wrappers
**Rationale**:
- Fragments can be assembled into larger documents
- Reduces token overhead for individual pages
- Enables flexible document reconstruction
- Supports multi-page content that spans fragments

**Example Output Structure**:
```html
<!-- Page 3 -->
<div class="page-3">
  <h2>Methodology</h2>
  <p>This section describes the experimental approach...</p>
  <figure data-bbox="0.1,0.2,0.9,0.6" class="page-3-figure">
    <img alt="Experimental setup diagram" />
    <figcaption>Figure 2.1: Experimental setup...</figcaption>
  </figure>
</div>
```

### 3. Academic Content Preservation

**Decision**: Comprehensive academic content support
**Features**:
- Mathematical equations with proper HTML markup
- Tables with semantic structure
- Figures with bounding boxes and captions
- Citations and cross-references
- Hierarchical section structure
- Multi-column layout detection

**Mathematical Content Handling**:
```html
<!-- HTML entities for symbols -->
α, β, γ, δ, π, σ, μ, ×, ÷, ±, ≤, ≥, ∞

<!-- Superscripts and subscripts -->
E = mc<sup>2</sup>
H<sub>2</sub>O

<!-- Equation numbering -->
<span class="equation-number">(1.2)</span>
```

### 4. Cross-Page Coordination

**Decision**: Context-aware processing with cross-page hints
**Implementation**:
- Previous page summary for continuity
- HTML comments for spanning elements
- Page number and total page context
- Document-level context awareness

**Cross-Page Comment Examples**:
```html
<!-- continues-from-previous-page: section-title -->
<!-- continues-on-next-page: table-data -->
<!-- figure-reference: see-page-X -->
<!-- table-continues-from-previous-page -->
```

### 5. Bounding Box Extraction

**Decision**: Standardized coordinate system for images/figures
**Format**: `data-bbox="x1,y1,x2,y2"` with normalized coordinates
**Purpose**:
- Enable precise figure extraction
- Support image replacement workflows
- Facilitate layout reconstruction
- Enable visual element indexing

**Example**:
```html
<figure data-bbox="0.1,0.2,0.9,0.6" class="page-3-figure">
  <figcaption>Figure 2.1: Experimental results</figcaption>
</figure>
```

### 6. CSS Class Annotations

**Decision**: Comprehensive CSS class system for styling and navigation
**Classes**:
- Page identification: `page-N`
- Column layout: `column-left`, `column-right`
- Content types: `abstract`, `introduction`, `methodology`
- Academic elements: `citation`, `footnote`, `bibliography`

### 7. Base64 Image Input Support

**Decision**: Extended multimodal prompt system to support base64 images
**Implementation**: Added `pageImageBase64` detection in `types.ts`
**Rationale**: 
- Enables vision-based processing of page images
- Integrates with existing multimodal infrastructure
- Supports the vision-based pipeline architecture

```typescript
} else if ('pageImageBase64' in validated && typeof validated.pageImageBase64 === 'string') {
  // Handle base64-encoded page image with rendered template
  const templateContent = readFileSync(template.templatePath, 'utf-8')
  const prompt = env.renderString(templateContent, validated)
  
  messages = [{
    role: 'user',
    content: [
      {
        type: 'image',
        image: validated.pageImageBase64 as string
      },
      {
        type: 'text',
        text: prompt
      }
    ]
  }]
```

## Input Schema

### Required Fields

- `pageImageBase64: string` - Base64 encoded page image
- `pageNumber: number` - 1-indexed page number (≥1)
- `totalPages: number` - Total pages in document (≥1)

### Optional Fields

- `fileName?: string` - Original filename for context
- `previousPageSummary?: string` - Summary of previous page content
- `documentContext?: string` - Overall document context (title, authors, subject)

### Validation

- Comprehensive Zod schema validation
- Empty string rejection for required fields
- Integer validation for page numbers
- Minimum value validation (page numbers ≥ 1)

## Template Features

### 1. Context-Aware Instructions

The template provides different instructions based on page position:
- **First page**: Establish document structure, capture title/authors/abstract
- **Middle pages**: Maintain continuity, prepare for continuation
- **Final page**: Capture references, conclusions, appendices

### 2. Academic Content Guidance

Detailed instructions for:
- Mathematical equations and symbols
- Table structure and alignment
- Figure captions and cross-references
- Citation formatting
- Hierarchical section structure

### 3. Quality Standards

- **Accuracy**: Preserve exact semantic meaning
- **Completeness**: Include all substantive content
- **Structure**: Maintain logical reading order
- **Continuity**: Use comments for cross-page relationships
- **Accessibility**: Include appropriate alt text

### 4. Content Filtering

Clear guidance on what to ignore:
- Page numbers, headers, footers
- Watermarks or background elements
- Publisher logos or branding
- Navigation elements not part of main content

## Usage Examples

### Basic Usage

```typescript
import { pageToHtmlFragmentPrompt } from './page-to-html-fragment'
import { executeMultimodalPrompt } from '../types'

const htmlFragment = await executeMultimodalPrompt(pageToHtmlFragmentPrompt, {
  pageImageBase64: 'base64-encoded-image-data',
  pageNumber: 3,
  totalPages: 15,
  fileName: 'research-paper.pdf',
  documentContext: 'Machine Learning Research by Smith et al.'
})
```

### Multi-Page Processing

```typescript
import { processMultiPagePdf } from './page-to-html-fragment-example'

const pageImages = ['base64-page-1', 'base64-page-2', 'base64-page-3']
const htmlFragments = await processMultiPagePdf(
  pageImages,
  'research-paper.pdf',
  'Neural Network Architecture Study'
)
```

### Document Assembly

```typescript
import { assembleHtmlFragments } from './page-to-html-fragment-example'

const completeHtml = assembleHtmlFragments(
  htmlFragments,
  'Neural Network Study',
  {
    authors: ['Smith, J.', 'Doe, A.'],
    subject: 'Machine Learning Research',
    keywords: ['neural networks', 'deep learning', 'AI']
  }
)
```

## Testing

### Test Coverage

The template includes comprehensive tests covering:
- Schema validation (required/optional fields, validation rules)
- Template configuration (provider selection, model settings)
- Output validation (HTML fragment structure)
- Academic content requirements (cross-page context support)
- Template path resolution

### Running Tests

```bash
npm test -- lib/prompts/templates/__tests__/page-to-html-fragment.test.ts
```

All tests pass, ensuring robust validation and configuration.

## Configuration Options

### Provider Selection

```typescript
// Gemini Flash for speed/cost (default)
const geminiprompt = createPageToHtmlFragmentPrompt('gemini')

// Claude Sonnet for quality
const claudePrompt = createPageToHtmlFragmentPrompt('claude')
```

### Processing Configurations

The example file includes predefined configurations:
- **Fast**: Gemini, minimal context, batch size 10
- **Quality**: Claude, full context, batch size 5  
- **Balanced**: Gemini, full context, batch size 8

## Integration Points

### Multimodal System Integration

- Extends existing `types.ts` multimodal support
- Compatible with current prompt template patterns
- Uses established Nunjucks + Zod template system
- Follows existing model configuration patterns

### Pipeline Integration

- Designed for Stage 3 of vision-based PDF pipeline
- Outputs compatible with fragment assembly stage
- Supports both individual and batch processing
- Enables quality vs speed trade-offs

## Future Enhancements

### Potential Improvements

1. **Dynamic token allocation** based on page complexity
2. **Specialized prompts** for different document types
3. **Quality scoring** for output validation
4. **Incremental processing** with checkpoint support
5. **Multi-model consensus** for critical content

### Pipeline Extensions

1. **Preprocessing** for page image optimization
2. **Post-processing** for fragment validation
3. **Assembly optimization** with content overlap detection
4. **Refinement passes** with specialized models

## Conclusion

The page-to-html-fragment template provides a robust, academically-focused solution for vision-based PDF processing. Its design prioritizes accuracy, academic content preservation, and integration with the broader Spideryarn Reading architecture while optimizing for speed and cost through Gemini Flash 2.5.

The template's comprehensive feature set, thorough testing, and flexible configuration options make it suitable for production use in the vision-based PDF processing pipeline.