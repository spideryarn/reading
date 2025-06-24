// Central configuration for the application

import { 
  getModelConfig as getModelConfigByString,
  parseModelString,
  validateModelStringStrict,
  DEFAULT_MODEL_STRING,
  type ModelConfig
} from './config/models'


// AI model configuration
// Override with LLM_MODEL environment variable using model strings
// Example: LLM_MODEL=google:gemini-2.0-flash:latest npm run dev (fast & cheap for development)
// Example: LLM_MODEL=anthropic:claude-sonnet-4:20250514 npm run build (balanced for production)
//
// IMPORTANT: Claude model token limits for max_tokens:
// - Haiku: 8,192 max output tokens
// When setting maxTokens in prompt templates, stay under these limits!
export const AI_CONFIG = {
  DEFAULT_TEMPERATURE: 0,
  DEFAULT_MAX_TOKENS: parseInt(process.env.DEFAULT_MAX_TOKENS || '4096', 10),
} as const





// Get model string from environment variable or default
// Only supports direct model strings (provider:model:version[:thinking])
export function getModelStringFromEnvironment(): string {
  const envModel = process.env.LLM_MODEL || DEFAULT_MODEL_STRING
  
  // Use strict validation to ensure model is both valid format and available
  const validation = validateModelStringStrict(envModel)
  if (!validation.valid) {
    throw new Error(`Invalid LLM_MODEL environment variable: ${validation.error}. Current value: "${envModel}"`)
  }
  
  // Additional startup check: ensure the corresponding provider API key is set
  try {
    // parseModelString is already imported at top
    const { provider } = parseModelString(envModel)

    // Map providers to their required API key environment variables
    const providerKeyMap: Record<string, string> = {
      anthropic: 'ANTHROPIC_API_KEY',
      google: 'GOOGLE_GENERATIVE_AI_API_KEY',
      openai: 'OPENAI_API_KEY',
    }

    const requiredEnvKey = providerKeyMap[provider]

    if (!requiredEnvKey) {
      throw new Error(`No API key mapping configured for provider "${provider}" – please update providerKeyMap in lib/config.ts`)
    }

    const keyValue = process.env[requiredEnvKey]
    if (!keyValue) {
      throw new Error(
        `${requiredEnvKey} environment variable is required when using model "${envModel}". ` +
        `Set ${requiredEnvKey} in your environment or change LLM_MODEL to use a provider ` +
        `for which you have configured credentials.`
      )
    }
  } catch (keyValidationError) {
    // Re-throw with clear context
    if (keyValidationError instanceof Error) {
      throw keyValidationError
    }
    throw new Error(String(keyValidationError))
  }
  
  return envModel
}

// Get model configuration from environment
export function getModelConfigFromEnvironment() {
  const modelString = getModelStringFromEnvironment()
  return getModelConfigByString(modelString)
}

// Get model string and config for AI calls
export function getModelForAICall(): { modelString: string, config: ModelConfig } {
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

// Helper function for API routes to validate model strings in request bodies
export function validateApiModelString(modelString: unknown): { valid: true; modelString: string } | { valid: false; error: string } {
  if (modelString === null || modelString === undefined) {
    return { valid: false, error: 'Model string is required' }
  }
  
  if (typeof modelString !== 'string') {
    return { valid: false, error: `Model string must be a string, got ${typeof modelString}` }
  }
  
  if (modelString === '') {
    return { valid: false, error: 'Model string is required' }
  }
  
  const validation = validateModelStringStrict(modelString)
  if (!validation.valid) {
    return { valid: false, error: `Invalid model string: ${validation.error}` }
  }
  
  return { valid: true, modelString }
}

// Content summarisation configuration
export const SUMMARY_CONFIG = {
  // Minimum number of characters required to generate an AI summary
  // Sections with fewer characters will show "[too little text to summarise]"
  MIN_CONTENT_LENGTH_CHARS: 100,
} as const

// Glossary configuration for entity generation and timeout mitigation
export const GLOSSARY_CONFIG = {
  // Default number of entities to generate per LLM request
  // Conservative limit to prevent timeout issues on complex documents
  DEFAULT_ENTITY_LIMIT_PER_REQUEST: 20,
  
  // Maximum entities that can be requested in a single call
  // Safety bound to prevent excessive token generation
  MAX_TOTAL_ENTITY_LIMIT: 100,
  
  // Maximum entities per "Load More" request
  // Batch size for incremental entity generation
  MAX_ENTITIES_PER_REQUEST: 30,
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