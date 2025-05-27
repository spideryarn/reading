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
}

export function TabContainer({ tabs, defaultTab, className = '', title }: TabContainerProps) {
  const [activeTab, setActiveTab] = useState<string>(defaultTab || tabs[0]?.id || '')

  if (tabs.length === 0) {
    return null
  }

  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content

  return (
    <div className={className}>
      {title && (
        <h2 className="text-lg font-semibold mb-4">{title}</h2>
      )}
      
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-32">
        {activeTabContent}
      </div>
    </div>
  )
}