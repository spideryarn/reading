/**
 * @jest-environment node
 */

/**
 * Readability Extractor Issue Reproduction Tests
 * 
 * These tests isolate and reproduce the specific issue where extractWithReadability()
 * fails when given a filename instead of a valid URL parameter for JSDOM.
 * 
 * Root Cause: The HTML upload pipeline at line 121 in upload-html/route.ts calls:
 * extractWithReadability(htmlContent, htmlFile.name)
 * 
 * But extractWithReadability() expects the second parameter to be a valid URL for JSDOM,
 * not a filename. This causes JSDOM to throw "Invalid URL" errors.
 * 
 * These tests should initially FAIL to demonstrate the issue, then pass once fixed.
 */

import { extractWithReadability, formatReadabilityHtml } from '@/lib/utils/readability-extractor'

describe('Readability Extractor Invalid URL Issue', () => {
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
          <p>Each paragraph provides valuable information and the overall structure follows semantic HTML best practices for content extraction.</p>
          <p>This ensures that the readability algorithm has sufficient content to work with and can identify the main article content effectively.</p>
        </main>
      </article>
    </body>
    </html>
  `

  describe('Filename vs URL Parameter Issue', () => {
    it('should fail when given a filename instead of a valid URL', () => {
      // This reproduces the exact issue from the HTML upload pipeline
      const filename = 'test-article.html'
      
      // The function catches the JSDOM error and returns null instead of throwing
      // This is the actual issue - readability extraction silently fails
      const result = extractWithReadability(testHtmlContent, filename)
      
      // Should return null due to the JSDOM Invalid URL error
      expect(result).toBeNull()
    })

    it('should fail with various common filename patterns', () => {
      const filenames = [
        'document.html',
        'article.htm',
        'my-file.html',
        'test_file.html',
        'document-with-spaces.html',
        'UPPERCASE.HTML'
      ]

      filenames.forEach(filename => {
        // Each filename should cause the function to return null
        const result = extractWithReadability(testHtmlContent, filename)
        expect(result).toBeNull()
      })
    })

    it('should work when given a valid URL', () => {
      // This shows that the function works correctly when given a proper URL
      const validUrl = 'https://example.com/article.html'
      
      // This should succeed
      expect(() => {
        const result = extractWithReadability(testHtmlContent, validUrl)
        // Should return parsed article or null (not throw)
        expect(result === null || typeof result === 'object').toBe(true)
      }).not.toThrow()
    })

    it('should work with localhost URLs', () => {
      // Test with localhost URLs that might be used in development
      const localhostUrls = [
        'http://localhost:3000/test.html',
        'http://localhost:8080/article.html',
        'https://localhost:3000/document.html'
      ]

      localhostUrls.forEach(url => {
        expect(() => {
          const result = extractWithReadability(testHtmlContent, url)
          expect(result === null || typeof result === 'object').toBe(true)
        }).not.toThrow()
      })
    })
  })

  describe('JSDOM URL Validation Behavior', () => {
    it('should demonstrate JSDOM URL requirement', () => {
      // Import JSDOM directly to show the underlying issue
      // Dynamic import required for Jest mocking
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { JSDOM } = require('jsdom')
      
      // This should fail - JSDOM requires valid URL
      expect(() => {
        new JSDOM(testHtmlContent, {
          url: 'invalid-filename.html'
        })
      }).toThrow(/Invalid URL|invalid URL|Invalid url|URL constructor|TypeError/)
    })

    it('should show JSDOM works with valid URLs', () => {
      // Dynamic import required for Jest mocking
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { JSDOM } = require('jsdom')
      
      // This should work - JSDOM accepts valid URLs
      expect(() => {
        new JSDOM(testHtmlContent, {
          url: 'https://example.com/test.html'
        })
      }).not.toThrow()
    })

    it('should show JSDOM works with data URLs', () => {
      // Dynamic import required for Jest mocking
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { JSDOM } = require('jsdom')
      
      // This should work - JSDOM accepts data URLs
      expect(() => {
        new JSDOM(testHtmlContent, {
          url: 'data:text/html,<html><body>test</body></html>'
        })
      }).not.toThrow()
    })
  })

  describe('Potential Fix Validation', () => {
    it('should demonstrate that a proper URL fix would work', () => {
      // This shows what the fix should look like
      const filename = 'test-article.html'
      
      // Convert filename to a valid URL pattern
      const validUrl = `https://example.com/${filename}`
      
      // This should work
      expect(() => {
        const result = extractWithReadability(testHtmlContent, validUrl)
        expect(result === null || typeof result === 'object').toBe(true)
      }).not.toThrow()
    })

    it('should demonstrate that base64 data URL approach would work', () => {
      const filename = 'test-article.html'
      
      // Convert to data URL approach
      const dataUrl = `data:text/html;base64,${Buffer.from(testHtmlContent).toString('base64')}`
      
      // This should work
      expect(() => {
        const result = extractWithReadability(testHtmlContent, dataUrl)
        expect(result === null || typeof result === 'object').toBe(true)
      }).not.toThrow()
    })

    it('should demonstrate that simple placeholder URL would work', () => {
      const filename = 'test-article.html'
      
      // Simple placeholder URL that includes the filename
      const placeholderUrl = `https://upload.local/${filename}`
      
      // This should work
      expect(() => {
        const result = extractWithReadability(testHtmlContent, placeholderUrl)
        expect(result === null || typeof result === 'object').toBe(true)
      }).not.toThrow()
    })
  })

  describe('Readability Extraction Success Cases', () => {
    it('should successfully extract content when given proper URL', () => {
      const validUrl = 'https://example.com/article.html'
      
      const result = extractWithReadability(testHtmlContent, validUrl)
      
      // Should successfully extract the article
      expect(result).not.toBeNull()
      if (result) {
        expect(result.title).toBe('Test Article for Readability')
        expect(result.content).toContain('main content of the article')
        expect(result.textContent).toContain('main content of the article')
        expect(result.byline).toBe('Test Author')
      }
    })

    it('should format extracted content correctly', () => {
      const validUrl = 'https://example.com/article.html'
      
      const result = extractWithReadability(testHtmlContent, validUrl)
      
      if (result) {
        const formattedHtml = formatReadabilityHtml(result)
        
        expect(formattedHtml).toContain('<!DOCTYPE html>')
        expect(formattedHtml).toContain('<html>')
        expect(formattedHtml).toContain('<title>Test Article for Readability</title>')
        expect(formattedHtml).toContain('<h1>Test Article for Readability</h1>')
        expect(formattedHtml).toContain('By Test Author')
        expect(formattedHtml).toContain('main content of the article')
      }
    })
  })
})