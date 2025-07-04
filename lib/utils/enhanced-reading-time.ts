/**
 * Enhanced Reading Time Calculation
 * 
 * Implements evidence-based reading time estimation using AI academic complexity levels
 * with research-backed multipliers from comprehensive parallel research (June 2025).
 * 
 * See: docs/reference/RESEARCH_READING_SPEED_COMPLEXITY_ADJUSTMENTS.md
 * See: docs/planning/250614a_document_metadata_tab_implementation.md (Stage 7)
 */

// Research-backed baseline from Brysbaert 2019 meta-analysis (18,573 participants)
const BASE_WPM = 238;

// Evidence-based multipliers for AI academic difficulty levels
const ACADEMIC_LEVEL_MULTIPLIERS = {
  'High school or below': 1.0,      // 238 WPM - Accessible content maintains baseline
  'Undergraduate': 0.80,            // 190 WPM - 20% reduction for academic vocabulary + cognitive load  
  'Masters/PhD': 0.65,              // 155 WPM - 35% reduction for complex syntax + specialized terminology
  'Post-doctoral/expert': 0.55,     // 131 WPM - 45% reduction for dense theoretical content
} as const;

// Conservative fallback for unknown academic levels
const DEFAULT_MULTIPLIER = 0.80; // Undergraduate level fallback

export type AcademicLevel = keyof typeof ACADEMIC_LEVEL_MULTIPLIERS;

export interface ReadingDifficultyData {
  level: string;
  confidence: string | number; // Can be 'High'/'Medium'/'Low' or numeric 0.0-1.0
  factors?: string[];
}

export interface EnhancedReadingTimeResult {
  readingTimeMinutes: number;
  effectiveWPM: number;
  breakdown: {
    wordCount: number;
    baseWPM: number;
    academicLevel: string;
    confidenceLevel: string;
    multiplier: number;
    adjustedMultiplier: number;
    confidenceWeight: number;
  };
}

/**
 * Convert confidence to numeric value for calculations
 */
function normalizeConfidence(confidence: string | number): number {
  if (typeof confidence === 'number') {
    return Math.max(0, Math.min(1, confidence)); // Clamp to 0-1 range
  }
  
  // Convert string confidence to numeric
  switch (confidence.toLowerCase()) {
    case 'high': return 0.9;
    case 'medium': return 0.7;
    case 'low': return 0.5;
    default: return 0.7; // Default to medium confidence
  }
}

/**
 * Get reading speed multiplier for academic level
 */
function getReadingSpeedMultiplier(academicLevel: string): number {
  return ACADEMIC_LEVEL_MULTIPLIERS[academicLevel as AcademicLevel] ?? DEFAULT_MULTIPLIER;
}

/**
 * Calculate enhanced reading time using AI academic complexity assessment
 * 
 * @param wordCount - Number of words in the document
 * @param readingDifficulty - AI-assessed reading difficulty data (optional)
 * @returns Enhanced reading time calculation with detailed breakdown
 */
export function calculateEnhancedReadingTime(
  wordCount: number,
  readingDifficulty?: ReadingDifficultyData | null
): EnhancedReadingTimeResult {
  // Validate inputs
  if (wordCount <= 0) {
    throw new Error('Word count must be greater than 0');
  }

  // Default to undergraduate level if no reading difficulty data
  const academicLevel = readingDifficulty?.level ?? 'Undergraduate';
  const confidenceValue = readingDifficulty?.confidence ?? 'Medium';
  
  // Get base multiplier for academic level
  const baseMultiplier = getReadingSpeedMultiplier(academicLevel);
  
  // Normalize confidence to 0-1 range
  const confidenceWeight = normalizeConfidence(confidenceValue);
  
  // Apply confidence weighting to reduce adjustment magnitude for low-confidence assessments
  // Formula: adjustedMultiplier = 1.0 - ((1.0 - multiplier) * confidenceWeight)
  // This reduces the impact of the multiplier when confidence is low
  const adjustedMultiplier = 1.0 - ((1.0 - baseMultiplier) * confidenceWeight);
  
  // Calculate effective words per minute
  const effectiveWPM = BASE_WPM * adjustedMultiplier;
  
  // Calculate reading time in minutes (rounded up)
  const readingTimeMinutes = Math.ceil(wordCount / effectiveWPM);
  
  return {
    readingTimeMinutes,
    effectiveWPM: Math.round(effectiveWPM),
    breakdown: {
      wordCount,
      baseWPM: BASE_WPM,
      academicLevel,
      confidenceLevel: typeof confidenceValue === 'string' ? confidenceValue : 
        confidenceValue >= 0.8 ? 'High' : confidenceValue >= 0.6 ? 'Medium' : 'Low',
      multiplier: baseMultiplier,
      adjustedMultiplier,
      confidenceWeight
    }
  };
}

/**
 * Generate detailed tooltip content explaining the calculation
 */
export function generateReadingTimeTooltip(result: EnhancedReadingTimeResult): string {
  const { breakdown } = result;
  
  return `Reading Time: ${result.readingTimeMinutes} minutes

Calculated using:
• Word count: ${breakdown.wordCount.toLocaleString()} words
• Base reading speed: ${breakdown.baseWPM} WPM (research-backed)
• Academic level: ${breakdown.academicLevel} (confidence: ${breakdown.confidenceLevel.toLowerCase()})
• Adjusted speed: ${result.effectiveWPM} WPM

This estimate uses AI-powered complexity assessment and accounts for academic reading patterns. Individual reading speeds vary significantly.`;
}

/**
 * Legacy compatibility function - calculates simple reading time
 * Used for documents without reading difficulty assessment
 */
export function calculateSimpleReadingTime(wordCount: number, wordsPerMinute: number = BASE_WPM): number {
  if (wordCount <= 0) return 0;
  return Math.ceil(wordCount / wordsPerMinute);
}