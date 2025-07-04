/**
 * Auto-generated typed wrapper functions for the tool execution framework.
 * 
 * This module provides type-safe wrapper functions that generate IntelliSense-friendly
 * APIs for tool execution. It prevents manual drift by generating wrappers directly
 * from the tool registry at runtime.
 * 
 * Key features:
 * - Type-safe wrapper per tool generated from registry schemas
 * - IntelliSense support with typed parameters for each tool
 * - Multiple action methods: execute(), open(), refresh()
 * - Auto-generation prevents manual maintenance drift
 * - Runtime generation for development velocity
 * 
 * Usage:
 * ```typescript
 * const tools = generateToolWrappers(getAllTools())
 * await tools.glossary.execute({ refresh: true })     // Server execution
 * await tools.glossary.open({ term: 'AI' })           // Local navigation  
 * await tools.search.execute({ query: 'AI', type: 'semantic' })
 * await tools.highlights.refresh()                    // Refresh data
 * ```
 * 
 * @see docs/planning/250614d_tool_execution_framework.md - Stage 5 implementation
 * @see lib/tools/command-generation.ts - Similar auto-generation pattern
 */

import type { Tool } from '@/lib/tools/types'
import { executeTool } from './executor'
import type {
  ToolWrapper,
  GeneratedToolWrappers,
  ExecutionOptions,
  ToolExecutionResult,
  WrapperGenerationConfig
} from './types'

/**
 * Configuration for wrapper generation with sensible defaults
 */
const DEFAULT_WRAPPER_CONFIG: WrapperGenerationConfig = {
  includeTypes: true,
  includeDocumentation: true,
  validateParameters: false // Validation is handled by executor
}

/**
 * Generate typed wrapper functions for all registered tools
 * 
 * Creates a runtime-generated object with type-safe wrappers for each tool.
 * Each wrapper provides execute(), open(), and refresh() methods with proper
 * TypeScript support and IntelliSense.
 * 
 * @param tools - Array of tools from registry
 * @param config - Generation configuration options
 * @returns Object with tool wrappers keyed by tool ID
 * 
 * @example
 * ```typescript
 * import { getAllTools } from '@/lib/tools/registry'
 * import { generateToolWrappers } from '@/lib/tools/executor/wrappers'
 * 
 * const tools = generateToolWrappers(getAllTools())
 * 
 * // Type-safe execution with IntelliSense
 * const result = await tools.glossary.execute({ refresh: true })
 * await tools.metadata.open({ section: 'document-info' })
 * await tools.search.refresh()
 * ```
 */
export function generateToolWrappers(
  tools: Tool[],
  config = DEFAULT_WRAPPER_CONFIG
): GeneratedToolWrappers {
  const wrappers: GeneratedToolWrappers = {}
  
  // Validate input
  if (!Array.isArray(tools)) {
    throw new Error('generateToolWrappers: tools must be an array')
  }
  
  // Generate wrapper for each tool
  tools.forEach(tool => {
    if (!tool?.id) {
      console.warn('generateToolWrappers: Skipping tool with missing ID:', tool)
      return
    }
    
    wrappers[tool.id] = createToolWrapper(tool, config)
  })
  
  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔧 Generated ${Object.keys(wrappers).length} typed tool wrappers:`, Object.keys(wrappers).sort())
  }
  
  return wrappers
}

/**
 * Create a type-safe wrapper for a single tool
 * 
 * @param tool - Tool definition from registry
 * @param config - Generation configuration
 * @returns ToolWrapper with execute(), open(), and refresh() methods
 */
function createToolWrapper(tool: Tool, config: WrapperGenerationConfig): ToolWrapper {
  const toolId = tool.id
  
  // Create the wrapper object with all three action methods
  const wrapper: ToolWrapper = {
    /**
     * Execute tool with server processing
     * 
     * Performs the primary tool operation, typically involving server-side
     * processing, data fetching, or AI operations.
     * 
     * @param parameters - Tool-specific parameters
     * @param options - Execution options (timeout, source, etc.)
     * @returns Promise resolving to execution result
     */
    async execute(
      parameters: Record<string, unknown> = {},
      options: ExecutionOptions = {}
    ): Promise<ToolExecutionResult> {
      return executeTool(toolId, 'execute', parameters, {
        source: 'direct',
        ...options
      })
    },
    
    /**
     * Open tool (navigation/local operation)
     * 
     * Performs local navigation to the tool's tab or pane. This is typically
     * used for UI navigation and doesn't involve server processing.
     * 
     * @param parameters - Tool-specific parameters for navigation state
     * @param options - Execution options
     * @returns Promise resolving to navigation result
     */
    async open(
      parameters: Record<string, unknown> = {},
      options: ExecutionOptions = {}
    ): Promise<ToolExecutionResult> {
      return executeTool(toolId, 'open', parameters, {
        source: 'direct',
        forceExecutionType: 'local', // Navigation is always local
        ...options
      })
    },
    
    /**
     * Refresh tool data
     * 
     * Refreshes or reloads the tool's data, typically by re-executing
     * the tool's primary operation with fresh data.
     * 
     * @param parameters - Tool-specific parameters for refresh
     * @param options - Execution options
     * @returns Promise resolving to refresh result
     */
    async refresh(
      parameters: Record<string, unknown> = {},
      options: ExecutionOptions = {}
    ): Promise<ToolExecutionResult> {
      return executeTool(toolId, 'refresh', parameters, {
        source: 'direct',
        ...options
      })
    }
  }
  
  // Add JSDoc documentation for IntelliSense if enabled
  if (config.includeDocumentation) {
    // Note: JSDoc comments are added above in the interface definition
    // Runtime JSDoc modification is not supported, but the interface provides
    // IntelliSense support through TypeScript's type system
  }
  
  return wrapper
}

/**
 * Create a typed wrapper for a specific tool by ID
 * 
 * This is a convenience function for creating a single tool wrapper
 * without needing the full registry.
 * 
 * @param tool - Tool definition
 * @param config - Generation configuration
 * @returns Single tool wrapper
 * 
 * @example
 * ```typescript
 * import { getTool } from '@/lib/tools/registry'
 * import { createSingleToolWrapper } from '@/lib/tools/executor/wrappers'
 * 
 * const glossaryTool = getTool('glossary')!
 * const glossary = createSingleToolWrapper(glossaryTool)
 * 
 * await glossary.execute({ refresh: true })
 * ```
 */
export function createSingleToolWrapper(
  tool: Tool,
  config = DEFAULT_WRAPPER_CONFIG
): ToolWrapper {
  if (!tool?.id) {
    throw new Error('createSingleToolWrapper: tool must have an ID')
  }
  
  return createToolWrapper(tool, config)
}

/**
 * Type-safe wrapper generator with specific tool typing
 * 
 * This function provides better TypeScript inference by constraining
 * the tool types at compile time.
 * 
 * @param tools - Strongly typed array of tools
 * @param config - Generation configuration
 * @returns Wrappers with tool-specific typing
 */
export function generateTypedToolWrappers<T extends Tool[]>(
  tools: T,
  config = DEFAULT_WRAPPER_CONFIG
): GeneratedToolWrappers {
  return generateToolWrappers(tools, config)
}

/**
 * Validation utilities for wrapper generation
 */
export const wrapperValidation = {
  /**
   * Validate tools array before wrapper generation
   */
  validateToolsArray(tools: unknown[]): string[] {
    const errors: string[] = []
    
    if (!Array.isArray(tools)) {
      errors.push('Tools must be an array')
      return errors
    }
    
    tools.forEach((tool, index) => {
      if (!tool || typeof tool !== 'object') {
        errors.push(`Tool at index ${index}: must be an object`)
        return
      }
      
      const typedTool = tool as Partial<Tool>
      
      if (!typedTool.id || typeof typedTool.id !== 'string') {
        errors.push(`Tool at index ${index}: must have a string ID`)
      }
      
      if (!typedTool.name || typeof typedTool.name !== 'string') {
        errors.push(`Tool at index ${index}: must have a string name`)
      }
      
      if (!typedTool.tabId || typeof typedTool.tabId !== 'string') {
        errors.push(`Tool at index ${index}: must have a string tabId`)
      }
    })
    
    return errors
  },
  
  /**
   * Check for duplicate tool IDs
   */
  validateUniqueIds(tools: Tool[]): string[] {
    const errors: string[] = []
    const seenIds = new Set<string>()
    
    tools.forEach(tool => {
      if (seenIds.has(tool.id)) {
        errors.push(`Duplicate tool ID: ${tool.id}`)
      } else {
        seenIds.add(tool.id)
      }
    })
    
    return errors
  }
}

/**
 * Development utilities for debugging wrapper generation
 */
export const debugUtils = {
  /**
   * Log detailed wrapper generation report
   */
  logWrapperReport(tools: Tool[], wrappers: GeneratedToolWrappers): void {
    if (process.env.NODE_ENV !== 'development') return
    
    console.log('🔧 Tool Wrapper Generation Report:')
    console.log(`  • ${tools.length} tools processed`)
    console.log(`  • ${Object.keys(wrappers).length} wrappers generated`)
    
    // List generated wrappers
    const wrapperIds = Object.keys(wrappers).sort()
    console.log(`  • Generated wrappers:`, wrapperIds)
    
    // Check for missing wrappers
    const missingWrappers = tools
      .filter(tool => !wrappers[tool.id])
      .map(tool => tool.id)
      
    if (missingWrappers.length > 0) {
      console.warn(`  • Missing wrappers:`, missingWrappers)
    }
    
    // Validate wrapper structure
    const validationErrors = Object.entries(wrappers)
      .flatMap(([id, wrapper]) => {
        const errors: string[] = []
        
        if (typeof wrapper.execute !== 'function') {
          errors.push(`${id}: missing execute method`)
        }
        
        if (typeof wrapper.open !== 'function') {
          errors.push(`${id}: missing open method`)
        }
        
        if (typeof wrapper.refresh !== 'function') {
          errors.push(`${id}: missing refresh method`)
        }
        
        return errors
      })
    
    if (validationErrors.length > 0) {
      console.error(`  • Validation errors:`, validationErrors)
    } else {
      console.log(`  • All wrappers valid ✅`)
    }
  },
  
  /**
   * Test wrapper functionality
   */
  async testWrapper(toolId: string, wrapper: ToolWrapper): Promise<void> {
    if (process.env.NODE_ENV === 'production') return
    
    console.log(`🧪 Testing wrapper for ${toolId}`)
    
    try {
      // Test that methods exist and are callable
      if (typeof wrapper.execute === 'function') {
        console.log(`  • execute method: ✅`)
      } else {
        console.error(`  • execute method: ❌ (not a function)`)
      }
      
      if (typeof wrapper.open === 'function') {
        console.log(`  • open method: ✅`)
      } else {
        console.error(`  • open method: ❌ (not a function)`)
      }
      
      if (typeof wrapper.refresh === 'function') {
        console.log(`  • refresh method: ✅`)
      } else {
        console.error(`  • refresh method: ❌ (not a function)`)
      }
      
    } catch (error) {
      console.error(`  • Test failed:`, error)
    }
  }
}

/**
 * Export types for external use
 */
export type {
  ToolWrapper,
  GeneratedToolWrappers,
  WrapperGenerationConfig
} from './types'