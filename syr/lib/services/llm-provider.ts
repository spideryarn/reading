// LLM Provider Factory
// Provides a unified interface for instantiating different LLM providers

import { anthropic as anthropicProvider } from '@ai-sdk/anthropic'
import { google as googleProvider } from '@ai-sdk/google'
import { AI_CONFIG, getModelConfig, getProviderFromKey, type ProviderTierKey } from '@/lib/config'

// Provider initialization with API key configuration
const providers = {
  anthropic: () => {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required for Anthropic provider')
    }
    return anthropicProvider
  },
  google: () => {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) {
      throw new Error('GOOGLE_GENERATIVE_AI_API_KEY environment variable is required for Google provider')
    }
    return googleProvider
  },
}

// Get the provider instance based on provider name
export function getProvider(providerName: 'anthropic' | 'google') {
  const providerFactory = providers[providerName]
  if (!providerFactory) {
    throw new Error(`Unknown provider: ${providerName}. Supported providers: ${Object.keys(providers).join(', ')}`)
  }
  
  return providerFactory()
}

// Get a model instance using provider-tier key
export function getModel(providerTierKey: ProviderTierKey = AI_CONFIG.DEFAULT_MODEL) {
  const modelConfig = getModelConfig(providerTierKey)
  const providerInstance = getProvider(modelConfig.provider)
  
  // Configure thinking mode for Anthropic models if enabled
  const modelOptions: Record<string, unknown> = {}
  if (modelConfig.provider === 'anthropic' && modelConfig.thinking) {
    modelOptions.thinking = true
  }
  
  return providerInstance(modelConfig.modelId, modelOptions)
}

// Helper to get provider and model configuration together
export function getLLMConfig(providerTierKey: ProviderTierKey = AI_CONFIG.DEFAULT_MODEL) {
  const modelConfig = getModelConfig(providerTierKey)
  const providerInstance = getProvider(modelConfig.provider)
  
  return {
    providerTierKey,
    provider: modelConfig.provider,
    modelId: modelConfig.modelId,
    description: modelConfig.description,
    contextWindow: modelConfig.contextWindow,
    outputTokens: modelConfig.outputTokens,
    thinking: modelConfig.thinking,
    providerInstance,
    modelInstance: getModel(providerTierKey),
  }
}