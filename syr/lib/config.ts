// Central configuration for the application

// AI model configuration
export const AI_CONFIG = {
  DEFAULT_MODEL: 'claude-sonnet-4-20250514',
  DEFAULT_TEMPERATURE: 0,
  DEFAULT_MAX_TOKENS: 1024,
} as const

// UI configuration
export const UI_CONFIG = {
  FORCE_LIGHT_MODE: true,
} as const