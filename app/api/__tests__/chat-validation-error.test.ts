import { POST as chatHandler } from '../chat/route'
import { testSecureApiRoute } from '@/lib/testing/api-route-test-utils'
import { isProblemDetail } from '@/lib/api/error-utils'

// Simple unit test to ensure chat endpoint emits RFC 9457 Problem Details on input validation failure

describe('Chat API – Problem Detail error handling', () => {
  it('returns a RFC 9457 Problem Detail for invalid input', async () => {
    const res = await testSecureApiRoute(chatHandler, {
      method: 'POST',
      url: '/api/chat',
      body: {
        // Intentionally missing `messages` and other required fields
      },
      auth: { user: 'USER_A' },
    })

    expect(res.status).toBe(400)
    expect(isProblemDetail(res.body)).toBe(true)
    if (isProblemDetail(res.body)) {
      expect(res.body.type).toBe('/errors/validation')
      expect(res.body.title).toEqual(expect.stringMatching(/invalid request/i))
      expect(res.body).toHaveProperty('correlationId')
    }
  })
}) 