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

// Schema for heading content in insert/replace operations
const headingContentSchema = z.object({
  tag_name: z.enum(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'], {
    errorMap: () => ({ message: 'tag_name must be h1, h2, h3, h4, h5, or h6' })
  }),
  content: z.string().min(1, 'Heading content cannot be empty')
})

// Base operation schema with action field
const baseOperationSchema = z.object({
  action: z.enum(['insert', 'replace', 'remove'], {
    errorMap: () => ({ message: 'action must be insert, replace, or remove' })
  })
})

// Schema for heading operations with conditional validation
export const headingOperationSchema = baseOperationSchema.extend({
  insertNewBeforeExistingId: z.string().optional(),
  targetId: z.string().optional(),
  content: headingContentSchema.optional()
}).refine((data) => {
  // Insert operations require insertNewBeforeExistingId and content
  if (data.action === 'insert') {
    return data.insertNewBeforeExistingId && data.content
  }
  // Replace operations require targetId and content
  if (data.action === 'replace') {
    return data.targetId && data.content
  }
  // Remove operations require only targetId
  if (data.action === 'remove') {
    return data.targetId && !data.content
  }
  return false
}, (data) => {
  if (data.action === 'insert') {
    if (!data.insertNewBeforeExistingId) {
      return { message: 'Insert operations require insertNewBeforeExistingId', path: ['insertNewBeforeExistingId'] }
    }
    if (!data.content) {
      return { message: 'Insert operations require content', path: ['content'] }
    }
  }
  if (data.action === 'replace') {
    if (!data.targetId) {
      return { message: 'Replace operations require targetId', path: ['targetId'] }
    }
    if (!data.content) {
      return { message: 'Replace operations require content', path: ['content'] }
    }
  }
  if (data.action === 'remove') {
    if (!data.targetId) {
      return { message: 'Remove operations require targetId', path: ['targetId'] }
    }
    if (data.content) {
      return { message: 'Remove operations should not include content', path: ['content'] }
    }
  }
  return { message: 'Invalid operation configuration' }
})

// Schema for iteration safety check
const safetyCheckSchema = z.object({
  current_iteration: z.number().int().min(0),
  total_operations_so_far: z.number().int().min(0),
  max_iterations_reached: z.boolean()
})

// Schema for the new operations-based headings response with iteration support
export const headingsResponseSchema = z.object({
  operations: z.array(headingOperationSchema),
  more_changes_required: z.boolean(),
  iteration_summary: z.string(),
  safety_check: safetyCheckSchema
})

// Legacy schema removed - using operations-based format only

// Schema for headings prompt input with iteration support
const headingsPromptSchema = z.object({
  html_content: z.string().min(1, 'HTML content cannot be empty'),
  documentId: z.string().uuid().optional(),
  iteration_count: z.number().int().min(0).optional(),
  previous_iteration_summary: z.string().optional(),
  MAX_HEADING_OPERATIONS_PER_ITERATION: z.number().int().min(1).optional()
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

// Export types
export type HeadingOperation = z.infer<typeof headingOperationSchema>