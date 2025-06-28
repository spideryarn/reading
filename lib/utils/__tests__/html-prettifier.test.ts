/**
 * Tests for HTML Prettification Utility
 * 
 * Validates academic-focused HTML prettification with js-beautify
 */

import {
  prettifyAcademicHtml,
  prettifyAcademicHtmlSafe,
  getAcademicPrettificationConfig,
  isAcademicContent
} from '../html-prettifier'

describe('HTML Prettifier', () => {
  describe('prettifyAcademicHtml', () => {
    it('should prettify basic HTML with proper indentation', () => {
      const uglyHtml = '<div><p>Hello world</p><span>Test content</span></div>'
      const result = prettifyAcademicHtml(uglyHtml)
      
      expect(result).toContain('  <p>Hello world</p>')
      // Span is inline so stays on same line as paragraph
      expect(result).toContain('<span>Test content</span>')  
      expect(result.split('\n').length).toBeGreaterThan(1)
    })

    it('should preserve mathematical notation whitespace', () => {
      const mathHtml = '<p>The equation <math><mi>E</mi><mo>=</mo><mi>m</mi><mi>c</mi><msup><mi>c</mi><mn>2</mn></msup></math> is famous.</p>'
      const result = prettifyAcademicHtml(mathHtml)
      
      // Math content should be preserved exactly as-is
      expect(result).toContain('<math><mi>E</mi><mo>=</mo><mi>m</mi><mi>c</mi><msup><mi>c</mi><mn>2</mn></msup></math>')
    })

    it('should preserve code block formatting', () => {
      const codeHtml = '<div><pre><code>function test() {\n  return "hello";\n}</code></pre></div>'
      const result = prettifyAcademicHtml(codeHtml)
      
      // Code block content should be unchanged
      expect(result).toContain('function test() {\n  return "hello";\n}')
    })

    it('should preserve citation spacing', () => {
      const citationHtml = '<p>According to <cite>Smith et al.</cite> the results show that...</p>'
      const result = prettifyAcademicHtml(citationHtml)
      
      // Citation content should be preserved
      expect(result).toContain('<cite>Smith et al.</cite>')
    })

    it('should handle empty or invalid input', () => {
      expect(prettifyAcademicHtml('')).toBe('')
      expect(prettifyAcademicHtml('   ')).toBe('')
      expect(prettifyAcademicHtml('plain text')).toBe('plain text')
    })
  })

  describe('prettifyAcademicHtmlSafe', () => {
    it('should return prettified HTML on success', () => {
      const html = '<div><p>Test</p></div>'
      const result = prettifyAcademicHtmlSafe(html)
      
      expect(result).toContain('<div>')
      expect(result).toContain('  <p>Test</p>')
    })

    it('should return original HTML on failure', () => {
      // Mock beautify to throw error
      const originalBeautify = require('js-beautify').html
      require('js-beautify').html = jest.fn(() => { throw new Error('Test error') })
      
      const html = '<div>Test</div>'
      const result = prettifyAcademicHtmlSafe(html)
      
      expect(result).toBe(html)
      
      // Restore original
      require('js-beautify').html = originalBeautify
    })

    it('should log errors when logger is provided', () => {
      const mockLogger = { warn: jest.fn() }
      const originalBeautify = require('js-beautify').html
      require('js-beautify').html = jest.fn(() => { throw new Error('Test error') })
      
      const html = '<div>Test</div>'
      prettifyAcademicHtmlSafe(html, mockLogger as any, 'test-correlation')
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          step: 'prettification-failed',
          correlationId: 'test-correlation',
          fallbackToOriginal: true
        }),
        'HTML prettification failed, using original content'
      )
      
      // Restore original
      require('js-beautify').html = originalBeautify
    })
  })

  describe('getAcademicPrettificationConfig', () => {
    it('should return configuration object', () => {
      const config = getAcademicPrettificationConfig()
      
      expect(config).toHaveProperty('indent_size', 2)
      expect(config).toHaveProperty('preserve_newlines', true)
      expect(config.content_unformatted).toContain('math')
      expect(config.content_unformatted).toContain('code')
      expect(config.content_unformatted).toContain('pre')
    })

    it('should return a copy of the configuration', () => {
      const config1 = getAcademicPrettificationConfig()
      const config2 = getAcademicPrettificationConfig()
      
      expect(config1).not.toBe(config2) // Different objects
      expect(config1).toEqual(config2)  // Same content
    })
  })

  describe('isAcademicContent', () => {
    it('should detect mathematical content', () => {
      expect(isAcademicContent('<math><mi>x</mi></math>')).toBe(true)
      expect(isAcademicContent('E = mc²')).toBe(true)
    })

    it('should detect citations', () => {
      expect(isAcademicContent('<cite>Author et al.</cite>')).toBe(true)
      expect(isAcademicContent('According to Smith (2023)')).toBe(true)
    })

    it('should detect code blocks', () => {
      expect(isAcademicContent('<pre><code>function test() {}</code></pre>')).toBe(true)
      expect(isAcademicContent('<code>const x = 42</code>')).toBe(true)
    })

    it('should detect academic identifiers', () => {
      expect(isAcademicContent('DOI: 10.1234/example')).toBe(true)
      expect(isAcademicContent('arXiv:2301.00001')).toBe(true)
      expect(isAcademicContent('ISBN: 978-0-123456-78-9')).toBe(true)
    })

    it('should return false for non-academic content', () => {
      expect(isAcademicContent('Hello world')).toBe(false)
      expect(isAcademicContent('<p>Simple paragraph</p>')).toBe(false)
    })
  })

  describe('Academic content preservation integration', () => {
    it('should handle complex academic document structure', () => {
      const complexHtml = `
        <article>
          <h1>Research Paper Title</h1>
          <section>
            <h2>Introduction</h2>
            <p>According to <cite>Smith et al. (2023)</cite>, the formula <math><mi>E</mi><mo>=</mo><mi>mc</mi><msup><mi>c</mi><mn>2</mn></msup></math> is fundamental.</p>
            <pre><code class="language-python">
def calculate_energy(mass):
    c = 299792458  # speed of light
    return mass * c ** 2
            </code></pre>
          </section>
        </article>
      `
      
      const result = prettifyAcademicHtml(complexHtml)
      
      // Should preserve all academic elements
      expect(result).toContain('<cite>Smith et al. (2023)</cite>')
      expect(result).toContain('<math><mi>E</mi><mo>=</mo><mi>mc</mi><msup><mi>c</mi><mn>2</mn></msup></math>')
      expect(result).toContain('def calculate_energy(mass):')
      expect(result).toContain('    c = 299792458  # speed of light')
      
      // Should have proper indentation
      expect(result).toMatch(/\s+<h1>Research Paper Title<\/h1>/)
      expect(result).toMatch(/\s+<section>/)
    })
  })
})