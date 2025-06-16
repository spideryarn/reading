'use client'

import React, { useMemo, useState, useRef, useEffect } from 'react'
import { 
  FileText, Clock, Calendar, Hash, 
  ChartBar, Robot, ListBullets, BookOpen,
  CircleNotch, CheckCircle, XCircle,
  GraduationCap, LockSimple, User, PencilSimple
} from '@phosphor-icons/react'
import { formatDistanceToNow } from 'date-fns'
import type { DocumentElement } from '@/lib/types/document'
import { extractCleanText } from '@/lib/utils/html-text-extraction'
import { calculateReadabilityMetrics } from '@/lib/utils/readability-metrics'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { sanitizeDocumentTitle, validateDocumentTitle, MAX_TITLE_LENGTH } from '@/lib/utils/document-title'

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
    let fullText = ''
    
    elements.forEach(element => {
      if (element.content) {
        const cleanText = extractCleanText(element.content)
        const words = cleanText.split(/\s+/).filter(word => word.length > 0)
        totalWords += words.length
        fullText += cleanText + ' '
      }
    })
    
    // Calculate reading time (225 words per minute)
    const readingTimeMinutes = Math.ceil(totalWords / 225)
    
    return {
      wordCount: totalWords,
      readingTime: readingTimeMinutes,
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
  
  // Title editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState(documentTitle)
  const [currentTitle, setCurrentTitle] = useState(documentTitle)
  const [titleError, setTitleError] = useState<string | null>(null)
  const [isSavingTitle, setIsSavingTitle] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)
  
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
      return <CircleNotch size={16} weight="bold" className="animate-spin text-amber-600" />
    }
    if (isGenerated) {
      return <CheckCircle size={16} weight="bold" className="text-emerald-600" />
    }
    return <XCircle size={16} weight="bold" className="text-slate-400" />
  }
  
  // Get enhanced color class for readability score
  const getReadabilityColor = (score: number): string => {
    if (score >= 80) return 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-100'
    if (score >= 60) return 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-100'
    if (score >= 50) return 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-100'
    if (score >= 30) return 'bg-orange-50 text-orange-700 border-orange-200 ring-1 ring-orange-100'
    return 'bg-red-50 text-red-700 border-red-200 ring-1 ring-red-100'
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
  
  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [isEditingTitle])
  
  // Handle title editing
  const startEditingTitle = () => {
    setIsEditingTitle(true)
    setEditedTitle(currentTitle)
    setTitleError(null)
  }
  
  const cancelEditingTitle = () => {
    setIsEditingTitle(false)
    setEditedTitle(currentTitle)
    setTitleError(null)
  }
  
  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveTitle()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelEditingTitle()
    }
  }
  
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    setEditedTitle(newTitle)
    
    // Real-time validation
    const error = validateDocumentTitle(newTitle)
    setTitleError(error)
  }
  
  const saveTitle = async () => {
    // Sanitize and validate
    const sanitized = sanitizeDocumentTitle(editedTitle)
    const error = validateDocumentTitle(sanitized)
    
    if (error) {
      setTitleError(error)
      return
    }
    
    // Don't save if unchanged
    if (sanitized === currentTitle) {
      setIsEditingTitle(false)
      return
    }
    
    setIsSavingTitle(true)
    setTitleError(null)
    
    // Optimistic update
    const previousTitle = currentTitle
    setCurrentTitle(sanitized)
    setIsEditingTitle(false)
    
    // Broadcast to the rest of the app so, e.g., the AppHeader can update
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('document-title-updated', { detail: sanitized }))
    }
    
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('documents')
        .update({ title: sanitized })
        .eq('id', documentId)
      
      if (error) {
        // Revert optimistic update on error
        setCurrentTitle(previousTitle)
        setTitleError('Failed to update title. Please try again.')
        setIsEditingTitle(true)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('document-title-updated', { detail: previousTitle }))
        }
        console.error('Title update failed:', error)
      }
    } catch (err) {
      // Revert optimistic update on error
      setCurrentTitle(previousTitle)
      setTitleError('An unexpected error occurred. Please try again.')
      setIsEditingTitle(true)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('document-title-updated', { detail: previousTitle }))
      }
      console.error('Title update error:', err)
    } finally {
      setIsSavingTitle(false)
    }
  }
  
  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center">
            <FileText size={16} weight="bold" className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Document Metadata</h2>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">
          Comprehensive information and analytics about this document
        </p>
      </div>
      
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Document Information Section */}
          <section>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <div className="w-1 h-4 bg-gradient-to-b from-slate-400 to-slate-500 rounded-full"></div>
              Document Information
            </h3>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="divide-y divide-slate-100">
                <div className="p-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center flex-shrink-0">
                      <FileText size={18} weight="bold" className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Title</div>
                      <div className="flex items-center gap-2">
                        {isEditingTitle ? (
                          <div className="flex-1">
                            <Input
                              ref={titleInputRef}
                              type="text"
                              value={editedTitle}
                              onChange={handleTitleChange}
                              onKeyDown={handleTitleKeyDown}
                              onBlur={saveTitle}
                              disabled={isSavingTitle}
                              className="font-semibold text-slate-900 text-sm h-7 px-2 py-0"
                              maxLength={MAX_TITLE_LENGTH}
                            />
                            {titleError && (
                              <div className="text-xs text-red-600 mt-1">
                                {titleError}
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            <div 
                              className="font-semibold text-slate-900 text-sm leading-relaxed flex-1 cursor-pointer hover:text-blue-700 transition-colors"
                              onClick={startEditingTitle}
                            >
                              {currentTitle}
                            </div>
                            <button
                              onClick={startEditingTitle}
                              className="p-1 rounded hover:bg-slate-200 transition-colors"
                              aria-label="Edit title"
                            >
                              <PencilSimple size={14} className="text-slate-500" />
                            </button>
                          </>
                        )}
                        {isSavingTitle && (
                          <CircleNotch size={14} weight="bold" className="animate-spin text-amber-600" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center flex-shrink-0">
                      <Calendar size={18} weight="bold" className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Uploaded</div>
                      <div className="font-semibold text-slate-900 text-sm" title={formattedDate.absolute}>
                        {formattedDate.relative}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{formattedDate.absolute}</div>
                    </div>
                  </div>
                </div>
                
                {documentSourceUrl && (
                  <div className="p-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center flex-shrink-0">
                        <Hash size={18} weight="bold" className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Source</div>
                        <div className="font-semibold text-slate-900 text-sm break-all">
                          {fileType}
                        </div>
                        {documentSourceUrl.startsWith('http') && (
                          <a 
                            href={documentSourceUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                          >
                            View original
                            <Hash size={12} weight="bold" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
          
          {/* Document Statistics Section */}
          <section>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <div className="w-1 h-4 bg-gradient-to-b from-slate-400 to-slate-500 rounded-full"></div>
              Document Statistics
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="group bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition-all duration-200 hover:border-slate-300">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center">
                    <ChartBar size={14} weight="bold" className="text-white" />
                  </div>
                  <span className="text-xs font-medium text-slate-600 uppercase tracking-wider">Words</span>
                </div>
                <div className="text-xl font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                  {documentStats.wordCount.toLocaleString()}
                </div>
              </div>
              
              <div className="group bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition-all duration-200 hover:border-slate-300">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center">
                    <Clock size={14} weight="bold" className="text-white" />
                  </div>
                  <span className="text-xs font-medium text-slate-600 uppercase tracking-wider">Read Time</span>
                </div>
                <div className="text-xl font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  {documentStats.readingTime} <span className="text-sm font-medium text-slate-600">min</span>
                </div>
              </div>
            </div>
          </section>
          
          {/* Processing Status Section */}
          <section>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <div className="w-1 h-4 bg-gradient-to-b from-slate-400 to-slate-500 rounded-full"></div>
              Processing Status
            </h3>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="divide-y divide-slate-100">
                <div className="p-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center">
                        <BookOpen size={14} weight="bold" className="text-white" />
                      </div>
                      <span className="text-sm font-semibold text-slate-700">Glossary</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(glossaryGenerated, glossaryLoading)}
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        glossaryLoading 
                          ? 'bg-amber-50 text-amber-700' 
                          : glossaryGenerated 
                            ? 'bg-emerald-50 text-emerald-700' 
                            : 'bg-slate-100 text-slate-600'
                      }`}>
                        {glossaryLoading ? 'Generating...' : glossaryGenerated ? 'Generated' : 'Not generated'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center">
                        <Robot size={14} weight="bold" className="text-white" />
                      </div>
                      <span className="text-sm font-semibold text-slate-700">AI Headings</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(aiHeadingsGenerated)}
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        aiHeadingsGenerated 
                          ? 'bg-emerald-50 text-emerald-700' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {aiHeadingsGenerated ? 'Generated' : 'Not generated'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                        <ListBullets size={14} weight="bold" className="text-white" />
                      </div>
                      <span className="text-sm font-semibold text-slate-700">Summary</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(summaryGenerated)}
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        summaryGenerated 
                          ? 'bg-emerald-50 text-emerald-700' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {summaryGenerated ? 'Generated' : 'Not generated'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
          
          {/* Reading Difficulty Section */}
          {readabilityMetrics && (
            <section>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                <div className="w-1 h-4 bg-gradient-to-b from-slate-400 to-slate-500 rounded-full"></div>
                Reading Difficulty
              </h3>
              <div className="space-y-4">
                {/* Flesch Reading Ease */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center">
                        <GraduationCap size={18} weight="bold" className="text-white" />
                      </div>
                      <span className="text-sm font-semibold text-slate-700">Reading Ease Score</span>
                    </div>
                    <span className={`px-3 py-1.5 rounded-full text-sm font-bold ${getReadabilityColor(readabilityMetrics.fleschReadingEase.score)}`}>
                      {readabilityMetrics.fleschReadingEase.score}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-slate-900">
                      {readabilityMetrics.fleschReadingEase.interpretation.difficulty}
                    </div>
                    <div className="text-sm text-slate-600 leading-relaxed">
                      {readabilityMetrics.fleschReadingEase.interpretation.description}
                    </div>
                    <div className="text-xs text-slate-500 italic bg-slate-50 px-3 py-2 rounded-lg">
                      Similar to: {readabilityMetrics.fleschReadingEase.interpretation.comparison}
                    </div>
                  </div>
                </div>
                
                {/* Flesch-Kincaid Grade Level */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center">
                      <GraduationCap size={18} weight="bold" className="text-white" />
                    </div>
                    <span className="text-sm font-semibold text-slate-700">Grade Level</span>
                  </div>
                  <div className="space-y-2">
                    <div className="text-lg font-bold text-slate-900">
                      {readabilityMetrics.fleschKincaidGradeLevel.interpretation}
                    </div>
                    <div className="text-sm text-slate-600 leading-relaxed bg-slate-50 px-3 py-2 rounded-lg">
                      Education level needed to understand this document
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
          
          {/* Access & Sharing Section */}
          <section>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <div className="w-1 h-4 bg-gradient-to-b from-slate-400 to-slate-500 rounded-full"></div>
              Access & Sharing
            </h3>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="divide-y divide-slate-100">
                <div className="p-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center flex-shrink-0">
                      <LockSimple size={18} weight="bold" className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Privacy Setting</div>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={currentIsPublic}
                              onChange={handlePrivacyToggle}
                              disabled={isUpdating}
                              className="w-5 h-5 text-blue-600 bg-white border-2 border-slate-300 rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            />
                          </div>
                          <span className="text-sm font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                            {currentIsPublic ? 'Public' : 'Private'}
                          </span>
                          {isUpdating && (
                            <CircleNotch size={16} weight="bold" className="animate-spin text-amber-600" />
                          )}
                        </label>
                      </div>
                      <div className="text-xs text-slate-500 mt-2 leading-relaxed bg-slate-50 px-3 py-2 rounded-lg">
                        {currentIsPublic 
                          ? '🌐 Anyone can access this document with the link' 
                          : '🔒 Only you can access this document'
                        }
                      </div>
                      {updateError && (
                        <div className="text-xs text-red-600 mt-2 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
                          {updateError}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {ownerEmail && (
                  <div className="p-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center flex-shrink-0">
                        <User size={18} weight="bold" className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Document Owner</div>
                        <div className="font-semibold text-slate-900 text-sm">{ownerEmail}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}