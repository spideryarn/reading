import pino from 'pino'

// Configure logger for development vs production vs test
export const logger = pino({
  level: process.env.NODE_ENV === 'test' ? 'silent' :
         process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  base: { 
    env: process.env.NODE_ENV,
    service: 'spideryarn-reading'
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => {
      return { level: label }
    }
  },
  // Pretty-printed logs in development mode only (skip in test for performance)
  // Note: Requires serverExternalPackages: ['pino', 'pino-pretty'] in next.config.ts
  // to handle worker thread compatibility with Next.js bundling
  ...(process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        ignore: 'pid,hostname',
        translateTime: 'SYS:standard'
      }
    }
  })
})

// Feature-specific child loggers for better organization
export const aiLogger = logger.child({ component: 'ai' })
export const chatLogger = logger.child({ component: 'chat' })
export const mutationLogger = logger.child({ component: 'mutation' })
export const authLogger = logger.child({ component: 'auth' })
export const uploadLogger = logger.child({ component: 'upload' })
export const searchLogger = logger.child({ component: 'search' })

// Utility functions for common logging patterns
export function generateCorrelationId(): string {
  // Use Node.js crypto module for UUID generation
  // This works in both Node.js and browser environments when properly polyfilled
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  
  // Fallback for test environments or older Node.js versions
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { randomUUID } = require('crypto')
  return randomUUID()
}

export function createRequestLogger(path: string, correlationId?: string) {
  return logger.child({ 
    requestPath: path,
    correlationId: correlationId || generateCorrelationId()
  })
}

// Helper for timing operations (overloaded)
export function createTimer(logger: pino.Logger, operation: string): {
  end: (additionalContext?: Record<string, unknown>) => number
}
export function createTimer(): {
  elapsed: () => number
}
export function createTimer(logger?: pino.Logger, operation?: string) {
  const start = Date.now()
  
  if (logger && operation) {
    // With logger version
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      end: (additionalContext?: Record<string, any>) => {
        const duration = Date.now() - start
        logger.info({
          operation,
          duration,
          ...additionalContext
        }, `${operation} completed in ${duration}ms`)
        return duration
      }
    }
  } else {
    // Without logger version
    return {
      elapsed: () => Date.now() - start
    }
  }
}

// Helper for AI operation logging
export function logAIOperation(
  operation: string,
  context: {
    modelProvider?: string
    tokensUsed?: number
    cost?: number
    userId?: string
    documentId?: string
    correlationId?: string
  },
  result: 'success' | 'error',
  error?: Error
) {
  const logData = {
    operation,
    result,
    ...context,
    timestamp: new Date().toISOString()
  }

  if (result === 'error' && error) {
    aiLogger.error({ ...logData, error: error.message }, `AI operation failed: ${operation}`)
  } else {
    aiLogger.info(logData, `AI operation completed: ${operation}`)
  }
}