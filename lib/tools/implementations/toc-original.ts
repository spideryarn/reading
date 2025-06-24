/**
 * Original Table of Contents tool implementation for the unified tool registry.
 * 
 * This tool displays the original document headings extracted from the
 * document structure, providing navigation and outline functionality.
 * 
 * @see docs/reference/TOOL_HEADINGS.md for user documentation
 * @see docs/reference/ARCHITECTURE_FOR_TOOLS.md for technical documentation
 */

import { registerTool } from '../registry'
import { Article } from '@phosphor-icons/react/dist/ssr'
import type { Tool } from '../types'

/**
 * Original ToC tool definition
 */
const originalTocTool: Tool = {
  // Identity & Metadata
  id: 'toc-original',
  name: 'Original',
  description: 'Navigate using the original document headings and structure',
  category: 'navigation',
  icon: Article,
  
  // UI Integration
  componentPath: '@/components/tools/OriginalTocPanel',
  tabId: 'original',
  shortcuts: ['Cmd+1', 'Ctrl+1'],
  keywords: ['original', 'toc', 'headings', 'navigation', 'outline', 'structure'],
  
  // Behavior Configuration
  requiresDocument: true,
  autoLoad: true,
  capabilities: {
    search: true,
    export: false,
    realtime: true
  },
  
  // URL State Integration
  urlStateKeys: []
}

// Register the tool on module load
registerTool(originalTocTool)

export default originalTocTool