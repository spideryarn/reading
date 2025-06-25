/**
 * Utility functions for semantic highlighting with confidence-based visual intensity
 * 
 * Generates inline styles for semantic highlighting based on confidence scores
 * Uses Spideryarn orange color scheme with continuous opacity scaling
 * 
 * See docs/reference/TOOL_HIGHLIGHT.md for complete semantic highlighting system documentation
 */

/**
 * Generates inline styles for semantic highlighting based on confidence percentage
 * 
 * @param confidence - Confidence score as a percentage (0-100)
 * @returns Object with CSS styles for background and border with scaled opacity
 */
export function getSemanticHighlightStyles(confidence: number): React.CSSProperties {
  // Normalize confidence to 0-100 range
  const normalizedConfidence = Math.max(0, Math.min(100, confidence))
  
  // Convert to 0-1 opacity range
  const opacity = normalizedConfidence / 100
  
  // Scale border opacity slightly higher for visibility
  const borderOpacity = Math.min(1, opacity * 1.5)
  
  return {
    backgroundColor: `rgba(219, 138, 69, ${opacity})`,
    borderLeft: `2px solid rgba(219, 138, 69, ${borderOpacity})`
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
 * Legacy function: Gets all semantic highlight class names for testing and reference
 * 
 * @deprecated Use getSemanticHighlightStyles() for new percentage-based highlighting
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
export function testConfidenceMapping(): Array<{confidence: number, styles: React.CSSProperties, intensity: string}> {
  const testValues = [0, 10, 25, 45, 65, 85, 100]
  
  return testValues.map(confidence => ({
    confidence,
    styles: getSemanticHighlightStyles(confidence),
    intensity: getSemanticHighlightIntensity(confidence)
  }))
}