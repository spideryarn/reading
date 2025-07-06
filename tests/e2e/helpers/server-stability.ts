/**
 * Dev Server Stability Helpers for E2E Testing
 * 
 * Provides utilities to ensure the dev server remains stable during test runs,
 * especially important for long test suites that can cause memory issues.
 */

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

export interface ServerHealthOptions {
  port?: string
  maxRetries?: number
  retryDelay?: number
  verbose?: boolean
}

/**
 * Check if the dev server is healthy and responsive
 */
export async function checkServerHealth(options: ServerHealthOptions = {}): Promise<boolean> {
  const port = options.port || process.env.PORT || '3000'
  const url = `http://localhost:${port}`
  
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000) // 5 second timeout
    
    const response = await fetch(url, { 
      signal: controller.signal,
      headers: { 'Accept': 'text/html' }
    })
    
    clearTimeout(timeout)
    
    // Accept any 2xx or 3xx status as healthy
    return response.status >= 200 && response.status < 400
  } catch (error) {
    if (options.verbose) {
      console.log(`   Server health check failed: ${error.message}`)
    }
    return false
  }
}

/**
 * Wait for server to become healthy with retries
 */
export async function waitForServerHealth(options: ServerHealthOptions = {}): Promise<boolean> {
  const maxRetries = options.maxRetries || 30
  const retryDelay = options.retryDelay || 1000
  const port = options.port || process.env.PORT || '3000'
  
  if (options.verbose) {
    console.log(`⏳ Waiting for server on port ${port} to become healthy...`)
  }
  
  for (let i = 0; i < maxRetries; i++) {
    if (await checkServerHealth(options)) {
      if (options.verbose) {
        console.log(`✅ Server is healthy after ${i} retries`)
      }
      return true
    }
    
    if (options.verbose && i % 5 === 0) {
      console.log(`   Still waiting... (${i}/${maxRetries})`)
    }
    
    await new Promise(resolve => setTimeout(resolve, retryDelay))
  }
  
  return false
}

/**
 * Restart the dev server if it becomes unresponsive
 * 
 * This is a last-resort recovery mechanism for when the dev server
 * stops responding during long test runs.
 */
export async function restartServerIfUnhealthy(options: ServerHealthOptions = {}): Promise<boolean> {
  const port = options.port || process.env.PORT || '3000'
  
  // First check if server is healthy
  if (await checkServerHealth(options)) {
    return true
  }
  
  console.log(`⚠️  Dev server on port ${port} is unresponsive, attempting recovery...`)
  
  // Check memory usage (helpful for debugging)
  try {
    const memInfo = process.memoryUsage()
    console.log(`   Node.js memory usage: RSS=${Math.round(memInfo.rss / 1024 / 1024)}MB, Heap=${Math.round(memInfo.heapUsed / 1024 / 1024)}MB`)
  } catch {}
  
  // Try graceful restart first
  try {
    console.log('🔄 Attempting graceful restart...')
    execSync('npm run dev:daemon -- --restart', { stdio: 'pipe' })
    
    // Wait for server to come back
    if (await waitForServerHealth({ ...options, maxRetries: 60 })) {
      console.log('✅ Server recovered successfully')
      return true
    }
  } catch (error) {
    console.log(`   Graceful restart failed: ${error.message}`)
  }
  
  // If graceful restart failed, try harder
  try {
    console.log('🔧 Attempting force restart...')
    
    // Stop existing server
    try {
      execSync('npm run dev:stop', { stdio: 'pipe' })
    } catch {}
    
    // Brief pause to ensure cleanup
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Start fresh
    execSync('npm run dev:daemon', { stdio: 'pipe' })
    
    // Wait for server with extended timeout
    if (await waitForServerHealth({ ...options, maxRetries: 90 })) {
      console.log('✅ Server recovered after force restart')
      return true
    }
  } catch (error) {
    console.error(`❌ Force restart failed: ${error.message}`)
  }
  
  return false
}

/**
 * Memory-aware batch size calculator
 * 
 * Determines optimal batch size for running tests based on available memory
 * to prevent dev server crashes from memory exhaustion.
 */
export function calculateOptimalBatchSize(): number {
  try {
    const totalMemory = require('os').totalmem()
    const freeMemory = require('os').freemem()
    const usedMemoryPercent = ((totalMemory - freeMemory) / totalMemory) * 100
    
    // Conservative batch sizing based on memory pressure
    if (usedMemoryPercent > 80) {
      return 1 // Run tests one at a time if memory is tight
    } else if (usedMemoryPercent > 60) {
      return 2
    } else if (usedMemoryPercent > 40) {
      return 3
    } else {
      return 5 // Maximum batch size even with plenty of memory
    }
  } catch {
    // Default to conservative batch size if we can't determine memory
    return 3
  }
}

/**
 * Test batch executor with server health monitoring
 * 
 * Runs tests in batches with health checks between batches to ensure
 * the dev server remains stable throughout the test run.
 */
export async function runTestsInBatches(
  testFiles: string[],
  options: {
    batchSize?: number
    healthCheckInterval?: number
    onBatchComplete?: (batchIndex: number, batchCount: number) => void
  } = {}
) {
  const batchSize = options.batchSize || calculateOptimalBatchSize()
  const batches: string[][] = []
  
  // Split tests into batches
  for (let i = 0; i < testFiles.length; i += batchSize) {
    batches.push(testFiles.slice(i, i + batchSize))
  }
  
  console.log(`📦 Running ${testFiles.length} tests in ${batches.length} batches (size: ${batchSize})`)
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]
    
    // Health check before each batch
    if (i > 0) {
      console.log(`\n🏥 Checking server health before batch ${i + 1}/${batches.length}...`)
      
      if (!await checkServerHealth()) {
        console.log('⚠️  Server unhealthy, attempting recovery...')
        
        if (!await restartServerIfUnhealthy()) {
          throw new Error('Failed to recover dev server')
        }
      }
      
      // Brief pause between batches to let server recover
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    
    console.log(`\n🚀 Running batch ${i + 1}/${batches.length}: ${batch.join(', ')}`)
    
    // Run the batch (this would be replaced with actual test runner)
    try {
      execSync(`npx playwright test ${batch.join(' ')}`, { stdio: 'inherit' })
    } catch (error) {
      console.error(`❌ Batch ${i + 1} failed`)
      throw error
    }
    
    if (options.onBatchComplete) {
      options.onBatchComplete(i, batches.length)
    }
  }
  
  console.log(`\n✅ All ${batches.length} batches completed successfully`)
}

/**
 * Create a test helper that monitors server health during test execution
 * 
 * This can be used in beforeEach/afterEach hooks to ensure server stability.
 */
export function createServerMonitor(options: ServerHealthOptions = {}) {
  let checkCount = 0
  let lastCheckTime = Date.now()
  
  return {
    async checkHealth(force = false) {
      const now = Date.now()
      const timeSinceLastCheck = now - lastCheckTime
      
      // Only check every 30 seconds unless forced
      if (!force && timeSinceLastCheck < 30000) {
        return true
      }
      
      lastCheckTime = now
      checkCount++
      
      const isHealthy = await checkServerHealth(options)
      
      if (!isHealthy) {
        console.log(`\n⚠️  Server health check #${checkCount} failed`)
        
        // Try to recover
        if (await restartServerIfUnhealthy(options)) {
          console.log('✅ Server recovered, continuing tests...')
          return true
        } else {
          throw new Error('Dev server is unresponsive and could not be recovered')
        }
      }
      
      return true
    },
    
    getStats() {
      return {
        checkCount,
        uptime: Date.now() - (lastCheckTime - (checkCount * 30000))
      }
    }
  }
}