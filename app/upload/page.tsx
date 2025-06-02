'use client'

import { useState } from 'react'
import { AppHeader } from '@/components/app-header'
import { Footer } from '@/components/footer'

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [convertedHtml, setConvertedHtml] = useState<string>('')
  const [error, setError] = useState<string>('')

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

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
          {/* Upload Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-6 text-gray-900 border-b border-gray-100 pb-2">
              Upload PDF Document
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Select PDF File (max 2MB, single-page recommended)
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  disabled={isUploading}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 disabled:opacity-50"
                />
              </div>

              {selectedFile && (
                <div className="bg-gray-50 p-3 rounded border">
                  <div className="text-sm text-gray-700">
                    <strong>Selected:</strong> {selectedFile.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    Size: {(selectedFile.size / 1024).toFixed(1)} KB
                  </div>
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isUploading ? 'Converting...' : 'Convert to HTML'}
              </button>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  {error}
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
                  <div 
                    className="w-full p-4 bg-white border border-gray-200 rounded min-h-64"
                    dangerouslySetInnerHTML={{ __html: convertedHtml }}
                  />
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