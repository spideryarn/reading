/**
 * Glossary tool implementation for the unified tool registry.
 * 
 * This tool extracts and displays key terms and concepts from documents
 * using AI analysis, providing an interactive glossary with search
 * and highlighting capabilities.
 * 
 * @see docs/reference/TOOL_GLOSSARY.md for user documentation
 * @see docs/reference/ARCHITECTURE_FOR_TOOLS.md for technical documentation
 */

import { registerTool } from '../registry'
import { BookOpen } from '@phosphor-icons/react/dist/ssr'
import type { Tool } from '../types'

/**
 * Glossary tool definition
 */
const glossaryTool: Tool = {
  // Identity & Metadata
  id: 'glossary',
  name: 'Glossary',
  description: 'Extract and display key terms and concepts from the document',
  category: 'analysis',
  icon: BookOpen,
  
  // UI Integration
  componentPath: '@/components/tools/GlossaryPanel',
  tabId: 'glossary',
  shortcuts: ['Cmd+5', 'Ctrl+5'],
  keywords: ['terms', 'definitions', 'concepts', 'vocabulary', 'entities'],
  
  // Behavior Configuration
  requiresDocument: true,
  autoLoad: false,
  capabilities: {
    search: true,
    export: true,
    realtime: true
  },
  
  // URL State Integration
  urlStateKeys: ['term']
}

// Register the tool on module load
registerTool(glossaryTool)

export default glossaryTool