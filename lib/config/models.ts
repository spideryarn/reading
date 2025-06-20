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
  // Anthropic models (valid as of 2024-03-07 release)
  'anthropic:claude-3-haiku:20240307': {
    provider: 'anthropic',
    modelName: 'claude-3-haiku',
    version: '20240307',
    thinking: false,
    description: 'Claude 3 Haiku – Fast and cost-effective',
    contextWindow: 200_000,
    outputTokens: 8192,
    pricing: {
      inputPer1M: 1.00,
      outputPer1M: 5.00,
    },
  },
  'anthropic:claude-3-sonnet:20240229': {
    provider: 'anthropic',
    modelName: 'claude-3-sonnet',
    version: '20240229',
    thinking: false,
    description: 'Claude 3 Sonnet – Balanced performance and cost',
    contextWindow: 200_000,
    outputTokens: 8192,
    pricing: {
      inputPer1M: 3.00,
      outputPer1M: 15.00,
    },
  },
  'anthropic:claude-3-sonnet:20240229:thinking': {
    provider: 'anthropic',
    modelName: 'claude-3-sonnet',
    version: '20240229',
    thinking: true,
    description: 'Claude 3 Sonnet with Thinking Mode – Advanced reasoning',
    contextWindow: 200_000,
    outputTokens: 8192,
    pricing: {
      inputPer1M: 3.00,
      outputPer1M: 15.00,
    },
  },
  'anthropic:claude-3-opus:20240229': {
    provider: 'anthropic',
    modelName: 'claude-3-opus',
    version: '20240229',
    thinking: false,
    description: 'Claude 3 Opus – Highest capability',
    contextWindow: 200_000,
    outputTokens: 8192,
    pricing: {
      inputPer1M: 15.00,
      outputPer1M: 75.00,
    },
  },
  // Google models
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


// Validate model string format - basic syntax validation
export function validateModelString(modelString: string): boolean {
  try {
    parseModelString(modelString)
    return true
  } catch {
    return false
  }
}

// Strict validation that checks format AND availability in configuration
export function validateModelStringStrict(modelString: string): { valid: boolean; error?: string } {
  // First check for basic format issues
  if (!modelString || typeof modelString !== 'string') {
    return {
      valid: false,
      error: 'Model string must be a non-empty string'
    }
  }

  // Check for whitespace or case issues
  const trimmed = modelString.trim()
  if (trimmed !== modelString) {
    return {
      valid: false,
      error: `Model string contains leading/trailing whitespace: "${modelString}". Use "${trimmed}" instead.`
    }
  }

  // Check basic format
  let parsed: ParsedModelString
  try {
    parsed = parseModelString(modelString)
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid model string format'
    }
  }

  // Validate provider-specific naming patterns first
  if (parsed.provider === 'anthropic') {
    if (!parsed.modelName.startsWith('claude-')) {
      return {
        valid: false,
        error: `Anthropic model names must start with "claude-". Got: "${parsed.modelName}"`
      }
    }
    
    // Check version format for Anthropic (should be date like 20241022)
    if (!/^\d{8}$/.test(parsed.version)) {
      return {
        valid: false,
        error: `Anthropic model versions should be 8-digit dates (YYYYMMDD). Got: "${parsed.version}"`
      }
    }
  } else if (parsed.provider === 'google') {
    if (!parsed.modelName.startsWith('gemini-')) {
      return {
        valid: false,
        error: `Google model names must start with "gemini-". Got: "${parsed.modelName}"`
      }
    }
    
    // Google models typically use "latest" or specific versions
    if (!['latest', 'preview'].includes(parsed.version) && !/^\d+\.\d+$/.test(parsed.version)) {
      return {
        valid: false,
        error: `Google model versions should be "latest", "preview", or version numbers (e.g., "1.0"). Got: "${parsed.version}"`
      }
    }
  } else if (parsed.provider === 'openai') {
    // OpenAI models typically don't have specific prefixes
    if (!['latest', 'preview'].includes(parsed.version) && !/^\d{4}-\d{2}-\d{2}$/.test(parsed.version)) {
      return {
        valid: false,
        error: `OpenAI model versions should be "latest", "preview", or date format (YYYY-MM-DD). Got: "${parsed.version}"`
      }
    }
  }

  // Check if model is available in configuration
  if (!MODEL_DEFINITIONS[modelString]) {
    const availableModels = Object.keys(MODEL_DEFINITIONS)
    const sameProviderModels = availableModels.filter(m => m.startsWith(parsed.provider + ':'))
    
    let suggestion = ''
    if (sameProviderModels.length > 0) {
      suggestion = ` Available ${parsed.provider} models: ${sameProviderModels.join(', ')}`
    } else {
      const allProviders = [...new Set(availableModels.map(m => m.split(':')[0]))]
      suggestion = ` Available providers: ${allProviders.join(', ')}`
    }

    return {
      valid: false,
      error: `Model "${modelString}" is not available in configuration.${suggestion}`
    }
  }

  return { valid: true }
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
export const DEFAULT_MODEL_STRING = 'anthropic:claude-3-haiku:20240307'