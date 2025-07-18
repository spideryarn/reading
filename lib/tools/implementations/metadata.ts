/**
 * Metadata tool implementation for the unified tool registry.
 * 
 * This tool displays document metadata, statistics, and properties
 * including reading time, word count, and document information.
 * 
 * @see docs/reference/TOOL_METADATA.md for user documentation
 * @see docs/reference/ARCHITECTURE_FOR_TOOLS.md for technical documentation
 */

import { registerTool } from '@/lib/tools/registry'
import { Tag } from '@phosphor-icons/react/dist/ssr'
import type { ExecutableTool } from '../executor/types'

/**
 * Metadata tool definition with execution framework configuration
 */
const metadataTool: ExecutableTool = {
  // Identity & Metadata
  id: 'metadata',
  name: 'Metadata',
  description: 'View document metadata, statistics, and properties including reading time and word count',
  category: 'analysis',
  icon: Tag,
  
  // UI Integration
  componentPath: '@/components/tools/MetadataPanel',
  tabId: 'metadata',
  shortcuts: ['Cmd+I', 'Ctrl+I'],
  keywords: ['metadata', 'info', 'statistics', 'document', 'properties', 'reading time'],
  
  // Behavior Configuration
  requiresDocument: true,
  autoLoad: false,
  capabilities: {
    search: false,
    export: true,
    realtime: false
  },
  
  // URL State Integration
  urlStateKeys: [],
  
  // Execution Framework Configuration
  apiEndpoint: {
    route: 'metadata',
    methods: ['GET', 'POST', 'DELETE'],
    cacheable: true,
    requiresAuth: true,
    timeout: {
      default: 30000,    // 30 seconds for standard operations
      ai: 45000,         // 45 seconds for reading difficulty analysis
      analysis: 60000    // 60 seconds for complex document analysis
    }
  },
  preferredExecution: 'server',
  localOperations: ['open'],
  serverOperations: ['execute', 'refresh', 'analyze-reading-difficulty'],
  timeouts: {
    default: 30000,
    ai: 45000,
    analysis: 60000,
    upload: 30000      // Not typically used for metadata
  }
}

// Register the tool on module load
export default metadataTool