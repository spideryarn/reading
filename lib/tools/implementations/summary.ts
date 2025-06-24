/**
 * Summary tool implementation for the unified tool registry.
 * 
 * This tool generates hierarchical summaries at multiple levels of detail
 * using AI analysis with configurable expertise and length parameters.
 * 
 * @see docs/reference/TOOL_SUMMARISE.md for user documentation
 * @see docs/reference/ARCHITECTURE_FOR_TOOLS.md for technical documentation
 */

import { registerTool } from '../registry'
import { ListBullets } from '@phosphor-icons/react/dist/ssr'
import type { Tool } from '../types'

/**
 * Summary tool definition
 */
const summaryTool: Tool = {
  // Identity & Metadata
  id: 'summary',
  name: 'Summary',
  description: 'Generate hierarchical summaries at multiple levels of detail and expertise',
  category: 'generation',
  icon: ListBullets,
  
  // UI Integration
  componentPath: '@/components/multi-summary-pane',
  tabId: 'summary',
  shortcuts: ['Cmd+3', 'Ctrl+3'],
  keywords: ['summary', 'summarize', 'overview', 'digest', 'hierarchical'],
  
  // Behavior Configuration
  requiresDocument: true,
  autoLoad: true,
  capabilities: {
    search: false,
    export: true,
    realtime: false
  },
  
  // URL State Integration
  urlStateKeys: ['expertise', 'length']
}

// Register the tool on module load
registerTool(summaryTool)

export default summaryTool