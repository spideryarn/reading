/**
 * Highlights tool implementation for the unified tool registry.
 * 
 * This tool provides semantic highlighting based on custom criteria
 * with real-time feedback and visual marking of document content.
 * 
 * @see docs/reference/TOOL_HIGHLIGHTS.md for user documentation
 * @see docs/reference/ARCHITECTURE_FOR_TOOLS.md for technical documentation
 */

import { registerTool } from '../registry'
import { HighlighterCircle } from '@phosphor-icons/react/dist/ssr'
import type { Tool } from '../types'

/**
 * Highlights tool definition
 */
const highlightsTool: Tool = {
  // Identity & Metadata
  id: 'highlights',
  name: 'Highlights',
  description: 'Apply semantic highlighting based on custom criteria to emphasize key content',
  category: 'generation',
  icon: HighlighterCircle,
  
  // UI Integration
  componentPath: '@/components/highlight-management',
  tabId: 'highlights',
  shortcuts: ['Cmd+H', 'Ctrl+H'],
  keywords: ['highlights', 'semantic', 'criteria', 'marking', 'emphasis'],
  
  // Behavior Configuration
  requiresDocument: true,
  autoLoad: false,
  capabilities: {
    search: true,
    export: false,
    realtime: true
  },
  
  // URL State Integration
  urlStateKeys: ['highlight']
}

// Register the tool on module load
registerTool(highlightsTool)

export default highlightsTool