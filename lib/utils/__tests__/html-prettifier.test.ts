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
      expect(() => prettifyAcademicHtml('')).toThrow('Invalid HTML content')
      expect(() => prettifyAcademicHtml(null as any)).toThrow('Invalid HTML content')
      expect(() => prettifyAcademicHtml(undefined as any)).toThrow('Invalid HTML content')
    })
  })

  describe('prettifyAcademicHtmlSafe', () => {
    it('should return prettified HTML on success', () => {
      const uglyHtml = '<div><p>Test content</p></div>'
      const result = prettifyAcademicHtmlSafe(uglyHtml)
      
      expect(result).toContain('  <p>Test content</p>')
    })

    it('should return original HTML on failure', () => {
      const invalidHtml = ''
      const result = prettifyAcademicHtmlSafe(invalidHtml)
      
      expect(result).toBe(invalidHtml)
    })

    it('should log errors when logger is provided', () => {
      const mockLogger = { warn: jest.fn() }
      const invalidHtml = ''
      
      prettifyAcademicHtmlSafe(invalidHtml, mockLogger, 'test-correlation')
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          step: 'prettification-failed',
          correlationId: 'test-correlation',
          fallbackToOriginal: true
        }),
        'HTML prettification failed, using original content'
      )
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
      const mathContent = '<p>The formula <math><mi>x</mi></math> equals...</p>'
      expect(isAcademicContent(mathContent)).toBe(true)
    })

    it('should detect citations', () => {
      const citationContent = '<p>According to <cite>Smith et al.</cite>...</p>'
      expect(isAcademicContent(citationContent)).toBe(true)
    })

    it('should detect code blocks', () => {
      const codeContent = '<pre><code>function test() {}</code></pre>'
      expect(isAcademicContent(codeContent)).toBe(true)
    })

    it('should detect academic identifiers', () => {
      expect(isAcademicContent('Paper available on arXiv:1234.5678')).toBe(true)
      expect(isAcademicContent('DOI: 10.1000/journal.example')).toBe(true)
      expect(isAcademicContent('Smith et al. demonstrated...')).toBe(true)
    })

    it('should return false for non-academic content', () => {
      const regularContent = '<p>Just a regular blog post with no academic markers.</p>'
      expect(isAcademicContent(regularContent)).toBe(false)
    })
  })

  describe('Academic content preservation integration', () => {
    it('should handle complex academic document structure', () => {
      const complexHtml = `
        <div>
          <h1>Research Paper Title</h1>
          <p>Abstract with <cite>Previous Work (2023)</cite> and formula <math><mi>E</mi><mo>=</mo><mi>m</mi><mi>c</mi><msup><mi>c</mi><mn>2</mn></msup></math>.</p>
          <h2>Methods</h2>
          <p>Our implementation:</p>
          <pre><code>def calculate_result():
    # This indentation must be preserved
    return process_data()</code></pre>
          <p>Results show improvement over <cite>Smith et al.</cite> baseline.</p>
        </div>
      `.trim()
      
      const result = prettifyAcademicHtml(complexHtml)
      
      // Should be properly indented
      expect(result).toContain('  <h1>Research Paper Title</h1>')
      expect(result).toContain('  <h2>Methods</h2>')
      
      // Math should be preserved
      expect(result).toContain('<math><mi>E</mi><mo>=</mo><mi>m</mi><mi>c</mi><msup><mi>c</mi><mn>2</mn></msup></math>')
      
      // Code should be preserved with original indentation
      expect(result).toContain('    # This indentation must be preserved')
      expect(result).toContain('    return process_data()')
      
      // Citations should be preserved
      expect(result).toContain('<cite>Previous Work (2023)</cite>')
      expect(result).toContain('<cite>Smith et al.</cite>')
    })
  })

  describe('Real-world academic content validation', () => {
    // Import test samples
    const { 
      ACADEMIC_TEST_SAMPLES, 
      PRESERVATION_TEST_CASES 
    } = require('./academic-content-samples')

    it('should preserve arXiv LaTeXML mathematical notation', () => {
      const result = prettifyAcademicHtml(ACADEMIC_TEST_SAMPLES.arxiv)
      
      // Mathematical content should be preserved exactly
      expect(result).toContain('<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>O</mi><mo stretchy="false">(</mo><msup><mi>n</mi><mn>2</mn></msup><mo stretchy="false">)</mo></math>')
      expect(result).toContain('<mi>softmax</mi>')
      expect(result).toContain('<mfrac>')
      
      // Document structure should be properly indented
      expect(result).toMatch(/\s{2,}<h1 class="ltx_title/)
      expect(result).toMatch(/\s{2,}<section class="ltx_section"/)
    })

    it('should preserve PubMed JATS citation formatting', () => {
      const result = prettifyAcademicHtml(ACADEMIC_TEST_SAMPLES.pubmed)
      
      // Citation references should be preserved
      expect(result).toContain('<xref ref-type="bibr" rid="ref1">Smith et al., 2023</xref>')
      expect(result).toContain('<xref ref-type="bibr" rid="ref2">Johnson and Brown, 2024</xref>')
      
      // Italicized scientific notation should be preserved
      expect(result).toContain('<italic>n</italic> = 1,247')
      
      // Reference structure should be maintained
      expect(result).toContain('<ref id="ref1">')
      expect(result).toContain('<element-citation>')
    })

    it('should preserve IEEE technical code blocks and formatting', () => {
      const result = prettifyAcademicHtml(ACADEMIC_TEST_SAMPLES.ieee)
      
      // Code block content should be completely preserved
      expect(result).toContain('def efficient_sort(data, threshold=1000):')
      expect(result).toContain('    """')
      expect(result).toContain('    Efficient sorting algorithm')
      expect(result).toContain('    if len(data) <= threshold:')
      
      // Mathematical notation should be preserved
      expect(result).toContain('<math xmlns="http://www.w3.org/1998/Math/MathML">')
      expect(result).toContain('<mi>T</mi><mo stretchy="false">(</mo><mi>n</mi><mo stretchy="false">)</mo>')
      
      // IEEE citation format should be preserved
      expect(result).toContain('<cite>Chen et al. [1]</cite>')
      expect(result).toContain('<cite>Rodriguez and Kim [2]</cite>')
    })

    it('should preserve Nature/Springer figure captions and table structures', () => {
      const result = prettifyAcademicHtml(ACADEMIC_TEST_SAMPLES.nature)
      
      // Figure caption formatting should be preserved
      expect(result).toContain('<strong>Figure 1: Quantum coherence measurements')
      expect(result).toContain('<strong>a</strong>, Coherence time as a function')
      expect(result).toContain('<strong>c</strong>, Comparison with theoretical')
      
      // Table structure should be properly indented but content preserved
      expect(result).toContain('<th rowspan="2">Sample Type</th>')
      expect(result).toContain('<th colspan="3">Laser Parameters</th>')
      expect(result).toContain('<td>680 ± 5</td>')
      expect(result).toContain('<td>0.85 ± 0.03</td>')
      
      // Scientific notation should be preserved
      expect(result).toContain('n = 15 independent measurements')
    })

    it('should handle malformed HTML gracefully', () => {
      expect(() => {
        prettifyAcademicHtml(ACADEMIC_TEST_SAMPLES.malformed)
      }).not.toThrow()
      
      // Safe prettification should handle malformed input
      const result = prettifyAcademicHtmlSafe(ACADEMIC_TEST_SAMPLES.malformed)
      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThan(0)
    })

    it('should preserve all critical formatting patterns', () => {
      PRESERVATION_TEST_CASES.forEach(testCase => {
        const result = prettifyAcademicHtml(testCase.input)
        
        testCase.mustPreserve.forEach(pattern => {
          expect(result).toContain(pattern)
        })
      })
    })

    it('should handle large documents efficiently', () => {
      const startTime = Date.now()
      const result = prettifyAcademicHtml(ACADEMIC_TEST_SAMPLES.large)
      const processingTime = Date.now() - startTime
      
      // Should process in reasonable time (under 1 second for test)
      expect(processingTime).toBeLessThan(1000)
      
      // Should maintain document structure
      expect(result).toContain('<h1>Comprehensive Review of Machine Learning')
      expect(result).toContain('<section id="section-1">')
      expect(result).toContain('<section id="section-50">')
      
      // Should preserve code blocks throughout
      expect(result).toContain('def analyze_papers_1(dataset):')
      expect(result).toContain('def analyze_papers_50(dataset):')
    })

    it('should handle mixed academic content types', () => {
      const result = prettifyAcademicHtml(ACADEMIC_TEST_SAMPLES.mixed)
      
      // Should preserve all content types in one document
      expect(result).toContain('<cite>Knuth (1997)</cite>') // CS citation
      expect(result).toContain('<cite>Watson & Crick (1953)</cite>') // Biology citation
      expect(result).toContain('<cite>Schrödinger (1944)</cite>') // Physics citation
      
      // Mathematical notation
      expect(result).toContain('<mi>H</mi><mo>=</mo>')
      expect(result).toContain('<munderover>')
      
      // Code preservation
      expect(result).toContain('def quantum_biological_simulation(system_params):')
      expect(result).toContain('    """')
      expect(result).toContain('    psi = initialize_coherent_state(system_params)')
      
      // Inline math
      expect(result).toContain('<math><mi>τ</mi><mo>></mo><mn>100</mn></math>')
    })
  })
})