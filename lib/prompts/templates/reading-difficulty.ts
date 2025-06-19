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
    model: 'anthropic-balanced',
    maxTokens: 500, // Concise output expected
    temperature: 0.1, // Low temperature for consistent classification
  }
)

// Utility function to parse LLM response
export function parseReadingDifficultyResponse(response: string): ReadingDifficultyOutput {
  try {
    const lines = response.trim().split('\n')
    
    const levelMatch = lines.find(line => line.startsWith('LEVEL:'))?.split('LEVEL:')[1]?.trim()
    const confidenceMatch = lines.find(line => line.startsWith('CONFIDENCE:'))?.split('CONFIDENCE:')[1]?.trim()
    const factorsMatch = lines.find(line => line.startsWith('FACTORS:'))?.split('FACTORS:')[1]?.trim()
    
    if (!levelMatch || !confidenceMatch || !factorsMatch) {
      throw new Error(`Invalid reading difficulty response format. Expected LEVEL, CONFIDENCE, and FACTORS lines. Got: ${response}`)
    }
    
    const factors = factorsMatch.split(';').map(f => f.trim()).filter(f => f.length > 0)
    
    if (factors.length < 2) {
      throw new Error(`Expected at least 2 factors, got ${factors.length}: ${factorsMatch}`)
    }
    
    return readingDifficultyOutputSchema.parse({
      level: levelMatch,
      confidence: confidenceMatch,
      factors
    })
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to parse reading difficulty response: ${error.message}`)
    }
    throw new Error(`Failed to parse reading difficulty response: ${String(error)}`)
  }
}