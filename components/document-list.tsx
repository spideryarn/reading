'use client'

import Link from 'next/link'
import { useState, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DeleteDocumentButton } from '@/components/delete-document-button'
import { TooltipOrPopover } from '@/components/ui/tooltip-or-popover'
import { MarkdownRenderer } from '@/components/markdown-renderer'
import { FileText, Clock, Globe, Lock, CircleNotch } from '@phosphor-icons/react/dist/ssr'
import type { Database } from '@/lib/types/database'

type Document = Database['public']['Tables']['documents']['Row']
import { formatUserDate } from '@/lib/utils/date-formatting'

interface TooltipInfo {
  sourceInfo: string
  readingTime: string
  summary: string | null
  hasSummary: boolean
}

interface DocumentListProps {
  documents: Document[]
  emptyStateMessage: string
  showDeleteActions?: boolean
  currentUserId?: string
  className?: string
}

interface DocumentItemProps {
  document: Document
  showDeleteActions: boolean
  currentUserId?: string
}

function DocumentItem({ document, showDeleteActions, currentUserId }: DocumentItemProps) {
  const [tooltipData, setTooltipData] = useState<TooltipInfo | null>(null)
  const [isLoadingTooltip, setIsLoadingTooltip] = useState(false)
  const [tooltipError, setTooltipError] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)

  const loadTooltipData = useCallback(async () => {
    if (tooltipData || isLoadingTooltip) return // Already loaded or loading

    setIsLoadingTooltip(true)
    setTooltipError(false)

    try {
      const response = await fetch(`/api/read/${document.slug}/tooltip-info`)
      if (!response.ok) {
        throw new Error('Failed to load tooltip info')
      }
      const data: TooltipInfo = await response.json()
      setTooltipData(data)
    } catch (error) {
      console.error('Error loading tooltip data:', error)
      setTooltipError(true)
    } finally {
      setIsLoadingTooltip(false)
    }
  }, [document.slug, tooltipData, isLoadingTooltip])

  const getTooltipContent = () => {
    if (isLoadingTooltip) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <div className="flex items-center space-x-3">
            <CircleNotch size={16} className="animate-spin text-blue-500" />
            <span className="text-gray-700 font-medium">Loading...</span>
          </div>
        </div>
      )
    }

    if (tooltipError) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <div className="text-gray-700 text-sm">
            Unable to load document details
          </div>
        </div>
      )
    }

    if (!tooltipData) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <div className="text-gray-700 text-sm">
            Hover to load document details
          </div>
        </div>
      )
    }

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-md">
        <div className="space-y-3">
          {/* Source and reading time */}
          <div className="text-xs text-gray-600">
            <div>{tooltipData.sourceInfo}</div>
            <div>{tooltipData.readingTime}</div>
          </div>
          
          {/* Summary */}
          <div className="border-t border-gray-100 pt-3">
            {tooltipData.hasSummary && tooltipData.summary ? (
              <div className="text-sm text-gray-700 leading-relaxed">
                <MarkdownRenderer content={tooltipData.summary} />
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic">
                Summary hasn&apos;t been generated yet
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const canDelete = showDeleteActions && currentUserId && document.created_by === currentUserId

  return (
    <Card 
      key={document.id} 
      className="p-0 overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="flex items-center">
        {/* Main clickable area */}
        <Link
          href={`/read/${document.slug}`}
          className={`flex-1 min-w-0 p-4 transition-colors ${
            isNavigating ? 'bg-gray-100 cursor-wait' : 'hover:bg-gray-50'
          }`}
          onClick={() => setIsNavigating(true)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* Title with tooltip */}
              <TooltipOrPopover
                content={getTooltipContent()}
                side="top"
                align="start"
                sideOffset={8}
                showIndicator={false}
                contentClassName="p-0 bg-transparent border-0 shadow-none"
                triggerClassName="block"
              >
                <h3 
                  className={`font-medium leading-tight transition-colors ${
                    isNavigating 
                      ? 'text-gray-600' 
                      : 'text-gray-900 hover:text-orange-600'
                  }`}
                  onMouseEnter={loadTooltipData}
                >
                  <div className="flex items-center gap-2">
                    {isNavigating && (
                      <CircleNotch size={16} className="animate-spin text-orange-500" />
                    )}
                    {document.title}
                  </div>
                </h3>
              </TooltipOrPopover>
              
              {/* Metadata row */}
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                {/* Creation date */}
                {document.created_at && (
                  <div className="flex items-center gap-1">
                    <Clock size={14} />
                    <TooltipOrPopover
                      content={
                        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                          <div className="text-sm text-gray-700">
                            {formatUserDate(document.created_at).absolute}
                          </div>
                        </div>
                      }
                      side="top"
                      align="center"
                      sideOffset={8}
                      showIndicator={false}
                      contentClassName="p-0 bg-transparent border-0 shadow-none"
                    >
                      <time 
                        dateTime={formatUserDate(document.created_at).iso}
                        className="hover:text-orange-600 transition-colors cursor-help"
                      >
                        {formatUserDate(document.created_at).relative}
                      </time>
                    </TooltipOrPopover>
                  </div>
                )}
                
                {/* Word count */}
                {document.word_count && (
                  <div>{document.word_count.toLocaleString()} words</div>
                )}
                
                {/* Language indicator for non-English */}
                {document.language_code && document.language_code !== 'en' && (
                  <div>{document.language_code.toUpperCase()}</div>
                )}
              </div>
            </div>
          </div>
        </Link>
        
        {/* Action buttons area */}
        <div className="px-4 py-4 flex items-center gap-2 flex-shrink-0 border-l border-gray-100">
          {/* Public/Private indicator with tooltip */}
          <TooltipOrPopover
            content={
              <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                <div className="text-sm text-gray-700">
                  {document.is_public === true ? (
                    <>This document is <strong>public</strong> and can be viewed by anyone with the link.</>
                  ) : (
                    <>This document is <strong>private</strong> and can only be viewed by you.</>
                  )}
                </div>
              </div>
            }
            side="top"
            align="center"
            sideOffset={8}
            showIndicator={false}
            contentClassName="p-0 bg-transparent border-0 shadow-none"
          >
            <div className="p-1">
              {document.is_public === true ? (
                <Globe size={16} className="text-green-600" />
              ) : (
                <Lock size={16} className="text-gray-500" />
              )}
            </div>
          </TooltipOrPopover>
          
          {/* Delete button - only shown if user can delete */}
          {canDelete && (
            <DeleteDocumentButton
              documentId={document.id}
              documentTitle={document.title}
            />
          )}
        </div>
      </div>
    </Card>
  )
}

export function DocumentList({
  documents,
  emptyStateMessage,
  showDeleteActions = false,
  currentUserId,
  className = '',
}: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <FileText size={48} className="mx-auto text-gray-400 mb-4" />
        <p className="text-gray-600 mb-4">{emptyStateMessage}</p>
        <Link href="/upload">
          <Button variant="orange">Upload Your First Document</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {documents.map((document) => {
        const itemProps: DocumentItemProps = {
          document,
          showDeleteActions
        }
        
        if (currentUserId !== undefined) {
          itemProps.currentUserId = currentUserId
        }
        
        return <DocumentItem key={document.id} {...itemProps} />
      })}
    </div>
  )
}