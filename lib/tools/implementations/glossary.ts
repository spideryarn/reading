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
import type { ExecutableTool } from '../executor/types'

/**
 * Glossary tool definition with execution framework configuration
 */
const glossaryTool: ExecutableTool = {
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
  urlStateKeys: ['term'],
  
  // Execution Framework Configuration
  apiEndpoint: {
    route: 'glossary',
    methods: ['GET', 'POST', 'DELETE'],
    cacheable: true,
    requiresAuth: true,
    timeout: {
      default: 30000,    // 30 seconds for retrieving cached entities
      ai: 90000,         // 90 seconds for AI entity extraction
      analysis: 60000    // 60 seconds for entity analysis
    }
  },
  preferredExecution: 'server',
  localOperations: ['open'],
  serverOperations: ['execute', 'refresh', 'generate'],
  timeouts: {
    default: 30000,
    ai: 90000,         // Glossary generation can take longer due to LLM processing
    analysis: 60000,
    upload: 30000      // Not typically used for glossary
  }
}

// Register the tool on module load
registerTool(glossaryTool)

export default glossaryTool