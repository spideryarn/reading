/**
 * Multi-Dimensional Summary Prompt Template
 * 
 * This template generates summaries across two dimensions:
 * 1. Expertise level: beginner, intermediate, expert
 * 2. Length: sentence_or_two, single_short_paragraph, page
 * 
 * Generates 9 summaries total (3×3 combinations) in parallel for instant switching.
 * 
 * Token Limits (1.5x higher than original for safety):
 * - sentence_or_two: 75 tokens (was 50)
 * - single_short_paragraph: 300 tokens (was 200)
 * - page: 1200 tokens (was 800)
 * 
 * Usage:
 * - Used by multi-summarise API endpoint for generating all 9 combinations
 * - Each combination gets a separate AI call with specific expertise + length parameters
 * - Results stored in nested JSON structure in database
 */

import { z } from 'zod'
import { loadPromptTemplateFromCaller } from '../types'

// Expertise levels
export const EXPERTISE_LEVELS = ['beginner', 'intermediate', 'expert'] as const
export type ExpertiseLevel = typeof EXPERTISE_LEVELS[number]

// Length levels - mapped to granularity keys from original summarise template
export const LENGTH_LEVELS = ['sentence_or_two', 'single_short_paragraph', 'page'] as const
export type LengthLevel = typeof LENGTH_LEVELS[number]

// Token limits for each length level (1.5x higher than original granularity system)
const LENGTH_TOKEN_LIMITS = {
  'sentence_or_two': 75,    // was 50
  'single_short_paragraph': 300,  // was 200
  'page': 1200,    // was 800
} as const

// Schema for multi-dimensional summary prompt
const multiSummariseSchema = z.object({
  content: z.string().min(1, 'Content cannot be empty'),
  expertise_level: z.enum(EXPERTISE_LEVELS),
  length_instruction: z.string(), // Transformed instruction text
})

// Transform expertise level into readable form
export function getExpertiseLevelInstruction(level: ExpertiseLevel): string {
  const instructions = {
    beginner: 'beginner',
    intermediate: 'intermediate', 
    expert: 'expert'
  }
  return instructions[level]
}

// Transform length level into instruction text
export function getLengthInstruction(length: LengthLevel): string {
  const instructions = {
    'sentence_or_two': 'a sentence or two',
    'single_short_paragraph': 'a single short paragraph',
    'page': 'about a page'
  }
  return instructions[length]
}

// Function to get max tokens for a given length level
export function getMaxTokensForLength(length: LengthLevel): number {
  return LENGTH_TOKEN_LIMITS[length]
}

// Generate all 9 combinations of expertise × length
export function getAllCombinations(): Array<{ expertise: ExpertiseLevel; length: LengthLevel }> {
  const combinations: Array<{ expertise: ExpertiseLevel; length: LengthLevel }> = []
  
  for (const expertise of EXPERTISE_LEVELS) {
    for (const length of LENGTH_LEVELS) {
      combinations.push({ expertise, length })
    }
  }
  
  return combinations
}

// Load the multi-dimensional summary prompt template
export const multiSummarisePrompt = loadPromptTemplateFromCaller(
  'multi-summarise.njk',
  multiSummariseSchema,
  {
    // Default maxTokens - will be overridden based on length level
    maxTokens: 200,
  }
)