/**
 * Test suite for slug generation utilities
 * 
 * Tests URL-friendly slug generation and HTML filename generation for storage
 */

// Mock the slug module to avoid ES module issues in Jest
jest.mock('slug', () => {
  return (text: string) => text.toLowerCase().replace(/[^\w ]+/g, '').replace(/ +/g, '-')
}, { virtual: true })

import { generateSlug, findDocumentBySlug, generateHtmlFilename } from '../slug'

describe('Slug Utilities', () => {
  describe('generateSlug', () => {
    it('should generate URL-friendly slugs from text', () => {
      expect(generateSlug('Hello World! This is a Test')).toBe('hello-world-this-is-a-test')
      expect(generateSlug('Café & Restaurant München')).toBe('cafe-restaurant-munchen')
      expect(generateSlug('Research Paper: Deep Learning Approaches')).toBe('research-paper-deep-learning-approaches')
    })

    it('should handle special characters and Unicode', () => {
      expect(generateSlug('François & José')).toBe('francois-jose')
      expect(generateSlug('Machine Learning 101: Basics & Advanced')).toBe('machine-learning-101-basics-advanced')
      expect(generateSlug('  Extra   Spaces  ')).toBe('extra-spaces')
    })

    it('should handle empty and edge cases', () => {
      expect(generateSlug('')).toBe('')
      expect(generateSlug('   ')).toBe('')
      expect(generateSlug('123456')).toBe('123456')
      expect(generateSlug('!@#$%^&*()')).toBe('')
    })
  })

  describe('findDocumentBySlug', () => {
    const mockDocuments = [
      { id: 1, title: 'Machine Learning Basics' },
      { id: 2, title: 'Deep Learning: Advanced Techniques' },
      { id: 3, title: 'AI & Neural Networks' }
    ]

    it('should find documents by matching slug', () => {
      const result = findDocumentBySlug(mockDocuments, 'machine-learning-basics')
      expect(result).toEqual({ id: 1, title: 'Machine Learning Basics' })
    })

    it('should find documents with special characters', () => {
      const result = findDocumentBySlug(mockDocuments, 'ai-neural-networks')
      expect(result).toEqual({ id: 3, title: 'AI & Neural Networks' })
    })

    it('should return null for non-matching slugs', () => {
      const result = findDocumentBySlug(mockDocuments, 'non-existent-document')
      expect(result).toBeNull()
    })

    it('should handle empty document array', () => {
      const result = findDocumentBySlug([], 'any-slug')
      expect(result).toBeNull()
    })
  })

  describe('generateHtmlFilename', () => {
    it('should generate safe filenames from academic URLs', () => {
      expect(generateHtmlFilename('https://arxiv.org/abs/2024.12345'))
        .toBe('arxiv-org-abs-2024-12345.html')
      
      expect(generateHtmlFilename('https://ieeexplore.ieee.org/document/9876543'))
        .toBe('ieeexplore-ieee-org-document-9876543.html')
      
      expect(generateHtmlFilename('https://www.ncbi.nlm.nih.gov/pmc/articles/PMC1234567/'))
        .toBe('www-ncbi-nlm-nih-gov-pmc-articles-pmc1234567.html')
    })

    it('should handle URLs with query parameters', () => {
      expect(generateHtmlFilename('https://example.com/paper?id=123&format=html'))
        .toBe('example-com-paper.html')
      
      expect(generateHtmlFilename('https://journal.org/article.php?doi=10.1000/123'))
        .toBe('journal-org-article.html')
    })

    it('should remove common web file extensions', () => {
      expect(generateHtmlFilename('https://example.com/document.html'))
        .toBe('example-com-document.html')
      
      expect(generateHtmlFilename('https://example.com/page.htm'))
        .toBe('example-com-page.html')
      
      expect(generateHtmlFilename('https://example.com/script.php'))
        .toBe('example-com-script.html')
      
      expect(generateHtmlFilename('https://example.com/app.aspx'))
        .toBe('example-com-app.html')
    })

    it('should handle URLs with trailing slashes', () => {
      expect(generateHtmlFilename('https://example.com/path/'))
        .toBe('example-com-path.html')
      
      expect(generateHtmlFilename('https://example.com/'))
        .toBe('example-com.html')
    })

    it('should handle complex academic publisher URLs', () => {
      // Springer URL
      expect(generateHtmlFilename('https://link.springer.com/article/10.1007/s12345-678-9012-3'))
        .toBe('link-springer-com-article-10-1007-s12345-678-9012-3.html')
      
      // Nature URL
      expect(generateHtmlFilename('https://www.nature.com/articles/s41586-024-07123-4'))
        .toBe('www-nature-com-articles-s41586-024-07123-4.html')
      
      // ACM Digital Library
      expect(generateHtmlFilename('https://dl.acm.org/doi/10.1145/3534567.8901234'))
        .toBe('dl-acm-org-doi-10-1145-3534567-8901234.html')
    })

    it('should truncate very long filenames', () => {
      // Create a URL with a very long path
      const longPath = 'a'.repeat(250)
      const longUrl = `https://example.com/${longPath}`
      
      const filename = generateHtmlFilename(longUrl)
      
      expect(filename).toMatch(/\.html$/)
      expect(filename.length).toBeLessThanOrEqual(205) // 200 chars + .html
    })

    it('should handle invalid URLs gracefully', () => {
      const invalidUrls = [
        'not-a-url',
        'ftp://example.com/file',
        '',
        'javascript:alert("xss")'
      ]

      invalidUrls.forEach(invalidUrl => {
        const filename = generateHtmlFilename(invalidUrl)
        
        expect(filename).toMatch(/^webpage-\d+\.html$/)
        expect(filename).toContain('.html')
      })
    })

    it('should preserve important academic identifiers', () => {
      // DOI-based URLs
      expect(generateHtmlFilename('https://doi.org/10.1000/182'))
        .toBe('doi-org-10-1000-182.html')
      
      // arXiv identifiers
      expect(generateHtmlFilename('https://arxiv.org/abs/2401.12345'))
        .toBe('arxiv-org-abs-2401-12345.html')
      
      // PubMed IDs
      expect(generateHtmlFilename('https://pubmed.ncbi.nlm.nih.gov/12345678/'))
        .toBe('pubmed-ncbi-nlm-nih-gov-12345678.html')
    })

    it('should handle special characters in URLs', () => {
      expect(generateHtmlFilename('https://example.com/paper-with-dashes'))
        .toBe('example-com-paper-with-dashes.html')
      
      expect(generateHtmlFilename('https://example.com/paper_with_underscores'))
        .toBe('example-com-paper-with-underscores.html')
      
      expect(generateHtmlFilename('https://example.com/paper%20with%20spaces'))
        .toBe('example-com-paper-20with-20spaces.html')
    })

    it('should generate consistent filenames for same URLs', () => {
      const url = 'https://example.com/paper/123'
      
      const filename1 = generateHtmlFilename(url)
      const filename2 = generateHtmlFilename(url)
      
      expect(filename1).toBe(filename2)
      expect(filename1).toBe('example-com-paper-123.html')
    })

    it('should handle URLs without paths', () => {
      expect(generateHtmlFilename('https://example.com'))
        .toBe('example-com.html')
      
      expect(generateHtmlFilename('https://arxiv.org'))
        .toBe('arxiv-org.html')
    })
  })

  describe('Integration Tests', () => {
    it('should work together for document slug workflow', () => {
      const title = 'Research Paper: Machine Learning & AI'
      const slug = generateSlug(title)
      
      const documents = [
        { id: 1, title: title },
        { id: 2, title: 'Another Paper' }
      ]
      
      const found = findDocumentBySlug(documents, slug)
      
      expect(slug).toBe('research-paper-machine-learning-ai')
      expect(found).toEqual({ id: 1, title: title })
    })

    it('should handle academic workflow with URLs and titles', () => {
      const url = 'https://arxiv.org/abs/2024.12345'
      const title = 'Deep Learning Approaches to Natural Language Processing'
      
      const filename = generateHtmlFilename(url)
      const titleSlug = generateSlug(title)
      
      expect(filename).toBe('arxiv-org-abs-2024-12345.html')
      expect(titleSlug).toBe('deep-learning-approaches-to-natural-language-processing')
      
      // Both should be filesystem-safe and URL-safe
      expect(filename).toMatch(/^[a-z0-9.-]+\.html$/)
      expect(titleSlug).toMatch(/^[a-z0-9-]+$/)
    })
  })
})