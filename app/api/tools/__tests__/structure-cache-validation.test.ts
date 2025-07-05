import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/tools/[toolId]/route'
import { RealRLSTestSetup } from '@/lib/services/database/__tests__/rls-test-helpers'
import { resetRegistryForTests, registerTool } from '@/lib/tools/registry'
import type { Tool } from '@/lib/tools/types'
import { TreeStructure } from '@phosphor-icons/react/dist/ssr'

/**
 * Integration tests for Structure GET cache validation.
 */

describe('Structure tool – cached headings validation', () => {
  const setup = new RealRLSTestSetup()
  const admin = setup.getAdminClient()

  // Register minimal Structure tool so the unified route resolves in test env
  beforeAll(() => {
    resetRegistryForTests()

    const structureTool: Tool = {
      id: 'structure',
      name: 'Structure',
      description: 'Document structure & AI-generated headings',
      category: 'navigation',
      icon: TreeStructure,
      componentPath: '@/components/tools/StructurePanel',
      tabId: 'structure' as any, // Tab value not important for server tests
      requiresDocument: true,
      autoLoad: false,
      capabilities: { realtime: false },
      executorConfig: {
        apiEndpoint: '/api/tools/structure',
        supportedActions: ['get'],
        requiresAuth: false
      }
    }

    registerTool(structureTool)
  })

  afterAll(async () => {
    // Truncate all test data & cleanup clients
    try {
      await admin.rpc('truncate_all')
    } catch (_) {/* ignore in CI */}
    await setup.cleanup()
  })

  /** Helper to hit GET /api/tools/structure */
  async function fetchStructure(documentId: string) {
    const url = `http://localhost:3000/api/tools/structure?action=get&documentId=${documentId}`
    const req = new NextRequest(url, { method: 'GET' })
    return GET(req, { params: { toolId: 'structure' } })
  }

  it('returns 422 MALFORMED_HEADINGS_CACHE when operations is JSON string', async () => {
    // 1. Create doc & ai call & malformed enhancement row
    const doc = await setup.createTestDocument({ created_by: '00000000-0000-0000-0000-000000000001' })
    const aiCall = await setup.createTestAICall({ document_id: doc.id, created_by: doc.created_by })

    await admin.from('document_enhancements').insert({
      document_id: doc.id,
      ai_call_id: aiCall.id,
      type: 'headings',
      subtype: 'default',
      content: { operations: '[{"bad":"schema"}]' }
    })

    // 2. Call route
    const res = await fetchStructure(doc.id)
    expect(res.status).toBe(422)

    const body = await res.json()
    expect(body.code).toBe('MALFORMED_HEADINGS_CACHE')

    const correlationId = res.headers.get('x-spideryarn-correlation-id')
    expect(correlationId).toBeTruthy()
  })

  it('returns cached operations when row is valid', async () => {
    const doc = await setup.createTestDocument({ created_by: '00000000-0000-0000-0000-000000000001' })
    const aiCall = await setup.createTestAICall({ document_id: doc.id, created_by: doc.created_by })

    const validOps = [
      {
        action: 'insert',
        insertNewBeforeExistingId: 'abcd',
        content: { tag_name: 'h2', content: 'Intro' }
      }
    ]

    await admin.from('document_enhancements').insert({
      document_id: doc.id,
      ai_call_id: aiCall.id,
      type: 'headings',
      subtype: 'default',
      content: { operations: validOps }
    })

    const res = await fetchStructure(doc.id)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.cached).toBe(true)
    expect(Array.isArray(body.operations)).toBe(true)
    expect(body.operations.length).toBe(1)
  })
}) 