// LLM Provider Factory
// Provides a unified interface for instantiating different LLM providers

import { anthropic as anthropicProvider } from '@ai-sdk/anthropic'
import { google as googleProvider } from '@ai-sdk/google'
import { AI_CONFIG, getModelForProvider, type LLMProvider } from '@/lib/config'

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

// Get the provider instance based on configuration
export function getProvider(providerName: LLMProvider = AI_CONFIG.PROVIDER) {
  const providerFactory = providers[providerName]
  if (!providerFactory) {
    throw new Error(`Unknown provider: ${providerName}. Supported providers: ${Object.keys(providers).join(', ')}`)
  }
  
  return providerFactory()
}

// Get a model instance for the current provider
export function getModel(modelName?: string, provider: LLMProvider = AI_CONFIG.PROVIDER) {
  const providerInstance = getProvider(provider)
  const model = modelName || getModelForProvider(provider)
  
  return providerInstance(model)
}

// Helper to get provider and model together
export function getLLMConfig() {
  const provider = AI_CONFIG.PROVIDER
  const model = getModelForProvider(provider)
  
  return {
    provider,
    model,
    providerInstance: getProvider(provider),
    modelInstance: getModel(model, provider),
  }
}