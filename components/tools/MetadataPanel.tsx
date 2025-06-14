'use client'

import React, { useMemo, useState } from 'react'
import { 
  FileText, Clock, Calendar, Hash, 
  ChartBar, Robot, ListBullets, BookOpen,
  CircleNotch, CheckCircle, XCircle,
  GraduationCap, LockSimple, User
} from '@phosphor-icons/react'
import { formatDistanceToNow } from 'date-fns'
import type { DocumentElement } from '@/lib/types/document'
import { extractCleanText } from '@/lib/utils/html-text-extraction'
import { calculateReadabilityMetrics } from '@/lib/utils/readability-metrics'
import { createClient } from '@/lib/supabase/client'

interface MetadataPanelProps {
  documentTitle: string
  documentCreatedAt: string
  documentSourceUrl?: string | null
  elements: DocumentElement[]
  // Processing status flags
  glossaryGenerated?: boolean
  glossaryLoading?: boolean
  aiHeadingsGenerated?: boolean
  summaryGenerated?: boolean
  // Owner information
  ownerEmail?: string
  // Privacy and document ID for editing
  isPublic?: boolean | null
  documentId: string
}

export function MetadataPanel({
  documentTitle,
  documentCreatedAt,
  documentSourceUrl,
  elements,
  glossaryGenerated = false,
  glossaryLoading = false,
  aiHeadingsGenerated = false,
  summaryGenerated = false,
  ownerEmail,
  isPublic = false,
  documentId
}: MetadataPanelProps) {
  // Calculate document statistics
  const documentStats = useMemo(() => {
    let totalWords = 0
    let totalCharacters = 0
    let fullText = ''
    
    elements.forEach(element => {
      if (element.content) {
        const cleanText = extractCleanText(element.content)
        const words = cleanText.split(/\s+/).filter(word => word.length > 0)
        totalWords += words.length
        totalCharacters += cleanText.length
        fullText += cleanText + ' '
      }
    })
    
    // Calculate reading time (225 words per minute)
    const readingTimeMinutes = Math.ceil(totalWords / 225)
    
    return {
      wordCount: totalWords,
      characterCount: totalCharacters,
      readingTime: readingTimeMinutes,
      elementCount: elements.length,
      fullText: fullText.trim()
    }
  }, [elements])
  
  // Calculate readability metrics
  const readabilityMetrics = useMemo(() => {
    if (documentStats.fullText.length === 0) {
      return null
    }
    return calculateReadabilityMetrics(documentStats.fullText)
  }, [documentStats.fullText])
  
  // Privacy toggle state
  const [currentIsPublic, setCurrentIsPublic] = useState(isPublic ?? false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  
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
  
  // Get color class for readability score
  const getReadabilityColor = (score: number): string => {
    if (score >= 80) return 'bg-green-100 text-green-800 border-green-200'
    if (score >= 60) return 'bg-blue-100 text-blue-800 border-blue-200'
    if (score >= 50) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    if (score >= 30) return 'bg-orange-100 text-orange-800 border-orange-200'
    return 'bg-red-100 text-red-800 border-red-200'
  }
  
  // Handle privacy toggle with optimistic updates
  const handlePrivacyToggle = async () => {
    const newValue = !currentIsPublic
    setIsUpdating(true)
    setUpdateError(null)
    
    // Optimistic update
    setCurrentIsPublic(newValue)
    
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('documents')
        .update({ is_public: newValue })
        .eq('id', documentId)
      
      if (error) {
        // Revert optimistic update on error
        setCurrentIsPublic(!newValue)
        setUpdateError('Failed to update privacy setting. Please try again.')
        console.error('Privacy update failed:', error)
      }
    } catch (err) {
      // Revert optimistic update on error
      setCurrentIsPublic(!newValue)
      setUpdateError('An unexpected error occurred. Please try again.')
      console.error('Privacy update error:', err)
    } finally {
      setIsUpdating(false)
    }
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
          
          {/* Reading Difficulty Section */}
          {readabilityMetrics && (
            <section>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                Reading Difficulty
              </h3>
              <div className="space-y-4">
                {/* Flesch Reading Ease */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <GraduationCap size={20} weight="duotone" className="text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">Reading Ease Score</span>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getReadabilityColor(readabilityMetrics.fleschReadingEase.score)}`}>
                      {readabilityMetrics.fleschReadingEase.score}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-900">
                      {readabilityMetrics.fleschReadingEase.interpretation.difficulty}
                    </div>
                    <div className="text-xs text-gray-600">
                      {readabilityMetrics.fleschReadingEase.interpretation.description}
                    </div>
                    <div className="text-xs text-gray-500 italic">
                      Similar to: {readabilityMetrics.fleschReadingEase.interpretation.comparison}
                    </div>
                  </div>
                </div>
                
                {/* Flesch-Kincaid Grade Level */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <GraduationCap size={20} weight="duotone" className="text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">Grade Level</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-900">
                      {readabilityMetrics.fleschKincaidGradeLevel.interpretation}
                    </div>
                    <div className="text-xs text-gray-600">
                      Education level needed to understand this document
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
          
          {/* Access & Sharing Section */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
              Access & Sharing
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <LockSimple size={20} weight="duotone" className="text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm text-gray-600">Privacy</div>
                  <div className="flex items-center gap-3 mt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentIsPublic}
                        onChange={handlePrivacyToggle}
                        disabled={isUpdating}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <span className="text-sm font-medium text-gray-900">
                        {currentIsPublic ? 'Public' : 'Private'}
                      </span>
                      {isUpdating && (
                        <CircleNotch size={14} weight="bold" className="animate-spin text-blue-600" />
                      )}
                    </label>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {currentIsPublic 
                      ? 'Anyone can access this document' 
                      : 'Only you can access this document'
                    }
                  </div>
                  {updateError && (
                    <div className="text-xs text-red-600 mt-1">
                      {updateError}
                    </div>
                  )}
                </div>
              </div>
              
              {ownerEmail && (
                <div className="flex items-start gap-3">
                  <User size={20} weight="duotone" className="text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm text-gray-600">Owner</div>
                    <div className="font-medium text-gray-900">{ownerEmail}</div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}