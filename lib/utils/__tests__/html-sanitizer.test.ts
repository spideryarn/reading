/**
 * Test suite for HTML sanitization functionality
 * 
 * Tests XSS protection while ensuring academic content preservation
 * Based on research in docs/reference/WEBPAGE_HTML_SANITIZATION_FOR_ACADEMIC_CONTENT.md
 */

import { 
  sanitizeAcademicContent, 
  sanitizeUserContent, 
  analyzeHtmlSecurity,
  sanitizeByPublisher,
  sanitizeLargeDocument
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
      expect(sanitized).toContain('cite="https://doi.org/10.1000/123"')
    })

    it('should preserve complex table structures', () => {
      const html = `
        <table>
          <thead>
            <tr>
              <th colspan="2">Data Header</th>
              <th rowspan="2">Results</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td data-ref="table1">Cell 1</td>
              <td>Cell 2</td>
              <td>Cell 3</td>
            </tr>
          </tbody>
        </table>
      `
      
      const sanitized = sanitizeAcademicContent(html)
      
      expect(sanitized).toContain('colspan="2"')
      expect(sanitized).toContain('rowspan="2"')
      expect(sanitized).toContain('data-ref="table1"')
      expect(sanitized).toContain('<thead>')
      expect(sanitized).toContain('<tbody>')
    })

    it('should preserve MathML mathematical notation', () => {
      const html = `
        <math xmlns="http://www.w3.org/1998/Math/MathML">
          <mrow>
            <mi>E</mi>
            <mo>=</mo>
            <mi>m</mi>
            <msup>
              <mi>c</mi>
              <mn>2</mn>
            </msup>
          </mrow>
        </math>
      `
      
      const sanitized = sanitizeAcademicContent(html)
      
      expect(sanitized).toContain('<math')
      expect(sanitized).toContain('<mrow>')
      expect(sanitized).toContain('<mi>E</mi>')
      expect(sanitized).toContain('<msup>')
    })

    it('should preserve scientific figures and captions', () => {
      const html = `
        <figure data-figure-id="fig1">
          <img src="/scientific-diagram.svg" alt="Molecular structure" />
          <figcaption>
            <strong>Figure 1:</strong> Molecular structure of compound XYZ
            <cite data-ref="citation1">(Smith et al., 2024)</cite>
          </figcaption>
        </figure>
      `
      
      const sanitized = sanitizeAcademicContent(html)
      
      expect(sanitized).toContain('<figure')
      expect(sanitized).toContain('data-figure-id="fig1"')
      expect(sanitized).toContain('<figcaption>')
      expect(sanitized).toContain('<cite')
      expect(sanitized).toContain('data-ref="citation1"')
    })

    it('should remove dangerous script elements', () => {
      const html = `
        <p>Safe content</p>
        <script>alert('xss')</script>
        <p>More safe content</p>
      `
      
      const sanitized = sanitizeAcademicContent(html)
      
      expect(sanitized).toContain('Safe content')
      expect(sanitized).toContain('More safe content')
      expect(sanitized).not.toContain('<script>')
      expect(sanitized).not.toContain('alert(')
    })

    it('should remove dangerous event handlers', () => {
      const html = `
        <p onclick="alert('xss')">Clickable text</p>
        <img src="test.jpg" onerror="alert('xss')" alt="Test" />
        <div onload="maliciousCode()">Content</div>
      `
      
      const sanitized = sanitizeAcademicContent(html)
      
      expect(sanitized).toContain('Clickable text')
      expect(sanitized).toContain('alt="Test"')
      expect(sanitized).toContain('Content')
      expect(sanitized).not.toContain('onclick')
      expect(sanitized).not.toContain('onerror')
      expect(sanitized).not.toContain('onload')
    })

    it('should remove dangerous iframes and embeds', () => {
      const html = `
        <p>Safe content</p>
        <iframe src="javascript:alert('xss')"></iframe>
        <object data="malicious.swf"></object>
        <embed src="dangerous.pdf" />
      `
      
      const sanitized = sanitizeAcademicContent(html)
      
      expect(sanitized).toContain('Safe content')
      expect(sanitized).not.toContain('<iframe')
      expect(sanitized).not.toContain('<object')
      expect(sanitized).not.toContain('<embed')
    })

    it('should preserve academic citation elements', () => {
      const html = `
        <p>This research <cite data-doi="10.1000/123">confirms previous findings</cite>.</p>
        <p>See also <sup><a href="#ref1" data-ref="ref1">1</a></sup>.</p>
        <p>The formula H<sub>2</sub>O represents water.</p>
      `
      
      const sanitized = sanitizeAcademicContent(html)
      
      expect(sanitized).toContain('<cite')
      expect(sanitized).toContain('data-doi="10.1000/123"')
      expect(sanitized).toContain('<sup>')
      expect(sanitized).toContain('<sub>')
      expect(sanitized).toContain('href="#ref1"')
      expect(sanitized).toContain('data-ref="ref1"')
    })

    it('should handle options for math and SVG preservation', () => {
      const htmlWithMath = `
        <p>Text content</p>
        <math><mi>x</mi></math>
        <svg><circle r="5"/></svg>
      `
      
      const noMath = sanitizeAcademicContent(htmlWithMath, { preserveMath: false })
      const noSvg = sanitizeAcademicContent(htmlWithMath, { preserveSvg: false })
      const withBoth = sanitizeAcademicContent(htmlWithMath, { preserveMath: true, preserveSvg: true })
      
      expect(noMath).not.toContain('<math>')
      expect(noSvg).not.toContain('<svg>')
      expect(withBoth).toContain('<math>')
      expect(withBoth).toContain('<svg>')
    })
  })

  describe('sanitizeUserContent', () => {
    it('should use restrictive sanitization for user content', () => {
      const html = `
        <p>Safe text</p>
        <script>alert('xss')</script>
        <math><mi>x</mi></math>
        <data-custom-attr>Custom element</data-custom-attr>
      `
      
      const sanitized = sanitizeUserContent(html)
      
      expect(sanitized).toContain('Safe text')
      expect(sanitized).not.toContain('<script>')
      expect(sanitized).not.toContain('<math>') // MathML not allowed in restrictive mode
      expect(sanitized).not.toContain('data-custom-attr')
    })

    it('should preserve basic formatting in restrictive mode', () => {
      const html = `
        <h1>Title</h1>
        <p>Text with <strong>bold</strong> and <em>italic</em>.</p>
        <ul>
          <li>List item</li>
        </ul>
        <table>
          <tr><td>Cell</td></tr>
        </table>
      `
      
      const sanitized = sanitizeUserContent(html)
      
      expect(sanitized).toContain('<h1>Title</h1>')
      expect(sanitized).toContain('<strong>bold</strong>')
      expect(sanitized).toContain('<em>italic</em>')
      expect(sanitized).toContain('<ul>')
      expect(sanitized).toContain('<li>')
      expect(sanitized).toContain('<table>')
    })
  })

  describe('analyzeHtmlSecurity', () => {
    it('should detect dangerous elements', () => {
      const html = `
        <p>Safe content</p>
        <script>alert('xss')</script>
        <iframe src="dangerous"></iframe>
      `
      
      const analysis = analyzeHtmlSecurity(html)
      
      expect(analysis.hasDangerousElements).toBe(true)
      expect(analysis.removedElements).toContain('script')
      expect(analysis.removedElements).toContain('iframe')
      expect(analysis.securityScore).toBeLessThan(100)
    })

    it('should return high security score for safe content', () => {
      const html = `
        <article>
          <h1>Title</h1>
          <p>Safe academic content with <strong>formatting</strong>.</p>
          <table><tr><td>Data</td></tr></table>
        </article>
      `
      
      const analysis = analyzeHtmlSecurity(html)
      
      expect(analysis.hasDangerousElements).toBe(false)
      expect(analysis.removedElements).toEqual([])
      expect(analysis.securityScore).toBe(100)
    })
  })

  describe('sanitizeByPublisher', () => {
    it('should use arXiv-specific configuration', () => {
      const html = `
        <ltx:document>
          <ltx:section>
            <p>LaTeX content</p>
          </ltx:section>
        </ltx:document>
      `
      
      const sanitized = sanitizeByPublisher(html, 'arxiv')
      
      // arXiv config should preserve LaTeXML elements
      expect(sanitized).toContain('ltx:document')
      expect(sanitized).toContain('ltx:section')
    })

    it('should use IEEE-specific configuration', () => {
      const html = `
        <div data-ieee-id="section1" data-section-id="intro">
          <p>IEEE paper content</p>
        </div>
      `
      
      const sanitized = sanitizeByPublisher(html, 'ieee')
      
      expect(sanitized).toContain('data-ieee-id="section1"')
      expect(sanitized).toContain('data-section-id="intro"')
    })

    it('should fallback to academic config for unknown publishers', () => {
      const html = `<p>Standard content</p>`
      
      const sanitized = sanitizeByPublisher(html, 'unknown' as keyof typeof import('../html-sanitizer').PUBLISHER_CONFIGS)
      
      expect(sanitized).toContain('<p>Standard content</p>')
    })
  })

  describe('sanitizeLargeDocument', () => {
    it('should handle small documents synchronously', async () => {
      const html = '<p>Small document</p>'
      
      const result = await sanitizeLargeDocument(html)
      
      expect(result).toContain('<p>Small document</p>')
    })

    it('should process large documents in chunks', async () => {
      // Create a large document
      const largeHtml = '<p>' + 'A'.repeat(60000) + '</p>' // 60KB content
      
      const result = await sanitizeLargeDocument(largeHtml, 30000) // 30KB chunks
      
      expect(result).toContain('<p>')
      expect(result).toContain('A'.repeat(60000))
      expect(result).toContain('</p>')
    }, 10000) // Allow more time for chunked processing
  })

  describe('XSS Attack Vectors', () => {
    const xssPayloads = [
      '<script>alert("xss")</script>',
      '<img src="x" onerror="alert(\'xss\')" />',
      '<a href="javascript:alert(\'xss\')">link</a>',
      '<div onclick="alert(\'xss\')">click</div>',
      '<iframe src="javascript:alert(\'xss\')"></iframe>',
      '<object data="data:text/html,<script>alert(\'xss\')</script>"></object>',
      '<svg onload="alert(\'xss\')"><circle r="5"/></svg>',
      '<math><mtext><script>alert(\'xss\')</script></mtext></math>'
    ]

    it.each(xssPayloads)('should neutralize XSS payload: %s', (payload) => {
      const html = `<p>Safe content</p>${payload}<p>More safe content</p>`
      
      const sanitized = sanitizeAcademicContent(html)
      
      expect(sanitized).toContain('Safe content')
      expect(sanitized).toContain('More safe content')
      expect(sanitized).not.toContain('alert(')
      expect(sanitized).not.toContain('javascript:')
      expect(sanitized).not.toContain('<script>')
    })
  })

  describe('Academic Content Preservation', () => {
    it('should preserve complex mathematical expressions', () => {
      const complexMath = `
        <math xmlns="http://www.w3.org/1998/Math/MathML">
          <mrow>
            <msubsup>
              <mi>∫</mi>
              <mi>a</mi>
              <mi>b</mi>
            </msubsup>
            <mfrac>
              <mrow>
                <mi>f</mi>
                <mo>(</mo>
                <mi>x</mi>
                <mo>)</mo>
              </mrow>
              <mrow>
                <msqrt>
                  <mi>x</mi>
                </msqrt>
              </mrow>
            </mfrac>
            <mi>d</mi>
            <mi>x</mi>
          </mrow>
        </math>
      `
      
      const sanitized = sanitizeAcademicContent(complexMath)
      
      expect(sanitized).toContain('<msubsup>')
      expect(sanitized).toContain('<mfrac>')
      expect(sanitized).toContain('<msqrt>')
      expect(sanitized).toContain('xmlns="http://www.w3.org/1998/Math/MathML"')
    })

    it('should preserve academic table structures with metadata', () => {
      const academicTable = `
        <table data-table-id="results1">
          <caption>
            <strong>Table 1:</strong> Experimental results showing statistical significance
          </caption>
          <thead>
            <tr>
              <th rowspan="2">Condition</th>
              <th colspan="3">Measurements</th>
            </tr>
            <tr>
              <th>Mean</th>
              <th>SD</th>
              <th>p-value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td data-condition="control">Control</td>
              <td>4.23</td>
              <td>0.45</td>
              <td>—</td>
            </tr>
          </tbody>
        </table>
      `
      
      const sanitized = sanitizeAcademicContent(academicTable)
      
      expect(sanitized).toContain('data-table-id="results1"')
      expect(sanitized).toContain('<caption>')
      expect(sanitized).toContain('rowspan="2"')
      expect(sanitized).toContain('colspan="3"')
      expect(sanitized).toContain('data-condition="control"')
    })
  })
})