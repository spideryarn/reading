/**
 * @jest-environment node
 */
/**
 * Sanitization Edge Cases and Performance Tests
 * 
 * Tests for edge cases, performance characteristics, and advanced scenarios
 * in the HTML sanitization implementation used by both APIs.
 */

import { sanitizeAcademicContent, sanitizeUserContent, analyzeHtmlSecurity } from '@/lib/utils/html-sanitizer'

describe('Sanitization Edge Cases and Performance', () => {
  
  describe('Input Validation Edge Cases', () => {
    it('should handle null and undefined inputs gracefully', () => {
      expect(() => sanitizeAcademicContent(null as any)).toThrow('HTML content must be a string')
      expect(() => sanitizeAcademicContent(undefined as any)).toThrow('HTML content must be a string')
      expect(() => sanitizeUserContent(null as any)).toThrow('HTML content must be a string')
      expect(() => sanitizeUserContent(undefined as any)).toThrow('HTML content must be a string')
    })

    it('should handle non-string inputs', () => {
      const nonStringInputs = [123, {}, [], true, Symbol('test')]
      
      for (const input of nonStringInputs) {
        expect(() => sanitizeAcademicContent(input as any)).toThrow('HTML content must be a string')
        expect(() => sanitizeUserContent(input as any)).toThrow('HTML content must be a string')
      }
    })

    it('should handle empty strings correctly', () => {
      expect(sanitizeAcademicContent('')).toBe('')
      expect(sanitizeUserContent('')).toBe('')
    })

    it('should handle whitespace-only strings', () => {
      const whitespaceInputs = [' ', '\n', '\t', '   \n\t   ']
      
      for (const input of whitespaceInputs) {
        const academicResult = sanitizeAcademicContent(input)
        const userResult = sanitizeUserContent(input)
        
        // Should preserve whitespace structure but sanitize
        expect(typeof academicResult).toBe('string')
        expect(typeof userResult).toBe('string')
      }
    })
  })

  describe('Malformed HTML Handling', () => {
    it('should handle unclosed tags', () => {
      const malformedHtml = `
        <div>
          <p>Unclosed paragraph
          <strong>Unclosed strong
          <span>Nested unclosed
        </div>
      `
      
      const result = sanitizeAcademicContent(malformedHtml)
      expect(result).toBeTruthy()
      expect(result).not.toContain('<script>')
    })

    it('should handle deeply nested structures', () => {
      const deeplyNested = '<div>' + '<span>'.repeat(100) + 'Deep content' + '</span>'.repeat(100) + '</div>'
      
      const result = sanitizeAcademicContent(deeplyNested)
      expect(result).toBeTruthy()
      expect(result).toContain('Deep content')
    })

    it('should handle invalid HTML entities', () => {
      const invalidEntities = `
        <p>Valid: &amp; &lt; &gt; &quot;</p>
        <p>Invalid: &invalid; &123; &;</p>
        <p>Incomplete: &amp &lt &gt</p>
      `
      
      const result = sanitizeAcademicContent(invalidEntities)
      expect(result).toBeTruthy()
      expect(result).toContain('Valid:')
      expect(result).toContain('Invalid:')
    })

    it('should handle mixed valid and invalid markup', () => {
      const mixedMarkup = `
        <div>Valid div
          <invalid-tag>Invalid tag content</invalid-tag>
          <p valid-attr="ok" invalid-attr="onclick:alert()">Mixed attributes</p>
          <svg><circle r="5"/></svg>
          <script-like-name>Not actually script</script-like-name>
        </div>
      `
      
      const result = sanitizeAcademicContent(mixedMarkup)
      expect(result).toBeTruthy()
      expect(result).toContain('Valid div')
      expect(result).toContain('Mixed attributes')
      expect(result).not.toContain('onclick:alert()')
    })
  })

  describe('Unicode and International Content', () => {
    it('should preserve Unicode mathematical symbols', () => {
      const unicodeMath = `
        <p>Mathematical symbols: ∫ ∑ ∏ ∆ ∇ ∞ ≠ ≤ ≥ ≈ ≡ ∂ ∈ ∉ ⊂ ⊃</p>
        <p>Greek letters: α β γ δ ε ζ η θ ι κ λ μ ν ξ ο π ρ σ τ υ φ χ ψ ω</p>
        <p>Quantum notation: |ψ⟩ ⟨φ| ⊗ ⊕ ℏ</p>
      `
      
      const result = sanitizeAcademicContent(unicodeMath)
      expect(result).toContain('∫')
      expect(result).toContain('α')
      expect(result).toContain('|ψ⟩')
      expect(result).toContain('ℏ')
    })

    it('should handle right-to-left and bidirectional text', () => {
      const bidiText = `
        <p dir="rtl">Arabic text: العربية</p>
        <p dir="ltr">Hebrew text: עברית</p>
        <p>Mixed: English العربية English עברית English</p>
      `
      
      const result = sanitizeAcademicContent(bidiText)
      expect(result).toContain('dir="rtl"')
      expect(result).toContain('dir="ltr"')
      expect(result).toContain('العربية')
      expect(result).toContain('עברית')
    })

    it('should preserve language attributes', () => {
      const multilingual = `
        <article lang="en">
          <h1>Research Paper</h1>
          <p lang="fr">Résumé en français</p>
          <p lang="de">Deutsche Zusammenfassung</p>
          <p lang="zh">中文摘要</p>
          <p lang="ja">日本語の要約</p>
        </article>
      `
      
      const result = sanitizeAcademicContent(multilingual)
      expect(result).toContain('lang="en"')
      expect(result).toContain('lang="fr"')
      expect(result).toContain('lang="zh"')
      expect(result).toContain('中文摘要')
      expect(result).toContain('日本語の要約')
    })
  })

  describe('Complex Academic Structures', () => {
    it('should handle nested academic elements correctly', () => {
      const complexAcademic = `
        <article>
          <section>
            <h2>Results</h2>
            <figure data-figure-id="complex-1">
              <table data-table-id="nested-in-figure">
                <caption>
                  <strong>Table 1:</strong> Results within a figure
                  <cite data-ref="author2024">(Author, 2024)</cite>
                </caption>
                <thead>
                  <tr>
                    <th rowspan="2">Variable</th>
                    <th colspan="3">Conditions</th>
                  </tr>
                  <tr>
                    <th>A</th>
                    <th>B</th>
                    <th>C</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td data-variable="temperature">T (°C)</td>
                    <td>25.0 ± 0.1</td>
                    <td>50.0 ± 0.2</td>
                    <td>75.0 ± 0.1</td>
                  </tr>
                </tbody>
              </table>
              <figcaption>
                Complex nested structure with
                <math xmlns="http://www.w3.org/1998/Math/MathML">
                  <mrow>
                    <mi>T</mi>
                    <mo>=</mo>
                    <mfrac>
                      <mrow>
                        <mi>Σ</mi>
                        <mi>x</mi>
                      </mrow>
                      <mi>n</mi>
                    </mfrac>
                  </mrow>
                </math>
                equation embedded.
              </figcaption>
            </figure>
          </section>
        </article>
      `
      
      const result = sanitizeAcademicContent(complexAcademic)
      expect(result).toContain('<article>')
      expect(result).toContain('<section>')
      expect(result).toContain('<figure')
      expect(result).toContain('data-figure-id="complex-1"')
      expect(result).toContain('<table')
      expect(result).toContain('data-table-id="nested-in-figure"')
      expect(result).toContain('<caption>')
      expect(result).toContain('<cite')
      expect(result).toContain('data-ref="author2024"')
      expect(result).toContain('rowspan="2"')
      expect(result).toContain('colspan="3"')
      expect(result).toContain('data-variable="temperature"')
      expect(result).toContain('<math')
      expect(result).toContain('<mfrac>')
      expect(result).toContain('<figcaption>')
    })

    it('should handle publisher-specific markup patterns', () => {
      const publisherMarkup = `
        <article>
          <!-- arXiv-style markup -->
          <div class="ltx_document">
            <section class="ltx_section">
              <h2 class="ltx_title">Introduction</h2>
              <div class="ltx_para">Research content</div>
            </section>
          </div>
          
          <!-- IEEE-style markup -->
          <div data-ieee-section="methodology">
            <h3 data-section-id="method-1">Methodology</h3>
            <p data-ieee-content="true">IEEE content</p>
          </div>
          
          <!-- PMC/JATS-style markup converted to standard HTML -->
          <section id="results">
            <h3>Results</h3>
            <a href="#fig1" data-ref-type="fig">Figure 1</a>
            <a href="#ref1" data-ref-type="bibr">Reference 1</a>
          </section>
        </article>
      `
      
      const result = sanitizeAcademicContent(publisherMarkup)
      expect(result).toContain('class="ltx_document"')
      expect(result).toContain('data-ieee-section="methodology"')
      expect(result).toContain('data-section-id="method-1"')
      expect(result).toContain('data-ieee-content="true"')
      expect(result).toContain('id="results"')
      expect(result).toContain('data-ref-type="fig"')
      expect(result).toContain('data-ref-type="bibr"')
    })
  })

  describe('Performance Characteristics', () => {
    it('should handle moderately large documents efficiently', () => {
      const startTime = Date.now()
      
      // Create a 1MB document with mixed content
      const largeDoc = `
        <html>
        <body>
          <article>
            <h1>Large Document Test</h1>
            ${Array(1000).fill(0).map((_, i) => `
              <section>
                <h2>Section ${i}</h2>
                <p>${'Academic content paragraph. '.repeat(50)}</p>
                <math>
                  <mrow>
                    <mi>x</mi>
                    <mo>=</mo>
                    <mn>${i}</mn>
                  </mrow>
                </math>
                <table>
                  <tr>
                    <td>Data ${i}</td>
                    <td>${Math.random()}</td>
                  </tr>
                </table>
              </section>
            `).join('')}
          </article>
        </body>
        </html>
      `
      
      const result = sanitizeAcademicContent(largeDoc)
      const endTime = Date.now()
      const processingTime = endTime - startTime
      
      expect(result).toBeTruthy()
      expect(result).toContain('Large Document Test')
      expect(result).toContain('<math>')
      expect(result).toContain('<table>')
      
      // Should complete within reasonable time (less than 5 seconds for 1MB)
      expect(processingTime).toBeLessThan(5000)
      
      console.log(`Processed ${Math.round(largeDoc.length / 1024)}KB in ${processingTime}ms`)
    })

    it('should handle repeated sanitization calls efficiently', () => {
      const testDoc = `
        <article>
          <h1>Repeated Sanitization Test</h1>
          <p>This document will be sanitized multiple times.</p>
          <script>alert('should be removed')</script>
          <math><mi>x</mi><mo>=</mo><mn>1</mn></math>
          <table>
            <tr><td>Test data</td></tr>
          </table>
        </article>
      `
      
      const startTime = Date.now()
      const results = []
      
      // Sanitize the same document 100 times
      for (let i = 0; i < 100; i++) {
        results.push(sanitizeAcademicContent(testDoc))
      }
      
      const endTime = Date.now()
      const totalTime = endTime - startTime
      
      // All results should be identical
      for (const result of results) {
        expect(result).toEqual(results[0])
        expect(result).not.toContain('<script>')
        expect(result).toContain('<math>')
      }
      
      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(2000) // Less than 2 seconds for 100 calls
      
      console.log(`100 sanitization calls completed in ${totalTime}ms (${(totalTime/100).toFixed(2)}ms avg)`)
    })
  })

  describe('Security Analysis Integration', () => {
    it('should provide accurate security analysis for dangerous content', () => {
      const dangerousDoc = `
        <article>
          <h1>Research Paper</h1>
          <p>Safe content</p>
          <script>maliciousCode()</script>
          <iframe src="javascript:attack()"></iframe>
          <object data="malicious.swf"></object>
          <p onclick="xss()">More content</p>
          <img onerror="steal()" src="image.jpg" />
        </article>
      `
      
      const analysis = analyzeHtmlSecurity(dangerousDoc)
      
      expect(analysis.hasDangerousElements).toBe(true)
      expect(analysis.removedElements).toContain('script')
      expect(analysis.removedElements).toContain('iframe')
      expect(analysis.removedElements).toContain('object')
      expect(analysis.securityScore).toBeLessThan(100)
    })

    it('should provide accurate security analysis for safe academic content', () => {
      const safeDoc = `
        <article>
          <h1>Research Paper</h1>
          <p>Safe academic content</p>
          <math>
            <mrow>
              <mi>E</mi>
              <mo>=</mo>
              <mi>mc</mi>
              <msup><mn>2</mn></msup>
            </mrow>
          </math>
          <figure>
            <figcaption>Safe figure caption</figcaption>
          </figure>
          <table>
            <tr><td>Safe data</td></tr>
          </table>
        </article>
      `
      
      const analysis = analyzeHtmlSecurity(safeDoc)
      
      expect(analysis.hasDangerousElements).toBe(false)
      expect(analysis.removedElements).toEqual([])
      expect(analysis.securityScore).toBe(100)
    })
  })

  describe('Memory and Resource Usage', () => {
    it('should handle maximum size content at the limit', () => {
      // Test at just under the 50MB limit
      const maxSizeContent = '<html><body>' + 'A'.repeat(49 * 1024 * 1024) + '</body></html>'
      
      const startTime = Date.now()
      const result = sanitizeAcademicContent(maxSizeContent)
      const endTime = Date.now()
      
      expect(result).toBeTruthy()
      expect(result.length).toBeGreaterThan(40 * 1024 * 1024) // Should still be large after sanitization
      
      const processingTime = endTime - startTime
      console.log(`Processed ${Math.round(maxSizeContent.length / 1024 / 1024)}MB in ${processingTime}ms`)
      
      // Should complete within reasonable time (less than 30 seconds for max size)
      expect(processingTime).toBeLessThan(30000)
    })

    it('should reject content over the size limit', () => {
      // Test over the 50MB limit
      const oversizeContent = '<html><body>' + 'A'.repeat(51 * 1024 * 1024) + '</body></html>'
      
      expect(() => sanitizeAcademicContent(oversizeContent)).toThrow('HTML content too large')
    })

    it('should handle user content size limits appropriately', () => {
      // User content has a lower limit (10MB)
      const largeUserContent = '<p>' + 'User content. '.repeat(800000) + '</p>' // ~11MB
      
      expect(() => sanitizeUserContent(largeUserContent)).toThrow('HTML content too large')
    })
  })

  describe('Configuration and Options Handling', () => {
    it('should respect preserveMath option', () => {
      const mathContent = `
        <article>
          <p>Text content</p>
          <math><mi>x</mi><mo>=</mo><mn>1</mn></math>
          <p>More text</p>
        </article>
      `
      
      const withMath = sanitizeAcademicContent(mathContent, { preserveMath: true })
      const withoutMath = sanitizeAcademicContent(mathContent, { preserveMath: false })
      
      expect(withMath).toContain('<math>')
      expect(withoutMath).not.toContain('<math>')
      expect(withoutMath).toContain('Text content')
    })

    it('should respect preserveSvg option', () => {
      const svgContent = `
        <article>
          <p>Text content</p>
          <svg><circle r="5"/></svg>
          <p>More text</p>
        </article>
      `
      
      const withSvg = sanitizeAcademicContent(svgContent, { preserveSvg: true })
      const withoutSvg = sanitizeAcademicContent(svgContent, { preserveSvg: false })
      
      expect(withSvg).toContain('<svg>')
      expect(withoutSvg).not.toContain('<svg>')
      expect(withoutSvg).toContain('Text content')
    })

    it('should respect restrictive option', () => {
      const mixedContent = `
        <article>
          <h1>Title</h1>
          <p>Paragraph</p>
          <math><mi>x</mi></math>
          <div data-custom="value">Custom</div>
        </article>
      `
      
      const academic = sanitizeAcademicContent(mixedContent, { restrictive: false })
      const restrictive = sanitizeAcademicContent(mixedContent, { restrictive: true })
      
      expect(academic).toContain('<math>')
      expect(academic).toContain('data-custom="value"')
      
      expect(restrictive).not.toContain('<math>')
      expect(restrictive).not.toContain('data-custom')
      expect(restrictive).toContain('Title')
      expect(restrictive).toContain('Paragraph')
    })
  })
})