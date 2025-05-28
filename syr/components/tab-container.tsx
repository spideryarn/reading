'use client'

import { ReactNode, useState } from 'react'

export interface Tab {
  id: string
  label: string
  content: ReactNode
}

interface TabContainerProps {
  tabs: Tab[]
  defaultTab?: string
  className?: string
  title?: string
  orientation?: 'horizontal' | 'vertical'
}

export function TabContainer({ tabs, defaultTab, className = '', title, orientation = 'horizontal' }: TabContainerProps) {
  // Validate defaultTab - if it's invalid or doesn't exist in tabs, use first tab
  const initialTab = defaultTab && tabs.some(tab => tab.id === defaultTab) 
    ? defaultTab 
    : tabs[0]?.id || ''
  
  const [activeTab, setActiveTab] = useState<string>(initialTab)

  if (tabs.length === 0) {
    return null
  }

  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content

  return (
    <div className={`${orientation === 'vertical' ? 'flex flex-col h-full' : 'flex flex-col h-full'} ${className}`}>
      {orientation === 'vertical' ? (
        <>
          {title && (
            <h2 className="text-sm font-semibold mb-3 text-gray-900">{title}</h2>
          )}
          
          {/* Compact Vertical Tab Navigation */}
          <div className="mb-4">
            <nav className="flex flex-col space-y-2" aria-label="Tabs" role="tablist">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {/* Radio button indicator */}
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    activeTab === tab.id ? 'bg-white' : 'bg-gray-400'
                  }`} />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Divider between tabs and content */}
          <hr className="border-gray-200 mb-4" />

          {/* Vertical Tab Content */}
          <div className="flex-1 min-h-0 overflow-y-auto">
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
                  onClick={() => setActiveTab(tab.id)}
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
          <div className="flex-1 min-h-0 overflow-y-auto">
            {activeTabContent}
          </div>
        </>
      )}
    </div>
  )
}