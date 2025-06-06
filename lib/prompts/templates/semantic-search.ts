/**
 * Semantic Search Prompt Template
 * 
 * Identifies document elements that are semantically relevant to user search queries.
 * Uses annotated document format to preserve element ID mappings for navigation.
 * 
 * Key behaviors:
 * - Conservative matching to avoid false positives (confidence threshold > 0.5)
 * - Semantic analysis beyond exact keyword matching
 * - Returns structured results with element IDs for navigation integration
 * - Provides reasoning and relevant text excerpts for transparency
 * - Focuses on themes, concepts, and contextual relationships
 */

import { z } from 'zod'
import { loadPromptTemplateFromCaller } from '../types'

// Individual match result schema
const semanticMatchSchema = z.object({
  elementId: z.string().min(1, 'Element ID cannot be empty'),
  confidence: z.number().min(0).max(1, 'Confidence must be between 0 and 1'),
  reasoning: z.string().min(1, 'Reasoning cannot be empty'),
  relevantText: z.string().min(1, 'Relevant text cannot be empty')
})

// Response schema (what the LLM returns)
export const semanticSearchResponseSchema = z.object({
  matches: z.array(semanticMatchSchema)
})

// Input schema (what gets passed to the template)
const semanticSearchPromptSchema = z.object({
  content: z.string().min(1, 'Document content cannot be empty'),
  query: z.string().min(1, 'Search query cannot be empty'),
  documentId: z.string().optional() // For future use in database caching
})

// Export input schema for API validation
export const semanticSearchPromptInputSchema = semanticSearchPromptSchema

// Export individual schemas for testing and validation
export { semanticMatchSchema }

// Load template with configuration
export const semanticSearchPrompt = loadPromptTemplateFromCaller(
  'semantic-search.njk',
  semanticSearchPromptSchema,
  {
    maxTokens: 4000, // Conservative limit for semantic analysis responses
    temperature: 0.3, // Slight creativity for semantic connections while maintaining consistency
    // Uses default model (anthropic-balanced) for good semantic understanding
  }
)