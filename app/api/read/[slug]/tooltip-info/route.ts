// Document Tooltip Information API endpoint
// Provides source info, reading time, and summary for document list tooltips

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { DocumentService } from '@/lib/services/database/documents'
import { EnhancementService } from '@/lib/services/database/enhancements'
import { requireAuth } from '@/lib/auth/server-auth'
import { getCurrentUserAdminStatus } from '@/lib/auth/admin-utils'
import { createRequestLogger, generateCorrelationId } from '@/lib/services/logger'
import { calculateReadingTimeFromWordCount, formatReadingTime } from '@/lib/utils/reading-time-calculation'

interface RouteContext {
  params: Promise<{ slug: string }>
}

interface TooltipInfo {
  sourceInfo: string
  readingTime: string
  summary: string | null
  hasSummary: boolean
}

// Removed - now using centralized calculateReadingTimeFromElements

function formatSourceInfo(document: { original_file_type?: string | null; source_url?: string | null }): string {
  const parts: string[] = []
  
  // Add file type info
  if (document.original_file_type) {
    if (document.original_file_type === 'application/pdf') {
      parts.push('PDF')
    } else if (document.original_file_type === 'text/html') {
      parts.push('HTML')
    } else {
      parts.push(document.original_file_type.split('/')[1]?.toUpperCase() || 'File')
    }
  } else {
    parts.push('HTML')
  }
  
  // Add source URL if available (truncated)
  if (document.source_url) {
    try {
      const url = new URL(document.source_url)
      const hostname = url.hostname.replace(/^www\./, '')
      parts.push(`from ${hostname}`)
    } catch {
      // If URL parsing fails, just show that it was extracted from web
      parts.push('from web')
    }
  }
  
  return parts.join(' ')
}

export async function GET(request: NextRequest, context: RouteContext) {
  const correlationId = generateCorrelationId()
  const requestLogger = createRequestLogger('/api/read/[slug]/tooltip-info', correlationId)
  
  try {
    // Validate authentication first
    const user = await requireAuth({ allowBearer: true, request })
    
    const { slug } = await context.params

    if (!slug) {
      return NextResponse.json(
        { error: 'Document slug is required' },
        { status: 400 }
      )
    }

    requestLogger.info({
      method: 'GET',
      documentSlug: slug,
      userId: user.id,
      correlationId
    }, 'Document tooltip info request initiated')

    // Initialize Supabase client and services
    const supabase = await getSupabaseServerClient(request, { allowBearer: true })
    const documentService = new DocumentService(supabase)
    const enhancementService = new EnhancementService(supabase)

    // Get document by slug
    const document = await documentService.getBySlug(slug)
    
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Document parsing is not needed for tooltip info since we use word_count from database
    // Elements parsing was removed to simplify the tooltip API and use database word_count directly

    // Check if user can access the document (owner or admin or public document)
    const isOwned = await documentService.isOwnedByUser(document.id, user.id)
    const adminStatus = await getCurrentUserAdminStatus()
    
    if (!isOwned && !adminStatus.isAdmin && !document.is_public) {
      requestLogger.warn({
        correlationId,
        documentId: document.id,
        userId: user.id
      }, 'Access denied - user cannot access private document')
      
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Calculate reading time using the exact same machinery as MetadataPanel
    let readingTimeResult
    try {
      readingTimeResult = await calculateReadingTimeFromWordCount(document.word_count || 0, document.id, supabase)
    } catch (error) {
      console.error(`Reading time calculation failed for document ${document.id}:`, error)
      throw new Error(`Reading time calculation failed for document ${document.id}: ${error instanceof Error ? error.message : 'Unknown reading time calculation error'}`)
    }

    // Check for existing multi-dimensional summary (same as metadata tab)
    let summary: string | null = null
    let hasSummary = false
    
    try {
      const multiSummary = await enhancementService.getMultiSummary(document.id)
      
      if (multiSummary) {
        // Use intermediate level, sentence_or_two length (good for tooltips)
        summary = multiSummary.intermediate?.sentence_or_two || 
                 multiSummary.beginner?.sentence_or_two || 
                 null
        hasSummary = !!summary
      }
    } catch (error) {
      console.error(`Failed to fetch multi-dimensional summary for document ${document.id}:`, error)
      throw new Error(`Summary fetch failed for document ${document.id}: ${error instanceof Error ? error.message : 'Unknown summary fetch error'}`)
    }

    // Prepare tooltip information (using exact same machinery as metadata tab)
    const tooltipInfo: TooltipInfo = {
      sourceInfo: formatSourceInfo(document),
      readingTime: formatReadingTime(readingTimeResult.readingTimeMinutes),
      summary,
      hasSummary
    }

    requestLogger.info({
      correlationId,
      documentId: document.id,
      sourceInfo: tooltipInfo.sourceInfo,
      readingTime: tooltipInfo.readingTime,
      hasSummary: tooltipInfo.hasSummary
    }, 'Tooltip info generated successfully')

    return NextResponse.json(tooltipInfo)

  } catch (error) {
    console.error('Tooltip info API error:', error)
    
    requestLogger.error({
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, 'Tooltip info API error occurred')
    
    if (error instanceof Error) {
      // Handle authentication errors
      if (error.message.includes('Authentication failed') || error.message.includes('User not authenticated')) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }
      
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        )
      }
      
      return NextResponse.json(
        { error: `Tooltip info error: ${error.message}` },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'Unknown tooltip info error occurred' },
      { status: 500 }
    )
  }
}