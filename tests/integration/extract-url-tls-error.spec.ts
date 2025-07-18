/**
 * @jest-environment node
 */
import { POST } from '@/app/api/extract-url/route'
import { createSecureMockRequest } from '@/lib/testing/api-route-test-utils'

// This test performs a real network request to a PDF hosted on a server with an
// incomplete TLS certificate chain. The backend should surface this as a
// `/errors/fetch` Problem Detail with `detail` containing "fetch failed".

// Allow more time for the network request to fail
jest.setTimeout(30000)

describe('extract-url – TLS error reproduction', () => {
  const pdfUrl = 'https://www.sas.upenn.edu/~cavitch/pdf-library/Nagel_Bat.pdf'

  it('returns a fetch error when the remote certificate chain is incomplete', async () => {
    const req = createSecureMockRequest('http://localhost/api/extract-url', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: { url: pdfUrl },
      // Authenticate as a known test user so requireAuth passes without touching the real DB
      auth: { user: 'USER_A' }
    })

    const res = await POST(req)

    expect(res.status).toBe(502)

    const body = await res.json()

    // RFC 9457 Problem Detail shape
    expect(body).toMatchObject({
      type: '/errors/invalid-certificate-chain',
      title: 'Remote certificate chain incomplete'
    })

    // The underlying undici error message should bubble up in `detail`
    expect(body.detail).toMatch(/certificate chain/i)
  })
}) 