#!/usr/bin/env tsx
/**
 * Test script for Gemini's PDF bounding box extraction capabilities
 * 
 * This script tests whether Gemini can accurately extract bounding box coordinates
 * from PDF files containing figures, tables, and other visual elements.
 * 
 * Usage: npm run tsx scripts/test-gemini-bounding-boxes.ts [pdf-file]
 */

// Load environment variables from .env.local
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import fs from 'fs/promises'
import path from 'path'
import { executeMultimodalPromptWithUsage } from '@/lib/prompts/types'
import { JSDOM } from 'jsdom'
import { geminiBboxTestPrompt } from '@/lib/prompts/templates/pdf-to-html-gemini-bbox-test'

interface BoundingBox {
  x1: number
  y1: number
  x2: number
  y2: number
}

interface ExtractedElement {
  type: string
  bbox: BoundingBox
  caption?: string
  pageClass?: string
  rawBbox: string
}

async function extractBoundingBoxes(html: string): Promise<ExtractedElement[]> {
  const dom = new JSDOM(html)
  const document = dom.window.document
  const elements: ExtractedElement[] = []
  
  // Find all elements with bounding box data
  const elementsWithBbox = document.querySelectorAll('[data-bbox]')
  
  elementsWithBbox.forEach((element) => {
    const bboxData = element.getAttribute('data-bbox')
    if (!bboxData) return
    
    // Parse coordinates
    const coords = bboxData.split(',').map(c => parseFloat(c.trim()))
    if (coords.length !== 4 || coords.some(isNaN)) {
      console.warn(`Invalid bbox format: ${bboxData}`)
      return
    }
    
    // Determine element type
    const tagName = element.tagName.toLowerCase()
    let type = 'unknown'
    if (tagName === 'figure') type = 'figure'
    else if (tagName === 'table') type = 'table'
    else if (element.classList.contains('chart')) type = 'chart'
    else if (element.classList.contains('diagram')) type = 'diagram'
    else type = 'image'
    
    // Extract caption
    let caption: string | undefined
    const figcaption = element.querySelector('figcaption')
    const tableCaption = element.querySelector('caption')
    if (figcaption) caption = figcaption.textContent?.trim()
    else if (tableCaption) caption = tableCaption.textContent?.trim()
    
    // Get page class if available
    const pageClass = Array.from(element.classList).find(c => c.includes('page-'))
    
    elements.push({
      type,
      bbox: {
        x1: coords[0],
        y1: coords[1],
        x2: coords[2],
        y2: coords[3]
      },
      caption,
      pageClass,
      rawBbox: bboxData
    })
  })
  
  return elements
}

async function analyzeBoundingBoxes(elements: ExtractedElement[]) {
  console.log(`\n📊 Bounding Box Analysis`)
  console.log(`Found ${elements.length} elements with bounding boxes\n`)
  
  elements.forEach((elem, index) => {
    console.log(`Element ${index + 1}:`)
    console.log(`  Type: ${elem.type}`)
    console.log(`  Coordinates: ${elem.rawBbox}`)
    console.log(`  Normalized (0-1): x1=${(elem.bbox.x1/1000).toFixed(3)}, y1=${(elem.bbox.y1/1000).toFixed(3)}, x2=${(elem.bbox.x2/1000).toFixed(3)}, y2=${(elem.bbox.y2/1000).toFixed(3)}`)
    console.log(`  Width: ${(elem.bbox.x2 - elem.bbox.x1)} (${((elem.bbox.x2 - elem.bbox.x1)/1000 * 100).toFixed(1)}% of page)`)
    console.log(`  Height: ${(elem.bbox.y2 - elem.bbox.y1)} (${((elem.bbox.y2 - elem.bbox.y1)/1000 * 100).toFixed(1)}% of page)`)
    if (elem.caption) console.log(`  Caption: "${elem.caption}"`)
    if (elem.pageClass) console.log(`  Page: ${elem.pageClass}`)
    console.log()
  })
  
  // Check coordinate system
  console.log(`\n🎯 Coordinate System Check:`)
  const allInRange = elements.every(elem => 
    elem.bbox.x1 >= 0 && elem.bbox.x1 <= 1000 &&
    elem.bbox.y1 >= 0 && elem.bbox.y1 <= 1000 &&
    elem.bbox.x2 >= 0 && elem.bbox.x2 <= 1000 &&
    elem.bbox.y2 >= 0 && elem.bbox.y2 <= 1000
  )
  console.log(`  All coordinates in 0-1000 range: ${allInRange ? '✅ Yes' : '❌ No'}`)
  
  // Check for reasonable sizes
  const tinyElements = elements.filter(elem => {
    const width = (elem.bbox.x2 - elem.bbox.x1) / 1000
    const height = (elem.bbox.y2 - elem.bbox.y1) / 1000
    return width < 0.05 || height < 0.05 // Less than 5% of page
  })
  
  if (tinyElements.length > 0) {
    console.log(`\n⚠️  Warning: ${tinyElements.length} elements are very small (< 5% of page)`)
  }
}

async function compareWithExpected(
  extractedElements: ExtractedElement[],
  expectedPath: string
): Promise<void> {
  try {
    const expectedData = JSON.parse(await fs.readFile(expectedPath, 'utf-8'))
    const expectedElements = expectedData.elements
    
    console.log(`\n🔍 Comparing with Expected Coordinates`)
    console.log(`Expected elements: ${expectedElements.length}`)
    console.log(`Extracted elements: ${extractedElements.length}`)
    
    // Match extracted elements with expected ones
    const tolerance = expectedData.tolerances?.absolute || 50
    let matchedCount = 0
    
    expectedElements.forEach((expected: any) => {
      console.log(`\n📍 ${expected.description}`)
      console.log(`  Expected: ${JSON.stringify(expected.expectedCoords)}`)
      
      // Find closest match
      let closestMatch: ExtractedElement | null = null
      let closestDistance = Infinity
      
      extractedElements.forEach(extracted => {
        const distance = Math.sqrt(
          Math.pow(extracted.bbox.x1 - expected.expectedCoords.x1, 2) +
          Math.pow(extracted.bbox.y1 - expected.expectedCoords.y1, 2) +
          Math.pow(extracted.bbox.x2 - expected.expectedCoords.x2, 2) +
          Math.pow(extracted.bbox.y2 - expected.expectedCoords.y2, 2)
        )
        
        if (distance < closestDistance) {
          closestDistance = distance
          closestMatch = extracted
        }
      })
      
      if (closestMatch && closestDistance < tolerance * 4) {
        console.log(`  Extracted: ${closestMatch.rawBbox}`)
        console.log(`  Distance: ${closestDistance.toFixed(1)} (tolerance: ${tolerance * 4})`)
        console.log(`  Accuracy: ${closestDistance < tolerance * 4 ? '✅ Within tolerance' : '❌ Outside tolerance'}`)
        matchedCount++
      } else {
        console.log(`  ❌ No matching element found`)
      }
    })
    
    console.log(`\n📊 Overall Accuracy: ${matchedCount}/${expectedElements.length} elements matched`)
    
  } catch (error) {
    console.log(`\n⚠️  No expected coordinates file found at ${expectedPath}`)
  }
}

async function testGeminiBoundingBoxes(pdfPath: string) {
  try {
    console.log(`\n🚀 Testing Gemini Bounding Box Extraction`)
    console.log(`PDF: ${pdfPath}\n`)
    
    // Read PDF file
    const pdfBuffer = await fs.readFile(pdfPath)
    const fileName = path.basename(pdfPath)
    
    console.log(`📄 PDF Details:`)
    console.log(`  File: ${fileName}`)
    console.log(`  Size: ${(pdfBuffer.length / 1024).toFixed(1)} KB`)
    
    console.log(`\n🤖 Sending to Gemini for analysis...`)
    const startTime = Date.now()
    
    // Execute prompt using the proper template
    const result = await executeMultimodalPromptWithUsage(geminiBboxTestPrompt, {
      pdfBuffer,
      fileName
    })
    
    const processingTime = Date.now() - startTime
    
    console.log(`\n✅ Gemini Response Received`)
    console.log(`  Processing time: ${(processingTime / 1000).toFixed(1)}s`)
    console.log(`  Tokens used: ${result.usage.totalTokens.toLocaleString()}`)
    console.log(`  Finish reason: ${result.finishReason}`)
    console.log(`  HTML length: ${result.text.length} characters`)
    
    // Extract and analyze bounding boxes
    const elements = await extractBoundingBoxes(result.text)
    await analyzeBoundingBoxes(elements)
    
    // Save raw HTML for inspection
    const outputPath = pdfPath.replace('.pdf', '-gemini-bbox-output.html')
    await fs.writeFile(outputPath, result.text)
    console.log(`\n💾 Raw HTML saved to: ${outputPath}`)
    
    // Summary
    console.log(`\n📋 Summary:`)
    console.log(`  Total elements found: ${elements.length}`)
    console.log(`  Figures: ${elements.filter(e => e.type === 'figure').length}`)
    console.log(`  Tables: ${elements.filter(e => e.type === 'table').length}`)
    console.log(`  Other: ${elements.filter(e => !['figure', 'table'].includes(e.type)).length}`)
    
    // Check for expected coordinates file
    const expectedPath = pdfPath.replace('.pdf', '-expected.json')
    await compareWithExpected(elements, expectedPath)
    
  } catch (error) {
    console.error(`\n❌ Error testing Gemini bounding boxes:`, error)
    process.exit(1)
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    console.log(`Usage: npm run tsx scripts/test-gemini-bounding-boxes.ts <pdf-file>`)
    console.log(`\nExample: npm run tsx scripts/test-gemini-bounding-boxes.ts test-data/sample-academic-paper.pdf`)
    process.exit(1)
  }
  
  const pdfPath = args[0]
  
  // Check if file exists
  try {
    await fs.access(pdfPath)
  } catch {
    console.error(`❌ Error: File not found: ${pdfPath}`)
    process.exit(1)
  }
  
  await testGeminiBoundingBoxes(pdfPath)
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error)
}