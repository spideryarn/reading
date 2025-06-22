# LLM-Based PDF to HTML Conversion Approaches

A comprehensive guide to AI and Large Language Model approaches for converting PDFs to HTML, with focus on 2025 model capabilities and academic document processing.

## See Also

- `docs/reference/PDF_TO_HTML_CONVERSION_OVERVIEW.md` - Complete overview and architectural decisions
- `docs/reference/PDF_TO_HTML_OPEN_SOURCE.md` - Open source libraries and tools
- `docs/reference/PDF_TO_HTML_PAID_SERVICES.md` - Commercial API services
- `docs/reference/LLM_PROMPT_TEMPLATES.md` - Implementation guidance for LLM calls using Nunjucks + Zod templates
- `docs/reference/ARCHITECTURE_DECISIONS.md` - Overall architectural decisions and LLM integration approach

## Current State-of-the-Art (2025 Models)

### Primary Recommendation: Claude 4 Sonnet

**🥇 Latest Performance Benchmarks (2025)**:

**SWE-bench Performance (Software Engineering Reasoning)**:
- **Claude 4 Sonnet**: 72.7% accuracy (80.2% with parallel test-time compute) [[source]](https://www.anthropic.com/research/swe-bench-sonnet)
- **Claude 3.7 Sonnet**: 62.3% accuracy (70.3% with parallel compute)
- **Performance Gap**: 9.5 percentage points improvement in structured reasoning

**SWE-bench Methodology**: Tests model ability to complete real-world software engineering tasks, specifically resolving GitHub issues from popular open-source Python repositories. Each solution is graded against real unit tests, demonstrating superior planning capabilities essential for complex document processing.

**Academic Document Processing Strengths**:
- **Structured Content**: "The model decides which commands to run and files to edit in a single session" - demonstrates superior planning for complex documents
- **Reduced Hallucination**: 65% less likely to engage in shortcut behavior than Sonnet 3.7 on agentic tasks
- **Context Window**: 200k tokens (sufficient for most academic papers)
- **Table Extraction**: Historical Claude strength in "accurately extracted all information, even the most complicated parts of the chart" [[source]](https://www.pragnakalp.com/comparing-qa-performance-of-phi-3-chatgpt-gemini-and-claude-on-text-tables-and-graphs/)

**Implementation Example**:
```typescript
const claudeTranscription = await claudeCall({
  model: "claude-4-sonnet",
  messages: [{
    role: "user", 
    content: [{
      type: "image",
      source: { type: "base64", data: pngPage }
    }, {
      type: "text",
      text: "Convert this academic paper page to HTML. Use structured reasoning: 1) Identify document elements, 2) Preserve table structure, 3) Maintain reading order, 4) Mark figure placeholders with coordinates."
    }]
  }]
});
```

### Alternative: Gemini 2.5 Pro for Large Documents

**🧮 Academic Reasoning Benchmarks (2025)**:
- **GPQA Diamond**: 84.0% on graduate-level physics, chemistry, biology questions [[source]](https://blog.google/technology/google-deepmind/gemini-model-thinking-updates-march-2025/)
- **AIME 2025**: 86.7% on advanced mathematics competition problems
- **AIME 2024**: 92.0% for comparison baseline

**GPQA Methodology**: Contains 198 graduate-level questions across biology, physics, and chemistry designed to be "Google-proof" – requiring deep domain knowledge rather than simple information retrieval.

**Technical Advantages for Academic Content**:
- **Massive Context**: 1M tokens (expanding to 2M) - "can handle entire codebases or long documents" [[source]](https://composio.dev/blog/gemini-2-5-pro-vs-claude-3-7-sonnet-coding-comparison/)
- **Native Multimodal**: Only model with true text+image+audio processing
- **Built-in Reasoning**: Thinking model capable of reasoning through thoughts before responding
- **Cost Efficiency**: $1.25/M input tokens vs Claude 4's $3/M tokens (3x cheaper)
- **Mathematical Content**: 86.7% AIME 2025 performance ideal for STEM papers

**Implementation Example**:
```typescript
const geminiTranscription = await geminiCall({
  model: "gemini-2.5-pro",
  messages: [{
    role: "user",
    content: [{
      type: "image_url",
      image_url: { url: `data:image/png;base64,${pngPage}` }
    }, {
      type: "text",
      text: "Think through this academic paper page step by step. Extract mathematical equations, scientific notation, and complex tables accurately. Convert to HTML while preserving academic formatting."
    }]
  }]
});
```

## Model Specialization Analysis

### When to Use Each Model

**Claude 4 Sonnet Excels At**:
- **Complex Document Structure**: Superior performance on software engineering tasks translates to structured academic content
- **Planning and Execution**: "Minimal scaffolding" approach shows strong autonomous reasoning
- **Table Extraction**: Proven strength in complex chart and table processing
- **Premium Quality**: When accuracy is more important than cost

**Gemini 2.5 Pro Excels At**:
- **Mathematical Content**: 86.7% AIME 2025 performance ideal for STEM papers
- **Long Documents**: 1M+ token context for processing entire papers
- **Cost-Sensitive Applications**: 3x cheaper than Claude 4
- **Scientific Reasoning**: 84% GPQA Diamond for graduate-level scientific content

**Model Selection Logic**:
```typescript
// Route based on document characteristics
const modelChoice = {
  longDocument: documentLength > 100000 ? "gemini-2.5-pro" : "claude-4-sonnet",
  mathHeavy: hasMathContent ? "gemini-2.5-pro" : "claude-4-sonnet",
  costOptimized: prioritizeCost ? "gemini-2.5-pro" : "claude-4-sonnet",
  complexTables: hasComplexTables ? "claude-4-sonnet" : "gemini-2.5-pro"
};
```

## Multi-Step Processing Pipeline

### Academic Research Evidence

**Multi-step LLM Pipeline Performance**:
- **ChatExtract Method**: Achieves precision and recall both close to 90% for academic data extraction [[source]](https://www.nature.com/articles/s41467-024-45914-8)
- **Layout Preservation**: 20% improvement compared to raw OCR outputs when using layout-aware processing [[source]](https://scfbm.biomedcentral.com/articles/10.1186/1751-0473-7-7)
- **Structured Information Extraction**: "Advanced conversational LLM can fully automate very accurate data extraction with minimal initial effort" [[source]](https://www.nature.com/articles/s41467-024-45914-8)

### Step 1: Model Selection Pipeline

```typescript
interface DocumentAnalysis {
  pageCount: number;
  mathContent: boolean;
  tableComplexity: 'simple' | 'moderate' | 'complex';
  figureCount: number;
  language: string;
}

function selectOptimalModel(analysis: DocumentAnalysis): LLMProvider {
  if (analysis.pageCount > 50) return 'gemini-2.5-pro'; // Large context
  if (analysis.mathContent) return 'gemini-2.5-pro'; // Math expertise
  if (analysis.tableComplexity === 'complex') return 'claude-4-sonnet'; // Table extraction
  
  return 'claude-4-sonnet'; // Default to highest quality
}
```

### Step 2: Content Transcription with Model-Specific Prompting

**Claude 4 Optimized Prompting**:
```typescript
const claudePrompt = `
You are an expert academic document analyst. Process this page systematically:

1. DOCUMENT STRUCTURE ANALYSIS:
   - Identify headers, subheaders, and section breaks
   - Detect multi-column layouts and reading order
   - Locate footnotes and references

2. CONTENT EXTRACTION:
   - Preserve exact table structures with proper HTML table tags
   - Maintain paragraph breaks and text formatting
   - Extract figure captions and associate with placeholders

3. QUALITY ASSURANCE:
   - Verify reading order makes logical sense
   - Check table cell alignment and structure
   - Ensure no content is missed or duplicated

Convert to clean HTML with semantic structure.
`;
```

**Gemini 2.5 Pro Optimized Prompting**:
```typescript
const geminiPrompt = `
Think step by step about this academic document page:

REASONING PHASE:
- What type of content is this? (research paper, textbook, technical manual)
- Are there mathematical equations or scientific notation?
- What's the layout structure? (single/multi-column, figures, tables)

EXTRACTION PHASE:
- Convert mathematical notation to appropriate HTML/MathML
- Preserve scientific symbols and formatting precisely
- Handle complex tables with merged cells and scientific data

OUTPUT PHASE:
- Generate clean, semantic HTML
- Include proper mathematical markup
- Maintain academic formatting standards

Process systematically with your enhanced reasoning capabilities.
`;
```

### Step 3: Quality Validation Pipeline

```typescript
const qualityValidation = async (extractedHTML: string, originalImage: string) => {
  const validationPrompt = `
  Review this HTML extraction against the original page image:
  
  VALIDATION CHECKLIST:
  - Are all text blocks present and in correct order?
  - Are table structures accurate with proper cell alignment?
  - Are mathematical expressions correctly formatted?
  - Are figure placeholders positioned appropriately?
  - Is the semantic HTML structure logical and accessible?
  
  Rate confidence: HIGH/MEDIUM/LOW
  List any issues found.
  Suggest improvements if confidence < HIGH.
  `;
  
  return await claudeCall({
    model: "claude-4-sonnet", // Use Claude for validation
    messages: [/* validation prompt */]
  });
};
```

## Advanced Processing Techniques

### Figure and Chart Bounding Box Detection

**Current State and Limitations (2025)**:

**❌ GPT-4 Vision Limitations**:
- **Accuracy Issues**: "GPT-4V struggled with object localization out of the box when it was released; still, the model struggles" [[source]](https://blog.roboflow.com/gpt-4v-object-detection/)
- **Production Readiness**: "The coordinates are not strong enough to use in production use cases"
- **Fine-tuning Required**: "Object detection is a task that the base GPT-4o model finds challenging without fine-tuning"

**❌ Claude 4 Vision Limitations**:
- **No Native Support**: "OpenAI's GPT-4o and Anthropic's Claude 3 and Claude 3.5 models can't do bounding box detection (yet)" [[source]](https://simonwillison.net/2024/Aug/26/gemini-bounding-box-visualization/)

**✅ Gemini Pro/2.5 Pro Advantages**:
- **Native Coordinate Support**: "Google's Gemini model has been trained to provide coordinates as relative widths or heights in range [0,1], scaled by 1000"
- **Coordinate System**: "Effectively, the coordinates given are for a 1000x1000 version of the original image"
- **Academic Reasoning**: With 84% GPQA Diamond performance, ideal for understanding scientific figures

**Gemini Coordinate Detection Implementation**:
```typescript
const figureDetection = await geminiCall({
  model: "gemini-2.5-pro",
  messages: [{
    role: "user",
    content: [{
      type: "image_url",
      image_url: { url: `data:image/png;base64,${pngPage}` }
    }, {
      type: "text",
      text: "Use your thinking capabilities to analyze this academic paper. Detect all figures, charts, tables, and equations. Return precise bounding box coordinates in format: [y_min, x_min, y_max, x_max] normalized to 1000x1000. Think step by step about each visual element."
    }]
  }]
});

// Convert to actual image dimensions
const actualCoords = geminiCoords.map(coord => 
  coord.map(val => (val / 1000) * actualImageDimension)
);
```

### Hybrid Pipeline Approaches

**Option 1: VILA-Inspired Processing**
```typescript
// Step 1: Layout analysis with Claude 4
const layoutStructure = await claudeCall({
  model: "claude-4-sonnet",
  prompt: "Analyze document structure: 1) Text blocks, 2) Figures/charts, 3) Tables, 4) Equations. Describe as percentage-based regions."
});

// Step 2: Precise coordinates with Gemini
const preciseCoords = await geminiCall({
  model: "gemini-2.5-pro", 
  prompt: `Based on layout analysis: ${layoutStructure}, provide precise coordinates.`
});
```

**Option 2: Academic-Optimized Approximate Detection**
```typescript
const academicFigureDetection = await claudeCall({
  model: "claude-4-sonnet",
  prompt: `
  Identify academic figures systematically:
  1) Graphs/charts with axes and data points
  2) Diagrams with scientific notation  
  3) Tables with structured data
  4) Mathematical equations
  
  For each, estimate location as: 'Figure X: top-left at (X%, Y%), dimensions (W%, H%)'
  `
});
```

## Cost and Performance Analysis

### Token Usage and Pricing (2025)

**Cost Comparison**:
| Model | Input Cost | Output Cost | Speed | Academic Focus |
|-------|------------|-------------|-------|----------------|
| Claude 4 Sonnet | $3.00/M | $15.00/M | 81 tokens/sec | Excellent |
| Gemini 2.5 Pro | $1.25/M | $5.00/M | 250 tokens/sec | Excellent |
| GPT-4o | $2.50/M | $10.00/M | 120 tokens/sec | Good |

**Processing Cost Estimates**:
- **High-resolution images**: ~1,000-2,000 tokens per page
- **Claude 4 cost**: ~$0.10-0.20 per page
- **Gemini 2.5 cost**: ~$0.04-0.08 per page
- **Total pipeline**: 15-20 seconds per page processing time

### Performance Optimization Strategies

**Batch Processing**:
```typescript
const batchProcessor = async (pages: Buffer[]) => {
  const batchSize = 5; // Within 200k token limit
  const batches = chunk(pages, batchSize);
  
  return Promise.all(
    batches.map(batch => processBatch(batch))
  );
};
```

**Model Routing for Cost Optimization**:
```typescript
const costOptimizedRouting = {
  textHeavy: "gemini-2.5-pro", // 3x cheaper
  complexTables: "claude-4-sonnet", // Higher accuracy
  mathContent: "gemini-2.5-pro", // Better math performance
  qualityCheck: "claude-4-sonnet" // Final validation
};
```

**Caching and Optimization**:
```typescript
// 15-minute cache for repeated processing
const processingCache = new Map();
const cacheKey = `${pdfHash}-${modelConfig}`;

if (processingCache.has(cacheKey)) {
  return processingCache.get(cacheKey);
}
```

## Integration with Spideryarn Architecture

### Mutation System Integration

```typescript
// lib/services/pdf-converter.ts
export async function convertPdfToHtmlLLM(pdfBuffer: Buffer): Promise<DocumentMutation> {
  const pages = await pdfToPng(pdfBuffer, { viewportScale: 2.0 });
  
  const htmlPages = await Promise.all(
    pages.map(page => intelligentTranscription(page.buffer))
  );
  
  return {
    type: 'pdf-import-llm',
    forward: () => combinePagesIntoDocument(htmlPages),
    reverse: () => null, // PDF imports are not reversible
    metadata: { 
      sourceType: 'pdf',
      processingMethod: 'llm-vision',
      pageCount: pages.length,
      model: selectedModel,
      confidenceScore: averageConfidence
    }
  };
}
```

**See Also**: `docs/reference/MUTATIONS_DOCUMENT_CONTENT_REVERSIBLE_TRANSFORMS.md` for complete mutation system documentation

### AI Call Tracking Integration

```typescript
// Upload metadata tracking
const uploadMetadata = {
  extractionMethod: 'llm-vision',
  provider: selectedModel,
  processingTime: endTime - startTime,
  tokenUsage: {
    input: inputTokens,
    output: outputTokens,
    cost: calculateCost(inputTokens, outputTokens, selectedModel)
  },
  confidenceScores: pageConfidenceScores,
  fallbacksUsed: fallbackMethods
};

await DocumentService.createWithStorage({
  content: extractedHTML,
  uploadMetadata,
  uploadAiCallId: aiCallRecord.id
});
```

## Current Limitations and Future Work

### Known LLM Processing Challenges

**1. Mathematical and Scientific Notation**:
- Complex equations require specialized handling
- LaTeX processing needs post-processing validation
- Scientific diagrams not optimally understood by general models

**2. Cost and Performance Trade-offs**:
- High-resolution processing: $0.10-0.20 per page
- Speed constraints: 15-20 seconds per page
- Token usage: Large images consume significant context

**3. Bounding Box Accuracy**:
- Current models achieve ~85-90% accuracy for figure detection
- Production readiness varies by model and use case
- Requires validation pipeline for critical applications

### Planned Enhancements

**1. Hybrid Processing Pipeline**:
```typescript
const hybridApproach = {
  textExtraction: "pdf-parse for raw content (~$0.01/page)",
  visionEnhancement: "LLM for layout/figures only (~$0.05/page)",
  costReduction: "80% cost reduction vs pure vision"
};
```

**2. Specialized Model Integration**:
- **Academic-Specific Models**: Domain-trained processors for scientific literature
- **TableGPT2**: Enhanced table processing capabilities
- **Next-gen Models**: Monitor LayoutLMv4 and specialized vision models

**3. Quality Assurance Pipeline**:
```typescript
const qualityPipeline = {
  confidenceScoring: "LLM self-assessment of extraction accuracy",
  humanReview: "Flag low-confidence extractions for manual review",
  benchmarkTracking: "Monitor accuracy against ground truth datasets"
};
```

## Appendix: Parallel Processing Strategies for Token Optimization

### The Output Token Challenge

When processing multi-page academic PDFs with LLMs, output token limits pose a significant constraint. A typical 20-page academic paper can generate 60,000+ output tokens when processed as a single document, approaching or exceeding model limits while incurring substantial costs ($0.90+ at Claude 4's $15/M output token rate).

Parallel processing strategies address this by:
1. **Distributing output across multiple calls** - Each page generates ~2,000-3,000 tokens instead of 60,000+
2. **Enabling true parallelization** - 10x speed improvement through concurrent processing
3. **Providing fault tolerance** - Individual page failures don't compromise the entire document
4. **Avoiding token limits** - No single call risks hitting output token ceilings

### Option A: Simple Concatenation

**Description**: Process each page independently, then concatenate results with basic cleanup.

```typescript
const simpleParallelProcessing = async (pdfBuffer: Buffer) => {
  // Step 1: Convert PDF to images
  const images = await convertPdfToBase64Image(pdfBuffer)
  
  // Step 2: Process pages in parallel
  const pageHtmls = await Promise.all(
    images.map(img => processPageToHtml(img))
  )
  
  // Step 3: Basic concatenation with cleanup
  return pageHtmls
    .map(html => removePageNumbers(removeHeaders(removeFooters(html))))
    .join('\n<!-- Page Break -->\n')
}
```

**Advantages**:
- Simplest implementation
- Minimal additional processing
- Predictable behavior

**Disadvantages**:
- No handling of split content (paragraphs, tables, words)
- Duplicate headers/footers remain
- Poor document flow preservation

**Best for**: Simple documents with clear page boundaries, presentations, or documents where page integrity is important.

### Option B: LLM-Assisted Unification (Flawed)

**Description**: Use LLM to merge all pages into unified output.

**Why this doesn't work**: This approach asks the LLM to output the entire document again, defeating the purpose of parallel processing and reintroducing the output token problem we're trying to solve.

### Option C: LLM-Generated Merge Instructions

**Description**: Use LLM to analyze page boundaries and generate merge instructions, not merged content.

```typescript
interface MergeInstructions {
  splitType: 'word' | 'sentence' | 'paragraph' | 'table' | 'none'
  trimEndChars?: number
  trimStartChars?: number
  hyphenatedWord?: { first: string, second: string }
  continuationMarkers?: string[]
}

const generateMergeInstructions = async (
  page1End: string, 
  page2Start: string
): Promise<MergeInstructions> => {
  const response = await llm({
    prompt: `Analyze these page boundaries:
      Page 1 ends with: "${page1End.slice(-200)}"
      Page 2 starts with: "${page2Start.slice(0, 200)}"
      
      Return JSON merge instructions only:
      {
        "splitType": "word|sentence|paragraph|table|none",
        "trimEndChars": 0,
        "trimStartChars": 0,
        "hyphenatedWord": null or {"first": "pre", "second": "fix"},
        "continuationMarkers": ["Table 1 (continued)", etc]
      }
    `,
    maxTokens: 200 // Minimal output
  })
  
  return JSON.parse(response)
}

const mergeWithInstructions = async (pages: string[]) => {
  const merged = [pages[0]]
  
  for (let i = 1; i < pages.length; i++) {
    const instructions = await generateMergeInstructions(
      pages[i-1], 
      pages[i]
    )
    
    const processedPage = applyMergeInstructions(
      pages[i], 
      instructions
    )
    merged.push(processedPage)
  }
  
  return merged.join('\n')
}
```

**Advantages**:
- Intelligent boundary detection
- Structured, parseable instructions
- Small LLM output (200 tokens vs 3000)

**Disadvantages**:
- Requires robust JSON parsing/validation
- Additional LLM calls add latency
- Complex instruction application logic

**Token economics** (20-page document):
- Page processing: 2,000 × 20 = 40,000 tokens
- Merge instructions: 200 × 19 = 3,800 tokens
- Total: 43,800 tokens (27% reduction)

### Option D: Rule-Based Unification with Selective LLM Assistance (Recommended)

**Description**: Use pattern matching for most boundaries, invoke LLM only for complex cases.

**Detailed Implementation**:

```typescript
interface PageContent {
  html: string
  metadata: {
    endsWithHyphen: boolean
    endsWithCompleteSentence: boolean
    hasOpenTable: boolean
    hasOpenEquation: boolean
    lastParagraph: string
    firstParagraph: string
    pageNumber?: number
  }
}

const analyzePageBoundary = (page: string): PageContent['metadata'] => {
  const lines = page.split('\n')
  const lastLine = lines[lines.length - 1].trim()
  const text = page.replace(/<[^>]*>/g, '') // Strip HTML
  
  return {
    endsWithHyphen: /-\s*$/.test(lastLine),
    endsWithCompleteSentence: /[.!?]["']?\s*$/.test(text),
    hasOpenTable: /<table[^>]*>/.test(page) && !/<\/table>/.test(page),
    hasOpenEquation: /\\begin\{/.test(page) && !/\\end\{/.test(page),
    lastParagraph: text.slice(-500),
    firstParagraph: text.slice(0, 500),
    pageNumber: extractPageNumber(page)
  }
}

const smartUnification = async (pages: PageContent[]): Promise<string> => {
  const unified: string[] = []
  const headerFooterPatterns = detectCommonHeadersFooters(pages)
  
  for (let i = 0; i < pages.length; i++) {
    let processedContent = pages[i].html
    
    // Remove common headers/footers
    processedContent = removePatterns(processedContent, headerFooterPatterns)
    
    if (i === 0) {
      unified.push(processedContent)
      continue
    }
    
    const prevMeta = pages[i-1].metadata
    const currMeta = pages[i].metadata
    
    // Determine if boundary needs special handling
    const needsComplexMerge = 
      prevMeta.endsWithHyphen ||
      !prevMeta.endsWithCompleteSentence ||
      prevMeta.hasOpenTable ||
      prevMeta.hasOpenEquation ||
      detectSplitParagraph(prevMeta.lastParagraph, currMeta.firstParagraph)
    
    if (needsComplexMerge) {
      // Use LLM only for complex boundaries
      const boundaryAnalysis = await analyzeBoundaryWithLLM(
        prevMeta.lastParagraph,
        currMeta.firstParagraph,
        {
          hyphenated: prevMeta.endsWithHyphen,
          openTable: prevMeta.hasOpenTable,
          openEquation: prevMeta.hasOpenEquation
        }
      )
      
      processedContent = applyBoundaryFix(processedContent, boundaryAnalysis)
    }
    
    unified.push(processedContent)
  }
  
  return postProcessUnifiedDocument(unified.join('\n'))
}

// Boundary analysis with minimal LLM output
const analyzeBoundaryWithLLM = async (
  endText: string,
  startText: string,
  hints: BoundaryHints
): Promise<BoundaryFix> => {
  const prompt = `Analyze this page boundary in an academic paper:

Previous page ends: "${endText}"
Next page starts: "${startText}"

Context hints:
- Ends with hyphen: ${hints.hyphenated}
- Has open table: ${hints.openTable}
- Has open equation: ${hints.openEquation}

Return ONLY:
{
  "action": "merge_word|merge_sentence|merge_paragraph|continue_table|clean_break",
  "trimChars": 0,
  "joinText": " " or "-" or ""
}

Maximum 100 tokens.`

  const response = await llm({ prompt, maxTokens: 100 })
  return JSON.parse(response)
}

// Pattern-based detection functions
const detectSplitParagraph = (endText: string, startText: string): boolean => {
  // Check for incomplete citation
  if (/\[[^\]]*$/.test(endText) && /^[^\[]*\]/.test(startText)) return true
  
  // Check for incomplete parenthetical
  if (/\([^)]*$/.test(endText) && /^[^(]*\)/.test(startText)) return true
  
  // Check for lowercase start (likely continuation)
  if (/[a-z]/.test(startText.trim()[0])) return true
  
  // Check for continuing lists
  if (/[,;]\s*$/.test(endText) && /^[a-z]/.test(startText.trim())) return true
  
  return false
}

// Common header/footer detection
const detectCommonHeadersFooters = (pages: PageContent[]): RegExp[] => {
  const patterns: RegExp[] = []
  
  // Page numbers
  patterns.push(/^\s*\d+\s*$/) // Simple number
  patterns.push(/^\s*[-–—]\s*\d+\s*[-–—]\s*$/) // Formatted number
  patterns.push(/^Page\s+\d+\s*(of\s+\d+)?$/i) // "Page X of Y"
  
  // Journal headers (detected from repetition)
  const repeatedTexts = findRepeatedAcrossPages(pages, 0.8) // 80% threshold
  repeatedTexts.forEach(text => {
    if (text.length < 200) { // Headers are typically short
      patterns.push(new RegExp(escapeRegex(text)))
    }
  })
  
  return patterns
}
```

**Advanced Features**:

1. **Header/Footer Detection Algorithm**:
```typescript
const findRepeatedAcrossPages = (
  pages: PageContent[], 
  threshold: number
): string[] => {
  const candidates = new Map<string, number>()
  
  pages.forEach(page => {
    // Extract potential headers/footers (first and last 5 lines)
    const lines = page.html.split('\n')
    const headerCandidates = lines.slice(0, 5)
    const footerCandidates = lines.slice(-5)
    
    [...headerCandidates, ...footerCandidates].forEach(line => {
      const cleaned = line.trim().replace(/<[^>]*>/g, '')
      if (cleaned.length > 10 && cleaned.length < 200) {
        candidates.set(cleaned, (candidates.get(cleaned) || 0) + 1)
      }
    })
  })
  
  // Return texts that appear in >threshold% of pages
  const minOccurrences = Math.floor(pages.length * threshold)
  return Array.from(candidates.entries())
    .filter(([_, count]) => count >= minOccurrences)
    .map(([text, _]) => text)
}
```

2. **Table Continuation Handling**:
```typescript
const handleTableContinuation = (
  prevPage: string, 
  currPage: string
): string => {
  // Check for table continuation markers
  const continuationMarkers = [
    /Table\s+\d+\s*\(continued\)/i,
    /\(continued from previous page\)/i,
    /^\s*\(cont\.\)/i
  ]
  
  let processedCurrent = currPage
  
  // Remove continuation markers
  continuationMarkers.forEach(marker => {
    processedCurrent = processedCurrent.replace(marker, '')
  })
  
  // If previous page has unclosed table, merge intelligently
  if (/<table[^>]*>/.test(prevPage) && !/<\/table>/.test(prevPage)) {
    // Remove duplicate table headers if present
    const tableHeaderMatch = prevPage.match(/<thead>[\s\S]*?<\/thead>/)
    if (tableHeaderMatch) {
      processedCurrent = processedCurrent.replace(tableHeaderMatch[0], '')
    }
  }
  
  return processedCurrent
}
```

3. **Mathematical Content Preservation**:
```typescript
const preserveMathematicalContinuity = (boundary: BoundaryAnalysis): string => {
  // Handle split equations
  if (boundary.openEquation) {
    return boundary.content.replace(/^\s*\\end\{equation\}/, '')
  }
  
  // Handle inline math across pages
  if (boundary.content.match(/^\s*\$[^$]+\$/)) {
    return ' ' + boundary.content // Add space before inline math
  }
  
  return boundary.content
}
```

**Advantages**:
- Optimal balance of speed and quality
- Minimal LLM usage (only complex boundaries)
- Robust pattern-based handling for common cases
- Graceful degradation

**Disadvantages**:
- More complex implementation
- Requires tuning patterns for specific document types
- May miss edge cases

**Token economics** (20-page document):
- Page processing: 2,000 × 20 = 40,000 tokens
- Complex boundaries (30% of pages): 100 × 6 = 600 tokens
- Total: 40,600 tokens (32% reduction)
- Speed improvement: 10x through parallelization

### Option E: Overlapping Processing Windows

**Description**: Process pages with overlap to catch split content.

```typescript
const overlapProcessing = async (pdfImages: string[]): Promise<string[]> => {
  const results: string[] = []
  const overlapPercent = 0.1 // 10% overlap
  
  for (let i = 0; i < pdfImages.length; i++) {
    if (i === 0) {
      // First page: normal processing
      results.push(await processPage(pdfImages[i]))
    } else {
      // Create composite image with overlap
      const compositeImage = await createOverlapImage(
        pdfImages[i-1], 
        pdfImages[i],
        overlapPercent
      )
      
      const overlappedResult = await processWithOverlapContext(
        compositeImage,
        {
          instruction: `Process this academic paper content.
            The top ${overlapPercent*100}% is from the previous page for context.
            Extract ONLY the content from the main page (bottom ${100-overlapPercent*100}%).
            Handle any split content appropriately.`
        }
      )
      
      results.push(overlappedResult)
    }
  }
  
  return results
}
```

**Advantages**:
- LLM sees split content in context
- Natural handling of continuations
- No post-processing needed

**Disadvantages**:
- 10% increase in processing cost
- Complex image composition
- Potential confusion about what to extract

### Implementation Recommendations

**For Academic Papers (20+ pages)**: Option D provides the best balance of quality, cost, and speed. The combination of pattern matching for simple cases and selective LLM assistance for complex boundaries minimizes token usage while maintaining document integrity.

**Key implementation considerations**:
1. **Parallel processing architecture**: Use worker pools or Promise.all() for true parallelization
2. **Error handling**: Implement page-level retry logic without failing entire document
3. **Progress tracking**: Stream results as pages complete for better UX
4. **Caching**: Cache processed pages to handle retries efficiently
5. **Quality assurance**: Sample boundary merges for validation

**Expected improvements**:
- **Cost reduction**: 30-50% lower token costs
- **Speed increase**: 10x faster through parallelization
- **Reliability**: Individual page failures don't cascade
- **Scalability**: Works for documents of any length

## References and Sources

### 2025 Model Benchmarks
- [Claude 4 SWE-bench Performance](https://www.anthropic.com/research/swe-bench-sonnet) - 72.7% accuracy on real GitHub issues
- [Gemini 2.5 Pro Academic Benchmarks](https://blog.google/technology/google-deepmind/gemini-model-thinking-updates-march-2025/) - 84% GPQA Diamond, 86.7% AIME 2025
- [Model Speed Comparison](https://dev.to/tephani/gpt-45-vs-claude-37-sonnet-vs-gemini-20-flash-a-no-nonsense-guide-28ae) - Token/sec performance analysis

### Academic Research Applications
- [ChatExtract: LLM Materials Extraction](https://www.nature.com/articles/s41467-024-45914-8) - 90% precision/recall methodology
- [Layout-aware PDF Processing](https://scfbm.biomedcentral.com/articles/10.1186/1751-0473-7-7) - 20% improvement with LLM enhancement
- [Q&A Performance on Tables](https://www.pragnakalp.com/comparing-qa-performance-of-phi-3-chatgpt-gemini-and-claude-on-text-tables-and-graphs/) - 60-80% accuracy for complex charts

### Vision Model Capabilities
- [Gemini Bounding Box Support](https://simonwillison.net/2024/Aug/26/gemini-bounding-box-visualization/) - Native coordinate detection
- [GPT-4V Object Detection Analysis](https://blog.roboflow.com/gpt-4v-object-detection/) - Production readiness assessment
- [LocateBench: Spatial Reasoning](https://arxiv.org/html/2410.19808v1) - LLM spatial accuracy evaluation

### PDF Processing Research
- [Layout-aware Text Extraction](https://scfbm.biomedcentral.com/articles/10.1186/1751-0473-7-7) - Academic paper boundary detection challenges
- [PDF Hell and Practical RAG](https://unstract.com/blog/pdf-hell-and-practical-rag-applications/) - Real-world PDF processing challenges
- [Multi-page Table Handling](https://www.llamaindex.ai/blog/mastering-pdfs-extracting-sections-headings-paragraphs-and-tables-with-cutting-edge-parser-faea18870125) - Modern approaches to complex PDF structures

---

*Last updated: January 2025*  
*Status: Comprehensive LLM approach analysis with parallel processing strategies* ✅  
*Next review: After major model updates or implementation of parallel processing*