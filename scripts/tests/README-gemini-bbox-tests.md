# Gemini Bounding Box Extraction Tests

This directory contains test scripts for validating Gemini's PDF bounding box extraction capabilities, which is critical for the v3 Gemini Native PDF pipeline.

## Test Scripts

### 1. `test-gemini-bounding-boxes.ts`
Main test script that:
- Sends a PDF to Gemini with explicit bounding box extraction instructions
- Parses returned HTML for `data-bbox` attributes
- Analyzes coordinate accuracy and completeness
- Compares against expected coordinates if available

**Usage:**
```bash
npx tsx scripts/tests/test-gemini-bounding-boxes.ts <pdf-file>
```

**Example:**
```bash
npx tsx scripts/tests/test-gemini-bounding-boxes.ts "test-data/Bounding Box Test Document.pdf"
```

### 2. `create-test-pdf.ts`
Helper script to create test PDFs programmatically (requires pdfkit - currently not used, see HTML method below).

## Test Data

Test files are located in `test-data/`:
- `bbox-test.html` - HTML file with visual elements at known positions
- `bbox-test-expected.json` - Expected bounding box coordinates
- `Bounding Box Test Document.pdf` - PDF created from the HTML
- `README-bbox-testing.md` - Instructions for creating test PDFs

## Test Results Summary

**Test Date:** January 2025  
**Gemini Model:** Gemini 2.5 Pro  
**Test PDF:** 2 pages, 5 visual elements (4 figures, 1 table)

### Accuracy Results
| Metric | Result |
|--------|--------|
| Detection Rate | 100% (5/5 elements) |
| Average Error | 3-6 units (0.3-0.6%) |
| Maximum Error | 50 units (5%) |
| Coordinate System | 0-1000 confirmed |
| Processing Time | ~20-26 seconds |
| Token Usage | ~1,900 tokens |

### Key Findings
1. **Excellent Accuracy**: All coordinates within 5% tolerance (most within 1%)
2. **Consistent Results**: Multiple runs produce nearly identical coordinates
3. **Proper Markup**: Correct semantic HTML with figure/table/caption tags
4. **No Systematic Errors**: No offset or scaling issues detected

## Running Tests on New PDFs

To test Gemini's bbox extraction on your own PDFs:

1. **Prepare your PDF** with clear visual elements (figures, tables, charts)

2. **Run the test:**
   ```bash
   npx tsx scripts/tests/test-gemini-bounding-boxes.ts path/to/your.pdf
   ```

3. **Create expected coordinates (optional):**
   ```json
   {
     "elements": [
       {
         "description": "Figure 1: Description",
         "expectedCoords": { "x1": 100, "y1": 150, "x2": 500, "y2": 350 }
       }
     ],
     "tolerances": { "absolute": 50 }
   }
   ```
   Save as `your-expected.json` (same name as PDF with `-expected.json`)

4. **Analyze results:**
   - Check detection rate
   - Review coordinate accuracy
   - Verify semantic markup quality

## Interpreting Results

### Coordinate System
- Gemini uses 0-1000 scale
- (0,0) = top-left corner
- (1000,1000) = bottom-right corner
- Our system expects 0-1 scale, so conversion is needed

### Accuracy Thresholds
- **Excellent**: < 1% error (< 10 units)
- **Good**: < 5% error (< 50 units)
- **Acceptable**: < 10% error (< 100 units)
- **Poor**: > 10% error

### Common Issues
1. **Missing elements**: Check if PDF has clear visual boundaries
2. **Large errors**: May indicate complex layouts or overlapping elements
3. **Wrong element type**: Gemini may misclassify charts as figures

## Integration with v3 Pipeline

These tests validate that Gemini can:
1. Detect visual elements in PDFs with high accuracy
2. Provide precise bounding box coordinates
3. Extract captions and maintain semantic structure
4. Handle multi-page documents correctly

The test results confirm that the v3 Gemini Native approach is viable for production use with academic PDFs.

## Future Improvements

1. **Expand test suite**: Add more complex PDFs (equations, multi-column, nested figures)
2. **Automate comparison**: Build automated test runner with pass/fail criteria
3. **Performance benchmarks**: Track processing time vs document complexity
4. **Real-world validation**: Test with actual academic papers from various sources