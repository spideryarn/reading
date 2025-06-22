/**
 * @jest-environment node
 */

/**
 * Readability Extractor Tests
 * 
 * Tests the readability extraction functionality for HTML content processing.
 * The original filename issue has been resolved - the extractor now properly
 * handles both filenames and URLs by converting filenames to valid URLs internally.
 */

import { extractWithReadability, formatReadabilityHtml } from '@/lib/utils/readability-extractor'

describe('Readability Extractor', () => {
  const testHtmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Test Article for Readability</title>
      <meta name="author" content="Test Author">
    </head>
    <body>
      <article>
        <header>
          <h1>Main Article Title</h1>
          <p class="byline">By Test Author</p>
        </header>
        <main>
          <p>This is the main content of the article with substantial text content that should be extractable by Mozilla Readability.</p>
          <p>The article contains multiple paragraphs with meaningful content that exceeds the character threshold for readability extraction.</p>
        </main>
      </article>
    </body>
    </html>
  `

  describe('Content Extraction', () => {
    it('should extract content from filename parameters', () => {
      // The extractor now properly handles filenames
      const result = extractWithReadability(testHtmlContent, 'test-article.html')
      
      expect(result).not.toBeNull()
      if (result) {
        expect(result.title).toBe('Test Article for Readability')
        expect(result.content).toContain('main content of the article')
        expect(result.byline).toBe('Test Author')
      }
    })

    it('should extract content from valid URLs', () => {
      const result = extractWithReadability(testHtmlContent, 'https://example.com/article.html')
      
      expect(result).not.toBeNull()
      if (result) {
        expect(result.title).toBe('Test Article for Readability')
        expect(result.content).toContain('main content of the article')
      }
    })

    it('should format extracted content correctly', () => {
      const result = extractWithReadability(testHtmlContent, 'test.html')
      
      if (result) {
        const formattedHtml = formatReadabilityHtml(result)
        
        expect(formattedHtml).toContain('<!DOCTYPE html>')
        expect(formattedHtml).toContain('<title>Test Article for Readability</title>')
        expect(formattedHtml).toContain('main content of the article')
      }
    })
  })
})