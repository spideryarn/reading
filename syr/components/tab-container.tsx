'use client'

import { ReactNode, useState, useRef, useImperativeHandle, forwardRef } from 'react'

export interface Tab {
  id: string
  label: string
  content: ReactNode
  onActivate?: () => void
}

interface TabContainerProps {
  tabs: Tab[]
  defaultTab?: string
  className?: string
  title?: string
  orientation?: 'horizontal' | 'vertical'
}

export interface TabContainerRef {
  getContentContainer: () => HTMLDivElement | null
  setActiveTab: (tabId: string) => void
}

export const TabContainer = forwardRef<TabContainerRef, TabContainerProps>(
  ({ tabs, defaultTab, className = '', title, orientation = 'horizontal' }, ref) => {
    const contentRef = useRef<HTMLDivElement>(null)
    
    useImperativeHandle(ref, () => ({
      getContentContainer: () => contentRef.current,
      setActiveTab: (tabId: string) => {
        setActiveTab(prev => (tabs.some(t => t.id === tabId) ? tabId : prev))
      }
    }), [tabs])
  // Validate defaultTab - if it's invalid or doesn't exist in tabs, use first tab
  const initialTab = defaultTab && tabs.some(tab => tab.id === defaultTab) 
    ? defaultTab 
    : tabs[0]?.id || ''
  
  const [activeTab, setActiveTab] = useState<string>(initialTab)

  const handleTabClick = (tab: Tab) => {
    setActiveTab(tab.id)
    // Call onActivate callback if provided
    if (tab.onActivate) {
      tab.onActivate()
    }
  }

  if (tabs.length === 0) {
    return null
  }

  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content

  return (
    <div className={`${orientation === 'vertical' ? 'flex flex-col h-full' : 'flex flex-col h-full'} ${className}`}>
      {orientation === 'vertical' ? (
        <>
          {title && (
            <h2 className="text-sm font-semibold mb-4 text-gray-900 px-1">{title}</h2>
          )}
          
          {/* Modern Vertical Tab Navigation */}
          <div className="mb-6">
            <nav className="flex flex-col space-y-1" aria-label="Tabs" role="tablist">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab)}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`group relative flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-900 shadow-sm border border-blue-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-transparent hover:border-gray-200'
                  }`}
                >
                  {/* Active indicator bar */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-r-full transition-all duration-200 ${
                    activeTab === tab.id 
                      ? 'bg-gradient-to-b from-blue-500 to-blue-600' 
                      : 'bg-transparent group-hover:bg-gray-300'
                  }`} />
                  
                  {/* Modern indicator dot */}
                  <div className={`w-2 h-2 rounded-full mr-3 flex-shrink-0 transition-all duration-200 ${
                    activeTab === tab.id 
                      ? 'bg-blue-600 shadow-sm' 
                      : 'bg-gray-300 group-hover:bg-gray-400'
                  }`} />
                  
                  <span className="font-medium">{tab.label}</span>
                  
                  {/* Subtle highlight for active tab */}
                  {activeTab === tab.id && (
                    <div className="absolute inset-0 bg-blue-500 opacity-5 rounded-lg" />
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Elegant divider between tabs and content */}
          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
          </div>

          {/* Vertical Tab Content */}
          <div ref={contentRef} className="flex-1 min-h-0 overflow-y-auto">
            {activeTabContent}
          </div>
        </>
      ) : (
        <>
          {title && (
            <h2 className="text-lg font-semibold mb-4">{title}</h2>
          )}
          
          {/* Horizontal Tab Navigation */}
          <div className="border-b border-gray-200 mb-4">
            <nav className="flex space-x-8" aria-label="Tabs" role="tablist">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab)}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Horizontal Tab Content */}
          <div ref={contentRef} className="flex-1 min-h-0 overflow-y-auto">
            {activeTabContent}
          </div>
        </>
      )}
    </div>
  )
})

TabContainer.displayName = 'TabContainer'