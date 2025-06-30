# PDF Processing Evaluation Framework

## Overview

This document describes the comprehensive evaluation framework implemented for assessing PDF-to-HTML conversion quality in the Spideryarn Reading project. The framework is based on research from OmniDocBench and academic evaluation standards, providing quantitative metrics for document processing assessment.

## Framework Architecture

### Core Components

1. **Text Similarity Analysis** - Normalized Edit Distance based evaluation
2. **Structural Preservation Assessment** - HTML element preservation metrics
3. **Academic Content Quality** - Specialized metrics for academic documents
4. **Performance Evaluation** - Processing time and efficiency metrics
5. **Comprehensive Reporting** - Detailed analysis and comparison reports

### Key Files

- `lib/evaluation/pdf-evaluation-framework.ts` - Core evaluation metrics and algorithms
- `lib/evaluation/evaluation-test-suite.ts` - Test suite for comprehensive evaluation
- `lib/evaluation/__tests__/evaluation-framework.test.ts` - Unit tests for evaluation metrics
- `scripts/test-evaluation-framework.js` - Standalone evaluation runner

## Evaluation Metrics

### 1. Text Similarity (30% weight)

**Algorithm**: Normalized Edit Distance (Levenshtein)
**Threshold**: 85%
**Purpose**: Measures character-level accuracy of text extraction

```typescript
const similarity = 1 - (editDistance / maxLength)
```

**Advantages**:
- Character-level precision
- Good for exact preservation requirements
- Fast computation

**Considerations**:
- Sensitive to formatting changes
- No semantic understanding

### 2. Structural Preservation (25% weight)

**Algorithm**: HTML Element counting and preservation ratio
**Threshold**: 80%
**Purpose**: Evaluates preservation of document structure

**Elements Evaluated**:
- Headings (h1-h6)
- Tables (table, thead, tbody, tr, td, th)
- Lists (ul, ol, li)
- Semantic elements (p, div, section, article)
- Figures and captions
- Citations and quotes

```typescript
const preservationRatio = actualCount / expectedCount
const score = average(preservationRatios)
```

### 3. Academic Content Quality (35% weight)

**Algorithm**: Academic element detection and preservation
**Threshold**: 90%
**Purpose**: Specialized assessment for academic documents

**Academic Elements**:
- Citations and references
- Mathematical notation
- Figures and images
- Data tables
- Footnotes and annotations

### 4. Processing Performance (10% weight)

**Algorithm**: Time-based efficiency scoring
**Threshold**: 30 seconds
**Purpose**: Evaluates processing speed and efficiency

```typescript
const score = max(0, min(1, (threshold - timeMs) / threshold + 0.5))
```

## Test Documents

The evaluation framework uses existing PDF test files:

### Available Test Documents

1. **Academic Textbook** (`2009_Book_TheElementsOfStatisticalLearning.pdf`)
   - Category: Textbook
   - Characteristics: Complex math, figures, tables, cross-references
   - Weight: 2.0x
   - Expected processing: 2 minutes

2. **Research Paper - Full** (`2105.10461v2.pdf`)
   - Category: Academic paper
   - Characteristics: Math notation, figures, citations, references
   - Weight: 2.0x
   - Expected processing: 1 minute

3. **Research Paper - Cropped** (`2105.10461v2_cropped.pdf`)
   - Category: Academic paper
   - Characteristics: Math notation, concise content
   - Weight: 1.5x
   - Expected processing: 15 seconds

4. **Research Paper - Medium** (`2105.10461v2_cropped_longer.pdf`)
   - Category: Academic paper
   - Characteristics: Math notation, figures, medium length
   - Weight: 1.8x
   - Expected processing: 30 seconds

## Processing Methods Compared

### 1. Vision-based AI Processing (Phase 2)
- **Endpoints**: 
  - `/api/upload-pdf-single-page-image` - Processes single page images
  - `/api/finalise-vision-document` - Assembles complete document
- **Requirements**: Pre-converted page images, browser-based image cropping
- **Expected Speed**: Slow
- **Expected Quality**: High
- **Uses**: PDF.js → Images → Browser cropping → Supabase Storage → Gemini Flash → Claude Sonnet refinement

### 2. AI Transcription (v1)
- **Endpoint**: `/api/upload-pdf`
- **Requirements**: Direct PDF processing
- **Expected Speed**: Medium
- **Expected Quality**: Medium
- **Uses**: Direct Claude/Gemini PDF processing

## Usage

### Running Evaluations

```typescript
import { EvaluationRunner } from '@/lib/evaluation/evaluation-test-suite'

// Create evaluation runner
const runner = new EvaluationRunner('http://localhost:3001')

// Run full evaluation suite
const { results, report, summary } = await runner.runFullEvaluation()

console.log(`Pass rate: ${(summary.passRate * 100).toFixed(1)}%`)
console.log(`Average score: ${(summary.averageScore * 100).toFixed(1)}%`)
```

### Single Document Evaluation

```typescript
import { evaluateSingleDocument } from '@/lib/evaluation/evaluation-test-suite'

const result = await evaluateSingleDocument(
  'academic-paper-cropped',
  'vision-ai'
)
```

### Custom Evaluation

```typescript
import { evaluateProcessingQuality } from '@/lib/evaluation/pdf-evaluation-framework'

const result = evaluateProcessingQuality(
  expectedHtml,
  actualHtml,
  processingTimeMs,
  metadata,
  'custom-method'
)
```

## Configuration

### Default Thresholds

```typescript
export const DEFAULT_EVALUATION_CONFIG = {
  textSimilarityThreshold: 0.85,    // 85% text similarity required
  structuralThreshold: 0.80,        // 80% structure preservation
  academicThreshold: 0.90,          // 90% academic content preservation
  performanceThreshold: 30000,      // 30 second processing limit
  weights: {
    textSimilarity: 0.30,           // 30% weight
    structural: 0.25,               // 25% weight
    academic: 0.35,                 // 35% weight
    performance: 0.10               // 10% weight
  }
}
```

### Customizing Evaluation

You can customize thresholds and weights for specific use cases:

```typescript
const customConfig = {
  ...DEFAULT_EVALUATION_CONFIG,
  academicThreshold: 0.95,          // Stricter academic requirements
  weights: {
    textSimilarity: 0.40,
    structural: 0.20,
    academic: 0.40,                 // Higher academic weight
    performance: 0.00               // Ignore performance
  }
}

const runner = new EvaluationRunner(baseUrl, customConfig)
```

## Results Interpretation

### Overall Scores

- **90-100%**: Excellent quality, production-ready
- **80-89%**: Good quality, minor issues acceptable
- **70-79%**: Moderate quality, review needed
- **60-69%**: Poor quality, significant improvements required
- **<60%**: Unacceptable quality, major rework needed

### Pass/Fail Criteria

A document processing result passes evaluation if:
1. **All critical metrics** meet their thresholds (Text, Structural, Academic)
2. **Overall weighted score** ≥ 70%
3. **No critical failures** in academic content preservation

Performance metrics are weighted lower and don't cause failures on their own.

## Research Foundation

This framework is based on:

1. **OmniDocBench** - Multi-source benchmark for document content extraction
2. **Academic Evaluation Standards** - Research-based quality metrics
3. **Industry Best Practices** - PDF processing evaluation methodologies

### Key Research Insights

- **Multi-dimensional Assessment**: Text, structure, content, and performance
- **Academic Specialization**: Focused metrics for academic document types
- **Normalized Edit Distance**: Proven text similarity measurement
- **Weighted Scoring**: Balanced evaluation across different quality aspects

## Limitations and Future Improvements

### Current Limitations

1. **HTML Parsing Sensitivity**: Cheerio parsing may not detect all structural differences
2. **Limited Gold Standards**: Currently uses basic expected HTML structures
3. **Browser Dependencies**: Vision-AI evaluation requires browser environment
4. **Manual Curation**: Gold standard HTML requires manual creation

### Planned Improvements

1. **Enhanced Gold Standards**: Create manually curated expected outputs
2. **Browser-based Testing**: Add Playwright integration for vision-AI evaluation
3. **Semantic Analysis**: Add semantic similarity metrics beyond text matching
4. **Cost Analysis**: Include token usage and cost evaluation
5. **A/B Testing**: Statistical significance testing for method comparisons

## Integration with Existing Infrastructure

The evaluation framework integrates with:

- **Jest Testing**: Unit tests for all evaluation components
- **CI/CD Pipeline**: Automated quality assessment
- **Development Workflow**: Manual evaluation during development
- **Performance Monitoring**: Track quality metrics over time

## Related Documentation

- [`docs/reference/LLM_EVALUATION_FRAMEWORKS_FOR_CONTENT_EXTRACTION.md`](./LLM_EVALUATION_FRAMEWORKS_FOR_CONTENT_EXTRACTION.md) - Alternative evaluation approaches
- [`docs/reference/TESTING_OVERVIEW.md`](./TESTING_OVERVIEW.md) - General testing strategy
- [`planning/250627c_vision_based_pdf_processing_pipeline.md`](../planning/250627c_vision_based_pdf_processing_pipeline.md) - Vision-based processing implementation