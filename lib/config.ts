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

// Add centralised debug feature flags – these are compile-time evaluated during the build
// so they can safely be tree-shaken for production when set to false.
export const DEBUG_FLAGS = {
    // VOICE_INPUT: false,
    VOICE_INPUT: true,
} as const;





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
  const modelString = getModelStringFromEnvironment()
  const config = getModelConfigByString(modelString)
  return { modelString, config }
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
  
  // Auto-trigger configuration for automatic glossary generation
  // Set to false to disable auto-trigger functionality entirely
  GLOSSARY_AUTO_TRIGGER_ENABLED: true,
  
  // Consistent batch size for auto-trigger Load More operations
  // Should be consistent with MAX_ENTITIES_PER_REQUEST for predictability
  GLOSSARY_MAX_ENTITIES_PER_BATCH: 20,
} as const

// Heading iteration configuration for progressive heading improvement
export const HEADING_ITERATION_CONFIG = {
  // Maximum number of heading operations (insert/replace/remove) per iteration
  // Constrains LLM to focused, incremental improvements
  MAX_HEADING_OPERATIONS_PER_ITERATION: 10,
  
  // Maximum number of iterations allowed per document session
  // Prevents infinite loops and ensures reasonable completion time
  MAX_ITERATIONS: 10,
  
  // Whether to automatically apply subsequent iterations when conditions are met
  // When TRUE: After the 0th iteration (triggered by user), subsequent iterations run automatically
  // When FALSE: User must manually click "Continue Improving" after each iteration
  AUTO_ITERATE_HEADINGS: true,
} as const

// UI configuration
export const UI_CONFIG = {
  FORCE_LIGHT_MODE: true,
  DEFAULT_LEFT_PANE_WIDTH_PERCENT: 35, // Default width of left sidebar as percentage of window width
} as const

// Tool registry logging configuration
export const TOOL_REGISTRY_CONFIG = {
  // Control logging verbosity for tool registration
  // 'silent': No logging (production)
  // 'normal': Summary only (default for development)  
  // 'verbose': Detailed per-tool logging (debugging)
  LOG_LEVEL: (process.env.TOOL_REGISTRY_LOG_LEVEL || 'normal') as 'silent' | 'normal' | 'verbose',
} as const

// Visibility tracking configuration for Table of Contents
export const VISIBILITY_CONFIG = {
  UPDATE_INTERVAL: 100,    // ms - How often to batch visibility updates
  DEBOUNCE_DELAY: 150,     // ms - Debounce delay for processing visibility changes (increased to reduce flickering)
  ROOT_MARGIN: '0px',      // For precise viewport detection
  THRESHOLD: 0.15,         // Minimum visible ratio to count as visible (15%)
} as const

// Upload limits configuration - centralized size limits for all file types
// Note: URL extraction has separate limits in URL_EXTRACTION_CONFIG below (different use case)
export { UPLOAD_LIMITS } from './config/upload-limits'

// URL extraction configuration for webpage content processing
// Note: These limits are separate from UPLOAD_LIMITS above (different use case - web scraping vs file upload)
export const URL_EXTRACTION_CONFIG = {
  MAX_HTML_SIZE_BYTES: 4 * 1024 * 1024, // 4MB limit
  FETCH_TIMEOUT_MS: 30_000, // 30 second timeout
  DEFAULT_USER_AGENT: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ERROR_MESSAGES: {
    SIZE_LIMIT: 'Webpage content too large (max 4MB). Try a more specific URL or consider PDF upload for lengthy documents.',
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

// Chat validation configuration - centralised limits for message validation
export const CHAT_VALIDATION_CONFIG = {
  // Maximum length for a single message
  MAX_MESSAGE_LENGTH: 50000,
  
  // Maximum length for a single word (security check against attacks)
  MAX_WORD_LENGTH: 1000,
  
  // Maximum number of messages the client and server will validate in a single
  // conversation history. Set to 0 to disable the limit (i.e. include the full
  // history).  When greater than 0, older turns will be discarded so that the
  // array passed to the API never exceeds this value.
  MAX_CONVERSATION_LENGTH: 0,
  
  // Maximum document context length
  MAX_DOCUMENT_CONTEXT_LENGTH: 100000,
  
  // Error messages for validation failures
  ERROR_MESSAGES: {
    EMPTY_CONTENT: 'Message content cannot be empty or contain only whitespace. Please enter a message.',
    MESSAGE_TOO_LONG: 'Message is too long (maximum 50,000 characters)',
    WORD_TOO_LONG: 'Message contains excessively long words. Please break up long text.',
    TOO_MANY_MESSAGES: 'Too many messages in conversation (max 20)',
    CONTEXT_TOO_LONG: 'Document context too long',
    INVALID_THREAD_ID: 'Invalid thread ID format',
    INVALID_DOCUMENT_ID: 'Invalid document ID format'
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

// Centralised timeout configuration for the unified tool-execution framework
// These values are used as fall-backs by the executor when a tool doesn't
// supply its own per-action timeout.  Keeping them in a single place makes
// it easy to tune application-wide behaviour.
export const TOOL_TIMEOUTS = {
  DEFAULT: 30_000,   // Generic operations (30 s)
  AI: 60_000,        // LLM-heavy operations (60 s)
  ANALYSIS: 300_000, // Expensive analyses (5 min)
  UPLOAD: 180_000,   // Large file uploads / processing (3 min)
} as const

// VISION PDF single-page upload configuration – controls client concurrency for Gemini calls
export const VISION_UPLOAD_CONFIG = {
  // Maximum number of concurrent /api/upload-pdf-single-page-image requests the
  // browser is allowed to issue.  Keep deliberately low while we investigate
  // Gemini rate-limit behaviour in development.  This can be overridden via the
  // VISION_MAX_CONCURRENCY environment variable.
  MAX_CONCURRENCY: parseInt(process.env.VISION_MAX_CONCURRENCY || '1', 10),
} as const