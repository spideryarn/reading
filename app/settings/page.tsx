import { getModelConfigFromEnvironment, getModelStringFromEnvironment } from '@/lib/config'
import { getAvailableModels, parseModelString } from '@/lib/config/models'
import { AppHeader } from '@/components/app-header'
import { Footer } from '@/components/footer'

export default function SettingsPage() {
  const modelString = getModelStringFromEnvironment()
  const modelConfig = getModelConfigFromEnvironment()
  const parsedModel = parseModelString(modelString)
  const availableModels = getAvailableModels()
  
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
                  Model String
                </label>
                <div className="font-mono text-gray-900 bg-gray-50 px-3 py-2 rounded border">
                  {modelString}
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
              {Object.entries(availableModels).map(([provider, models]) => 
                models.map((model) => {
                  const isCurrentModel = model.modelName === parsedModel.modelName && 
                                        model.provider === parsedModel.provider &&
                                        model.version === parsedModel.version &&
                                        model.thinking === parsedModel.thinking
                  
                  return (
                    <div 
                      key={`${model.provider}-${model.modelName}-${model.version}${model.thinking ? '-thinking' : ''}`}
                      className={`border rounded-lg p-4 ${
                        isCurrentModel
                          ? 'border-orange-300 bg-orange-50' 
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-mono text-lg font-medium text-gray-900">
                          {model.modelName}
                          {model.thinking && (
                            <span className="ml-2 text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded">
                              Thinking
                            </span>
                          )}
                          {isCurrentModel && (
                            <span className="ml-2 text-sm font-normal text-orange-600 bg-orange-100 px-2 py-1 rounded">
                              Current
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 capitalize">
                          {model.provider}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        {model.description}
                      </div>
                      <div className="flex gap-4 text-xs text-gray-500">
                        <span>Context: {model.contextWindow.toLocaleString()}</span>
                        <span>Version: {model.version}</span>
                        {model.pricing && (
                          <span>
                            Input: ${model.pricing.inputPer1M}/1M tokens
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              ).flat()}
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  )
}