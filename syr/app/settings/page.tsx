import { PROVIDER_TIER_MODELS, getModelConfig } from '@/lib/config'
import { AppHeader } from '@/components/app-header'
import { Footer } from '@/components/footer'

export default function SettingsPage() {
  const modelConfig = getModelConfig()
  
  return (
    <div className="min-h-screen">
      <AppHeader title="Settings" backLink="/documents" backText="Documents" />
      
      <main className="max-w-4xl mx-auto px-8 py-8">
        <div className="space-y-8">
          {/* Current AI Model */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-6 text-gray-900 border-b border-gray-100 pb-2">
              Current AI Model
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Provider
                </label>
                <div className="text-gray-900 bg-gray-50 px-3 py-2 rounded border capitalize">
                  {modelConfig.provider}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Model ID
                </label>
                <div className="font-mono text-gray-900 bg-gray-50 px-3 py-2 rounded border">
                  {modelConfig.modelId}
                </div>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Description
                </label>
                <div className="text-gray-900 bg-gray-50 px-3 py-2 rounded border">
                  {modelConfig.description}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Context Window
                </label>
                <div className="font-mono text-gray-900 bg-gray-50 px-3 py-2 rounded border">
                  {modelConfig.contextWindow.toLocaleString()} tokens
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Temperature
                </label>
                <div className="font-mono text-gray-900 bg-gray-50 px-3 py-2 rounded border">
                  0 (deterministic)
                </div>
              </div>
            </div>
          </div>

          {/* Available Models */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-6 text-gray-900 border-b border-gray-100 pb-2">
              Available Models
            </h2>
            <div className="space-y-4">
              {Object.entries(PROVIDER_TIER_MODELS).map(([key, config]) => (
                <div 
                  key={key}
                  className={`border rounded-lg p-4 ${
                    config.modelId === modelConfig.modelId
                      ? 'border-orange-300 bg-orange-50' 
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-mono text-lg font-medium text-gray-900">
                      {config.modelId}
                      {config.modelId === modelConfig.modelId && (
                        <span className="ml-2 text-sm font-normal text-orange-600 bg-orange-100 px-2 py-1 rounded">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 capitalize">
                      {config.provider}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {config.description}
                  </div>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>Context: {config.contextWindow.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  )
}