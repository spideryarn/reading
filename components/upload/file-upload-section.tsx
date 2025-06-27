'use client'

import { useRef } from 'react'
import { Upload, FilePdf, FileHtml, X } from '@phosphor-icons/react'
import { UPLOAD_LIMITS, formatUploadLimitMessage } from '@/lib/config/upload-limits'

interface FileUploadSectionProps {
  file: File | null
  onChange: (file: File | null) => void
  onDrop: (file: File) => void
  onValidationError: (error: string) => void
  isDisabled: boolean
  isProcessing: boolean
  isDragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
  error?: string
}

export function FileUploadSection({
  file,
  onChange,
  onDrop,
  onValidationError,
  isDisabled,
  isProcessing,
  isDragging,
  onDragStart,
  onDragEnd,
  error
}: FileUploadSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  // File validation helper
  const validateFileType = (file: File): boolean => {
    const allowedTypes = ['application/pdf', 'text/html']
    const allowedExtensions = ['.pdf', '.html', '.htm']
    
    // Check file size based on file type
    let maxSize: number
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      maxSize = UPLOAD_LIMITS.PDF_MAX_SIZE_BYTES
    } else if (file.type === 'text/html' || file.name.toLowerCase().endsWith('.html') || file.name.toLowerCase().endsWith('.htm')) {
      maxSize = UPLOAD_LIMITS.HTML_FILE_UPLOAD_MAX_SIZE_BYTES
    } else {
      maxSize = UPLOAD_LIMITS.GENERAL_MAX_SIZE_BYTES
    }
    
    // Check file size
    if (file.size > maxSize) {
      onValidationError(`File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds the ${formatUploadLimitMessage(maxSize)} limit`)
      return false
    }
    
    const isValidType = allowedTypes.includes(file.type)
    const isValidExtension = allowedExtensions.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    )
    
    if (!isValidType && !isValidExtension) {
      onValidationError(`Unsupported file type: ${file.name}. Please select a PDF or HTML file.`)
      return false
    }
    
    return true
  }

  // Handle drag and drop events
  const handleDragOver = (e: React.DragEvent) => {
    if (isDisabled) return
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragEnter = (e: React.DragEvent) => {
    if (isDisabled) return
    e.preventDefault()
    e.stopPropagation()
    onDragStart()
  }

  const handleDragLeave = (e: React.DragEvent) => {
    if (isDisabled) return
    e.preventDefault()
    e.stopPropagation()
    // Only end drag if we're leaving the container
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      onDragEnd()
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    if (isDisabled) return
    e.preventDefault()
    e.stopPropagation()
    onDragEnd()

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      const file = files[0]
      if (validateFileType(file)) {
        onDrop(file)
      }
    }
  }

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const file = files[0]
      if (validateFileType(file)) {
        onChange(file)
      }
    }
  }

  // Handle click to trigger file dialog
  const handleClick = () => {
    if (!isDisabled && !isProcessing) {
      fileInputRef.current?.click()
    }
  }

  // Clear selected file
  const handleClear = () => {
    onChange(null)
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Get file type for display
  const getFileType = (): 'pdf' | 'html' | null => {
    if (!file) return null
    if (file.type === 'application/pdf') return 'pdf'
    if (file.type === 'text/html' || file.name.toLowerCase().endsWith('.html') || file.name.toLowerCase().endsWith('.htm')) {
      return 'html'
    }
    return null
  }

  // Get appropriate icon based on file type
  const getFileIcon = () => {
    const fileType = getFileType()
    switch (fileType) {
      case 'pdf':
        return <FilePdf size={20} className="text-red-500" />
      case 'html':
        return <FileHtml size={20} className="text-green-500" />
      default:
        return <Upload size={20} className={isDisabled ? 'text-gray-400' : 'text-gray-500'} />
    }
  }

  return (
    <div className={`transition-all duration-300 ${
      isDisabled 
        ? 'opacity-60 pointer-events-none' 
        : 'opacity-100'
    }`}>
      {/* Section Header */}
      <div className="flex items-center space-x-2 mb-3">
        <Upload size={20} className={`${isDisabled ? 'text-gray-400' : 'text-orange-500'}`} />
        <h3 className={`font-medium ${isDisabled ? 'text-gray-400' : 'text-gray-900'}`}>
          Upload File
        </h3>
      </div>

      {/* File Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg transition-all duration-300 ${
          isDisabled
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
            : isDragging
            ? 'border-orange-400 bg-orange-50 scale-[1.02] shadow-lg'
            : error
            ? 'border-red-300 bg-red-50'
            : file
            ? 'border-green-300 bg-green-50 shadow-sm'
            : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100 cursor-pointer'
        }`}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <div className="p-6 sm:p-8">
          {/* File Display when file is selected */}
          {file && (
            <div className="flex items-center justify-between animate-in fade-in duration-300">
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <div className="transition-all duration-200">{getFileIcon()}</div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 truncate">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB • {getFileType()?.toUpperCase()}
                  </p>
                </div>
              </div>
              {!isDisabled && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleClear()
                  }}
                  className="p-1 rounded-full hover:bg-gray-200 transition-all duration-200 hover:scale-110"
                  disabled={isProcessing}
                  type="button"
                >
                  <X size={16} className="text-gray-500" />
                </button>
              )}
            </div>
          )}

          {/* Upload Prompt when no file is selected */}
          {!file && (
            <div className="text-center animate-in fade-in duration-300">
              <div className="mb-4">
                {getFileIcon()}
              </div>
              <div className="space-y-2">
                <p className={`text-sm font-medium ${isDisabled ? 'text-gray-400' : 'text-gray-900'}`}>
                  {isDragging 
                    ? 'Drop your file here'
                    : 'Drag PDF or HTML files here'
                  }
                </p>
                <p className={`text-xs ${isDisabled ? 'text-gray-400' : 'text-gray-500'}`}>
                  or click to browse files
                </p>
                <p className={`text-xs ${isDisabled ? 'text-gray-400' : 'text-gray-500'}`}>
                  Maximum file size: PDF {formatUploadLimitMessage(UPLOAD_LIMITS.PDF_MAX_SIZE_BYTES)}, HTML {formatUploadLimitMessage(UPLOAD_LIMITS.HTML_FILE_UPLOAD_MAX_SIZE_BYTES)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.html,.htm"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={isDisabled || isProcessing}
        />
      </div>

      {/* Helper Text */}
      {!isDisabled && !error && !file && (
        <p className="text-xs text-gray-500 mt-2">
          Supported formats: PDF, HTML. Files are processed securely and stored safely.
        </p>
      )}

      {/* Error Message */}
      {error && (
        <p className="text-sm text-red-600 mt-2">{error}</p>
      )}
    </div>
  )
}