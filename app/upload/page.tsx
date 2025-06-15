'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AppHeader } from '@/components/app-header'
import { Footer } from '@/components/footer'
import { CircleNotch } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { SmartInput } from '@/components/upload/smart-input'
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
      error: '',
      isDragging: false
    }
  })
  

  // Input type detection functions
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

  const isValidUrl = (urlString: string): boolean => {
    try {
      const url = new URL(urlString)
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
      return false
    }
  }

  const isHtmlFile = (file: File): boolean => {
    return file.type === 'text/html' || 
           file.name.toLowerCase().endsWith('.html') || 
           file.name.toLowerCase().endsWith('.htm')
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
        error: '' // Clear errors on input change
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
        error: '' // Clear errors on input change
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
  }, [uploadState.input.type])

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

  // Get contextual placeholder text
  const getPlaceholder = (): string => {
    const { type, file } = uploadState.input
    
    if (file) {
      return `${file.name} (${type?.toUpperCase()}) selected`
    }
    
    switch (type) {
      case 'url':
        return 'Web page or PDF URL detected'
      default:
        return 'Enter URL or drag files here'
    }
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
    
    // Clear any previous errors
    setUploadState(prev => ({
      ...prev,
      ui: { ...prev.ui, error: '', isProcessing: true }
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
        // Handle URL submission
        if (!isValidUrl(input.url)) {
          throw new Error('Please enter a valid HTTP or HTTPS URL')
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
          formData.append('processingMethod', processing.method)
          formData.append('provider', processing.provider)
          response = await fetch('/api/upload-html', {
            method: 'POST',
            body: formData
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
          isProcessing: false
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
      
      <main className="max-w-4xl mx-auto px-8 py-8">
        <div className="space-y-8">
          {/* Smart Input Interface */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Add Document
              </h2>
              
              {/* Smart Input Component */}
              <SmartInput
                value={uploadState.input}
                onUrlChange={handleUrlChange}
                onFileChange={handleFileChange}
                onFileDrop={handleFileDrop}
                placeholder={getPlaceholder()}
                error={uploadState.ui.error}
                isProcessing={uploadState.ui.isProcessing}
                isDragging={uploadState.ui.isDragging}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
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
                  className="px-8 py-2"
                >
                  {uploadState.ui.isProcessing ? (
                    <>
                      <CircleNotch size={16} className="animate-spin mr-2" />
                      Processing...
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
