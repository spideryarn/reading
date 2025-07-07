import { useErrorNotifications, ProblemDetail } from '@/lib/context/error-context'

/**
 * Hook returning helper to fetch with ProblemDetail error handling.
 * Usage:
 *   const { fetchJson } = useApiErrorHandler()
 *   const data = await fetchJson('/api/foo', { method: 'POST', body: JSON.stringify({}) })
 */
export function useApiErrorHandler() {
  const { showProblemDetail } = useErrorNotifications()

  async function fetchJson<T = unknown>(input: RequestInfo, init?: RequestInit): Promise<T> {
    const res = await fetch(input, {
      headers: { 'Content-Type': 'application/json', ...(init?.headers as any) },
      ...init,
    })

    if (!res.ok) {
      let problem: ProblemDetail | null = null
      try {
        const json = await res.json()
        problem = json as ProblemDetail
      } catch (_) {
        // ignore parse errors
      }
      if (problem && problem.correlationId) {
        showProblemDetail(problem)
      }
      throw new Error(problem?.title || `Request failed with status ${res.status}`)
    }

    return (await res.json()) as T
  }

  return { fetchJson }
} 