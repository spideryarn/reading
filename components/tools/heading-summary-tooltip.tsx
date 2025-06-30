'use client'

import React, { useState, useCallback, type JSX } from 'react'
import { CircleNotch } from '@phosphor-icons/react'
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { DocumentElement } from '@/lib/types/document'
import type { GranularityKey } from '@/lib/prompts/templates/summarise'
import { SUMMARY_CONFIG } from '@/lib/config'

// Tooltip granularity setting
const TOOLTIP_GRANULARITY: GranularityKey = 'single short paragraph'

/**
 * Check if a heading section has sufficient content to generate a meaningful summary.
 */
function hasSufficientContentForSummary(
  elementId: string,
  elements?: DocumentElement[],
  mutatedDocument?: DocumentElement[],
  activeMutationType?: string | null
): boolean {
  const elementsToSearch = (activeMutationType === 'insert-headings' && mutatedDocument) 
    ? mutatedDocument 
    : elements

  if (!elementsToSearch || elementsToSearch.length === 0) {
    return false
  }

  const headingElement = elementsToSearch.find(element => element.id === elementId)
  if (!headingElement) {
    return false
  }

  const headingLevel = parseInt(headingElement.tag_name.substring(1))
  const headingPosition = headingElement.position

  const sectionElements: DocumentElement[] = []
  
  for (let i = 0; i < elementsToSearch.length; i++) {
    const element = elementsToSearch[i]!
    
    if (element.position <= headingPosition) continue
    
    if (element.tag_name.match(/^h[1-6]$/i)) {
      const elementLevel = parseInt(element.tag_name.substring(1))
      if (elementLevel <= headingLevel) {
        break
      }
    }
    
    if (element.content?.trim()) {
      sectionElements.push(element)
    }
  }

  const totalTextContent = sectionElements
    .map(element => element.content)
    .join(' ')
    .trim()
  
  return totalTextContent.length >= SUMMARY_CONFIG.MIN_CONTENT_LENGTH_CHARS
}

/**
 * Generate LLM summary for a heading's hierarchical content.
 */
async function generateHeadingSummary(
  elementId: string,
  documentId: string,
  elements?: DocumentElement[],
  mutatedDocument?: DocumentElement[],
  activeMutationType?: string | null,
  setContentCache?: React.Dispatch<React.SetStateAction<Map<string, string>>>
): Promise<string> {
  const elementsToSearch = (activeMutationType === 'insert-headings' && mutatedDocument) 
    ? mutatedDocument 
    : elements

  if (!elementsToSearch || elementsToSearch.length === 0) {
    return "No content available"
  }

  const headingElement = elementsToSearch.find(element => element.id === elementId)

  if (!headingElement) {
    console.warn(`Heading element not found for ID: ${elementId}`)
    return "Heading not found in elements"
  }

  const headingLevel = parseInt(headingElement.tag_name.substring(1))
  const headingPosition = headingElement.position

  const sectionElements: DocumentElement[] = []
  
  for (let i = 0; i < elementsToSearch.length; i++) {
    const element = elementsToSearch[i]!
    
    if (element.position <= headingPosition) continue
    
    if (element.tag_name.match(/^h[1-6]$/i)) {
      const elementLevel = parseInt(element.tag_name.substring(1))
      if (elementLevel <= headingLevel) {
        break
      }
    }
    
    if (element.content?.trim()) {
      sectionElements.push(element)
    }
  }

  if (sectionElements.length === 0) {
    return "No content found for this section"
  }

  const htmlContent = sectionElements
    .map(element => `<${element.tag_name}>${element.content}</${element.tag_name}>`)
    .join('')

  try {
    const response = await fetch('/api/tools/summary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'execute',
        parameters: {
          content: htmlContent,
          granularity: TOOLTIP_GRANULARITY,
          documentId: documentId,
          sectionId: elementId
        },
        metadata: {
          correlationId: crypto.randomUUID(),
          source: 'direct',
          timestamp: new Date().toISOString()
        }
      }),
    })

    if (!response.ok) {
      throw new Error(`Summary API failed: ${response.status}`)
    }

    const { summary } = await response.json()
    
    if (setContentCache) {
      setContentCache(prev => new Map(prev).set(elementId, summary))
    }
    
    return summary
  } catch (error) {
    console.error('Error generating summary:', error)
    
    const errorMessage = "⚠️ Unable to generate summary. Please try again later."
    
    if (setContentCache) {
      setContentCache(prev => new Map(prev).set(elementId, errorMessage))
    }
    
    return errorMessage
  }
}

interface HeadingSummaryTooltipProps {
  elementId: string
  documentId: string
  elements?: DocumentElement[]
  mutatedDocument?: DocumentElement[]
  activeMutationType?: string | null
  contentCache: Map<string, string>
  loadingStates: Set<string>
  onLoadingStateChange: (elementId: string, isLoading: boolean) => void
  onContentCacheChange: (elementId: string, content: string) => void
}

/**
 * Component responsible for rendering tooltip content for heading summaries.
 * Handles loading states, caching, and lazy loading of heading summaries.
 */
export function HeadingSummaryTooltip({
  elementId,
  documentId,
  elements,
  mutatedDocument,
  activeMutationType,
  contentCache,
  loadingStates,
  onLoadingStateChange,
  onContentCacheChange
}: HeadingSummaryTooltipProps) {
  const getTooltipContent = useCallback((): JSX.Element => {
    const isLoading = loadingStates.has(elementId)
    const cachedContent = contentCache.get(elementId)
    
    if (isLoading) {
      return (
        <div className="max-w-md p-4 text-sm bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="flex items-center space-x-3">
            <CircleNotch size={16} className="animate-spin text-blue-500" style={{ animationDuration: '2s' }} />
            <span className="text-gray-700 font-medium">Summarising contents of this heading...</span>
          </div>
        </div>
      )
    }
    
    if (cachedContent) {
      const isError = cachedContent.startsWith('⚠️')
      
      if (isError) {
        return (
          <div className="max-w-md p-4 text-sm bg-amber-50 border border-amber-200 rounded-lg shadow-lg">
            <div className="flex items-center space-x-3">
              <CircleNotch size={16} className="text-amber-600 flex-shrink-0" />
              <span className="text-amber-800 font-medium">{cachedContent.replace('⚠️ ', '')}</span>
            </div>
          </div>
        )
      }
      
      return (
        <div className="max-w-md p-4 text-sm bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="prose prose-sm prose-gray max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {cachedContent}
            </ReactMarkdown>
          </div>
        </div>
      )
    }
    
    if (hasSufficientContentForSummary(elementId, elements, mutatedDocument, activeMutationType)) {
      return (
        <div className="max-w-md p-4 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <span className="font-medium">Hover to load content...</span>
          </div>
        </div>
      )
    } else {
      return (
        <div className="max-w-md p-4 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            <span className="font-medium italic">Section too short to summarise</span>
          </div>
        </div>
      )
    }
  }, [elementId, contentCache, loadingStates, elements, mutatedDocument, activeMutationType])

  const handleTooltipShow = useCallback(() => {
    if (!contentCache.has(elementId) && !loadingStates.has(elementId)) {
      if (hasSufficientContentForSummary(elementId, elements, mutatedDocument, activeMutationType)) {
        onLoadingStateChange(elementId, true)
        
        generateHeadingSummary(
          elementId, 
          documentId, 
          elements, 
          mutatedDocument, 
          activeMutationType,
          (updateFn) => {
            if (typeof updateFn === 'function') {
              const newMap = updateFn(new Map())
              newMap.forEach((value, key) => {
                if (key === elementId) {
                  onContentCacheChange(key, value)
                }
              })
            }
          }
        ).finally(() => {
          onLoadingStateChange(elementId, false)
        })
      }
    }
  }, [
    elementId,
    contentCache,
    loadingStates,
    elements,
    mutatedDocument,
    activeMutationType,
    documentId,
    onLoadingStateChange,
    onContentCacheChange
  ])

  return {
    getTooltipContent,
    handleTooltipShow
  }
}

/**
 * Hook for managing heading summary tooltip state
 */
export function useHeadingSummaryTooltip() {
  const [contentCache, setContentCache] = useState<Map<string, string>>(new Map())
  const [loadingStates, setLoadingStates] = useState<Set<string>>(new Set())

  const handleLoadingStateChange = useCallback((elementId: string, isLoading: boolean) => {
    setLoadingStates(prev => {
      const newSet = new Set(prev)
      if (isLoading) {
        newSet.add(elementId)
      } else {
        newSet.delete(elementId)
      }
      return newSet
    })
  }, [])

  const handleContentCacheChange = useCallback((elementId: string, content: string) => {
    setContentCache(prev => new Map(prev).set(elementId, content))
  }, [])

  return {
    contentCache,
    loadingStates,
    handleLoadingStateChange,
    handleContentCacheChange
  }
}