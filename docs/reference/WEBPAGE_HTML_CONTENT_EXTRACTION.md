# Webpage Content Extraction for Academic Papers

Comprehensive reference for extracting clean, readable content from academic publishers and long-form documents using modern TypeScript/Node.js approaches, with focus on handling JavaScript-heavy sites, paywalls, and LLM-assisted processing.

## See also

- `docs/reference/PDF_TO_HTML_CONVERSION_OVERVIEW.md` - Converting PDF academic papers to HTML format
- `docs/reference/WEBPAGE_HTML_SANITIZATION_FOR_ACADEMIC_CONTENT.md` - Comprehensive security and sanitization guide for academic HTML content
- `docs/reference/LLM_PROMPT_TEMPLATES.md` - Using Nunjucks + Zod templates for LLM content processing
- `docs/reference/ARCHITECTURE_DECISIONS.md` - Overall system architecture and data processing approach
- `lib/services/document-parser.ts` - Current HTML document parsing implementation
- `docs/reference/DATABASE_SCHEMA.md` - Document storage structure and requirements
- [Mozilla Readability GitHub](https://github.com/mozilla/readability) - Primary content extraction library
- [Postlight Parser GitHub](https://github.com/postlight/parser) - Alternative extraction library
- [Playwright Scraping Guide](https://www.zenrows.com/blog/playwright-scraping) - Modern browser automation approach (also applicable to Puppeteer)

## Principles and Key Decisions

- **Favour simplicity over perfection**: Use Mozilla Readability for 80% of cases, browser automation only when necessary
- **TypeScript-first approach**: All extraction tools must provide robust TypeScript support
- **Academic content priority**: Optimise for research papers, think tank reports, and long-form academic content
- **Accuracy over performance**: Prioritise content preservation and security over processing speed
- **Security-first approach**: All extracted HTML must be sanitized before storage or display (see `docs/reference/WEBPAGE_HTML_SANITIZATION_FOR_ACADEMIC_CONTENT.md`)
- **Privacy and ethics**: Respect robots.txt, rate limiting, and academic publisher terms of service
- **Incremental enhancement**: Start with simple extraction, add complexity only where needed

## Content Extraction Library Ecosystem (2024-2025)

### Primary Libraries ✓

**Mozilla Readability (@mozilla/readability)**
- **Status**: Most recommended for academic content ✓
- **Downloads**: 257,262 weekly (as of 2024)
- **GitHub Stars**: 9,884
- **Use Case**: Primary extraction for clean, academic content
- **Advantages**: Excellent at identifying main content, removes ads/navigation automatically
- **TypeScript Support**: Full TypeScript definitions available
- **Installation**: `npm install @mozilla/readability`

**Postlight Parser (@postlight/parser)**
- **Status**: Secondary option for complex layouts ✓
- **Downloads**: 3,391 weekly (as of 2024)
- **GitHub Stars**: 5,613
- **Use Case**: Custom parsers for specific publisher formats
- **Advantages**: Customisable parsers using CSS selectors, multiple output formats (HTML, Markdown, text)
- **TypeScript Support**: Full TypeScript support
- **Installation**: `npm install @postlight/parser`

### Supporting Libraries ✓

**html-to-text**
- **Downloads**: 3,061,907 weekly
- **Use Case**: Converting extracted HTML to plain text
- **Integration**: Works well with Readability output

**Cheerio**
- **Use Case**: HTML parsing and manipulation for custom extraction rules
- **Integration**: Ideal for pre-processing HTML before Readability

## Browser Automation for JavaScript-Heavy Sites

### When Browser Automation is Required

Academic publishers increasingly use JavaScript for:
- Dynamic content loading (infinite scroll, lazy loading)
- Paywall enforcement and subscription verification  
- Anti-bot detection and CAPTCHA systems
- Single Page Application (SPA) architectures
- Cookie consent and privacy warnings

### Puppeteer vs Playwright (2024 Analysis)

**Puppeteer (Recommended) ✓**
- **Browser Support**: Chromium only
- **Performance**: Fastest for Chrome-specific scraping
- **Language Support**: JavaScript/TypeScript only
- **Use Case**: When targeting Chrome-optimised publisher sites
- **Installation**: `npm install puppeteer`

**Playwright**
- **Multi-browser**: Chromium, Firefox, WebKit support
- **Performance**: Faster in most scenarios (2024 benchmarks)
- **Language Support**: TypeScript, JavaScript, Python, Java, C#
- **Academic Use**: Better for cross-publisher compatibility

### Browser Automation Implementation Pattern

```typescript
import puppeteer from 'puppeteer';
// Alternative: import { chromium } from 'playwright';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

async function extractWithBrowser(url: string) {
  const browser = await puppeteer.launch({ headless: true });
  // Alternative: const browser = await chromium.launch({ headless: true });
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

## Academic Publisher-Specific Challenges

### Major Publishers and Common Patterns

**IEEE Xplore**
- **Format**: Heavy JavaScript, PDF embedded viewers
- **Challenge**: Content often in PDF iframe, requires special handling
- **Approach**: Target abstract and metadata, use PDF extraction for full text

**ACM Digital Library**
- **Format**: Clean HTML with semantic markup
- **Challenge**: Paywall detection, subscription verification
- **Approach**: Readability works well for abstracts and available content

**JSTOR**
- **Format**: Multi-page articles with navigation
- **Challenge**: Content split across multiple pages
- **Approach**: Pagination detection and concatenation required

**Springer/Elsevier**
- **Format**: Modern SPA architecture
- **Challenge**: Heavy JavaScript loading, dynamic content
- **Approach**: Browser automation required for full content

### Common Publisher Anti-Bot Patterns

1. **Rate Limiting**: Aggressive throttling for automated requests
2. **CAPTCHA Systems**: Triggered by unusual browsing patterns
3. **IP Blocking**: Institution-based access restrictions
4. **JavaScript Challenges**: Computational challenges to verify browser execution
5. **Behavioural Analysis**: Mouse movement and interaction pattern detection

### Handling Strategies

```typescript
// Rate limiting and respectful scraping
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
  
  // Implement delay and retry logic
  await new Promise(resolve => setTimeout(resolve, delay));
  
  // Add random user agent rotation
  const userAgents = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  ];
  
  return extractWithBrowser(url);
}
```

## Security and Content Sanitization

### Critical Security Requirements

**XSS Prevention**: All extracted HTML content must be sanitized before storage or display to prevent Cross-Site Scripting attacks. The current system has vulnerabilities using `dangerouslySetInnerHTML` with unsanitized external content.

**Academic Content Preservation**: Sanitization must preserve complex academic formatting while removing security threats:
- **Mathematical notation** (MathML, LaTeX-rendered HTML)
- **Complex table structures** (data tables with colspan/rowspan)
- **Scientific figures and captions** with publisher-specific markup
- **Citation formatting and cross-references**
- **Multi-column layouts** and academic typography

**Implementation**: See `docs/reference/WEBPAGE_HTML_SANITIZATION_FOR_ACADEMIC_CONTENT.md` for comprehensive security guidance including DOMPurify configuration, CSP headers, and academic content preservation strategies.

### Raw HTML Storage Strategy

**Storage-First Approach**: Following the PDF storage pattern, store original HTML before any processing:

```typescript
// Storage workflow for academic content accuracy
export async function processAcademicHTML(url: string, htmlContent: string) {
  // 1. Store raw HTML immediately (preserves original for re-processing)
  const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
  const filename = generateSafeFilename(url);
  
  // 2. Extract content using chosen method
  const extractedContent = await extractContent(htmlContent, method);
  
  // 3. Sanitize for security BEFORE storage (storage-time sanitization)
  const sanitizedContent = sanitizeAcademicContent(extractedContent);
  
  // 4. Store sanitized content in database with raw original in storage
  return await documentService.createWithStorage(
    userId, 
    { ...documentData, html_content: sanitizedContent }, // Sanitized content in DB
    htmlBlob,  // Raw original in Supabase Storage
    filename, 
    metadata
  );
}
```

**Benefits**:
- **Re-processing capability**: Can improve extraction methods later using raw originals
- **Debugging support**: Original source available for analysis
- **Consistency**: Same storage pattern as PDF documents
- **Security**: Storage-time sanitization ensures all database content is pre-sanitized and safe for display
- **Performance**: No sanitization overhead on page loads

## LLM-Assisted Content Extraction and Cleaning

### Current State (2024-2025)

LLM-assisted content extraction has emerged as a powerful complement to traditional parsing methods:

**Key Developments**:
- **Unified Processing**: 2024 introduced models like GOT that treat all document elements (text, formulas, tables) as unified objects
- **Multi-Modal Capabilities**: Claude 3.5 Sonnet (June 2024) significantly improved text extraction from images and complex layouts
- **RAG Integration**: GraphRAG and ColBERT/ColPali became standard for document processing workflows

### LLM Content Cleaning Strategies

**1. Post-Extraction Cleaning**
```typescript
async function llmCleanContent(rawContent: string, prompt: string) {
  // Use existing LLM prompt template system
  const cleaningPrompt = `
    Clean and structure this academic content:
    - Remove navigation elements and advertisements
    - Preserve academic citations and references
    - Maintain section headings and structure
    - Extract key entities and terminology
    - CRITICAL: Maintain all mathematical notation and complex tables
    
    Content: ${rawContent}
  `;
  
  // Integration with existing lib/services/llm-provider.ts
  return await callLLM(cleaningPrompt);
}
```

**2. Content Structure Detection**
- **Academic Section Identification**: Abstract, Introduction, Methods, Results, Discussion, References
- **Citation Extraction**: Identify and structure bibliographic references
- **Figure and Table Captions**: Extract and associate with content
- **Footnote Processing**: Handle academic footnotes and endnotes

**3. Entity and Terminology Extraction**
- Integration with existing `TOOL_GLOSSARY.md` approach
- Author name standardisation
- Institution and affiliation extraction
- Technical term identification and definition

### Cost and Performance Considerations

**LLM Processing Costs (Claude Sonnet 4)**:
- Input: ~$15 per million tokens
- Output: ~$75 per million tokens
- **Typical Academic Paper**: 10,000-50,000 tokens = $0.15-$0.75 per paper

**Accuracy-First Optimisation Strategies**:
1. **Quality over speed**: Use Claude Sonnet 4 for maximum academic content preservation
2. **Comprehensive processing**: Process full documents rather than chunking when accuracy is critical
3. **Redundant validation**: Multiple extraction methods for important content
4. **Careful sanitization**: Academic-specific DOMPurify configuration to preserve formatting

## Implementation Architecture Recommendations

### Current State Integration

**Spideryarn Reading Architecture**:
- **Database**: Supabase with JSONB document storage
- **Frontend**: Next.js with TypeScript
- **AI**: Anthropic Claude models via API routes
- **Processing**: Frontend-driven queue with API calls

### Current Implementation (2025-06-08)

**Spideryarn Reading URL Extraction** (`app/api/extract-url/route.ts`):
- **Method Selection**: User chooses between Mozilla Readability, AI Transcription, or AI DOM Manipulation (not implemented)
- **No Automatic Fallbacks**: When selected method fails, returns structured error with suggested alternative rather than automatically falling back
- **Error Handling**: Comprehensive error messages with specific guidance for different failure scenarios
- **Document Integration**: Auto-saves extracted content as full document with slug-based routing
- **Performance**: Mozilla Readability ~100-400ms vs AI Transcription ~30+ seconds

**Implementation Files**:
- `app/api/extract-url/route.ts` - Main extraction API endpoint
- `lib/utils/readability-extractor.ts` - Mozilla Readability integration
- `lib/prompts/templates/url-to-html.njk` - AI transcription prompt template
- `app/upload/page.tsx` - Unified document addition interface
- `lib/config.ts` - URL extraction configuration and error messages

**Current Capabilities**:
- ✅ Mozilla Readability extraction (fast, reliable for standard articles)
- ✅ AI Transcription via Claude/Gemini (high quality, slow, expensive)  
- ✅ Size limits (500KB) with clear error handling
- ✅ JavaScript detection and appropriate error responses
- ✅ Structured error responses for method failures
- ⏸️ AI DOM Manipulation (placeholder, returns not implemented error)

### Recommended Architecture Pattern

```typescript
// app/api/extract-webpage/route.ts
export async function POST(request: Request) {
  const { url, options } = await request.json();
  
  try {
    // 1. Attempt simple extraction first
    const simpleResult = await simpleExtraction(url);
    
    // 2. Check extraction quality
    if (isHighQuality(simpleResult)) {
      return NextResponse.json({ content: simpleResult, method: 'simple' });
    }
    
    // 3. Fall back to browser automation
    const browserResult = await browserExtraction(url);
    
    // 4. Apply LLM cleaning if needed
    const finalResult = options.llmCleaning 
      ? await llmCleanContent(browserResult)
      : browserResult;
    
    return NextResponse.json({ 
      content: finalResult, 
      method: 'browser+llm',
      cost: calculateProcessingCost(finalResult)
    });
    
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### Quality Assessment Metrics

**Automated Quality Indicators**:
- **Content Length**: Academic papers typically 3,000+ words
- **Citation Count**: Presence of academic citations
- **Section Structure**: Standard academic paper sections detected
- **Link Density**: Low ratio of links to content (indicates clean extraction)
- **Boilerplate Detection**: Absence of navigation, ads, cookie notices

### Storage and Caching Strategy

**Document Processing Pipeline**:
1. **Raw HTML Storage**: Original source HTML stored in Supabase Storage before any processing
2. **Content Extraction**: Multiple extraction attempts (Readability, AI) with quality scores
3. **Storage-Time HTML Sanitization**: All extracted HTML sanitized using DOMPurify with academic content preservation BEFORE database storage (see `docs/reference/WEBPAGE_HTML_SANITIZATION_FOR_ACADEMIC_CONTENT.md`)
4. **Database Storage**: Pre-sanitized content stored in `html_content` field for safe, fast display
5. **Upload Metadata Tracking**: Extraction method, provider, processing time, content sizes stored in documents.upload_metadata JSONB field
6. **AI Call Linking**: Full traceability via documents.upload_ai_call_id foreign key to ai_calls table
7. **LLM Enhancements**: AI-generated summaries, glossaries, headings

## Performance and Cost Analysis

### Processing Time Benchmarks (2024)

**Mozilla Readability**: 50-200ms per document
**Postlight Parser**: 100-300ms per document  
**Puppeteer/Playwright Extraction**: 2-5 seconds per document
**LLM Processing**: 10-30 seconds per document (depending on length)

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

**Queue Management**:
```typescript
// Integration with existing mutation context approach
interface ExtractionJob {
  id: string;
  url: string;
  priority: 'low' | 'medium' | 'high';
  tier: 1 | 2 | 3;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

// Process jobs based on tier and priority
async function processExtractionQueue() {
  // High-priority academic papers get tier 3 processing
  // Background research gets tier 1/2 processing
}
```

## Academic Publisher Legal and Ethical Guidelines

### Terms of Service Compliance

**Key Considerations**:
- **robots.txt Respect**: Always check and follow robots.txt directives
- **Rate Limiting**: Implement respectful delays between requests
- **Attribution**: Maintain source attribution and citation information
- **Fair Use**: Academic research typically qualifies for fair use exceptions

### Data Protection and Privacy

**GDPR Compliance**:
- **Data Minimisation**: Extract only necessary academic content
- **Storage Limitation**: Implement retention policies for extracted content
- **Lawful Basis**: Research and academic purposes provide lawful basis

### Best Practices for Academic Use

1. **Institutional Access**: Leverage institutional subscriptions when available
2. **Open Access Priority**: Prioritise open access sources and repositories
3. **Citation Preservation**: Maintain complete bibliographic information
4. **Version Control**: Track source document versions and update dates

## Troubleshooting Common Issues

### JavaScript Loading Problems

**Symptoms**: Incomplete content, missing sections
**Solutions**:
- Increase wait timeouts for network idle
- Wait for specific content selectors
- Handle lazy loading with scroll simulation

### Paywall Detection

**Symptoms**: Truncated content, subscription prompts
**Solutions**:
- Check content length and quality metrics
- Implement paywall detection patterns
- Fall back to abstract/metadata extraction

### Anti-Bot Detection

**Symptoms**: CAPTCHA pages, IP blocking, empty responses
**Solutions**:
- Rotate user agents and IP addresses
- Implement realistic browsing delays
- Use residential proxy services for academic research

### Content Quality Issues

**Symptoms**: Excessive navigation, poor structure
**Solutions**:
- Adjust Readability configuration parameters
- Implement custom cleaning rules for specific publishers
- Apply LLM post-processing for structure detection

## Planned Future Enhancements 📋

### Multi-Document Processing
- **Batch Extraction**: Process multiple papers from conference proceedings
- **Cross-Reference Analysis**: Link related papers and citations
- **Author Disambiguation**: Standardise author names across papers

### Advanced LLM Integration
- **Real-Time Processing**: Streaming LLM analysis for large documents
- **Custom Academic Models**: Fine-tuned models for specific academic domains
- **Multilingual Support**: Extract content from non-English academic papers

### Publisher-Specific Optimisations
- **Template Recognition**: Automatic detection of publisher content templates
- **API Integration**: Direct integration with publisher APIs where available
- **Subscription Management**: Handle institutional access credentials

## References and External Resources

### Academic Research Papers (2024)
- [Document Parsing Unveiled: Techniques, Challenges, and Prospects](https://arxiv.org/html/2410.21169v2) - Comprehensive 2024 review of document processing approaches
- [An Empirical Comparison of Web Content Extraction Algorithms](https://dl.acm.org/doi/10.1145/3539618.3591920) - 2024 SIGIR evaluation of extraction methods
- [Garbage in, garbage out: HTML text extractors and NLP performance](https://ieeexplore.ieee.org/document/10214756) - Impact of extraction quality on downstream NLP

### Library Documentation
- [Mozilla Readability API Reference](https://github.com/mozilla/readability) - Complete API documentation and examples
- [Postlight Parser Documentation](https://github.com/postlight/parser) - Usage examples and custom parser creation
- [Playwright Web Scraping Guide](https://www.zenrows.com/blog/playwright-scraping) - Comprehensive tutorial for browser automation (concepts apply to Puppeteer as well)

### Market Analysis and Trends
- [Intelligent Document Processing Statistics 2025](https://scoop.market.us/intelligent-document-processing-statistics/) - Market growth and technology trends
- [Open Access Journal Publishing Market Report 2024-2028](https://www.businesswire.com/news/home/20240930025150/en/) - Academic publishing industry analysis

### Technical Implementation Resources
- [TypeScript Web Scraping Tutorial 2025](https://www.zenrows.com/blog/web-scraping-typescript) - Step-by-step TypeScript scraping guide
- [LLM Research Papers: The 2024 List](https://magazine.sebastianraschka.com/p/llm-research-papers-the-2024-list) - Latest LLM developments for content processing
- [Puppeteer vs Playwright 2024 Comparison](https://www.browserstack.com/guide/playwright-vs-puppeteer) - Detailed technical comparison

### Legal and Ethical Guidelines  
- [Web Scraping for Research: Legal and Ethical Considerations](https://arxiv.org/html/2410.23432v1) - Academic perspective on scraping ethics
- [Academic Publisher Guidelines on AI Usage](https://pmc.ncbi.nlm.nih.gov/articles/PMC10844801/) - AI tools in academic research and publishing