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

interface ExtendedProcessingOptionsProps extends ProcessingOptionsProps {
  extractionMethod?: 'auto' | 'direct' | 'napi' | 'wasm' | 'legacy'
  onExtractionMethodChange?: (method: 'auto' | 'direct' | 'napi' | 'wasm' | 'legacy') => void
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
  isProcessing = false,
  extractionMethod = 'legacy',
  onExtractionMethodChange
}: ExtendedProcessingOptionsProps) {
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
                  Gemini 2.5 Flash
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
                  Mistral OCR (recommended)
                </div>
                <div className="text-xs sm:text-sm text-gray-500 mt-1">
                  Superior text extraction with image bounding boxes - fast and cost-effective
                </div>
              </div>
            </label>
          </div>
        </div>
      )}
      
      {/* PDF Image Extraction Method - Only show for Mistral + PDF */}
      {!isProcessing && needsProvider && selectedProvider === 'mistral' && inputType === 'pdf' && onExtractionMethodChange && (
        <div className="animate-in slide-in-from-top-2 duration-300">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Image Extraction Method (Testing)
          </label>
          <div className="space-y-3">
            <label className="flex items-start space-x-3 cursor-pointer group hover:bg-gray-50 p-2 rounded-lg transition-colors duration-200">
              <input
                type="radio"
                name="extraction-method"
                value="auto"
                checked={extractionMethod === 'auto'}
                onChange={() => onExtractionMethodChange('auto')}
                className="mt-1 h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 transition-all duration-200"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 text-sm sm:text-base">
                  Auto (Hybrid)
                </div>
                <div className="text-xs sm:text-sm text-gray-500 mt-1">
                  Tries direct extraction first, falls back to WASM rendering if needed
                </div>
              </div>
            </label>
            <label className="flex items-start space-x-3 cursor-pointer group hover:bg-gray-50 p-2 rounded-lg transition-colors duration-200">
              <input
                type="radio"
                name="extraction-method"
                value="direct"
                checked={extractionMethod === 'direct'}
                onChange={() => onExtractionMethodChange('direct')}
                className="mt-1 h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 transition-all duration-200"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 text-sm sm:text-base">
                  Direct Only
                </div>
                <div className="text-xs sm:text-sm text-gray-500 mt-1">
                  Extract embedded images without rendering (fastest, ~40-60% of PDFs)
                </div>
              </div>
            </label>
            <label className="flex items-start space-x-3 cursor-pointer group hover:bg-gray-50 p-2 rounded-lg transition-colors duration-200">
              <input
                type="radio"
                name="extraction-method"
                value="napi"
                checked={extractionMethod === 'napi'}
                onChange={() => onExtractionMethodChange('napi')}
                className="mt-1 h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 transition-all duration-200"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 text-sm sm:text-base">
                  WASM Canvas
                </div>
                <div className="text-xs sm:text-sm text-gray-500 mt-1">
                  Use @napi-rs/canvas WASM renderer (Vercel-compatible)
                </div>
              </div>
            </label>
            <label className="flex items-start space-x-3 cursor-pointer group hover:bg-gray-50 p-2 rounded-lg transition-colors duration-200">
              <input
                type="radio"
                name="extraction-method"
                value="wasm"
                checked={extractionMethod === 'wasm'}
                onChange={() => onExtractionMethodChange('wasm')}
                className="mt-1 h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 transition-all duration-200"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 text-sm sm:text-base">
                  Pure WASM
                </div>
                <div className="text-xs sm:text-sm text-gray-500 mt-1">
                  Universal fallback using unpdf + ImageScript
                </div>
              </div>
            </label>
            <label className="flex items-start space-x-3 cursor-pointer group hover:bg-gray-50 p-2 rounded-lg transition-colors duration-200">
              <input
                type="radio"
                name="extraction-method"
                value="legacy"
                checked={extractionMethod === 'legacy'}
                onChange={() => onExtractionMethodChange('legacy')}
                className="mt-1 h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 transition-all duration-200"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 text-sm sm:text-base">
                  Legacy (skia-canvas)
                </div>
                <div className="text-xs sm:text-sm text-gray-500 mt-1">
                  Current implementation - causes NODE_MODULE_VERSION errors on Vercel
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