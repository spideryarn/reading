# Content Fidelity Testing Framework

This document describes the comprehensive testing framework for validating HTML content extraction fidelity in the Spideryarn Reading application. The framework ensures that URL-based document extraction preserves content accurately without modification, abridgment, or loss.

## Overview

The content fidelity testing framework addresses the critical challenge of ensuring that AI-powered HTML content extraction maintains the integrity of academic and complex documents. It provides:

- **Realistic test documents** with complex edge cases
- **Automated fidelity validation** comparing original vs extracted content
- **Detailed quality metrics** and scoring
- **Visual analysis tools** for content comparison
- **Actionable recommendations** for improving extraction quality

## Key Components

### 1. Test Document Generator (`lib/testing/html-content-fidelity-generator.ts`)

Generates realistic HTML documents that mirror real-world complexity:

```typescript
import { generateAllTestDocuments } from '@/lib/testing/html-content-fidelity-generator'

const testDocuments = generateAllTestDocuments()
// Returns array of TestDocument objects with:
// - originalHtml: Complex source HTML
// - expectedContentChecks: Validation criteria
// - complexityMetrics: Document analysis metadata
```

**Available Test Documents:**
- **Academic Paper with Math**: Research paper with mathematical equations, tables, citations, and code blocks
- **News Article with Complex Layout**: Multi-column article with data tables, quotes, and sidebar content
- More generators can be added for specific edge cases

### 2. Content Fidelity Test Suite (`app/api/__tests__/extract-url-content-fidelity.test.ts`)

Comprehensive Jest test suite that validates extraction quality:

```bash
npm test -- extract-url-content-fidelity
```

**Test Categories:**
- **AI Transcription Fidelity**: Tests content preservation using AI extraction
- **Readability Extraction Fidelity**: Tests Mozilla Readability extraction quality
- **Cross-Method Consistency**: Compares results between extraction methods

**Validation Checks:**
- Exact text preservation for critical content
- Element count preservation (tables, figures, citations)
- Attribute value integrity (data attributes, IDs)
- Mathematical equation preservation
- Structural hierarchy maintenance
- Data accuracy for numerical content

### 3. Content Analysis Tool (`scripts/analyze-content-fidelity.ts`)

Command-line tool for detailed content analysis and reporting:

```bash
# Analyze all test documents and generate report
npm run analyze-fidelity test-documents

# Generate JSON report
npm run analyze-fidelity test-documents --output ./fidelity-report.json

# Generate Markdown report
npm run analyze-fidelity test-documents --output ./fidelity-report.md --format markdown
```

## Usage Examples

### Running Basic Fidelity Tests

```bash
# Run all content fidelity tests
npm test -- extract-url-content-fidelity

# Run with verbose output to see detailed check results
npm test -- extract-url-content-fidelity --verbose
```

### Generating Comprehensive Analysis

```bash
# Analyze test documents and output detailed report
npm run analyze-fidelity test-documents --output ./reports/fidelity-analysis.json

# View quick summary in terminal
npm run analyze-fidelity test-documents
```

### Creating Custom Test Documents

```typescript
import { generateAcademicPaperWithMath, type TestDocument } from '@/lib/testing/html-content-fidelity-generator'

// Generate a specific test document
const academicPaper = generateAcademicPaperWithMath()

// Create custom validation checks
const customChecks: ContentCheck[] = [
  {
    type: 'exact_text',
    expectedValue: 'Quantum Error Correction',
    description: 'Main title must be preserved',
    critical: true
  },
  {
    type: 'element_count',
    selector: 'math[data-equation-id]',
    expectedValue: 3,
    description: 'All equations must be preserved',
    critical: true
  }
]
```

## Content Check Types

The framework supports multiple types of content validation:

### 1. Exact Text Checks
Verify that specific text strings are preserved exactly:
```typescript
{
  type: 'exact_text',
  expectedValue: 'DOI: 10.1038/quantum.2024.15673',
  description: 'Metadata like DOI must be preserved exactly',
  critical: true
}
```

### 2. Element Count Checks
Ensure structural elements are preserved:
```typescript
{
  type: 'element_count',
  selector: 'table[data-table-id] tbody tr',
  expectedValue: 4,
  description: 'All table rows must be preserved',
  critical: true
}
```

### 3. Attribute Value Checks
Validate that element attributes maintain their values:
```typescript
{
  type: 'attribute_value',
  selector: 'cite[data-ref="shor1995"]',
  expectedValue: 'shor1995',
  description: 'Citation references must maintain data attributes',
  critical: true
}
```

### 4. Mathematical Equation Checks
Verify mathematical notation preservation:
```typescript
{
  type: 'mathematical_equation',
  expectedValue: 'detected',
  description: 'Mathematical equations must be preserved',
  critical: true
}
```

### 5. Data Integrity Checks
Ensure numerical data accuracy:
```typescript
{
  type: 'data_integrity',
  expectedValue: 'preserved',
  description: 'Numerical data must maintain precision',
  critical: true
}
```

## Quality Metrics

The framework calculates comprehensive quality scores:

### Overall Quality Score (0-100)
Weighted combination of all quality factors:
- **Content Preservation (40%)**: Text similarity between original and extracted
- **Structural Integrity (20%)**: HTML element structure preservation
- **Data Accuracy (30%)**: Success rate of content checks
- **Content Ratio (10%)**: Appropriate content length ratio

### Individual Metrics
- **Content Preservation**: Percentage of original text preserved
- **Structural Integrity**: HTML structure similarity score
- **Data Accuracy**: Percentage of critical checks passing
- **Content Ratio**: Extracted content length / original content length

## Interpreting Results

### Quality Score Interpretation
- **90-100**: Excellent extraction quality
- **80-89**: Good quality with minor issues
- **70-79**: Acceptable quality, some improvements needed
- **60-69**: Poor quality, significant issues present
- **Below 60**: Unacceptable quality, major problems

### Common Issues and Solutions

#### Low Content Preservation (< 80%)
**Symptoms**: Missing paragraphs, incomplete sections
**Solutions**: 
- Review AI prompt instructions for content preservation
- Check if main content area detection is accurate
- Verify that important sections aren't being classified as peripheral

#### Poor Structural Integrity (< 70%)
**Symptoms**: Tables broken, lists malformed, hierarchical structure lost
**Solutions**:
- Improve HTML element preservation in prompts
- Review sanitization rules to ensure academic elements are preserved
- Check for proper handling of complex markup

#### Critical Check Failures
**Symptoms**: Mathematical equations missing, data tables corrupted, citations broken
**Solutions**:
- Add specific instructions for preserving academic content types
- Review element selectors and ensure they match the content structure
- Test with simpler content to isolate the issue

#### Content Ratio Issues
**Too Low (< 0.5)**: Missing content sections
- Check for overly aggressive filtering
- Verify main content area detection

**Too High (> 1.5)**: Including peripheral content
- Improve filtering for navigation, ads, and sidebar content
- Review what constitutes "main content" vs "peripheral content"

## Adding New Test Documents

To create new test documents for specific edge cases:

1. **Create Generator Function**:
```typescript
export function generateMySpecialDocument(): TestDocument {
  const originalHtml = `<!DOCTYPE html>...` // Your test HTML
  
  const expectedContentChecks: ContentCheck[] = [
    // Define validation criteria
  ]
  
  return {
    id: 'my-special-document',
    name: 'My Special Document Type',
    description: 'Tests specific edge case behavior',
    originalHtml,
    expectedContentChecks,
    complexityMetrics: calculateMetrics(originalHtml)
  }
}
```

2. **Add to Generator**:
```typescript
export function generateAllTestDocuments(): TestDocument[] {
  return [
    generateAcademicPaperWithMath(),
    generateNewsArticleWithComplexLayout(),
    generateMySpecialDocument(), // Add your new generator
  ]
}
```

3. **Test Your Document**:
```bash
npm test -- extract-url-content-fidelity
npm run analyze-fidelity test-documents
```

## Continuous Integration

The content fidelity tests can be integrated into CI/CD pipelines:

```yaml
# .github/workflows/content-fidelity.yml
name: Content Fidelity Tests
on: [push, pull_request]

jobs:
  fidelity-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run content fidelity tests
        run: npm test -- extract-url-content-fidelity
      - name: Generate fidelity report
        run: npm run analyze-fidelity test-documents --output ./fidelity-report.json
      - name: Upload fidelity report
        uses: actions/upload-artifact@v3
        with:
          name: fidelity-report
          path: fidelity-report.json
```

## Best Practices

### 1. Test Document Design
- **Realistic Complexity**: Mirror real-world document complexity
- **Edge Case Coverage**: Include challenging layouts and content types
- **Academic Focus**: Prioritize academic and technical content preservation
- **Progressive Complexity**: Start simple, add complexity incrementally

### 2. Validation Strategy
- **Critical vs Non-Critical**: Distinguish between essential and nice-to-have preservation
- **Granular Checks**: Test specific elements rather than broad categories
- **Regression Prevention**: Add checks for previously discovered issues
- **Performance Awareness**: Balance thoroughness with test execution time

### 3. Quality Thresholds
- **Set Realistic Targets**: Based on actual use case requirements
- **Track Trends**: Monitor quality score changes over time
- **Prioritize Critical Failures**: Zero tolerance for critical content loss
- **Document Exceptions**: When lower scores are acceptable for specific content types

### 4. Maintenance
- **Regular Review**: Update test documents as real-world complexity evolves
- **Performance Monitoring**: Track test execution time and optimize as needed
- **Documentation**: Keep test purposes and expectations well-documented
- **Version Control**: Track changes to test documents and expected outcomes

## Troubleshooting

### Common Test Failures

#### "Element count mismatch"
- Check if the extraction is correctly identifying content areas
- Verify that sanitization isn't removing expected elements
- Update selectors if document structure has changed

#### "Text content missing"
- Review AI prompt instructions for content preservation
- Check if content is being classified as peripheral incorrectly
- Verify text extraction logic handles edge cases

#### "Mathematical equations not preserved"
- Ensure MathML and mathematical notation are properly handled
- Check that Unicode mathematical symbols are preserved
- Review sanitization rules for mathematical content

### Performance Issues

#### Slow Test Execution
- Reduce complexity of test documents if needed
- Optimize DOM parsing and analysis logic
- Consider parallel execution for independent tests

#### Memory Usage
- Ensure proper cleanup of JSDOM instances
- Monitor for memory leaks in test execution
- Use streaming approaches for large documents

## Related Documentation

- [`docs/reference/UPLOAD.md`](./UPLOAD.md) - Overall upload system architecture
- [`docs/reference/TESTING_DATABASE.md`](./TESTING_DATABASE.md) - Database testing patterns
- [`docs/reference/WEBPAGE_HTML_CONTENT_EXTRACTION.md`](./WEBPAGE_HTML_CONTENT_EXTRACTION.md) - HTML extraction implementation
- [`docs/reference/WEBPAGE_HTML_SANITIZATION_FOR_ACADEMIC_CONTENT.md`](./WEBPAGE_HTML_SANITIZATION_FOR_ACADEMIC_CONTENT.md) - Content sanitization
- [`lib/prompts/templates/url-to-html.njk`](../../lib/prompts/templates/url-to-html.njk) - AI extraction prompt template