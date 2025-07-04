/**
 * Command generation utilities for dynamic command palette integration.
 * 
 * Transforms tools from the registry into command palette entries,
 * enabling dynamic command generation instead of hardcoded definitions.
 * 
 * Key features:
 * - Automatic keyword extraction from tool names and descriptions
 * - Conflict detection for shortcuts and keywords
 * - Type-safe command generation with comprehensive error handling
 * - Development mode debugging support
 * 
 * ## Generation Algorithm
 * 
 * 1. **Tool → Command Mapping**:
 *    - tool.id → command.id with 'nav-' prefix
 *    - tool.name → command.name (unchanged)
 *    - tool.shortcuts → command.shortcut (platform-specific modifiers)
 *    - tool.category → command.category (mapped to navigation)
 *    - tool.icon → command.icon (unchanged)
 *    - tool.requiresDocument → command.condition (availability check)
 * 
 * 2. **Keyword Generation**:
 *    - Use explicit tool.keywords if provided
 *    - Add tool.name.toLowerCase()
 *    - Extract meaningful words from description (first 5, excluding common words)
 *    - Remove duplicates
 * 
 * 3. **Shortcut Conflict Resolution**:
 *    - Detect duplicate shortcuts across all tools
 *    - Throw error in production (fail fast)
 *    - Log warnings for keyword conflicts (less critical)
 * 
 * 4. **Category Mapping**:
 *    - All tool categories → 'navigation' category in command palette
 *    - Maintains priority 1 for consistent ordering
 * 
 * 5. **Action Generation**:
 *    - command.action calls navigateToTab(tool.tabId)
 *    - Requires getNavigateToTab function from options
 *    - Throws descriptive error if navigation not available
 * 
 * 6. **Conditional Availability**:
 *    - Tools with requiresDocument=true get condition function
 *    - condition() checks getCurrentDocument() for document presence
 *    - Returns false if no document provider (safe default)
 * 
 * @see docs/planning/250614c_command_palette_dynamic_generation.md
 */

import type { 
  Tool, 
  CommandGenerationOptions as BaseCommandGenerationOptions, 
  ConflictReport as BaseConflictReport 
} from './types'
import * as React from 'react'
import type { ComponentType } from 'react'

/**
 * Command interface matching the existing command palette structure
 */
export interface GeneratedCommand {
  id: string
  name: string
  keywords: string[]
  shortcut?: string[]
  category: GeneratedCommandCategory
  action: () => void | Promise<void>
  condition?: () => boolean
  icon?: ComponentType<{ size?: number; className?: string }>
}

/**
 * Command categories for the command palette
 */
export interface GeneratedCommandCategory {
  id: string
  name: string
  priority: number
}

/**
 * Tool-to-command category mappings
 * Maps tool categories to command palette categories
 */
const CATEGORY_MAPPINGS: Record<Tool['category'], GeneratedCommandCategory> = {
  navigation: {
    id: 'navigation',
    name: 'Navigation',
    priority: 1,
  },
  analysis: {
    id: 'navigation', // Analysis tools appear in navigation
    name: 'Navigation',
    priority: 1,
  },
  generation: {
    id: 'navigation', // Generation tools appear in navigation
    name: 'Navigation', 
    priority: 1,
  },
  interactive: {
    id: 'navigation', // Interactive tools appear in navigation
    name: 'Navigation',
    priority: 1,
  }
}

/**
 * Extended command generation options with navigation and context providers
 */
export interface ExtendedCommandGenerationOptions extends BaseCommandGenerationOptions {
  /** Navigation function provider for actions */
  getNavigateToTab?: () => (tabId: string) => void
  
  /** Document context provider for conditional availability */
  getCurrentDocument?: () => unknown
  
  /** Platform detection for keyboard shortcuts */
  isMac?: boolean
}

/**
 * Extended conflict detection results for debugging
 */
export interface ExtendedConflictReport extends BaseConflictReport {
  /** Tool IDs with conflicts */
  toolsWithConflicts: Set<string>
}

/**
 * Default keyword extraction strategy
 * 
 * Extracts searchable keywords from tool name and description
 * to maintain fuzzy search capabilities.
 */
export function extractKeywordsFromTool(tool: Tool): string[] {
  const keywords: string[] = []
  
  // Use explicit keywords if provided
  if (tool.keywords && tool.keywords.length > 0) {
    keywords.push(...tool.keywords)
  }
  
  // Add name variations
  keywords.push(tool.name.toLowerCase())
  
  // Extract meaningful words from description (filter common words)
  const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'with', 'for', 'to', 'of', 'in', 'on', 'at', 'by'])
  const descriptionWords = tool.description
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 2 && !commonWords.has(word))
    .slice(0, 5) // Limit to first 5 meaningful words
  
  keywords.push(...descriptionWords)
  
  // Remove duplicates and return
  return Array.from(new Set(keywords))
}

/**
 * Detect conflicts between tools for shortcuts and keywords
 */
export function detectToolConflicts(tools: Tool[]): ExtendedConflictReport {
  const shortcutMap = new Map<string, string[]>()
  const keywordMap = new Map<string, string[]>()
  const conflictedTools = new Set<string>()
  
  // Build conflict maps
  tools.forEach(tool => {
    // Track shortcut usage
    tool.shortcuts?.forEach(shortcut => {
      const toolIds = shortcutMap.get(shortcut) || []
      toolIds.push(tool.id)
      shortcutMap.set(shortcut, toolIds)
      
      if (toolIds.length > 1) {
        toolIds.forEach(id => conflictedTools.add(id))
      }
    })
    
    // Track keyword usage (exact matches only for conflicts)
    const keywords = tool.keywords || extractKeywordsFromTool(tool)
    keywords.forEach(keyword => {
      const toolIds = keywordMap.get(keyword) || []
      toolIds.push(tool.id)
      keywordMap.set(keyword, toolIds)
      
      if (toolIds.length > 1) {
        toolIds.forEach(id => conflictedTools.add(id))
      }
    })
  })
  
  // Filter to only actual conflicts (multiple tools per key)
  const shortcutConflicts = new Map(
    Array.from(shortcutMap.entries()).filter(([, toolIds]) => toolIds.length > 1)
  )
  
  const keywordConflicts = new Map(
    Array.from(keywordMap.entries()).filter(([, toolIds]) => toolIds.length > 1)
  )
  
  return {
    shortcuts: shortcutConflicts,
    keywords: keywordConflicts,
    duplicateIds: new Map(), // Currently not detecting ID conflicts
    toolsWithConflicts: conflictedTools
  }
}

/**
 * Transform keyboard shortcuts from tool format to command format
 * 
 * Handles platform-specific modifiers (Cmd on Mac, Ctrl on Windows/Linux)
 */
export function transformShortcuts(
  toolShortcuts: string[] | undefined, 
  isMac = false
): string[] | undefined {
  if (!toolShortcuts || toolShortcuts.length === 0) {
    return undefined
  }
  
  // Find the appropriate shortcut for the platform, or use the first one
  const platformShortcut = isMac 
    ? toolShortcuts.find(s => s.includes('Cmd')) || toolShortcuts.find(s => s.includes('⌘')) || toolShortcuts[0]
    : toolShortcuts.find(s => s.includes('Ctrl')) || toolShortcuts[0]
  
  if (!platformShortcut) {
    return undefined
  }
  
  // Transform the shortcut for display
  const transformed = platformShortcut
    .replace(/Cmd/g, isMac ? '⌘' : 'Ctrl')
    .replace(/Ctrl/g, isMac ? '⌘' : 'Ctrl')
  
  return [transformed]
}

let _hasLoggedKeywordConflictWarning = false

/**
 * Generate commands from tool registry
 * 
 * Main function that transforms registered tools into command palette entries
 */
export function generateCommandsFromRegistry(
  tools: Tool[],
  options: ExtendedCommandGenerationOptions = {}
): GeneratedCommand[] {
  const {
    detectConflicts = true,
    includeDisabled = false,
    extractKeywords = extractKeywordsFromTool,
    getNavigateToTab,
    getCurrentDocument,
    isMac = false
  } = options
  
  // Conflict detection if enabled
  if (detectConflicts) {
    const conflicts = detectToolConflicts(tools)
    
    if (conflicts.shortcuts.size > 0) {
      const conflictDetails = Array.from(conflicts.shortcuts.entries())
        .map(([shortcut, toolIds]) => `"${shortcut}": ${toolIds.join(', ')}`)
        .join('; ')
      
      throw new Error(
        `Shortcut conflicts detected in tool registry: ${conflictDetails}. ` +
        `Each shortcut must be unique across all tools.`
      )
    }
    
    if (
      conflicts.keywords.size > 0 &&
      process.env.NODE_ENV === 'development' &&
      !_hasLoggedKeywordConflictWarning
    ) {
      // Use debug level and log only once per session to avoid console noise
      console.debug(
        '⚠️ Keyword conflicts detected (may affect search ranking):',
        Object.fromEntries(conflicts.keywords)
      )
      _hasLoggedKeywordConflictWarning = true
    }
  }
  
  // Generate commands from tools
  const commands: GeneratedCommand[] = []
  
  tools.forEach(tool => {
    // Skip disabled tools unless explicitly included
    if (!includeDisabled && tool.requiresDocument && !getCurrentDocument?.()) {
      // Tool requires document but none available - skip in static generation
      // Will be handled by condition function in dynamic evaluation
    }
    
    // Generate command
    const transformedShortcuts = transformShortcuts(tool.shortcuts, isMac)
    const command: GeneratedCommand = {
      id: `nav-${tool.id}`, // Match existing pattern: nav-glossary, nav-summary, etc.
      name: tool.name,
      keywords: extractKeywords(tool),
      ...(transformedShortcuts && { shortcut: transformedShortcuts }),
      category: CATEGORY_MAPPINGS[tool.category],
      icon: ({ size, className }: { size?: number; className?: string }) => {
        const IconComponent = tool.icon
        const iconProps: { size?: number; className?: string } = {}
        if (size !== undefined) iconProps.size = size
        if (className !== undefined) iconProps.className = className
        return React.createElement(IconComponent, iconProps)
      },
      action: () => {
        if (!getNavigateToTab) {
          throw new Error(
            `Cannot execute tool "${tool.id}": getNavigateToTab not provided. ` +
            `This function must be supplied in CommandGenerationOptions.`
          )
        }
        
        const navigateToTab = getNavigateToTab()
        navigateToTab(tool.tabId)
      }
    }
    
    // Add conditional availability for document-dependent tools
    if (tool.requiresDocument) {
      command.condition = () => {
        if (!getCurrentDocument) {
          // If no document provider, assume false for safety
          return false
        }
        return !!getCurrentDocument()
      }
    }
    
    commands.push(command)
  })
  
  // Sort commands to match vertical icon rail order
  // This ensures consistent ordering in command palette with UI navigation
  const TOOL_ORDER = [
    'structure',
    'summary',
    'chat',
    'glossary',
    'search',
    'highlights',
    'metadata'
  ]
  
  commands.sort((a, b) => {
    // Extract tool ID from command ID (nav-glossary -> glossary)
    const toolIdA = a.id.replace('nav-', '')
    const toolIdB = b.id.replace('nav-', '')
    
    const indexA = TOOL_ORDER.indexOf(toolIdA)
    const indexB = TOOL_ORDER.indexOf(toolIdB)
    
    // If both tools are in the order list, sort by position
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB
    }
    
    // If only one is in the order list, prioritize it
    if (indexA !== -1) return -1
    if (indexB !== -1) return 1
    
    // If neither is in the order list, sort alphabetically
    return toolIdA.localeCompare(toolIdB)
  })
  
  return commands
}

/**
 * Development mode debugging utilities
 */
export const debugUtils = {
  /**
   * Log detailed command generation report
   */
  logGenerationReport(tools: Tool[], commands: GeneratedCommand[]): void {
    if (process.env.NODE_ENV !== 'development') return
    
    console.log('🔧 Command Generation Report:')
    console.log(`  • ${tools.length} tools processed`)
    console.log(`  • ${commands.length} commands generated`)
    
    // Group by category
    const byCategory = commands.reduce((acc, cmd) => {
      const catId = cmd.category.id
      acc[catId] = (acc[catId] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    console.log(`  • Categories:`, byCategory)
    
    // List tools with shortcuts
    const withShortcuts = commands.filter(cmd => cmd.shortcut?.length)
    console.log(`  • ${withShortcuts.length} commands have shortcuts`)
    
    // List conditional commands
    const conditional = commands.filter(cmd => cmd.condition)
    console.log(`  • ${conditional.length} commands are conditional`)
  },
  
  /**
   * Validate generated commands match expected structure
   */
  validateCommands(commands: GeneratedCommand[]): string[] {
    const errors: string[] = []
    
    commands.forEach((cmd, index) => {
      if (!cmd.id || typeof cmd.id !== 'string') {
        errors.push(`Command ${index}: invalid id`)
      }
      
      if (!cmd.name || typeof cmd.name !== 'string') {
        errors.push(`Command ${index}: invalid name`)
      }
      
      if (!cmd.category || typeof cmd.category.id !== 'string') {
        errors.push(`Command ${index}: invalid category`)
      }
      
      if (!cmd.action || typeof cmd.action !== 'function') {
        errors.push(`Command ${index}: invalid action`)
      }
      
      if (!Array.isArray(cmd.keywords)) {
        errors.push(`Command ${index}: keywords must be array`)
      }
    })
    
    return errors
  }
}