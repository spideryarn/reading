/**
 * Centralized reading time calculation utilities
 * 
 * This module provides consistent reading time calculation across the application.
 * Both MetadataPanel and document tooltips use this exact same machinery.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { EnhancementService } from '@/lib/services/database/enhancements'
import { calculateEnhancedReadingTime, type ReadingDifficultyData } from '@/lib/utils/enhanced-reading-time'
import type { Database } from '@/lib/types/database'

export interface ReadingTimeResult {
  readingTimeMinutes: number
  enhancedReadingTime: ReturnType<typeof calculateEnhancedReadingTime> | null
  wordCount: number
  readingDifficulty: ReadingDifficultyData | null
}

// Custom error indicating that a reading‐difficulty enhancement has not yet been generated
export class MissingReadingDifficultyError extends Error {
  constructor(documentId: string) {
    super(`Reading difficulty assessment is missing for document ${documentId}`)
    this.name = 'MissingReadingDifficultyError'
  }
}

/**
 * Calculate reading time from a word count (for use with database word_count field)
 * 
 * This function uses the exact same reading difficulty lookup and calculation
 * as MetadataPanel to ensure perfect consistency.
 */
export async function calculateReadingTimeFromWordCount(
  wordCount: number,
  documentId: string,
  supabaseClient: SupabaseClient<Database>
): Promise<ReadingTimeResult> {
  if (wordCount <= 0) {
    throw new Error(`Invalid word count ${wordCount} for document ${documentId}`)
  }

  // Get reading difficulty assessment using the same logic as MetadataPanel
  let readingDifficulty: ReadingDifficultyData | null = null
  
  try {
    const enhancementService = new EnhancementService(supabaseClient)
    
    const existingDifficulty = await enhancementService.get(
      documentId, 
      'reading_difficulty', 
      'ai_assessment'
    )
    
    if (existingDifficulty) {
      // Use cached result from database (same format as MetadataPanel)
      const content = existingDifficulty.content as { level: string; confidence: number; factors: string[] }
      readingDifficulty = {
        level: content.level,
        confidence: content.confidence >= 0.8 ? 'High' : content.confidence >= 0.6 ? 'Medium' : 'Low',
        factors: content.factors || []
      }
    } else {
      // No enhancement exists – signal to caller so UI can trigger generation.
      throw new MissingReadingDifficultyError(documentId)
    }
  } catch (error) {
    // Preserve specific error for caller to handle (e.g., to trigger generation)
    if (error instanceof MissingReadingDifficultyError) {
      throw error
    }

    // Log the error clearly and rethrow a generic lookup failure for unexpected errors
    console.error(`Failed to fetch reading difficulty for document ${documentId}:`, error)
    throw new Error(
      `Reading difficulty lookup failed for document ${documentId}: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }

  // Calculate enhanced reading time (readingDifficulty is guaranteed to exist here)
  const enhancedReadingTime = calculateEnhancedReadingTime(wordCount, readingDifficulty as ReadingDifficultyData)
  
  return {
    readingTimeMinutes: enhancedReadingTime.readingTimeMinutes,
    enhancedReadingTime,
    wordCount,
    readingDifficulty: readingDifficulty as ReadingDifficultyData
  }
}

/**
 * Format reading time for display (matches MetadataPanel format)
 */
export function formatReadingTime(readingTimeMinutes: number): string {
  if (readingTimeMinutes === 1) {
    return '1 min'
  } else {
    return `${readingTimeMinutes} mins`
  }
}