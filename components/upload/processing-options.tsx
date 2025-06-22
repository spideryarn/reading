'use client'

interface ProcessingOptionsProps {
  inputType: 'url' | 'pdf' | 'html' | null
  selectedMethod: 'as-is' | 'readability' | 'ai-transcription'
  selectedProvider: 'claude' | 'gemini'
  isPublic: boolean
  onMethodChange: (method: 'as-is' | 'readability' | 'ai-transcription') => void
  onProviderChange: (provider: 'claude' | 'gemini') => void
  onPublicChange: (isPublic: boolean) => void
  availableMethods: ('as-is' | 'readability' | 'ai-transcription')[]
}

export function ProcessingOptions({
  inputType,
  selectedMethod,
  selectedProvider,
  isPublic,
  onMethodChange,
  onProviderChange,
  onPublicChange,
  availableMethods
}: ProcessingOptionsProps) {
  // Don't show options if no input type is detected
  if (!inputType) {
    return null
  }

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'as-is':
        return 'Use As-is'
      case 'readability':
        return 'Mozilla Readability'
      case 'ai-transcription':
        return 'AI Transcription'
      default:
        return method
    }
  }

  const getMethodDescription = (method: string) => {
    switch (method) {
      case 'as-is':
        return 'Use the original HTML without modification'
      case 'readability':
        return 'Extract main content using Mozilla Readability (fast, reliable for articles)'
      case 'ai-transcription':
        return 'Use AI to transcribe and structure the content (high quality, handles complex layouts)'
      default:
        return ''
    }
  }

  const needsProvider = selectedMethod === 'ai-transcription'

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Processing Method Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Processing Method
        </label>
        <div className="space-y-3">
          {availableMethods.map((method) => (
            <label key={method} className="flex items-start space-x-3 cursor-pointer group hover:bg-gray-50 p-2 rounded-lg transition-colors duration-200">
              <input
                type="radio"
                name="processing-method"
                value={method}
                checked={selectedMethod === method}
                onChange={() => onMethodChange(method)}
                className="mt-1 h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 transition-all duration-200"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 text-sm sm:text-base">
                  {getMethodLabel(method)}
                </div>
                <div className="text-xs sm:text-sm text-gray-500 mt-1">
                  {getMethodDescription(method)}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* AI Provider Selection (only show for AI transcription) */}
      {needsProvider && (
        <div className="animate-in slide-in-from-top-2 duration-300">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            AI Provider
          </label>
          <div className="space-y-3">
            <label className="flex items-start space-x-3 cursor-pointer group hover:bg-gray-50 p-2 rounded-lg transition-colors duration-200">
              <input
                type="radio"
                name="ai-provider"
                value="claude"
                checked={selectedProvider === 'claude'}
                onChange={() => onProviderChange('claude')}
                className="mt-1 h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 transition-all duration-200"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 text-sm sm:text-base">
                  Claude Sonnet
                </div>
                <div className="text-xs sm:text-sm text-gray-500 mt-1">
                  Most accurate but slower, better for shorter documents
                </div>
              </div>
            </label>
            <label className="flex items-start space-x-3 cursor-pointer group hover:bg-gray-50 p-2 rounded-lg transition-colors duration-200">
              <input
                type="radio"
                name="ai-provider"
                value="gemini"
                checked={selectedProvider === 'gemini'}
                onChange={() => onProviderChange('gemini')}
                className="mt-1 h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 transition-all duration-200"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 text-sm sm:text-base">
                  Gemini 2.5 Pro (recommended)
                </div>
                <div className="text-xs sm:text-sm text-gray-500 mt-1">
                  Fast processing with excellent quality and large context window
                </div>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Public/Private Toggle */}
      <div>
        <label className="flex items-start space-x-3 cursor-pointer group hover:bg-gray-50 p-2 rounded-lg transition-colors duration-200">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => onPublicChange(e.target.checked)}
            className="mt-1 h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded transition-all duration-200"
          />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 text-sm sm:text-base">
              Make this document public
            </div>
            <div className="text-xs sm:text-sm text-gray-500 mt-1">
              Anyone with the link can view this document
            </div>
          </div>
        </label>
      </div>
    </div>
  )
}