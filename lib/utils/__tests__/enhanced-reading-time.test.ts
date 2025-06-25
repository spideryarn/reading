/**
 * @jest-environment jsdom
 */

import { 
  calculateEnhancedReadingTime, 
  generateReadingTimeTooltip,
  calculateSimpleReadingTime,
  type ReadingDifficultyData 
} from '../enhanced-reading-time'

describe('calculateEnhancedReadingTime', () => {
  const SAMPLE_WORD_COUNT = 1190 // Represents a typical document

  describe('Basic functionality', () => {
    test('should calculate reading time with default parameters', () => {
      const result = calculateEnhancedReadingTime(SAMPLE_WORD_COUNT)
      
      expect(result.readingTimeMinutes).toBeGreaterThan(0)
      expect(result.effectiveWPM).toBeGreaterThan(0)
      expect(result.breakdown.wordCount).toBe(SAMPLE_WORD_COUNT)
      expect(result.breakdown.baseWPM).toBe(238) // Research-backed baseline
      expect(result.breakdown.academicLevel).toBe('Undergraduate') // Default fallback
    })

    test('should throw error for invalid word count', () => {
      expect(() => calculateEnhancedReadingTime(0)).toThrow('Word count must be greater than 0')
      expect(() => calculateEnhancedReadingTime(-5)).toThrow('Word count must be greater than 0')
    })

    test('should handle missing reading difficulty data gracefully', () => {
      const result = calculateEnhancedReadingTime(SAMPLE_WORD_COUNT, null)
      
      expect(result.breakdown.academicLevel).toBe('Undergraduate')
      expect(result.breakdown.confidenceLevel).toBe('Medium')
    })
  })

  describe('Academic level multipliers', () => {
    const academicLevels = [
      { level: 'High school or below', expectedMultiplier: 1.0 },
      { level: 'Undergraduate', expectedMultiplier: 0.80 },
      { level: 'Masters/PhD', expectedMultiplier: 0.65 },
      { level: 'Post-doctoral/expert', expectedMultiplier: 0.55 }
    ]

    academicLevels.forEach(({ level, expectedMultiplier }) => {
      test(`should apply correct multiplier for ${level}`, () => {
        const difficulty: ReadingDifficultyData = {
          level,
          confidence: 'High',
          factors: []
        }
        
        const result = calculateEnhancedReadingTime(SAMPLE_WORD_COUNT, difficulty)
        
        expect(result.breakdown.multiplier).toBe(expectedMultiplier)
        expect(result.breakdown.academicLevel).toBe(level)
        
        // Calculate expected values accounting for confidence weighting
        // High confidence = 0.9, so adjustedMultiplier = 1.0 - ((1.0 - multiplier) * 0.9)
        const confidenceWeight = 0.9
        const adjustedMultiplier = 1.0 - ((1.0 - expectedMultiplier) * confidenceWeight)
        const expectedWPM = Math.round(238 * adjustedMultiplier)
        const expectedReadingTime = Math.ceil(SAMPLE_WORD_COUNT / (238 * adjustedMultiplier))
        
        expect(result.effectiveWPM).toBe(expectedWPM)
        expect(result.readingTimeMinutes).toBe(expectedReadingTime)
      })
    })

    test('should use conservative fallback for unknown academic level', () => {
      const difficulty: ReadingDifficultyData = {
        level: 'Unknown Academic Level',
        confidence: 'High'
      }
      
      const result = calculateEnhancedReadingTime(SAMPLE_WORD_COUNT, difficulty)
      
      expect(result.breakdown.multiplier).toBe(0.80) // Default multiplier
      expect(result.breakdown.academicLevel).toBe('Unknown Academic Level')
    })
  })

  describe('Confidence weighting', () => {
    const confidenceTests = [
      { confidence: 'High', expectedNumeric: 0.9 },
      { confidence: 'Medium', expectedNumeric: 0.7 },
      { confidence: 'Low', expectedNumeric: 0.5 },
      { confidence: 0.9, expectedNumeric: 0.9 },
      { confidence: 0.5, expectedNumeric: 0.5 },
      { confidence: 1.2, expectedNumeric: 1.0 }, // Should clamp to 1.0
      { confidence: -0.1, expectedNumeric: 0.0 }  // Should clamp to 0.0
    ]

    confidenceTests.forEach(({ confidence, expectedNumeric }) => {
      test(`should handle confidence: ${confidence}`, () => {
        const difficulty: ReadingDifficultyData = {
          level: 'Masters/PhD',
          confidence
        }
        
        const result = calculateEnhancedReadingTime(SAMPLE_WORD_COUNT, difficulty)
        
        expect(result.breakdown.confidenceWeight).toBeCloseTo(expectedNumeric, 1)
        
        // Verify confidence weighting formula: adjustedMultiplier = 1.0 - ((1.0 - multiplier) * confidenceWeight)
        const baseMultiplier = 0.65 // Masters/PhD multiplier
        const expectedAdjusted = 1.0 - ((1.0 - baseMultiplier) * expectedNumeric)
        expect(result.breakdown.adjustedMultiplier).toBeCloseTo(expectedAdjusted, 3)
      })
    })

    test('should reduce adjustment for low confidence', () => {
      const highConfidence: ReadingDifficultyData = {
        level: 'Post-doctoral/expert',
        confidence: 'High'
      }
      
      const lowConfidence: ReadingDifficultyData = {
        level: 'Post-doctoral/expert', 
        confidence: 'Low'
      }
      
      const highResult = calculateEnhancedReadingTime(SAMPLE_WORD_COUNT, highConfidence)
      const lowResult = calculateEnhancedReadingTime(SAMPLE_WORD_COUNT, lowConfidence)
      
      // Low confidence should result in higher effective WPM (less adjustment)
      expect(lowResult.effectiveWPM).toBeGreaterThan(highResult.effectiveWPM)
      expect(lowResult.readingTimeMinutes).toBeLessThanOrEqual(highResult.readingTimeMinutes)
    })
  })

  describe('Edge cases and realistic scenarios', () => {
    test('should handle very short documents', () => {
      const result = calculateEnhancedReadingTime(50) // 50 words
      
      expect(result.readingTimeMinutes).toBe(1) // Should always be at least 1 minute
      expect(result.breakdown.wordCount).toBe(50)
    })

    test('should handle very long documents', () => {
      const result = calculateEnhancedReadingTime(50000) // 50k words - book-length
      
      expect(result.readingTimeMinutes).toBeGreaterThan(100)
      expect(result.effectiveWPM).toBeGreaterThan(0)
    })

    test('should produce reasonable estimates for typical academic papers', () => {
      const difficulty: ReadingDifficultyData = {
        level: 'Masters/PhD',
        confidence: 'High'
      }
      
      // Typical research paper: 8000 words
      const result = calculateEnhancedReadingTime(8000, difficulty)
      
      // Should take significantly longer than simple calculation
      const simpleTime = Math.ceil(8000 / 238)
      expect(result.readingTimeMinutes).toBeGreaterThan(simpleTime)
      
      // Should be reasonable for academic content (not extreme)
      expect(result.readingTimeMinutes).toBeLessThan(120) // Less than 2 hours
      expect(result.readingTimeMinutes).toBeGreaterThan(30) // More than 30 minutes
    })

    test('should maintain consistency across multiple calls', () => {
      const difficulty: ReadingDifficultyData = {
        level: 'Undergraduate',
        confidence: 'Medium'
      }
      
      const result1 = calculateEnhancedReadingTime(SAMPLE_WORD_COUNT, difficulty)
      const result2 = calculateEnhancedReadingTime(SAMPLE_WORD_COUNT, difficulty)
      
      expect(result1).toEqual(result2)
    })
  })

  describe('Performance requirements', () => {
    test('should complete calculation within 100ms', () => {
      const startTime = performance.now()
      
      calculateEnhancedReadingTime(10000, {
        level: 'Masters/PhD',
        confidence: 'High',
        factors: ['Complex terminology', 'Dense theoretical content']
      })
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      expect(duration).toBeLessThan(100) // Should complete within 100ms
    })
  })
})

describe('generateReadingTimeTooltip', () => {
  test('should generate formatted tooltip with all calculation details', () => {
    const mockResult = {
      readingTimeMinutes: 6,
      effectiveWPM: 155,
      breakdown: {
        wordCount: 1000,
        baseWPM: 238,
        academicLevel: 'Masters/PhD',
        confidenceLevel: 'High',
        multiplier: 0.65,
        adjustedMultiplier: 0.65,
        confidenceWeight: 0.9
      }
    }
    
    const tooltip = generateReadingTimeTooltip(mockResult)
    
    expect(tooltip).toContain('Reading Time: 6 minutes')
    expect(tooltip).toContain('Word count: 1,000 words')
    expect(tooltip).toContain('Base reading speed: 238 WPM')
    expect(tooltip).toContain('Academic level: Masters/PhD')
    expect(tooltip).toContain('confidence: high')
    expect(tooltip).toContain('Adjusted speed: 155 WPM')
    expect(tooltip).toContain('Individual reading speeds vary significantly')
  })

  test('should format large word counts with commas', () => {
    const mockResult = {
      readingTimeMinutes: 42,
      effectiveWPM: 190,
      breakdown: {
        wordCount: 12543,
        baseWPM: 238,
        academicLevel: 'Undergraduate',
        confidenceLevel: 'Medium',
        multiplier: 0.80,
        adjustedMultiplier: 0.80,
        confidenceWeight: 0.7
      }
    }
    
    const tooltip = generateReadingTimeTooltip(mockResult)
    
    expect(tooltip).toContain('12,543 words')
  })
})

describe('calculateSimpleReadingTime', () => {
  test('should calculate simple reading time with default WPM', () => {
    const result = calculateSimpleReadingTime(238)
    expect(result).toBe(1) // 238 words at 238 WPM = 1 minute
  })

  test('should calculate simple reading time with custom WPM', () => {
    const result = calculateSimpleReadingTime(450, 225)
    expect(result).toBe(2) // 450 words at 225 WPM = 2 minutes
  })

  test('should handle zero word count', () => {
    const result = calculateSimpleReadingTime(0)
    expect(result).toBe(0)
  })

  test('should round up partial minutes', () => {
    const result = calculateSimpleReadingTime(100, 238) // Should be less than 1 minute
    expect(result).toBe(1) // Should round up to 1 minute
  })
})