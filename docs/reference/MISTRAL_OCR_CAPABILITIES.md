# Mistral OCR Capabilities Reference

## Overview

Mistral launched their OCR API (`mistral-ocr-latest`) in March 2025 as a high-performance document processing solution.

## Key Capabilities

### Performance
- 94.89% accuracy rate (claims to outperform Google Document AI, Azure OCR, and OpenAI GPT-4o)
- Supports 11+ languages with 99%+ accuracy
- Excels at mathematical expressions (LaTeX), complex layouts, tables, and multilingual documents

### Document Processing Features
- Multimodal understanding (text, images, tables, equations)
- Preserves document structure in clean Markdown format
- Handles complex PDFs with interleaved text and images
- Supports both handwritten notes and typed text

## Bounding Box Support

**✅ Image Bounding Boxes**: Mistral OCR provides bounding box coordinates for:
- Images and figures
- Charts and diagrams
- Other graphical elements

**Note**: Text elements do not have bounding boxes, but this is acceptable for our v3 pipeline which only requires bounding boxes for figures and images.

## API Implementation

### Environment Setup

```bash
# TypeScript/JavaScript SDK
npm install @mistralai/mistralai

# Environment variable
export MISTRAL_API_KEY="your-api-key-here"
```

### Basic TypeScript Usage

```typescript
import { Mistral } from "@mistralai/mistralai";

const client = new Mistral({ 
  apiKey: process.env.MISTRAL_API_KEY 
});

// For local PDF files (base64 encoded)
async function processLocalPDF(pdfPath: string) {
  const fs = await import('fs');
  const pdfBuffer = fs.readFileSync(pdfPath);
  const base64Pdf = pdfBuffer.toString('base64');
  
  const ocrResponse = await client.ocr.process({
    model: "mistral-ocr-latest",
    document: {
      type: "document_url",
      documentUrl: `data:application/pdf;base64,${base64Pdf}`
    },
    includeImageBase64: false // Don't include base64 images to save bandwidth
  });
  
  // Access results
  if (ocrResponse.pages) {
    for (const page of ocrResponse.pages) {
      console.log(`Page ${page.index}:`);
      console.log(page.content); // Markdown-formatted text
      
      if (page.images) {
        for (const image of page.images) {
          console.log(`Image ${image.id}: bbox(${image.top_left_x},${image.top_left_y},${image.bottom_right_x},${image.bottom_right_y})`);
        }
      }
    }
  }
  
  return ocrResponse;
}
```

### Advanced Usage with Bounding Box Annotations

The Annotations API allows structured extraction of bounding boxes for specific elements:

```typescript
import { Mistral } from "@mistralai/mistralai";
import { responseFormatFromZodObject } from '@mistralai/mistralai/extra/structChat.js';
import { z } from 'zod';

// Define schema for image annotations
const ImageAnnotationSchema = z.object({
  image_type: z.enum(['figure', 'chart', 'diagram', 'table', 'photo']),
  short_description: z.string(),
  caption: z.string().optional(),
  contains_text: z.boolean()
});

async function extractBoundingBoxesWithAnnotations(pdfBuffer: Buffer) {
  const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });
  const base64Pdf = pdfBuffer.toString('base64');
  
  const response = await client.ocr.process({
    model: "mistral-ocr-latest",
    document: {
      type: "document_url",
      documentUrl: `data:application/pdf;base64,${base64Pdf}`
    },
    bboxAnnotationFormat: responseFormatFromZodObject(ImageAnnotationSchema),
    includeImageBase64: false
  });
  
  return response;
}
```

### TypeScript Types for Our Implementation

```typescript
// Types matching our Mistral OCR processor implementation
interface MistralOCRResponse {
  pages?: Array<{
    index: number;
    content: string; // Markdown text
    dpi?: number;
    height: number;
    width: number;
    images?: Array<{
      id: string;
      top_left_x: number;
      top_left_y: number;
      bottom_right_x: number;
      bottom_right_y: number;
      image_base64?: string;
      // Annotation data if bboxAnnotationFormat is used
      annotation?: {
        image_type: string;
        short_description: string;
        caption?: string;
      };
    }>;
  }>;
  usage?: {
    pages: number;
  };
}

// Normalized bounding box for our system (0-1 scale)
interface NormalizedBoundingBox {
  x1: number; // 0-1
  y1: number; // 0-1
  x2: number; // 0-1
  y2: number; // 0-1
}

// Function to normalize Mistral's pixel coordinates to 0-1 scale
function normalizeBoundingBox(
  image: { top_left_x: number; top_left_y: number; bottom_right_x: number; bottom_right_y: number },
  pageWidth: number,
  pageHeight: number
): NormalizedBoundingBox {
  return {
    x1: Number((image.top_left_x / pageWidth).toFixed(4)),
    y1: Number((image.top_left_y / pageHeight).toFixed(4)),
    x2: Number((image.bottom_right_x / pageWidth).toFixed(4)),
    y2: Number((image.bottom_right_y / pageHeight).toFixed(4))
  };
}
```

### Response Structure

```json
{
  "pages": [
    {
      "index": 0,
      "content": "# Document Title\n\nThis is the markdown content...",
      "dpi": 300,
      "height": 1100,
      "width": 850,
      "images": [
        {
          "id": "img-1.jpeg",
          "top_left_x": 155,
          "top_left_y": 226,
          "bottom_right_x": 1307,
          "bottom_right_y": 843,
          "image_base64": "base64_string_here"
        }
      ]
    }
  ]
}
```

## Pricing & Limits

### Pricing
- Standard: $0.001 per page (1000 pages per dollar)
- Batch processing: ~$0.0005 per page (2000 pages per dollar)

### Limitations
- Maximum file size: 50 MB
- Maximum pages: 1000 per document
- Document annotations limited to 8 pages
- No text bounding box coordinates

## Comparison with Gemini for v3 Pipeline

| Feature | Gemini Native | Mistral OCR |
|---------|---------------|-------------|
| Text extraction quality | Good | Excellent |
| Text bounding boxes | ✅ Yes (0-1000 scale) | ❌ No |
| Image bounding boxes | ✅ Yes | ✅ Yes (pixel coordinates) |
| Output format | HTML with data-bbox | Markdown only |
| Max file size | 20MB (our limit) | 50MB |
| Processing speed | ~20-30s for 20 pages | <1s per page |
| Cost | $0.075/M tokens | $0.001/page |

## Conclusion

Mistral OCR is a **viable alternative to Gemini** for our v3 PDF pipeline, offering:
- Superior text extraction quality (94.89% accuracy)
- Image bounding box coordinates (which is what we need for figures)
- Competitive pricing ($0.001/page)
- Fast processing (< 1s per page)

### Recommended Use Cases in Our System

1. **v3 PDF Pipeline Alternative** - Excellent text extraction with image bounding boxes
2. **High-quality document processing** - Better accuracy than current options
3. **Cost-effective processing** - Significantly cheaper per page than token-based pricing

### Implementation Considerations

- Output is in Markdown format (will need HTML conversion)
- Bounding boxes are in pixel coordinates (will need normalization to 0-1 scale)
- Maximum 50MB file size and 1000 pages per document
- Requires separate API key setup

## Advanced Features: Annotations API

Mistral OCR provides two types of annotations:

### 1. Bounding Box Annotations (`bboxAnnotationFormat`)
- Extracts structured information about images/figures within documents
- Provides semantic understanding of visual elements
- No page limit when using bbox annotations alone
- Can classify images by type (figure, chart, diagram, table, photo)

### 2. Document Annotations (`documentAnnotationFormat`)
- Extracts document-level metadata (language, chapter titles, URLs, etc.)
- Limited to first 8 pages when using document annotations
- Can be combined with bbox annotations for comprehensive extraction

### Future Enhancement Opportunities

1. **Structured Image Extraction**:
   ```typescript
   // Use annotations to classify and extract specific image types
   const FigureSchema = z.object({
     figure_number: z.string().optional(),
     caption: z.string(),
     referenced_in_sections: z.array(z.string()),
     scientific_domain: z.string()
   });
   ```

2. **Selective Processing**:
   - Use bbox annotations to identify and extract only specific types of visual content
   - Filter out decorative images while preserving scientific figures

3. **Enhanced Metadata**:
   - Combine document and bbox annotations for rich document understanding
   - Extract relationships between text references and figure locations

## Implementation Notes for v3 Pipeline

### Current Implementation
- Uses basic OCR without annotations
- Converts Markdown to HTML using `marked` library
- Normalizes pixel coordinates to 0-1 scale
- Processes all images without classification

### Potential Enhancements
1. Add `bboxAnnotationFormat` to classify image types
2. Use annotations to improve caption extraction
3. Filter images based on type (e.g., only extract figures and charts)
4. Add structured metadata to extracted images

## References

- [Mistral OCR API Documentation](https://docs.mistral.ai/)
- [Mistral OCR Launch Announcement](https://mistral.ai/news/mistral-ocr/)
- [@mistralai/mistralai npm package](https://www.npmjs.com/package/@mistralai/mistralai)
- Research conducted: 2025-07-06