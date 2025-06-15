'use client'

import { useRef } from 'react'
import { Upload, FilePdf, FileHtml, Link as LinkIcon, X } from '@phosphor-icons/react'

interface SmartInputProps {
  value: {
    url: string
    file: File | null
    type: 'url' | 'pdf' | 'html' | null
  }
  onUrlChange: (url: string) => void
  onFileChange: (file: File | null) => void
  onFileDrop: (file: File) => void
  onValidationError: (error: string) => void
  placeholder: string
  error: string
  isProcessing: boolean
  isDragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
}

export function SmartInput({
  value,
  onUrlChange,
  onFileChange,
  onFileDrop,
  onValidationError,
  placeholder,
  error,
  isProcessing,
  isDragging,
  onDragStart,
  onDragEnd
}: SmartInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle drag and drop events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onDragStart()
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only end drag if we're leaving the smart input container
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      onDragEnd()
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onDragEnd()

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      const file = files[0]
      // Validate file type before dropping
      if (validateFileType(file)) {
        onFileDrop(file)
      }
    }
  }

  // File validation helper
  const validateFileType = (file: File): boolean => {
    const allowedTypes = ['application/pdf', 'text/html']
    const allowedExtensions = ['.pdf', '.html', '.htm']
    const maxSize = 50 * 1024 * 1024 // 50MB limit
    
    // Check file size
    if (file.size > maxSize) {
      onValidationError(`File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds the 50MB limit`)
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

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const file = files[0]
      if (validateFileType(file)) {
        onFileChange(file)
      }
    }
  }

  // Handle click to trigger file dialog
  const handleClick = () => {
    if (!value.url.trim() && !value.file) {
      fileInputRef.current?.click()
    }
  }

  // Handle Enter key for URL submission
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value.url.trim()) {
      e.preventDefault()
      // Parent component should handle submission
    }
  }

  // Clear current input
  const handleClear = () => {
    if (value.file) {
      onFileChange(null)
    } else {
      onUrlChange('')
    }
  }

  // Get appropriate icon based on input type
  const getInputIcon = () => {
    switch (value.type) {
      case 'url':
        return <LinkIcon size={20} className="text-blue-500" />
      case 'pdf':
        return <FilePdf size={20} className="text-red-500" />
      case 'html':
        return <FileHtml size={20} className="text-green-500" />
      default:
        return <Upload size={20} className="text-gray-400" />
    }
  }

  return (
    <div className="space-y-2">
      {/* Smart Input Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg transition-all duration-300 ease-in-out ${
          isDragging
            ? 'border-orange-400 bg-orange-50 scale-[1.02] shadow-lg'
            : error
            ? 'border-red-300 bg-red-50'
            : value.type
            ? 'border-green-300 bg-green-50 shadow-sm'
            : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
        } ${!value.url && !value.file ? 'cursor-pointer' : ''}`}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <div className="p-4 sm:p-6">
          {/* File display when file is selected */}
          {value.file && (
            <div className="flex items-center justify-between animate-in fade-in duration-300">
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <div className="transition-all duration-200">{getInputIcon()}</div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 truncate">{value.file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(value.file.size / 1024 / 1024).toFixed(2)} MB • {value.type?.toUpperCase()}
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleClear()
                }}
                className="p-1 rounded-full hover:bg-gray-200 transition-all duration-200 hover:scale-110"
                disabled={isProcessing}
              >
                <X size={16} className="text-gray-500" />
              </button>
            </div>
          )}

          {/* URL input when no file is selected */}
          {!value.file && (
            <div className="flex items-center space-x-3 animate-in fade-in duration-300">
              <div className="transition-all duration-200">{getInputIcon()}</div>
              <div className="flex-1 min-w-0">
                <input
                  type="url"
                  value={value.url}
                  onChange={(e) => onUrlChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  className="w-full bg-transparent border-none outline-none text-gray-900 placeholder-gray-500 text-sm sm:text-base transition-colors duration-200 focus:placeholder-gray-400"
                  disabled={isProcessing}
                />
              </div>
              {value.url && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleClear()
                  }}
                  className="p-1 rounded-full hover:bg-gray-200 transition-all duration-200 hover:scale-110"
                  disabled={isProcessing}
                >
                  <X size={16} className="text-gray-500" />
                </button>
              )}
            </div>
          )}

          {/* Helper text */}
          {!value.url && !value.file && !isDragging && (
            <p className="text-center text-xs sm:text-sm text-gray-500 mt-4">
              Enter a URL above or drag and drop PDF/HTML files here
            </p>
          )}

          {isDragging && (
            <p className="text-center text-xs sm:text-sm text-orange-600 mt-4">
              Drop your file here
            </p>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.html,.htm"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={isProcessing}
        />
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}