/**
 * Development helpers for tool executor framework
 * 
 * Provides mock executor, execution replay, and profiling tools for
 * development and testing of tool execution flows.
 */

import type { ToolApiResponse, ToolExecutionResult, ExecutionContext } from './types'
import { generateCorrelationId } from '@/lib/services/logger'

// Mock response configuration
interface MockResponseConfig {
  delay?: number
  shouldFail?: boolean
  errorType?: 'validation' | 'auth' | 'server' | 'timeout' | 'not_found'
  customResponse?: ToolApiResponse
  httpStatus?: number
}

// Execution replay record
interface ReplayRecord {
  id: string
  timestamp: string
  toolId: string
  action: string
  parameters: Record<string, unknown>
  response: ToolApiResponse | null
  error: string | null
  duration: number
  httpStatus?: number
  correlationId: string
}

// Profiling data
interface ProfilingData {
  toolId: string
  action: string
  startTime: number
  endTime: number
  duration: number
  memoryBefore?: number
  memoryAfter?: number
  networkRequests?: number
  domOperations?: number
  rerenders?: number
}

// Global state for development helpers
const mockConfigs: Map<string, MockResponseConfig> = new Map()
let replayRecords: ReplayRecord[] = []
let profilingData: ProfilingData[] = []
let isProfilingEnabled = false

/**
 * Mock executor for testing and development
 */
export class MockToolExecutor {
  private static instance: MockToolExecutor | null = null
  
  static getInstance(): MockToolExecutor {
    if (!MockToolExecutor.instance) {
      MockToolExecutor.instance = new MockToolExecutor()
    }
    return MockToolExecutor.instance
  }
  
  static reset(): void {
    MockToolExecutor.instance = null
    mockConfigs.clear()
  }
  
  /**
   * Configure mock response for a specific tool and action
   */
  configureMock(
    toolId: string, 
    action: string, 
    config: MockResponseConfig
  ): void {
    const key = `${toolId}.${action}`
    mockConfigs.set(key, config)
    
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.log(`[Mock Executor] Configured mock for ${key}:`, config)
    }
  }
  
  /**
   * Execute tool with mocked response
   */
  async executeTool(
    toolId: string,
    action: string,
    parameters: Record<string, unknown>,
    _context?: Partial<ExecutionContext>
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now()
    const correlationId = generateCorrelationId()
    const key = `${toolId}.${action}`
    const config = mockConfigs.get(key) || {}
    
    console.log(`[Mock Executor] Executing ${key} with mock config:`, config)
    
    // Simulate network delay
    if (config.delay) {
      await new Promise(resolve => setTimeout(resolve, config.delay))
    }
    
    // Simulate errors
    if (config.shouldFail) {
      const errorType = config.errorType || 'server'
      const errorMessages = {
        validation: 'Invalid parameters provided',
        auth: 'Authentication required',
        server: 'Internal server error',
        timeout: 'Request timeout',
        not_found: 'Tool not found'
      }
      
      throw new Error(errorMessages[errorType])
    }
    
    // Return custom response or generate default
    const response: ToolApiResponse = config.customResponse || {
      success: true,
      data: this.generateMockData(toolId, action, parameters),
      metadata: {
        correlationId,
        toolId,
        action,
        executionTime: Date.now() - startTime,
        cached: false,
        version: '1.0'
      }
    }
    
    return {
      type: 'data',
      data: response,
      metadata: {
        toolId,
        action,
        executionType: 'server',
        correlationId,
        executionTime: Date.now() - startTime,
        httpStatus: config.httpStatus || 200
      }
    }
  }
  
  /**
   * Generate realistic mock data based on tool type
   */
  private generateMockData(
    toolId: string, 
    action: string, 
    parameters: Record<string, unknown>
  ): Record<string, unknown> {
    switch (toolId) {
      case 'glossary':
        return {
          glossaryTerms: [
            { term: 'Mock Term 1', definition: 'Mock definition 1', category: 'concept' },
            { term: 'Mock Term 2', definition: 'Mock definition 2', category: 'person' }
          ],
          processingTime: Math.random() * 1000,
          totalTerms: 2
        }
        
      case 'search':
        return {
          matches: [
            { elementId: 'mock-1', confidence: 0.95, relevantText: 'Mock search result 1' },
            { elementId: 'mock-2', confidence: 0.87, relevantText: 'Mock search result 2' }
          ],
          query: parameters.query || 'mock query',
          stats: { totalElements: 100, searchableElements: 80, matchesFound: 2 }
        }
        
      case 'summary':
        return {
          summary: `Mock summary for ${action} action with ${Object.keys(parameters).length} parameters`,
          granularity: parameters.granularity || 'paragraph',
          wordCount: 150,
          processingTime: Math.random() * 2000
        }
        
      case 'chat':
        return {
          response: `Mock chat response to: ${JSON.stringify(parameters)}`,
          threadId: 'mock-thread-' + Math.random().toString(36).substring(7),
          messageCount: Math.floor(Math.random() * 10) + 1
        }
        
      case 'structure':
        return {
          headings: [
            { id: 'mock-h1', level: 1, text: 'Mock Heading 1', insertAfter: null },
            { id: 'mock-h2', level: 2, text: 'Mock Heading 2', insertAfter: 'mock-h1' }
          ],
          enhancementId: 'mock-enhancement-' + Math.random().toString(36).substring(7)
        }
        
      case 'highlights':
        return {
          highlights: [
            { elementId: 'mock-hl1', confidence: 0.9, criterion: parameters.criterion || 'mock' },
            { elementId: 'mock-hl2', confidence: 0.8, criterion: parameters.criterion || 'mock' }
          ],
          criterion: parameters.criterion || 'mock criterion'
        }
        
      case 'metadata':
        return {
          readingDifficulty: {
            level: 'intermediate',
            score: Math.random() * 10 + 5,
            wordCount: Math.floor(Math.random() * 1000) + 500,
            sentenceCount: Math.floor(Math.random() * 50) + 25
          }
        }
        
      default:
        return {
          message: `Mock response for ${toolId}.${action}`,
          parameters,
          timestamp: new Date().toISOString()
        }
    }
  }
}

/**
 * Record execution for replay functionality
 */
export function recordExecution(
  toolId: string,
  action: string,
  parameters: Record<string, unknown>,
  response: ToolApiResponse | null,
  error: string | null,
  duration: number,
  httpStatus?: number
): void {
  const record: ReplayRecord = {
    id: generateCorrelationId(),
    timestamp: new Date().toISOString(),
    toolId,
    action,
    parameters,
    response,
    error,
    duration,
    correlationId: generateCorrelationId()
  }
  
  // Add optional httpStatus if provided
  if (httpStatus !== undefined) {
    record.httpStatus = httpStatus
  }
  
  replayRecords.push(record)
  
  // Keep only last 50 records to prevent memory issues
  if (replayRecords.length > 50) {
    replayRecords = replayRecords.slice(-50)
  }
  
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log('[Execution Replay] Recorded execution:', {
      id: record.id,
      toolId,
      action,
      duration,
      success: !error
    })
  }
}

/**
 * Get recorded executions for replay
 */
export function getReplayRecords(
  filters?: {
    toolId?: string
    success?: boolean
    since?: Date
  }
): ReplayRecord[] {
  let filtered = [...replayRecords]
  
  if (filters) {
    if (filters.toolId) {
      filtered = filtered.filter(r => r.toolId === filters.toolId)
    }
    if (filters.success !== undefined) {
      filtered = filtered.filter(r => (r.error === null) === filters.success)
    }
    if (filters.since) {
      filtered = filtered.filter(r => new Date(r.timestamp) >= filters.since!)
    }
  }
  
  return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

/**
 * Replay a specific execution
 */
export async function replayExecution(recordId: string): Promise<ToolExecutionResult | null> {
  const record = replayRecords.find(r => r.id === recordId)
  if (!record) {
    console.warn('[Execution Replay] Record not found:', recordId)
    return null
  }
  
  console.log('[Execution Replay] Replaying execution:', {
    id: record.id,
    toolId: record.toolId,
    action: record.action,
    originalTimestamp: record.timestamp
  })
  
  const mockExecutor = MockToolExecutor.getInstance()
  
  // Configure mock to return the original response
  if (record.response) {
    const mockConfig: MockResponseConfig = {
      customResponse: record.response,
      delay: Math.min(record.duration, 100) // Cap delay for testing
    }
    
    if (record.httpStatus !== undefined) {
      mockConfig.httpStatus = record.httpStatus
    }
    
    mockExecutor.configureMock(record.toolId, record.action, mockConfig)
  } else if (record.error) {
    mockExecutor.configureMock(record.toolId, record.action, {
      shouldFail: true,
      delay: Math.min(record.duration, 100)
    })
  }
  
  try {
    return await mockExecutor.executeTool(
      record.toolId,
      record.action,
      record.parameters
    )
  } catch (error) {
    console.log('[Execution Replay] Replayed error:', error)
    throw error
  }
}

/**
 * Clear replay records
 */
export function clearReplayRecords(): void {
  replayRecords = []
  console.log('[Execution Replay] Records cleared')
}

/**
 * Enable execution profiling
 */
export function enableProfiling(): void {
  isProfilingEnabled = true
  profilingData = []
  console.log('[Profiler] Profiling enabled')
}

/**
 * Disable execution profiling
 */
export function disableProfiling(): void {
  isProfilingEnabled = false
  console.log('[Profiler] Profiling disabled')
}

/**
 * Start profiling an execution
 */
export function startProfiling(toolId: string, action: string): string {
  if (!isProfilingEnabled) return ''
  
  const profilingId = generateCorrelationId()
  const data: ProfilingData = {
    toolId,
    action,
    startTime: performance.now(),
    endTime: 0,
    duration: 0
  }
  
  // Capture memory usage if available
  if ('memory' in performance) {
    data.memoryBefore = (performance as unknown as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize
  }
  
  profilingData.push(data)
  return profilingId
}

/**
 * End profiling an execution
 */
export function endProfiling(toolId: string, action: string): void {
  if (!isProfilingEnabled) return
  
  const data = profilingData.find(p => 
    p.toolId === toolId && 
    p.action === action && 
    p.endTime === 0
  )
  
  if (data) {
    data.endTime = performance.now()
    data.duration = data.endTime - data.startTime
    
    // Capture memory usage if available
    if ('memory' in performance) {
      data.memoryAfter = (performance as unknown as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize
    }
  }
}

/**
 * Get profiling results
 */
export function getProfilingResults(): ProfilingData[] {
  return [...profilingData].sort((a, b) => b.duration - a.duration)
}

/**
 * Clear profiling data
 */
export function clearProfilingData(): void {
  profilingData = []
  console.log('[Profiler] Data cleared')
}

/**
 * Generate performance report
 */
export function generatePerformanceReport(): string {
  const results = getProfilingResults()
  
  if (results.length === 0) {
    return 'No profiling data available. Enable profiling first.'
  }
  
  const report = [
    '🚀 Tool Executor Performance Report',
    '=' .repeat(40),
    `Total Executions: ${results.length}`,
    `Average Duration: ${(results.reduce((sum, r) => sum + r.duration, 0) / results.length).toFixed(2)}ms`,
    '',
    'Slowest Executions:',
    ...results.slice(0, 10).map((r, i) => 
      `${i + 1}. ${r.toolId}.${r.action}: ${r.duration.toFixed(2)}ms`
    ),
    '',
    'By Tool:',
    ...Object.entries(
      results.reduce((acc, r) => {
        const key = r.toolId
        if (!acc[key]) acc[key] = { count: 0, totalTime: 0 }
        acc[key].count++
        acc[key].totalTime += r.duration
        return acc
      }, {} as Record<string, { count: number; totalTime: number }>)
    ).map(([toolId, stats]) => 
      `${toolId}: ${stats.count} executions, ${(stats.totalTime / stats.count).toFixed(2)}ms avg`
    )
  ]
  
  return report.join('\n')
}

/**
 * Install development helpers on window object
 */
export function installDevelopmentHelpers(): void {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    const mockExecutor = MockToolExecutor.getInstance()
    
    ;(window as unknown as { toolExecutorDev: unknown }).toolExecutorDev = {
      mock: {
        configure: mockExecutor.configureMock.bind(mockExecutor),
        execute: mockExecutor.executeTool.bind(mockExecutor),
        reset: MockToolExecutor.reset
      },
      replay: {
        records: getReplayRecords,
        replay: replayExecution,
        clear: clearReplayRecords
      },
      profiling: {
        enable: enableProfiling,
        disable: disableProfiling,
        results: getProfilingResults,
        report: generatePerformanceReport,
        clear: clearProfilingData
      }
    }
    
    console.log('🛠️  Tool Executor development helpers installed on window.toolExecutorDev')
  }
}

// Development helper types for global installation
declare global {
  interface Window {
    toolExecutorDev?: {
      mock: {
        configure(toolId: string, action: string, config: MockResponseConfig): void
        execute(toolId: string, action: string, parameters: Record<string, unknown>): Promise<ToolExecutionResult>
        reset(): void
      }
      replay: {
        records(filters?: Parameters<typeof getReplayRecords>[0]): ReplayRecord[]
        replay(recordId: string): Promise<ToolExecutionResult | null>
        clear(): void
      }
      profiling: {
        enable(): void
        disable(): void
        results(): ProfilingData[]
        report(): string
        clear(): void
      }
    }
  }
}