/**
 * Headings Prompt Template
 * 
 * This template generates new semantic headings for HTML documents to improve
 * table of contents structure and readability. The system analyzes HTML content
 * and creates hierarchical headings (H1-H6) that better reflect the semantic
 * structure of the text.
 * 
 * The prompt is adapted from the obsolete_alternative_version's generate_headings
 * prompt, which proved effective at creating logical heading hierarchies.
 * 
 * Key behaviors:
 * - Always generates completely new heading structure (throws away existing headings)
 * - Returns exactly one H1 at the top level
 * - Adds appropriate granular headings based on content complexity
 * - Positions headings using deterministic element IDs for insertion points
 */

import { z } from 'zod'
import { loadPromptTemplateFromCaller } from '../types'

// Schema for individual heading generation
export const headingSchema = z.object({
  insertNewBeforeExistingId: z.string().min(1, 'Element ID cannot be empty'),
  html: z.string().min(1, 'HTML content cannot be empty').regex(
    /^<h[1-6][^>]*>.*<\/h[1-6]>$/,
    'HTML must be a valid heading element (h1-h6)'
  )
})

// Schema for the headings response
export const headingsResponseSchema = z.object({
  headings: z.array(headingSchema)
})

// Schema for headings prompt input
const headingsPromptSchema = z.object({
  html_content: z.string().min(1, 'HTML content cannot be empty'),
  documentId: z.string().uuid().optional() // Optional for backward compatibility
})

// Load the headings prompt template
export const headingsPrompt = loadPromptTemplateFromCaller(
  'headings.njk',
  headingsPromptSchema,
  {
    maxTokens: 8000, // Large token limit for comprehensive heading analysis
    // temperature defaults to 0 for deterministic output
  }
)

// Export schemas for use in the API
export const headingsPromptInputSchema = headingsPromptSchema