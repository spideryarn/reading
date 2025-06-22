/**
 * Test suite for slug generation utilities
 * 
 * Tests URL-friendly slug generation and HTML filename generation for storage
 */

import { generateSlug, findDocumentBySlug, generateHtmlFilename } from '../slug'

describe('Slug Utilities', () => {
  describe('generateSlug', () => {
    it('should generate URL-friendly slugs from text', () => {
      expect(generateSlug('Hello World! This is a Test')).toBe('hello-world-this-is-a-test')
      expect(generateSlug('Café & Restaurant München')).toBe('cafe-restaurant-munchen')
    })

    it('should handle special characters and Unicode', () => {
      expect(generateSlug('François & José')).toBe('francois-jose')
      expect(generateSlug('  Extra   Spaces  ')).toBe('extra-spaces')
    })

    it('should handle empty and edge cases', () => {
      expect(generateSlug('')).toBe('')
      expect(generateSlug('   ')).toBe('')
      // Special characters get converted to random slug, not empty string
      expect(generateSlug('!@#$%^&*()')).toMatch(/^[a-z0-9-]+$/)
    })
  })

  describe('findDocumentBySlug', () => {
    const mockDocuments = [
      { id: 1, title: 'Machine Learning Basics' },
      { id: 2, title: 'Deep Learning: Advanced Techniques' }
    ]

    it('should find documents by matching slug', () => {
      const result = findDocumentBySlug(mockDocuments, 'machine-learning-basics')
      expect(result).toEqual({ id: 1, title: 'Machine Learning Basics' })
    })

    it('should return null for non-matching slugs', () => {
      const result = findDocumentBySlug(mockDocuments, 'non-existent-document')
      expect(result).toBeNull()
    })
  })

  describe('generateHtmlFilename', () => {
    it('should generate safe filenames from academic URLs', () => {
      expect(generateHtmlFilename('https://arxiv.org/abs/2024.12345'))
        .toBe('arxivorgabs202412345.html')
      
      expect(generateHtmlFilename('https://doi.org/10.1000/182'))
        .toBe('doiorg101000182.html')
    })

    it('should handle URLs with query parameters', () => {
      expect(generateHtmlFilename('https://example.com/paper?id=123&format=html'))
        .toBe('examplecompaper.html')
    })

    it('should remove common web file extensions', () => {
      expect(generateHtmlFilename('https://example.com/document.html'))
        .toBe('examplecomdocument.html')
      
      expect(generateHtmlFilename('https://example.com/script.php'))
        .toBe('examplecomscript.html')
    })

    it('should handle invalid URLs gracefully', () => {
      const filename = generateHtmlFilename('not-a-url')
      expect(filename).toMatch(/^webpage-\d+\.html$/)
    })

    it('should truncate very long filenames', () => {
      const longPath = 'a'.repeat(250)
      const longUrl = `https://example.com/${longPath}`
      
      const filename = generateHtmlFilename(longUrl)
      
      expect(filename).toMatch(/\.html$/)
      expect(filename.length).toBeLessThanOrEqual(205) // 200 chars + .html
    })
  })
})