# LOGGING_BEST_PRACTICES.md - Logging Strategy for Next.js/Vercel Stack

Practical logging guidance for Spideryarn Reading's prototype-to-production journey.

## See also

- `lib/services/logger.ts` - Current Pino logger implementation
- `docs/reference/CODING_GUIDELINES.md` - Logging code standards
- `docs/reference/LLM_TRACKING_TOKEN_USAGE_LOGGING.md` - Comprehensive token usage tracking and cost management
- [Vercel Log Drains](https://vercel.com/docs/observability/log-drains) - Official documentation
- [Better Stack Logs](https://betterstack.com/logs) - Log management service (formerly Logtail)
- [Pino Documentation](https://getpino.io/) - Fast JSON logger for Node.js

## Current State ✓ - Pino Implementation Complete

**Stage 6 Complete**: Successfully migrated to Pino structured logging across:
- **11 critical API routes**: extract-url, headings, semantic-search, stripe-webhook, multi-summarise, upload-pdf, tweet-thread, download, glossary, stripe payment APIs
- **6 service layer files**: mutation-engine, stripe services, database services, admin-utils
- **Mixed approach**: Added Pino alongside existing console.log statements for gradual migration

**Current logging approach**:
```typescript
// Structured logging with correlation IDs and context
import { createRequestLogger, generateCorrelationId, logAIOperation } from '@/lib/services/logger'

const correlationId = generateCorrelationId()
const requestLogger = createRequestLogger('/api/extract-url', correlationId)

requestLogger.info({
  userId: user.id,
  userEmail: user.email,
  url: new URL(url).hostname, // Privacy-safe logging
  extractionMethod,
  provider
}, 'URL extraction request initiated')
```

**Benefits achieved**:
- ✓ Structured JSON output for production analysis
- ✓ Correlation IDs for request tracing across services
- ✓ Context-aware logging with user and operation metadata
- ✓ Performance timing and AI operation tracking
- ✓ Security-conscious data logging (IDs only, no sensitive content)

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

### Pino Setup (Implemented)
```typescript
// lib/services/logger.ts - Current implementation
import pino from 'pino'
import { randomUUID } from 'crypto'

export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  base: { 
    env: process.env.NODE_ENV,
    service: 'spideryarn-reading'
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label })
  },
  // Pretty-printing for development, JSON for production
  ...(process.env.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        levelFirst: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname'
      }
    }
  })
})

// Feature-specific child loggers
export const aiLogger = logger.child({ component: 'ai' })
export const chatLogger = logger.child({ component: 'chat' })
export const mutationLogger = logger.child({ component: 'mutation' })
export const authLogger = logger.child({ component: 'auth' })
export const uploadLogger = logger.child({ component: 'upload' })
export const searchLogger = logger.child({ component: 'search' })
```

### API Route Patterns (Implemented)

**Standard API Route Pattern**:
```typescript
// Standard import pattern
import { createRequestLogger, generateCorrelationId, logAIOperation, createTimer } from '@/lib/services/logger'

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId()
  const requestLogger = createRequestLogger('/api/extract-url', correlationId)
  
  try {
    // Validate authentication first
    const user = await validateAuth()
    
    // Log request initiation with structured context
    requestLogger.info({
      userId: user.id,
      userEmail: user.email,
      url: new URL(url).hostname, // Privacy-safe: hostname only
      extractionMethod,
      provider,
      isPublic
    }, 'URL extraction request initiated')
    
    // Performance timing
    const timer = createTimer(requestLogger, 'url-extraction')
    
    // Business logic with step-by-step logging
    requestLogger.info({ step: 1, hostname: new URL(url).hostname }, 'Starting webpage content fetch')
    
    const result = await processRequest()
    
    // Complete timing
    const duration = timer.end({ tokensUsed: result.tokensUsed })
    
    return new NextResponse(JSON.stringify(result))
    
  } catch (error) {
    requestLogger.error({
      step: 1,
      hostname: new URL(url).hostname,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 'Failed to fetch webpage content')
    
    return new NextResponse(error.message, { status: 400 })
  }
}
```

**Mixed Approach (Current Pattern)**:
```typescript
// Hybrid logging during migration
console.log(`Processing URL with extraction: ${url} using ${extractionMethod} method`)
requestLogger.info({
  userId: user.id,
  userEmail: user.email,
  url: new URL(url).hostname,
  extractionMethod,
  provider
}, 'URL extraction request initiated')
```

### AI Operations Logging (Implemented)

**Standard AI Operation Logging**:
```typescript
// Using logAIOperation helper
import { logAIOperation } from '@/lib/services/logger'

// Log AI operation with comprehensive context
logAIOperation('url-content-extraction', {
  modelProvider: provider,
  tokensUsed: result.usage.totalTokens,
  cost: result.usage.totalTokens * 0.001, // Example cost calculation
  userId: user.id,
  documentId: document.id,
  correlationId
}, 'success')

// Error logging
logAIOperation('content-extraction', {
  modelProvider: provider,
  userId: user.id,
  correlationId
}, 'error', error)
```

**AI Call Lifecycle Logging**:
```typescript
// Track complete AI operation lifecycle
aiLogger.info({
  operation: 'content-extraction',
  provider,
  model: modelConfig.model,
  inputTokens: result.usage.inputTokens,
  outputTokens: result.usage.outputTokens,
  totalTokens: result.usage.totalTokens,
  duration: extractionTimer.end(),
  correlationId
}, 'AI content extraction completed')
```

**Multi-step AI Operations**:
```typescript
// Track multi-step AI operations (like multi-summarise)
requestLogger.info({
  step: 'summarisation',
  granularity: level.granularity,
  documentId,
  correlationId
}, `Starting ${level.granularity} summarisation`)

// Log each step with timing
const stepTimer = createTimer(requestLogger, `summarise-${level.granularity}`)
const duration = stepTimer.end({ tokensUsed: result.usage.totalTokens })
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

## Logging Context Patterns (Implemented)

### Request-Level Context
**Always include in API routes**:
```typescript
requestLogger.info({
  correlationId,        // Request tracing across services
  userId: user.id,      // User-scoped debugging  
  userEmail: user.email, // Email for admin debugging (dev only)
  documentId,           // Document operations
  requestPath: '/api/extract-url' // Route identification
}, 'Request message')
```

### AI-Specific Context
**AI operation metadata**:
```typescript
{
  modelProvider: 'anthropic',     // claude/gemini
  model: 'claude-3-haiku-20240307', // Specific model version
  tokensUsed: 1234,              // Cost tracking
  inputTokens: 800,              // Input token count
  outputTokens: 434,             // Output token count
  duration: 2345,                // Performance timing (ms)
  operation: 'content-extraction', // AI operation type
  cacheHit: false                // Optimization metrics
}
```

### Service Layer Context
**Child logger usage**:
```typescript
// Using feature-specific child loggers
mutationLogger.info({ documentId, mutationType: 'apply-headings' }, 'Applying AI headings')
authLogger.info({ userId, action: 'profile-update' }, 'User profile updated')
stripeLogger.info({ customerId, event: 'subscription.created' }, 'Stripe webhook processed')
```

### Security & Privacy Patterns
**Safe data logging (implemented)**:
```typescript
// ✓ Safe: Log IDs and metadata only
{ userId: user.id, documentId, tokensUsed: 1234 }

// ✓ Safe: URL hostname only (no query params)
{ url: new URL(url).hostname }

// ✓ Safe: Truncated search queries
{ searchQuery: query.substring(0, 100) }

// ✓ Safe: Stripe customer ID only (no payment data)
{ customerId: 'cus_abc123', event: 'subscription.created' }

// ✗ Never log: API keys, full content, personal data
// { apiKey: process.env.ANTHROPIC_API_KEY } // NEVER
// { documentContent: fullContent }           // NEVER
// { creditCard: paymentMethod }              // NEVER
```

### Cross-Service Correlation
**Correlation ID passing**:
```typescript
// Pass correlation ID between services
const documentResult = await DocumentService.createWithStorage({
  ...documentData,
  correlationId // Passed to database service
})

// Child services use correlation ID
const dbLogger = logger.child({ 
  component: 'database',
  correlationId,
  operation: 'document-create'
})
```

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

## Utility Functions (Implemented)

### Correlation ID Generation
```typescript
import { generateCorrelationId, createRequestLogger } from '@/lib/services/logger'

// Generate unique correlation ID for request tracing
const correlationId = generateCorrelationId() // Uses crypto.randomUUID()
const requestLogger = createRequestLogger('/api/route', correlationId)
```

### Performance Timing
```typescript
import { createTimer } from '@/lib/services/logger'

// Time operations with automatic logging
const timer = createTimer(requestLogger, 'ai-operation')
// ... do work ...
const duration = timer.end({ additionalContext: 'value' })
// Logs: "ai-operation completed in 1234ms"
```

### AI Operation Helper
```typescript
import { logAIOperation } from '@/lib/services/logger'

// Standardised AI operation logging
logAIOperation('content-extraction', {
  modelProvider: 'anthropic',
  tokensUsed: result.usage.totalTokens,
  userId: user.id,
  documentId,
  correlationId
}, 'success')

// Error logging with context
logAIOperation('summarisation', context, 'error', error)
```

### Request-Level Timing (Implemented)
```typescript
import { createTimer } from '@/lib/services/logger'

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId()
  const requestLogger = createRequestLogger('/api/route', correlationId)
  const requestTimer = createTimer(requestLogger, 'request-name')
  
  try {
    // ... business logic ...
    
    // Complete timing before successful response
    requestTimer.end({
      userId: user.id,
      documentId: result.id,
      additionalContext: 'value',
      correlationId
    })
    
    return NextResponse.json(result)
  } catch (error) {
    // Error handling - timer automatically captures duration if error occurs
  }
}
```

**Implemented in routes:**
- `/api/extract-url` - Complete URL extraction workflow timing
- `/api/upload-pdf` - PDF processing and storage timing  
- `/api/glossary` - Both POST (generation) and DELETE (cleanup) timing

**Benefits:**
- Complete request lifecycle visibility (authentication → processing → response)
- Complements existing operation-specific timing (AI calls, database operations)
- Helps identify bottlenecks between operations
- Provides accurate end-to-end performance metrics

## Migration Strategy ✓ Complete

**Stage 6 - Completed**:
- ✓ **Pino implementation** - Deployed across 11 API routes and 6 services
- ✓ **Mixed approach** - Pino added alongside console.log for safety
- ✓ **Utility functions** - createRequestLogger, logAIOperation, createTimer
- ✓ **Security patterns** - Privacy-safe logging (IDs only, no sensitive data)
- ✓ **Cross-service correlation** - Correlation IDs passed between services

**Next phases**:
1. **Phase 7**: Gradually replace remaining console.log with Pino (ongoing)
2. **Phase 8**: Setup Better Stack log drain (pre-production)
3. **Phase 9**: Add Sentry integration for error tracking

## Current Status ✓

- ✓ **Pino structured logging** - Implemented across critical paths
- ✓ **Correlation ID tracing** - Request tracking across services
- ✓ **AI operation logging** - Token usage, performance, and error tracking
- ✓ **Security-conscious logging** - Privacy-safe data patterns
- ✓ **Performance timing** - Operation duration tracking
- ✓ **Request-level timing** - Added to critical routes (extract-url, upload-pdf, glossary)
- ✓ **Mixed console.log/Pino** - Safe migration approach
- ✓ **Security logging audit** - Comprehensive coverage for sensitive operations
- 📋 **Better Stack setup** - Planned for production
- 📋 **Console.log cleanup** - Gradual replacement ongoing
- 📋 **Sentry integration** - Error tracking enhancement