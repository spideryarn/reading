import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/server-auth'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { DocumentService } from '@/lib/services/database/documents'
import { generateCorrelationId } from '@/lib/services/logger'

const DraftSchema = z.object({
  documentId: z.string().uuid(),
  title: z.string().min(1),
  filename: z.string().optional(),
  isPublic: z.boolean().optional().default(false)
})

export async function POST(request: NextRequest) {
  // const _correlationId = generateCorrelationId() // Currently unused but needed for future logging
  // const _logger = createRequestLogger('/api/create-draft-document', correlationId)
  try {
    const user = await requireAuth()
    const body = await request.json()
    const parsed = DraftSchema.parse(body)

    const supabase = await createClient()
    const docService = new DocumentService(supabase)

    // Check if already exists
    const existing = await docService.getById(parsed.documentId)
    if (existing) {
      return NextResponse.json({ success: true, draftExists: true }, { status: 200 })
    }

    const nowIso = new Date().toISOString()
    const slug = parsed.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || parsed.documentId

    await supabase.from('documents').insert({
      id: parsed.documentId,
      created_by: user.id,
      title: parsed.title,
      slug,
      html_content: '',
      plaintext_content: '',
      is_public: parsed.isPublic,
      original_file_type: 'application/pdf',
      upload_metadata: { draft: true, filename: parsed.filename ?? null },
      is_draft: nowIso
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Draft creation error', error)
    return NextResponse.json({
      error: 'Draft creation failed. Please try again later or contact support if the problem persists.'
    }, {
      status: 500,
      headers: {
        'x-spideryarn-correlation-id': generateCorrelationId()
      }
    })
  }
} 