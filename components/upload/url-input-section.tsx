'use client'

import { Link as LinkIcon, X } from '@phosphor-icons/react'

interface UrlInputSectionProps {
  value: string
  onChange: (url: string) => void
  onSubmit?: () => void
  isActive: boolean
  isDisabled: boolean
  isProcessing: boolean
  error?: string
}

export function UrlInputSection({
  value,
  onChange,
  onSubmit,
  isActive,
  isDisabled,
  isProcessing,
  error
}: UrlInputSectionProps) {
  
  // Handle Enter key for URL submission
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value.trim() && onSubmit) {
      e.preventDefault()
      onSubmit()
    }
  }

  // Clear URL input
  const handleClear = () => {
    onChange('')
  }

  // Check if URL has valid format (basic validation)
  const isValidUrl = (urlString: string): boolean => {
    if (!urlString || urlString.trim().length === 0) return false
    
    try {
      const url = new URL(urlString.trim())
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
      return false
    }
  }

  const hasValidUrl = value.trim() && isValidUrl(value)

  return (
    <div className={`transition-all duration-300 ${
      isDisabled 
        ? 'opacity-60 pointer-events-none' 
        : 'opacity-100'
    }`}>
      {/* Section Header */}
      <div className="flex items-center space-x-2 mb-3">
        <LinkIcon size={20} className={`${isDisabled ? 'text-gray-400' : 'text-blue-500'}`} />
        <h3 className={`font-medium ${isDisabled ? 'text-gray-400' : 'text-gray-900'}`}>
          Add from URL
        </h3>
      </div>

      {/* URL Input Field */}
      <div className={`relative ${isDisabled ? 'cursor-not-allowed' : ''}`}>
        <div className={`border rounded-lg transition-all duration-200 ${
          error
            ? 'border-red-300 bg-red-50'
            : hasValidUrl
            ? 'border-green-300 bg-green-50'
            : isActive && !isDisabled
            ? 'border-gray-300 bg-white hover:border-gray-400 focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100'
            : 'border-gray-200 bg-gray-50'
        }`}>
          <div className="flex items-center px-4 py-3">
            <input
              type="url"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter URL (e.g., https://example.com)"
              className={`flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-500 ${
                isDisabled ? 'cursor-not-allowed' : ''
              }`}
              disabled={isDisabled || isProcessing}
            />
            {value && !isDisabled && (
              <button
                onClick={handleClear}
                className="p-1 rounded-full hover:bg-gray-200 transition-all duration-200 hover:scale-110 ml-2"
                disabled={isProcessing}
                type="button"
              >
                <X size={16} className="text-gray-500" />
              </button>
            )}
          </div>
        </div>

        {/* Helper Text */}
        {!isDisabled && !error && (
          <p className="text-xs text-gray-500 mt-2">
            Supports web pages and direct PDF links. Auto-detects content type.
          </p>
        )}

        {/* Error Message */}
        {error && (
          <p className="text-sm text-red-600 mt-2">{error}</p>
        )}
      </div>
    </div>
  )
}