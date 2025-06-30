/**
 * Structure tool implementation for the unified tool registry.
 * 
 * This tool provides a unified interface for viewing and enhancing document structure,
 * combining both original document headings and AI-generated headings with explicit
 * user control over AI enhancements.
 * 
 * @see docs/reference/TOOL_STRUCTURE_HEADINGS.md for user documentation
 * @see docs/reference/ARCHITECTURE_FOR_TOOLS.md for technical documentation
 */

import { registerTool } from '../registry'
import { TreeStructure } from '@phosphor-icons/react/dist/ssr'
import type { ExecutableTool } from '../executor/types'

/**
 * Structure tool definition
 */
const structureTool: ExecutableTool = {
  // Identity & Metadata
  id: 'structure',
  name: 'Structure',
  description: 'View and enhance document structure with AI-generated headings',
  category: 'navigation',
  icon: TreeStructure,
  
  // UI Integration
  componentPath: '@/components/tools/StructurePanel',
  tabId: 'structure',
  shortcuts: ['Cmd+1', 'Ctrl+1'],
  keywords: ['headings', 'toc', 'table of contents', 'structure', 'outline', 'ai', 'generated', 'enhanced'],
  
  // Behavior Configuration
  requiresDocument: true,
  autoLoad: true,
  capabilities: {
    search: true,
    export: false,
    realtime: true
  },
  
  // URL State Integration
  urlStateKeys: [],
  
  // Executor Configuration
  executorConfig: {
    apiEndpoint: '/api/tools/structure',
    supportedActions: ['execute', 'generate', 'iterate', 'apply', 'get', 'delete', 'refresh'],
    requiresAuth: true,
    cacheable: true
  },

  // Per-tool timeout overrides
  timeouts: {
    default: 90_000,
    ai: 90_000,
  }
}

// Register the tool on module load
registerTool(structureTool)

export default structureTool