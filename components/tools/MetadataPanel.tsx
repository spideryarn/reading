'use client'

import React, { useMemo } from 'react'
import { 
  FileText, Clock, Calendar, Hash, 
  ChartBar, Robot, ListBullets, BookOpen,
  CircleNotch, CheckCircle, XCircle
} from '@phosphor-icons/react'
import { formatDistanceToNow } from 'date-fns'
import type { DocumentElement } from '@/lib/types/document'
import { extractCleanText } from '@/lib/utils/html-text-extraction'

interface MetadataPanelProps {
  documentId: string
  documentTitle: string
  documentCreatedAt: string
  documentSourceUrl?: string | null
  elements: DocumentElement[]
  // Processing status flags
  glossaryGenerated?: boolean
  glossaryLoading?: boolean
  aiHeadingsGenerated?: boolean
  summaryGenerated?: boolean
}

export function MetadataPanel({
  documentId,
  documentTitle,
  documentCreatedAt,
  documentSourceUrl,
  elements,
  glossaryGenerated = false,
  glossaryLoading = false,
  aiHeadingsGenerated = false,
  summaryGenerated = false
}: MetadataPanelProps) {
  // Calculate document statistics
  const documentStats = useMemo(() => {
    let totalWords = 0
    let totalCharacters = 0
    
    elements.forEach(element => {
      if (element.content) {
        const cleanText = extractCleanText(element.content)
        const words = cleanText.split(/\s+/).filter(word => word.length > 0)
        totalWords += words.length
        totalCharacters += cleanText.length
      }
    })
    
    // Calculate reading time (225 words per minute)
    const readingTimeMinutes = Math.ceil(totalWords / 225)
    
    return {
      wordCount: totalWords,
      characterCount: totalCharacters,
      readingTime: readingTimeMinutes,
      elementCount: elements.length
    }
  }, [elements])
  
  // Format creation date
  const formattedDate = useMemo(() => {
    const date = new Date(documentCreatedAt)
    return {
      relative: formatDistanceToNow(date, { addSuffix: true }),
      absolute: date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }, [documentCreatedAt])
  
  // Determine file type from source URL or default
  const fileType = useMemo(() => {
    if (!documentSourceUrl) return 'Document'
    if (documentSourceUrl.endsWith('.pdf')) return 'PDF Document'
    if (documentSourceUrl.startsWith('http')) return 'Web Page'
    return 'Document'
  }, [documentSourceUrl])
  
  // Processing status helper
  const getStatusIcon = (isGenerated: boolean, isLoading: boolean = false) => {
    if (isLoading) {
      return <CircleNotch size={16} weight="bold" className="animate-spin text-blue-600" />
    }
    if (isGenerated) {
      return <CheckCircle size={16} weight="bold" className="text-green-600" />
    }
    return <XCircle size={16} weight="bold" className="text-gray-400" />
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Document Metadata</h2>
        <p className="text-sm text-gray-600 mt-1">
          Information and statistics about this document
        </p>
      </div>
      
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">
          {/* Document Information Section */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
              Document Information
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <FileText size={20} weight="duotone" className="text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm text-gray-600">Title</div>
                  <div className="font-medium text-gray-900">{documentTitle}</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Calendar size={20} weight="duotone" className="text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm text-gray-600">Uploaded</div>
                  <div className="font-medium text-gray-900" title={formattedDate.absolute}>
                    {formattedDate.relative}
                  </div>
                </div>
              </div>
              
              {documentSourceUrl && (
                <div className="flex items-start gap-3">
                  <Hash size={20} weight="duotone" className="text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm text-gray-600">Source</div>
                    <div className="font-medium text-gray-900 break-all">
                      {fileType}
                      {documentSourceUrl.startsWith('http') && (
                        <a 
                          href={documentSourceUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="ml-2 text-blue-600 hover:text-blue-800 text-sm"
                        >
                          View original
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
          
          {/* Document Statistics Section */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
              Document Statistics
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <ChartBar size={16} weight="duotone" className="text-gray-500" />
                  <span className="text-sm text-gray-600">Word Count</span>
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {documentStats.wordCount.toLocaleString()}
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Clock size={16} weight="duotone" className="text-gray-500" />
                  <span className="text-sm text-gray-600">Reading Time</span>
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {documentStats.readingTime} min
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Hash size={16} weight="duotone" className="text-gray-500" />
                  <span className="text-sm text-gray-600">Characters</span>
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {documentStats.characterCount.toLocaleString()}
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <FileText size={16} weight="duotone" className="text-gray-500" />
                  <span className="text-sm text-gray-600">Elements</span>
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {documentStats.elementCount}
                </div>
              </div>
            </div>
          </section>
          
          {/* Processing Status Section */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
              Processing Status
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <BookOpen size={16} weight="duotone" className="text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Glossary</span>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(glossaryGenerated, glossaryLoading)}
                  <span className="text-xs text-gray-600">
                    {glossaryLoading ? 'Generating...' : glossaryGenerated ? 'Generated' : 'Not generated'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Robot size={16} weight="duotone" className="text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">AI Headings</span>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(aiHeadingsGenerated)}
                  <span className="text-xs text-gray-600">
                    {aiHeadingsGenerated ? 'Generated' : 'Not generated'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <ListBullets size={16} weight="duotone" className="text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Summary</span>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(summaryGenerated)}
                  <span className="text-xs text-gray-600">
                    {summaryGenerated ? 'Generated' : 'Not generated'}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}