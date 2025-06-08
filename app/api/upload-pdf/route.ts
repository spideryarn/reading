// PDF Upload and Processing API endpoint
// Accepts PDF file uploads, stores original in Supabase Storage, converts to HTML using Claude or Gemini APIs,
// and stores the complete document record in the database
// Uses direct PDF processing via Anthropic/Google APIs (no image conversion)

import { NextRequest, NextResponse } from 'next/server'
import { executeMultimodalPromptWithUsage } from '@/lib/prompts/types'
import { createPdfToHtmlPrompt } from '@/lib/prompts/templates/pdf-to-html-direct'
import { createClient } from '@/lib/supabase/server'
import { DocumentService } from '@/lib/services/database/documents'
import { generateSlug } from '@/lib/utils/slug'
import { validateAuth } from '@/lib/auth/server-auth'

export async function POST(request: NextRequest) {
  try {
    // Validate authentication first
    const user = await validateAuth()
    
    // Parse multipart form data
    const formData = await request.formData()
    const pdfFile = formData.get('pdf') as File
    const provider = (formData.get('provider') as string) || 'claude' // Default to Claude
    const title = (formData.get('title') as string) || pdfFile?.name?.replace('.pdf', '') || 'Untitled Document'

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

    // Check file size (32MB limit for Claude API, 50MB for storage)
    const maxApiSize = 32 * 1024 * 1024 // 32MB for API
    const maxStorageSize = 50 * 1024 * 1024 // 50MB for storage
    
    if (pdfBuffer.length > maxStorageSize) {
      return new NextResponse('PDF file too large (max 50MB)', { status: 400 })
    }
    
    if (pdfBuffer.length > maxApiSize) {
      return new NextResponse('PDF file too large for AI processing (max 32MB for Claude direct processing)', { status: 400 })
    }

    // Check if it's actually a PDF by looking at the header
    const pdfHeader = pdfBuffer.subarray(0, 4).toString()
    if (pdfHeader !== '%PDF') {
      return new NextResponse('File is not a valid PDF', { status: 400 })
    }

    console.log(`Processing PDF with storage integration: ${pdfFile.name} (${(pdfBuffer.length / 1024).toFixed(1)} KB) using ${provider}`)

    // Initialize Supabase client and document service
    const supabase = await createClient()
    const documentService = new DocumentService(supabase)

    // Generate slug for the document
    const slug = generateSlug(title)

    // Create provider-specific prompt template with appropriate model configuration
    const promptTemplate = createPdfToHtmlPrompt(provider)
    const providerDisplayName = provider === 'gemini' ? 'Gemini 1.5 Pro' : 'Claude 4 Sonnet'
    
    console.log(`Step 1: Converting PDF to HTML using ${providerDisplayName}...`)

    // Execute the direct PDF prompt (multi-page support enabled)
    const htmlResult = await executeMultimodalPromptWithUsage(promptTemplate, {
      pdfBuffer,
      fileName: pdfFile.name,
      singlePageOnly: false // Multi-page processing enabled
    })

    console.log('Step 2: HTML conversion completed, extracting plaintext...')

    // Extract plaintext from HTML for search and word count
    const plaintext = htmlResult.text
      .replace(/<[^>]*>/g, ' ') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()

    console.log('Step 3: Creating document with storage integration...')

    // Create document with storage integration using authenticated user
    const { document, storageResult } = await documentService.createWithStorage(
      user.id,
      {
        title,
        html_content: htmlResult.text,
        plaintext_content: plaintext,
        slug,
        source_url: null,
        is_public: false,
        word_count: plaintext.split(/\s+/).length
      },
      pdfFile, // Original file for storage
      pdfFile.name // Original filename
    )

    console.log(`Step 4: Document created successfully with ID: ${document.id}`)
    
    if (storageResult) {
      console.log(`Step 5: Original PDF stored at: ${storageResult.path}`)
    } else {
      console.warn('Step 5: Storage upload failed, but document was created without original file')
    }

    // Return comprehensive response with document details
    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        title: document.title,
        slug: document.slug,
        html_content: document.html_content,
        plaintext_content: document.plaintext_content,
        word_count: document.word_count,
        has_original_file: !!document.storage_path,
        original_file_type: document.original_file_type,
        created_at: document.created_at
      },
      storage: storageResult ? {
        path: storageResult.path,
        size: storageResult.size,
        mime_type: storageResult.mimeType
      } : null,
      processing: {
        provider: providerDisplayName,
        file_size_kb: Math.round(pdfBuffer.length / 1024)
      }
    }, {
      status: 201,
      headers: {
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
    console.error('PDF upload API error:', error)
    
    // Handle authentication errors first
    if (error instanceof Error) {
      if (error.message.includes('Authentication failed') || error.message.includes('User not authenticated')) {
        return new NextResponse('Authentication required', { status: 401 })
      }
      
      if (error.message.includes('rate limit') || error.message.includes('quota')) {
        return new NextResponse('AI service rate limit exceeded. Please try again later.', { status: 429 })
      }
      
      if (error.message.includes('API key') || error.message.includes('authentication')) {
        return new NextResponse('AI service configuration error. Please check API keys.', { status: 503 })
      }
      
      if (error.message.includes('timeout')) {
        return new NextResponse('Request timeout. The PDF may be too complex or the service is busy.', { status: 504 })
      }

      if (error.message.includes('storage') || error.message.includes('bucket')) {
        return new NextResponse('Storage service error. Please try again later.', { status: 503 })
      }

      if (error.message.includes('database') || error.message.includes('Failed to create document')) {
        return new NextResponse('Database error. Please try again later.', { status: 503 })
      }
      
      return new NextResponse(`Processing error: ${error.message}`, { status: 500 })
    }
    
    return new NextResponse('Unknown processing error occurred', { status: 500 })
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