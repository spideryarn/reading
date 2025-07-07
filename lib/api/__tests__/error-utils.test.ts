/**
 * @jest-environment node
 */

import { createProblemDetail, isProblemDetail } from '../error-utils'


describe('error-utils – createProblemDetail()', () => {
  it('serialises Problem Detail and sets correlation header', async () => {
    const res = createProblemDetail({
      type: 'https://example.com/probs/test',
      title: 'Test Error',
      status: 400,
      detail: 'Something went wrong'
    })

    // Status code propagated to response
    expect(res.status).toBe(400)

    // Correlation header exists and is non-empty
    const correlationHeader = res.headers.get('x-spideryarn-correlation-id')
    expect(correlationHeader).toBeTruthy()

    // Body matches ProblemDetail interface
    const body = await res.json()
    expect(isProblemDetail(body)).toBe(true)
    expect(body.type).toBe('https://example.com/probs/test')
    expect(body.title).toBe('Test Error')
    expect(body.status).toBe(400)
    expect(body.correlationId).toBe(correlationHeader)
  })
}) 