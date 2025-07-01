import { z } from 'zod'
import { loadPromptTemplateFromCaller } from '@/lib/prompts/types'

// Schema for reading difficulty assessment input
const readingDifficultySchema = z.object({
  content: z.string().min(50, 'Content must be at least 50 characters to assess difficulty'),
})

// Expected output format validation
export const readingDifficultyOutputSchema = z.object({
  rationale: z.string().min(10, 'Rationale must be at least 10 characters'),
  level: z.enum(['High school or below', 'Undergraduate', 'Masters/PhD', 'Post-doctoral/expert']),
  confidence: z.number().min(0).max(1)
})

export type ReadingDifficultyOutput = z.infer<typeof readingDifficultyOutputSchema>

// Load the template with validation
export const readingDifficultyPrompt = loadPromptTemplateFromCaller(
  'reading-difficulty.njk',
  readingDifficultySchema,
  {
    // Use balanced model for accuracy and reliability
    modelString: 'anthropic-balanced',
    maxTokens: 500, // Concise output expected
    temperature: 0.1, // Low temperature for consistent classification
  }
)

// Utility function to parse LLM response
export function parseReadingDifficultyResponse(response: string): ReadingDifficultyOutput {
  try {
    // Extract JSON from response (in case there's markdown formatting)
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/(\{[\s\S]*\})/)
    const jsonString = jsonMatch ? jsonMatch[1] : response.trim()
    
    const parsed = JSON.parse(jsonString)
    return readingDifficultyOutputSchema.parse(parsed)
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to parse reading difficulty response: ${error.message}`)
    }
    throw new Error(`Failed to parse reading difficulty response: ${String(error)}`)
  }
}