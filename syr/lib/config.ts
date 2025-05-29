// Central configuration for the application

// AI model configuration
// Override with AI_MODEL environment variable for development/testing
// Example: AI_MODEL=claude-3-haiku-20240307 npm run dev (faster & cheaper for dev)
//
// IMPORTANT: Claude model token limits for max_tokens:
// - Haiku: 8,192 max output tokens
// When setting maxTokens in prompt templates, stay under these limits!
export const AI_CONFIG = {
  DEFAULT_MODEL: process.env.AI_MODEL || 'claude-sonnet-4-20250514',
  DEFAULT_TEMPERATURE: 0,
  DEFAULT_MAX_TOKENS: 1024,
} as const

// UI configuration
export const UI_CONFIG = {
  FORCE_LIGHT_MODE: true,
} as const