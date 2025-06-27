'use client'

/**
 * Navigation-aware tool execution hooks for the Spideryarn Reading application.
 * 
 * This module provides enhanced tool execution that automatically handles navigation
 * when tools return navigation results. It integrates with the URL state management
 * system to ensure consistent navigation behavior across the application.
 * 
 * ## Architecture
 * 
 * The navigation integration follows a layered approach:
 * 
 * 1. **Core Executor**: `executeTool()` returns navigation results for 'open' actions
 * 2. **Navigation Handler**: Processes navigation results and calls `navigateToTab()`
 * 3. **URL State Integration**: Updates URL parameters through nuqs/next-navigation
 * 4. **Component Integration**: Components use hooks to execute tools with navigation
 * 
 * ## Usage Patterns
 * 
 * ### For Component Integration
 * ```typescript
 * function MyComponent() {
 *   const executeWithNav = useToolExecutorWithNavigation()
 *   
 *   const handleOpenTool = async () => {
 *     await executeWithNav('glossary', 'open', { term: 'example' })
 *     // Navigation happens automatically if successful
 *   }
 * }
 * ```
 * 
 * ### For Direct Navigation
 * ```typescript
 * function MyComponent() {
 *   const { openTool } = useToolNavigation()
 *   
 *   const handleClick = () => openTool('summary', { level: 'detailed' })
 * }
 * ```
 * 
 * ### For Command Palette Integration
 * The command palette already uses this pattern through `generateCommandsFromRegistry()`:
 * ```typescript
 * action: () => {
 *   const navigateToTab = getNavigateToTab()
 *   navigateToTab(tool.tabId) // This triggers URL state update
 * }
 * ```
 * 
 * ## Error Handling
 * 
 * Navigation failures are handled gracefully:
 * - If navigation throws, the result is updated with `success: false` and error details
 * - The original correlation ID and metadata are preserved for debugging
 * - No exceptions are thrown - callers can check the result status
 * 
 * ## Testing
 * 
 * The core navigation logic is exposed as pure functions for easier testing:
 * - `executeWithNavigation()` - Core logic with navigation handling
 * - `navigateToTool()` - Convenience function for tool navigation
 * 
 * These functions accept the `navigateToTab` function as a parameter, making them
 * testable without React context dependencies.
 * 
 * @see lib/tools/hooks/use-tool-url-state.ts for URL state management
 * @see lib/tools/executor/executor.ts for core tool execution
 * @see components/command-palette.tsx for command palette integration
 */

import { useCallback } from 'react'
import { executeTool } from '../executor/executor'
import { useNavigateToTab } from './use-tool-url-state'
import type { TabValue } from '../url-state-types'
import type { 
  ToolExecutionResult, 
  ExecutionOptions,
  ToolExecutor 
} from '../executor/types'

/**
 * Enhanced tool executor with navigation integration
 */
export interface NavigationAwareExecutor extends ToolExecutor {
  /** 
   * Execute tool with automatic navigation handling 
   * When result type is 'navigation', automatically updates URL state
   */
  (
    toolId: string,
    action: string,
    parameters?: Record<string, unknown>,
    options?: ExecutionOptions
  ): Promise<ToolExecutionResult>
}

/**
 * Core navigation execution logic (exposed for testing)
 */
export async function executeWithNavigation(
  navigateToTab: (tabId: TabValue) => void,
  toolId: string,
  action: string,
  parameters: Record<string, unknown> = {},
  options: ExecutionOptions = {}
): Promise<ToolExecutionResult> {
  // Execute the tool using the standard executor
  const result = await executeTool(toolId, action, parameters, options)
  
  // Handle navigation results by updating URL state
  if (result.type === 'navigation' && result.data) {
    const navigationData = result.data as {
      tab?: string
      parameters?: Record<string, unknown>
      success?: boolean
    }
    
    // Only navigate if the navigation was successful and we have a tab ID
    if (navigationData.success !== false && navigationData.tab) {
      try {
        navigateToTab(navigationData.tab as TabValue)
      } catch (error) {
        // If navigation fails, update the result to reflect the error
        // but don't throw - let the caller handle the result
        console.warn(`Navigation failed for tool ${toolId}:`, error)
        return {
          ...result,
          data: {
            ...navigationData,
            success: false,
            error: error instanceof Error ? error.message : 'Navigation failed'
          }
        }
      }
    }
  }
  
  return result
}

/**
 * Hook that provides tool execution with automatic navigation handling
 * 
 * @returns Enhanced executor function that handles navigation automatically
 */
export function useToolExecutorWithNavigation(): NavigationAwareExecutor {
  const navigateToTab = useNavigateToTab()
  
  const executor = useCallback<NavigationAwareExecutor>(
    async (toolId, action, parameters = {}, options = {}) => {
      return executeWithNavigation(navigateToTab, toolId, action, parameters, options)
    },
    [navigateToTab]
  )
  
  return executor
}

/**
 * Core navigation function (exposed for testing)
 */
export async function navigateToTool(
  navigateToTab: (tabId: TabValue) => void,
  toolId: string,
  parameters?: Record<string, unknown>
): Promise<ToolExecutionResult> {
  return executeWithNavigation(navigateToTab, toolId, 'open', parameters, {
    source: 'direct'
  })
}

/**
 * Convenience hook for command palette and keyboard shortcut integration
 * 
 * This provides a simpler interface specifically for navigation-focused actions
 * like opening tools from the command palette or keyboard shortcuts.
 * 
 * @returns Function optimized for navigation actions
 */
export function useToolNavigation() {
  const navigateToTab = useNavigateToTab()
  
  const openTool = useCallback(
    async (toolId: string, parameters?: Record<string, unknown>) => {
      return navigateToTool(navigateToTab, toolId, parameters)
    },
    [navigateToTab]
  )
  
  return { openTool }
}