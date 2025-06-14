import {
  calculateTextStatistics,
  calculateFleschReadingEase,
  calculateFleschKincaidGradeLevel,
  interpretFleschReadingEase,
  interpretFleschKincaidGradeLevel,
  calculateReadabilityMetrics
} from '../readability-metrics'

describe('readability-metrics', () => {
  describe('calculateTextStatistics', () => {
    it('should count words, sentences, and syllables correctly', () => {
      const text = 'The cat sat on the mat. It was happy.'
      const stats = calculateTextStatistics(text)
      
      expect(stats.totalWords).toBe(9)
      expect(stats.totalSentences).toBe(2)
      expect(stats.totalSyllables).toBe(10) // Approximate
      expect(stats.averageWordsPerSentence).toBe(4.5)
    })
    
    it('should handle single sentence', () => {
      const text = 'Hello world'
      const stats = calculateTextStatistics(text)
      
      expect(stats.totalWords).toBe(2)
      expect(stats.totalSentences).toBe(1)
    })
    
    it('should handle empty text', () => {
      const stats = calculateTextStatistics('')
      
      expect(stats.totalWords).toBe(0)
      expect(stats.totalSentences).toBe(1) // Minimum 1
      expect(stats.totalSyllables).toBe(0)
    })
  })
  
  describe('calculateFleschReadingEase', () => {
    it('should calculate score for simple text', () => {
      // Very simple text should have high score
      const text = 'The cat sat. The dog ran. I am happy.'
      const score = calculateFleschReadingEase(text)
      
      expect(score).toBeGreaterThan(80) // Should be "Easy" or "Very Easy"
      expect(score).toBeLessThanOrEqual(100)
    })
    
    it('should calculate score for complex text', () => {
      // Academic-style text should have low score
      const text = 'The implementation of sophisticated algorithmic methodologies necessitates comprehensive understanding of theoretical computational paradigms.'
      const score = calculateFleschReadingEase(text)
      
      expect(score).toBeLessThan(50) // Should be "Difficult" or "Very Difficult"
      expect(score).toBeGreaterThanOrEqual(0)
    })
    
    it('should handle empty text', () => {
      const score = calculateFleschReadingEase('')
      expect(score).toBe(100) // Empty text is "very easy"
    })
  })
  
  describe('calculateFleschKincaidGradeLevel', () => {
    it('should calculate grade level for simple text', () => {
      const text = 'The cat sat. The dog ran. I am happy.'
      const gradeLevel = calculateFleschKincaidGradeLevel(text)
      
      expect(gradeLevel).toBeLessThan(5) // Should be elementary level
      expect(gradeLevel).toBeGreaterThanOrEqual(0)
    })
    
    it('should calculate grade level for complex text', () => {
      const text = 'The implementation of sophisticated algorithmic methodologies necessitates comprehensive understanding of theoretical computational paradigms.'
      const gradeLevel = calculateFleschKincaidGradeLevel(text)
      
      expect(gradeLevel).toBeGreaterThan(12) // Should be college level
      expect(gradeLevel).toBeLessThanOrEqual(18)
    })
  })
  
  describe('interpretFleschReadingEase', () => {
    it('should interpret very easy text correctly', () => {
      const interpretation = interpretFleschReadingEase(95)
      
      expect(interpretation.difficulty).toBe('Very Easy')
      expect(interpretation.gradeLevel).toBe('5th grade')
      expect(interpretation.comparison).toBe('Comic books')
    })
    
    it('should interpret difficult text correctly', () => {
      const interpretation = interpretFleschReadingEase(35)
      
      expect(interpretation.difficulty).toBe('Difficult')
      expect(interpretation.gradeLevel).toBe('College')
      expect(interpretation.comparison).toBe('Harvard Business Review')
    })
  })
  
  describe('interpretFleschKincaidGradeLevel', () => {
    it('should format grade levels correctly', () => {
      expect(interpretFleschKincaidGradeLevel(1)).toBe('1st grade')
      expect(interpretFleschKincaidGradeLevel(2)).toBe('2nd grade')
      expect(interpretFleschKincaidGradeLevel(3)).toBe('3rd grade')
      expect(interpretFleschKincaidGradeLevel(4)).toBe('4th grade')
      expect(interpretFleschKincaidGradeLevel(11)).toBe('11th grade')
      expect(interpretFleschKincaidGradeLevel(12)).toBe('12th grade')
    })
    
    it('should handle college levels', () => {
      expect(interpretFleschKincaidGradeLevel(13)).toBe('College freshman')
      expect(interpretFleschKincaidGradeLevel(15)).toBe('College')
      expect(interpretFleschKincaidGradeLevel(17)).toBe('Graduate level')
    })
    
    it('should handle edge cases', () => {
      expect(interpretFleschKincaidGradeLevel(0)).toBe('Kindergarten')
      expect(interpretFleschKincaidGradeLevel(-1)).toBe('Kindergarten')
    })
  })
  
  describe('calculateReadabilityMetrics', () => {
    it('should return comprehensive metrics', () => {
      const text = 'The quick brown fox jumps over the lazy dog. This is a simple sentence.'
      const metrics = calculateReadabilityMetrics(text)
      
      expect(metrics).toHaveProperty('fleschReadingEase')
      expect(metrics).toHaveProperty('fleschKincaidGradeLevel')
      expect(metrics).toHaveProperty('statistics')
      
      expect(metrics.fleschReadingEase.score).toBeGreaterThan(0)
      expect(metrics.fleschReadingEase.score).toBeLessThanOrEqual(100)
      expect(metrics.fleschReadingEase.interpretation).toBeDefined()
      
      expect(metrics.fleschKincaidGradeLevel.score).toBeGreaterThanOrEqual(0)
      expect(metrics.fleschKincaidGradeLevel.interpretation).toBeDefined()
      
      expect(metrics.statistics.totalWords).toBeGreaterThan(0)
    })
  })
})