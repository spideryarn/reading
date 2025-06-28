/**
 * Tests for HTML Fragment Validation Service
 * 
 * Tests the comprehensive validation of HTML fragments and assembled documents
 * for structural integrity, accessibility, and academic formatting compliance.
 */

import {
  validateHtmlFragment,
  validateAssembledDocument,
  validateFragmentsBatch,
  type ValidationConfig
} from '../html-fragment-validator'
import { type ProcessedFragment } from '../html-fragment-processor'
import { type AssembledDocument } from '../html-assembler'

// Mock the logger
jest.mock('@/lib/services/logger', () => ({
  createRequestLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  })
}))

describe('HTML Fragment Validation Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // Helper function to create mock processed fragments
  const createMockFragment = (pageNumber: number, htmlContent: string): ProcessedFragment => ({
    pageNumber,
    htmlFragment: htmlContent,
    extractedImages: [],
    annotations: {
      pageNumber,
      columnCount: 1,
      contentSections: [],
      crossPageElements: []
    },
    assignedIds: [`page-${pageNumber}-element-1`],
    processingTimeMs: 100,
    success: true,
    errors: [],
    warnings: []
  })

  // Helper function to create mock assembled document
  const createMockAssembledDocument = (htmlContent: string): AssembledDocument => ({
    htmlDocument: htmlContent,
    documentMetadata: {
      totalPages: 1,
      successfulPages: 1,
      failedPages: [],
      assemblyTimeMs: 100,
      crossPageMerges: [],
      totalElements: 10,
      documentStructure: {
        headingCount: 2,
        paragraphCount: 3,
        tableCount: 1,
        figureCount: 1,
        listCount: 0
      }
    },
    assemblyNotes: [],
    warnings: [],
    errors: [],
    success: true
  })

  describe('validateHtmlFragment', () => {
    it('should validate a well-formed academic fragment', async () => {
      const goodFragment = createMockFragment(1, `
        <div class="page-1">
          <h2>Introduction</h2>
          <p>This is a well-structured academic document with proper formatting.</p>
          <figure data-bbox="0.1,0.2,0.9,0.6">
            <img src="test.jpg" alt="Research diagram showing methodology">
            <figcaption>Figure 1: Research methodology overview</figcaption>
          </figure>
          <table>
            <caption>Data collection results</caption>
            <thead>
              <tr><th>Method</th><th>Accuracy</th></tr>
            </thead>
            <tbody>
              <tr><td>Method A</td><td>95%</td></tr>
            </tbody>
          </table>
        </div>
      `)

      const result = await validateHtmlFragment(goodFragment)

      expect(result.isValid).toBe(true)
      expect(result.summary.criticalIssues).toBe(0)
      expect(result.elementCount).toBeGreaterThan(0)
      expect(result.contentLength).toBeGreaterThan(50)
    })

    it('should detect structural issues in fragments', async () => {
      const problematicFragment = createMockFragment(1, `
        <div class="page-1">
          <h1>Title</h1>
          <h5>Skipped heading levels - should be h2</h5>
          <p></p> <!-- Empty paragraph -->
          <table></table> <!-- Empty table -->
          <figure></figure> <!-- Empty figure -->
        </div>
      `)

      const result = await validateHtmlFragment(problematicFragment)

      expect(result.summary.warningIssues).toBeGreaterThan(0)
      expect(result.structuralIssues).toContainEqual(
        expect.objectContaining({
          type: 'warning',
          message: expect.stringContaining('empty elements')
        })
      )
    })

    it('should validate accessibility compliance', async () => {
      const inaccessibleFragment = createMockFragment(1, `
        <div class="page-1">
          <img src="chart.jpg"> <!-- Missing alt text -->
          <figure>
            <img src="diagram.jpg" alt="">  <!-- Empty alt text -->
          </figure>
          <table>
            <tr><td>Data</td><td>More data</td></tr> <!-- No headers -->
          </table>
          <a href="#section1"></a> <!-- Empty link text -->
        </div>
      `)

      const config: ValidationConfig = { validateAccessibility: true }
      const result = await validateHtmlFragment(inaccessibleFragment, config)

      expect(result.accessibilityIssues.length).toBeGreaterThan(0)
      expect(result.accessibilityIssues).toContainEqual(
        expect.objectContaining({
          type: 'error',
          message: 'Image missing alt attribute',
          wcagLevel: 'A'
        })
      )
    })

    it('should validate academic document structure', async () => {
      const academicFragment = createMockFragment(1, `
        <div class="page-1">
          <div class="abstract">
            <h2>Abstract</h2>
            <p>Research abstract content.</p>
          </div>
          <cite></cite> <!-- Empty citation -->
          <span class="figure-ref">Figure 1.1</span>
          <span class="figure-ref">Figure 1.1</span> <!-- Duplicate figure number -->
          <span class="equation-number">Equation 1</span> <!-- Non-standard format -->
        </div>
      `)

      const config: ValidationConfig = { validateAcademicStructure: true }
      const result = await validateHtmlFragment(academicFragment, config)

      expect(result.academicIssues.length).toBeGreaterThan(0)
      expect(result.academicIssues).toContainEqual(
        expect.objectContaining({
          type: 'warning',
          message: expect.stringContaining('Citation element has insufficient content'),
          category: 'citations'
        })
      )
    })

    it('should calculate performance metrics', async () => {
      const fragment = createMockFragment(1, `
        <div class="page-1">
          <div id="section1">
            <div id="section1"> <!-- Duplicate ID -->
              <h2>Content</h2>
              <p>Paragraph with <a href="#nonexistent">broken link</a></p>
            </div>
          </div>
        </div>
      `)

      const result = await validateHtmlFragment(fragment)

      expect(result.performanceMetrics.domComplexity).toBeGreaterThan(0)
      expect(result.performanceMetrics.nestingDepth).toBeGreaterThan(1)
      expect(result.performanceMetrics.duplicateIds).toContain('section1')
      expect(result.performanceMetrics.brokenReferences).toContain('nonexistent')
    })

    it('should enforce content length requirements', async () => {
      const shortFragment = createMockFragment(1, '<div class="page-1"><p>Hi</p></div>')

      const config: ValidationConfig = { minContentLength: 100 }
      const result = await validateHtmlFragment(shortFragment, config)

      expect(result.structuralIssues).toContainEqual(
        expect.objectContaining({
          type: 'warning',
          message: expect.stringContaining('Insufficient content')
        })
      )
    })

    it('should validate against allowed tags when configured', async () => {
      const fragmentWithForbiddenTags = createMockFragment(1, `
        <div class="page-1">
          <p>Allowed content</p>
          <script>alert('forbidden')</script>
          <iframe src="example.com"></iframe>
        </div>
      `)

      const config: ValidationConfig = {
        allowedTags: ['div', 'p', 'h1', 'h2', 'h3'],
        strictMode: true
      }
      const result = await validateHtmlFragment(fragmentWithForbiddenTags, config)

      expect(result.structuralIssues).toContainEqual(
        expect.objectContaining({
          type: 'error',
          message: 'Invalid HTML tag: script'
        })
      )
      expect(result.structuralIssues).toContainEqual(
        expect.objectContaining({
          type: 'error',
          message: 'Invalid HTML tag: iframe'
        })
      )
    })

    it('should handle strict mode vs lenient mode', async () => {
      const fragmentWithIssues = createMockFragment(1, `
        <div class="page-1">
          <custom-element>Custom content</custom-element>
        </div>
      `)

      // Lenient mode
      const lenientConfig: ValidationConfig = {
        allowedTags: ['div', 'p'],
        strictMode: false
      }
      const lenientResult = await validateHtmlFragment(fragmentWithIssues, lenientConfig)

      // Strict mode
      const strictConfig: ValidationConfig = {
        allowedTags: ['div', 'p'],
        strictMode: true
      }
      const strictResult = await validateHtmlFragment(fragmentWithIssues, strictConfig)

      // Should have warnings in lenient mode, errors in strict mode
      expect(lenientResult.structuralIssues.some(issue => issue.type === 'warning')).toBe(true)
      expect(strictResult.structuralIssues.some(issue => issue.type === 'error')).toBe(true)
    })

    it('should handle element count limits', async () => {
      const hugeLargeFragment = createMockFragment(1, `
        <div class="page-1">
          ${Array.from({ length: 50 }, (_, i) => `<p>Paragraph ${i + 1}</p>`).join('')}
        </div>
      `)

      const config: ValidationConfig = { maxElementsPerPage: 20 }
      const result = await validateHtmlFragment(hugeLargeFragment, config)

      expect(result.structuralIssues).toContainEqual(
        expect.objectContaining({
          type: 'warning',
          message: expect.stringContaining('exceeding recommended maximum')
        })
      )
    })

    it('should handle validation errors gracefully', async () => {
      const corruptedFragment: ProcessedFragment = {
        pageNumber: 1,
        htmlFragment: '<div><p>Unclosed and malformed HTML structure with no closing tags',
        extractedImages: [],
        annotations: {
          pageNumber: 1,
          columnCount: 1,
          contentSections: [],
          crossPageElements: []
        },
        assignedIds: [],
        processingTimeMs: 100,
        success: true,
        errors: [],
        warnings: []
      }

      const result = await validateHtmlFragment(corruptedFragment)

      expect(result).toBeDefined()
      expect(result.isValid).toBeDefined()
      expect(result.validationTimeMs).toBeGreaterThanOrEqual(0)
    })

    it('should validate table structure correctly', async () => {
      const tableFragment = createMockFragment(1, `
        <div class="page-1">
          <table>
            <thead>
              <tr><th>Col 1</th><th>Col 2</th></tr>
            </thead>
            <tbody>
              <tr><td>Data 1</td><td>Data 2</td></tr>
              <tr><td>Data 3</td></tr> <!-- Inconsistent columns -->
            </tbody>
          </table>
        </div>
      `)

      const config: ValidationConfig = { validateAcademicStructure: true }
      const result = await validateHtmlFragment(tableFragment, config)

      expect(result.academicIssues).toContainEqual(
        expect.objectContaining({
          type: 'warning',
          message: expect.stringContaining('inconsistent row lengths'),
          category: 'tables'
        })
      )
    })

    it('should validate equation formatting', async () => {
      const equationFragment = createMockFragment(1, `
        <div class="page-1">
          <span class="equation-number">(1.2)</span> <!-- Good format -->
          <span class="equation-number">Equation 5</span> <!-- Bad format -->
        </div>
      `)

      const config: ValidationConfig = { validateAcademicStructure: true }
      const result = await validateHtmlFragment(equationFragment, config)

      expect(result.academicIssues).toContainEqual(
        expect.objectContaining({
          type: 'info',
          message: expect.stringContaining('Equation number format may not follow standard conventions'),
          category: 'equations'
        })
      )
    })
  })

  describe('validateAssembledDocument', () => {
    it('should validate a complete HTML document', async () => {
      const goodDocument = createMockAssembledDocument(`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <title>Research Paper</title>
            <meta charset="UTF-8">
          </head>
          <body>
            <main>
              <h1>Document Title</h1>
              <p>Content with proper structure.</p>
            </main>
          </body>
        </html>
      `)

      const result = await validateAssembledDocument(goodDocument)

      expect(result.isValid).toBe(true)
      expect(result.summary.criticalIssues).toBe(0)
    })

    it('should detect missing HTML5 document structure', async () => {
      const incompleteDocument = createMockAssembledDocument(`
        <html>
          <body>
            <h1>Title</h1>
            <p>Content without proper HTML5 structure</p>
          </body>
        </html>
      `)

      const result = await validateAssembledDocument(incompleteDocument)

      expect(result.structuralIssues).toContainEqual(
        expect.objectContaining({
          type: 'error',
          message: 'Document missing DOCTYPE declaration'
        })
      )
      expect(result.structuralIssues).toContainEqual(
        expect.objectContaining({
          type: 'warning',
          message: 'Document missing language declaration'
        })
      )
      expect(result.structuralIssues).toContainEqual(
        expect.objectContaining({
          type: 'warning',
          message: 'Document missing title element'
        })
      )
    })

    it('should validate cross-page consistency', async () => {
      const documentWithCrossPageElements: AssembledDocument = {
        ...createMockAssembledDocument('<html><body>Content</body></html>'),
        documentMetadata: {
          ...createMockAssembledDocument('').documentMetadata,
          crossPageMerges: [
            {
              elementType: 'table',
              sourcePageNumber: 1,
              targetPageNumber: 2,
              mergeInstruction: 'table-continues-on-next-page',
              confidence: 0.3 // Low confidence
            }
          ]
        }
      }

      const config: ValidationConfig = { validateCrossPageElements: true }
      const result = await validateAssembledDocument(documentWithCrossPageElements, config)

      expect(result.structuralIssues).toContainEqual(
        expect.objectContaining({
          type: 'warning',
          message: expect.stringContaining('Low confidence cross-page merge')
        })
      )
    })

    it('should detect lack of main content structure', async () => {
      const documentWithoutMainContent = createMockAssembledDocument(`
        <!DOCTYPE html>
        <html lang="en">
          <head><title>Test</title></head>
          <body>
            <!-- No main content structure -->
          </body>
        </html>
      `)

      const result = await validateAssembledDocument(documentWithoutMainContent)

      expect(result.structuralIssues).toContainEqual(
        expect.objectContaining({
          type: 'warning',
          message: 'Document lacks clear main content structure'
        })
      )
    })

    it('should handle document validation errors gracefully', async () => {
      const corruptedDocument = createMockAssembledDocument('Invalid HTML that cannot be parsed properly')

      const result = await validateAssembledDocument(corruptedDocument)

      expect(result).toBeDefined()
      expect(result.isValid).toBeDefined()
    })
  })

  describe('validateFragmentsBatch', () => {
    const mockFragments: ProcessedFragment[] = [
      createMockFragment(1, `
        <div class="page-1">
          <h1>Title</h1>
          <p>Good content with proper structure.</p>
        </div>
      `),
      createMockFragment(2, `
        <div class="page-2">
          <img src="test.jpg"> <!-- Missing alt text -->
          <p>Content with accessibility issues.</p>
        </div>
      `),
      createMockFragment(3, `
        <div class="page-3">
          <table></table> <!-- Empty table -->
          <p>Content with structural issues.</p>
        </div>
      `)
    ]

    it('should validate multiple fragments in batch', async () => {
      const results = await validateFragmentsBatch(mockFragments)

      expect(results).toHaveLength(3)
      expect(results[0].isValid).toBe(true) // Good fragment
      expect(results[1].isValid).toBe(false) // Has accessibility issues
      expect(results[2].isValid).toBe(true) // Structural issues are warnings, not errors
    })

    it('should apply configuration to all fragments', async () => {
      const config: ValidationConfig = {
        validateAccessibility: false,
        strictMode: false
      }

      const results = await validateFragmentsBatch(mockFragments, config)

      // Should not validate accessibility, so fragment 2 should pass
      expect(results[1].accessibilityIssues).toHaveLength(0)
    })

    it('should handle empty fragment list', async () => {
      const results = await validateFragmentsBatch([])

      expect(results).toEqual([])
    })

    it('should process fragments in parallel', async () => {
      const startTime = Date.now()
      await validateFragmentsBatch(mockFragments)
      const endTime = Date.now()

      // Should complete reasonably quickly for batch processing
      expect(endTime - startTime).toBeLessThan(5000) // 5 seconds max
    })
  })

  describe('Complex Academic Validation Scenarios', () => {
    it('should validate complex research paper structure', async () => {
      const researchPaperFragment = createMockFragment(1, `
        <div class="page-1">
          <h1>Impact of Machine Learning on Academic Research</h1>
          <div class="abstract">
            <h2>Abstract</h2>
            <p>This paper examines the transformative impact of machine learning technologies...</p>
          </div>
          <h2>1. Introduction</h2>
          <p>Recent advances in artificial intelligence have revolutionized...</p>
          <figure data-bbox="0.1,0.3,0.9,0.7">
            <img src="methodology.png" alt="Research methodology flowchart showing data collection and analysis steps">
            <figcaption>Figure 1.1: Research methodology overview illustrating the three-phase approach</figcaption>
          </figure>
          <h3>1.1 Research Questions</h3>
          <ol>
            <li>How has ML improved research efficiency?</li>
            <li>What are the limitations?</li>
          </ol>
          <p>Previous work by <cite>Smith et al. (2023)</cite> demonstrated...</p>
          <table>
            <caption>Table 1: Comparison of traditional vs ML-enhanced research methods</caption>
            <thead>
              <tr><th>Method</th><th>Time (hours)</th><th>Accuracy (%)</th></tr>
            </thead>
            <tbody>
              <tr><td>Traditional</td><td>120</td><td>85</td></tr>
              <tr><td>ML-Enhanced</td><td>24</td><td>94</td></tr>
            </tbody>
          </table>
          <p>The equation for efficiency improvement is: <span class="equation-number">(1.1)</span></p>
        </div>
      `)

      const result = await validateHtmlFragment(researchPaperFragment, {
        validateAccessibility: true,
        validateAcademicStructure: true,
        strictMode: false
      })

      expect(result.isValid).toBe(true)
      expect(result.summary.criticalIssues).toBe(0)
      expect(result.academicIssues.filter(issue => issue.type === 'error')).toHaveLength(0)
      expect(result.accessibilityIssues.filter(issue => issue.type === 'error')).toHaveLength(0)
    })

    it('should handle mathematical content appropriately', async () => {
      const mathFragment = createMockFragment(1, `
        <div class="page-1">
          <h2>Mathematical Analysis</h2>
          <p>The fundamental equation is:</p>
          <p>E = mc<sup>2</sup> <span class="equation-number">(2.1)</span></p>
          <p>Where the derivative ∂f/∂x represents the rate of change.</p>
          <figure data-bbox="0.2,0.3,0.8,0.6">
            <img src="graph.png" alt="Mathematical graph showing exponential growth curve with labeled axes">
            <figcaption>Figure 2.1: Exponential growth function demonstrating theoretical predictions</figcaption>
          </figure>
        </div>
      `)

      const result = await validateHtmlFragment(mathFragment, {
        validateAcademicStructure: true
      })

      expect(result.isValid).toBe(true)
      // Should properly handle mathematical notation and formatting
    })

    it('should validate bibliography and citation formatting', async () => {
      const bibliographyFragment = createMockFragment(1, `
        <div class="page-1 bibliography">
          <h2>References</h2>
          <ol>
            <li><cite>Johnson, A. M., & Smith, B. R. (2023). Machine learning in academic research. <em>Journal of AI Research</em>, 45(3), 123-145.</cite></li>
            <li><cite>Davis, C. (2022). Computational methods for data analysis. University Press.</cite></li>
            <li><cite></cite></li> <!-- Empty citation -->
          </ol>
          <p>As noted in the literature <span class="citation">[1, 2]</span>, these methods...</p>
        </div>
      `)

      const result = await validateHtmlFragment(bibliographyFragment, {
        validateAcademicStructure: true
      })

      expect(result.academicIssues).toContainEqual(
        expect.objectContaining({
          type: 'warning',
          message: expect.stringContaining('Citation element has insufficient content'),
          category: 'citations'
        })
      )
    })
  })

  describe('Performance and Edge Cases', () => {
    it('should handle very large fragments efficiently', async () => {
      const largeContent = Array.from({ length: 1000 }, (_, i) => 
        `<p>This is paragraph number ${i + 1} with sufficient content to test performance.</p>`
      ).join('')

      const largeFragment = createMockFragment(1, `<div class="page-1">${largeContent}</div>`)

      const startTime = Date.now()
      const result = await validateHtmlFragment(largeFragment)
      const endTime = Date.now()

      expect(result).toBeDefined()
      expect(endTime - startTime).toBeLessThan(2000) // Should complete within 2 seconds
      expect(result.elementCount).toBeGreaterThan(1000)
    })

    it('should handle fragments with deep nesting', async () => {
      const deeplyNested = Array.from({ length: 20 }, () => '<div>').join('') +
                          '<p>Deep content</p>' +
                          Array.from({ length: 20 }, () => '</div>').join('')

      const nestedFragment = createMockFragment(1, deeplyNested)

      const result = await validateHtmlFragment(nestedFragment)

      expect(result.performanceMetrics.nestingDepth).toBeGreaterThan(15)
    })

    it('should handle malformed or edge case HTML', async () => {
      const edgeCaseFragments = [
        createMockFragment(1, ''), // Empty HTML
        createMockFragment(2, '<div>'), // Unclosed tags
        createMockFragment(3, 'Plain text without HTML tags'), // No HTML structure
        createMockFragment(4, '<script>alert("test")</script>'), // Potentially dangerous content
      ]

      for (const fragment of edgeCaseFragments) {
        const result = await validateHtmlFragment(fragment)
        
        expect(result).toBeDefined()
        expect(result.isValid).toBeDefined()
        expect(result.validationTimeMs).toBeGreaterThanOrEqual(0)
      }
    })
  })
})