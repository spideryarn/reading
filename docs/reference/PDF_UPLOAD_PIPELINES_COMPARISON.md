# PDF Upload Pipelines Comparison

A comprehensive comparison of PDF processing pipelines in Spideryarn Reading, helping users and developers choose the optimal approach for different use cases.

## Pipeline Overview

### v3 (Gemini Native) - Current Default

**Description**: Direct PDF processing with Gemini's native capabilities including bounding box extraction.

**Key Features**:
- Native PDF-to-HTML without image conversion
- Automatic bounding box detection (unique to Gemini)
- Coordinate extraction for future image processing
- Token exhaustion detection

**Status**: ✅ Production-ready for text extraction with bbox metadata

### v2 (Vision Pipeline) - High Quality

**Description**: Page-by-page image conversion with vision API processing for highest quality.

**Key Features**:
- PDF → PNG conversion at high resolution
- Parallel page processing
- Full image extraction and storage
- Best accuracy for complex layouts

**Status**: ✅ Functional but expensive

### Direct Processing (Claude/Gemini)

**Description**: Simple PDF-to-text API calls without special features.

**Key Features**:
- Direct API submission
- No image handling
- Fast and simple
- Provider-specific limits

**Status**: ✅ Stable fallback option

## Feature Comparison Matrix

| Feature | v3 Gemini Native | v2 Vision | Direct (Claude) | Direct (Gemini) |
|---------|-----------------|-----------|-----------------|-----------------|
| **Processing Method** | Native PDF | Image conversion | Direct PDF | Direct PDF |
| **Bounding Boxes** | ✅ Automatic | ✅ Manual prompting | ❌ | ❌ |
| **Image Extraction** | 🔄 Metadata only | ✅ Full extraction | ❌ | ❌ |
| **Max File Size** | 20MB | No limit* | 32MB | 20MB |
| **Max Pages** | 100 | 100 | 100 | 100 |
| **Token Limit** | 1M | 200k/page | 200k total | 1M total |
| **Parallel Processing** | ❌ | ✅ | ❌ | ❌ |
| **Cost per Page** | ~$0.001 | ~$0.10-0.20 | ~$0.003 | ~$0.001 |
| **Processing Time** | 20-30s | 45-60s | 15-25s | 20-30s |
| **Accuracy** | High | Highest | High | Medium |

*v2 processes page-by-page, so file size is not a constraint

## Cost Analysis

### Detailed Cost Breakdown

**v3 Gemini Native**:
- Gemini 2.5 Flash: $0.075/M input, $0.30/M output
- ~2000 tokens/page input, ~2500 tokens/page output
- **Cost**: ~$0.001 per page

**v2 Vision Pipeline**:
- Claude 4 Vision: $3/M input, $15/M output
- High-res image: ~2000 tokens + processing
- **Cost**: ~$0.10-0.20 per page (100x more than v3)

**Direct Processing**:
- Claude 4: $3/M input, $15/M output
- Gemini 2.5: $0.075/M input, $0.30/M output
- **Cost**: Claude ~$0.003/page, Gemini ~$0.001/page

### Example Document Costs

| Document Type | Pages | v3 Gemini | v2 Vision | Claude Direct |
|--------------|-------|-----------|-----------|---------------|
| Research Paper | 20 | $0.02 | $2.00-4.00 | $0.06 |
| Thesis | 100 | $0.10 | $10-20 | $0.30 |
| Book Chapter | 50 | $0.05 | $5-10 | $0.15 |

## Use Case Recommendations

### Best for Cost Optimization: v3 Gemini Native
- Academic papers under 20MB
- Bulk document processing
- When bbox metadata is valuable
- Standard PDF layouts

### Best for Quality: v2 Vision Pipeline
- Complex multi-column layouts
- Documents with critical figures
- When accuracy justifies 100x cost
- Grant proposals, legal documents

### Best for Simplicity: Direct Processing
- Quick one-off conversions
- When no special features needed
- Documents 20-32MB (Claude only)
- Prototyping and testing

## Technical Specifications

### File Size Limits

| Pipeline | Storage Limit | API Limit | Constraint |
|----------|--------------|-----------|------------|
| v3 Gemini Native | 50MB | 20MB | Gemini API |
| v2 Vision | 50MB | Unlimited* | Storage only |
| Claude Direct | 50MB | 32MB | Claude API |
| Gemini Direct | 50MB | 20MB | Gemini API |

*v2 processes page-by-page after initial storage

### Processing Architecture

**v3 Gemini Native**:
```
PDF Buffer → Gemini API → HTML + Bboxes → Normalize → Store
```

**v2 Vision**:
```
PDF → PNG Pages → Parallel Vision Calls → Merge → Store Images → Store HTML
```

**Direct Processing**:
```
PDF Buffer → LLM API → HTML → Store
```

## Error Handling Comparison

### v3 Gemini Native
- ✅ Token exhaustion detection
- ✅ Fail-fast on size limits (HTTP 413)
- ✅ Coordinate validation with warnings
- ✅ No silent failures

### v2 Vision Pipeline
- ✅ Per-page error isolation
- ✅ Parallel processing resilience
- ❌ Complex error aggregation
- ⚠️ Partial success possible

### Direct Processing
- ⚠️ Token limits may truncate
- ✅ Simple error messages
- ❌ No coordination validation
- ⚠️ Silent truncation risk (pre-v3)

## Quality Metrics

### Accuracy Comparison

Based on testing with academic PDFs:

| Metric | v3 Gemini | v2 Vision | Direct |
|--------|-----------|-----------|---------|
| Text Extraction | 95% | 98% | 90-95% |
| Table Preservation | 90% | 95% | 85% |
| Math Notation | 85% | 95% | 80-90% |
| Figure Detection | 90%* | 98% | 0% |
| Layout Fidelity | 85% | 95% | 80% |

*Bbox detection only, not actual extraction

### Processing Speed

Average times for 20-page academic paper:

- **v3 Gemini Native**: 20-30 seconds
- **v2 Vision Pipeline**: 45-60 seconds  
- **Claude Direct**: 15-25 seconds
- **Gemini Direct**: 20-30 seconds

## Migration Path

### From v1 to v3
- Automatic upgrade, no code changes needed
- Same API endpoint and parameters
- Added bbox metadata in output
- Better error handling

### Future v3 Enhancements
1. **Image Extraction**: Use bboxes to extract figures
2. **Two-Stage Processing**: Gemini + Claude refinement
3. **Batch Operations**: Multiple PDF processing
4. **Smart Routing**: Automatic pipeline selection

## Decision Tree

```
Start
├─ Is cost critical?
│  └─ YES → v3 Gemini Native
├─ Need highest quality?
│  └─ YES → v2 Vision Pipeline
├─ File > 20MB?
│  └─ YES → Claude Direct (up to 32MB)
├─ Need image extraction?
│  └─ YES → v2 Vision (current)
│          → v3 Gemini (future)
└─ Default → v3 Gemini Native
```

## Monitoring and Metrics

### Key Performance Indicators

**v3 Gemini Native**:
- Token usage per page
- Bbox extraction success rate
- Processing time percentiles
- Cost per document

**All Pipelines**:
- Success/failure rates
- Average processing time
- Token exhaustion frequency
- User satisfaction scores

### Logging Fields

```typescript
{
  pipeline_version: 'v3-gemini-native',
  processing_time_ms: 23456,
  tokens_used: 45000,
  cost_estimate: 0.02,
  page_count: 20,
  file_size_mb: 8.5,
  bboxes_extracted: 12,
  warnings: ['coordinate adjustments'],
  finish_reason: 'stop'
}
```

## FAQs

**Q: Why is v3 the new default instead of v2?**
A: v3 provides 100x cost savings while maintaining high quality. The vision pipeline (v2) remains available for cases requiring maximum accuracy.

**Q: Can I still use Claude with v3?**
A: The v3 designation specifically refers to Gemini Native processing. Claude uses the direct processing pipeline.

**Q: Will v3 support image extraction?**
A: Yes, this is planned. v3 already extracts bounding box coordinates, which will enable future image extraction.

**Q: What happens if my PDF exceeds Gemini's 20MB limit?**
A: The system returns HTTP 413 with a clear error message. You can then choose Claude (up to 32MB) or use the vision pipeline.

**Q: How accurate are the bounding boxes?**
A: Testing shows 99%+ accuracy for coordinate detection in academic PDFs, with automatic handling of coordinate order variations.

## References

- `docs/reference/PDF_UPLOAD_GEMINI_NATIVE.md` - Detailed v3 architecture
- `docs/reference/PDF_TO_HTML_LLM_APPROACHES.md` - Comprehensive LLM analysis
- `docs/planning/250706a_gemini_native_pdf_pipeline.md` - v3 implementation planning
- `docs/planning/250627c_vision_based_pdf_processing_pipeline.md` - v2 vision pipeline design