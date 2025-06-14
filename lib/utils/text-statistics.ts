/**
 * Text Statistics Utility
 * 
 * Provides consistent word counting and text statistics across the application.
 * Uses the same word extraction logic as readability metrics for consistency.
 */

import { extractCleanText } from './html-text-extraction'

/**
 * Extract words from text using proper word boundary detection
 * More accurate than simple whitespace splitting
 */
export function extractWords(text: string): string[] {
  return text.match(/\b[a-zA-Z0-9]+\b/g) || []
}

/**
 * Count words in text
 */
export function countWords(text: string): number {
  return extractWords(text).length
}

/**
 * Count words in HTML content (extracts text first)
 */
export function countWordsInHtml(htmlContent: string): number {
  const cleanText = extractCleanText(htmlContent)
  return countWords(cleanText)
}

/**
 * Calculate comprehensive text statistics
 */
export function calculateTextStats(text: string): {
  wordCount: number
  characterCount: number
  readingTimeMinutes: number
} {
  const wordCount = countWords(text)
  const characterCount = text.length
  const readingTimeMinutes = Math.ceil(wordCount / 225) // 225 words per minute
  
  return {
    wordCount,
    characterCount,
    readingTimeMinutes
  }
}