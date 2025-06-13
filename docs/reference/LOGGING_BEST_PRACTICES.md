# LOGGING_BEST_PRACTICES.md - Logging Strategy for Next.js/Vercel Stack

Practical logging guidance for Spideryarn Reading's prototype-to-production journey.

## See also

- `docs/reference/CODING_GUIDELINES.md` - Current console logging patterns (lines 334-342)
- `app/api/chat/route.ts` and `app/api/summarise/route.ts` - Current logging examples
- [Vercel Log Drains](https://vercel.com/docs/observability/log-drains) - Official documentation
- [Better Stack Logs](https://betterstack.com/logs) - Log management service (formerly Logtail)

## Current State ✓

**Existing patterns work well for development**:
```typescript
console.log('[ComponentName] Action:', { data, timestamp: new Date().toISOString() })
console.error('[ComponentName] Error:', error)
```

**Limitations for production**:
- Vercel logs only retained 1 hour
- No structured JSON output for analysis
- Missing correlation IDs for request tracing

## Recommended Stack

### Pino (Production Logging)
- **5-10x faster** than Winston
- **Next.js compatible** (client + server)
- **Structured JSON** by default
- **Child loggers** for feature separation

### Better Stack Logs (Log Drains)
- **Formerly Logtail**, now part of Better Stack
- **Vercel integration** via marketplace
- **SQL-like queries** for log analysis
- **~$10-20/month** for prototype volume

### Sentry (Error Tracking)
- **Next.js specific** error capture
- **Session replay** for debugging
- **Performance monitoring** for API routes
- **~$26/month** for team plan

## Implementation

### Pino Setup
```typescript
// lib/services/logger.ts
import pino from 'pino'

export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  base: { env: process.env.NODE_ENV },
  timestamp: pino.stdTimeFunctions.isoTime,
})

// Feature-specific loggers
export const aiLogger = logger.child({ component: 'ai' })
export const chatLogger = logger.child({ component: 'chat' })
export const mutationLogger = logger.child({ component: 'mutations' })
```

### API Route Pattern
```typescript
export async function POST(request: NextRequest) {
  const correlationId = crypto.randomUUID()
  const requestLogger = aiLogger.child({ correlationId })
  
  try {
    requestLogger.info('Processing request', { documentId, granularity })
    // ... business logic
    requestLogger.info('Request completed', { tokensUsed, responseTime })
  } catch (error) {
    requestLogger.error('Request failed', { 
      error: error.message,
      documentId 
    })
    // Sentry will also capture this automatically
    throw error
  }
}
```

### AI Operations Logging
```typescript
// Track token usage and costs
aiLogger.info('Summarisation completed', {
  documentId,
  tokensUsed: result.usage.totalTokens,
  modelProvider: 'anthropic',
  responseTime: Date.now() - startTime,
  cacheHit: false
})
```

## Log Drains (Better Stack)

**Purpose**: Forward Vercel logs to permanent storage with search/alerting.

**Setup**:
1. Install via Vercel marketplace: "Better Stack - formerly Logtail"
2. Configure JSON format for structured logs
3. Select sources: Lambda functions, Edge functions

**Cost**: Vercel Pro ($20/month) includes 20GB log drain transfer + Better Stack storage (~$10-20/month)

**Benefits**:
- **Long-term retention** (vs 1 hour in Vercel)
- **SQL-like queries** for debugging
- **Real-time alerts** on error patterns
- **Dashboard visualization** of AI costs/performance

## Sentry Integration

**Purpose**: Error tracking and performance monitoring specifically for Next.js.

**Key features**:
- **Automatic error capture** across client/server/edge
- **Session replay** for user interaction debugging  
- **Performance tracking** for API routes and AI operations
- **Release tracking** for error rate monitoring

**Setup**:
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

**Configuration**:
```typescript
// sentry.server.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% sampling for performance
})
```

## Development vs Production

### Development
- Keep current console patterns
- Use Pino with pretty-printing
- Sentry in development mode (errors only)

### Production  
- Pino with JSON output to Better Stack
- Sentry with session replay enabled
- Log drain forwarding for permanent storage

## Key Logging Contexts

**Always include**:
- `correlationId` - Request tracing
- `userId` - User-scoped debugging
- `documentId` - Document operations
- `component` - Feature identification

**AI-specific**:
- `modelProvider` - anthropic/google
- `tokensUsed` - Cost tracking
- `responseTime` - Performance
- `cacheHit` - Optimization metrics

**Security**:
- Never log API keys, full document content, or personal data
- Log content length instead of actual content
- Use user IDs, not email addresses

## Cost Estimate

**Prototype phase** (~1000 AI operations/month):
- Vercel Pro: $20/month (includes 20GB log drains)
- Better Stack: $10-20/month
- Sentry: $26/month (team plan)
- **Total: ~$60/month**

**Production scale** (~10000 AI operations/month):
- Vercel Pro: $20/month + $10 overage
- Better Stack: $50/month
- Sentry: $80/month (growth plan)
- **Total: ~$160/month**

## Migration Strategy

1. **Phase 1**: Add Sentry for error tracking (immediate)
2. **Phase 2**: Implement Pino alongside current console logging
3. **Phase 3**: Setup Better Stack log drain (pre-production)
4. **Phase 4**: Gradually replace console.log with Pino loggers

This allows gradual adoption without disrupting current development velocity.

## Status

- ✓ **Current console patterns** - Working well for development
- 📋 **Sentry integration** - High priority for error visibility
- 📋 **Pino implementation** - Next step for structured logging
- 📋 **Better Stack setup** - Pre-production requirement