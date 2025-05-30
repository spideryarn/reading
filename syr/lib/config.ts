// Central configuration for the application

// Provider-tier model keys for easy configuration
// Format: {provider}-{tier} where tier is cheap/balanced/expensive
export type ProviderTierKey = 
  | 'anthropic-cheap' 
  | 'anthropic-balanced' 
  | 'anthropic-expensive'
  | 'google-cheap' 
  | 'google-balanced' 
  | 'google-expensive'

// AI model configuration
// Override with LLM_MODEL environment variable using provider-tier keys
// Example: LLM_MODEL=google-cheap npm run dev (fast & cheap for development)
// Example: LLM_MODEL=anthropic-balanced npm run build (balanced for production)
//
// IMPORTANT: Claude model token limits for max_tokens:
// - Haiku: 8,192 max output tokens
// When setting maxTokens in prompt templates, stay under these limits!
export const AI_CONFIG = {
  DEFAULT_MODEL: (process.env.LLM_MODEL || 'google-cheap') as ProviderTierKey,
  DEFAULT_TEMPERATURE: 0,
  DEFAULT_MAX_TOKENS: parseInt(process.env.DEFAULT_MAX_TOKENS || '4096', 10),
} as const

// Provider-tier model mapping
// Maps provider-tier keys to actual model IDs and extracts provider info
export const PROVIDER_TIER_MODELS = {
  // Anthropic models
  'anthropic-cheap': {
    provider: 'anthropic' as const,
    modelId: 'claude-3-5-haiku-20241022',
    description: 'Claude 3.5 Haiku - Fast and cost-effective',
    contextWindow: 200000,
    outputTokens: 8192,
  },
  'anthropic-balanced': {
    provider: 'anthropic' as const,
    modelId: 'claude-sonnet-4-20250514',
    description: 'Claude Sonnet 4 - Balanced performance and cost',
    contextWindow: 200000,
    outputTokens: 8192,
  },
  'anthropic-expensive': {
    provider: 'anthropic' as const,
    modelId: 'claude-opus-4-20250514',
    description: 'Claude Opus 4 - Highest capability',
    contextWindow: 200000,
    outputTokens: 8192,
  },
  // Google models (Gemini 2.5)
  'google-cheap': {
    provider: 'google' as const,
    modelId: 'gemini-2.0-flash',
    description: 'Gemini 2.0 Flash - Fast and cost-effective (stable)',
    contextWindow: 1000000,
    outputTokens: 8192,
  },
  'google-balanced': {
    provider: 'google' as const,
    modelId: 'gemini-2.5-pro',
    description: 'Gemini 2.5 Pro - Balanced performance',
    contextWindow: 1000000,
    outputTokens: 8192,
  },
  'google-expensive': {
    provider: 'google' as const,
    modelId: 'gemini-2.5-pro',
    description: 'Gemini 2.5 Pro - Same as balanced tier',
    contextWindow: 1000000,
    outputTokens: 8192,
  },
} as const

// Extract provider from provider-tier key
export function getProviderFromKey(key: ProviderTierKey): 'anthropic' | 'google' {
  return PROVIDER_TIER_MODELS[key].provider
}

// Get model configuration for a provider-tier key
export function getModelConfig(key: ProviderTierKey = AI_CONFIG.DEFAULT_MODEL) {
  const config = PROVIDER_TIER_MODELS[key]
  if (!config) {
    throw new Error(`Unknown provider-tier key: ${key}. Available: ${Object.keys(PROVIDER_TIER_MODELS).join(', ')}`)
  }
  return config
}

// UI configuration
export const UI_CONFIG = {
  FORCE_LIGHT_MODE: true,
} as const

// Visibility tracking configuration for Table of Contents
export const VISIBILITY_CONFIG = {
  UPDATE_INTERVAL: 100,    // ms - How often to batch visibility updates
  DEBOUNCE_DELAY: 150,     // ms - Debounce delay for processing visibility changes (increased to reduce flickering)
  ROOT_MARGIN: '0px',      // For precise viewport detection
  THRESHOLD: 0.01,         // Minimum visible ratio to count as visible (1%)
} as const