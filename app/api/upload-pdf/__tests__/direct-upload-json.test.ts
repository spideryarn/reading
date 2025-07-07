import { POST } from '../route'
import { createSecureMockRequest } from '@/lib/testing/api-route-test-utils'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

// Mock service-role client to return a tiny PDF buffer
jest.mock('@/lib/supabase/service-role')

// Utility: create minimal valid PDF Buffer (%PDF header)
const minimalPdf = Buffer.from('%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF')

function setupServiceRoleMock() {
  // @ts-expect-error – jest mock
  createServiceRoleClient.mockReturnValue({
    storage: {
      from: () => ({
        download: async () => ({ data: new Blob([minimalPdf]), error: null })
      })
    }
  })
}

describe('upload-pdf direct-storage JSON flow', () => {
  it('returns 400 for missing auth', async () => {
    setupServiceRoleMock()
    const req = createSecureMockRequest('/api/upload-pdf', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: {
        bucket: 'documents',
        path: 'test-doc/original/sample.pdf',
        size: minimalPdf.length,
        mime: 'application/pdf',
        provider: 'mistral',
        title: 'sample',
        isPublic: false,
        documentId: '11111111-1111-1111-1111-111111111111'
      }
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
  })
}) 