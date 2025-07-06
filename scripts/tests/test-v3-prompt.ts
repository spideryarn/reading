#!/usr/bin/env npx tsx

/**
 * Test script for v3 Gemini native prompt template
 * Tests the new pdf-to-html-v3-gemini-native.njk template with bounding box extraction
 */

import { readFile } from 'fs/promises'
import { executeMultimodalPromptWithUsage } from '@/lib/prompts/types'
import { pdfToHtmlV3GeminiNativePrompt } from '@/lib/prompts/templates/pdf-to-html-v3-gemini-native'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

async function testV3Prompt(pdfPath: string) {
  console.log('Testing v3 Gemini native prompt template...')
  console.log(`PDF: ${pdfPath}`)
  console.log('---')

  try {
    // Read PDF file
    const pdfBuffer = await readFile(pdfPath)
    const fileName = pdfPath.split('/').pop() || 'test.pdf'

    console.log('Sending PDF to Gemini with v3 prompt...')
    const startTime = Date.now()

    // Execute prompt
    const result = await executeMultimodalPromptWithUsage(pdfToHtmlV3GeminiNativePrompt, {
      pdfBuffer,
      fileName,
      singlePageOnly: false // Process full document
    })

    const processingTime = Date.now() - startTime
    console.log(`\nProcessing completed in ${(processingTime / 1000).toFixed(1)}s`)
    console.log(`Tokens used: ${result.usage.totalTokens}`)

    // Extract bounding boxes from HTML
    const bboxRegex = /data-bbox="(\d+),(\d+),(\d+),(\d+)"/g
    const matches = [...result.text.matchAll(bboxRegex)]
    
    console.log(`\nFound ${matches.length} elements with bounding boxes:`)
    
    // Parse and display bounding boxes
    matches.forEach((match, index) => {
      const [full, x1, y1, x2, y2] = match
      console.log(`  ${index + 1}. Bbox: (${x1},${y1}) to (${x2},${y2})`)
      
      // Find associated element type
      const contextStart = Math.max(0, result.text.indexOf(full) - 50)
      const contextEnd = Math.min(result.text.length, result.text.indexOf(full) + 100)
      const context = result.text.substring(contextStart, contextEnd)
      
      if (context.includes('<figure')) console.log('     Type: Figure')
      else if (context.includes('<table')) console.log('     Type: Table')
      else if (context.includes('<img')) console.log('     Type: Image')
      else if (context.includes('<div')) console.log('     Type: Div/Diagram')
    })

    // Check for v3-specific features
    console.log('\nV3 Feature Checks:')
    console.log(`✓ Uses 0-1000 coordinate system: ${matches.some(m => parseInt(m[3]) > 100 || parseInt(m[4]) > 100)}`)
    console.log(`✓ Contains semantic markup: ${result.text.includes('<figure') || result.text.includes('<table')}`)
    console.log(`✓ Has figcaptions: ${result.text.includes('<figcaption')}`)
    console.log(`✓ Has table captions: ${result.text.includes('<caption')}`)

    // Save output for inspection
    const outputPath = pdfPath.replace('.pdf', '-v3-output.html')
    await writeFile(outputPath, result.text)
    console.log(`\nOutput saved to: ${outputPath}`)

  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

// Import writeFile
import { writeFile } from 'fs/promises'

// Main execution
const pdfPath = process.argv[2]
if (!pdfPath) {
  console.error('Usage: npx tsx scripts/tests/test-v3-prompt.ts <pdf-path>')
  console.error('Example: npx tsx scripts/tests/test-v3-prompt.ts "test-data/Bounding Box Test Document.pdf"')
  process.exit(1)
}

testV3Prompt(pdfPath).catch(console.error)