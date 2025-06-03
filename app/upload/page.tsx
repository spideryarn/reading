'use client'

import { useState, useRef, useEffect } from 'react'
import { AppHeader } from '@/components/app-header'
import { Footer } from '@/components/footer'
import { Upload, FilePdf, X, Check, Warning } from '@phosphor-icons/react'

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [convertedHtml, setConvertedHtml] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Quality test state
  const [qualityTestLoading, setQualityTestLoading] = useState(true)
  const [qualityTestResult, setQualityTestResult] = useState<{
    success: boolean;
    image?: string;
    error?: string;
    config?: string;
  } | null>(null)

  // Load quality test on component mount
  useEffect(() => {
    const runQualityTest = async () => {
      try {
        const response = await fetch('/api/test-pdf-converter')
        const result = await response.json()
        
        if (result.pdfToPngConverter?.success && result.pdfToPngConverter.images?.[0]) {
          setQualityTestResult({
            success: true,
            image: result.pdfToPngConverter.images[0],
            config: result.pdfToPngConverter.config || 'default'
          })
        } else {
          setQualityTestResult({
            success: false,
            error: result.pdfToPngConverter?.error || 'Unknown test failure'
          })
        }
      } catch (error) {
        setQualityTestResult({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to run quality test'
        })
      } finally {
        setQualityTestLoading(false)
      }
    }
    
    runQualityTest()
  }, [])

  const handleFile = (file: File) => {
    // Reset previous results
    setError('')
    setConvertedHtml('')

    // Validate file type
    if (file.type !== 'application/pdf') {
      setError('Please select a PDF file')
      return
    }

    // Validate file size (2MB limit for single-page PDFs)
    const maxSize = 2 * 1024 * 1024 // 2MB
    if (file.size > maxSize) {
      setError('PDF file too large (max 2MB for single-page PDFs)')
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

      const response = await fetch('/api/upload-pdf', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(errorData || 'Upload failed')
      }

      const html = await response.text()
      setConvertedHtml(html)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error occurred')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="min-h-screen">
      <AppHeader title="PDF to HTML Converter" backLink="/documents" backText="Documents" />
      
      <main className="max-w-4xl mx-auto px-8 py-8">
        <div className="space-y-8">
          {/* PDF Conversion Quality Test */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-blue-900 flex items-center gap-2">
              <Warning size={24} className="text-blue-600" />
              PDF Conversion Quality Test
            </h2>
            
            <p className="text-sm text-blue-800 mb-4">
              Testing <strong>pdf-to-png-converter</strong> (serverless-compatible) vs current GraphicsMagick dependency.
              This test auto-converts <code>static/examples/2105.10461v2_cropped.pdf</code> for visual quality assessment.
            </p>
            
            {qualityTestLoading ? (
              <div className="flex items-center gap-2 text-blue-700">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                Running quality test...
              </div>
            ) : qualityTestResult?.success ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-700">
                  <Check size={20} />
                  <span className="font-medium">Test conversion successful</span>
                </div>
                
                <div className="bg-white border border-blue-200 rounded p-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Converted academic PDF using pdf-to-png-converter ({qualityTestResult.config || 'default config'}):
                  </p>
                  <img 
                    src={`data:image/png;base64,${qualityTestResult.image}`}
                    alt="Test PDF conversion result"
                    className="max-w-full h-auto border border-gray-300 rounded shadow-sm"
                    style={{ maxHeight: '400px' }}
                  />
                </div>
                
                <div className="text-sm text-blue-800 bg-blue-100 p-3 rounded">
                  <strong>Quality Assessment:</strong> Please manually inspect the image above for:
                  <ul className="mt-1 ml-4 list-disc">
                    <li>Text clarity and readability</li>
                    <li>Table structure preservation</li>
                    <li>Mathematical equations rendering</li>
                    <li>Overall academic content quality</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-red-700">
                  <X size={20} />
                  <span className="font-medium">Test conversion failed</span>
                </div>
                <div className="text-sm text-red-700 bg-red-100 p-3 rounded">
                  <strong>Error:</strong> {qualityTestResult?.error}
                </div>
              </div>
            )}
          </div>
          
          <hr className="border-gray-300" />
          {/* Upload Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-6 text-gray-900 border-b border-gray-100 pb-2">
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
                        or click to browse (max 2MB, single-page recommended)
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

              <button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="w-full px-4 py-3 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {isUploading ? 'Converting...' : 'Convert to HTML'}
              </button>

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