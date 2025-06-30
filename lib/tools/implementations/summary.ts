/**
 * Summary tool implementation for the unified tool registry.
 * 
 * This tool generates hierarchical summaries at multiple levels of detail
 * using AI analysis with configurable expertise and length parameters.
 * 
 * Supports both single and multi-dimensional summary generation through
 * the unified tool execution framework.
 * 
 * @see docs/reference/TOOL_SUMMARISE.md for user documentation
 * @see docs/reference/ARCHITECTURE_FOR_TOOLS.md for technical documentation
 */

import { registerTool } from '../registry'
import { ListBullets } from '@phosphor-icons/react/dist/ssr'
import { z } from 'zod'
import type { ExecutableTool } from '../executor/types'

/**
 * Summary tool definition with executor framework integration
 */
const summaryTool: ExecutableTool = {
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
  urlStateKeys: ['expertise', 'length'],
  
  // Executor Framework Configuration
  executorConfig: {
    apiEndpoint: '/api/tools/summary',
    supportedActions: ['execute', 'generate', 'refresh', 'multi-summarise'],
    parameterSchema: z.object({
      // Single summary parameters
      content: z.string().min(1).optional(),
      documentId: z.string().min(1).optional(),
      granularity: z.string().optional(),
      sectionId: z.string().optional(),
      
      // Multi-summary parameters (content and documentId overlap)
      // action determines which type of summary to generate
      
      // GET/DELETE parameters
      type: z.enum(['single', 'multi-summarise', 'all']).optional()
    }).refine(
      () => {
        // For POST operations, either content or documentId should be provided
        // Content is required for generation, documentId for cached retrieval
        return true // Validation handled by individual handlers
      },
      {
        message: 'Either content or documentId must be provided'
      }
    ),
    cacheable: true,
    requiresAuth: true
  },

  timeouts: {
    default: 180_000,
    ai: 180_000,
    analysis: 180_000,
  }
}

// Register the tool on module load
registerTool(summaryTool)

export default summaryTool