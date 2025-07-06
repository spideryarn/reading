# PDF Upload Pipeline v3 Upgrade

## Overview

As of January 2025, the PDF upload pipeline previously known as "v1" has been upgraded to "v3". This upgrade enhances the existing LLM transcription capabilities with Gemini's native PDF processing and bounding box extraction features.

## What Changed?

### Version Naming
- **Old**: LLM transcription (v1)
- **New**: LLM transcription (v3)

### Why v3?
The version numbering reflects the evolution of our PDF processing capabilities:
- **v1 (Legacy)**: Original LLM-based PDF-to-HTML transcription
- **v2**: Vision-based pipeline with page-by-page image processing
- **v3 (Current)**: Enhanced LLM transcription with native PDF capabilities

## User Impact

### No Breaking Changes
The upgrade from v1 to v3 maintains full API compatibility. Users will see:
- Updated UI labels showing "v3" instead of "v1"
- Same processing flow and user experience
- Improved capabilities coming soon (bounding box extraction, better error handling)

### Immediate Improvements
- Better token limit detection to prevent silent truncation
- Foundation for future image extraction capabilities
- Improved error messages when documents exceed processing limits

## Technical Details

### What's Being Enhanced
1. **Token Limit Checking**: v3 now properly checks `finishReason` to detect output truncation
2. **Bounding Box Support**: Foundation laid for Gemini's native coordinate extraction (0-1000 scale)
3. **Future Image Extraction**: Infrastructure prepared for extracting figures and charts

### API Compatibility
- Same `/api/upload-pdf` endpoint
- Same form data structure
- Same response format
- Processing method remains 'ai-transcription'

## Migration Notes

### For Users
No action required. Your existing workflows will continue to work exactly as before, with the v3 label indicating enhanced capabilities.

### For Developers
- UI components updated to show "v3" label
- Mermaid diagram renamed: `250705a_llm_v1_pdf_upload_pipeline.mermaid` → `250705a_llm_v3_pdf_upload_pipeline.mermaid`
- Code comments updated to reflect v3 terminology

## Future Enhancements

The v3 pipeline will progressively gain new features:
1. Gemini native PDF processing with bounding box extraction
2. Automatic figure and chart extraction
3. Optional Claude refinement for highest quality output
4. Better handling of large documents

## References

- Planning document: `docs/planning/250706a_gemini_native_pdf_pipeline.md`
- Pipeline diagram: `docs/diagrams/250705a_llm_v3_pdf_upload_pipeline.mermaid`
- Original v1 implementation: See git history before January 2025