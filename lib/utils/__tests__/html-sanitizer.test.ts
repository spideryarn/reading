/**
 * Test suite for HTML sanitization functionality
 * 
 * Tests XSS protection while ensuring academic content preservation
 */

import { 
  sanitizeAcademicContent, 
  sanitizeUserContent, 
  analyzeHtmlSecurity
} from '../html-sanitizer'

describe('HTML Sanitizer', () => {
  describe('sanitizeAcademicContent', () => {
    it('should preserve basic academic formatting', () => {
      const html = `
        <article>
          <h1>Research Paper Title</h1>
          <p>This is a <strong>bold</strong> and <em>italic</em> text.</p>
          <blockquote cite="https://doi.org/10.1000/123">
            Important academic quote
          </blockquote>
        </article>
      `
      
      const sanitized = sanitizeAcademicContent(html)
      
      expect(sanitized).toContain('<article>')
      expect(sanitized).toContain('<h1>Research Paper Title</h1>')
      expect(sanitized).toContain('<strong>bold</strong>')
      expect(sanitized).toContain('<em>italic</em>')
      expect(sanitized).toContain('<blockquote')
    })

    it('should preserve table structures and MathML', () => {
      const html = `
        <table>
          <thead>
            <tr><th colspan="2">Data Header</th></tr>
          </thead>
          <tbody>
            <tr><td data-ref="table1">Cell 1</td></tr>
          </tbody>
        </table>
        <math xmlns="http://www.w3.org/1998/Math/MathML">
          <mrow><mi>E</mi><mo>=</mo><mi>m</mi><msup><mi>c</mi><mn>2</mn></msup></mrow>
        </math>
      `
      
      const sanitized = sanitizeAcademicContent(html)
      
      expect(sanitized).toContain('colspan="2"')
      expect(sanitized).toContain('data-ref="table1"')
      expect(sanitized).toContain('<math')
      expect(sanitized).toContain('<mrow>')
    })

    it('should remove dangerous script elements and event handlers', () => {
      const html = `
        <p>Safe content</p>
        <script>alert('XSS attack')</script>
        <p onclick="maliciousFunction()">Clickable paragraph</p>
        <iframe src="http://malicious-site.com/attack.html"></iframe>
      `
      
      const sanitized = sanitizeAcademicContent(html)
      
      expect(sanitized).not.toContain('<script>')
      expect(sanitized).not.toContain('onclick')
      expect(sanitized).not.toContain('<iframe>')
      expect(sanitized).toContain('<p>Safe content</p>')
      expect(sanitized).toContain('<p>Clickable paragraph</p>')
    })

    it('should preserve academic citation elements', () => {
      const html = `
        <p>According to recent research 
          <cite data-ref="smith2024" data-doi="10.1000/123">
            Smith et al. (2024)
          </cite>, machine learning shows promise.
        </p>
      `
      
      const sanitized = sanitizeAcademicContent(html)
      
      expect(sanitized).toContain('<cite')
      expect(sanitized).toContain('data-ref="smith2024"')
      expect(sanitized).toContain('data-doi="10.1000/123"')
    })
  })

  describe('sanitizeUserContent', () => {
    it('should use restrictive sanitization for user content', () => {
      const html = `
        <p>Safe paragraph</p>
        <script>alert('attack')</script>
        <custom-element>Custom content</custom-element>
      `
      
      const sanitized = sanitizeUserContent(html)
      
      expect(sanitized).toContain('<p>Safe paragraph</p>')
      expect(sanitized).not.toContain('<script>')
      expect(sanitized).not.toContain('<custom-element>')
    })
  })

  describe('analyzeHtmlSecurity', () => {
    it('should detect dangerous elements', () => {
      const html = `
        <p>Safe content</p>
        <script>alert('attack')</script>
        <iframe src="malicious.com"></iframe>
      `
      
      const analysis = analyzeHtmlSecurity(html)
      
      expect(analysis.removedElements).toContain('script')
      expect(analysis.removedElements).toContain('iframe')
      expect(analysis.hasDangerousElements).toBe(true)
      expect(analysis.securityScore).toBeLessThan(70)
    })

    it('should return high security score for safe content', () => {
      const html = `
        <article>
          <h1>Research Paper</h1>
          <p>Safe academic content with <strong>formatting</strong>.</p>
        </article>
      `
      
      const analysis = analyzeHtmlSecurity(html)
      
      expect(analysis.removedElements).toHaveLength(0)
      expect(analysis.hasDangerousElements).toBe(false)
      expect(analysis.securityScore).toBeGreaterThan(80)
    })
  })

  describe('XSS Protection', () => {
    it('should neutralize common XSS attack vectors', () => {
      const xssVectors = [
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(1)">',
        '<svg onload="alert(1)">',
        '<iframe src="javascript:alert(1)"></iframe>',
        '<a href="javascript:alert(1)">click</a>'
      ]

      xssVectors.forEach(vector => {
        const sanitized = sanitizeAcademicContent(vector)
        
        expect(sanitized).not.toMatch(/on\w+\s*=/i)
        expect(sanitized).not.toContain('javascript:')
        expect(sanitized).not.toContain('<script')
        expect(sanitized).not.toContain('alert(')
      })
    })
  })
})