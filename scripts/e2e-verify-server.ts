#!/usr/bin/env -S npm exec tsx --

/**
 * E2E Pre-flight Dev Server Health Check
 * 
 * Verifies that the development server is running and healthy before E2E tests.
 * Starts the server if needed, restarts if unhealthy.
 * 
 * Usage: npm run e2e:verify-server
 * 
 * Exit codes:
 * - 0: Server is healthy
 * - 1: Server could not be started or made healthy
 */

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const PORT = process.env.PORT || '3000'
const BASE_URL = `http://localhost:${PORT}`
const HEALTH_ENDPOINT = `${BASE_URL}/api/healthz`
const MAX_RETRIES = 10 // 5 seconds total (0.5s delay)
const RETRY_DELAY = 500 // 0.5 second

async function checkServerHealth(): Promise<boolean> {
  try {
    const response = await fetch(HEALTH_ENDPOINT)
    // Accept any 2xx or 3xx status as healthy (redirects are OK)
    return response.status >= 200 && response.status < 400
  } catch {
    return false
  }
}

async function waitForServer(): Promise<boolean> {
  console.log(`⏳ Waiting for server on port ${PORT}...`)
  
  for (let i = 0; i < MAX_RETRIES; i++) {
    if (await checkServerHealth()) {
      return true
    }
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
  }
  
  return false
}

async function verifyDevServer() {
  console.log(`🔍 Checking dev server health on port ${PORT}`)

  // Fast path: rely on consolidated dev:status helper
  try {
    execSync('npm run dev:status', { stdio: 'pipe' })
    console.log(`✅ Dev server is healthy on port ${PORT}`)
    process.exit(0)
  } catch {
    // dev:status returned non-zero -> server not healthy/running
  }

  // Check if a daemon PID exists
  const pidFile = path.join(process.cwd(), '.dev-server.pid')
  const hasPidFile = fs.existsSync(pidFile)

  if (hasPidFile) {
    console.log('📝 Found existing daemon PID file')
    
    // Try to get status
    try {
      execSync('npm run dev:status', { stdio: 'pipe' })
      console.log('🔄 Daemon appears to be running but server is unhealthy, restarting...')
      
      // Restart the daemon
      execSync('npm run dev:daemon -- --restart', { stdio: 'inherit' })
    } catch {
      console.log('⚠️  Daemon PID exists but process is dead, starting fresh...')
      
      // Clean up dead PID file and start fresh
      execSync('npm run dev:clean', { stdio: 'inherit' })
      execSync('npm run dev:daemon', { stdio: 'inherit' })
    }
  } else {
    console.log('🚀 Starting dev server daemon...')
    
    // Start the daemon
    try {
      execSync('npm run dev:daemon', { stdio: 'inherit' })
    } catch (error) {
      console.error('❌ Failed to start dev server:', error)
      process.exit(1)
    }
  }

  // Wait for server to become healthy (new shorter loop)
  if (await waitForServer()) {
    console.log(`✅ Dev server is now healthy on port ${PORT}`)
    process.exit(0)
  } else {
    console.error(`❌ Dev server failed to become healthy after ${(MAX_RETRIES * RETRY_DELAY) / 1000} seconds`)
    console.error('   Check dev.log and error.log for details')
    process.exit(1)
  }
}

// Run the verification
verifyDevServer()