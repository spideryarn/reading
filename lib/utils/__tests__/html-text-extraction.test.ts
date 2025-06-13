/**
 * Tests for HTML Text Extraction Utility
 * 
 * Comprehensive test suite covering DOM parsing, edge cases, and fallback behavior.
 */

import { extractCleanText, isDOMParsingAvailable } from '../html-text-extraction'

describe('extractCleanText', () => {
  describe('basic functionality', () => {
    it('should extract text from simple HTML', () => {
      const html = '<p>Hello world</p>'
      const result = extractCleanText(html)
      expect(result).toBe('Hello world')
    })

    it('should extract text from nested HTML', () => {
      const html = '<div><p>First <strong>paragraph</strong></p><p>Second paragraph</p></div>'
      const result = extractCleanText(html)
      expect(result).toBe('First paragraphSecond paragraph')
    })

    it('should handle complex nested structures', () => {
      const html = `
        <article>
          <header>
            <h1>Main Title</h1>
            <h2>Subtitle</h2>
          </header>
          <section>
            <p>The <strong>important</strong> text with <em>emphasis</em>.</p>
            <ul>
              <li>First item</li>
              <li>Second item</li>
            </ul>
          </section>
        </article>
      `
      const result = extractCleanText(html)
      expect(result).toBe('Main Title Subtitle The important text with emphasis. First item Second item')
    })

    it('should preserve text from inline elements', () => {
      const html = '<p>Text with <span>inline</span> and <a href="#">link</a> elements</p>'
      const result = extractCleanText(html)
      expect(result).toBe('Text with inline and link elements')
    })
  })

  describe('whitespace handling', () => {
    it('should normalize multiple spaces to single spaces', () => {
      const html = '<p>Text    with     multiple   spaces</p>'
      const result = extractCleanText(html)
      expect(result).toBe('Text with multiple spaces')
    })

    it('should normalize newlines and tabs to spaces', () => {
      const html = '<p>Text\n\twith\n\nnewlines\tand\ttabs</p>'
      const result = extractCleanText(html)
      expect(result).toBe('Text with newlines and tabs')
    })

    it('should trim leading and trailing whitespace', () => {
      const html = '   <p>  Trimmed text  </p>   '
      const result = extractCleanText(html)
      expect(result).toBe('Trimmed text')
    })

    it('should handle HTML with only whitespace content', () => {
      const html = '<div>   \n\t   </div>'
      const result = extractCleanText(html)
      expect(result).toBe('')
    })
  })

  describe('edge cases', () => {
    it('should handle empty string input', () => {
      const result = extractCleanText('')
      expect(result).toBe('')
    })

    it('should handle null input gracefully', () => {
      const result = extractCleanText(null as unknown as string)
      expect(result).toBe('')
    })

    it('should handle undefined input gracefully', () => {
      const result = extractCleanText(undefined as unknown as string)
      expect(result).toBe('')
    })

    it('should handle non-string input gracefully', () => {
      const result = extractCleanText(123 as unknown as string)
      expect(result).toBe('')
    })

    it('should handle plain text without HTML tags', () => {
      const text = 'Just plain text without any tags'
      const result = extractCleanText(text)
      expect(result).toBe('Just plain text without any tags')
    })

    it('should handle text with angle brackets but no HTML tags', () => {
      const text = 'Mathematical expression: x < 5 and y > 10'
      const result = extractCleanText(text)
      expect(result).toBe('Mathematical expression: x < 5 and y > 10')
    })
  })

  describe('HTML entities and special characters', () => {
    it('should handle HTML entities', () => {
      const html = '<p>&lt;script&gt; &amp; &quot;quotes&quot; &apos;apostrophe&apos;</p>'
      const result = extractCleanText(html)
      expect(result).toBe('<script> & "quotes" \'apostrophe\'')
    })

    it('should handle numeric HTML entities', () => {
      const html = '<p>&#60;html&#62; &#38; &#8364; &#169;</p>'
      const result = extractCleanText(html)
      expect(result).toBe('<html> & € ©')
    })

    it('should handle unicode characters', () => {
      const html = '<p>Unicode: 🚀 ∑ ∞ α β γ</p>'
      const result = extractCleanText(html)
      expect(result).toBe('Unicode: 🚀 ∑ ∞ α β γ')
    })
  })

  describe('malformed HTML', () => {
    it('should handle unclosed tags', () => {
      const html = '<p>Unclosed paragraph <strong>with bold'
      const result = extractCleanText(html)
      // Should still extract text even with malformed HTML
      expect(result).toContain('Unclosed paragraph')
      expect(result).toContain('with bold')
    })

    it('should handle mismatched tags', () => {
      const html = '<p>Start paragraph <div>nested div</p> end</div>'
      const result = extractCleanText(html)
      expect(result).toContain('Start paragraph')
      expect(result).toContain('nested div')
      expect(result).toContain('end')
    })

    it('should handle invalid tag names', () => {
      const html = '<invalid-tag>Content in invalid tag</invalid-tag>'
      const result = extractCleanText(html)
      expect(result).toBe('Content in invalid tag')
    })
  })

  describe('document structure elements', () => {
    it('should extract text from document structure elements', () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Page Title</title>
            <meta charset="utf-8">
          </head>
          <body>
            <h1>Main Content</h1>
            <p>Body paragraph</p>
          </body>
        </html>
      `
      const result = extractCleanText(html)
      // Should extract body content but not head content
      expect(result).toContain('Main Content')
      expect(result).toContain('Body paragraph')
      // Title should not be included as it's in the head
      expect(result).not.toContain('Page Title')
    })

    it('should handle self-closing tags', () => {
      const html = '<p>Before image <img src="image.jpg" alt="Alt text" /> after image</p>'
      const result = extractCleanText(html)
      expect(result).toBe('Before image after image')
    })
  })

  describe('performance considerations', () => {
    it('should handle large HTML content efficiently', () => {
      // Create a large HTML document
      const largeParagraphs = Array(100).fill(0).map((_, i) => 
        `<p>This is paragraph number ${i + 1} with some <strong>bold</strong> and <em>italic</em> text.</p>`
      ).join('')
      const largeHtml = `<div>${largeParagraphs}</div>`
      
      const startTime = performance.now()
      const result = extractCleanText(largeHtml)
      const endTime = performance.now()
      
      // Should complete within reasonable time (less than 100ms for this size)
      expect(endTime - startTime).toBeLessThan(100)
      
      // Should still produce correct output
      expect(result).toContain('This is paragraph number 1')
      expect(result).toContain('This is paragraph number 100')
      expect(result).not.toContain('<p>')
      expect(result).not.toContain('<strong>')
    })
  })

  describe('comparison with regex approach', () => {
    const regexExtraction = (html: string): string => {
      return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
    }

    it('should produce same results as regex for simple cases', () => {
      const simpleHtml = '<p>Simple <strong>text</strong> example</p>'
      
      const domResult = extractCleanText(simpleHtml)
      const regexResult = regexExtraction(simpleHtml)
      
      expect(domResult).toBe(regexResult)
      expect(domResult).toBe('Simple text example')
    })

    it('should handle HTML entities better than regex', () => {
      const htmlWithEntities = '<p>&lt;tag&gt; and &amp; symbol</p>'
      
      const domResult = extractCleanText(htmlWithEntities)
      const regexResult = regexExtraction(htmlWithEntities)
      
      // DOM parsing should decode entities, regex should not
      expect(domResult).toBe('<tag> and & symbol')
      expect(regexResult).toBe('&lt;tag&gt; and &amp; symbol')
    })

    it('should handle complex nested structures more reliably', () => {
      const complexHtml = '<div><p>Para 1</p><!-- comment --><script>alert("bad")</script><p>Para 2</p></div>'
      
      const domResult = extractCleanText(complexHtml)
      const regexResult = regexExtraction(complexHtml)
      
      // Both should remove script content, but DOM parsing is more reliable
      expect(domResult).toBe('Para 1Para 2')
      // Regex might include script content
      expect(regexResult).toContain('Para 1')
      expect(regexResult).toContain('Para 2')
    })
  })
})

describe('isDOMParsingAvailable', () => {
  it('should return a boolean', () => {
    const result = isDOMParsingAvailable()
    expect(typeof result).toBe('boolean')
  })

  it('should return true in browser environment (jsdom test environment)', () => {
    // In our Jest test environment with jsdom, this should return true
    const result = isDOMParsingAvailable()
    expect(result).toBe(true)
  })
})