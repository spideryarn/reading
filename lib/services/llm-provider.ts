// LLM Provider Factory
// Provides a unified interface for instantiating different LLM providers

import { anthropic as anthropicProvider } from '@ai-sdk/anthropic'
import { google as googleProvider } from '@ai-sdk/google'
import { getModelStringFromEnvironment, getModelConfigFromEnvironment } from '@/lib/config'
import { parseModelString } from '@/lib/config/models'

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
  // OpenAI integration is planned but not yet implemented. Calling this will
  // throw a descriptive error so it's obvious what went wrong.
  openai: () => {
    throw new Error('OpenAI provider integration is not yet implemented')
  },
}

// Get the provider instance based on provider name
export function getProvider(providerName: 'anthropic' | 'google' | 'openai') {
  const providerFactory = providers[providerName]
  if (!providerFactory) {
    throw new Error(`Unknown provider: ${providerName}. Supported providers: ${Object.keys(providers).join(', ')}`)
  }
  
  return providerFactory()
}

// Get a model instance using model string from environment
export function getModel() {
  const modelString = getModelStringFromEnvironment()
  const parsedModel = parseModelString(modelString)
  const providerInstance = getProvider(parsedModel.provider)
  
  // Configure thinking mode for Anthropic models if enabled
  const modelOptions: Record<string, unknown> = {}
  if (parsedModel.provider === 'anthropic' && parsedModel.thinking) {
    modelOptions.thinking = true
  }

  // Some providers (e.g., Anthropic) require the version suffix to be part of the
  // model identifier (e.g., "claude-3-sonnet-20240229"). Our internal model string
  // separates these into `modelName` and `version`, so we concatenate them when
  // calling the provider. For providers that don't need this (or when `version`
  // is "latest"), we pass the model name unchanged.
  let providerModelName = parsedModel.modelName

  if (parsedModel.provider === 'anthropic' && parsedModel.version !== 'latest' && !providerModelName.endsWith(parsedModel.version)) {
    providerModelName = `${providerModelName}-${parsedModel.version}`
  }

  return providerInstance(providerModelName, modelOptions)
}

// Helper to get provider and model configuration together
export function getLLMConfig() {
  const modelString = getModelStringFromEnvironment()
  const parsedModel = parseModelString(modelString)
  const modelConfig = getModelConfigFromEnvironment()
  const providerInstance = getProvider(parsedModel.provider)
  
  return {
    modelString,
    provider: parsedModel.provider,
    modelName: parsedModel.modelName,
    version: parsedModel.version,
    description: modelConfig.description,
    contextWindow: modelConfig.contextWindow,
    outputTokens: modelConfig.outputTokens,
    thinking: parsedModel.thinking,
    providerInstance,
    modelInstance: getModel(),
  }
}