/**
 * Core tool registry implementation.
 * 
 * Provides centralized registration and discovery of all document tools.
 * This replaces the previous hardcoded approach with a type-safe,
 * discoverable system.
 * 
 * @see docs/reference/TOOL_ARCHITECTURE_AND_DEVELOPMENT_GUIDE.md for complete documentation
 */

import type { 
  Tool, 
  ToolRegistry, 
  ToolRegistrationOptions,
  ToolValidationResult,
  ToolDiscoveryFilters,
  ConflictReport
} from './types'
import { TOOL_REGISTRY_CONFIG } from '../config'

// ---------------------------------------------------------------------------
// Hot-reload-safe singleton state
// ---------------------------------------------------------------------------
// Using a symbol-like string key avoids clashes with other globals while
// remaining serialisable for the browser devtools console.
const __SY_TOOL_REGISTRY_SINGLETON__ = '__SY_TOOL_REGISTRY_SINGLETON__' as const

// Retrieve any existing singleton (created by a previous evaluation of this
// module).  Next.js Fast Refresh / Webpack HMR can execute module factories
// multiple times in the same runtime, so we must ensure all copies share the
// SAME underlying Map instance – otherwise `getTool()` may read from a
// different registry than the one that received the `registerTool()` calls
// inside `registry-loader`.
//
// We store a small object on `globalThis` so it works in both the browser and
// Node runtimes.
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const globalState: {
  toolRegistry?: ToolRegistry
  registryLocked?: boolean
  registeredTools?: Array<{ id: string; name: string }>
} = (globalThis as any)[__SY_TOOL_REGISTRY_SINGLETON__] || {}

// ---------------------------------------------------------------------------
// Core singleton fields
// ---------------------------------------------------------------------------
const toolRegistry: ToolRegistry = globalState.toolRegistry ?? new Map();
let registryLocked = globalState.registryLocked ?? false;
const registeredTools: Array<{ id: string; name: string }> = globalState.registeredTools ?? [];

// Persist any newly created fields back on the global object so that future
// evaluations of this module pick them up instead of creating fresh ones.
(globalThis as any)[__SY_TOOL_REGISTRY_SINGLETON__] = {
  toolRegistry,
  registryLocked,
  registeredTools
};

// ---------------------------------------------------------------------------
// Existing implementation (registerTool, getTool, etc.) continues below
// ---------------------------------------------------------------------------

/**
 * Development mode guard for unregistered tool access
 */
const UNREGISTERED_TOOL_GUARD_ENABLED = process.env.NODE_ENV === 'development'

/**
 * Tool registry logging level configuration
 */
const TOOL_REGISTRY_LOG_LEVEL = TOOL_REGISTRY_CONFIG.LOG_LEVEL

/**
 * Register a tool in the registry
 * 
 * @param tool - Tool definition to register
 * @param options - Registration options
 * @throws Error if tool is invalid or registry is locked
 */
export function registerTool(
  tool: Tool, 
  options: ToolRegistrationOptions = {}
): void {
  // Check if registry is locked
  if (registryLocked && !options.allowOverwrite) {
    throw new Error(
      `Cannot register tool after initialization: ${tool.id}. ` +
      `Use options.allowOverwrite = true to force registration.`
    )
  }
  
  // Check for existing tool
  if (toolRegistry.has(tool.id) && !options.allowOverwrite) {
    throw new Error(
      `Tool already registered: ${tool.id}. ` +
      `Use options.allowOverwrite = true to replace existing tool.`
    )
  }
  
  // Validate tool if not skipped
  if (!options.skipValidation) {
    const validation = validateTool(tool)
    if (!validation.isValid) {
      throw new Error(
        `Invalid tool registration for "${tool.id}": ` +
        validation.errors.join(', ')
      )
    }
    
    // Log warnings in development
    if (validation.warnings.length > 0 && UNREGISTERED_TOOL_GUARD_ENABLED) {
      console.warn(
        `Tool registration warnings for "${tool.id}":`,
        validation.warnings
      )
    }
  }
  
  // Register the tool
  toolRegistry.set(tool.id, tool)
  
  if (UNREGISTERED_TOOL_GUARD_ENABLED) {
    // Track for batch logging
    registeredTools.push({ id: tool.id, name: tool.name })
    
    // Only log individual registrations in verbose mode
    if (TOOL_REGISTRY_LOG_LEVEL === 'verbose') {
      console.log(`✅ Registered tool: ${tool.id} (${tool.name})`)
    }
  }
}

/**
 * Get a specific tool by ID
 * 
 * @param id - Tool identifier
 * @returns Tool definition or undefined if not found
 */
export function getTool(id: string): Tool | undefined {
  const tool = toolRegistry.get(id)
  
  // Development mode guard for missing tools
  if (!tool && UNREGISTERED_TOOL_GUARD_ENABLED) {
    console.error(
      `🚨 UNREGISTERED_TOOL_GUARD: Attempted to access unregistered tool: ${id}`
    )
    console.error(
      `Available tools: ${Array.from(toolRegistry.keys()).join(', ')}`
    )
  }
  
  return tool
}

/**
 * Get all registered tools
 * 
 * @param filters - Optional filters to apply
 * @returns Array of tool definitions
 */
export function getAllTools(filters?: ToolDiscoveryFilters): Tool[] {
  let tools = Array.from(toolRegistry.values())
  
  if (!filters) {
    return tools
  }
  
  // Apply filters
  if (filters.category) {
    tools = tools.filter(tool => tool.category === filters.category)
  }
  
  if (filters.requiresDocument !== undefined) {
    tools = tools.filter(tool => tool.requiresDocument === filters.requiresDocument)
  }
  
  if (filters.hasCapability) {
    tools = tools.filter(tool => 
      tool.capabilities?.[filters.hasCapability!] === true
    )
  }
  
  if (filters.search) {
    const searchTerm = filters.search.toLowerCase()
    tools = tools.filter(tool => 
      tool.name.toLowerCase().includes(searchTerm) ||
      tool.description.toLowerCase().includes(searchTerm) ||
      tool.keywords?.some(keyword => 
        keyword.toLowerCase().includes(searchTerm)
      )
    )
  }
  
  return tools
}

/**
 * Get tools by category
 * 
 * @param category - Tool category
 * @returns Array of tools in the category
 */
export function getToolsByCategory(category: Tool['category']): Tool[] {
  return getAllTools({ category })
}

/**
 * Check if a tool is registered
 * 
 * @param id - Tool identifier
 * @returns True if tool exists in registry
 */
export function hasRegisteredTool(id: string): boolean {
  return toolRegistry.has(id)
}

/**
 * Get registry statistics
 * 
 * @returns Registry information
 */
export function getRegistryStats() {
  const tools = getAllTools()
  const categories = new Map<string, number>()
  
  tools.forEach(tool => {
    categories.set(tool.category, (categories.get(tool.category) || 0) + 1)
  })
  
  return {
    totalTools: tools.length,
    categories: Object.fromEntries(categories),
    registryLocked,
    toolIds: tools.map(tool => tool.id).sort()
  }
}

/**
 * Validate a tool definition
 * 
 * @param tool - Tool to validate
 * @returns Validation result with errors and warnings
 */
export function validateTool(tool: unknown): ToolValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Type guard for basic object structure
  if (!tool || typeof tool !== 'object') {
    errors.push('tool must be a non-null object')
    return { isValid: false, errors, warnings }
  }
  
  // Cast to record for property access
  const toolRecord = tool as Record<string, unknown>
  
  // Required fields
  if (!toolRecord.id || typeof toolRecord.id !== 'string') {
    errors.push('id is required and must be a string')
  }
  
  if (!toolRecord.name || typeof toolRecord.name !== 'string') {
    errors.push('name is required and must be a string')
  }
  
  if (!toolRecord.description || typeof toolRecord.description !== 'string') {
    errors.push('description is required and must be a string')
  }
  
  if (!toolRecord.category || typeof toolRecord.category !== 'string') {
    errors.push('category is required and must be a string')
  } else {
    const validCategories = ['navigation', 'analysis', 'generation', 'interactive']
    if (!validCategories.includes(toolRecord.category)) {
      errors.push(`category must be one of: ${validCategories.join(', ')}`)
    }
  }
  
  if (!toolRecord.componentPath || typeof toolRecord.componentPath !== 'string') {
    errors.push('componentPath is required and must be a string')
  }
  
  if (!toolRecord.tabId || typeof toolRecord.tabId !== 'string') {
    errors.push('tabId is required and must be a string')
  }
  
  if (typeof toolRecord.requiresDocument !== 'boolean') {
    errors.push('requiresDocument is required and must be a boolean')
  }
  
  // Icon validation - check if it's a function (React component) or object with displayName
  if (!toolRecord.icon) {
    errors.push('icon is required')
  } else if (typeof toolRecord.icon !== 'function' && typeof toolRecord.icon !== 'object') {
    errors.push('icon must be a React component (function or component object)')
  }
  
  // Optional field validation
  if (toolRecord.shortcuts && !Array.isArray(toolRecord.shortcuts)) {
    errors.push('shortcuts must be an array of strings')
  }
  
  if (toolRecord.keywords && !Array.isArray(toolRecord.keywords)) {
    errors.push('keywords must be an array of strings')
  }
  
  if (toolRecord.autoLoad && typeof toolRecord.autoLoad !== 'boolean') {
    errors.push('autoLoad must be a boolean')
  }
  
  if (toolRecord.urlStateKeys && !Array.isArray(toolRecord.urlStateKeys)) {
    errors.push('urlStateKeys must be an array of strings')
  }
  
  // Warnings for missing optional but recommended fields
  if (!toolRecord.shortcuts || (Array.isArray(toolRecord.shortcuts) && toolRecord.shortcuts.length === 0)) {
    warnings.push('No keyboard shortcuts defined - tool will not be accessible via keyboard')
  }
  
  if (!toolRecord.keywords || (Array.isArray(toolRecord.keywords) && toolRecord.keywords.length === 0)) {
    warnings.push('No keywords defined - tool may be harder to find in command palette')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Detect conflicts between registered tools
 * 
 * @returns Conflict report with details
 */
export function detectConflicts(): ConflictReport {
  const tools = getAllTools()
  const shortcuts = new Map<string, string[]>()
  const keywords = new Map<string, string[]>()
  const duplicateIds = new Map<string, number>()
  
  tools.forEach(tool => {
    // Track ID usage (should always be 1 each)
    duplicateIds.set(tool.id, (duplicateIds.get(tool.id) || 0) + 1)
    
    // Track shortcut conflicts
    tool.shortcuts?.forEach(shortcut => {
      const existing = shortcuts.get(shortcut) || []
      existing.push(tool.id)
      shortcuts.set(shortcut, existing)
    })
    
    // Track keyword conflicts (only exact matches)
    tool.keywords?.forEach(keyword => {
      const existing = keywords.get(keyword) || []
      existing.push(tool.id)
      keywords.set(keyword, existing)
    })
  })
  
  // Filter to only conflicts (multiple tools per key)
  const shortcutConflicts = new Map(
    Array.from(shortcuts.entries()).filter(([, tools]) => tools.length > 1)
  )
  
  const keywordConflicts = new Map(
    Array.from(keywords.entries()).filter(([, tools]) => tools.length > 1)
  )
  
  const idConflicts = new Map(
    Array.from(duplicateIds.entries()).filter(([, count]) => count > 1)
  )
  
  return {
    shortcuts: shortcutConflicts,
    keywords: keywordConflicts,
    duplicateIds: idConflicts
  }
}

/**
 * Lock the registry to prevent further registrations
 * 
 * Should be called after all tools are registered during app initialization.
 */
export function lockRegistry(): void {
  registryLocked = true
  globalState.registryLocked = true
  
  if (UNREGISTERED_TOOL_GUARD_ENABLED) {
    // Batch summary of registered tools
    if (TOOL_REGISTRY_LOG_LEVEL !== 'silent' && registeredTools.length > 0) {
      const toolNames = registeredTools.map(t => t.id).join(', ')
      console.log(`🔒 Tool registry locked: ${toolRegistry.size} tools (${toolNames})`)
      
      if (TOOL_REGISTRY_LOG_LEVEL === 'verbose') {
        console.log(`   Details: ${registeredTools.map(t => `${t.id} (${t.name})`).join(', ')}`)
      }
    }
    
    // Check for conflicts and warn
    const conflicts = detectConflicts()
    
    if (conflicts.shortcuts.size > 0) {
      console.warn('⚠️ Shortcut conflicts detected:', conflicts.shortcuts)
    }
    
    if (conflicts.duplicateIds.size > 0) {
      console.error('🚨 Duplicate tool IDs detected:', conflicts.duplicateIds)
    }
  }
}

/**
 * Check if registry is locked
 * 
 * @returns True if registry is locked
 */
export function isRegistryLocked(): boolean {
  return registryLocked
}

/**
 * Reset registry for testing
 * 
 * ⚠️ TESTING ONLY - Clears all tools and unlocks registry
 */
export function resetRegistryForTests(): void {
  if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'development') {
    throw new Error('resetRegistryForTests() can only be called in test or development environment')
  }
  
  toolRegistry.clear()
  registryLocked = false
  globalState.registryLocked = false
  
  if (UNREGISTERED_TOOL_GUARD_ENABLED) {
    console.log('🧪 Tool registry reset for testing')
  }
}

/**
 * Export internal registry for testing/debugging
 * 
 * ⚠️ Do not use in production code - use getAllTools() instead
 */
export function __getInternalRegistry(): ToolRegistry {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('__getInternalRegistry() is not available in production')
  }
  
  return toolRegistry
}

// ---------------------------------------------------------------------------
// Auto-initialisation
// ---------------------------------------------------------------------------
// Ensure that the default tool implementations are registered *immediately*
// whenever the registry module is imported.  Doing this here eliminates the
// need for every consumer to import `registry-loader` manually and removes
// ordering problems that caused hydration mismatches when some components
// accessed the registry before the loader had executed.
//
// Using `require` keeps the import synchronous in both the Node (SSR) and
// Webpack (client) environments while remaining safe in the presence of the
// circular dependency (`registry-loader` re-imports `registerTool`).  At the
// point this line runs, `registerTool` is already defined, so the circular
// reference is fully resolved.
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
require('@/lib/tools/registry-loader')

// Re-export key types for external use
export type { 
  Tool,
  ToolRegistry,
  ToolRegistrationOptions,
  ToolValidationResult,
  ToolDiscoveryFilters,
  ConflictReport,
  ToolCategory,
  ToolCapabilities
} from './types'

