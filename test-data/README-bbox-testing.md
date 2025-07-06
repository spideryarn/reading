# Gemini Bounding Box Testing Instructions

This directory contains test files for validating Gemini's PDF bounding box extraction capabilities.

## Test Files

1. **bbox-test.html** - HTML file with known element positions
2. **bbox-test-expected.json** - Expected bounding box coordinates for validation
3. **bbox-test.pdf** - PDF version (needs to be created from the HTML)

## Creating the Test PDF

1. Open `bbox-test.html` in Chrome or Edge browser
2. Press Ctrl+P (or Cmd+P on Mac) to print
3. Configure print settings:
   - Destination: "Save as PDF"
   - Margins: "None"
   - Check "Background graphics"
   - Uncheck "Headers and footers"
4. Save as `bbox-test.pdf` in this directory

## Running the Test

Once you have the PDF file:

```bash
# Run the bounding box test
npm run tsx scripts/test-gemini-bounding-boxes.ts test-data/bbox-test.pdf
```

## What the Test Does

1. Sends the PDF to Gemini with explicit bounding box extraction instructions
2. Parses the returned HTML for data-bbox attributes
3. Analyzes coordinate system (verifies 0-1000 scale)
4. Compares extracted coordinates against expected values
5. Reports accuracy metrics

## Expected Results

The test will show:
- Number of elements detected
- Coordinate values for each element
- Comparison with expected positions
- Overall accuracy score

## Interpreting Results

- **Exact match**: Coordinates within ±50 units (5% tolerance)
- **Close match**: Coordinates within ±100 units (10% tolerance)
- **Poor match**: Coordinates differ by more than 100 units

## Known Element Positions

| Element | Description | Expected Coords (0-1000) |
|---------|-------------|-------------------------|
| Figure 1 | Top-left test | 100,150,500,350 |
| Figure 2 | Center test | 250,450,750,700 |
| Table 1 | Full-width table | 50,750,950,900 |
| Figure 3 | Small top-right | 600,100,950,250 |
| Figure 4 | Full-width bottom | 50,500,950,800 |

## Troubleshooting

If Gemini doesn't return bounding boxes:
1. Check that the prompt template explicitly requests data-bbox attributes
2. Verify the PDF was created correctly (figures should be visible)
3. Try with a simpler PDF first
4. Check Gemini's response for error messages

## Next Steps

Based on test results:
- If accuracy is good (>80% within tolerance): Proceed with implementation
- If accuracy is poor: Consider hybrid approach or coordinate adjustment logic
- If no bounding boxes: May need to reconsider the v3 approach entirely