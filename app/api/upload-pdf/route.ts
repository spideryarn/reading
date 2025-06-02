// PDF to HTML Conversion API endpoint
// Accepts PDF file uploads and converts them to HTML using Claude 4 Sonnet

import { NextRequest, NextResponse } from 'next/server'
import { convertPdfToBase64Image, validatePdfBuffer } from '@/lib/utils/pdf-converter'
import { executeMultimodalPrompt } from '@/lib/prompts/types'
import { pdfToHtmlPrompt } from '@/lib/prompts/templates/pdf-to-html'

export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData()
    const pdfFile = formData.get('pdf') as File

    if (!pdfFile) {
      return new NextResponse('No PDF file provided', { status: 400 })
    }

    // Convert file to buffer
    const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer())

    // Validate PDF buffer
    const validation = validatePdfBuffer(pdfBuffer)
    if (!validation.valid) {
      return new NextResponse(validation.error, { status: 400 })
    }

    console.log(`Processing PDF: ${pdfFile.name} (${(pdfBuffer.length / 1024).toFixed(1)} KB)`)

    // Convert PDF to base64 images
    const conversionResult = await convertPdfToBase64Image(pdfBuffer)
    
    if (!conversionResult.success) {
      console.error('PDF conversion failed:', conversionResult.error)
      return new NextResponse(`PDF conversion failed: ${conversionResult.error}`, { status: 500 })
    }

    const { images, pageCount } = conversionResult
    if (!images || images.length === 0) {
      return new NextResponse('No pages found in PDF', { status: 400 })
    }

    console.log(`PDF converted to ${pageCount} page(s)`)

    // For single-page constraint, only process the first page
    const firstPageBase64 = images[0]

    // Prepare multimodal message for Claude 4
    const messages = [
      {
        role: 'user' as const,
        content: [
          {
            type: 'image' as const,
            image: firstPageBase64
          },
          {
            type: 'text' as const,
            text: 'Convert this academic PDF page to clean, semantic HTML following the template instructions.'
          }
        ]
      }
    ]

    console.log('Sending PDF to Claude 4 Sonnet for HTML conversion...')

    // Execute the multimodal prompt
    const htmlOutput = await executeMultimodalPrompt(pdfToHtmlPrompt, {
      messages
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