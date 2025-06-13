/**
 * Utility functions for semantic highlighting with confidence-based visual intensity
 * 
 * Maps confidence scores (0-100%) to CSS class names for visual highlighting
 * Uses Spideryarn orange color scheme with varying opacity and styling intensity
 */

/**
 * Maps a confidence percentage (0-100) to a semantic highlight CSS class name
 * 
 * @param confidence - Confidence score as a percentage (0-100)
 * @returns CSS class name for the appropriate highlight intensity level
 */
export function getSemanticHighlightClass(confidence: number): string {
  // Normalize confidence to 0-100 range
  const normalizedConfidence = Math.max(0, Math.min(100, confidence))
  
  if (normalizedConfidence >= 80) {
    return 'semantic-highlight-very-high'
  } else if (normalizedConfidence >= 60) {
    return 'semantic-highlight-high'
  } else if (normalizedConfidence >= 40) {
    return 'semantic-highlight-medium'
  } else if (normalizedConfidence >= 20) {
    return 'semantic-highlight-low'
  } else {
    return 'semantic-highlight-very-low'
  }
}

/**
 * Maps a confidence percentage to a human-readable intensity label
 * 
 * @param confidence - Confidence score as a percentage (0-100)
 * @returns Human-readable intensity level
 */
export function getSemanticHighlightIntensity(confidence: number): string {
  // Normalize confidence to 0-100 range
  const normalizedConfidence = Math.max(0, Math.min(100, confidence))
  
  if (normalizedConfidence >= 80) {
    return 'Very High'
  } else if (normalizedConfidence >= 60) {
    return 'High'
  } else if (normalizedConfidence >= 40) {
    return 'Medium'
  } else if (normalizedConfidence >= 20) {
    return 'Low'
  } else {
    return 'Very Low'
  }
}

/**
 * Gets all semantic highlight class names for testing and reference
 * 
 * @returns Array of all semantic highlight CSS class names
 */
export function getAllSemanticHighlightClasses(): string[] {
  return [
    'semantic-highlight-very-low',
    'semantic-highlight-low', 
    'semantic-highlight-medium',
    'semantic-highlight-high',
    'semantic-highlight-very-high'
  ]
}

/**
 * Confidence level thresholds for each intensity level
 */
export const SEMANTIC_HIGHLIGHT_THRESHOLDS = {
  VERY_HIGH: 80,
  HIGH: 60,
  MEDIUM: 40,
  LOW: 20,
  VERY_LOW: 0
} as const

/**
 * Test function to validate confidence mapping across the full range
 * Useful for development and testing
 */
export function testConfidenceMapping(): Array<{confidence: number, class: string, intensity: string}> {
  const testValues = [0, 10, 25, 45, 65, 85, 100]
  
  return testValues.map(confidence => ({
    confidence,
    class: getSemanticHighlightClass(confidence),
    intensity: getSemanticHighlightIntensity(confidence)
  }))
}