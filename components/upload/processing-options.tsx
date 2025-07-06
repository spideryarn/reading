'use client'

interface ProcessingOptionsProps {
  inputType: 'url' | 'pdf' | 'html' | null
  selectedMethod: 'as-is' | 'readability' | 'ai-transcription' | 'vision-ai'
  selectedProvider: 'claude' | 'gemini' | 'mistral'
  isPublic: boolean
  onMethodChange: (method: 'as-is' | 'readability' | 'ai-transcription' | 'vision-ai') => void
  onProviderChange: (provider: 'claude' | 'gemini' | 'mistral') => void
  onPublicChange: (isPublic: boolean) => void
  availableMethods: ('as-is' | 'readability' | 'ai-transcription' | 'vision-ai')[]
  isProcessing?: boolean
}

export function ProcessingOptions({
  inputType,
  selectedMethod,
  selectedProvider,
  isPublic,
  onMethodChange,
  onProviderChange,
  onPublicChange,
  availableMethods,
  isProcessing = false
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
        return 'AI Transcription (v3 - recommended)'
      case 'vision-ai':
        return 'Gemini + Claude vision pipeline (v2)'
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
        return 'Direct PDF processing with your choice of AI provider - fast and accurate'
      case 'vision-ai':
        return 'Convert PDF to images first, then process each page (slower, higher cost, but extracts actual images and figures)'
      default:
        return ''
    }
  }

  // v3 (ai-transcription) now offers provider selection including Mistral
  // v2 (vision-ai) still uses the fixed multi-model pipeline
  const needsProvider = selectedMethod === 'ai-transcription'

  return (
    <div className={`space-y-6 animate-in fade-in duration-500 ${isProcessing ? 'opacity-70 pointer-events-none' : ''}`}>
      {/* Processing Method Selection */}
      {!isProcessing && (
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
      )}

      {/* AI Provider Selection for v3 pipeline */}
      {!isProcessing && needsProvider && (
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
                  Gemini 2.5 Flash (recommended)
                </div>
                <div className="text-xs sm:text-sm text-gray-500 mt-1">
                  Native PDF processing with bounding box extraction - fast and reliable
                </div>
              </div>
            </label>
            <label className="flex items-start space-x-3 cursor-pointer group hover:bg-gray-50 p-2 rounded-lg transition-colors duration-200">
              <input
                type="radio"
                name="ai-provider"
                value="mistral"
                checked={selectedProvider === 'mistral'}
                onChange={() => onProviderChange('mistral')}
                className="mt-1 h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 transition-all duration-200"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 text-sm sm:text-base">
                  Mistral OCR
                </div>
                <div className="text-xs sm:text-sm text-gray-500 mt-1">
                  Superior text extraction with image bounding boxes - fast and cost-effective
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
            disabled={isProcessing}
            className="mt-1 h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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