'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AppHeader } from '@/components/app-header'
import { Footer } from '@/components/footer'
import { CircleNotch } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { UrlInputSection } from '@/components/upload/url-input-section'
import { FileUploadSection } from '@/components/upload/file-upload-section'
import { ProcessingOptions } from '@/components/upload/processing-options'
import { useVisionSinglePageUploader } from '@/lib/hooks/use-vision-single-page-uploader'
import { generateDocumentId } from '@/lib/utils/document-id'
import { VisionUploadProgress } from '@/components/upload/vision-upload-progress'
import { MemoryUsageWarning } from '@/components/upload/memory-usage-warning'

// Unified state types for smart upload interface
type InputType = 'url' | 'pdf' | 'html' | null
type ProcessingMethod = 'as-is' | 'readability' | 'ai-transcription' | 'vision-ai'
type Provider = 'claude' | 'gemini'

interface UnifiedUploadState {
  input: {
    url: string
    file: File | null
    type: InputType
  }
  processing: {
    method: ProcessingMethod
    provider: Provider
    isPublic: boolean
  }
  ui: {
    isProcessing: boolean
    processingMessage: string
    error: string
    isDragging: boolean
  }
}

export default function AddDocumentPage() {
  const router = useRouter()
  
  // Vision single-page uploader hook
  // Unified state for smart upload interface
  const [uploadState, setUploadState] = useState<UnifiedUploadState>({
    input: {
      url: '',
      file: null,
      type: null
    },
    processing: {
      method: 'readability', // Default method
      provider: 'gemini',
      isPublic: false
    },
    ui: {
      isProcessing: false,
      processingMessage: '',
      error: '',
      isDragging: false
    }
  })
  
  // Additional state for vision upload
  const [visionUploadState, setVisionUploadState] = useState<{
    isConverting: boolean
    convertedImages: Array<{ pageIndex: number; base64Image: string; width: number; height: number }> | null
    documentId: string | null
    documentTitle: string | null
    pageCount: number
  }>({
    isConverting: false,
    convertedImages: null,
    documentId: null,
    documentTitle: null,
    pageCount: 0
  })

  // FIRST_EDIT
  const visionUploadStateRef = useRef(visionUploadState)
  const uploadStateRef = useRef(uploadState)

  useEffect(() => {
    visionUploadStateRef.current = visionUploadState
  }, [visionUploadState])

  useEffect(() => {
    uploadStateRef.current = uploadState
  }, [uploadState])

  // Insert moved definition after useEffect update for uploadStateRef
  // INSERT_HANDLE_VISION_ALL_COMPLETE
  const handleVisionAllComplete = useCallback(async (htmlFragments: string[]) => {
    const { documentId, pageCount, documentTitle } = visionUploadStateRef.current
    const { input, processing } = uploadStateRef.current

    try {
      if (htmlFragments.length === 0) {
        throw new Error('No pages were processed successfully. Please check for errors in the upload progress list.')
      }

      const fullHtml = htmlFragments.join('\n')

      const response = await fetch('/api/finalise-vision-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          html: fullHtml,
          pageCount,
          title: documentTitle,
          filename: input.file?.name,
          isPublic: processing.isPublic
        })
      })

      if (response.status === 409) {
        // Document already finalised – redirect to existing document
        const conflictData = await response.json()
        const slug = conflictData.slug
        if (slug) {
          router.push(`/read/${slug}`)
          return
        }
        // Fallback: show error but stop processing state
        throw new Error('Document already exists but cannot determine its location')
      }

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Failed to finalize document')
      }

      const result = await response.json()
      if (result.success) {
        router.push(`/read/${result.document.slug}`)
      } else {
        throw new Error(result.message || 'Failed to create document')
      }
    } catch (error) {
      setUploadState(prev => ({
        ...prev,
        ui: {
          ...prev.ui,
          error: error instanceof Error ? error.message : 'Failed to finalize document',
          isProcessing: false,
          processingMessage: ''
        }
      }))
    }
  }, [router])

  const {
    uploadPages,
    pageStates,
    isUploading: isVisionUploading,
    overallProgress: visionProgress,
    cancel: cancelVisionUpload,
    getCompletedHtml,
    pause: pauseVisionUpload,
    resume: resumeVisionUpload,
    isPaused: isVisionPaused,
    retry: retryVisionPage,
    forceCompletePage
  } = useVisionSinglePageUploader({
    maxConcurrency: 3,
    onProgress: (pageNumber, progress, status) => {
      // Update UI with page-level progress
      console.log(`Page ${pageNumber}: ${status} (${progress}%)`)
    },
    onPageComplete: (pageNumber, htmlFragment) => {
      console.log(`Page ${pageNumber} completed`)
    },
    onError: (pageNumber, error) => {
      console.error(`Page ${pageNumber} failed:`, error)

      // Handle specific fatal-but-recoverable errors interactively
      if (error.startsWith('UPLOADS_FAILED:')) {
        const userWantsCancel = window.confirm(
          `${error.replace('UPLOADS_FAILED:', '').trim()}` +
          '\n\nClick "OK" to cancel the entire upload (all progress will be discarded).\n' +
          'Click "Cancel" to continue without the failed images.'
        )

        if (userWantsCancel) {
          cancelVisionUpload()
          alert('Upload cancelled.')
        } else if (pageNumber) {
          // Mark the page as completed so the pipeline can continue
          forceCompletePage(pageNumber)
          alert('Continuing without the failed images on this page – they will be marked in the final document.')
        }

        return
      }

      // Generic fallback alert
      alert(`Page ${pageNumber || 'unknown'} failed: ${error}`)
    },
    onAllComplete: handleVisionAllComplete
  })
  
  // Helper functions - defined before use
  const isValidUrl = (urlString: string): boolean => {
    if (!urlString || urlString.trim().length === 0) return false
    
    try {
      const url = new URL(urlString.trim())
      // Only allow http and https protocols
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return false
      }
      // Basic hostname validation
      if (!url.hostname || url.hostname.length < 3) {
        return false
      }
      return true
    } catch {
      return false
    }
  }

  const validateUrlForSubmission = (urlString: string): { isValid: boolean; error?: string } => {
    if (!urlString || urlString.trim().length === 0) {
      return { isValid: false, error: 'Please enter a URL' }
    }

    const trimmed = urlString.trim()
    
    try {
      const url = new URL(trimmed)
      
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return { isValid: false, error: 'URL must use HTTP or HTTPS protocol' }
      }
      
      if (!url.hostname || url.hostname.length < 3) {
        return { isValid: false, error: 'Please enter a valid domain name' }
      }
      
      // Check for common localhost patterns that might not work in production
      if (url.hostname === 'localhost' || url.hostname.startsWith('127.') || url.hostname.startsWith('192.168.')) {
        return { isValid: false, error: 'Local URLs are not supported. Please use a publicly accessible URL.' }
      }
      
      return { isValid: true }
    } catch {
      return { isValid: false, error: 'Please enter a valid URL (e.g., https://example.com)' }
    }
  }

  const isHtmlFile = (file: File): boolean => {
    return file.type === 'text/html' || 
           file.name.toLowerCase().endsWith('.html') || 
           file.name.toLowerCase().endsWith('.htm')
  }

  // Input type detection function
  const detectInputType = (value: string | File | null): InputType => {
    if (!value) return null
    if (typeof value === 'string') {
      if (isValidUrl(value)) return 'url'
      return null // Invalid URL
    }
    if (value.type === 'application/pdf') return 'pdf'
    if (isHtmlFile(value)) return 'html'
    return null // Unsupported file type
  }

  // State update functions with mutual exclusivity
  const handleUrlChange = (url: string) => {
    setUploadState(prev => ({
      ...prev,
      input: {
        url,
        file: null, // Clear file when URL is entered
        type: detectInputType(url)
      },
      ui: {
        ...prev.ui,
        error: '', // Clear errors on input change
        processingMessage: '' // Clear processing message on input change
      }
    }))
  }

  const handleFileChange = (file: File | null) => {
    setUploadState(prev => ({
      ...prev,
      input: {
        url: '', // Clear URL when file is selected
        file,
        type: detectInputType(file)
      },
      ui: {
        ...prev.ui,
        error: '', // Clear errors on input change
        processingMessage: '' // Clear processing message on input change
      }
    }))
  }

  const handleProcessingChange = useCallback((method: ProcessingMethod) => {
    setUploadState(prev => ({
      ...prev,
      processing: {
        ...prev.processing,
        method
      }
    }))
  }, [])

  const handleProviderChange = (provider: Provider) => {
    setUploadState(prev => ({
      ...prev,
      processing: {
        ...prev.processing,
        provider
      }
    }))
  }

  const handlePublicChange = (isPublic: boolean) => {
    setUploadState(prev => ({
      ...prev,
      processing: {
        ...prev.processing,
        isPublic
      }
    }))
  }

  // Processing options logic based on input type
  const getAvailableProcessingMethods = useCallback((): ProcessingMethod[] => {
    const { type } = uploadState.input
    
    switch (type) {
      case 'url':
        // For URLs, show both HTML methods (will validate PDF URLs on submit)
        return ['readability', 'ai-transcription']
      case 'html':
        return ['as-is', 'readability', 'ai-transcription']
      case 'pdf':
        return ['vision-ai', 'ai-transcription']
      default:
        return ['readability', 'ai-transcription'] // Default options
    }
  }, [uploadState.input])

  // Validation logic for processing method compatibility
  const validateProcessingMethod = (method: ProcessingMethod, inputType: InputType): {
    isValid: boolean
    error?: string
    suggestedMethod?: ProcessingMethod
  } => {
    if (inputType === 'pdf' && ['as-is', 'readability'].includes(method)) {
      return {
        isValid: false,
        error: "PDF documents require AI processing. 'As-is' and 'Readability' are only available for HTML content.",
        suggestedMethod: 'vision-ai'
      }
    }
    if (inputType !== 'pdf' && method === 'vision-ai') {
      return {
        isValid: false,
        error: "Vision-based processing is only available for PDF documents.",
        suggestedMethod: 'ai-transcription'
      }
    }
    return { isValid: true }
  }


  // Get contextual processing message
  const getProcessingMessage = (input: UnifiedUploadState['input'], processing: UnifiedUploadState['processing']): string => {
    const { type, file } = input
    const { method, provider } = processing
    
    if (input.url) {
      switch (method) {
        case 'readability':
          return 'Extracting content with Mozilla Readability...'
        case 'ai-transcription':
          return `Processing with LLM transcription (v1) using ${provider === 'claude' ? 'Claude' : 'Gemini'}...`
        default:
          return 'Processing URL...'
      }
    } else if (file) {
      if (type === 'pdf') {
        if (method === 'vision-ai') {
          return 'Processing PDF with LLM vision-based transcription (v2)...'
        } else {
          return `Processing PDF with LLM transcription (v1) using ${provider === 'claude' ? 'Claude' : 'Gemini'}...`
        }
      } else if (type === 'html') {
        switch (method) {
          case 'as-is':
            return 'Processing HTML file...'
          case 'readability':
            return 'Extracting content with Mozilla Readability...'
          case 'ai-transcription':
            return `Processing HTML with LLM transcription (v1) using ${provider === 'claude' ? 'Claude' : 'Gemini'}...`
          default:
            return 'Processing HTML file...'
        }
      }
    }
    
    return 'Processing document...'
  }

  // Drag and drop handlers
  const handleDragStart = () => {
    setUploadState(prev => ({
      ...prev,
      ui: { ...prev.ui, isDragging: true }
    }))
  }

  const handleDragEnd = () => {
    setUploadState(prev => ({
      ...prev,
      ui: { ...prev.ui, isDragging: false }
    }))
  }

  const handleFileDrop = (file: File) => {
    handleFileChange(file)
  }

  const handleValidationError = (error: string) => {
    setUploadState(prev => ({
      ...prev,
      ui: {
        ...prev.ui,
        error,
        processingMessage: '' // Clear processing message on validation error
      }
    }))
  }

  // Auto-adjust processing method when input type changes
  useEffect(() => {
    const availableMethods = getAvailableProcessingMethods()
    if (!availableMethods.includes(uploadState.processing.method) && availableMethods.length > 0) {
      // Switch to first available method if current method is not valid
      handleProcessingChange(availableMethods[0]!)
    }
  }, [uploadState.input.type, uploadState.processing.method, getAvailableProcessingMethods, handleProcessingChange])

  // Unified submit handler
  const handleSubmit = useCallback(async () => {
    const { input, processing } = uploadState
    
    // Clear any previous errors and set processing state
    const processingMessage = getProcessingMessage(input, processing)
    setUploadState(prev => ({
      ...prev,
      ui: { 
        ...prev.ui, 
        error: '', 
        isProcessing: true,
        processingMessage
      }
    }))

    try {
      // Validate input
      if (!input.url && !input.file) {
        throw new Error('Please enter a URL or select a file')
      }

      // Validate processing method compatibility
      const validation = validateProcessingMethod(processing.method, input.type)
      if (!validation.isValid) {
        throw new Error(validation.error)
      }

      let response: Response

      if (input.url) {
        // Handle URL submission with enhanced validation
        const urlValidation = validateUrlForSubmission(input.url)
        if (!urlValidation.isValid) {
          throw new Error(urlValidation.error)
        }

        response = await fetch('/api/extract-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: input.url.trim(),
            extractionMethod: processing.method,
            provider: processing.provider,
            isPublic: processing.isPublic
          })
        })
      } else if (input.file) {
        // Handle file submission
        const formData = new FormData()
        formData.append('file', input.file)
        formData.append('provider', processing.provider)
        formData.append('isPublic', processing.isPublic.toString())
        
        if (input.type === 'pdf') {
          if (processing.method === 'vision-ai') {
            // Phase 2 Vision-AI processing with single-page uploads
            try {
              // Update processing message for conversion phase
              setUploadState(prev => ({
                ...prev,
                ui: { 
                  ...prev.ui, 
                  processingMessage: 'Converting PDF to images...'
                }
              }))

              // Dynamic import to avoid SSR issues
              if (typeof window === 'undefined') {
                throw new Error('PDF conversion must happen in browser environment')
              }
              const { convertPDFToImages, getRecommendedSettings } = await import('@/lib/utils/pdf-to-images')
              
              // Use balanced settings for good quality/performance trade-off
              const conversionOptions = getRecommendedSettings('balanced')
              
              // Convert PDF to images with progress feedback
              const imageResult = await convertPDFToImages(input.file, {
                ...conversionOptions,
                onProgress: (pageIndex, totalPages) => {
                  setUploadState(prev => ({
                    ...prev,
                    ui: { 
                      ...prev.ui, 
                      processingMessage: `Converting page ${pageIndex + 1} of ${totalPages}...`
                    }
                  }))
                }
              })

              // Generate document ID and title for the upload
              const documentId = generateDocumentId()
              const documentTitle = input.file.name.replace(/\.pdf$/i, '') || 'Untitled Document'
              
              // Update vision upload state
              setVisionUploadState({
                isConverting: false,
                convertedImages: imageResult.pages,
                documentId,
                documentTitle,
                pageCount: imageResult.pages.length
              })
              
              // Clear processing state to show upload progress UI
              setUploadState(prev => ({
                ...prev,
                ui: { 
                  ...prev.ui, 
                  isProcessing: false,
                  processingMessage: ''
                }
              }))
              
              // Create draft document row so asset inserts pass RLS
              try {
                await fetch('/api/create-draft-document', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    documentId,
                    title: documentTitle,
                    filename: input.file.name,
                    isPublic: processing.isPublic
                  })
                })
              } catch (draftErr) {
                console.error('Failed to create draft document:', draftErr)
                // Continue anyway; insert policies may fail
              }

              // Start the page-by-page upload process
              const pageImages = imageResult.pages.map(page => ({
                base64Image: page.base64Image,
                pageNumber: page.pageIndex + 1 // Convert to 1-based
              }))
              
              await uploadPages(
                pageImages,
                documentId,
                documentTitle,
                input.file.name,
                imageResult.pages.length
              )
              
              // Return early - the onAllComplete callback will handle navigation
              return
              
            } catch (conversionError) {
              throw new Error(
                conversionError instanceof Error 
                  ? `PDF conversion failed: ${conversionError.message}` 
                  : 'PDF conversion failed with unknown error'
              )
            }
          } else {
            // Standard AI transcription (v1)
            const apiEndpoint = '/api/upload-pdf'
            response = await fetch(apiEndpoint, {
              method: 'POST',
              body: formData
            })
          }
        } else if (input.type === 'html') {
          // Create new FormData for HTML upload with correct field name
          const htmlFormData = new FormData()
          htmlFormData.append('html', input.file)  // API expects 'html' field, not 'file'
          htmlFormData.append('processingMethod', processing.method)
          htmlFormData.append('provider', processing.provider)
          htmlFormData.append('isPublic', processing.isPublic.toString())
          response = await fetch('/api/upload-html', {
            method: 'POST',
            body: htmlFormData
          })
        } else {
          throw new Error('Unsupported file type')
        }
      } else {
        throw new Error('No input provided')
      }

      if (!response.ok) {
        const responseText = await response.text()
        try {
          const errorData = JSON.parse(responseText)
          if (errorData.error === 'readability_failed' && errorData.suggested_method) {
            throw new Error(`${errorData.message} Try AI Transcription instead.`)
          } else {
            throw new Error(errorData.message || 'Processing failed')
          }
        } catch {
          throw new Error(responseText || 'Processing failed')
        }
      }

      const result = await response.json()
      if (result.success) {
        router.push(`/read/${result.document.slug}`)
      } else {
        throw new Error(result.message || 'Processing failed')
      }
    } catch (error) {
      setUploadState(prev => ({
        ...prev,
        ui: {
          ...prev.ui,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          isProcessing: false,
          processingMessage: ''
        }
      }))
    }
  }, [uploadState, router])

  // Global ENTER key handling for file uploads
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      // Only handle ENTER when a file is selected and no URL is entered
      if (
        event.key === 'Enter' && 
        uploadState.input.file && 
        !uploadState.input.url &&
        !uploadState.ui.isProcessing &&
        // Ensure we're not inside an input field (let URL input handle its own ENTER)
        !(event.target instanceof HTMLInputElement) &&
        !(event.target instanceof HTMLTextAreaElement)
      ) {
        event.preventDefault()
        handleSubmit()
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [uploadState.input.file, uploadState.input.url, uploadState.ui.isProcessing, handleSubmit])

  // Check if we can submit (have valid input)
  const canSubmit = (): boolean => {
    const { input } = uploadState
    if (input.file) return true
    if (input.url && isValidUrl(input.url)) return true
    return false
  }

  return (
    <div className="min-h-screen">
      <AppHeader title="Add Document" backLink="/read" backText="Documents" />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="space-y-6 sm:space-y-8">
          {/* Smart Input Interface */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 shadow-sm">
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Add Document
              </h2>
              
              {/* URL Input Section */}
              <UrlInputSection
                value={uploadState.input.url}
                onChange={handleUrlChange}
                onSubmit={handleSubmit}
                isActive={!uploadState.input.file}
                isDisabled={!!uploadState.input.file}
                isProcessing={uploadState.ui.isProcessing}
                {...(uploadState.input.url && uploadState.ui.error && { error: uploadState.ui.error })}
              />
              
              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-4 text-sm font-medium text-gray-500">OR</span>
                </div>
              </div>
              
              {/* File Upload Section */}
              <FileUploadSection
                file={uploadState.input.file}
                onChange={handleFileChange}
                onDrop={handleFileDrop}
                onValidationError={handleValidationError}
                isDisabled={!!uploadState.input.url}
                isProcessing={uploadState.ui.isProcessing}
                isDragging={uploadState.ui.isDragging}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                {...(uploadState.ui.error && { error: uploadState.ui.error })}
              />
              
              {/* Processing Options */}
              <ProcessingOptions
                inputType={uploadState.input.type}
                selectedMethod={uploadState.processing.method}
                selectedProvider={uploadState.processing.provider}
                isPublic={uploadState.processing.isPublic}
                onMethodChange={handleProcessingChange}
                onProviderChange={handleProviderChange}
                onPublicChange={handlePublicChange}
                availableMethods={getAvailableProcessingMethods()}
              />
              
              {/* Memory Usage Warning for Vision Processing */}
              {uploadState.input.file && 
               uploadState.input.type === 'pdf' && 
               uploadState.processing.method === 'vision-ai' && (
                <MemoryUsageWarning
                  pageCount={visionUploadState.pageCount || 20} // Estimate if not yet known
                  fileSize={uploadState.input.file.size}
                  isVisible={true}
                />
              )}
              
              {/* Vision Upload Progress */}
              {isVisionUploading && (
                <VisionUploadProgress
                  pageStates={pageStates}
                  overallProgress={visionProgress}
                  isUploading={isVisionUploading}
                  isPaused={isVisionPaused}
                  onRetry={retryVisionPage}
                  onPause={pauseVisionUpload}
                  onResume={resumeVisionUpload}
                  onCancel={() => {
                    cancelVisionUpload()
                    setUploadState(prev => ({
                      ...prev,
                      ui: {
                        ...prev.ui,
                        error: 'Upload cancelled by user',
                        isProcessing: false,
                        processingMessage: ''
                      }
                    }))
                  }}
                />
              )}
              
              {/* Submit Button - hide during vision upload */}
              {!isVisionUploading && (
                <div className="flex justify-end">
                  <Button
                    onClick={handleSubmit}
                    disabled={!canSubmit() || uploadState.ui.isProcessing}
                    className="px-6 sm:px-8 py-2 w-full sm:w-auto"
                  >
                    {uploadState.ui.isProcessing ? (
                      <>
                        <CircleNotch size={16} className="animate-spin mr-2" />
                        {uploadState.ui.processingMessage || 'Processing...'}
                      </>
                    ) : (
                      'Add Document'
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  )
}
