/**
 * Metadata tool implementation for the unified tool registry.
 * 
 * This tool displays document metadata, statistics, and properties
 * including reading time, word count, and document information.
 * 
 * @see docs/reference/TOOL_METADATA.md for user documentation
 * @see docs/reference/ARCHITECTURE_FOR_TOOLS.md for technical documentation
 */

import { registerTool } from '../registry'
import { Tag } from '@phosphor-icons/react/dist/ssr'
import type { Tool } from '../types'

/**
 * Metadata tool definition
 */
const metadataTool: Tool = {
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
  urlStateKeys: []
}

// Register the tool on module load
registerTool(metadataTool)

export default metadataTool