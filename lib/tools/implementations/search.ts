/**
 * Search tool implementation for the unified tool registry.
 * 
 * This tool provides both text and semantic search capabilities
 * with highlighting and Mark.js integration for document content.
 * 
 * @see docs/reference/TOOL_SEARCH.md for user documentation
 * @see docs/reference/ARCHITECTURE_FOR_TOOLS.md for technical documentation
 */

import { registerTool } from '../registry'
import { MagnifyingGlass } from '@phosphor-icons/react/dist/ssr'
import type { ExecutableTool } from '../executor/types'

/**
 * Search tool definition
 */
const searchTool: ExecutableTool = {
  // Identity & Metadata
  id: 'search',
  name: 'Search',
  description: 'Find text and concepts within the document using text or semantic search',
  category: 'interactive',
  icon: MagnifyingGlass,
  
  // UI Integration
  componentPath: '@/components/tools/SearchPanel',
  tabId: 'search',
  shortcuts: ['Cmd+F', 'Ctrl+F'],
  keywords: ['search', 'find', 'text', 'semantic', 'locate', 'highlight', 'exact match'],
  
  // Behavior Configuration
  requiresDocument: true,
  autoLoad: false,
  capabilities: {
    search: true,
    export: false,
    realtime: true
  },
  
  // URL State Integration
  urlStateKeys: ['q', 'type', 'case'],
  
  // Executor Framework Configuration
  executorConfig: {
    apiEndpoint: '/api/tools/search',
    supportedOperations: ['search', 'history', 'delete']
  },

  timeouts: {
    ai: 60_000,
    default: 60_000,
  }
}

// Register the tool on module load
registerTool(searchTool)

export default searchTool