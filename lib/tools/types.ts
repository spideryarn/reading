/**
 * Core type definitions for the unified tool registry system.
 * 
 * This file defines the interfaces and types that all tools must conform to,
 * enabling type-safe tool registration, discovery, and execution.
 * 
 * @see docs/reference/ARCHITECTURE_FOR_TOOLS.md for complete documentation
 */

import { ComponentType } from 'react'
import type { IconProps } from '@phosphor-icons/react'

/**
 * Tool categories for organization and discovery
 */
export type ToolCategory = 
  | 'navigation'    // Document viewing and navigation (Original, AI-Generated, Summary)
  | 'analysis'      // Content analysis tools (Glossary, Metadata)
  | 'generation'    // AI-powered content generation (Summary, Highlights)
  | 'interactive'   // Interactive interfaces (Chat, Search)

/**
 * Tab identifier values for URL state and navigation
 */
export type TabValue = 
  | 'original'
  | 'ai-generated'
  | 'summary'
  | 'chat'
  | 'glossary'
  | 'search'
  | 'highlights'
  | 'metadata'

/**
 * Tool capabilities flags for feature detection
 */
export interface ToolCapabilities {
  /** Tool supports internal search functionality */
  search?: boolean
  
  /** Tool can export data in various formats */
  export?: boolean
  
  /** Tool updates in real-time as document changes */
  realtime?: boolean
  
  /** Tool supports collaborative features */
  collaborative?: boolean
}

/**
 * Core tool interface that all tools must implement
 */
export interface Tool {
  // Identity & Metadata
  /** Unique identifier (e.g., 'glossary') */
  id: string
  
  /** Display name (e.g., 'Glossary') */
  name: string
  
  /** Description for command palette and tooltips */
  description: string
  
  /** Categorization for organization */
  category: ToolCategory
  
  /** Phosphor icon component */
  icon: ComponentType<IconProps>
  
  // UI Integration
  /** Path to lazy-load component (e.g., '@/components/tools/GlossaryPanel') */
  componentPath: string
  
  /** ID for tab navigation system */
  tabId: TabValue
  
  /** Keyboard shortcuts (['Cmd+5', 'Ctrl+5']) */
  shortcuts?: string[]
  
  /** Additional search terms for command palette */
  keywords?: string[]
  
  // Behavior Configuration
  /** Can only run with document context */
  requiresDocument: boolean
  
  /** Load immediately on tab activation */
  autoLoad?: boolean
  
  /** Feature flags for this tool */
  capabilities?: ToolCapabilities
  
  // URL State Integration (optional)
  /** Which URL parameters this tool uses */
  urlStateKeys?: string[]
}

/**
 * Props interface for tool components
 */
export interface ToolComponentProps {
  /** Current document if available */
  document?: any // TODO: Replace with proper document type
  
  /** Whether this tool's tab is currently active */
  isActive: boolean
  
  /** Error callback for tool-level errors */
  onError?: (error: Error) => void
}

/**
 * Registry storage type
 */
export type ToolRegistry = Map<string, Tool>

/**
 * Tool registration options
 */
export interface ToolRegistrationOptions {
  /** Allow overwriting existing tool registrations */
  allowOverwrite?: boolean
  
  /** Skip validation during registration */
  skipValidation?: boolean
}

/**
 * Tool validation result
 */
export interface ToolValidationResult {
  /** Whether the tool is valid */
  isValid: boolean
  
  /** List of validation errors */
  errors: string[]
  
  /** List of validation warnings */
  warnings: string[]
}

/**
 * Tool discovery filters
 */
export interface ToolDiscoveryFilters {
  /** Filter by category */
  category?: ToolCategory
  
  /** Filter by document requirement */
  requiresDocument?: boolean
  
  /** Filter by capability */
  hasCapability?: keyof ToolCapabilities
  
  /** Filter by keyword search */
  search?: string
}

/**
 * Command generation options for dynamic command palette
 */
export interface CommandGenerationOptions {
  /** Enable conflict detection for shortcuts and keywords */
  detectConflicts?: boolean
  
  /** Include disabled/unavailable tools */
  includeDisabled?: boolean
  
  /** Custom keyword extraction function */
  extractKeywords?: (tool: Tool) => string[]
}

/**
 * Conflict report for debugging
 */
export interface ConflictReport {
  /** Shortcut conflicts: shortcut -> tool IDs */
  shortcuts: Map<string, string[]>
  
  /** Keyword conflicts: keyword -> tool IDs */
  keywords: Map<string, string[]>
  
  /** ID conflicts: tool ID -> count */
  duplicateIds: Map<string, number>
}

/**
 * Tool execution context (for future use)
 */
export interface ToolExecutionContext {
  /** Current document information */
  document?: {
    id: string
    title: string
    content: string
    metadata: Record<string, any>
  }
  
  /** User context */
  user?: {
    id: string
    preferences: Record<string, any>
  }
  
  /** Request metadata */
  request?: {
    correlationId: string
    timestamp: Date
    source: 'command-palette' | 'keyboard' | 'api' | 'llm'
  }
}

/**
 * Tool execution parameters (for future use)
 */
export interface ToolExecutionParams {
  /** Action to perform */
  action?: 'open' | 'execute' | 'refresh' | 'export'
  
  /** Tool-specific parameters */
  [key: string]: any
}

/**
 * Tool execution result (for future use)
 */
export interface ToolExecutionResult {
  /** Result type */
  type: 'navigation' | 'data' | 'error' | 'stream'
  
  /** Result data */
  data?: any
  
  /** Error information if type is 'error' */
  error?: {
    message: string
    code?: string
    details?: Record<string, any>
  }
  
  /** Metadata about the execution */
  metadata?: {
    executionTime: number
    cached: boolean
    [key: string]: any
  }
}

/**
 * Type guard to check if an object is a valid Tool
 */
export function isTool(obj: any): obj is Tool {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.description === 'string' &&
    typeof obj.category === 'string' &&
    typeof obj.componentPath === 'string' &&
    typeof obj.tabId === 'string' &&
    typeof obj.requiresDocument === 'boolean' &&
    (typeof obj.icon === 'function' || (typeof obj.icon === 'object' && obj.icon !== null))
  )
}

/**
 * Helper type for tool registration without internal fields
 */
export type ToolDefinition = Omit<Tool, never> // All fields required for now

/**
 * Export commonly used types
 */
export type {
  Tool as ToolInterface,
  ToolRegistry as Registry,
  ToolCategory as Category,
  TabValue as Tab
}