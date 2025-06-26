/**
 * @jest-environment jsdom
 */

import {
  getSemanticHighlightStyles,
  getSemanticHighlightIntensity,
  getAllSemanticHighlightClasses,
  SEMANTIC_HIGHLIGHT_THRESHOLDS,
  testConfidenceMapping
} from '../semantic-highlighting'

describe('semantic-highlighting utilities', () => {
  describe('getSemanticHighlightStyles', () => {
    it('should generate correct inline styles for confidence scores', () => {
      // Test 0% confidence
      const styles0 = getSemanticHighlightStyles(0)
      expect(styles0.backgroundColor).toBe('rgba(219, 138, 69, 0)')
      expect(styles0.borderLeft).toBe('2px solid rgba(219, 138, 69, 0)')
      
      // Test 50% confidence
      const styles50 = getSemanticHighlightStyles(50)
      expect(styles50.backgroundColor).toBe('rgba(219, 138, 69, 0.5)')
      expect(styles50.borderLeft).toBe('2px solid rgba(219, 138, 69, 0.75)')
      
      // Test 100% confidence
      const styles100 = getSemanticHighlightStyles(100)
      expect(styles100.backgroundColor).toBe('rgba(219, 138, 69, 1)')
      expect(styles100.borderLeft).toBe('2px solid rgba(219, 138, 69, 1)')
    })

    it('should handle out-of-range values', () => {
      // Values below 0 should be clamped to 0
      const stylesNegative = getSemanticHighlightStyles(-10)
      expect(stylesNegative.backgroundColor).toBe('rgba(219, 138, 69, 0)')
      
      // Values above 100 should be clamped to 100
      const stylesOver = getSemanticHighlightStyles(150)
      expect(stylesOver.backgroundColor).toBe('rgba(219, 138, 69, 1)')
    })

    it('should scale border opacity higher than background opacity', () => {
      const styles30 = getSemanticHighlightStyles(30)
      expect(styles30.backgroundColor).toBe('rgba(219, 138, 69, 0.3)')
      // Border opacity should be 1.5x background opacity (approximately)
      expect(styles30.borderLeft).toMatch(/rgba\(219, 138, 69, 0\.44/)
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
      expect(zeroMapping?.confidence).toBe(0)
      expect(zeroMapping?.intensity).toBe('Very Low')
      expect(zeroMapping?.styles.backgroundColor).toBe('rgba(219, 138, 69, 0)')

      const highMapping = mapping.find(m => m.confidence === 85)
      expect(highMapping?.confidence).toBe(85)
      expect(highMapping?.intensity).toBe('Very High')
      expect(highMapping?.styles.backgroundColor).toBe('rgba(219, 138, 69, 0.85)')
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