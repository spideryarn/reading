/**
 * Tool registry loader.
 * 
 * Automatically imports and registers all tool implementations.
 * This file should be imported early in the application lifecycle
 * to ensure all tools are available.
 * 
 * @see docs/reference/ARCHITECTURE_FOR_TOOLS.md for documentation
 */

import { lockRegistry, isRegistryLocked } from './registry'

/**
 * Synchronous tool registration
 *
 * We now import all tool implementations statically so that they register
 * themselves during module evaluation.  This guarantees that the tool
 * registry is fully populated before any React components render and avoids
 * race conditions where navigation components read from an empty registry.
 *
 * @see planning/finished/250614d_tool_execution_framework.md
 */

// Import each implementation – the side-effect of each import is a
// registerTool() call, so no additional work is required.
import './implementations/structure'
import './implementations/summary'
import './implementations/chat'
import './implementations/glossary'
import './implementations/search'
import './implementations/highlights'
import './implementations/tweet-thread'
import './implementations/metadata'

// Once all tools are imported, lock the registry (only if not locked yet – this
// file can be imported in both client and server bundles).
if (!isRegistryLocked()) {
  lockRegistry()
}

/**
 * Backward-compatibility shim – other parts of the codebase still call
 * initializeToolRegistry().  Now that registration happens synchronously at
 * import time, this function simply resolves immediately.  Retaining it avoids
 * refactors in API routes and tests.
 */
export async function initializeToolRegistry(): Promise<void> {
  // No-op – registry is already initialized.
  return
}

/**
 * Manual tool registration function for development
 * 
 * Allows registering individual tools without going through the loader.
 * Useful for testing and development scenarios.
 * 
 * @param toolPath - Path to the tool implementation module
 */
export async function registerToolFromPath(toolPath: string): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('registerToolFromPath() is not available in production')
  }
  
  try {
    // Only use dynamic import in development
    await import(/* webpackIgnore: true */ toolPath)
    console.log(`✅ Manually loaded tool from: ${toolPath}`)
  } catch (error) {
    console.error(`❌ Failed to load tool from ${toolPath}:`, error)
    throw error
  }
}

/**
 * Validate all registered tools
 * 
 * Runs validation on all tools in the registry and reports any issues.
 * Useful for catching configuration problems during development.
 */
export function validateAllRegisteredTools(): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getAllTools, validateTool } = require('./registry')
  const tools = getAllTools()
  
  let hasErrors = false
  let hasWarnings = false
  
  tools.forEach((tool: unknown) => {
    const validation = validateTool(tool)
    
    if (!validation.isValid) {
      console.error(`❌ Tool validation failed for "${(tool as { id?: string })?.id || 'unknown'}":`)
      validation.errors.forEach((error: string) => console.error(`   - ${error}`))
      hasErrors = true
    }
    
    if (validation.warnings.length > 0) {
      console.warn(`⚠️  Tool validation warnings for "${(tool as { id?: string })?.id || 'unknown'}":`)
      validation.warnings.forEach((warning: string) => console.warn(`   - ${warning}`))
      hasWarnings = true
    }
  })
  
  if (!hasErrors && !hasWarnings) {
    console.log('✅ All tools passed validation')
  } else if (!hasErrors) {
    console.log('✅ All tools are valid (with warnings)')
  } else {
    throw new Error('❌ Tool validation failed - see errors above')
  }
}

/**
 * Check for conflicts in registered tools
 * 
 * Detects shortcut and keyword conflicts between tools.
 * Useful for preventing user experience issues.
 */
export function checkForToolConflicts(): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { detectConflicts } = require('./registry')
  const conflicts = detectConflicts()
  
  let hasConflicts = false
  
  if (conflicts.shortcuts.size > 0) {
    console.error('❌ Shortcut conflicts detected:')
    conflicts.shortcuts.forEach((tools: string[], shortcut: string) => {
      console.error(`   "${shortcut}" used by: ${tools.join(', ')}`)
    })
    hasConflicts = true
  }
  
  if (conflicts.keywords.size > 0) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️  Keyword conflicts detected:')
      conflicts.keywords.forEach((tools: string[], keyword: string) => {
        console.warn(`   "${keyword}" used by: ${tools.join(', ')}`)
      })
    }
    // Keywords conflicts are warnings, not errors
  }
  
  if (conflicts.duplicateIds.size > 0) {
    console.error('❌ Duplicate tool IDs detected:')
    conflicts.duplicateIds.forEach((count: number, toolId: string) => {
      console.error(`   "${toolId}" registered ${count} times`)
    })
    hasConflicts = true
  }
  
  if (!hasConflicts) {
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ No tool conflicts detected')
    }
  } else {
    throw new Error('❌ Tool conflicts detected - see errors above')
  }
}

/**
 * Development helper to reload tools
 * 
 * ⚠️ DEVELOPMENT ONLY - Clears and reloads all tools.
 * Useful for hot reloading during development.
 */
export async function reloadToolsForDevelopment(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('reloadToolsForDevelopment() is not available in production')
  }
  
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { resetRegistryForTests } = require('./registry')
  
  // Reset registry
  resetRegistryForTests()
  console.log('🔄 Registry reset for development reload')
  
  // Reload all tools
  await initializeToolRegistry()
}

/**
 * Get tools that are ready for production use
 * 
 * Filters tools based on their implementation completeness.
 * Useful for feature flags and gradual rollouts.
 */
export function getProductionReadyTools() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getAllTools } = require('./registry')
  const tools = getAllTools()
  
  // For now, all registered tools are considered production ready
  // In the future, this could check for additional flags or validation
  return tools.filter((tool: unknown) => {
    // Basic readiness checks
    const t = tool as { componentPath?: string; shortcuts?: string[]; description?: string }
    return (
      t.componentPath && 
      t.shortcuts && 
      t.shortcuts.length > 0 &&
      t.description && 
      t.description.length > 10
    )
  })
}

/**
 * All development tools are exported above as individual functions
 * This allows for easy importing and testing of tool registry functionality
 */