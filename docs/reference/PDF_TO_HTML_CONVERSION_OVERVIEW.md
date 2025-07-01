# PDF to HTML Conversion Overview

A high-level guide to PDF to HTML conversion approaches for the Spideryarn Reading application, with focus on academic papers and complex document processing.

## Detailed Documentation

This overview provides architectural guidance and decision-making frameworks. For detailed implementation information, see:

- **`docs/reference/PDF_TO_HTML_OPEN_SOURCE.md`** - Open source libraries and tools (GROBID, pdf-to-png-converter, PyMuPDF evaluation)
- **`docs/reference/PDF_TO_HTML_LLM_APPROACHES.md`** - AI/LLM-based conversion methods (Claude 4, Gemini 2.5 Pro)
- **`docs/reference/PDF_TO_HTML_PAID_SERVICES.md`** - Commercial API services (Mathpix, Azure, AWS, Google)

## See Also

- `docs/reference/ARCHITECTURE_DECISIONS.md` - Overall architectural decisions and LLM integration approach
- `docs/reference/LLM_PROMPT_TEMPLATES.md` - Implementation guidance for LLM calls using Nunjucks + Zod templates
- `docs/reference/CODING_PRINCIPLES.md` - Development principles prioritising simplicity and rapid prototyping
- `README.md` - Project goals and document reading enhancement features

## Current Architecture (V2 - Direct LLM Processing)

**Active Approach**: Direct PDF processing via AI APIs, completely bypassing traditional PDF conversion libraries.

**Key Architectural Decisions**:
- **Primary Method**: Direct PDF processing with Claude 4 Sonnet and Gemini 2.5 Pro
- **Serverless Deployment**: No system dependencies, works on Vercel
- **Multi-provider Support**: Dual LLM strategy for quality vs cost optimization
- **Academic Focus**: Optimized for research papers, equations, tables, multi-column layouts
- **Storage Integration**: Original PDFs stored in Supabase Storage with metadata tracking

## Approach Comparison Framework

### Three Main Categories

**1. Open Source Libraries**
- **Current Implementation**: pdf2pic + pdf-lib for PDF processing and image conversion
- **Zero-dependency (evaluated)**: pdf-to-png-converter for serverless deployment
- **Academic-focused (evaluated)**: GROBID for scholarly document structure
- **High-quality (evaluated)**: PyMuPDF for superior image extraction (Python-only, not compatible with current stack)
- **Traditional OCR (evaluated)**: Tesseract for basic text extraction

*See: `docs/reference/PDF_TO_HTML_OPEN_SOURCE.md` for detailed analysis*

**2. LLM-Based Processing**
- **Claude 4 Sonnet**: 72.7% SWE-bench accuracy, superior structured reasoning
- **Gemini 2.5 Pro**: 84% GPQA Diamond, mathematical content, 1M+ token context
- **Multi-step pipelines**: Optimized for different model strengths
- **Cost efficiency**: $0.04-0.20 per page depending on model choice

*See: `docs/reference/PDF_TO_HTML_LLM_APPROACHES.md` for implementation details*

**3. Commercial Services**
- **Mathpix**: $0.01-0.04/page, mathematical content specialist
- **Azure Document Intelligence**: $0.001-0.01/page, enterprise features
- **AWS Textract**: $0.0015/page, high-volume processing
- **Adobe Extract**: $0.05/page, premium table extraction

*See: `docs/reference/PDF_TO_HTML_PAID_SERVICES.md` for service comparison*

## Decision-Making Framework

### Choosing the Right Approach

**For Academic Documents**:

| Criteria | Open Source | LLM-Based | Commercial |
|----------|-------------|-----------|------------|
| **Cost** | Free | $0.04-0.20/page | $0.001-0.05/page |
| **Quality** | Good-Excellent | Excellent | Good-Excellent |
| **Setup** | Simple-Complex | Simple | Simple |
| **Academic Focus** | pdf2pic: Good, GROBID: Excellent (evaluated) | Claude/Gemini: Excellent | Mathpix: Excellent (evaluated) |
| **Serverless** | pdf2pic: Yes | Yes | Yes |

**Note**: Current implementation uses pdf2pic + pdf-lib (Good quality, Simple setup, Good academic focus). Other open source options were evaluated but not implemented.

**Decision Tree**:
- **High-quality academic processing**: LLM-based (Claude 4 + Gemini 2.5 Pro) ✅ *Current Implementation*
- **Fallback processing**: pdf2pic + pdf-lib + LLM ✅ *Current Implementation*
- **Mathematical content specialist**: Mathpix or Gemini 2.5 Pro (Gemini 2.5 Pro implemented)
- **High-volume, cost-sensitive**: AWS Textract or Azure Document Intelligence (evaluated)
- **Open source, zero dependencies**: pdf-to-png-converter + LLM (evaluated)
- **Academic metadata extraction**: GROBID + enhancement pipeline (evaluated)

*See individual guides for detailed implementation and benchmarks*

## Current Implementation Status

### Spideryarn Reading V2 Architecture

**Production Approach**: Direct LLM processing with PDF → AI API → HTML pipeline

**Active Components**:
- **API Endpoints**: `/api/upload-pdf` and `/api/extract-url` 
- **LLM Integration**: Claude 4 Sonnet (primary) + Gemini 2.5 Pro (cost-optimized)
- **PDF Processing**: pdf2pic + pdf-lib for fallback image conversion
- **Storage**: Supabase Storage for original PDFs + metadata tracking
- **Prompt Templates**: Nunjucks + Zod templates in `/lib/prompts/templates/`

**Processing Flow**:
1. PDF uploaded via multipart form data (32MB limit)
2. **Primary**: Direct transmission to LLM APIs with specialized academic prompts
3. **Fallback**: PDF → pdf2pic conversion → image-based LLM processing
4. HTML extraction with metadata tracking via `upload_ai_call_id`
5. Storage in database with comprehensive upload metadata

*See: `lib/prompts/templates/pdf-to-html-direct.ts` for current implementation*

## Key Challenges and Solutions

### Known Limitations

**Bounding Box Detection**: 
- Claude 4/GPT-4: No native coordinate support
- Gemini 2.5 Pro: Native coordinates available (1000x1000 scale)
- Workaround: Approximate positioning with percentage-based descriptions

**Cost Considerations**:
- Current: $0.10-0.20 per page for high-quality processing
- Optimization: Intelligent model routing based on document characteristics
- Alternative: Hybrid pipelines combining text extraction + selective vision processing

### Current Performance

**Quality Metrics**:
- Academic paper processing: High quality for structured content
- Mathematical notation: Good with Gemini 2.5 Pro
- Table extraction: Excellent with Claude 4 Sonnet
- Figure detection: Approximate positioning, improving with Gemini coordinates

## Future Development Areas

### Planned Enhancements

**Phase 1**: Cost optimization through hybrid processing
**Phase 2**: Enhanced academic model integration (TableGPT2, specialized processors)  
**Phase 3**: Quality assurance pipeline with confidence scoring
**Phase 4**: Next-generation model adoption as available

### Research Monitoring

**Active Areas**:
- Academic-specific vision models
- Improved mathematical notation processing
- Enhanced figure detection accuracy
- Cost-effective hybrid architectures

*For detailed technical analysis, implementation guides, and benchmarks, see the specific documentation files listed at the top of this document.*

## References

### Key References and Further Reading

- [Claude 4 SWE-bench Performance](https://www.anthropic.com/research/swe-bench-sonnet) - Latest LLM benchmarks for structured reasoning
- [Gemini 2.5 Pro Academic Benchmarks](https://blog.google/technology/google-deepmind/gemini-model-thinking-updates-march-2025/) - Mathematical and scientific content processing
- [GROBID: Academic Document Processing](https://github.com/kermitt2/grobid) - Leading open source solution for scholarly documents
- [ChatExtract Research](https://www.nature.com/articles/s41467-024-45914-8) - LLM-based academic data extraction methodology

---

*Last updated: January 2025*  
*Status: Overview document with references to detailed implementation guides* ✅  
*Next review: After major model or architecture updates*
