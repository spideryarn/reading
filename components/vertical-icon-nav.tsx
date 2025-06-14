'use client'

// Vertical icon navigation component for collapsed left pane
// Implements VSCode-style activity bar with Phosphor icons and tooltips
// See planning/250608c_vertical_icon_navigation_bar.md for design decisions

import { 
  Article, Robot, ListBullets, ChatCircle, 
  BookOpen, MagnifyingGlass, SidebarSimple, Terminal, HighlighterCircle, Tag
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import * as Tooltip from '@radix-ui/react-tooltip'
import { useState, useEffect } from 'react'

// Navigation item definition
interface NavigationItem {
  id: 'original' | 'ai-generated' | 'summary' | 'chat' | 'glossary' | 'search' | 'highlights' | 'metadata'
  label: string
  icon: React.ComponentType<{ size?: number; weight?: string; className?: string }>
  tooltip: {
    title: string
    description: string
  }
}

// Props for the VerticalIconNav component
interface VerticalIconNavProps {
  activeTab?: string
  onTabClick: (tabId: string) => void
  onToggleCollapse: () => void
  onCommandPaletteToggle?: () => void
  className?: string
}

// Navigation items configuration with final icon selections
const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: 'original',
    label: 'Original',
    icon: Article,
    tooltip: {
      title: 'Original Document',
      description: 'View the unmodified source document with original headings'
    }
  },
  // Temporarily hidden due to bug - uncomment to restore
  // {
  //   id: 'ai-generated',
  //   label: 'AI-generated',
  //   icon: Robot,
  //   tooltip: {
  //     title: 'AI-Generated',
  //     description: 'View document with AI-enhanced headings and structure'
  //   }
  // },
  {
    id: 'summary',
    label: 'Summary',
    icon: ListBullets,
    tooltip: {
      title: 'Summary',
      description: 'Read hierarchical summaries at different detail levels'
    }
  },
  {
    id: 'chat',
    label: 'Chat',
    icon: ChatCircle,
    tooltip: {
      title: 'Chat',
      description: 'Ask questions and discuss the document with AI'
    }
  },
  {
    id: 'glossary',
    label: 'Glossary',
    icon: BookOpen,
    tooltip: {
      title: 'Glossary',
      description: 'Explore key terms and concepts from the document'
    }
  },
  {
    id: 'search',
    label: 'Search',
    icon: MagnifyingGlass,
    tooltip: {
      title: 'Search',
      description: 'Find specific text or concepts within the document'
    }
  },
  {
    id: 'highlights',
    label: 'Highlights',
    icon: HighlighterCircle,
    tooltip: {
      title: 'Highlights',
      description: 'Create and manage persistent highlights based on criteria'
    }
  },
  {
    id: 'metadata',
    label: 'Metadata',
    icon: Tag,
    tooltip: {
      title: 'Document Metadata',
      description: 'View document information and statistics'
    }
  }
]

export function VerticalIconNav({ 
  activeTab, 
  onTabClick, 
  onToggleCollapse,
  onCommandPaletteToggle,
  className 
}: VerticalIconNavProps) {
  // Platform-specific shortcut text with SSR-safe implementation
  const [shortcutText, setShortcutText] = useState('Ctrl+B') // Default to non-Mac
  const [commandShortcutText, setCommandShortcutText] = useState('Ctrl+K') // Default to non-Mac
  
  useEffect(() => {
    const isMac = /Mac|iPod|iPhone|iPad/.test(window.navigator.platform)
    setShortcutText(isMac ? 'Cmd+B' : 'Ctrl+B')
    setCommandShortcutText(isMac ? 'Cmd+K' : 'Ctrl+K')
  }, [])
  
  return (
    <div 
      className={cn(
        'vertical-icon-nav', // Custom CSS class for scrollbar styling
        'flex flex-col bg-white border-r border-gray-200',
        'w-10 min-w-10 max-w-10 sm:w-12 sm:min-w-12 sm:max-w-12', // Responsive width: 40px mobile, 48px desktop
        'h-full overflow-y-auto', // Enable vertical scrolling
        className
      )}
      style={{
        scrollbarWidth: 'thin', // Firefox: thin scrollbar
        scrollbarColor: '#d1d5db transparent', // Firefox: thumb color and track color
      }}
      role="navigation"
      aria-label="Document navigation"
    >
      {/* Collapse button at top */}
      <Tooltip.Provider delayDuration={600}>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className={cn(
                'h-10 w-10 sm:h-12 sm:w-12 rounded-none border-0',
                'flex items-center justify-center',
                'text-gray-600 hover:text-gray-900',
                'hover:bg-gray-50',
                'transition-colors duration-200',
                'focus:ring-2 focus:ring-blue-500 focus:ring-inset'
              )}
              aria-label={`Toggle sidebar (${shortcutText})`}
            >
              <SidebarSimple 
                size={18} 
                weight="duotone" 
                className="transition-colors duration-200"
              />
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              side="right"
              align="center"
              sideOffset={8}
              className="z-50 max-w-xs"
            >
              <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                <div className="font-semibold text-gray-900 text-sm mb-1">
                  Toggle Sidebar
                </div>
                <div className="text-gray-700 text-sm leading-relaxed mb-2">
                  Collapse or expand the navigation panel
                </div>
                <div className="text-xs text-gray-500 font-mono">
                  Press {shortcutText} to toggle
                </div>
              </div>
              <Tooltip.Arrow 
                className="fill-gray-200" 
                width={12} 
                height={6}
              />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
      
      {/* Gap after collapse button */}
      <div className="h-4" />
      
      {/* Command palette trigger - second position */}
      {onCommandPaletteToggle && (
        <Tooltip.Provider delayDuration={600}>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onCommandPaletteToggle}
                className={cn(
                  'h-10 w-10 sm:h-12 sm:w-12 rounded-none border-0',
                  'flex items-center justify-center',
                  'text-gray-600 hover:text-gray-900',
                  'hover:bg-gray-50',
                  'transition-colors duration-200',
                  'focus:ring-2 focus:ring-blue-500 focus:ring-inset'
                )}
                aria-label="Open command palette (Cmd+K / Ctrl+K)"
              >
                <Terminal 
                  size={18} 
                  weight="duotone" 
                  className="transition-colors duration-200"
                />
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                side="right"
                align="center"
                sideOffset={8}
                className="z-50 max-w-xs"
              >
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                  <div className="font-semibold text-gray-900 text-sm mb-1">
                    Command Palette
                  </div>
                  <div className="text-gray-700 text-sm leading-relaxed mb-2">
                    Quick access to navigation and actions
                  </div>
                  <div className="text-xs text-gray-500 font-mono">
                    Press {commandShortcutText} to open
                  </div>
                </div>
                <Tooltip.Arrow 
                  className="fill-gray-200" 
                  width={12} 
                  height={6}
                />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Tooltip.Provider>
      )}
      
      {/* Gap before navigation items */}
      <div className="h-3" />
      
      {NAVIGATION_ITEMS.map((item) => {
        const Icon = item.icon
        const isActive = activeTab === item.id
        
        return (
          <div key={item.id}>
            {/* Add gap before metadata icon */}
            {item.id === 'metadata' && <div className="h-3" />}
            
            <Tooltip.Provider delayDuration={600}>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onTabClick(item.id)}
                    className={cn(
                      'h-10 w-10 sm:h-12 sm:w-12 rounded-none border-0',
                      'flex items-center justify-center',
                      'text-gray-600 hover:text-gray-900',
                      'hover:bg-gray-50',
                      'transition-colors duration-200',
                      'focus:ring-2 focus:ring-blue-500 focus:ring-inset',
                      isActive && [
                        'bg-orange-50 text-orange-700', // Spideryarn orange theme
                        'border-r-2 border-orange-500',
                        'hover:bg-orange-100 hover:text-orange-800'
                      ]
                    )}
                    aria-label={`${item.tooltip.title}: ${item.tooltip.description}`}
                  >
                    <Icon 
                      size={18} 
                      weight="duotone" 
                      className="transition-colors duration-200"
                    />
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    side="right"
                    align="center"
                    sideOffset={8}
                    className="z-50 max-w-xs"
                  >
                    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                      <div className="font-semibold text-gray-900 text-sm mb-1">
                        {item.tooltip.title}
                      </div>
                      <div className="text-gray-700 text-sm leading-relaxed mb-2">
                        {item.tooltip.description}
                      </div>
                      <div className="text-xs text-gray-500 font-mono">
                        Press {shortcutText} to toggle sidebar
                      </div>
                    </div>
                    <Tooltip.Arrow 
                      className="fill-gray-200" 
                      width={12} 
                      height={6}
                    />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>
          </div>
        )
      })}
    </div>
  )
}