/**
 * Readability Metrics Calculator
 * 
 * Provides functions to calculate various readability scores including:
 * - Flesch Reading Ease
 * - Flesch-Kincaid Grade Level
 * 
 * These metrics help users understand the complexity and difficulty level
 * of document content.
 */

/**
 * Count syllables in a word using a simple heuristic approach
 * This is an approximation but works well for English text
 */
function countSyllables(word: string): number {
  word = word.toLowerCase()
  
  // Handle edge cases
  if (word.length <= 3) return 1
  
  // Remove silent e at the end
  word = word.replace(/e$/, '')
  
  // Count vowel groups (consecutive vowels count as one syllable)
  const vowelGroups = word.match(/[aeiouy]+/g) || []
  let syllableCount = vowelGroups.length
  
  // Adjust for common patterns
  // Words ending in 'le' often have an extra syllable
  if (word.endsWith('le') && word.length > 2) {
    syllableCount++
  }
  
  // Ensure at least one syllable
  return Math.max(1, syllableCount)
}

/**
 * Count sentences in text using punctuation markers
 */
function countSentences(text: string): number {
  // Match sentences ending with . ! ? followed by space or end of string
  // Also handle ellipsis (...) as one sentence marker
  const sentences = text.match(/[.!?]+[\s]|[.!?]+$/g) || []
  return Math.max(1, sentences.length)
}

/**
 * Extract words from text (alphanumeric sequences)
 */
function extractWords(text: string): string[] {
  return text.match(/\b[a-zA-Z0-9]+\b/g) || []
}

/**
 * Calculate text statistics needed for readability formulas
 */
export function calculateTextStatistics(text: string): {
  totalWords: number
  totalSentences: number
  totalSyllables: number
  averageWordsPerSentence: number
  averageSyllablesPerWord: number
} {
  const words = extractWords(text)
  const totalWords = words.length
  const totalSentences = countSentences(text)
  
  // Count total syllables
  const totalSyllables = words.reduce((sum, word) => sum + countSyllables(word), 0)
  
  // Calculate averages
  const averageWordsPerSentence = totalWords / totalSentences
  const averageSyllablesPerWord = totalSyllables / totalWords
  
  return {
    totalWords,
    totalSentences,
    totalSyllables,
    averageWordsPerSentence,
    averageSyllablesPerWord
  }
}

/**
 * Calculate Flesch Reading Ease score
 * 
 * Score interpretation:
 * 90-100: Very Easy (5th grade)
 * 80-90: Easy (6th grade)
 * 70-80: Fairly Easy (7th grade)
 * 60-70: Standard (8th-9th grade)
 * 50-60: Fairly Difficult (10th-12th grade)
 * 30-50: Difficult (College)
 * 0-30: Very Difficult (College graduate)
 * 
 * Formula: 206.835 - 1.015(total words/total sentences) - 84.6(total syllables/total words)
 */
export function calculateFleschReadingEase(text: string): number {
  const stats = calculateTextStatistics(text)
  
  // Handle edge cases
  if (stats.totalWords === 0) return 100 // No text is "very easy"
  
  const score = 206.835 - 
    1.015 * stats.averageWordsPerSentence - 
    84.6 * stats.averageSyllablesPerWord
  
  // Clamp score between 0 and 100
  return Math.max(0, Math.min(100, score))
}

/**
 * Calculate Flesch-Kincaid Grade Level
 * 
 * Returns the U.S. school grade level required to understand the text
 * Formula: 0.39(total words/total sentences) + 11.8(total syllables/total words) - 15.59
 */
export function calculateFleschKincaidGradeLevel(text: string): number {
  const stats = calculateTextStatistics(text)
  
  // Handle edge cases
  if (stats.totalWords === 0) return 0
  
  const gradeLevel = 
    0.39 * stats.averageWordsPerSentence + 
    11.8 * stats.averageSyllablesPerWord - 
    15.59
  
  // Clamp between 0 and 18 (graduate level)
  return Math.max(0, Math.min(18, gradeLevel))
}

/**
 * Get human-readable interpretation of Flesch Reading Ease score
 */
export function interpretFleschReadingEase(score: number): {
  difficulty: string
  description: string
  gradeLevel: string
  comparison: string
} {
  if (score >= 90) {
    return {
      difficulty: 'Very Easy',
      description: 'Very easy to read. Easily understood by an average 11-year-old student.',
      gradeLevel: '5th grade',
      comparison: 'Comic books'
    }
  } else if (score >= 80) {
    return {
      difficulty: 'Easy',
      description: 'Easy to read. Conversational English for consumers.',
      gradeLevel: '6th grade',
      comparison: 'Consumer advertising'
    }
  } else if (score >= 70) {
    return {
      difficulty: 'Fairly Easy',
      description: 'Fairly easy to read.',
      gradeLevel: '7th grade',
      comparison: 'Harry Potter books'
    }
  } else if (score >= 60) {
    return {
      difficulty: 'Standard',
      description: 'Plain English. Easily understood by 13- to 15-year-old students.',
      gradeLevel: '8th-9th grade',
      comparison: 'Time magazine'
    }
  } else if (score >= 50) {
    return {
      difficulty: 'Fairly Difficult',
      description: 'Fairly difficult to read.',
      gradeLevel: '10th-12th grade',
      comparison: 'New York Times'
    }
  } else if (score >= 30) {
    return {
      difficulty: 'Difficult',
      description: 'Difficult to read. Best understood by university graduates.',
      gradeLevel: 'College',
      comparison: 'Harvard Business Review'
    }
  } else {
    return {
      difficulty: 'Very Difficult',
      description: 'Very difficult to read. Best understood by university graduates.',
      gradeLevel: 'College graduate',
      comparison: 'Academic journals'
    }
  }
}

/**
 * Get human-readable interpretation of Flesch-Kincaid Grade Level
 */
export function interpretFleschKincaidGradeLevel(gradeLevel: number): string {
  const rounded = Math.round(gradeLevel)
  
  if (rounded <= 0) return 'Kindergarten'
  if (rounded <= 12) {
    const suffix = getOrdinalSuffix(rounded)
    return `${rounded}${suffix} grade`
  }
  if (rounded <= 14) return 'College freshman'
  if (rounded <= 16) return 'College'
  return 'Graduate level'
}

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 */
function getOrdinalSuffix(num: number): string {
  const j = num % 10
  const k = num % 100
  
  if (j === 1 && k !== 11) return 'st'
  if (j === 2 && k !== 12) return 'nd'
  if (j === 3 && k !== 13) return 'rd'
  return 'th'
}

/**
 * Calculate comprehensive readability metrics for a text
 */
export function calculateReadabilityMetrics(text: string): {
  fleschReadingEase: {
    score: number
    interpretation: ReturnType<typeof interpretFleschReadingEase>
  }
  fleschKincaidGradeLevel: {
    score: number
    interpretation: string
  }
  statistics: ReturnType<typeof calculateTextStatistics>
} {
  const fleschEaseScore = calculateFleschReadingEase(text)
  const gradeLevel = calculateFleschKincaidGradeLevel(text)
  const statistics = calculateTextStatistics(text)
  
  return {
    fleschReadingEase: {
      score: Math.round(fleschEaseScore * 10) / 10, // Round to 1 decimal
      interpretation: interpretFleschReadingEase(fleschEaseScore)
    },
    fleschKincaidGradeLevel: {
      score: Math.round(gradeLevel * 10) / 10, // Round to 1 decimal
      interpretation: interpretFleschKincaidGradeLevel(gradeLevel)
    },
    statistics
  }
}