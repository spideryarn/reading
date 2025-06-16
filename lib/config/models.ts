// Model configuration system
// Uses explicit model strings in format: provider:model:version[:thinking]
// Use underscores for large numbers, e.g. 1_000_000
//
// Google model pricing reference: https://ai.google.dev/gemini-api/docs/pricing
// Anthropic model pricing reference: https://docs.anthropic.com/en/docs/about-claude/models
// OpenAI model pricing reference: https://openai.com/api/pricing/

export interface ModelConfig {
  provider: 'anthropic' | 'google' | 'openai'
  modelName: string  // e.g., 'claude-3-5-haiku', 'gemini-2.0-flash'
  version: string    // e.g., '20241022', 'latest'
  thinking: boolean
  description: string
  contextWindow: number
  outputTokens: number
  pricing?: {
    inputPer1M: number   // USD per 1M input tokens
    outputPer1M: number  // USD per 1M output tokens
  }
}

// Model definitions indexed by full model string
export const MODEL_DEFINITIONS: Record<string, ModelConfig> = {
  // Anthropic models
  'anthropic:claude-3-5-haiku:20241022': {
    provider: 'anthropic',
    modelName: 'claude-3-5-haiku',
    version: '20241022',
    thinking: false,
    description: 'Claude 3.5 Haiku - Fast and cost-effective',
    contextWindow: 200_000,
    outputTokens: 8192,
    pricing: {
      inputPer1M: 1.00,
      outputPer1M: 5.00,
    },
  },
  'anthropic:claude-sonnet-4:20250514': {
    provider: 'anthropic',
    modelName: 'claude-sonnet-4',
    version: '20250514',
    thinking: false,
    description: 'Claude Sonnet 4 - Balanced performance and cost',
    contextWindow: 200_000,
    outputTokens: 8192,
    pricing: {
      inputPer1M: 3.00,
      outputPer1M: 15.00,
    },
  },
  'anthropic:claude-sonnet-4:20250514:thinking': {
    provider: 'anthropic',
    modelName: 'claude-sonnet-4',
    version: '20250514',
    thinking: true,
    description: 'Claude Sonnet 4 with Thinking Mode - Advanced reasoning',
    contextWindow: 200_000,
    outputTokens: 8192,
    pricing: {
      inputPer1M: 3.00,
      outputPer1M: 15.00,
    },
  },
  'anthropic:claude-opus-4:20250514': {
    provider: 'anthropic',
    modelName: 'claude-opus-4',
    version: '20250514',
    thinking: false,
    description: 'Claude Opus 4 - Highest capability',
    contextWindow: 200_000,
    outputTokens: 8192,
    pricing: {
      inputPer1M: 15.00,
      outputPer1M: 75.00,
    },
  },
  // Google models
  'google:gemini-2.0-flash:latest': {
    provider: 'google',
    modelName: 'gemini-2.0-flash',
    version: 'latest',
    thinking: false,
    description: 'Gemini 2.0 Flash - Fast and cost-effective',
    contextWindow: 1_000_000,
    outputTokens: 8192,
    pricing: {
      inputPer1M: 0.075,
      outputPer1M: 0.30,
    },
  },
  'google:gemini-2.5-flash:latest': {
    provider: 'google',
    modelName: 'gemini-2.5-flash',
    version: 'latest',
    thinking: false,
    description: 'Gemini 2.5 Flash - Fast, cost-effective with thinking capabilities',
    contextWindow: 1_000_000,
    outputTokens: 8192,
    pricing: {
      inputPer1M: 0.15,
      outputPer1M: 0.60,
    },
  },
  'google:gemini-2.5-pro:latest': {
    provider: 'google',
    modelName: 'gemini-2.5-pro',
    version: 'latest',
    thinking: false,
    description: 'Gemini 2.5 Pro - Advanced performance',
    contextWindow: 1_000_000,
    outputTokens: 8192,
    pricing: {
      inputPer1M: 2.50,
      outputPer1M: 10.00,
    },
  },
  // OpenAI models (commented out - API integration not yet implemented)
  /*
  'openai:o3:latest': {
    provider: 'openai',
    modelName: 'o3',
    version: 'latest',
    thinking: false,
    description: 'OpenAI o3 - Advanced reasoning model (80% price reduction in June 2025)',
    contextWindow: 128_000,
    outputTokens: 32_768,
    pricing: {
      inputPer1M: 2.00,   // After 80% price cut (was $10)
      outputPer1M: 8.00,  // After 80% price cut (was $40)
    },
  },
  'openai:o3-mini:latest': {
    provider: 'openai',
    modelName: 'o3-mini',
    version: 'latest',
    thinking: false,
    description: 'OpenAI o3-mini - Affordable reasoning model',
    contextWindow: 200_000,
    outputTokens: 100_000,
    pricing: {
      inputPer1M: 1.10,
      outputPer1M: 4.40,
    },
  },
  'openai:o3-pro:latest': {
    provider: 'openai',
    modelName: 'o3-pro',
    version: 'latest',
    thinking: false,
    description: 'OpenAI o3-pro - Advanced reasoning with enhanced reliability',
    contextWindow: 128_000,
    outputTokens: 32_768,
    pricing: {
      inputPer1M: 20.00,
      outputPer1M: 80.00,
    },
  },
  */
}

// Model tier aliases for easier configuration
export const MODEL_TIERS = {
  // Anthropic tiers
  'anthropic-cheap': 'anthropic:claude-3-5-haiku:20241022',
  'anthropic-balanced': 'anthropic:claude-sonnet-4:20250514',
  'anthropic-balanced-thinking': 'anthropic:claude-sonnet-4:20250514:thinking',
  'anthropic-expensive': 'anthropic:claude-opus-4:20250514',
  // Google tiers
  'google-cheap': 'google:gemini-2.0-flash:latest',
  'google-balanced': 'google:gemini-2.5-flash:latest',
  'google-expensive': 'google:gemini-2.5-pro:latest',
} as const

export type ModelTierKey = keyof typeof MODEL_TIERS

// Parse model string into components
export interface ParsedModelString {
  provider: 'anthropic' | 'google' | 'openai'
  modelName: string
  version: string
  thinking: boolean
  fullString: string
}

export function parseModelString(modelString: string): ParsedModelString {
  const parts = modelString.split(':')
  
  if (parts.length < 3 || parts.length > 4) {
    throw new Error(`Invalid model string format: ${modelString}. Expected: provider:model:version[:thinking]`)
  }

  const [provider, modelName, version, thinkingFlag] = parts
  
  if (!['anthropic', 'google', 'openai'].includes(provider)) {
    throw new Error(`Unknown provider: ${provider}. Expected: anthropic, google, openai`)
  }

  const thinking = thinkingFlag === 'thinking'
  if (thinkingFlag && !thinking) {
    throw new Error(`Invalid thinking flag: ${thinkingFlag}. Expected: 'thinking' or omit`)
  }

  return {
    provider: provider as 'anthropic' | 'google' | 'openai',
    modelName,
    version,
    thinking,
    fullString: modelString,
  }
}

// Build model string from components
export function buildModelString(
  provider: string,
  modelName: string,
  version: string,
  thinking = false
): string {
  const base = `${provider}:${modelName}:${version}`
  return thinking ? `${base}:thinking` : base
}

// Get model configuration by model string
export function getModelConfig(modelString: string): ModelConfig {
  const config = MODEL_DEFINITIONS[modelString]
  if (!config) {
    throw new Error(`Unknown model: ${modelString}. Available models: ${Object.keys(MODEL_DEFINITIONS).join(', ')}`)
  }
  return config
}

// Get model string from tier key (for backwards compatibility during transition)
export function getModelStringFromTier(tierKey: ModelTierKey): string {
  const modelString = MODEL_TIERS[tierKey]
  if (!modelString) {
    throw new Error(`Unknown tier key: ${tierKey}. Available tiers: ${Object.keys(MODEL_TIERS).join(', ')}`)
  }
  return modelString
}

// Validate model string format
export function validateModelString(modelString: string): boolean {
  try {
    parseModelString(modelString)
    return true
  } catch {
    return false
  }
}

// Get all available models grouped by provider
export function getAvailableModels(): Record<string, ModelConfig[]> {
  const grouped: Record<string, ModelConfig[]> = {}
  
  for (const config of Object.values(MODEL_DEFINITIONS)) {
    if (!grouped[config.provider]) {
      grouped[config.provider] = []
    }
    grouped[config.provider].push({ ...config })
  }
  
  return grouped
}

// Default model configuration
export const DEFAULT_MODEL_STRING = 'anthropic:claude-sonnet-4:20250514'