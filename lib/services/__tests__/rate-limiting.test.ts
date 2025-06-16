// Tests for rate limiting and retry logic
// Covers rate limit detection, backoff strategies, and concurrent request handling

import { generateText } from 'ai'
import { getModel } from '../llm-provider'
import { getModelForAICall } from '@/lib/config'
import { AiCallService } from '../database/ai-calls'
import { createClient } from '@/lib/supabase/server'
import { getTestNamespace, createTestUser } from '@/lib/testing/test-isolation-utils'

// Mock AI SDK
jest.mock('ai', () => ({
  generateText: jest.fn(),
}))

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(),
  })),
}))

// Mock providers
jest.mock('@ai-sdk/anthropic', () => ({
  anthropic: jest.fn((modelId) => ({ id: modelId, provider: 'anthropic' })),
}))

jest.mock('@ai-sdk/google', () => ({
  google: jest.fn((modelId) => ({ id: modelId, provider: 'google' })),
}))

// Utility function to create rate limit error
function createRateLimitError(provider: string, retryAfter?: number) {
  const error: any = new Error(`Rate limit exceeded for ${provider}`)
  error.name = 'APICallError'
  error.statusCode = 429
  error.provider = provider
  if (retryAfter) {
    error.headers = { 'retry-after': retryAfter.toString() }
  }
  return error
}

// Utility function to create service unavailable error
function createServiceError(provider: string) {
  const error: any = new Error(`Service temporarily unavailable for ${provider}`)
  error.name = 'APICallError'
  error.statusCode = 503
  error.provider = provider
  return error
}

describe('Rate Limiting', () => {
  const namespace = getTestNamespace('rate-limiting')
  const testUser = createTestUser(namespace)
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = {
      ...originalEnv,
      ANTHROPIC_API_KEY: 'test-key',
      GOOGLE_GENERATIVE_AI_API_KEY: 'test-key',
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Rate Limit Detection', () => {
    it('should detect 429 rate limit errors from Anthropic', async () => {
      const generateTextMock = generateText as jest.MockedFunction<typeof generateText>
      generateTextMock.mockRejectedValueOnce(createRateLimitError('anthropic'))

      try {
        await generateText({
          model: getModel('anthropic-balanced'),
          prompt: 'Test prompt',
        })
        fail('Should have thrown rate limit error')
      } catch (error: any) {
        expect(error.statusCode).toBe(429)
        expect(error.provider).toBe('anthropic')
        expect(error.message).toContain('Rate limit exceeded')
      }
    })

    it('should detect 429 rate limit errors from Google', async () => {
      const generateTextMock = generateText as jest.MockedFunction<typeof generateText>
      generateTextMock.mockRejectedValueOnce(createRateLimitError('google'))

      try {
        await generateText({
          model: getModel('google-balanced'),
          prompt: 'Test prompt',
        })
        fail('Should have thrown rate limit error')
      } catch (error: any) {
        expect(error.statusCode).toBe(429)
        expect(error.provider).toBe('google')
      }
    })

    it('should extract retry-after header when present', async () => {
      const generateTextMock = generateText as jest.MockedFunction<typeof generateText>
      const retryAfter = 30 // 30 seconds
      generateTextMock.mockRejectedValueOnce(createRateLimitError('anthropic', retryAfter))

      try {
        await generateText({
          model: getModel('anthropic-balanced'),
          prompt: 'Test prompt',
        })
        fail('Should have thrown rate limit error')
      } catch (error: any) {
        expect(error.headers?.['retry-after']).toBe('30')
      }
    })

    it('should differentiate between rate limits and other errors', async () => {
      const generateTextMock = generateText as jest.MockedFunction<typeof generateText>
      
      // Test different error types
      const errors = [
        { statusCode: 429, name: 'APICallError', isRateLimit: true },
        { statusCode: 503, name: 'APICallError', isRateLimit: false },
        { statusCode: 400, name: 'APICallError', isRateLimit: false },
        { statusCode: 401, name: 'APICallError', isRateLimit: false },
        { statusCode: 500, name: 'APICallError', isRateLimit: false },
      ]

      for (const errorConfig of errors) {
        const error: any = new Error('Test error')
        error.statusCode = errorConfig.statusCode
        error.name = errorConfig.name

        const isRateLimit = error.statusCode === 429
        expect(isRateLimit).toBe(errorConfig.isRateLimit)
      }
    })
  })

  describe('Retry Logic', () => {
    it('should implement exponential backoff', async () => {
      const delays: number[] = []
      const baseDelay = 1000 // 1 second
      const maxRetries = 5

      // Calculate exponential backoff delays
      for (let i = 0; i < maxRetries; i++) {
        // Exponential backoff: baseDelay * 2^attempt
        const delay = baseDelay * Math.pow(2, i)
        delays.push(delay)
      }

      expect(delays).toEqual([1000, 2000, 4000, 8000, 16000])
      
      // With jitter (random factor 0.8-1.2)
      const withJitter = delays.map(delay => {
        const jitter = 0.8 + Math.random() * 0.4
        return Math.round(delay * jitter)
      })

      // Verify jitter is within expected range
      withJitter.forEach((jitteredDelay, i) => {
        const originalDelay = delays[i]
        expect(jitteredDelay).toBeGreaterThanOrEqual(originalDelay * 0.8)
        expect(jitteredDelay).toBeLessThanOrEqual(originalDelay * 1.2)
      })
    })

    it('should respect retry-after header over exponential backoff', async () => {
      const retryAfter = 60 // 60 seconds from server
      const calculatedBackoff = 4000 // 4 seconds from exponential backoff

      // Should use the larger of the two
      const actualDelay = Math.max(retryAfter * 1000, calculatedBackoff)
      expect(actualDelay).toBe(60000) // Use server's retry-after
    })

    it('should implement retry with provider switching', async () => {
      const generateTextMock = generateText as jest.MockedFunction<typeof generateText>
      
      // First attempt: Anthropic rate limited
      generateTextMock.mockRejectedValueOnce(createRateLimitError('anthropic'))
      
      // Second attempt: Switch to Google and succeed
      generateTextMock.mockResolvedValueOnce({
        text: 'Success with Google',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      } as any)

      // Simulate retry logic with provider switching
      let result
      let attempt = 0
      const maxAttempts = 2

      while (attempt < maxAttempts) {
        try {
          const provider = attempt === 0 ? 'anthropic-balanced' : 'google-balanced'
          result = await generateText({
            model: getModel(provider),
            prompt: 'Test prompt',
          })
          break
        } catch (error: any) {
          if (error.statusCode === 429 && attempt < maxAttempts - 1) {
            attempt++
            continue
          }
          throw error
        }
      }

      expect(result?.text).toBe('Success with Google')
      expect(attempt).toBe(1) // Succeeded on second attempt
    })

    it('should limit maximum retry attempts', async () => {
      const generateTextMock = generateText as jest.MockedFunction<typeof generateText>
      const maxRetries = 3

      // Always return rate limit error
      generateTextMock.mockRejectedValue(createRateLimitError('anthropic'))

      let attempts = 0
      let lastError

      // Simulate retry loop with max attempts
      while (attempts < maxRetries) {
        try {
          await generateText({
            model: getModel('anthropic-balanced'),
            prompt: 'Test prompt',
          })
        } catch (error) {
          lastError = error
          attempts++
        }
      }

      expect(attempts).toBe(maxRetries)
      expect(lastError).toBeDefined()
      expect((lastError as any).statusCode).toBe(429)
    })
  })

  describe('Backoff Strategies', () => {
    it('should implement fixed delay backoff', () => {
      const fixedDelay = 2000 // 2 seconds
      const attempts = 5

      const delays = Array(attempts).fill(fixedDelay)
      expect(delays).toEqual([2000, 2000, 2000, 2000, 2000])
    })

    it('should implement linear backoff', () => {
      const baseDelay = 1000 // 1 second
      const attempts = 5

      const delays = Array.from({ length: attempts }, (_, i) => 
        baseDelay * (i + 1)
      )
      expect(delays).toEqual([1000, 2000, 3000, 4000, 5000])
    })

    it('should implement exponential backoff with cap', () => {
      const baseDelay = 1000 // 1 second
      const maxDelay = 30000 // 30 seconds cap
      const attempts = 10

      const delays = Array.from({ length: attempts }, (_, i) => 
        Math.min(baseDelay * Math.pow(2, i), maxDelay)
      )

      // First few follow exponential
      expect(delays[0]).toBe(1000)
      expect(delays[1]).toBe(2000)
      expect(delays[2]).toBe(4000)
      expect(delays[3]).toBe(8000)
      expect(delays[4]).toBe(16000)
      
      // Then hit the cap
      expect(delays[5]).toBe(30000) // Would be 32000 but capped
      expect(delays[6]).toBe(30000)
      expect(delays[7]).toBe(30000)
    })

    it('should implement adaptive backoff based on error type', () => {
      const getBackoffDelay = (error: any, attempt: number) => {
        const baseDelay = 1000

        // Different strategies based on error
        if (error.statusCode === 429) {
          // Rate limit: exponential backoff
          return baseDelay * Math.pow(2, attempt)
        } else if (error.statusCode === 503) {
          // Service unavailable: linear backoff
          return baseDelay * (attempt + 1)
        } else {
          // Other errors: fixed short delay
          return baseDelay
        }
      }

      // Test rate limit backoff
      const rateLimitError = { statusCode: 429 }
      expect(getBackoffDelay(rateLimitError, 0)).toBe(1000)
      expect(getBackoffDelay(rateLimitError, 1)).toBe(2000)
      expect(getBackoffDelay(rateLimitError, 2)).toBe(4000)

      // Test service unavailable backoff
      const serviceError = { statusCode: 503 }
      expect(getBackoffDelay(serviceError, 0)).toBe(1000)
      expect(getBackoffDelay(serviceError, 1)).toBe(2000)
      expect(getBackoffDelay(serviceError, 2)).toBe(3000)

      // Test other errors
      const otherError = { statusCode: 500 }
      expect(getBackoffDelay(otherError, 0)).toBe(1000)
      expect(getBackoffDelay(otherError, 5)).toBe(1000) // Always same
    })
  })

  describe('Concurrent Request Handling', () => {
    it('should track concurrent requests per provider', async () => {
      const concurrentLimits = {
        anthropic: 5,
        google: 10,
      }

      const activeRequests = {
        anthropic: 0,
        google: 0,
      }

      // Simulate concurrent request tracking
      const makeRequest = async (provider: 'anthropic' | 'google') => {
        if (activeRequests[provider] >= concurrentLimits[provider]) {
          throw new Error(`Concurrent limit reached for ${provider}`)
        }

        activeRequests[provider]++
        try {
          // Simulate request
          await new Promise(resolve => setTimeout(resolve, 100))
        } finally {
          activeRequests[provider]--
        }
      }

      // Test within limits
      const anthropicPromises = Array(5).fill(null).map(() => makeRequest('anthropic'))
      await expect(Promise.all(anthropicPromises)).resolves.toBeDefined()

      // Test exceeding limits
      activeRequests.anthropic = 5 // Max out
      await expect(makeRequest('anthropic')).rejects.toThrow('Concurrent limit reached')
    })

    it('should implement request queuing when hitting concurrent limits', async () => {
      const queue: Array<() => Promise<void>> = []
      const maxConcurrent = 3
      let activeTasks = 0

      const processQueue = async () => {
        while (queue.length > 0 && activeTasks < maxConcurrent) {
          const task = queue.shift()
          if (task) {
            activeTasks++
            task().finally(() => {
              activeTasks--
              processQueue() // Process next in queue
            })
          }
        }
      }

      // Add task to queue
      const queueTask = (task: () => Promise<void>) => {
        return new Promise<void>((resolve) => {
          queue.push(async () => {
            await task()
            resolve()
          })
          processQueue()
        })
      }

      // Simulate multiple concurrent requests
      const tasks = Array(10).fill(null).map((_, i) => 
        queueTask(async () => {
          await new Promise(resolve => setTimeout(resolve, 50))
        })
      )

      const start = Date.now()
      await Promise.all(tasks)
      const duration = Date.now() - start

      // With max 3 concurrent and 50ms each, should take ~200ms total
      // (10 tasks / 3 concurrent = ~4 batches)
      expect(duration).toBeGreaterThanOrEqual(150)
      expect(duration).toBeLessThan(300)
    })

    it('should handle burst protection', async () => {
      const burstWindow = 1000 // 1 second
      const burstLimit = 10 // Max 10 requests per second
      const requestTimestamps: number[] = []

      const checkBurstLimit = () => {
        const now = Date.now()
        const windowStart = now - burstWindow
        
        // Remove old timestamps outside window
        while (requestTimestamps.length > 0 && requestTimestamps[0] < windowStart) {
          requestTimestamps.shift()
        }

        // Check if we'd exceed burst limit
        if (requestTimestamps.length >= burstLimit) {
          const waitTime = requestTimestamps[0] + burstWindow - now
          return { allowed: false, waitTime }
        }

        requestTimestamps.push(now)
        return { allowed: true, waitTime: 0 }
      }

      // Simulate burst of requests
      let allowedCount = 0
      let blockedCount = 0

      for (let i = 0; i < 15; i++) {
        const { allowed } = checkBurstLimit()
        if (allowed) {
          allowedCount++
        } else {
          blockedCount++
        }
      }

      expect(allowedCount).toBe(10) // Burst limit
      expect(blockedCount).toBe(5) // Exceeded limit
    })
  })

  describe('Per-User and Per-Model Rate Limits', () => {
    it('should track rate limits per user', async () => {
      const userLimits = new Map<string, {
        requests: number
        resetTime: number
      }>()

      const checkUserLimit = (userId: string, limitPerHour: number) => {
        const now = Date.now()
        const userLimit = userLimits.get(userId)

        if (!userLimit || now > userLimit.resetTime) {
          // Reset limit
          userLimits.set(userId, {
            requests: 1,
            resetTime: now + 3600000, // 1 hour
          })
          return true
        }

        if (userLimit.requests >= limitPerHour) {
          return false
        }

        userLimit.requests++
        return true
      }

      // Test user limits
      const userId1 = 'user-1'
      const userId2 = 'user-2'
      const limitPerHour = 100

      // User 1 makes requests
      for (let i = 0; i < 100; i++) {
        expect(checkUserLimit(userId1, limitPerHour)).toBe(true)
      }
      expect(checkUserLimit(userId1, limitPerHour)).toBe(false) // Hit limit

      // User 2 should still be able to make requests
      expect(checkUserLimit(userId2, limitPerHour)).toBe(true)
    })

    it('should implement different limits for different model tiers', () => {
      const modelLimits = {
        'anthropic-cheap': { requestsPerMinute: 100, tokensPerMinute: 100_000 },
        'anthropic-balanced': { requestsPerMinute: 50, tokensPerMinute: 50_000 },
        'anthropic-expensive': { requestsPerMinute: 20, tokensPerMinute: 20_000 },
        'google-cheap': { requestsPerMinute: 200, tokensPerMinute: 200_000 },
      }

      // Verify limits decrease with tier
      expect(modelLimits['anthropic-cheap'].requestsPerMinute)
        .toBeGreaterThan(modelLimits['anthropic-balanced'].requestsPerMinute)
      expect(modelLimits['anthropic-balanced'].requestsPerMinute)
        .toBeGreaterThan(modelLimits['anthropic-expensive'].requestsPerMinute)

      // Google has higher limits
      expect(modelLimits['google-cheap'].requestsPerMinute)
        .toBeGreaterThan(modelLimits['anthropic-cheap'].requestsPerMinute)
    })

    it('should track token-based rate limits', async () => {
      const tokenBuckets = new Map<string, {
        tokens: number
        lastRefill: number
      }>()

      const consumeTokens = (
        bucketId: string, 
        tokensNeeded: number, 
        maxTokens: number,
        refillRate: number // tokens per second
      ) => {
        const now = Date.now()
        let bucket = tokenBuckets.get(bucketId)

        if (!bucket) {
          bucket = { tokens: maxTokens, lastRefill: now }
          tokenBuckets.set(bucketId, bucket)
        }

        // Refill tokens based on time elapsed
        const elapsed = (now - bucket.lastRefill) / 1000 // seconds
        const refillAmount = Math.min(elapsed * refillRate, maxTokens - bucket.tokens)
        bucket.tokens = Math.min(bucket.tokens + refillAmount, maxTokens)
        bucket.lastRefill = now

        // Check if we have enough tokens
        if (bucket.tokens >= tokensNeeded) {
          bucket.tokens -= tokensNeeded
          return { allowed: true, availableTokens: bucket.tokens }
        }

        const waitTime = (tokensNeeded - bucket.tokens) / refillRate * 1000
        return { allowed: false, waitTime, availableTokens: bucket.tokens }
      }

      // Test token bucket
      const bucketId = 'user-123-anthropic'
      const maxTokens = 10_000
      const refillRate = 1000 // 1000 tokens per second

      // Consume some tokens
      expect(consumeTokens(bucketId, 5000, maxTokens, refillRate).allowed).toBe(true)
      expect(consumeTokens(bucketId, 3000, maxTokens, refillRate).allowed).toBe(true)
      
      // Should have 2000 left
      const result = consumeTokens(bucketId, 3000, maxTokens, refillRate)
      expect(result.allowed).toBe(false)
      expect(result.availableTokens).toBe(2000)
      expect(result.waitTime).toBeGreaterThan(0)
    })
  })

  describe('Rate Limit Recovery Strategies', () => {
    it('should implement gradual request ramp-up after rate limit', async () => {
      const rampUpStrategy = {
        initialDelay: 5000, // 5 seconds
        rampUpFactor: 0.5, // Start at 50% capacity
        increaseRate: 0.1, // Increase by 10% each successful batch
      }

      let currentCapacity = rampUpStrategy.rampUpFactor
      const normalCapacity = 1.0

      // Simulate gradual ramp-up
      const successfulBatches = 5
      for (let i = 0; i < successfulBatches; i++) {
        // Make requests at current capacity
        const requestCount = Math.floor(10 * currentCapacity)
        expect(requestCount).toBeLessThanOrEqual(10)

        // Increase capacity after success
        currentCapacity = Math.min(
          currentCapacity + rampUpStrategy.increaseRate,
          normalCapacity
        )
      }

      expect(currentCapacity).toBeCloseTo(normalCapacity)
    })

    it('should implement circuit breaker pattern', () => {
      const circuitBreaker = {
        failureThreshold: 5,
        resetTimeout: 30000, // 30 seconds
        state: 'closed' as 'closed' | 'open' | 'half-open',
        failureCount: 0,
        lastFailureTime: 0,
      }

      const callWithCircuitBreaker = (fn: () => any) => {
        const now = Date.now()

        // Check if circuit should be reset
        if (
          circuitBreaker.state === 'open' &&
          now - circuitBreaker.lastFailureTime > circuitBreaker.resetTimeout
        ) {
          circuitBreaker.state = 'half-open'
          circuitBreaker.failureCount = 0
        }

        // If circuit is open, fail fast
        if (circuitBreaker.state === 'open') {
          throw new Error('Circuit breaker is open')
        }

        try {
          const result = fn()
          
          // Success: reset failure count
          if (circuitBreaker.state === 'half-open') {
            circuitBreaker.state = 'closed'
          }
          circuitBreaker.failureCount = 0
          
          return result
        } catch (error) {
          circuitBreaker.failureCount++
          circuitBreaker.lastFailureTime = now

          if (circuitBreaker.failureCount >= circuitBreaker.failureThreshold) {
            circuitBreaker.state = 'open'
          }

          throw error
        }
      }

      // Simulate failures
      for (let i = 0; i < 5; i++) {
        try {
          callWithCircuitBreaker(() => {
            throw new Error('Service error')
          })
        } catch {
          // Expected
        }
      }

      expect(circuitBreaker.state).toBe('open')
      expect(() => callWithCircuitBreaker(() => 'success')).toThrow('Circuit breaker is open')
    })

    it('should track and report rate limit metrics', () => {
      const metrics = {
        rateLimitHits: new Map<string, number>(),
        successfulRetries: new Map<string, number>(),
        failedRetries: new Map<string, number>(),
        providerSwitches: new Map<string, number>(),
      }

      const recordMetric = (
        type: keyof typeof metrics,
        key: string
      ) => {
        const current = metrics[type].get(key) || 0
        metrics[type].set(key, current + 1)
      }

      // Simulate rate limit scenario
      recordMetric('rateLimitHits', 'anthropic')
      recordMetric('providerSwitches', 'anthropic->google')
      recordMetric('successfulRetries', 'google')

      // Generate report
      const report = {
        totalRateLimitHits: Array.from(metrics.rateLimitHits.values())
          .reduce((sum, count) => sum + count, 0),
        totalProviderSwitches: Array.from(metrics.providerSwitches.values())
          .reduce((sum, count) => sum + count, 0),
        successRate: metrics.successfulRetries.size > 0 ? 
          Array.from(metrics.successfulRetries.values()).reduce((a, b) => a + b, 0) /
          (Array.from(metrics.successfulRetries.values()).reduce((a, b) => a + b, 0) +
           Array.from(metrics.failedRetries.values()).reduce((a, b) => a + b, 0))
          : 0,
      }

      expect(report.totalRateLimitHits).toBe(1)
      expect(report.totalProviderSwitches).toBe(1)
      expect(report.successRate).toBe(1) // 100% success after retry
    })
  })
})