'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppHeader } from '@/components/app-header'
import { Footer } from '@/components/footer'
import { Upload, FilePdf, X, Link as LinkIcon, CircleNotch } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

export default function AddDocumentPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'url' | 'pdf'>('url')
  
  // URL state
  const [url, setUrl] = useState('')
  const [isExtractingUrl, setIsExtractingUrl] = useState(false)
  const [urlError, setUrlError] = useState<string>('')
  const [extractionMethod, setExtractionMethod] = useState<'readability' | 'ai-transcription' | 'ai-dom'>('readability')
  
  // PDF state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [convertedHtml, setConvertedHtml] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [isDragging, setIsDragging] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<'claude' | 'gemini'>('claude')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)

  // Autofocus on URL input when URL tab is active
  useEffect(() => {
    if (activeTab === 'url' && urlInputRef.current) {
      urlInputRef.current.focus()
    }
  }, [activeTab])

  // Handle ENTER key submission for URL input
  const handleUrlKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && url.trim() && isValidUrl(url.trim())) {
      e.preventDefault()
      handleUrlSubmit()
    }
  }
  
  // URL validation helper
  const isValidUrl = (urlString: string): boolean => {
    try {
      const url = new URL(urlString)
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
      return false
    }
  }

  // URL submission handler
  const handleUrlSubmit = async () => {
    if (!url.trim()) {
      setUrlError('Please enter a URL')
      return
    }

    if (!isValidUrl(url.trim())) {
      setUrlError('Please enter a valid HTTP or HTTPS URL')
      return
    }

    // Check if AI DOM Manipulation is selected
    if (extractionMethod === 'ai-dom') {
      setUrlError('AI DOM Manipulation is an experimental feature that is not yet implemented.')
      return
    }

    setIsExtractingUrl(true)
    setUrlError('')

    try {
      const response = await fetch('/api/extract-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          url: url.trim(),
          extractionMethod 
        }),
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(errorData || 'URL extraction failed')
      }

      const result = await response.json()
      // Navigate to the document page using the slug
      router.push(`/documents/${result.document.slug}`)
    } catch (error) {
      setUrlError(error instanceof Error ? error.message : 'Unknown error occurred')
    } finally {
      setIsExtractingUrl(false)
    }
  }

  const handleFile = (file: File) => {
    // Reset previous results
    setError('')
    setConvertedHtml('')

    // Validate file type
    if (file.type !== 'application/pdf') {
      setError('Please select a PDF file')
      return
    }

    // Validate file size (32MB limit for Claude API)
    const maxSize = 32 * 1024 * 1024 // 32MB
    if (file.size > maxSize) {
      setError('PDF file too large (max 32MB for Claude direct processing)')
      return
    }

    setSelectedFile(file)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Only set isDragging to false if we're leaving the drop zone entirely
    // This prevents flickering when dragging over child elements
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDragging(false)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      handleFile(files[0])
    }
  }

  // Keyboard accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      fileInputRef.current?.click()
    }
  }

  const clearSelectedFile = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedFile(null)
    setError('')
    setConvertedHtml('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setError('')
    setConvertedHtml('')

    try {
      const formData = new FormData()
      formData.append('pdf', selectedFile)
      formData.append('provider', selectedProvider)

      const response = await fetch('/api/upload-pdf', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(errorData || 'Upload failed')
      }

      const result = await response.json()
      // Navigate to the document page using the slug
      router.push(`/documents/${result.document.slug}`)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error occurred')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="min-h-screen">
      <AppHeader title="Add Document" backLink="/documents" backText="Documents" />
      
      <main className="max-w-4xl mx-auto px-8 py-8">
        <div className="space-y-8">
          {/* Tab Navigation */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex space-x-1 mb-6 border-b border-gray-100 pb-4">
              <button
                onClick={() => setActiveTab('url')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'url'
                    ? 'bg-orange-100 text-orange-800 border border-orange-200'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <LinkIcon size={16} className="inline mr-2" />
                Paste URL
              </button>
              <button
                onClick={() => setActiveTab('pdf')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'pdf'
                    ? 'bg-orange-100 text-orange-800 border border-orange-200'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <FilePdf size={16} className="inline mr-2" />
                Upload PDF
              </button>
            </div>

            {/* URL Tab Content */}
            {activeTab === 'url' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Add Document from URL
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="url-input" className="block text-sm font-medium text-gray-700 mb-2">
                      Website URL
                    </label>
                    <input
                      ref={urlInputRef}
                      id="url-input"
                      type="url"
                      value={url}
                      onChange={(e) => {
                        setUrl(e.target.value)
                        setUrlError('') // Clear error on input change
                      }}
                      onKeyDown={handleUrlKeyDown}
                      placeholder="https://example.com/article"
                      disabled={isExtractingUrl}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Enter a URL to extract and save the webpage content. Supports articles, blog posts, and most text-based web content. Press ENTER to submit when URL is valid.
                    </p>
                  </div>

                  {/* Extraction Method Selection */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Extraction Method
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-start cursor-pointer">
                        <input
                          type="radio"
                          name="extractionMethod"
                          value="readability"
                          checked={extractionMethod === 'readability'}
                          onChange={(e) => setExtractionMethod(e.target.value as 'readability' | 'ai-transcription' | 'ai-dom')}
                          disabled={isExtractingUrl}
                          className="mt-0.5 mr-3 text-orange-600 focus:ring-orange-500"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">Mozilla Readability (Fast & Reliable)</div>
                          <div className="text-xs text-gray-500">Best for standard articles and blog posts. Extracts content instantly without AI processing.</div>
                        </div>
                      </label>
                      
                      <label className="flex items-start cursor-pointer">
                        <input
                          type="radio"
                          name="extractionMethod"
                          value="ai-transcription"
                          checked={extractionMethod === 'ai-transcription'}
                          onChange={(e) => setExtractionMethod(e.target.value as 'readability' | 'ai-transcription' | 'ai-dom')}
                          disabled={isExtractingUrl}
                          className="mt-0.5 mr-3 text-orange-600 focus:ring-orange-500"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">AI Transcription (High Quality)</div>
                          <div className="text-xs text-gray-500">Uses AI to carefully transcribe content. Slower but handles complex layouts better.</div>
                        </div>
                      </label>
                      
                      <label className="flex items-start cursor-pointer opacity-50">
                        <input
                          type="radio"
                          name="extractionMethod"
                          value="ai-dom"
                          checked={extractionMethod === 'ai-dom'}
                          onChange={(e) => setExtractionMethod(e.target.value as 'readability' | 'ai-transcription' | 'ai-dom')}
                          disabled={isExtractingUrl}
                          className="mt-0.5 mr-3 text-orange-600 focus:ring-orange-500"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">AI DOM Manipulation (Experimental)</div>
                          <div className="text-xs text-gray-500">Instructs AI to programmatically clean the HTML. This feature is not yet implemented.</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <Button
                    onClick={handleUrlSubmit}
                    disabled={!url.trim() || isExtractingUrl}
                    variant="orange"
                    size="full"
                  >
                    {isExtractingUrl ? (
                      <>
                        <CircleNotch className="animate-spin" size={16} />
                        Extracting content...
                      </>
                    ) : (
                      'Extract and Save Document'
                    )}
                  </Button>

                  {urlError && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                      <div className="font-medium mb-1">Extraction Error</div>
                      <div>{urlError}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PDF Tab Content */}
            {activeTab === 'pdf' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Upload PDF Document
                </h2>
                
                <div className="space-y-6">
                  {/* Drag and Drop Zone */}
                  <div
                    className={`
                      relative border-2 border-dashed rounded-lg p-8 transition-all duration-200 cursor-pointer
                      ${isDragging 
                        ? 'border-orange-500 bg-orange-50' 
                        : 'border-gray-300 hover:border-orange-400 bg-gray-50'
                      }
                      ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => !isUploading && fileInputRef.current?.click()}
                    onKeyDown={handleKeyDown}
                    tabIndex={0}
                    role="button"
                    aria-label="Drag and drop a PDF file here or press Enter to select a file"
                    aria-describedby="upload-help"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={handleFileSelect}
                      disabled={isUploading}
                      className="sr-only"
                    />
                    
                    {!selectedFile ? (
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <Upload 
                          size={48} 
                          className={isDragging ? 'text-orange-500' : 'text-gray-400'}
                        />
                        
                        <div className="text-center">
                          <p className="text-lg font-medium text-gray-700">
                            {isDragging ? 'Drop your PDF here' : 'Drag and drop your PDF here'}
                          </p>
                          <p id="upload-help" className="text-sm text-gray-500 mt-1">
                            or click to browse (max 32MB, multi-page supported)
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 flex items-center gap-3">
                          <FilePdf size={32} className="text-red-600 flex-shrink-0" />
                          <div className="flex-grow">
                            <p className="font-medium text-gray-900">{selectedFile.name}</p>
                            <p className="text-sm text-gray-500">
                              {(selectedFile.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <button
                            onClick={clearSelectedFile}
                            disabled={isUploading}
                            className="ml-4 p-1 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Remove file"
                          >
                            <X size={20} className="text-gray-500" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Provider Selection */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                      AI Provider
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedProvider('claude')}
                        disabled={isUploading}
                        className={`p-3 border rounded-lg text-sm font-medium transition-colors ${
                          selectedProvider === 'claude'
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-orange-300'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <div className="font-semibold">Anthropic Claude</div>
                        <div className="text-xs text-gray-500 mt-1">Try this first</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedProvider('gemini')}
                        disabled={isUploading}
                        className={`p-3 border rounded-lg text-sm font-medium transition-colors ${
                          selectedProvider === 'gemini'
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-orange-300'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <div className="font-semibold">Google Gemini</div>
                        <div className="text-xs text-gray-500 mt-1">Better for longer docs</div>
                      </button>
                    </div>
                  </div>

                  <Button
                    onClick={handleUpload}
                    disabled={!selectedFile || isUploading}
                    variant="orange"
                    size="full"
                  >
                    {isUploading ? (
                      <>
                        <CircleNotch className="animate-spin" size={16} />
                        {`Converting with ${selectedProvider === 'claude' ? 'Claude' : 'Gemini'}...`}
                      </>
                    ) : (
                      'Convert and Save Document'
                    )}
                  </Button>

                  {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm space-y-2">
                      <div className="font-medium">Conversion Error</div>
                      {error.includes('could not resolve') || error.includes('canvas') || error.includes('Internal Server Error') ? (
                        <div>
                          <div className="mb-2">
                            <strong>Backend Dependency Issue:</strong> The PDF processing system needs additional native dependencies to be installed.
                          </div>
                          <div className="text-xs bg-red-100 p-2 rounded font-mono">
                            Technical details: {error}
                          </div>
                          <div className="mt-2 text-xs">
                            💡 The drag & drop interface and HTML preview are working correctly. A demo preview will be shown below.
                          </div>
                        </div>
                      ) : (
                        <div>{error}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Results Section */}
          {convertedHtml && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-6 text-gray-900 border-b border-gray-100 pb-2">
                Converted HTML
              </h2>
              
              <div className="space-y-4">
                {/* Raw HTML Display */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Raw HTML Output
                  </label>
                  <textarea
                    value={convertedHtml}
                    readOnly
                    className="w-full h-64 p-3 text-sm font-mono bg-gray-50 border border-gray-200 rounded resize-none"
                  />
                </div>

                {/* Rendered Preview */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Rendered Preview
                  </label>
                  <div className="w-full border border-gray-200 rounded min-h-64 bg-white">
                    <iframe
                      srcDoc={convertedHtml}
                      className="w-full h-96 border-0 rounded"
                      sandbox="allow-same-origin allow-scripts"
                      title="HTML Preview"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Demo Section - Shows preview structure when backend is not working */}
          {(error.includes('conversion failed') || error.includes('could not resolve') || error.includes('canvas') || error.includes('Internal Server Error')) && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-6 text-gray-900 border-b border-gray-100 pb-2">
                HTML Preview Demo (Backend Issue Preventing Actual Conversion)
              </h2>
              
              <div className="space-y-4">
                {/* Raw HTML Display */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Raw HTML Output
                  </label>
                  <textarea
                    value={`<!DOCTYPE html>
<html>
<head>
    <title>Academic Paper Sample</title>
    <style>
        body { font-family: 'Times New Roman', serif; line-height: 1.6; margin: 40px; }
        h1 { font-size: 18px; font-weight: bold; text-align: center; }
        .abstract { margin: 20px 0; font-style: italic; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>Sample Academic Document</h1>
    <div class="abstract">
        <strong>Abstract:</strong> This is a demonstration of how the HTML preview would appear when the PDF conversion is working properly.
    </div>
    <p>This sample shows how Claude 4 would convert academic PDFs to semantic HTML while preserving structure, tables, and formatting.</p>
    <table>
        <tr><th>Method</th><th>Accuracy</th><th>Speed</th></tr>
        <tr><td>Claude 4 Sonnet</td><td>95%</td><td>Fast</td></tr>
        <tr><td>Traditional OCR</td><td>80%</td><td>Slow</td></tr>
    </table>
</body>
</html>`}
                    readOnly
                    className="w-full h-64 p-3 text-sm font-mono bg-gray-50 border border-gray-200 rounded resize-none"
                  />
                </div>

                {/* Rendered Preview */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Rendered Preview
                  </label>
                  <div className="w-full border border-gray-200 rounded min-h-64 bg-white">
                    <iframe
                      srcDoc={`<!DOCTYPE html>
<html>
<head>
    <title>Academic Paper Sample</title>
    <style>
        body { font-family: 'Times New Roman', serif; line-height: 1.6; margin: 40px; }
        h1 { font-size: 18px; font-weight: bold; text-align: center; }
        .abstract { margin: 20px 0; font-style: italic; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>Sample Academic Document</h1>
    <div class="abstract">
        <strong>Abstract:</strong> This is a demonstration of how the HTML preview would appear when the PDF conversion is working properly.
    </div>
    <p>This sample shows how Claude 4 would convert academic PDFs to semantic HTML while preserving structure, tables, and formatting.</p>
    <table>
        <tr><th>Method</th><th>Accuracy</th><th>Speed</th></tr>
        <tr><td>Claude 4 Sonnet</td><td>95%</td><td>Fast</td></tr>
        <tr><td>Traditional OCR</td><td>80%</td><td>Slow</td></tr>
    </table>
</body>
</html>`}
                      className="w-full h-96 border-0 rounded"
                      sandbox="allow-same-origin allow-scripts"
                      title="HTML Preview Demo"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  )
}