/**
 * Real-time Subscription POC
 * 
 * This endpoint demonstrates real-time document enhancement updates.
 * It simulates AI processing that generates enhancements over time,
 * which can be observed in real-time via Supabase subscriptions.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { DocumentService } from '@/lib/services/database/documents'
import { AiCallService } from '@/lib/services/database/ai-calls'
import { EnhancementService } from '@/lib/services/database/enhancements'
import { getModelForAICall } from '@/lib/config'
import { requireAuth } from '@/lib/auth/server-auth'
import type { HeadingOperation } from '@/lib/prompts/schemas/headings'

export async function POST(request: NextRequest) {
  try {
    // Validate authentication first
    const user = await requireAuth({ allowBearer: true, request })
    
    const { documentId } = await request.json()
    
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient(request, { allowBearer: true })
    const documentService = new DocumentService(supabase)
    const aiCallService = new AiCallService(supabase)
    const enhancementService = new EnhancementService(supabase)

    // Get document
    const document = await documentService.getById(documentId)
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Get model configuration for AI call tracking
    const { modelString } = getModelForAICall()

    // Simulate generating multiple enhancements over time
    const simulateEnhancements = async () => {
      // 1. Start with a summary (immediate)
      const summaryCall = await aiCallService.startCallWithModelString({
        userId: user.id,
        documentId,
        modelString: modelString,
        prompt_type: 'summarise',
        input_data: { content_length: document.plaintext_content?.length || 0 }
      })

      await enhancementService.storeSummary(
        documentId,
        summaryCall!.id,
        {
          text: 'Initial summary being generated...',
          keyPoints: [],
          metadata: { status: 'processing' }
        },
        'sentence'
      )

      // 2. Update summary after 2 seconds
      setTimeout(async () => {
        // TODO: Fix completeCall method signature - temporarily disabled for deployment
        /*
        await aiCallService.completeCall(
          summaryCall!.id,
          'This document contains important content that is being analysed.',
          {
            promptTokens: 50,
            completionTokens: 15,
            totalTokens: 65,
            latencyMs: 2000
          }
        )
        */

        await enhancementService.storeSummary(
          documentId,
          summaryCall!.id,
          {
            text: 'This document contains important content that is being analysed.',
            keyPoints: ['Important content', 'Being analysed'],
            metadata: { status: 'complete', confidence: 0.92 }
          },
          'sentence'
        )
      }, 2000)

      // 3. Generate glossary after 4 seconds
      setTimeout(async () => {
        const glossaryCall = await aiCallService.startCallWithModelString({
          userId: user.id,
          documentId,
          modelString: modelString,
          prompt_type: 'glossary',
          input_data: { content_length: document.plaintext_content?.length || 0 }
        })

        await enhancementService.storeGlossary(
          documentId,
          glossaryCall!.id,
          {
            entities: [
              {
                name: 'Document',
                ontology: 'concept',
                aliases: [],
                brief_explanation: 'A written or digital record containing information'
              },
              {
                name: 'Enhancement',
                ontology: 'concept', 
                aliases: [],
                brief_explanation: 'An improvement or addition to existing content'
              }
            ],
            metadata: { extractedTerms: 2 }
          }
        )

        await aiCallService.completeCall(
          glossaryCall!.id,
          {
            output_data: { message: 'Glossary extracted successfully' },
            usage: {
              promptTokens: 100,
              completionTokens: 50,
              totalTokens: 150
            }
          }
        )
      }, 4000)

      // 4. Generate headings after 6 seconds
      setTimeout(async () => {
        const headingsCall = await aiCallService.startCallWithModelString({
          userId: user.id,
          documentId,
          modelString: modelString,
          prompt_type: 'headings',
          input_data: { content_length: document.plaintext_content?.length || 0 }
        })

        // Store heading operations directly in new native format
        const headingOperations: HeadingOperation[] = [
          {
            action: 'insert',
            insertNewBeforeExistingId: 'ai-h1', // In real usage this would reference an existing element ID
            content: { tag_name: 'h1', content: 'Document Overview' }
          },
          {
            action: 'insert',
            insertNewBeforeExistingId: 'ai-h1',
            content: { tag_name: 'h2', content: 'Key Concepts' }
          },
          {
            action: 'insert',
            insertNewBeforeExistingId: 'ai-h1',
            content: { tag_name: 'h2', content: 'Technical Details' }
          }
        ]

        await enhancementService.upsert({
          documentId,
          aiCallId: headingsCall!.id,
          type: 'headings',
          subtype: 'default',
          content: {
            operations: headingOperations as unknown as import('@/lib/types/json').JsonValue,
            iteration_metadata: {
              iteration_count: 1,
              total_operations: headingOperations.length,
              last_changes: 'Initial headings',
              more_changes_required: false,
              last_updated: new Date().toISOString()
            }
          }
        })

        await aiCallService.completeCall(
          headingsCall!.id,
          {
            output_data: { message: 'Headings generated' },
            usage: {
              promptTokens: 80,
              completionTokens: 40,
              totalTokens: 120
            }
          }
        )
      }, 6000)
    }

    // Start the simulation
    simulateEnhancements()

    return NextResponse.json({
      message: 'Real-time enhancement simulation started',
      documentId,
      instructions: [
        'Subscribe to document enhancements using the real-time helper:',
        '',
        'import { subscribeToDocumentEnhancements } from "@/lib/supabase/realtime"',
        '',
        `const subscription = subscribeToDocumentEnhancements(supabase, "${documentId}", (payload) => {`,
        '  console.log("Enhancement updated:", payload)',
        '})',
        '',
        'Enhancements will be generated over the next 6 seconds:',
        '- 0s: Initial summary (processing)',
        '- 2s: Summary complete',
        '- 4s: Glossary generated',
        '- 6s: AI headings generated'
      ]
    })

  } catch (error) {
    console.error('Realtime demo error:', error)
    
    // Handle authentication errors
    if (error instanceof Error && (error.message.includes('Authentication failed') || error.message.includes('User not authenticated'))) {
      return new NextResponse('Authentication required', { status: 401 })
    }
    
    return NextResponse.json(
      { error: 'Failed to start realtime demo' },
      { status: 500 }
    )
  }
}