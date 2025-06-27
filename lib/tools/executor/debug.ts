/**
 * Debug utilities for tool executor framework
 * 
 * Provides execution logging, performance monitoring, and request/response
 * inspection tools for debugging tool execution issues in development.
 * 
 * @example
 * ```typescript
 * // Enable debug logging
 * setExecutorDebugMode(true)
 * 
 * // Execute tool with debug info
 * const result = await executeTool('glossary', 'execute', { refresh: true })
 * 
 * // View execution history
 * const history = getExecutionHistory()
 * console.log(history.slice(-5)) // Last 5 executions
 * 
 * // Get performance metrics
 * const metrics = getPerformanceMetrics()
 * console.log(`Average execution time: ${metrics.averageExecutionTime}ms`)
 * ```
 */

import type { ToolApiResponse } from './types'

// Debug configuration
interface DebugConfig {
  enabled: boolean
  logLevel: 'error' | 'warn' | 'info' | 'debug'
  maxHistorySize: number
  logRequestBodies: boolean
  logResponseBodies: boolean
  trackPerformance: boolean
}

// Execution record for debugging
interface ExecutionRecord {
  id: string
  toolId: string
  action: string
  parameters: Record<string, unknown>
  executionType: 'local' | 'server'
  startTime: number
  endTime?: number
  duration?: number
  success: boolean
  error?: string
  requestBody?: string
  responseBody?: string
  correlationId?: string
  httpStatus?: number
  retryCount?: number
  userAgent?: string
  source?: string
}

// Performance metrics aggregation
interface PerformanceMetrics {
  totalExecutions: number
  successfulExecutions: number
  failedExecutions: number
  averageExecutionTime: number
  medianExecutionTime: number
  p95ExecutionTime: number
  toolBreakdown: Record<string, {
    count: number
    averageTime: number
    successRate: number
  }>
  errorBreakdown: Record<string, number>
  slowestExecutions: ExecutionRecord[]
}

// Global debug state
let debugConfig: DebugConfig = {
  enabled: false,
  logLevel: 'info',
  maxHistorySize: 100,
  logRequestBodies: true,
  logResponseBodies: true,
  trackPerformance: true
}

let executionHistory: ExecutionRecord[] = []
let performanceData: PerformanceMetrics | null = null

/**
 * Enable or disable executor debug mode
 */
export function setExecutorDebugMode(enabled: boolean): void {
  debugConfig.enabled = enabled
  if (enabled && typeof window !== 'undefined') {
    console.log('[Executor Debug] Debug mode enabled')
  }
}

/**
 * Configure debug settings
 */
export function configureExecutorDebug(config: Partial<DebugConfig>): void {
  debugConfig = { ...debugConfig, ...config }
  if (debugConfig.enabled && typeof window !== 'undefined') {
    console.log('[Executor Debug] Configuration updated:', config)
  }
}

/**
 * Check if debug mode is enabled
 */
export function isDebugEnabled(): boolean {
  return debugConfig.enabled && typeof window !== 'undefined'
}

/**
 * Log debug message if debug mode is enabled
 */
function debugLog(level: DebugConfig['logLevel'], message: string, data?: unknown): void {
  if (!isDebugEnabled()) return
  
  const levels = ['error', 'warn', 'info', 'debug']
  const configLevelIndex = levels.indexOf(debugConfig.logLevel)
  const messageLevelIndex = levels.indexOf(level)
  
  if (messageLevelIndex <= configLevelIndex) {
    const timestamp = new Date().toISOString()
    const prefix = `[Executor Debug ${timestamp}]`
    
    switch (level) {
      case 'error':
        console.error(prefix, message, data)
        break
      case 'warn':
        console.warn(prefix, message, data)
        break
      case 'info':
        console.info(prefix, message, data)
        break
      case 'debug':
        console.debug(prefix, message, data)
        break
    }
  }
}

/**
 * Start tracking a tool execution
 */
export function startExecutionTracking(
  toolId: string,
  action: string,
  parameters: Record<string, unknown>,
  executionType: 'local' | 'server',
  options?: {
    correlationId?: string
    source?: string
  }
): string {
  const executionId = crypto.randomUUID()
  
  const record: ExecutionRecord = {
    id: executionId,
    toolId,
    action,
    parameters: debugConfig.logRequestBodies ? parameters : {},
    executionType,
    startTime: Date.now(),
    success: false,
    correlationId: options?.correlationId,
    source: options?.source,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
  }
  
  // Add request body for server executions
  if (executionType === 'server' && debugConfig.logRequestBodies) {
    record.requestBody = JSON.stringify({
      action,
      parameters,
      metadata: {
        correlationId: options?.correlationId,
        source: options?.source,
        timestamp: new Date().toISOString()
      }
    }, null, 2)
  }
  
  executionHistory.push(record)
  
  // Trim history if it gets too large
  if (executionHistory.length > debugConfig.maxHistorySize) {
    executionHistory = executionHistory.slice(-debugConfig.maxHistorySize)
  }
  
  debugLog('info', `Started execution tracking`, {
    executionId,
    toolId,
    action,
    executionType,
    parametersCount: Object.keys(parameters).length
  })
  
  return executionId
}

/**
 * Complete execution tracking with success result
 */
export function completeExecutionTracking(
  executionId: string,
  response?: ToolApiResponse,
  httpStatus?: number
): void {
  const record = executionHistory.find(r => r.id === executionId)
  if (!record) {
    debugLog('warn', 'Could not find execution record', { executionId })
    return
  }
  
  record.endTime = Date.now()
  record.duration = record.endTime - record.startTime
  record.success = true
  record.httpStatus = httpStatus
  
  if (debugConfig.logResponseBodies && response) {
    record.responseBody = JSON.stringify(response, null, 2)
  }
  
  debugLog('info', `Completed execution tracking`, {
    executionId,
    toolId: record.toolId,
    duration: record.duration,
    httpStatus,
    success: true
  })
  
  // Update performance metrics
  if (debugConfig.trackPerformance) {
    updatePerformanceMetrics()
  }
}

/**
 * Complete execution tracking with error result
 */
export function completeExecutionTrackingWithError(
  executionId: string,
  error: Error | string,
  httpStatus?: number
): void {
  const record = executionHistory.find(r => r.id === executionId)
  if (!record) {
    debugLog('warn', 'Could not find execution record', { executionId })
    return
  }
  
  record.endTime = Date.now()
  record.duration = record.endTime - record.startTime
  record.success = false
  record.error = error instanceof Error ? error.message : error
  record.httpStatus = httpStatus
  
  debugLog('error', `Failed execution tracking`, {
    executionId,
    toolId: record.toolId,
    duration: record.duration,
    error: record.error,
    httpStatus
  })
  
  // Update performance metrics
  if (debugConfig.trackPerformance) {
    updatePerformanceMetrics()
  }
}

/**
 * Get complete execution history
 */
export function getExecutionHistory(
  filters?: {
    toolId?: string
    success?: boolean
    minDuration?: number
    maxDuration?: number
    since?: Date
  }
): ExecutionRecord[] {
  let filtered = [...executionHistory]
  
  if (filters) {
    if (filters.toolId) {
      filtered = filtered.filter(r => r.toolId === filters.toolId)
    }
    if (filters.success !== undefined) {
      filtered = filtered.filter(r => r.success === filters.success)
    }
    if (filters.minDuration !== undefined) {
      filtered = filtered.filter(r => (r.duration || 0) >= filters.minDuration!)
    }
    if (filters.maxDuration !== undefined) {
      filtered = filtered.filter(r => (r.duration || 0) <= filters.maxDuration!)
    }
    if (filters.since) {
      filtered = filtered.filter(r => r.startTime >= filters.since!.getTime())
    }
  }
  
  return filtered.sort((a, b) => b.startTime - a.startTime)
}

/**
 * Get performance metrics for all tool executions
 */
export function getPerformanceMetrics(): PerformanceMetrics {
  if (performanceData) {
    return performanceData
  }
  
  return updatePerformanceMetrics()
}

/**
 * Update performance metrics from execution history
 */
function updatePerformanceMetrics(): PerformanceMetrics {
  const completedExecutions = executionHistory.filter(r => r.duration !== undefined)
  const durations = completedExecutions.map(r => r.duration!).sort((a, b) => a - b)
  
  // Calculate percentiles
  const p95Index = Math.floor(durations.length * 0.95)
  const medianIndex = Math.floor(durations.length * 0.5)
  
  // Tool breakdown
  const toolBreakdown: Record<string, { count: number; averageTime: number; successRate: number }> = {}
  
  for (const record of completedExecutions) {
    if (!toolBreakdown[record.toolId]) {
      toolBreakdown[record.toolId] = { count: 0, averageTime: 0, successRate: 0 }
    }
    
    const tool = toolBreakdown[record.toolId]!
    tool.count++
    
    // Running average for execution time
    tool.averageTime = (tool.averageTime * (tool.count - 1) + record.duration!) / tool.count
  }
  
  // Success rates
  for (const toolId of Object.keys(toolBreakdown)) {
    const toolRecords = completedExecutions.filter(r => r.toolId === toolId)
    const successCount = toolRecords.filter(r => r.success).length
    toolBreakdown[toolId]!.successRate = successCount / toolRecords.length
  }
  
  // Error breakdown
  const errorBreakdown: Record<string, number> = {}
  for (const record of executionHistory.filter(r => !r.success && r.error)) {
    const errorType = record.error!.split(':')[0] || 'Unknown'
    errorBreakdown[errorType] = (errorBreakdown[errorType] || 0) + 1
  }
  
  // Slowest executions (top 10)
  const slowestExecutions = [...completedExecutions]
    .sort((a, b) => (b.duration || 0) - (a.duration || 0))
    .slice(0, 10)
  
  performanceData = {
    totalExecutions: executionHistory.length,
    successfulExecutions: executionHistory.filter(r => r.success).length,
    failedExecutions: executionHistory.filter(r => !r.success).length,
    averageExecutionTime: durations.reduce((a, b) => a + b, 0) / durations.length || 0,
    medianExecutionTime: durations[medianIndex] || 0,
    p95ExecutionTime: durations[p95Index] || 0,
    toolBreakdown,
    errorBreakdown,
    slowestExecutions
  }
  
  return performanceData
}

/**
 * Clear execution history and reset metrics
 */
export function clearExecutionHistory(): void {
  executionHistory = []
  performanceData = null
  debugLog('info', 'Execution history cleared')
}

/**
 * Export execution history for external analysis
 */
export function exportExecutionHistory(): string {
  const exportData = {
    timestamp: new Date().toISOString(),
    config: debugConfig,
    history: executionHistory,
    metrics: getPerformanceMetrics()
  }
  
  return JSON.stringify(exportData, null, 2)
}

/**
 * Pretty print execution summary to console
 */
export function printExecutionSummary(): void {
  if (!isDebugEnabled()) {
    console.warn('[Executor Debug] Debug mode not enabled')
    return
  }
  
  const metrics = getPerformanceMetrics()
  
  console.group('🚀 Tool Executor Performance Summary')
  console.log(`📊 Total Executions: ${metrics.totalExecutions}`)
  console.log(`✅ Successful: ${metrics.successfulExecutions} (${(metrics.successfulExecutions / metrics.totalExecutions * 100).toFixed(1)}%)`)
  console.log(`❌ Failed: ${metrics.failedExecutions} (${(metrics.failedExecutions / metrics.totalExecutions * 100).toFixed(1)}%)`)
  console.log(`⏱️  Average Time: ${metrics.averageExecutionTime.toFixed(0)}ms`)
  console.log(`📈 95th Percentile: ${metrics.p95ExecutionTime.toFixed(0)}ms`)
  
  console.group('🔧 Tool Breakdown')
  for (const [toolId, data] of Object.entries(metrics.toolBreakdown)) {
    console.log(`${toolId}: ${data.count} executions, ${data.averageTime.toFixed(0)}ms avg, ${(data.successRate * 100).toFixed(1)}% success`)
  }
  console.groupEnd()
  
  if (Object.keys(metrics.errorBreakdown).length > 0) {
    console.group('🚨 Error Breakdown')
    for (const [errorType, count] of Object.entries(metrics.errorBreakdown)) {
      console.log(`${errorType}: ${count} occurrences`)
    }
    console.groupEnd()
  }
  
  if (metrics.slowestExecutions.length > 0) {
    console.group('🐌 Slowest Executions')
    for (const execution of metrics.slowestExecutions.slice(0, 5)) {
      console.log(`${execution.toolId}.${execution.action}: ${execution.duration}ms`)
    }
    console.groupEnd()
  }
  
  console.groupEnd()
}

/**
 * Set up global debug helpers on window object (development only)
 */
export function installGlobalDebugHelpers(): void {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    ;(window as any).toolExecutorDebug = {
      enable: () => setExecutorDebugMode(true),
      disable: () => setExecutorDebugMode(false),
      config: configureExecutorDebug,
      history: getExecutionHistory,
      metrics: getPerformanceMetrics,
      summary: printExecutionSummary,
      clear: clearExecutionHistory,
      export: exportExecutionHistory
    }
    
    console.log('🛠️  Tool Executor debug helpers installed on window.toolExecutorDebug')
  }
}

// Development helper types for global installation
declare global {
  interface Window {
    toolExecutorDebug?: {
      enable(): void
      disable(): void
      config(config: Partial<DebugConfig>): void
      history(filters?: Parameters<typeof getExecutionHistory>[0]): ExecutionRecord[]
      metrics(): PerformanceMetrics
      summary(): void
      clear(): void
      export(): string
    }
  }
}