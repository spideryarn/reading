/**
 * @jest-environment jsdom
 */

import {
  getSemanticHighlightClass,
  getSemanticHighlightIntensity,
  getAllSemanticHighlightClasses,
  SEMANTIC_HIGHLIGHT_THRESHOLDS,
  testConfidenceMapping
} from '../semantic-highlighting'

describe('semantic-highlighting utilities', () => {
  describe('getSemanticHighlightClass', () => {
    it('should map confidence scores to correct CSS classes', () => {
      // Test boundary values and typical values
      expect(getSemanticHighlightClass(0)).toBe('semantic-highlight-very-low')
      expect(getSemanticHighlightClass(10)).toBe('semantic-highlight-very-low')
      expect(getSemanticHighlightClass(19)).toBe('semantic-highlight-very-low')
      
      expect(getSemanticHighlightClass(20)).toBe('semantic-highlight-low')
      expect(getSemanticHighlightClass(30)).toBe('semantic-highlight-low')
      expect(getSemanticHighlightClass(39)).toBe('semantic-highlight-low')
      
      expect(getSemanticHighlightClass(40)).toBe('semantic-highlight-medium')
      expect(getSemanticHighlightClass(50)).toBe('semantic-highlight-medium')
      expect(getSemanticHighlightClass(59)).toBe('semantic-highlight-medium')
      
      expect(getSemanticHighlightClass(60)).toBe('semantic-highlight-high')
      expect(getSemanticHighlightClass(70)).toBe('semantic-highlight-high')
      expect(getSemanticHighlightClass(79)).toBe('semantic-highlight-high')
      
      expect(getSemanticHighlightClass(80)).toBe('semantic-highlight-very-high')
      expect(getSemanticHighlightClass(90)).toBe('semantic-highlight-very-high')
      expect(getSemanticHighlightClass(100)).toBe('semantic-highlight-very-high')
    })

    it('should handle out-of-range values', () => {
      // Values below 0 should be clamped to very-low
      expect(getSemanticHighlightClass(-10)).toBe('semantic-highlight-very-low')
      expect(getSemanticHighlightClass(-1)).toBe('semantic-highlight-very-low')
      
      // Values above 100 should be clamped to very-high
      expect(getSemanticHighlightClass(110)).toBe('semantic-highlight-very-high')
      expect(getSemanticHighlightClass(200)).toBe('semantic-highlight-very-high')
    })

    it('should handle decimal values correctly', () => {
      expect(getSemanticHighlightClass(19.9)).toBe('semantic-highlight-very-low')
      expect(getSemanticHighlightClass(20.1)).toBe('semantic-highlight-low')
      expect(getSemanticHighlightClass(79.9)).toBe('semantic-highlight-high')
      expect(getSemanticHighlightClass(80.1)).toBe('semantic-highlight-very-high')
    })
  })

  describe('getSemanticHighlightIntensity', () => {
    it('should map confidence scores to correct intensity labels', () => {
      expect(getSemanticHighlightIntensity(0)).toBe('Very Low')
      expect(getSemanticHighlightIntensity(15)).toBe('Very Low')
      expect(getSemanticHighlightIntensity(25)).toBe('Low')
      expect(getSemanticHighlightIntensity(45)).toBe('Medium')
      expect(getSemanticHighlightIntensity(65)).toBe('High')
      expect(getSemanticHighlightIntensity(85)).toBe('Very High')
    })

    it('should handle boundary cases', () => {
      expect(getSemanticHighlightIntensity(20)).toBe('Low')
      expect(getSemanticHighlightIntensity(40)).toBe('Medium')
      expect(getSemanticHighlightIntensity(60)).toBe('High')
      expect(getSemanticHighlightIntensity(80)).toBe('Very High')
    })
  })

  describe('getAllSemanticHighlightClasses', () => {
    it('should return all highlight class names in order', () => {
      const classes = getAllSemanticHighlightClasses()
      expect(classes).toEqual([
        'semantic-highlight-very-low',
        'semantic-highlight-low',
        'semantic-highlight-medium',
        'semantic-highlight-high',
        'semantic-highlight-very-high'
      ])
    })

    it('should return exactly 5 classes', () => {
      expect(getAllSemanticHighlightClasses()).toHaveLength(5)
    })
  })

  describe('SEMANTIC_HIGHLIGHT_THRESHOLDS', () => {
    it('should have correct threshold values', () => {
      expect(SEMANTIC_HIGHLIGHT_THRESHOLDS.VERY_LOW).toBe(0)
      expect(SEMANTIC_HIGHLIGHT_THRESHOLDS.LOW).toBe(20)
      expect(SEMANTIC_HIGHLIGHT_THRESHOLDS.MEDIUM).toBe(40)
      expect(SEMANTIC_HIGHLIGHT_THRESHOLDS.HIGH).toBe(60)
      expect(SEMANTIC_HIGHLIGHT_THRESHOLDS.VERY_HIGH).toBe(80)
    })
  })

  describe('testConfidenceMapping', () => {
    it('should return correct mapping for test values', () => {
      const mapping = testConfidenceMapping()
      
      expect(mapping).toHaveLength(7)
      
      // Check specific mappings
      const zeroMapping = mapping.find(m => m.confidence === 0)
      expect(zeroMapping).toEqual({
        confidence: 0,
        class: 'semantic-highlight-very-low',
        intensity: 'Very Low'
      })

      const highMapping = mapping.find(m => m.confidence === 85)
      expect(highMapping).toEqual({
        confidence: 85,
        class: 'semantic-highlight-very-high',
        intensity: 'Very High'
      })
    })

    it('should cover all intensity levels', () => {
      const mapping = testConfidenceMapping()
      const intensities = mapping.map(m => m.intensity)
      
      expect(intensities).toContain('Very Low')
      expect(intensities).toContain('Low') 
      expect(intensities).toContain('Medium')
      expect(intensities).toContain('High')
      expect(intensities).toContain('Very High')
    })
  })

  describe('intensity distribution', () => {
    it('should have equal 20-point ranges for each intensity level', () => {
      const testCases = [
        { score: 10, expected: 'Very Low' },
        { score: 30, expected: 'Low' },
        { score: 50, expected: 'Medium' },
        { score: 70, expected: 'High' },
        { score: 90, expected: 'Very High' }
      ]

      testCases.forEach(({ score, expected }) => {
        expect(getSemanticHighlightIntensity(score)).toBe(expected)
      })
    })
  })
})