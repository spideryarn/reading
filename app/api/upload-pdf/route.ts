// PDF to HTML Conversion API endpoint
// Accepts PDF file uploads and converts them to HTML using Claude or Gemini APIs
// Uses direct PDF processing via Anthropic/Google APIs (no image conversion)

import { NextRequest, NextResponse } from 'next/server'
import { executeMultimodalPrompt } from '@/lib/prompts/types'
import { pdfToHtmlDirectPrompt } from '@/lib/prompts/templates/pdf-to-html-direct'
import { pdfToHtmlGeminiPrompt } from '@/lib/prompts/templates/pdf-to-html-gemini'

export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData()
    const pdfFile = formData.get('pdf') as File
    const provider = (formData.get('provider') as string) || 'claude' // Default to Claude

    if (!pdfFile) {
      return new NextResponse('No PDF file provided', { status: 400 })
    }

    // Validate provider selection
    if (!['claude', 'gemini'].includes(provider)) {
      return new NextResponse('Invalid provider. Must be "claude" or "gemini"', { status: 400 })
    }

    // Convert file to buffer
    const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer())
    
    // Basic PDF validation
    if (pdfBuffer.length === 0) {
      return new NextResponse('PDF file is empty', { status: 400 })
    }

    // Check file size (32MB limit for Claude API)
    const maxSize = 32 * 1024 * 1024 // 32MB
    if (pdfBuffer.length > maxSize) {
      return new NextResponse('PDF file too large (max 32MB for Claude direct processing)', { status: 400 })
    }

    // Check if it's actually a PDF by looking at the header
    const pdfHeader = pdfBuffer.subarray(0, 4).toString()
    if (pdfHeader !== '%PDF') {
      return new NextResponse('File is not a valid PDF', { status: 400 })
    }

    console.log(`Processing PDF directly: ${pdfFile.name} (${(pdfBuffer.length / 1024).toFixed(1)} KB) using ${provider}`)

    // Select the appropriate prompt template based on provider
    const promptTemplate = provider === 'gemini' ? pdfToHtmlGeminiPrompt : pdfToHtmlDirectPrompt
    const providerDisplayName = provider === 'gemini' ? 'Gemini 1.5 Pro' : 'Claude 4 Sonnet'
    
    console.log(`Sending PDF directly to ${providerDisplayName} for HTML conversion...`)

    // Execute the direct PDF prompt (multi-page support enabled)
    const htmlOutput = await executeMultimodalPrompt(promptTemplate, {
      pdfBuffer,
      fileName: pdfFile.name,
      singlePageOnly: false // Multi-page processing enabled
    })

    console.log('HTML conversion completed successfully')

    // Return the raw HTML
    return new NextResponse(htmlOutput, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      }
    })

  } catch (error) {
    console.error('PDF upload API error:', error)
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('rate limit') || error.message.includes('quota')) {
        return new NextResponse('API rate limit exceeded. Please try again later.', { status: 429 })
      }
      
      if (error.message.includes('API key') || error.message.includes('authentication')) {
        return new NextResponse('AI service configuration error. Please check API keys.', { status: 503 })
      }
      
      if (error.message.includes('timeout')) {
        return new NextResponse('Request timeout. The PDF may be too complex or the service is busy.', { status: 504 })
      }
      
      return new NextResponse(`Conversion error: ${error.message}`, { status: 500 })
    }
    
    return new NextResponse('Unknown conversion error occurred', { status: 500 })
  }
}

// Add CORS headers if needed for development
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}