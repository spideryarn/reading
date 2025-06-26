'use client'

import React, { useMemo, useState, useRef, useEffect } from 'react'
import { 
  FileText, Clock, Calendar, Hash, 
  ChartBar, Robot, ListBullets, BookOpen,
  CircleNotch, CheckCircle, XCircle,
  GraduationCap, LockSimple, User, PencilSimple,
  ArrowSquareOut, Download, CaretDown, Target
} from '@phosphor-icons/react'
import { formatDistanceToNow } from 'date-fns'
import type { DocumentElement } from '@/lib/types/document'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/lib/context/auth-context'
// import { DocumentUserService } from '@/lib/services/database/document-users' // Not needed with direct Supabase approach
import { sanitizeDocumentTitle, validateDocumentTitle, MAX_TITLE_LENGTH } from '@/lib/utils/document-title'
import { DeleteDocumentButton } from '@/components/delete-document-button'
import { TooltipOrPopover } from '@/components/ui/tooltip-or-popover'
import { EnhancementService } from '@/lib/services/database/enhancements'
import { calculateReadingTimeFromWordCount, formatReadingTime } from '@/lib/utils/reading-time-calculation'
import { generateReadingTimeTooltip } from '@/lib/utils/enhanced-reading-time'

interface MetadataPanelProps {
  documentTitle: string
  documentCreatedAt: string
  documentSourceUrl?: string | null
  elements: DocumentElement[]
  // Word count from database for reading time calculation
  wordCount: number | null
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
  // Document access props for View Original functionality
  slug: string
  storagePath: string | null
  originalFileType?: string | null
  // Upload metadata for file size info
  uploadMetadata?: {
    content_size_kb?: number
    [key: string]: unknown
  } | null
}

export function MetadataPanel({
  documentTitle,
  documentCreatedAt,
  documentSourceUrl,
  elements,
  wordCount,
  glossaryGenerated = false,
  glossaryLoading = false,
  aiHeadingsGenerated = false,
  summaryGenerated = false,
  ownerEmail,
  isPublic = false,
  documentId,
  slug,
  storagePath,
  originalFileType,
  uploadMetadata
}: MetadataPanelProps) {
  // Reading difficulty state (needs to be before documentStats calculation)
  const [readingDifficulty, setReadingDifficulty] = useState<{
    level: string
    confidence: string
    factors: string[]
  } | null>(null)
  const [isLoadingDifficulty, setIsLoadingDifficulty] = useState(false)
  const [difficultyError, setDifficultyError] = useState<string | null>(null)
  const [showAssessmentFactors, setShowAssessmentFactors] = useState(false)

  // Reading intent state
  const { user } = useAuth()
  const [readingIntent, setReadingIntent] = useState('')
  const [isEditingIntent, setIsEditingIntent] = useState(false)
  const [isLoadingIntent, setIsLoadingIntent] = useState(false)
  const [intentError, setIntentError] = useState<string | null>(null)
  const intentTextareaRef = useRef<HTMLTextAreaElement>(null)

  // Calculate document statistics using database word_count (much simpler and more performant)
  const [documentStats, setDocumentStats] = useState({
    wordCount: 0,
    readingTime: 0,
    readingTimeResult: null as Awaited<ReturnType<typeof calculateReadingTimeFromWordCount>> | null
  })
  
  useEffect(() => {
    const calculateStats = async () => {
      // Use database word_count if available, otherwise skip calculation
      if (!wordCount) {
        console.warn(`No word_count available for document ${documentId}`)
        setDocumentStats({
          wordCount: 0,
          readingTime: 0,
          readingTimeResult: null
        })
        return
      }

      try {
        const supabase = createClient()
        const readingTimeResult = await calculateReadingTimeFromWordCount(wordCount, documentId, supabase)
        
        setDocumentStats({
          wordCount: readingTimeResult.wordCount,
          readingTime: readingTimeResult.readingTimeMinutes,
          readingTimeResult
        })
      } catch (error) {
        console.error('Failed to calculate reading time in MetadataPanel:', error)
        // Fallback: show database word_count with simple reading time calculation
        setDocumentStats({
          wordCount: wordCount,
          readingTime: Math.ceil(wordCount / 238), // Simple fallback calculation
          readingTimeResult: null
        })
      }
    }
    
    calculateStats()
  }, [wordCount, documentId])
  
  // Reading difficulty is now handled by the shared calculation utility
  useEffect(() => {
    if (documentStats.readingTimeResult?.readingDifficulty) {
      setReadingDifficulty(documentStats.readingTimeResult.readingDifficulty)
      setIsLoadingDifficulty(false)
    } else {
      // Try to fetch reading difficulty separately if not included in reading time calculation
      const fetchReadingDifficulty = async () => {
        setIsLoadingDifficulty(true)
        setDifficultyError(null)
        
        try {
          const supabase = createClient()
          const enhancementService = new EnhancementService(supabase)
          
          const existingDifficulty = await enhancementService.get(
            documentId, 
            'reading_difficulty', 
            'ai_assessment'
          )
          
          if (existingDifficulty) {
            const content = existingDifficulty.content as { level: string; confidence: number; factors: string[] }
            setReadingDifficulty({
              level: content.level,
              confidence: content.confidence >= 0.8 ? 'High' : content.confidence >= 0.6 ? 'Medium' : 'Low',
              factors: content.factors || []
            })
          }
        } catch (error) {
          console.error('Failed to fetch reading difficulty:', error)
          setDifficultyError('Failed to load reading difficulty')
        } finally {
          setIsLoadingDifficulty(false)
        }
      }
      
      fetchReadingDifficulty()
    }
  }, [documentStats.readingTimeResult, documentId])
  
  // Load reading intent on component mount
  useEffect(() => {
    const loadReadingIntent = async () => {
      if (!user) return

      try {
        setIsLoadingIntent(true)
        const supabase = createClient()
        
        const { data, error } = await supabase
          .from('document_users')
          .select('background')
          .eq('user_id', user.id)
          .eq('document_id', documentId)
          .maybeSingle()

        if (error && error.code !== 'PGRST116') { // PGRST116 = not found
          throw error
        }

        setReadingIntent(data?.background || '')
      } catch (error) {
        console.error('Failed to load reading intent:', error)
        setIntentError('Failed to load reading intent')
      } finally {
        setIsLoadingIntent(false)
      }
    }

    loadReadingIntent()
  }, [user, documentId])

  // Save reading intent function
  const saveReadingIntent = async (background: string) => {
    if (!user) return

    try {
      setIsLoadingIntent(true)
      setIntentError(null)
      const supabase = createClient()
      
      const { error } = await supabase
        .from('document_users')
        .upsert({
          user_id: user.id,
          document_id: documentId,
          background
        }, {
          onConflict: 'user_id,document_id'
        })

      if (error) throw error
      
      setReadingIntent(background)
      setIsEditingIntent(false)
    } catch (error) {
      console.error('Failed to save reading intent:', error)
      setIntentError('Failed to save reading intent')
    } finally {
      setIsLoadingIntent(false)
    }
  }

  // Handle reading intent editing
  const handleIntentKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsEditingIntent(false)
      setIntentError(null)
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      const textarea = e.target as HTMLTextAreaElement
      saveReadingIntent(textarea.value)
    }
  }

  // Focus textarea when editing starts
  useEffect(() => {
    if (isEditingIntent && intentTextareaRef.current) {
      intentTextareaRef.current.focus()
      intentTextareaRef.current.select()
    }
  }, [isEditingIntent])

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
  
  // Extract file size from upload metadata 
  const fileSize = useMemo(() => {
    if (uploadMetadata?.content_size_kb) {
      const sizeKB = uploadMetadata.content_size_kb
      if (sizeKB < 1024) {
        return `${sizeKB} KB`
      } else {
        return `${(sizeKB / 1024).toFixed(1)} MB`
      }
    }
    return null
  }, [uploadMetadata])
  
  // Determine if document title should be a hyperlink
  const titleHref = useMemo(() => {
    // Only make title a hyperlink if document was extracted from a URL
    return documentSourceUrl?.startsWith('http') ? documentSourceUrl : null
  }, [documentSourceUrl])
  
  // Determine if upload timestamp should be a download link
  const uploadHref = useMemo(() => {
    // Only make upload timestamp a download link if we have an original file
    return storagePath ? `/api/read/${slug}/download` : null
  }, [storagePath, slug])
  
  // Determine file type from source URL, storage path, or original file type
  const fileType = useMemo(() => {
    // For uploaded files (with storage path), use original file type
    if (storagePath && originalFileType) {
      if (originalFileType === 'application/pdf') return 'PDF Document'
      if (originalFileType === 'text/html') return 'HTML Document'
      return 'Document'
    }
    // For URL-extracted documents
    if (documentSourceUrl) {
      if (documentSourceUrl.endsWith('.pdf')) return 'PDF Document'
      if (documentSourceUrl.startsWith('http')) return 'Web Page'
    }
    return 'Document'
  }, [documentSourceUrl, storagePath, originalFileType])
  
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
  
  
  // Get color class for academic difficulty level
  const getAcademicLevelColor = (level: string): string => {
    switch (level) {
      case 'High school or below':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-100'
      case 'Undergraduate':
        return 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-100'
      case 'Masters/PhD':
        return 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-100'
      case 'Post-doctoral/expert':
        return 'bg-orange-50 text-orange-700 border-orange-200 ring-1 ring-orange-100'
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200 ring-1 ring-slate-100'
    }
  }
  
  // Get description for academic difficulty level
  const getAcademicLevelDescription = (level: string): string => {
    switch (level) {
      case 'High school or below':
        return 'Accessible to high school students with basic academic literacy'
      case 'Undergraduate':
        return 'Appropriate for university students in their field of study'
      case 'Masters/PhD':
        return 'Requires graduate-level expertise and substantial background knowledge'
      case 'Post-doctoral/expert':
        return 'Demands expert-level domain knowledge and research experience'
      default:
        return 'Assessment unavailable'
    }
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
                            <div className="font-semibold text-slate-900 text-sm leading-relaxed flex-1">
                              {titleHref ? (
                                <a 
                                  href={titleHref}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-700 hover:underline transition-colors inline-flex items-center gap-1"
                                  title={`View original source: ${titleHref}`}
                                >
                                  {currentTitle}
                                  <ArrowSquareOut size={12} weight="bold" className="text-blue-500" />
                                </a>
                              ) : (
                                currentTitle
                              )}
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
                      <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Added</div>
                      <div className="space-y-1">
                        {uploadHref ? (
                          <a 
                            href={uploadHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-blue-600 hover:text-blue-700 text-sm border-b border-dotted border-blue-400 hover:border-blue-600 transition-colors inline-flex items-center gap-1"
                            title={`Download Spideryarn's backup of original file • ${formattedDate.absolute}`}
                          >
                            {formattedDate.relative}
                            <Download size={12} weight="bold" className="text-blue-500" />
                          </a>
                        ) : (
                          <TooltipOrPopover 
                            content={formattedDate.absolute}
                            showIndicator={false}
                            triggerClassName="font-semibold text-slate-900 text-sm inline-block"
                          >
                            {formattedDate.relative}
                          </TooltipOrPopover>
                        )}
                        {fileSize && (
                          <div className="text-xs text-slate-600">
                            {fileSize}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {(documentSourceUrl || storagePath) && (
                  <div className="p-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center flex-shrink-0">
                        <Hash size={18} weight="bold" className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Source</div>
                        <div className="font-semibold text-slate-900 text-sm break-all">
                          {documentSourceUrl?.startsWith('http') ? (
                            <>
                              {fileType} <a 
                                href={documentSourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700 hover:underline transition-colors inline-flex items-center gap-1"
                                title={`View original source: ${documentSourceUrl}`}
                              >
                                extracted
                                <ArrowSquareOut size={12} weight="bold" className="text-blue-500" />
                              </a>
                            </>
                          ) : (
                            <>{fileType} uploaded</>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
          
          {/* Reading Intent Section */}
          {user && (
            <section>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                <div className="w-1 h-4 bg-gradient-to-b from-orange-400 to-orange-500 rounded-full"></div>
                Reading Intent
              </h3>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Target size={14} weight="bold" className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="mb-2">
                        <span className="text-xs font-medium text-slate-600 uppercase tracking-wider">Your Reading Purpose</span>
                      </div>
                      
                      {isLoadingIntent ? (
                        <div className="flex items-center gap-2 text-amber-600">
                          <CircleNotch size={16} className="animate-spin" />
                          <span className="text-sm">Loading intent...</span>
                        </div>
                      ) : isEditingIntent ? (
                        <div className="space-y-3">
                          <Textarea
                            ref={intentTextareaRef}
                            defaultValue={readingIntent}
                            placeholder="What's your purpose for reading this document? (e.g., research for a project, learning new concepts, understanding for work...)"
                            className="min-h-[100px] text-sm resize-none"
                            onKeyDown={handleIntentKeyDown}
                          />
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-slate-500">
                              Press <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono">Cmd/Ctrl+Enter</kbd> to save, <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono">Esc</kbd> to cancel
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setIsEditingIntent(false)}
                                className="px-3 py-1 text-xs font-medium text-slate-600 hover:text-slate-800 transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => {
                                  const value = intentTextareaRef.current?.value || ''
                                  saveReadingIntent(value)
                                }}
                                disabled={isLoadingIntent}
                                className="px-3 py-1 text-xs font-medium bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors disabled:opacity-50"
                              >
                                {isLoadingIntent ? 'Saving...' : 'Save'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div 
                            className="text-sm text-slate-700 cursor-pointer hover:text-slate-900 transition-colors group"
                            onClick={() => setIsEditingIntent(true)}
                          >
                            {readingIntent ? (
                              <div className="min-h-[2rem] flex items-start">
                                <span className="flex-1">{readingIntent}</span>
                                <PencilSimple size={14} className="text-slate-400 group-hover:text-slate-600 ml-2 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            ) : (
                              <div className="text-slate-400 italic flex items-center gap-2 py-2">
                                <span>Click to add your reading purpose...</span>
                                <PencilSimple size={14} className="text-slate-400 group-hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            )}
                          </div>
                          
                          {intentError && (
                            <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                              {intentError}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
          
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
              
              <TooltipOrPopover
                content={
                  documentStats.enhancedReadingTime ? (
                    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 max-w-sm">
                      <pre className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap font-mono">
                        {generateReadingTimeTooltip(documentStats.enhancedReadingTime)}
                      </pre>
                    </div>
                  ) : (
                    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                      <div className="text-xs text-gray-700 leading-relaxed">
                        Reading time calculated using {238} WPM baseline (research-backed standard)
                      </div>
                    </div>
                  )
                }
                side="left"
                align="center"
                sideOffset={8}
                showIndicator={false}
                contentClassName="p-0 bg-transparent border-0 shadow-none"
              >
                <div className="group bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition-all duration-200 hover:border-slate-300 cursor-help">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center">
                      <Clock size={14} weight="bold" className="text-white" />
                    </div>
                    <span className="text-xs font-medium text-slate-600 uppercase tracking-wider border-b border-dotted border-slate-400">Read Time</span>
                  </div>
                  <div className="text-xl font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    {formatReadingTime(documentStats.readingTime)}
                  </div>
                </div>
              </TooltipOrPopover>
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
          <section>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <div className="w-1 h-4 bg-gradient-to-b from-slate-400 to-slate-500 rounded-full"></div>
              Reading Difficulty
            </h3>
            
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-all duration-200">
              {isLoadingDifficulty ? (
                <div className="flex items-center justify-center py-8">
                  <CircleNotch size={24} weight="bold" className="animate-spin text-amber-600" />
                  <span className="ml-3 text-sm text-slate-600">Analyzing document difficulty...</span>
                </div>
              ) : difficultyError ? (
                <div className="flex items-center justify-center py-8">
                  <XCircle size={20} weight="bold" className="text-red-500" />
                  <span className="ml-3 text-sm text-red-600">{difficultyError}</span>
                </div>
              ) : readingDifficulty ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center">
                        <GraduationCap size={18} weight="bold" className="text-white" />
                      </div>
                      <span 
                        className="text-sm font-semibold text-slate-700 border-b border-dotted border-slate-400 cursor-help" 
                        title="Academic difficulty level assessed using AI analysis of vocabulary, concepts, and technical complexity. More comprehensive than traditional readability formulas."
                      >
                        Academic Level
                      </span>
                    </div>
                    <TooltipOrPopover
                      content={
                        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                          <div className="text-xs text-gray-700 leading-relaxed">
                            {getAcademicLevelDescription(readingDifficulty.level)}
                          </div>
                        </div>
                      }
                      side="left"
                      align="center"
                      sideOffset={8}
                      showIndicator={false}
                      contentClassName="p-0 bg-transparent border-0 shadow-none"
                    >
                      <span className={`px-3 py-1.5 rounded-full text-sm font-bold border ${getAcademicLevelColor(readingDifficulty.level)} cursor-help`}>
                        <span className="border-b border-dotted border-slate-400">
                          {readingDifficulty.level}
                        </span>
                      </span>
                    </TooltipOrPopover>
                  </div>
                  
                  <div className="space-y-3">
                    {/* Assessment Details - Collapsible */}
                    <div>
                      <button
                        onClick={() => setShowAssessmentFactors(!showAssessmentFactors)}
                        className="flex items-center gap-2 text-xs text-slate-600 hover:text-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded px-1 py-0.5"
                      >
                        <CaretDown 
                          size={12} 
                          className={`text-slate-400 transition-transform duration-200 ${
                            showAssessmentFactors ? '' : '-rotate-90'
                          }`} 
                        />
                        <span>Assessment Factors</span>
                      </button>
                      
                      {showAssessmentFactors && (
                        <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3 animate-in slide-in-from-top-1 duration-200">
                          <div className="text-xs text-blue-700 leading-relaxed space-y-1">
                            {readingDifficulty.factors.map((factor, index) => (
                              <div key={index} className="flex items-start gap-2">
                                <span className="text-blue-500 mt-0.5">•</span>
                                <span>{factor}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Confidence */}
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span 
                        className="border-b border-dotted border-slate-400 cursor-help"
                        title="Assessment performed using AI analysis for comprehensive evaluation of text complexity, vocabulary sophistication, and conceptual requirements."
                      >
                        Method: AI Analysis
                      </span>
                      <span 
                        className="border-b border-dotted border-slate-400 cursor-help"
                        title={`Confidence level: ${readingDifficulty.confidence}. High confidence indicates clear classification, medium suggests borderline complexity.`}
                      >
                        Confidence: {readingDifficulty.confidence}
                      </span>
                    </div>
                    
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <span className="text-sm text-slate-600">No difficulty assessment available</span>
                </div>
              )}
            </div>
          </section>
          
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
                            Public?
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

          {/* Document Actions Section */}
          <section>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <div className="w-1 h-4 bg-gradient-to-b from-red-400 to-red-500 rounded-full"></div>
              Document Actions
            </h3>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-700 mb-1">Delete Document</div>
                    <div className="text-xs text-slate-500">Permanently remove this document and all associated data</div>
                  </div>
                  <div className="flex-shrink-0">
                    <DeleteDocumentButton
                      documentId={documentId}
                      documentTitle={currentTitle}
                      variant="text"
                      className="bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}