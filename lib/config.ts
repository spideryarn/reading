// Central configuration for the application

import { 
  MODEL_TIERS, 
  getModelStringFromTier, 
  getModelConfig as getModelConfigByString,
  parseModelString,
  DEFAULT_MODEL_STRING,
  type ModelTierKey 
} from './config/models'

// Provider-tier model keys for easy configuration
// Format: {provider}-{tier} where tier is cheap/balanced/expensive
// Special variant: anthropic-balanced-thinking for Sonnet 4 with thinking mode
// DEPRECATED: Use explicit model strings instead (provider:model:version[:thinking])
export type ProviderTierKey = 
  | 'anthropic-cheap' 
  | 'anthropic-balanced' 
  | 'anthropic-balanced-thinking'
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
  DEFAULT_MODEL: (process.env.LLM_MODEL || 'anthropic-balanced') as ProviderTierKey,
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
    thinking: false,
  },
  'anthropic-balanced': {
    provider: 'anthropic' as const,
    modelId: 'claude-sonnet-4-20250514',
    description: 'Claude Sonnet 4 - Balanced performance and cost',
    contextWindow: 200000,
    outputTokens: 8192,
    thinking: false,
  },
  'anthropic-balanced-thinking': {
    provider: 'anthropic' as const,
    modelId: 'claude-sonnet-4-20250514',
    description: 'Claude Sonnet 4 with Thinking Mode - Advanced reasoning',
    contextWindow: 200000,
    outputTokens: 8192,
    thinking: true,
  },
  'anthropic-expensive': {
    provider: 'anthropic' as const,
    modelId: 'claude-opus-4-20250514',
    description: 'Claude Opus 4 - Highest capability',
    contextWindow: 200000,
    outputTokens: 8192,
    thinking: false,
  },
  // Google models (Gemini)
  'google-cheap': {
    provider: 'google' as const,
    modelId: 'gemini-2.0-flash',
    description: 'Gemini 2.0 Flash - Fast and cost-effective (stable)',
    contextWindow: 1000000,
    outputTokens: 8192,
    thinking: false,
  },
  'google-balanced': {
    provider: 'google' as const,
    modelId: 'gemini-1.5-pro',
    description: 'Gemini 1.5 Pro - Latest available model, balanced performance',
    contextWindow: 1000000,
    outputTokens: 8192,
    thinking: false,
  },
  'google-expensive': {
    provider: 'google' as const,
    modelId: 'gemini-2.5-pro',
    description: 'Gemini 2.5 Pro - Same as balanced tier',
    contextWindow: 1000000,
    outputTokens: 8192,
    thinking: false,
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

// Get model version from provider-tier key for database lookup
// Extracts version from model ID and appends -thinking if thinking mode is enabled
// DEPRECATED: Use getModelStringFromEnvironment() instead
export function getModelVersion(key: ProviderTierKey = AI_CONFIG.DEFAULT_MODEL): string {
  const config = getModelConfig(key)
  
  // Google models use 'latest' as version in the database
  if (config.provider === 'google') {
    return 'latest'
  }
  
  // Extract version from model ID for Anthropic models
  // Format: model-name-version -> version
  const parts = config.modelId.split('-')
  const version = parts[parts.length - 1] // Last part is version
  
  // Append -thinking if thinking mode is enabled
  return config.thinking ? `${version}-thinking` : version
}

// NEW MODEL STRING SYSTEM
// Get model string from environment variable or default
// Supports both tier keys (anthropic-cheap) and direct model strings (anthropic:claude-3-5-haiku:20241022)
export function getModelStringFromEnvironment(): string {
  const envModel = process.env.LLM_MODEL || 'anthropic-balanced'
  
  // Check if it's a tier key first
  if (envModel in MODEL_TIERS) {
    return getModelStringFromTier(envModel as ModelTierKey)
  }
  
  // Check if it's already a model string
  try {
    parseModelString(envModel)
    return envModel
  } catch {
    // If parsing fails, treat as tier key and throw error if not found
    throw new Error(`Invalid LLM_MODEL: ${envModel}. Use tier key (anthropic-cheap) or model string (anthropic:claude-3-5-haiku:20241022)`)
  }
}

// Get model configuration from environment
export function getModelConfigFromEnvironment() {
  const modelString = getModelStringFromEnvironment()
  return getModelConfigByString(modelString)
}

// Get model string and config for AI calls
export function getModelForAICall(): { modelString: string, config: any } {
  try {
    const modelString = getModelStringFromEnvironment()
    const config = getModelConfigByString(modelString)
    return { modelString, config }
  } catch (error) {
    // Fallback to default if there's any error
    console.error('Error in getModelForAICall, falling back to default:', error)
    const fallbackModelString = DEFAULT_MODEL_STRING
    const fallbackConfig = getModelConfigByString(fallbackModelString)
    return { modelString: fallbackModelString, config: fallbackConfig }
  }
}

// Content summarisation configuration
export const SUMMARY_CONFIG = {
  // Minimum number of characters required to generate an AI summary
  // Sections with fewer characters will show "[too little text to summarise]"
  MIN_CONTENT_LENGTH_CHARS: 100,
} as const

// UI configuration
export const UI_CONFIG = {
  FORCE_LIGHT_MODE: true,
} as const

// Visibility tracking configuration for Table of Contents
export const VISIBILITY_CONFIG = {
  UPDATE_INTERVAL: 100,    // ms - How often to batch visibility updates
  DEBOUNCE_DELAY: 150,     // ms - Debounce delay for processing visibility changes (increased to reduce flickering)
  ROOT_MARGIN: '0px',      // For precise viewport detection
  THRESHOLD: 0.15,         // Minimum visible ratio to count as visible (15%)
} as const

// URL extraction configuration for webpage content processing
export const URL_EXTRACTION_CONFIG = {
  MAX_HTML_SIZE_BYTES: 500 * 1024, // 500KB limit (safe for both Claude/Gemini token limits)
  FETCH_TIMEOUT_MS: 10000, // 10 second timeout
  DEFAULT_USER_AGENT: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ERROR_MESSAGES: {
    SIZE_LIMIT: 'Webpage content too large (max 500KB). Try a more specific URL or consider PDF upload for lengthy documents.',
    JAVASCRIPT_REQUIRED: 'This webpage requires JavaScript for content rendering and cannot be processed. Try using the AI Transcription method instead, or consider uploading the content as a PDF.',
    INVALID_URL: 'Please enter a valid HTTP or HTTPS URL.',
    FETCH_FAILED: 'Unable to fetch webpage content. The site may be blocking automated access or require authentication.',
    TIMEOUT: 'Request timed out while fetching webpage content. The webpage may be slow to respond or contain large resources.',
    NETWORK_ERROR: 'Network error occurred while fetching webpage content. Please check your internet connection and try again.',
    READABILITY_FAILED: 'Mozilla Readability could not extract content from this webpage. The page may have unusual formatting or be primarily JavaScript-based. Try the AI Transcription method instead.',
    PAYWALL_DETECTED: 'This webpage appears to be behind a paywall or requires subscription access. Please ensure you have access to the content before extracting.',
    CONTENT_TOO_SPARSE: 'This webpage contains insufficient extractable content. The page may be primarily navigation, advertisements, or interactive elements.'
  }
} as const

// Site configuration
export const SITE_CONFIG = {
  // Base URL for the application
  // In development: http://localhost:$PORT
  // In production: https://www.spideryarn.com
  get BASE_URL() {
    if (typeof window !== 'undefined') {
      // Client-side: use window.location
      return window.location.origin
    } else {
      // Server-side: construct from environment
      const port = process.env.PORT || '3000'
      return process.env.NODE_ENV === 'production' 
        ? 'https://www.spideryarn.com'
        : `http://localhost:${port}`
    }
  }
} as const