# HTML Content Processing Overview

**Status**: ✅ Active - Complete pipeline for webpage extraction, processing, and quality assurance  
**Last Updated**: 2025-06-15

## Overview

The HTML content processing system provides comprehensive extraction, sanitisation, and quality validation for academic documents from web sources. This includes content extraction from complex publisher sites, security-focused HTML processing, and manual evaluation frameworks for validating extraction quality.

## See Also

- `docs/reference/UPLOAD_DOCUMENT_PROCESSING_PIPELINE.md` - Complete document upload system including PDF and HTML processing
- `docs/reference/HTML_SANITISATION_AND_PRETTIFICATION.md` - Detailed HTML sanitisation and prettification implementation
- `docs/reference/LLM_PROMPT_TEMPLATES.md` - AI extraction prompt templates using Nunjucks + Zod
- `docs/reference/TESTING_DATABASE.md` - Database testing patterns for content processing
- `docs/reference/ARCHITECTURE_DECISIONS.md` - System architecture context for content processing decisions
- `lib/services/html-document-processor.ts` - Core HTML processing service implementation
- `app/api/extract-url/route.ts` - URL extraction API endpoint
- `lib/testing/html-content-fidelity-generator.ts` - Quality testing framework

## Key Architectural Decisions

### Processing Philosophy
- **Accuracy over performance**: Prioritise content preservation and security over processing speed
- **Academic content priority**: Optimise for research papers, think tank reports, and long-form academic content
- **Security-first approach**: All extracted HTML must be sanitised before storage or display
- **DRY principle implementation**: Shared service eliminates 150-240 lines of duplicated code across APIs
- **Graceful degradation**: Individual processing steps can fail without breaking the entire pipeline

### Technology Choices
- **Primary extraction**: Mozilla Readability for 80% of cases
- **Complex sites**: Browser automation (Puppeteer/Playwright) when necessary
- **AI enhancement**: Claude Sonnet 4 for content cleaning and structure detection
- **Storage strategy**: Raw HTML storage before processing for re-processing capability
- **Testing approach**: Manual evaluation with realistic academic content samples

## Content Extraction

### Extraction Method Selection

**Spideryarn Reading URL Extraction** (`app/api/extract-url/route.ts`):
- **User choice**: Select between Mozilla Readability, AI Transcription, or AI DOM Manipulation
- **No automatic fallbacks**: When selected method fails, returns structured error with suggested alternative
- **Error handling**: Comprehensive error messages with specific guidance for different failure scenarios
- **Performance**: Mozilla Readability ~100-400ms vs AI Transcription ~30+ seconds

### Primary Extraction Libraries ✅

**Mozilla Readability (@mozilla/readability)**
- **Status**: Most recommended for academic content
- **Use case**: Primary extraction for clean, academic content  
- **Advantages**: Excellent at identifying main content, removes ads/navigation automatically
- **TypeScript support**: Full TypeScript definitions available

**Postlight Parser (@postlight/parser)**
- **Status**: Secondary option for complex layouts
- **Use case**: Custom parsers for specific publisher formats
- **Advantages**: Customisable parsers using CSS selectors, multiple output formats

### Browser Automation for JavaScript-Heavy Sites

**When Required**:
- Dynamic content loading (infinite scroll, lazy loading)
- Paywall enforcement and subscription verification
- Anti-bot detection and CAPTCHA systems
- Single Page Application (SPA) architectures

**Implementation Pattern**:
```typescript
import puppeteer from 'puppeteer';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

async function extractWithBrowser(url: string) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Handle cookie consent and paywalls
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForSelector('article, main, .content', { timeout: 10000 });
  
  const html = await page.content();
  await browser.close();
  
  // Apply Readability to cleaned HTML
  const dom = new JSDOM(html);
  const reader = new Readability(dom.window.document);
  const article = reader.parse();
  
  return article;
}
```

### Academic Publisher Challenges

**Major Publishers and Patterns**:
- **IEEE Xplore**: Heavy JavaScript, PDF embedded viewers - target abstract/metadata
- **ACM Digital Library**: Clean HTML with semantic markup - Readability works well
- **JSTOR**: Multi-page articles requiring pagination detection and concatenation
- **Springer/Elsevier**: Modern SPA architecture requiring browser automation

**Respectful Extraction Pattern**:
```typescript
const publisherRateLimits = {
  'ieee.org': 2000, // 2 second delay
  'acm.org': 1500,
  'jstor.org': 3000,
  'springer.com': 2000,
  'elsevier.com': 2500
};

async function respectfulExtraction(url: string) {
  const domain = new URL(url).hostname;
  const delay = publisherRateLimits[domain] || 1000;
  await new Promise(resolve => setTimeout(resolve, delay));
  return extractWithBrowser(url);
}
```

### LLM-Assisted Content Extraction

**Content Cleaning Strategies**:
```typescript
async function llmCleanContent(rawContent: string) {
  const cleaningPrompt = `
    Clean and structure this academic content:
    - Remove navigation elements and advertisements
    - Preserve academic citations and references
    - Maintain section headings and structure
    - Extract key entities and terminology
    - CRITICAL: Maintain all mathematical notation and complex tables
    
    Content: ${rawContent}
  `;
  
  return await callLLM(cleaningPrompt);
}
```

**Cost Considerations (Claude Sonnet 4)**:
- Input: ~$15 per million tokens
- Output: ~$75 per million tokens
- **Typical academic paper**: 10,000-50,000 tokens = $0.15-$0.75 per paper

## Processing Pipeline

### Core Service: HTML Document Processor

The shared service (`lib/services/html-document-processor.ts`) provides unified processing for all document uploads:

```
HTML Content → Sanitisation → Prettification → Text Extraction → Document Creation → Storage
```

**Architecture Benefits**:
- **Before**: 150-240 lines of duplicated code per API
- **After**: Single implementation for all upload APIs
- **Consistency**: Uniform error handling and logging across all endpoints

### Processing Function

```typescript
export async function processHtmlToDocument(
  htmlContent: string,
  metadata: ProcessingMetadata,
  options: ProcessingOptions,
  additionalMetadata: AdditionalMetadata = {}
): Promise<ProcessedDocument>
```

### Processing Steps

**1. HTML Sanitisation and Text Extraction**:
```typescript
const { sanitisedHtml, plainText, prettifiedHtml } = await sanitizeAndExtractText(
  htmlContent,
  options.logger,
  metadata.correlationId
)
```

**2. Upload Metadata Generation**:
- Tracks extraction method, provider, content sizes
- Processing time and file size metrics
- Prettification status and model information

**3. Document Creation and Storage**:
- Stores processed content in database with metadata
- Links to AI call for full traceability
- Coordinates with Supabase for document and file storage

### Integration Examples

**PDF Upload Integration**:
```typescript
const { document, storageResult } = await processHtmlToDocument(
  htmlResult.text,
  {
    title, sourceUrl: null, isPublic, originalFile: pdfFile,
    filename: pdfFile.name, provider, correlationId, aiCallId: aiCall.id
  },
  {
    extractionMethod: 'ai-transcription', uploadSource: 'pdf',
    logger: requestLogger, userId: user.id, supabase
  },
  { 
    processing_time_ms: processingTime, 
    file_size_bytes: pdfBuffer.length, 
    model_used: modelConfig.modelId 
  }
)
```

**URL Extraction Integration**:
```typescript
const { document, storageResult } = await processHtmlToDocument(
  htmlContent,
  {
    title: cleanedTitle, sourceUrl: url, isPublic, originalFile: null,
    filename: `${slug(cleanedTitle)}.html`, provider: 'readability', correlationId, aiCallId: ''
  },
  {
    extractionMethod: 'readability', uploadSource: 'url',
    logger: requestLogger, userId: user.id, supabase
  }
)
```

## Quality Assurance

### Content Fidelity Testing Framework

**Purpose**: Manual evaluation framework for validating AI-powered content extraction quality.

**Key Features**:
- Small dataset of high-value test documents
- Manual evaluation runs (not CI/CD)
- Focus on critical content preservation
- Metrics: Levenshtein distance, structural fidelity, noise removal

### Test Document Generator

Generates realistic HTML documents mirroring real-world complexity:

```typescript
import { generateAllTestDocuments } from '@/lib/testing/html-content-fidelity-generator'

const testDocuments = generateAllTestDocuments()
// Returns array with:
// - originalHtml: Complex source HTML
// - expectedContentChecks: Validation criteria
// - complexityMetrics: Document analysis metadata
```

**Available Test Documents**:
- **Academic Paper with Math**: Research paper with equations, tables, citations, code blocks
- **News Article with Complex Layout**: Multi-column article with data tables, quotes, sidebar content

### Content Validation Types

**1. Exact Text Checks**:
```typescript
{
  type: 'exact_text',
  expectedValue: 'DOI: 10.1038/quantum.2024.15673',
  description: 'Metadata like DOI must be preserved exactly',
  critical: true
}
```

**2. Element Count Checks**:
```typescript
{
  type: 'element_count',
  selector: 'table[data-table-id] tbody tr',
  expectedValue: 4,
  description: 'All table rows must be preserved',
  critical: true
}
```

**3. Mathematical Equation Checks**:
```typescript
{
  type: 'mathematical_equation',
  expectedValue: 'detected',
  description: 'Mathematical equations must be preserved',
  critical: true
}
```

### Quality Metrics

**Overall Quality Score (0-100)**:
- **Content Preservation (40%)**: Text similarity between original and extracted
- **Structural Integrity (20%)**: HTML element structure preservation
- **Data Accuracy (30%)**: Success rate of content checks
- **Content Ratio (10%)**: Appropriate content length ratio

**Quality Score Interpretation**:
- **90-100**: Excellent extraction quality
- **80-89**: Good quality with minor issues
- **70-79**: Acceptable quality, some improvements needed
- **60-69**: Poor quality, significant issues present
- **Below 60**: Unacceptable quality, major problems

### Running Quality Tests

```bash
# Run static content fidelity test (real AI extraction)
npm test -- extract-url-content-fidelity-static

# Run simulated fidelity tests
npm test -- extract-url-content-fidelity
```

## Integration Points

### Storage and Processing Workflow

**Document Processing Pipeline**:
1. **Raw HTML Storage**: Original source HTML stored in Supabase Storage before any processing
2. **Content Extraction**: Multiple extraction attempts (Readability, AI) with quality scores
3. **Storage-Time HTML Sanitisation**: All extracted HTML sanitised using DOMPurify BEFORE database storage
4. **Database Storage**: Pre-sanitised content stored in `html_content` field for safe, fast display
5. **Upload Metadata Tracking**: Extraction method, provider, processing time stored in `documents.upload_metadata`
6. **AI Call Linking**: Full traceability via `documents.upload_ai_call_id` foreign key
7. **LLM Enhancements**: AI-generated summaries, glossaries, headings

### Core Dependencies

- `lib/utils/html-sanitizer.ts` - HTML sanitisation with DOMPurify
- `lib/utils/html-prettifier.ts` - Academic-focused HTML formatting
- `lib/utils/html-text-extraction.ts` - Clean plaintext extraction
- `lib/services/document.ts` - Document database operations
- `lib/services/logger.ts` - Structured logging utilities

### AI Features Integration

The processed HTML feeds into:
- **Summarisation**: Hierarchical summaries at multiple granularity levels
- **Glossary**: Key entity extraction from document content
- **TOC generation**: AI-generated document structure enhancement
- **Chatbot**: Document-aware conversational interface

## Security Considerations

### Critical Security Requirements

**XSS Prevention**: All extracted HTML content must be sanitised before storage or display to prevent Cross-Site Scripting attacks.

**Academic Content Preservation**: Sanitisation must preserve complex academic formatting while removing security threats:
- Mathematical notation (MathML, LaTeX-rendered HTML)
- Complex table structures (data tables with colspan/rowspan)
- Scientific figures and captions with publisher-specific markup
- Citation formatting and cross-references
- Multi-column layouts and academic typography

### Safe Processing Order

The service enforces secure processing order:
1. **Sanitisation first**: Always clean before any other processing
2. **Prettification second**: Only format sanitised content
3. **Validation**: Verify content integrity at each step

### Raw HTML Storage Strategy

**Storage-First Approach**: Following the PDF storage pattern, store original HTML before any processing:

```typescript
export async function processAcademicHTML(url: string, htmlContent: string) {
  // 1. Store raw HTML immediately (preserves original for re-processing)
  const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
  const filename = generateSafeFilename(url);
  
  // 2. Extract content using chosen method
  const extractedContent = await extractContent(htmlContent, method);
  
  // 3. Sanitise for security BEFORE storage (storage-time sanitisation)
  const sanitisedContent = sanitiseAcademicContent(extractedContent);
  
  // 4. Store sanitised content in database with raw original in storage
  return await documentService.createWithStorage(
    userId, 
    { ...documentData, html_content: sanitisedContent },
    htmlBlob,
    filename, 
    metadata
  );
}
```

**Benefits**:
- **Re-processing capability**: Can improve extraction methods later using raw originals
- **Debugging support**: Original source available for analysis
- **Consistency**: Same storage pattern as PDF documents
- **Security**: Storage-time sanitisation ensures all database content is pre-sanitised
- **Performance**: No sanitisation overhead on page loads

## Troubleshooting

### Common Extraction Issues

**JavaScript Loading Problems**:
- **Symptoms**: Incomplete content, missing sections
- **Solutions**: Increase wait timeouts, wait for specific selectors, handle lazy loading with scroll simulation

**Paywall Detection**:
- **Symptoms**: Truncated content, subscription prompts
- **Solutions**: Check content length and quality metrics, implement paywall detection patterns, fall back to abstract/metadata extraction

**Anti-Bot Detection**:
- **Symptoms**: CAPTCHA pages, IP blocking, empty responses
- **Solutions**: Rotate user agents and IP addresses, implement realistic browsing delays, use residential proxy services

**Content Quality Issues**:
- **Symptoms**: Excessive navigation, poor structure
- **Solutions**: Adjust Readability configuration parameters, implement custom cleaning rules for specific publishers, apply LLM post-processing

### Processing Pipeline Issues

**Processing fails with sanitisation error**:
- Check HTML input for malformed tags or unsupported content
- Verify DOMPurify configuration preserves required academic elements

**Prettification disabled but still processing slowly**:
- Verify `ENABLE_HTML_PRETTIFICATION=false` in environment
- Check for other processing bottlenecks

**Text extraction producing poor quality results**:
- Check HTML structure complexity
- Review extraction method selection for content type
- Consider LLM-assisted cleaning for complex layouts

### Quality Test Failures

**"Element count mismatch"**:
- Check if extraction correctly identifies content areas
- Verify sanitisation isn't removing expected elements
- Update selectors if document structure has changed

**"Text content missing"**:
- Review AI prompt instructions for content preservation
- Check if content is being classified as peripheral incorrectly
- Verify text extraction logic handles edge cases

**"Mathematical equations not preserved"**:
- Ensure MathML and mathematical notation are properly handled
- Check that Unicode mathematical symbols are preserved
- Review sanitisation rules for mathematical content

## Performance and Cost Analysis

### Processing Time Benchmarks

- **Mozilla Readability**: 50-200ms per document
- **Postlight Parser**: 100-300ms per document
- **Puppeteer/Playwright Extraction**: 2-5 seconds per document
- **LLM Processing**: 10-30 seconds per document (depending on length)

### Cost Breakdown

**Infrastructure Costs**:
- **Browser Automation**: High CPU/RAM usage, ~$0.01-0.05 per document
- **LLM Processing**: $0.15-0.75 per academic paper (Claude Sonnet)
- **Storage**: JSONB document storage ~$0.001 per document
- **CDN/Bandwidth**: Negligible for text content

**Recommended Tiered Approach**:
1. **Tier 1 - Simple Sites**: Mozilla Readability only (~$0.001 per document)
2. **Tier 2 - JavaScript Sites**: Browser automation (~$0.02 per document)
3. **Tier 3 - Complex Analysis**: Full LLM pipeline (~$0.50 per document)

### Scaling Considerations

**Concurrent Processing Limits**:
- **Browser Instances**: Maximum 5-10 concurrent (memory constraints)
- **LLM API Calls**: Rate limited by provider (Anthropic: 4,000 requests/minute)
- **Database Connections**: Supabase connection pooling considerations

## Legal and Ethical Guidelines

### Terms of Service Compliance

**Key Considerations**:
- **robots.txt Respect**: Always check and follow robots.txt directives
- **Rate Limiting**: Implement respectful delays between requests
- **Attribution**: Maintain source attribution and citation information
- **Fair Use**: Academic research typically qualifies for fair use exceptions

### Best Practices for Academic Use

1. **Institutional Access**: Leverage institutional subscriptions when available
2. **Open Access Priority**: Prioritise open access sources and repositories
3. **Citation Preservation**: Maintain complete bibliographic information
4. **Version Control**: Track source document versions and update dates

## Future Enhancements

### Planned Improvements 📋

**Multi-Document Processing**:
- Batch extraction for conference proceedings
- Cross-reference analysis linking related papers
- Author disambiguation across papers

**Advanced LLM Integration**:
- Streaming LLM analysis for large documents
- Custom academic models for specific domains
- Multilingual support for non-English papers

**Publisher-Specific Optimisations**:
- Template recognition for automatic publisher detection
- Direct API integration where available
- Subscription management for institutional access

**Processing Pipeline Enhancements**:
- Streaming processing for very large documents (>10MB)
- Caching layer for processed content
- Plugin architecture for configurable processing steps
- Performance monitoring with detailed metrics and alerting

## Academic Publisher Resources

### Research Papers (2024-2025)
- [Document Parsing Unveiled: Techniques, Challenges, and Prospects](https://arxiv.org/html/2410.21169v2) - Comprehensive 2024 review of document processing approaches
- [An Empirical Comparison of Web Content Extraction Algorithms](https://dl.acm.org/doi/10.1145/3539618.3591920) - 2024 SIGIR evaluation of extraction methods
- [Web Scraping for Research: Legal and Ethical Considerations](https://arxiv.org/html/2410.23432v1) - Academic perspective on scraping ethics

### Library Documentation
- [Mozilla Readability API Reference](https://github.com/mozilla/readability) - Complete API documentation and examples
- [Postlight Parser Documentation](https://github.com/postlight/parser) - Usage examples and custom parser creation
- [Playwright Web Scraping Guide](https://www.zenrows.com/blog/playwright-scraping) - Comprehensive browser automation tutorial