'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AppHeader } from '@/components/app-header'
import { Footer } from '@/components/footer'
import { CircleNotch } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { UrlInputSection } from '@/components/upload/url-input-section'
import { FileUploadSection } from '@/components/upload/file-upload-section'
import { ProcessingOptions } from '@/components/upload/processing-options'

// Unified state types for smart upload interface
type InputType = 'url' | 'pdf' | 'html' | null
type ProcessingMethod = 'as-is' | 'readability' | 'ai-transcription'
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
  
  // Unified state for smart upload interface
  const [uploadState, setUploadState] = useState<UnifiedUploadState>({
    input: {
      url: '',
      file: null,
      type: null
    },
    processing: {
      method: 'readability', // Default method
      provider: 'claude',
      isPublic: false
    },
    ui: {
      isProcessing: false,
      processingMessage: '',
      error: '',
      isDragging: false
    }
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
        return ['ai-transcription']
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
        error: "PDF documents require AI transcription. 'As-is' and 'Readability' are only available for HTML content.",
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
          return `Transcribing content with ${provider === 'claude' ? 'Claude' : 'Gemini'}...`
        default:
          return 'Processing URL...'
      }
    } else if (file) {
      if (type === 'pdf') {
        return `Transcribing PDF with ${provider === 'claude' ? 'Claude' : 'Gemini'}...`
      } else if (type === 'html') {
        switch (method) {
          case 'as-is':
            return 'Processing HTML file...'
          case 'readability':
            return 'Extracting content with Mozilla Readability...'
          case 'ai-transcription':
            return `Transcribing HTML with ${provider === 'claude' ? 'Claude' : 'Gemini'}...`
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
    if (!availableMethods.includes(uploadState.processing.method)) {
      // Switch to first available method if current method is not valid
      handleProcessingChange(availableMethods[0])
    }
  }, [uploadState.input.type, uploadState.processing.method, getAvailableProcessingMethods, handleProcessingChange])

  // Unified submit handler
  const handleSubmit = async () => {
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
          response = await fetch('/api/upload-pdf', {
            method: 'POST',
            body: formData
          })
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
  }

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
                onValidationError={handleValidationError}
                isActive={!uploadState.input.file}
                isDisabled={!!uploadState.input.file}
                isProcessing={uploadState.ui.isProcessing}
                error={uploadState.input.url ? uploadState.ui.error : undefined}
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
                isActive={!uploadState.input.url}
                isDisabled={!!uploadState.input.url}
                isProcessing={uploadState.ui.isProcessing}
                isDragging={uploadState.ui.isDragging}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                error={uploadState.input.file ? uploadState.ui.error : undefined}
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
              
              {/* Submit Button */}
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
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  )
}
