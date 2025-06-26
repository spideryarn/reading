/**
 * Glossary Prompt Template
 * 
 * This template extracts key entities from documents to create a glossary.
 * Entities include people, concepts, places, events, and other important terms
 * that help readers understand the document.
 * 
 * The prompt is adapted from the previous Spideryarn implementation's
 * generate_entities prompt, which proved effective at comprehensive entity extraction.
 */

import { z } from 'zod'
import { loadPromptTemplateFromCaller } from '../types'

// Define the entity schema for validation
export const entitySchema = z.object({
  name: z.string(),
  ontology: z.enum([
    'person', 'place', 'date', 'theme', 'event', 
    'reference', 'object', 'organization', 'concept', 
    'definition', 'other'
  ]),
  aliases: z.array(z.string()),
  brief_explanation: z.string(), // Markdown formatted
  long_explanation: z.string().optional(), // Markdown formatted
  datetime: z.string().optional(),
  url: z.string().url().optional(),
  extra: z.record(z.any()).optional(),
  // Optional scoring fields for difficulty and centrality
  difficulty: z.number().min(0).max(1).optional(), // 0-1 scale: 0=common knowledge, 1=expert knowledge
  centrality: z.number().min(0).max(1).optional() // 0-1 scale: 0=minor relevance, 1=central to document
})

// Schema for the glossary response
export const glossaryResponseSchema = z.object({
  entities: z.array(entitySchema),
  more_entities_available: z.boolean()
})

// Schema for glossary prompt input
const glossaryPromptSchema = z.object({
  content: z.string().min(1, 'Content cannot be empty'),
  already_entities: z.array(z.object({
    name: z.string(),
    aliases: z.array(z.string())
  })).optional(),
  documentId: z.string().uuid().optional(), // Optional for backward compatibility
  max_entities: z.number().int().positive().optional(), // Maximum entities to generate
  existing_entities: z.array(entitySchema).optional(), // Full entity objects for "generate more" mode
  include_scoring: z.boolean().optional() // Whether to include difficulty and centrality scoring
})

// Load the glossary prompt template
export const glossaryPrompt = loadPromptTemplateFromCaller(
  'glossary.njk',
  glossaryPromptSchema, // Use input schema, not response schema
  {
    maxTokens: 8000, // Works with all Claude models (Haiku max is 8192)
    temperature: 0.3, // Lower temperature for more consistent extraction
  }
)

// Export schemas for use in the API
export const glossaryPromptInputSchema = glossaryPromptSchema