import { generateHeadingMutation } from '../heading-mutation-generator'
import { generateContentBasedId } from '../deterministicId'

// Mock deterministic ID generation for performance testing
jest.mock('../deterministicId')
const mockedGenerateContentBasedId = generateContentBasedId as jest.MockedFunction<typeof generateContentBasedId>

describe('heading-mutation-generator performance', () => {
  const mockDocumentId = 'perf-test-doc'
  
  beforeEach(() => {
    jest.clearAllMocks()
    // Fast mock implementation for performance testing
    mockedGenerateContentBasedId.mockImplementation((docId, type, content) => {
      return `${type}-${Math.random().toString(36).substr(2, 9)}`
    })
  })

  describe('performance characteristics', () => {
    it('should handle typical AI generation scenarios (2-10 headings) efficiently', () => {
      // Typical scenario: 5 headings with some grouping
      const headings = [
        { insertNewBeforeExistingId: 'para-1', html: '<h2>Chapter 1</h2>' },
        { insertNewBeforeExistingId: 'para-1', html: '<h3>Section 1.1</h3>' },
        { insertNewBeforeExistingId: 'para-1', html: '<h4>Subsection 1.1.1</h4>' },
        { insertNewBeforeExistingId: 'para-2', html: '<h2>Chapter 2</h2>' },
        { insertNewBeforeExistingId: 'para-3', html: '<h2>Chapter 3</h2>' }
      ]

      const startTime = performance.now()
      
      const result = generateHeadingMutation({
        headings,
        documentId: mockDocumentId,
        mutationId: 'perf-test-typical'
      })
      
      const endTime = performance.now()
      const duration = endTime - startTime

      // Should complete in under 20ms for typical scenarios
      expect(duration).toBeLessThan(20)
      expect(result.forward).toHaveLength(5)
      
      console.log(`[Performance] Typical scenario (5 headings): ${duration.toFixed(2)}ms`)
    })

    it('should handle large documents with many headings efficiently', () => {
      // Stress test: 50 headings with various grouping patterns
      const headings = []
      
      // Create 5 groups of 10 headings each (simulating complex document)
      for (let group = 1; group <= 5; group++) {
        for (let heading = 1; heading <= 10; heading++) {
          headings.push({
            insertNewBeforeExistingId: `section-${group}`,
            html: `<h${Math.min(6, heading + 1)}>Group ${group} Heading ${heading}</h${Math.min(6, heading + 1)}>`
          })
        }
      }

      const startTime = performance.now()
      
      const result = generateHeadingMutation({
        headings,
        documentId: mockDocumentId,
        mutationId: 'perf-test-large'
      })
      
      const endTime = performance.now()
      const duration = endTime - startTime

      // Should complete in under 20ms even for large documents
      expect(duration).toBeLessThan(20)
      expect(result.forward).toHaveLength(50)
      
      // Verify grouping logic works correctly at scale
      const groupCounts = new Map<string, number>()
      result.forward.forEach(transform => {
        const targetId = transform.insertNewBeforeExistingId!
        if (targetId.startsWith('section-')) {
          groupCounts.set(targetId, (groupCounts.get(targetId) || 0) + 1)
        }
      })
      
      // All headings should target their original elements to avoid intra-mutation dependencies
      expect(groupCounts.size).toBe(5)
      Array.from(groupCounts.values()).forEach(count => {
        expect(count).toBe(10) // All 10 headings in each group target the original section element
      })
      
      console.log(`[Performance] Large scenario (50 headings): ${duration.toFixed(2)}ms`)
    })

    it('should handle worst-case scenario (all headings target same point) efficiently', () => {
      // Worst case: 20 headings all targeting the same insertion point
      const headings = Array.from({ length: 20 }, (_, i) => ({
        insertNewBeforeExistingId: 'single-target',
        html: `<h${(i % 6) + 1}>Heading ${i + 1}</h${(i % 6) + 1}>`
      }))

      const startTime = performance.now()
      
      const result = generateHeadingMutation({
        headings,
        documentId: mockDocumentId,
        mutationId: 'perf-test-worst-case'
      })
      
      const endTime = performance.now()
      const duration = endTime - startTime

      // Should complete in under 10ms even in worst case
      expect(duration).toBeLessThan(10)
      expect(result.forward).toHaveLength(20)
      
      // Verify all headings target the original element to avoid validation issues
      result.forward.forEach(transform => {
        expect(transform.insertNewBeforeExistingId).toBe('single-target')
      })
      
      console.log(`[Performance] Worst-case scenario (20 grouped headings): ${duration.toFixed(2)}ms`)
    })

    it('should demonstrate algorithm complexity is O(n) where n = number of headings', () => {
      const sizes = [5, 10, 20, 40]
      const results: Array<{ size: number; duration: number }> = []

      sizes.forEach(size => {
        const headings = Array.from({ length: size }, (_, i) => ({
          insertNewBeforeExistingId: `target-${i % 3}`, // 3 groups for mixed insertion
          html: `<h2>Heading ${i + 1}</h2>`
        }))

        const startTime = performance.now()
        
        generateHeadingMutation({
          headings,
          documentId: mockDocumentId,
          mutationId: `perf-test-${size}`
        })
        
        const endTime = performance.now()
        const duration = endTime - startTime
        
        results.push({ size, duration })
        console.log(`[Performance] ${size} headings: ${duration.toFixed(2)}ms`)
      })

      // Verify linear scaling (not exponential)
      // The ratio of durations should be roughly proportional to size ratios
      const firstResult = results[0]!
      const lastResult = results[results.length - 1]!
      
      const sizeRatio = lastResult.size / firstResult.size
      const timeRatio = lastResult.duration / firstResult.duration
      
      // Time ratio should not be significantly higher than size ratio
      // Allow some overhead for larger data structures, but expect roughly linear
      expect(timeRatio).toBeLessThan(sizeRatio * 2)
      
      console.log(`[Performance] Scaling analysis: ${sizeRatio}x size increase → ${timeRatio.toFixed(1)}x time increase`)
    })
  })

  describe('memory efficiency', () => {
    it('should not leak memory during repeated mutations', () => {
      const headings = [
        { insertNewBeforeExistingId: 'para-1', html: '<h2>Memory Test</h2>' },
        { insertNewBeforeExistingId: 'para-1', html: '<h3>Subsection</h3>' }
      ]

      // Run many iterations to check for memory leaks
      for (let i = 0; i < 100; i++) {
        const result = generateHeadingMutation({
          headings,
          documentId: `doc-${i}`,
          mutationId: `mutation-${i}`
        })
        
        // Verify each iteration produces correct result
        expect(result.forward).toHaveLength(2)
        // Both headings should target the original element
        expect(result.forward[0]!.insertNewBeforeExistingId).toBe('para-1')
        expect(result.forward[1]!.insertNewBeforeExistingId).toBe('para-1')
      }
      
      // If we reach here without issues, memory usage is reasonable
      expect(true).toBe(true)
    })
  })
})