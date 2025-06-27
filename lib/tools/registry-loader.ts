/**
 * Tool registry loader.
 * 
 * Automatically imports and registers all tool implementations.
 * This file should be imported early in the application lifecycle
 * to ensure all tools are available.
 * 
 * @see docs/reference/ARCHITECTURE_FOR_TOOLS.md for documentation
 */

import { lockRegistry, getRegistryStats } from './registry'
import { TOOL_REGISTRY_CONFIG } from '../config'

/**
 * Import all tool implementations
 * 
 * Each import will automatically register the tool via side effects.
 * Tools are imported dynamically to support lazy loading in the future.
 */
async function loadAllTools() {
  // Import all tool implementations
  // Each file will register its tool during import
  
  try {
    // Get registry functions - force re-registration with allowOverwrite
    const { registerTool } = await import('./registry')
    
    // Analysis tools
    const glossaryModule = await import('./implementations/glossary')
    const metadataModule = await import('./implementations/metadata')
    
    // Navigation tools
    const structureModule = await import('./implementations/structure')
    
    // Interactive tools
    const chatModule = await import('./implementations/chat')
    const searchModule = await import('./implementations/search')
    
    // Generation tools
    const summaryModule = await import('./implementations/summary')
    const highlightsModule = await import('./implementations/highlights')
    
    // Re-register all tools in TOOL_ORDER sequence to ensure consistent ordering
    // This matches the expected order in command-generation.ts TOOL_ORDER array
    const toolModules = [
      structureModule,     // 'structure' - should be first (consolidates original + ai-generated)
      summaryModule,       // 'summary' - should be second
      chatModule,          // 'chat' - should be third
      glossaryModule,      // 'glossary' - should be fourth
      searchModule,        // 'search' - should be fifth
      highlightsModule,    // 'highlights' - should be sixth
      metadataModule       // 'metadata' - should be last
    ]
    
    for (const toolModule of toolModules) {
      if (toolModule.default) {
        registerTool(toolModule.default, { allowOverwrite: true })
      }
    }
    
    if (TOOL_REGISTRY_CONFIG.LOG_LEVEL !== 'silent') {
      console.log('✅ All tool implementations loaded successfully')
    }
  } catch (error) {
    console.error('❌ Failed to load tool implementations:', error)
    throw error
  }
}

/**
 * Initialize the tool registry
 * 
 * Loads all tools and locks the registry to prevent late registrations.
 * Should be called during application startup.
 */
export async function initializeToolRegistry(): Promise<void> {
  try {
    // Load all tool implementations
    await loadAllTools()
    
    // Lock the registry to prevent further registrations
    lockRegistry()
    
    // Log registry statistics (consolidated)
    if (TOOL_REGISTRY_CONFIG.LOG_LEVEL !== 'silent') {
      const stats = getRegistryStats()
      
      if (TOOL_REGISTRY_CONFIG.LOG_LEVEL === 'verbose') {
        console.log(`🔧 Tool registry initialized with ${stats.totalTools} tools:`)
        console.log(`   Categories: ${JSON.stringify(stats.categories)}`)
        console.log(`   Tools: ${stats.toolIds.join(', ')}`)
        
        if (process.env.NODE_ENV === 'development') {
          console.log('🛠️  Development mode: UNREGISTERED_TOOL_GUARD enabled')
        }
      } else {
        // Normal mode: single consolidated line
        console.log(`🔧 Tool registry: ${stats.totalTools} tools initialized`)
      }
    }
  } catch (error) {
    console.error('💥 Failed to initialize tool registry:', error)
    throw error
  }
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
    const loadedModule = await import(/* webpackIgnore: true */ toolPath)
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
  
  tools.forEach(tool => {
    const validation = validateTool(tool)
    
    if (!validation.isValid) {
      console.error(`❌ Tool validation failed for "${tool.id}":`)
      validation.errors.forEach(error => console.error(`   - ${error}`))
      hasErrors = true
    }
    
    if (validation.warnings.length > 0) {
      console.warn(`⚠️  Tool validation warnings for "${tool.id}":`)
      validation.warnings.forEach(warning => console.warn(`   - ${warning}`))
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
    console.warn('⚠️  Keyword conflicts detected:')
    conflicts.keywords.forEach((tools: string[], keyword: string) => {
      console.warn(`   "${keyword}" used by: ${tools.join(', ')}`)
    })
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
    console.log('✅ No tool conflicts detected')
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
  return tools.filter((tool: any) => {
    // Basic readiness checks
    return (
      tool.componentPath && 
      tool.shortcuts && 
      tool.shortcuts.length > 0 &&
      tool.description && 
      tool.description.length > 10
    )
  })
}

/**
 * All development tools are exported above as individual functions
 * This allows for easy importing and testing of tool registry functionality
 */