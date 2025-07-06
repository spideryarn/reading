import { z } from 'zod'

// Schema for heading content in insert/replace operations
const headingContentSchema = z.object({
  tag_name: z.enum(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'], {
    errorMap: () => ({ message: 'tag_name must be h1, h2, h3, h4, h5, or h6' }),
  }),
  content: z.string().min(1, 'Heading content cannot be empty'),
  // Optional deterministic ID assigned by the server when persisting the operation
  // or by the generation pipeline. Clients can rely on this to replay operations
  // faithfully without regenerating IDs.
  id: z.string().optional(),
})

// Base operation schema with action field
const baseOperationSchema = z.object({
  action: z.enum(['insert', 'replace', 'remove'], {
    errorMap: () => ({ message: 'action must be insert, replace, or remove' }),
  }),
})

// Schema for heading operations with conditional validation
export const headingOperationSchema = baseOperationSchema
  .extend({
    insertNewBeforeExistingId: z.string().optional(),
    targetId: z.string().optional(),
    content: headingContentSchema.optional(),
  })
  .refine(
    (data) => {
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
    },
    (data) => {
      if (data.action === 'insert') {
        if (!data.insertNewBeforeExistingId) {
          return {
            message: 'Insert operations require insertNewBeforeExistingId',
            path: ['insertNewBeforeExistingId'],
          }
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
    },
  )

// Schema for iteration safety check
const safetyCheckSchema = z.object({
  current_iteration: z.number().int().min(0),
  total_operations_so_far: z.number().int().min(0),
  max_iterations_reached: z.boolean(),
})

// Schema for the new operations-based headings response with iteration support
export const headingsResponseSchema = z.object({
  operations: z.array(headingOperationSchema),
  more_changes_required: z.boolean(),
  iteration_summary: z.string(),
  iteration_plan: z.string().optional(),
  safety_check: safetyCheckSchema,
})

// Schema for headings prompt input with iteration support
export const headingsPromptSchema = z.object({
  html_content: z.string().min(1, 'HTML content cannot be empty'),
  documentId: z.string().uuid().optional(),
  iteration_count: z.number().int().min(0).optional(),
  previous_iteration_summary: z.string().optional(),
  previous_iteration_plan: z.string().optional(),
  total_operations_so_far: z.number().int().min(0).optional(),
  MAX_HEADING_OPERATIONS_PER_ITERATION: z.number().int().min(1).optional(),
  MAX_ITERATIONS: z.number().int().min(1).optional(),
})

// Alias maintained for backwards-compatibility
export const headingsPromptInputSchema = headingsPromptSchema

// Types
export type HeadingOperation = z.infer<typeof headingOperationSchema> 