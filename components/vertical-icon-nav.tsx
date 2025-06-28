'use client'

// Vertical icon navigation component for collapsed left pane
// Implements VSCode-style activity bar with Phosphor icons and tooltips
// Now dynamically generates navigation items from the tool registry
// See planning/250608c_vertical_icon_navigation_bar.md for design decisions

import { 
  SidebarSimple, Terminal
} from '@phosphor-icons/react'
import type { IconProps } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { TooltipOrPopover } from '@/components/ui/tooltip-or-popover'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { getAllTools } from '@/lib/tools/registry'
import type { Tool } from '@/lib/tools/types'

// Navigation item definition (generated from tool registry)
interface NavigationItem {
  id: string
  label: string
  icon: React.ComponentType<IconProps>
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
  slug: string
  className?: string
}

// Tool ordering for consistent navigation (matches command palette order)
const TOOL_ORDER = [
  'structure',
  'summary',
  'chat',
  'glossary',
  'search',
  'highlights',
  'tweet-thread',
  'metadata'
]

/**
 * Generate navigation items from tool registry
 * 
 * Transforms registered tools into navigation items for the vertical icon rail.
 * This replaces the previous hardcoded approach with dynamic registry-based generation.
 */
function generateNavigationFromRegistry(): NavigationItem[] {
  try {
    const tools = getAllTools()
    
    // Convert tools to navigation items
    const navigationItems: NavigationItem[] = tools.map(tool => ({
      id: tool.tabId, // Use tabId for navigation (matches URL routing)
      label: tool.name,
      icon: tool.icon as React.ComponentType<IconProps>,
      tooltip: {
        title: tool.name,
        description: tool.description
      }
    }))
    
    // Sort by tool order for consistent navigation
    navigationItems.sort((a, b) => {
      const indexA = TOOL_ORDER.indexOf(a.id)
      const indexB = TOOL_ORDER.indexOf(b.id)
      
      // If both tools are in the order list, sort by position
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB
      }
      
      // If only one is in the order list, prioritize it
      if (indexA !== -1) return -1
      if (indexB !== -1) return 1
      
      // If neither is in the order list, sort alphabetically
      return a.id.localeCompare(b.id)
    })
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🧭 Vertical Navigation - Generated from registry:', navigationItems.map(item => item.id))
    }
    
    return navigationItems
  } catch (error) {
    console.error('Failed to generate navigation from registry:', error)
    // Return empty array as fallback - better to show no navigation than crash
    return []
  }
}

export function VerticalIconNav({ 
  activeTab, 
  onTabClick, 
  onToggleCollapse,
  onCommandPaletteToggle,
  slug,
  className 
}: VerticalIconNavProps) {
  // Platform-specific shortcut text with SSR-safe implementation
  const [shortcutText, setShortcutText] = useState('Ctrl+B') // Default to non-Mac
  const [commandShortcutText, setCommandShortcutText] = useState('Ctrl+K') // Default to non-Mac
  
  // Generate navigation items from tool registry
  const navigationItems = useMemo(() => generateNavigationFromRegistry(), [])
  
  // URL building utility for clean tab URLs (Option A: clean state)
  const buildTabUrl = useCallback((tabId: string) => {
    return `/read/${slug}?tab=${tabId}`
  }, [slug])
  
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
      <TooltipOrPopover
        content={
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
        }
        side="right"
        align="center"
        sideOffset={8}
        showIndicator={false}
        contentClassName="p-0 bg-transparent border-0 shadow-none"
      >
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
      </TooltipOrPopover>
      
      {/* Gap after collapse button */}
      <div className="h-4" />
      
      {/* Command palette trigger - second position */}
      {onCommandPaletteToggle && (
        <TooltipOrPopover
          content={
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
          }
          side="right"
          align="center"
          sideOffset={8}
          showIndicator={false}
          contentClassName="p-0 bg-transparent border-0 shadow-none"
        >
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
        </TooltipOrPopover>
      )}
      
      {/* Gap before navigation items */}
      <div className="h-3" />
      
      {navigationItems.map((item) => {
        const Icon = item.icon
        const isActive = activeTab === item.id
        
        return (
          <div key={item.id}>
            {/* Add gap before metadata icon */}
            {item.id === 'metadata' && <div className="h-3" />}
            
            <TooltipOrPopover
              content={
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
              }
              side="right"
              align="center"
              sideOffset={8}
              showIndicator={false}
              contentClassName="p-0 bg-transparent border-0 shadow-none"
            >
              <a
                href={buildTabUrl(item.id)}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey) {
                    // Let browser handle modifier+click naturally:
                    // - Cmd+click (Mac) / Ctrl+click (Windows/Linux): new tab
                    // - Shift+click: new window
                    return
                  }
                  // Prevent default navigation for regular clicks
                  e.preventDefault()
                  onTabClick(item.id)
                }}
                className={cn(
                  'h-10 w-10 sm:h-12 sm:w-12 rounded-none border-0',
                  'flex items-center justify-center',
                  'text-gray-600 hover:text-gray-900',
                  'hover:bg-gray-50',
                  'transition-colors duration-200',
                  'focus:ring-2 focus:ring-blue-500 focus:ring-inset',
                  'no-underline', // Remove default link underline
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
              </a>
            </TooltipOrPopover>
          </div>
        )
      })}
    </div>
  )
}