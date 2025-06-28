import { registerTool } from '@/lib/tools/registry'
import { TwitterLogo } from '@phosphor-icons/react/dist/ssr'
import type { Tool } from '@/lib/tools/types'

const tweetThreadTool: Tool = {
  id: 'tweet-thread',
  name: 'Tweet Thread',
  description: 'Convert document into shareable Twitter thread format',
  category: 'generation',
  icon: TwitterLogo,
  
  componentPath: '@/components/tools/TweetThreadPanel',
  tabId: 'tweet-thread',
  shortcuts: ['Cmd+9', 'Ctrl+9'],
  keywords: ['twitter', 'thread', 'social', 'share', 'tweet'],
  
  requiresDocument: true,
  autoLoad: false,
  capabilities: {
    export: true,
    realtime: false
  }
}

// Register the tool on module load
registerTool(tweetThreadTool)

export default tweetThreadTool