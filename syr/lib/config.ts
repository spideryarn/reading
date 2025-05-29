// Central configuration for the application

// LLM Provider types
export type LLMProvider = 'anthropic' | 'google'

// AI model configuration
// Override with LLM_MODEL environment variable for development/testing
// Example: LLM_MODEL=claude-3-haiku-20240307 npm run dev (faster & cheaper for dev)
//
// IMPORTANT: Claude model token limits for max_tokens:
// - Haiku: 8,192 max output tokens
// When setting maxTokens in prompt templates, stay under these limits!
export const AI_CONFIG = {
  DEFAULT_MODEL: process.env.LLM_MODEL || 'claude-sonnet-4-20250514',
  DEFAULT_TEMPERATURE: 0,
  DEFAULT_MAX_TOKENS: 1024,
  // LLM Provider configuration
  PROVIDER: (process.env.LLM_PROVIDER || 'anthropic') as LLMProvider,
} as const

// Model mapping for different providers
// Maps our unified model names to provider-specific model IDs
export const PROVIDER_MODEL_MAPPING = {
  anthropic: {
    'claude-sonnet-4-20250514': 'claude-sonnet-4-20250514',
    'claude-3-haiku-20240307': 'claude-3-haiku-20240307',
    'claude-3-5-sonnet-20241022': 'claude-3-5-sonnet-20241022',
    'claude-3-opus-20240229': 'claude-3-opus-20240229',
  },
  google: {
    'gemini-1.5-flash': 'gemini-1.5-flash',
    'gemini-1.5-pro': 'gemini-1.5-pro',
    'gemini-1.5-pro-latest': 'gemini-1.5-pro-latest',
  },
} as const

// Get the appropriate model for the current provider
export function getModelForProvider(provider: LLMProvider = AI_CONFIG.PROVIDER): string {
  const modelMapping = PROVIDER_MODEL_MAPPING[provider]
  const requestedModel = AI_CONFIG.DEFAULT_MODEL
  
  // Check if the requested model exists for the provider
  if (modelMapping && requestedModel in modelMapping) {
    return modelMapping[requestedModel as keyof typeof modelMapping]
  }
  
  // Fallback to default model for each provider
  const defaults = {
    anthropic: 'claude-3-haiku-20240307',
    google: 'gemini-1.5-flash',
  }
  
  return defaults[provider]
}

// UI configuration
export const UI_CONFIG = {
  FORCE_LIGHT_MODE: true,
} as const