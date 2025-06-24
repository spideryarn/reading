/**
 * AI-Generated Table of Contents tool implementation for the unified tool registry.
 * 
 * This tool displays AI-enhanced headings that provide improved structure
 * and navigation for documents with poor or missing heading hierarchy.
 * 
 * @see docs/reference/TOOL_HEADINGS.md for user documentation
 * @see docs/reference/ARCHITECTURE_FOR_TOOLS.md for technical documentation
 */

import { registerTool } from '../registry'
import { Robot } from '@phosphor-icons/react/dist/ssr'
import type { Tool } from '../types'

/**
 * AI-Generated ToC tool definition
 */
const aiTocTool: Tool = {
  // Identity & Metadata
  id: 'toc-ai',
  name: 'AI-Generated',
  description: 'Navigate using AI-enhanced headings with improved document structure',
  category: 'navigation',
  icon: Robot,
  
  // UI Integration
  componentPath: '@/components/tools/AiTocPanel',
  tabId: 'ai-generated',
  shortcuts: ['Cmd+2', 'Ctrl+2'],
  keywords: ['ai', 'generated', 'headings', 'enhanced', 'structure', 'improved'],
  
  // Behavior Configuration
  requiresDocument: true,
  autoLoad: true,
  capabilities: {
    search: false,
    export: false,
    realtime: true
  },
  
  // URL State Integration
  urlStateKeys: []
}

// Register the tool on module load
registerTool(aiTocTool)

export default aiTocTool