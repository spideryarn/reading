# Database AI Response Logging Reference

This document complements `AI_RESPONSE_LOGGING.md` by focusing on how AI response logging is stored **in the database** and how to query it effectively.

## ai_calls.raw_api_response (JSONB)

1. Stores the **entire** AI provider response object exactly as returned by the Vercel AI SDK.
2. Includes provider-specific metadata (headers, IDs, timestamps, `experimental_providerMetadata`, etc.).
3. Text content can be accessed via `raw_api_response ->> 'text'`.
4. Size is typically 1 – 10 KB; compresses well.  Monitor with `pg_total_relation_size` if concerned.

### Why JSONB?
• Allows flexible storage of nested objects without a rigid schema.  
• Enables ad-hoc queries on individual keys (e.g. latency, finishReason) while preserving the full payload.

## Latency Tracking (latency_ms)

`latency_ms` is **always** populated.  Calculation priority:

1. `finishTimestamp - startTimestamp` (SDK-supplied)
2. `experimental_providerMetadata.latency`
3. Manual fallback injected by the prompt executor (`manualStartTimestamp`/`manualFinishTimestamp`)

Use this field for performance dashboards; no further calculation needed.

```sql
-- p95 latency per provider over last 7 days
SELECT provider(model_string)               AS provider,
       percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms) AS p95_ms,
       COUNT(*)                            AS calls
FROM ai_calls
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY provider
ORDER BY p95_ms DESC;
```

## Token Usage Columns

`prompt_tokens`, `completion_tokens`, `total_tokens`, `reasoning_tokens` mirror the SDK `usage` object and enable cost analytics.

```sql
-- Daily token usage cost estimate (Anthropic $15 / 1M tokens example)
SELECT date_trunc('day', created_at) AS d,
       SUM(total_tokens)             AS tokens,
       SUM(total_tokens) * 0.000015  AS est_usd
FROM ai_calls
GROUP BY d
ORDER BY d DESC;
```

## Migration History

| Date       | Change                                      |
|------------|---------------------------------------------|
| 2025-07-06 | Added `raw_api_response` (JSONB); dropped `response_text` |
| 2025-07-07 | Manual latency fallback added, ensuring `latency_ms` always populated |

## Query Cheatsheet

```sql
-- Find failed calls with large responses (>20 KB)
SELECT id, octet_length(raw_api_response::text) AS bytes, error_message
FROM ai_calls
WHERE status = 'failed'
  AND octet_length(raw_api_response::text) > 20000
ORDER BY bytes DESC;
```

```sql
-- Compare token usage by prompt_type
SELECT prompt_type,
       AVG(total_tokens)::INT AS avg_tokens,
       MAX(total_tokens)      AS max_tokens,
       COUNT(*)               AS calls
FROM ai_calls
GROUP BY prompt_type
ORDER BY avg_tokens DESC;
```

## Best Practices

• Always inspect `raw_api_response` first when debugging – it contains the ground-truth provider payload.  
• Prefer JSON path operators (`->`, `->>`, `?`) for key extraction rather than casting to text for performance.  
• Use the helper view `vw_ai_calls_costs` (if present) for cost aggregations.

---

_Last updated: 2025-07-07_ 