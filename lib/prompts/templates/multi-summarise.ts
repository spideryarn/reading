/**
 * Multi-Dimensional Summary Prompt Template
 * 
 * This template generates summaries across two dimensions:
 * 1. Expertise level: beginner, intermediate, expert
 * 2. Length: sentence_or_two, single_short_paragraph, page
 * 
 * Generates all 9 summaries (3×3 combinations) in a single API call with structured JSON output.
 * 
 * Token Estimates:
 * - sentence_or_two: ~50 tokens each (150 total)
 * - single_short_paragraph: ~200 tokens each (600 total)
 * - page: ~800 tokens each (2400 total)
 * - Total output: ~3150 tokens for all 9 summaries
 * 
 * Usage:
 * - Used by multi-summarise API endpoint for generating all 9 combinations in one call
 * - Returns structured JSON with all combinations
 * - Results stored directly in nested JSON structure in database
 */

import { z } from 'zod'
import { loadPromptTemplateFromCaller } from '../types'

// Expertise levels
export const EXPERTISE_LEVELS = ['beginner', 'intermediate', 'expert'] as const
export type ExpertiseLevel = typeof EXPERTISE_LEVELS[number]

// Length levels - mapped to granularity keys from original summarise template
export const LENGTH_LEVELS = ['sentence_or_two', 'single_short_paragraph', 'page'] as const
export type LengthLevel = typeof LENGTH_LEVELS[number]

// Schema for the expected JSON output structure
export const multiSummaryOutputSchema = z.object({
  beginner: z.object({
    sentence_or_two: z.string(),
    single_short_paragraph: z.string(),
    page: z.string()
  }),
  intermediate: z.object({
    sentence_or_two: z.string(),
    single_short_paragraph: z.string(), 
    page: z.string()
  }),
  expert: z.object({
    sentence_or_two: z.string(),
    single_short_paragraph: z.string(),
    page: z.string()
  })
})

export type MultiSummaryOutput = z.infer<typeof multiSummaryOutputSchema>

// Schema for multi-dimensional summary prompt input
const multiSummariseSchema = z.object({
  content: z.string().min(1, 'Content cannot be empty')
})

// Load the multi-dimensional summary prompt template
export const multiSummarisePrompt = loadPromptTemplateFromCaller(
  'multi-summarise.njk',
  multiSummariseSchema,
  {
    // Higher token limit to accommodate all 9 summaries (~3150 tokens estimated)
    maxTokens: 3500,
  }
)