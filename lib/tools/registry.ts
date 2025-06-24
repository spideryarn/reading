/**
 * Core tool registry implementation.
 * 
 * Provides centralized registration and discovery of all document tools.
 * This replaces the previous hardcoded approach with a type-safe,
 * discoverable system.
 * 
 * @see docs/reference/ARCHITECTURE_FOR_TOOLS.md for complete documentation
 */

import type { 
  Tool, 
  ToolRegistry, 
  ToolRegistrationOptions,
  ToolValidationResult,
  ToolDiscoveryFilters,
  ConflictReport
} from './types'

/**
 * Internal registry storage
 */
const toolRegistry: ToolRegistry = new Map()

/**
 * Registry lock to prevent late registrations after initialization
 */
let registryLocked = false

/**
 * Development mode guard for unregistered tool access
 */
const UNREGISTERED_TOOL_GUARD_ENABLED = process.env.NODE_ENV === 'development'

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
    console.log(`✅ Registered tool: ${tool.id} (${tool.name})`)
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
export function validateTool(tool: any): ToolValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Type guard for basic object structure
  if (!tool || typeof tool !== 'object') {
    errors.push('tool must be a non-null object')
    return { isValid: false, errors, warnings }
  }
  
  // Required fields
  if (!tool.id || typeof tool.id !== 'string') {
    errors.push('id is required and must be a string')
  }
  
  if (!tool.name || typeof tool.name !== 'string') {
    errors.push('name is required and must be a string')
  }
  
  if (!tool.description || typeof tool.description !== 'string') {
    errors.push('description is required and must be a string')
  }
  
  if (!tool.category || typeof tool.category !== 'string') {
    errors.push('category is required and must be a string')
  } else {
    const validCategories = ['navigation', 'analysis', 'generation', 'interactive']
    if (!validCategories.includes(tool.category)) {
      errors.push(`category must be one of: ${validCategories.join(', ')}`)
    }
  }
  
  if (!tool.componentPath || typeof tool.componentPath !== 'string') {
    errors.push('componentPath is required and must be a string')
  }
  
  if (!tool.tabId || typeof tool.tabId !== 'string') {
    errors.push('tabId is required and must be a string')
  }
  
  if (typeof tool.requiresDocument !== 'boolean') {
    errors.push('requiresDocument is required and must be a boolean')
  }
  
  // Icon validation - check if it's a function (React component) or object with displayName
  if (!tool.icon) {
    errors.push('icon is required')
  } else if (typeof tool.icon !== 'function' && typeof tool.icon !== 'object') {
    errors.push('icon must be a React component (function or component object)')
  }
  
  // Optional field validation
  if (tool.shortcuts && !Array.isArray(tool.shortcuts)) {
    errors.push('shortcuts must be an array of strings')
  }
  
  if (tool.keywords && !Array.isArray(tool.keywords)) {
    errors.push('keywords must be an array of strings')
  }
  
  if (tool.autoLoad && typeof tool.autoLoad !== 'boolean') {
    errors.push('autoLoad must be a boolean')
  }
  
  if (tool.urlStateKeys && !Array.isArray(tool.urlStateKeys)) {
    errors.push('urlStateKeys must be an array of strings')
  }
  
  // Warnings for missing optional but recommended fields
  if (!tool.shortcuts || tool.shortcuts.length === 0) {
    warnings.push('No keyboard shortcuts defined - tool will not be accessible via keyboard')
  }
  
  if (!tool.keywords || tool.keywords.length === 0) {
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
  
  if (UNREGISTERED_TOOL_GUARD_ENABLED) {
    console.log(`🔒 Tool registry locked with ${toolRegistry.size} tools`)
    
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