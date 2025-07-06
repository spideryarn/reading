#!/usr/bin/env tsx
/**
 * Create a test PDF with known bounding box positions for testing Gemini's extraction accuracy
 * 
 * This script generates a PDF with figures and tables at precise locations to test
 * whether Gemini can accurately detect their bounding boxes.
 * 
 * Usage: npm run tsx scripts/create-test-pdf.ts
 */

import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'

const OUTPUT_DIR = 'test-data'
const OUTPUT_FILE = 'bbox-test.pdf'

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

// Create a new PDF document
const doc = new PDFDocument({
  size: 'A4',
  margin: 50
})

// Pipe to file
const outputPath = path.join(OUTPUT_DIR, OUTPUT_FILE)
doc.pipe(fs.createWriteStream(outputPath))

// Page dimensions (A4: 595.28 x 841.89 points)
const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN = 50
const CONTENT_WIDTH = PAGE_WIDTH - (2 * MARGIN)
const CONTENT_HEIGHT = PAGE_HEIGHT - (2 * MARGIN)

console.log('Creating test PDF with known element positions...')
console.log(`Page size: ${PAGE_WIDTH} x ${PAGE_HEIGHT} points`)
console.log(`Content area: ${CONTENT_WIDTH} x ${CONTENT_HEIGHT} points`)

// Helper function to convert from PDF points to 0-1000 scale
function toNormalizedCoords(x: number, y: number, width: number, height: number) {
  const x1 = Math.round((x / PAGE_WIDTH) * 1000)
  const y1 = Math.round((y / PAGE_HEIGHT) * 1000)
  const x2 = Math.round(((x + width) / PAGE_WIDTH) * 1000)
  const y2 = Math.round(((y + height) / PAGE_HEIGHT) * 1000)
  return { x1, y1, x2, y2 }
}

// Track element positions for verification
const elements: Array<{
  type: string
  description: string
  pdfCoords: { x: number, y: number, width: number, height: number }
  normalizedCoords: { x1: number, y1: number, x2: number, y2: number }
}> = []

// Page 1: Test various figure positions
doc.fontSize(16).text('Bounding Box Test Document', MARGIN, MARGIN)
doc.fontSize(12).text('Page 1: Figure Position Tests', MARGIN, MARGIN + 30)

// Figure 1: Top-left corner
const fig1 = {
  x: MARGIN,
  y: 120,
  width: 200,
  height: 150
}
doc.rect(fig1.x, fig1.y, fig1.width, fig1.height)
   .stroke()
doc.fontSize(10).text('Figure 1: Top-left position test', fig1.x, fig1.y + fig1.height + 5)

elements.push({
  type: 'figure',
  description: 'Figure 1: Top-left position test',
  pdfCoords: fig1,
  normalizedCoords: toNormalizedCoords(fig1.x, fig1.y, fig1.width, fig1.height)
})

// Figure 2: Center
const fig2 = {
  x: (PAGE_WIDTH - 250) / 2,
  y: 350,
  width: 250,
  height: 180
}
doc.rect(fig2.x, fig2.y, fig2.width, fig2.height)
   .stroke()
doc.fontSize(10).text('Figure 2: Center position test', fig2.x, fig2.y + fig2.height + 5)

elements.push({
  type: 'figure',
  description: 'Figure 2: Center position test',
  pdfCoords: fig2,
  normalizedCoords: toNormalizedCoords(fig2.x, fig2.y, fig2.width, fig2.height)
})

// Table 1: Bottom area
const table1 = {
  x: MARGIN,
  y: 600,
  width: CONTENT_WIDTH,
  height: 120
}
doc.rect(table1.x, table1.y, table1.width, table1.height)
   .stroke()

// Draw simple table grid
const cols = 3
const rows = 4
const colWidth = table1.width / cols
const rowHeight = table1.height / rows

for (let i = 1; i < cols; i++) {
  doc.moveTo(table1.x + i * colWidth, table1.y)
     .lineTo(table1.x + i * colWidth, table1.y + table1.height)
     .stroke()
}

for (let i = 1; i < rows; i++) {
  doc.moveTo(table1.x, table1.y + i * rowHeight)
     .lineTo(table1.x + table1.width, table1.y + i * rowHeight)
     .stroke()
}

doc.fontSize(10).text('Table 1: Full-width table test', table1.x, table1.y + table1.height + 5)

elements.push({
  type: 'table',
  description: 'Table 1: Full-width table test',
  pdfCoords: table1,
  normalizedCoords: toNormalizedCoords(table1.x, table1.y, table1.width, table1.height)
})

// Page 2: More complex layout
doc.addPage()
doc.fontSize(12).text('Page 2: Complex Layout Test', MARGIN, MARGIN)

// Small figure in top-right
const fig3 = {
  x: PAGE_WIDTH - MARGIN - 150,
  y: 100,
  width: 150,
  height: 100
}
doc.rect(fig3.x, fig3.y, fig3.width, fig3.height)
   .stroke()
doc.fontSize(10).text('Figure 3: Small figure', fig3.x, fig3.y + fig3.height + 5)

elements.push({
  type: 'figure',
  description: 'Figure 3: Small figure',
  pdfCoords: fig3,
  normalizedCoords: toNormalizedCoords(fig3.x, fig3.y, fig3.width, fig3.height)
})

// Two-column layout simulation
const col1X = MARGIN
const col2X = PAGE_WIDTH / 2 + 10
const colWidth = (PAGE_WIDTH / 2) - MARGIN - 10

// Text in columns
doc.fontSize(10)
   .text('This is column 1 text that should not be marked as a figure.', col1X, 250, {
     width: colWidth,
     align: 'justify'
   })
   .text('This is column 2 text that should also not be marked as a figure.', col2X, 250, {
     width: colWidth,
     align: 'justify'
   })

// Figure 4: Spanning both columns
const fig4 = {
  x: MARGIN,
  y: 400,
  width: CONTENT_WIDTH,
  height: 200
}
doc.rect(fig4.x, fig4.y, fig4.width, fig4.height)
   .stroke()
doc.fontSize(10).text('Figure 4: Full-width figure spanning columns', fig4.x, fig4.y + fig4.height + 5)

elements.push({
  type: 'figure',
  description: 'Figure 4: Full-width figure spanning columns',
  pdfCoords: fig4,
  normalizedCoords: toNormalizedCoords(fig4.x, fig4.y, fig4.width, fig4.height)
})

// Finalize the PDF
doc.end()

// Write expected coordinates to JSON file
const expectedCoordsPath = path.join(OUTPUT_DIR, 'bbox-test-expected.json')
const expectedData = {
  pdfDimensions: {
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT
  },
  elements: elements
}

fs.writeFileSync(expectedCoordsPath, JSON.stringify(expectedData, null, 2))

console.log('\n✅ Test PDF created successfully!')
console.log(`PDF saved to: ${outputPath}`)
console.log(`Expected coordinates saved to: ${expectedCoordsPath}`)

console.log('\n📊 Expected bounding boxes (0-1000 scale):')
elements.forEach((elem, index) => {
  console.log(`\n${elem.description}`)
  console.log(`  Type: ${elem.type}`)
  console.log(`  PDF coords: x=${elem.pdfCoords.x}, y=${elem.pdfCoords.y}, w=${elem.pdfCoords.width}, h=${elem.pdfCoords.height}`)
  console.log(`  Normalized: x1=${elem.normalizedCoords.x1}, y1=${elem.normalizedCoords.y1}, x2=${elem.normalizedCoords.x2}, y2=${elem.normalizedCoords.y2}`)
})

console.log('\n🚀 Next step: Run the test script')
console.log(`npm run tsx scripts/test-gemini-bounding-boxes.ts ${outputPath}`)