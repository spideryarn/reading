import { createProblemDetail } from '@/lib/api/error-utils'

export async function POST() {
  return createProblemDetail({
    type: 'https://www.spideryarn.com/probs/fake-error',
    title: 'Simulated error',
    status: 500,
    detail: 'This is a simulated error for testing purposes.'
  })
}