/* eslint-disable @typescript-eslint/no-explicit-any */
import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database-auto-generated'
import { createRequestLogger } from './logger'

export interface AICallSummary {
  total: number
  missingRaw: number
  missingLatency: number
  avgLatencyMs: number | null | undefined
  p95LatencyMs: number | null | undefined
}

/**
 * Helper class that exposes quick inspection queries for ai_calls.
 * Primarily used by internal dashboards & health-checks.
 */
export class AIResponseInspectionService {
  private logger = createRequestLogger('/services/ai-response-inspection')

  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Fetch high-level summary of recent AI calls (default last 24h)
   */
  async getRecentSummary(hours = 24): Promise<AICallSummary> {
    const since = new Date(Date.now() - hours * 3600 * 1000).toISOString()

    // Note: the ai_calls_summary Postgres function returns a single-row record
    //       with the summary columns.  We intentionally use `any` typing here
    //       because the generated Supabase types do not include custom RPCs.
    const { data, error } = await (this.supabase as any).rpc('ai_calls_summary', { since })

    if (error && error.code === '42883') {
      // Fallback if helper function not present – compute in TypeScript
      return this.computeSummaryFallback(since)
    }

    if (error) throw new Error(`Failed to fetch AI calls summary: ${error.message}`)

    if (!data || data.length === 0) {
      return { total: 0, missingRaw: 0, missingLatency: 0, avgLatencyMs: null, p95LatencyMs: null }
    }

    const row = data[0] as Record<string, unknown>

    const summary = {
      total: Number((row as any).total ?? 0),
      missingRaw: Number((row as any).missing_raw ?? 0),
      missingLatency: Number((row as any).missing_latency ?? 0),
      avgLatencyMs: typeof (row as any).avg_latency_ms === 'number' ? (row as any).avg_latency_ms : null,
      p95LatencyMs: typeof (row as any).p95_latency_ms === 'number' ? (row as any).p95_latency_ms : null,
    }

    return summary as AICallSummary
  }

  /**
   * Compute summary purely in the application (slower but portable).
   */
  private async computeSummaryFallback(since: string): Promise<AICallSummary> {
    const { data, error } = await this.supabase
      .from('ai_calls')
      .select('latency_ms, raw_api_response')
      .gte('created_at', since)

    if (error) throw new Error(`Failed to query ai_calls for fallback summary: ${error.message}`)

    const total = data!.length
    let missingRaw = 0
    let missingLatency = 0
    const latencies: number[] = []

    for (const row of data!) {
      if (!row.raw_api_response) missingRaw++
      if (row.latency_ms === null) missingLatency++
      else latencies.push(row.latency_ms as number)
    }

    latencies.sort((a, b) => a - b)
    const avgLatencyMs = latencies.length ? Math.round(latencies.reduce((s, x) => s + x, 0) / latencies.length) : null
    const p95LatencyMs = latencies.length ? latencies[Math.floor(latencies.length * 0.95)] : null

    return { total, missingRaw, missingLatency, avgLatencyMs, p95LatencyMs }
  }
} 