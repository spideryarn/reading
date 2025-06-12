# Open Source PDF to HTML Conversion Tools

A comprehensive guide to open source libraries and tools for converting PDFs to HTML, with focus on academic documents and serverless deployment compatibility.

## See Also

- `docs/reference/PDF_TO_HTML_CONVERSION_OVERVIEW.md` - Complete overview and architectural decisions
- `docs/reference/PDF_TO_HTML_LLM_APPROACHES.md` - AI/LLM-based conversion methods
- `docs/reference/PDF_TO_HTML_PAID_SERVICES.md` - Commercial API services
- `docs/reference/ARCHITECTURE_DECISIONS.md` - Overall architectural decisions and LLM integration approach
- `docs/reference/CODING_PRINCIPLES.md` - Development principles prioritising simplicity and rapid prototyping

## PDF to Image Conversion Libraries

### Recommended: pdf-to-png-converter

**🏆 Primary Choice for Serverless Deployment**:

```typescript
import { pdfToPng } from 'pdf-to-png-converter';

const pdfBuffer = fs.readFileSync('academic-paper.pdf');
const pngPages = await pdfToPng(pdfBuffer, {
  viewportScale: 2.0,  // Higher resolution for academic content
  outputType: 'base64'
});
```

**Key Advantages**:
- **Zero Native Dependencies**: No system-level installations required [[source]](https://www.npmjs.com/package/pdf-to-png-converter)
- **Node.js 20+ Requirement**: Latest runtime support with modern features
- **Serverless Compatible**: "Self-contained solution that doesn't require system-level installations"
- **Performance**: No external binary execution overhead
- **Academic Focus**: Ideal for high-resolution academic content processing

**Deployment Benefits**:
- **Container-Friendly**: Works in Docker without additional setup
- **Vercel Compatible**: No 50MB function size limit issues
- **CI/CD Ready**: No build-time dependency installation required

### Alternative: pdf2pic (Popular but Limited)

**❌ Production Challenges**:

```bash
# Required system dependencies
brew install graphicsmagick ghostscript  # macOS
sudo apt-get install graphicsmagick ghostscript  # Linux
```

**Issues**:
- **High Adoption**: 89,150-118,047 weekly downloads [[source]](https://libraries.io/npm/pdf2pic)
- **System Dependencies**: Requires GraphicsMagick and Ghostscript installation
- **Production Problems**: "Returns empty buffer" in Linux/CentOS environments [[source]](https://stackoverflow.com/questions/72407394/using-pdf2image-with-node-js-and-centos)
- **Docker Complexity**: "Requires third party gm binaries" for containerized deployment
- **Version Sensitivity**: Requires careful version matching across environments

### Not Recommended: pdf-img-convert

**⚠️ Limited Viability**:
- **Limited Adoption**: Only 12 projects in npm registry
- **Dependencies**: Still requires external system libraries
- **Documentation**: Less comprehensive than alternatives

## Academic Document Layout Analysis Tools

### GROBID (Machine Learning-Based)

**🔬 Production-Ready Academic PDF Processor**:

GROBID is the leading open source solution for extracting structured information from scholarly documents, with production deployments at ResearchGate, Semantic Scholar, HAL Research Archive, scite.ai, and Internet Archive Scholar.

```bash
# Docker deployment
docker run --rm -it --init -p 8070:8070 rishub/grobid:0.8.0

# Python client usage
python3 grobid-client.py --n 3 --input ~/papers --output ~/tei_papers processFulltextDocument
```

**Capabilities**:
- **Fine-Grained Structure**: 68 final labels for academic content (title, authors, affiliations, sections, references, figures)
- **Deep Learning Models**: Uses DeLFT library with RNN/transformer architectures
- **Academic Specialization**: Optimized for scientific publications and technical documents
- **XML/TEI Output**: Structured format easily convertible to HTML
- **Scale**: Successfully processes 34+ million documents at CORE archive

**Performance Metrics**:
- **Text Classification**: 95% accuracy for text block classification
- **Object Recognition**: 90% accuracy for tables and figures [[source]](https://direct.mit.edu/tacl/article/doi/10.1162/tacl_a_00466/110438/VILA-Improving-Structured-Content-Extraction-from)
- **Production Ready**: Handles millions of documents in production environments

**Demo Available**: https://huggingface.co/spaces/kermitt2/grobid

### PyMuPDF (Python-Based)

**🐍 High-Quality Python Library**:

```python
import fitz  # PyMuPDF
import io
from PIL import Image

# Extract images at high resolution
doc = fitz.open("academic-paper.pdf")
for page_num in range(len(doc)):
    page = doc[page_num]
    mat = fitz.Matrix(2.0, 2.0)  # 2x scaling for academic content
    pix = page.get_pixmap(matrix=mat)
    img_data = pix.tobytes("png")
```

**Strengths**:
- **Image Quality**: Highest quality PDF-to-image conversion available
- **Figure Extraction**: Superior handling of academic figures and diagrams
- **Text Extraction**: Built-in OCR and text extraction capabilities
- **Academic Optimized**: Excellent for scientific papers with complex layouts

**Limitations**:
- **Python Only**: Not available for Node.js/TypeScript projects
- **Integration Complexity**: Requires Python runtime alongside Node.js

## Traditional OCR Libraries

### Tesseract (OCR Engine)

**📖 Open Source OCR Foundation**:

```bash
# Installation
sudo apt-get install tesseract-ocr
brew install tesseract

# Node.js wrapper
npm install node-tesseract-ocr
```

**Use Cases**:
- **Fallback OCR**: When LLM processing is unavailable or too expensive
- **Batch Processing**: High-volume document processing
- **Language Support**: 100+ languages supported
- **Academic Content**: Reasonable performance on text-heavy documents

**Limitations**:
- **Layout Preservation**: Poor handling of complex academic layouts
- **Figure Recognition**: No understanding of charts, graphs, or diagrams
- **Table Extraction**: Struggles with complex table structures
- **Mathematical Notation**: Limited support for equations and formulas

### pdf-parse (Text Extraction)

**📄 Simple Text Extraction**:

```typescript
import pdfParse from 'pdf-parse';

const pdfBuffer = fs.readFileSync('document.pdf');
const data = await pdfParse(pdfBuffer);
console.log(data.text); // Raw text content
```

**Best For**:
- **Cost-Optimized Pipeline**: ~$0.01/page vs $0.10-0.20 for vision models
- **Hybrid Approaches**: Extract text, then use LLM for layout enhancement
- **Preprocessing**: Text extraction before specialized processing

**Limitations**:
- **No Layout Information**: Loses document structure and formatting
- **No Figure Handling**: Cannot process images, charts, or diagrams
- **Table Issues**: Poor table structure preservation

## Specialized Academic Tools

### SciPDFA (Research Tools)

**🧪 Domain-Specific Processors**:

Various research projects focused on scientific literature processing:

- **TableGPT2**: Large multimodal model for tabular data integration [[source]](https://arxiv.org/html/2411.02059v1)
- **VILA Integration**: Visual Layout Groups approach with 95% text block classification [[source]](https://direct.mit.edu/tacl/article/doi/10.1162/tacl_a_00466/110438/VILA-Improving-Structured-Content-Extraction-from)
- **LayoutLM**: Coordinate-based document analysis with 0-1,000 scale normalization

### Academic Benchmarking Tools

**📊 Evaluation and Testing**:

- **LocateBench**: Vision model spatial reasoning accuracy assessment [[source]](https://arxiv.org/html/2410.19808v1)
- **OCR Benchmark Methodology**: 1,000 document evaluation frameworks [[source]](https://getomni.ai/ocr-benchmark)
- **Academic Document Datasets**: Standardized evaluation for scientific paper processing

## Implementation Recommendations

### For Spideryarn Reading Project

**Current Architecture (V2)**:
- **Primary**: Direct LLM processing (Claude 4 + Gemini 2.5 Pro)
- **Fallback**: pdf-to-png-converter + LLM transcription
- **Academic Enhancement**: GROBID for metadata extraction

**Recommended Open Source Stack**:

```typescript
// Hybrid approach combining multiple open source tools
const hybridPipeline = {
  imageConversion: "pdf-to-png-converter", // Zero dependencies
  textExtraction: "pdf-parse", // Cost optimization
  layoutAnalysis: "GROBID API", // Academic structure
  fallbackOCR: "Tesseract" // Offline processing
};
```

### Cost-Performance Analysis

| Tool | Cost | Quality | Deployment | Academic Focus |
|------|------|---------|------------|----------------|
| pdf-to-png-converter | Free | High | Excellent | Good |
| GROBID | Free | Excellent | Good | Excellent |
| pdf-parse | Free | Medium | Excellent | Poor |
| PyMuPDF | Free | Excellent | Medium | Excellent |
| Tesseract | Free | Medium | Medium | Poor |

### Integration Patterns

**Pattern 1: Serverless-First**
```typescript
// Zero-dependency approach for Vercel/Netlify
import { pdfToPng } from 'pdf-to-png-converter';
// No system dependencies required
```

**Pattern 2: Academic-Optimized**
```typescript
// GROBID + custom processing
const academicPipeline = {
  structureExtraction: "GROBID API call",
  imageProcessing: "pdf-to-png-converter",
  contentEnhancement: "LLM post-processing"
};
```

**Pattern 3: Cost-Optimized Hybrid**
```typescript
// Text + selective vision processing
const costOptimized = {
  textExtraction: "pdf-parse", // $0.01/page
  layoutEnhancement: "LLM vision for figures only", // $0.05/page
  totalCost: "80% reduction vs pure vision approach"
};
```

## Limitations and Considerations

### Known Open Source Limitations

**1. Layout Preservation Challenges**:
- Traditional OCR shows "variation in styles and formats can cause errors in ordering and splicing of text" [[source]](https://scfbm.biomedcentral.com/articles/10.1186/1751-0473-7-7)
- Multi-column academic papers require specialized handling
- Figure-text integration remains challenging

**2. Mathematical Content**:
- Limited LaTeX/equation processing in most tools
- Mathematical notation recognition requires specialized models
- Complex scientific diagrams not well-supported

**3. Deployment Complexity**:
- System dependencies (GraphicsMagick, Ghostscript) complicate serverless deployment
- Version compatibility issues across environments
- Container image size concerns for some tools

### Future Developments

**Monitoring Areas**:
- **LayoutLMv4**: Expected improvements in coordinate accuracy
- **Next-gen GROBID**: Enhanced deep learning model integration
- **Academic VLMs**: Domain-specific vision-language models
- **Edge Deployment**: Local processing capabilities

## References

### Technical Resources
- [pdf-to-png-converter](https://www.npmjs.com/package/pdf-to-png-converter) - Zero-dependency TypeScript PDF conversion
- [GROBID Repository](https://github.com/kermitt2/grobid) - Machine learning software for scholarly documents
- [pdf2pic npm statistics](https://libraries.io/npm/pdf2pic) - Usage and deployment analysis
- [Node.js PDF Conversion Guide](https://stackoverflow.com/questions/69520419/questions-regarding-pdf-to-image-conversion-with-node-js)

### Academic Research
- [VILA: Visual Layout Groups](https://direct.mit.edu/tacl/article/doi/10.1162/tacl_a_00466/110438/) - 95% text block classification methodology
- [Layout-aware PDF Text Extraction](https://scfbm.biomedcentral.com/articles/10.1186/1751-0473-7-7) - 20% improvement with layout preservation
- [LayoutLM: Document AI Pretraining](https://arxiv.org/pdf/1912.13318) - Coordinate-based document analysis

### Production Examples
- [CORE + GROBID Partnership](https://blog.core.ac.uk/2023/07/17/core-grobid-structured-text-from-34-million-scientific-documents-and-counting/) - 34 million document processing
- [Serverless PDF Architecture](https://github.com/dropy-online/serverless-pdf-converter) - AWS Lambda deployment patterns

---

*Last updated: January 2025*  
*Status: Comprehensive open source tool analysis* ✅  
*Next review: When new major versions are released*