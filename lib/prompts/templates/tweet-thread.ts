/**
 * Tweet Thread Prompt Template
 * 
 * This template generates tweet threads from academic papers and complex documents,
 * transforming them into digestible, Twitter-style threads while maintaining academic rigor.
 * 
 * The prompt focuses on:
 * - Academic audience (researchers, students, educated general readers)
 * - Clear narrative structure (hook → context → findings → implications)
 * - 280-character limit per tweet for authenticity
 * - Visual formatting with line breaks and bullet points
 * - Scientific accuracy without oversimplification
 * 
 * Based on research into academic Twitter best practices from Nature, PLOS,
 * and academic communication guidelines.
 */

import { z } from 'zod'
import { loadPromptTemplateFromCaller } from '../types'

// Define the tweet schema for individual tweets
export const tweetSchema = z.object({
  number: z.number().positive(),
  text: z.string().max(280, 'Tweet must be 280 characters or less')
})

// Schema for the tweet thread response
export const tweetThreadResponseSchema = z.object({
  tweets: z.array(tweetSchema).min(1, 'Thread must contain at least one tweet'),
  thread_summary: z.string().min(1, 'Thread summary is required'),
  metadata: z.record(z.any()).optional(),
  cached: z.boolean().optional()
})

// Schema for tweet thread prompt input
const tweetThreadPromptSchema = z.object({
  content: z.string().min(100, 'Content must be substantial enough for thread generation'),
  target_length: z.number()
    .min(3, 'Thread should be at least 3 tweets')
    .max(20, 'Thread should not exceed 25 tweets')
    .default(12), // Based on research: 10-15 tweets optimal for academic content
  documentId: z.string().uuid('documentId must be a valid UUID')
})

// Load the tweet thread prompt template
export const tweetThreadPrompt = loadPromptTemplateFromCaller(
  'tweet-thread.njk',
  tweetThreadPromptSchema,
  {
    maxTokens: 4000, // Generous limit for thread generation
    temperature: 0.4, // Balanced creativity and consistency for engaging but accurate content
    modelString: 'anthropic-balanced-thinking', // Use thinking mode for better tweet thread structure and narrative flow
  }
)
// Alternative: Use all defaults (including model)
// export const tweetThreadPrompt = loadPromptTemplateFromCaller(
//   'tweet-thread.njk',
//   tweetThreadPromptSchema
// )

// Export schemas for use in the API
export const tweetThreadPromptInputSchema = tweetThreadPromptSchema

// Type definitions for easier usage
export type TweetThreadInput = z.infer<typeof tweetThreadPromptSchema>
export type TweetThreadResponse = z.infer<typeof tweetThreadResponseSchema>
export type Tweet = z.infer<typeof tweetSchema>