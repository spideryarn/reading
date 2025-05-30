// AI Headings API endpoint for generating semantic document structure
// See planning/250526g_ai_generated_headings.md for implementation details

import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import { executePrompt } from '@/lib/prompts/types'
import { headingsPrompt, headingsPromptInputSchema, headingsResponseSchema } from '@/lib/prompts/templates/headings'

/**
 * Remove all existing headings (h1-h6) from HTML content
 * This ensures the LLM generates a completely fresh heading structure
 */
function removeExistingHeadings(htmlContent: string): string {
  const $ = cheerio.load(htmlContent)
  
  // Remove all heading elements but preserve their content as text
  $('h1, h2, h3, h4, h5, h6').each((_, element) => {
    const $element = $(element)
    const textContent = $element.text()
    
    // Replace heading with a paragraph to preserve content but remove structure
    if (textContent.trim()) {
      $element.replaceWith(`<p>${textContent}</p>`)
    } else {
      $element.remove()
    }
  })
  
  return $.html()
}

/**
 * Log generated headings to console with visual hierarchy
 */
function logHeadingsHierarchy(headings: Array<{ html: string }>): void {
  console.log('\n=== Generated Headings ===')
  headings.forEach((heading) => {
    const match = heading.html.match(/^<h(\d)[^>]*>(.*)<\/h\d>$/)
    if (match) {
      const level = parseInt(match[1])
      const text = match[2]
      const indent = '  '.repeat(level - 1) // Indent based on heading level
      const prefix = `H${level}`
      console.log(`${indent}${prefix}: ${text}`)
    } else {
      console.log(`Invalid heading HTML: ${heading.html}`)
    }
  })
  console.log(`Total headings generated: ${headings.length}`)
  console.log('========================\n')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validationResult = headingsPromptInputSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error },
        { status: 400 }
      )
    }
    
    const { html_content } = validationResult.data
    
    // Remove all existing headings from the HTML
    const cleanedHtml = removeExistingHeadings(html_content)
    
    console.log('Processing headings generation for document...')
    console.log(`Original HTML length: ${html_content.length} characters`)
    console.log(`Cleaned HTML length: ${cleanedHtml.length} characters`)
    
    // Generate headings using LLM
    const llmResponse = await executePrompt(headingsPrompt, { 
      html_content: cleanedHtml
    })
    
    // Parse the JSON response from LLM (strip markdown code blocks if present)
    let jsonString = llmResponse.trim()
    if (jsonString.startsWith('```json')) {
      jsonString = jsonString.slice(7) // Remove ```json
    }
    if (jsonString.startsWith('```')) {
      jsonString = jsonString.slice(3) // Remove ```
    }
    if (jsonString.endsWith('```')) {
      jsonString = jsonString.slice(0, -3) // Remove ending ```
    }
    const parsedResponse = JSON.parse(jsonString.trim())
    
    // Validate the response matches our expected schema
    const validatedResponse = headingsResponseSchema.parse(parsedResponse)
    
    // Log the generated headings hierarchy to console
    logHeadingsHierarchy(validatedResponse.headings)
    
    return NextResponse.json(validatedResponse)
  } catch (error) {
    console.error('Error generating headings:', error)
    return NextResponse.json(
      { error: 'Failed to generate headings' },
      { status: 500 }
    )
  }
}