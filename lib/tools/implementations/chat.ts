/**
 * Chat tool implementation for the unified tool registry.
 * 
 * This tool provides an AI-powered chat interface for asking questions
 * about documents using the @assistant-ui/react library.
 * 
 * @see docs/reference/TOOL_CHATBOT_ASSISTANT_UI_INTEGRATION.md for user documentation
 * @see docs/reference/ARCHITECTURE_FOR_TOOLS.md for technical documentation
 */

import { registerTool } from '../registry'
import { ChatCircle } from '@phosphor-icons/react/dist/ssr'
import type { Tool } from '../types'

/**
 * Chat tool definition
 */
const chatTool: Tool = {
  // Identity & Metadata
  id: 'chat',
  name: 'Chat',
  description: 'Ask questions and get AI-powered answers about the document content',
  category: 'interactive',
  icon: ChatCircle,
  
  // UI Integration
  componentPath: '@/components/assistant-chat',
  tabId: 'chat',
  shortcuts: ['Cmd+4', 'Ctrl+4'],
  keywords: ['chat', 'ask', 'questions', 'ai', 'assistant', 'conversation'],
  
  // Behavior Configuration
  requiresDocument: true,
  autoLoad: false,
  capabilities: {
    search: false,
    export: false,
    realtime: true
  },
  
  // URL State Integration
  urlStateKeys: ['conversation'],
  
  // Execution Framework Configuration
  executorConfig: {
    apiEndpoint: '/api/tools/chat',
    timeout: 60000, // 60 seconds for AI chat operations
    supportedActions: ['send', 'execute', 'create', 'get', 'list', 'delete'],
    requiresAuth: true,
    cacheable: false // Chat responses should not be cached
  }
}

// Register the tool on module load
registerTool(chatTool)

export default chatTool