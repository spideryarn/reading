/**
 * Summary Prompt Template
 * 
 * This template generates summaries with configurable granularity levels.
 * 
 * Granularity Options:
 * - When granularity is specified: Uses exact instruction "Write at most a {granularity}."
 * - When granularity is undefined: Uses adaptive instruction that tells Claude to adjust
 *   length based on content complexity (paragraph → sentence, page → paragraph, etc.)
 * 
 * Token Limits:
 * Each granularity maps to appropriate maxTokens (10 for "short phrase" up to 800 for "page").
 * When no granularity is specified, defaults to 200 tokens for adaptive summaries.
 * 
 * Usage:
 * - API accepts optional granularity parameter from the predefined enum
 * - getGranularityInstruction() transforms granularity into prompt text
 * - getMaxTokensForGranularity() provides token limits for each level
 */

import { z } from 'zod'
import { loadPromptTemplateFromCaller } from '../types'

// Granularity options with corresponding token limits
const GRANULARITY_OPTIONS = {
  'short phrase of just a few words': 10,
  'short title': 15,
  'short sentence': 25,
  'sentence': 30,
  'sentence or two': 50,
  'few sentences': 100,
  'single short paragraph': 200,
  'couple of paragraphs': 400,
  'page': 800,
} as const

export type GranularityKey = keyof typeof GRANULARITY_OPTIONS

// Schema for summary prompt (granularity here is the transformed instruction text)
const summariseSchema = z.object({
  content: z.string().min(1, 'Content cannot be empty'),
  granularity: z.string().optional().default(''),
})

// Transform granularity into prompt instruction
export function getGranularityInstruction(granularity?: GranularityKey): string {
  return granularity 
    ? `Write at most a ${granularity}.`
    : "Adjust the length of your summary appropriately, based on the length and complexity of the text. For example, if the text is a paragraph, write a sentence or two. If it's a page, write a paragraph or so. If it's a book, write a page."
}

// Function to get max tokens for a given granularity
export function getMaxTokensForGranularity(granularity: GranularityKey): number {
  return GRANULARITY_OPTIONS[granularity]
}

// Load the summary prompt template with dynamic token calculation
export const summarisePrompt = loadPromptTemplateFromCaller(
  'summarise.njk',
  summariseSchema,
  {
    // Default maxTokens - will be overridden by executePrompt based on granularity
    maxTokens: 0,
  }
)
