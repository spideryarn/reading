/**
 * Tests for HTML Fragment Processor Service
 * 
 * Tests the post-processing of HTML fragments from vision-based PDF page processing,
 * including image extraction, class annotation, and validation.
 */

import {
  processHtmlFragment,
  processFragmentsBatch,
  type FragmentProcessingInput,
  type ProcessedFragment
} from '../html-fragment-processor'

// Mock the logger
jest.mock('@/lib/services/logger', () => ({
  createRequestLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  })
}))

// Mock the deterministic ID assignment
jest.mock('@/lib/services/deterministicId', () => ({
  assignPageAwareIds: jest.fn((html, pageNumber) => {
    // Simple mock that adds IDs to elements
    return html.replace(/<(h[1-6]|p|figure|table)/g, (match, tag) => {
      const id = `page-${pageNumber}-${tag}-${Math.random().toString(36).substr(2, 8)}`
      return `<${tag} id="${id}"`
    })
  })
}))

describe('HTML Fragment Processor Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('processHtmlFragment', () => {
    const mockInput: FragmentProcessingInput = {
      htmlFragment: `
        <div class="page-1">
          <h2>Introduction</h2>
          <p>This is a sample academic document with various elements.</p>
          <figure data-bbox="0.1,0.2,0.9,0.6" class="page-1-figure">
            <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==" alt="Sample figure">
            <figcaption>Figure 1.1: Sample figure caption</figcaption>
          </figure>
          <table>
            <thead>
              <tr><th>Column 1</th><th>Column 2</th></tr>
            </thead>
            <tbody>
              <tr><td>Data 1</td><td>Data 2</td></tr>
            </tbody>
          </table>
          <!-- continues-on-next-page: section-content -->
        </div>
      `,
      pageNumber: 1,
      totalPages: 5,
      existingIds: new Set(['existing-id-1', 'existing-id-2']),
      fileName: 'test-document.pdf'
    }

    it('should successfully process an HTML fragment', async () => {
      const result = await processHtmlFragment(mockInput)

      expect(result.success).toBe(true)
      expect(result.pageNumber).toBe(1)
      expect(result.htmlFragment).toBeDefined()
      expect(result.htmlFragment.length).toBeGreaterThan(0)
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0)
      expect(result.errors).toEqual([])
    })

    it('should extract images with bounding boxes', async () => {
      const result = await processHtmlFragment(mockInput)

      expect(result.extractedImages).toHaveLength(1)
      expect(result.extractedImages[0]).toMatchObject({
        elementType: 'figure',
        bbox: {
          x1: 0.1,
          y1: 0.2,
          x2: 0.9,
          y2: 0.6
        },
        figureNumber: '1.1',
        caption: 'Figure 1.1: Sample figure caption',
        altText: 'Sample figure'
      })
    })

    it('should analyze page structure and annotations', async () => {
      const result = await processHtmlFragment(mockInput)

      expect(result.annotations).toMatchObject({
        pageNumber: 1,
        columnCount: 1,
        contentSections: expect.any(Array),
        crossPageElements: ['continues-on-next-page: section-content']
      })
    })

    it('should assign deterministic IDs to elements', async () => {
      const result = await processHtmlFragment(mockInput)

      expect(result.assignedIds).toBeInstanceOf(Array)
      expect(result.assignedIds.length).toBeGreaterThan(0)
      
      // Check that IDs are present in the processed HTML
      result.assignedIds.forEach(id => {
        expect(result.htmlFragment).toContain(`id="${id}"`)
      })
    })

    it('should handle invalid bounding box formats gracefully', async () => {
      const inputWithInvalidBbox: FragmentProcessingInput = {
        ...mockInput,
        htmlFragment: `
          <figure data-bbox="invalid,bbox,format" class="page-1-figure">
            <img src="data:image/png;base64,test" alt="Test">
          </figure>
        `
      }

      const result = await processHtmlFragment(inputWithInvalidBbox)

      expect(result.success).toBe(true)
      expect(result.extractedImages).toHaveLength(0)
      expect(result.warnings).toContain(expect.stringContaining('Invalid bounding box format'))
    })

    it('should validate input schema', async () => {
      const invalidInput = {
        htmlFragment: '', // Invalid - empty string
        pageNumber: 0, // Invalid - must be >= 1
        totalPages: 5
      } as FragmentProcessingInput

      const result = await processHtmlFragment(invalidInput)

      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('String must contain at least 1 character')
    })

    it('should handle multiple column layouts', async () => {
      const multiColumnInput: FragmentProcessingInput = {
        ...mockInput,
        htmlFragment: `
          <div class="page-1">
            <div class="column-left">
              <h2>Left Column Content</h2>
              <p>This is in the left column.</p>
            </div>
            <div class="column-right">
              <h2>Right Column Content</h2>
              <p>This is in the right column.</p>
            </div>
          </div>
        `
      }

      const result = await processHtmlFragment(multiColumnInput)

      expect(result.success).toBe(true)
      expect(result.annotations.columnCount).toBe(2)
    })

    it('should extract figure numbers from various formats', async () => {
      const figureInput: FragmentProcessingInput = {
        ...mockInput,
        htmlFragment: `
          <figure data-bbox="0.1,0.2,0.9,0.6" class="page-1-figure">
            <span class="figure-ref">Figure 2.3</span>
            <figcaption>Complex mathematical diagram</figcaption>
          </figure>
        `
      }

      const result = await processHtmlFragment(figureInput)

      expect(result.extractedImages).toHaveLength(1)
      expect(result.extractedImages[0].figureNumber).toBe('2.3')
    })

    it('should handle academic content sections', async () => {
      const academicInput: FragmentProcessingInput = {
        ...mockInput,
        htmlFragment: `
          <div class="page-1">
            <section class="abstract">
              <h2>Abstract</h2>
              <p>This paper presents...</p>
            </section>
            <section class="introduction">
              <h2>Introduction</h2>
              <p>Academic research has shown...</p>
            </section>
          </div>
        `
      }

      const result = await processHtmlFragment(academicInput)

      expect(result.success).toBe(true)
      expect(result.annotations.contentSections).toContain('abstract')
      expect(result.annotations.contentSections).toContain('introduction')
    })

    it('should validate fragment structure', async () => {
      const fragmentWithIssues: FragmentProcessingInput = {
        ...mockInput,
        htmlFragment: `
          <div class="page-1">
            <table>
              <!-- Table with no content -->
            </table>
            <figure>
              <!-- Figure with no caption -->
            </figure>
          </div>
        `
      }

      const result = await processHtmlFragment(fragmentWithIssues)

      expect(result.success).toBe(false) // Should have structural errors
      expect(result.errors.length + result.warnings.length).toBeGreaterThan(0)
    })

    it('should handle cross-page element comments', async () => {
      const crossPageInput: FragmentProcessingInput = {
        ...mockInput,
        htmlFragment: `
          <div class="page-1">
            <p>This paragraph continues...</p>
            <!-- continues-on-next-page: paragraph-content -->
            <table>
              <tr><td>Table row 1</td></tr>
              <!-- table-continues-on-next-page -->
            </table>
          </div>
        `
      }

      const result = await processHtmlFragment(crossPageInput)

      expect(result.success).toBe(true)
      expect(result.annotations.crossPageElements).toContain('continues-on-next-page: paragraph-content')
      expect(result.annotations.crossPageElements).toContain('table-continues-on-next-page')
    })
  })

  describe('processFragmentsBatch', () => {
    const mockFragments: FragmentProcessingInput[] = [
      {
        htmlFragment: '<div class="page-1"><h1>Page 1</h1><p>Content 1</p></div>',
        pageNumber: 1,
        totalPages: 3,
        existingIds: new Set()
      },
      {
        htmlFragment: '<div class="page-2"><h2>Page 2</h2><p>Content 2</p></div>',
        pageNumber: 2,
        totalPages: 3,
        existingIds: new Set()
      },
      {
        htmlFragment: '<div class="page-3"><h2>Page 3</h2><p>Content 3</p></div>',
        pageNumber: 3,
        totalPages: 3,
        existingIds: new Set()
      }
    ]

    it('should process multiple fragments maintaining ID uniqueness', async () => {
      const results = await processFragmentsBatch(mockFragments)

      expect(results).toHaveLength(3)
      expect(results.every(r => r.success)).toBe(true)

      // Check that all assigned IDs are unique across fragments
      const allIds = results.flatMap(r => r.assignedIds)
      const uniqueIds = new Set(allIds)
      expect(allIds.length).toBe(uniqueIds.size)
    })

    it('should process fragments sequentially to maintain ID consistency', async () => {
      const results = await processFragmentsBatch(mockFragments)

      // Verify page numbers are processed correctly
      expect(results.map(r => r.pageNumber)).toEqual([1, 2, 3])
      
      // Each result should have processing time > 0
      results.forEach(result => {
        expect(result.processingTimeMs).toBeGreaterThanOrEqual(0)
      })
    })

    it('should handle empty fragment list', async () => {
      const results = await processFragmentsBatch([])

      expect(results).toEqual([])
    })

    it('should handle fragments with errors gracefully', async () => {
      const fragmentsWithErrors: FragmentProcessingInput[] = [
        {
          htmlFragment: '<div>Valid content</div>',
          pageNumber: 1,
          totalPages: 2,
          existingIds: new Set()
        },
        {
          htmlFragment: '', // Invalid empty content
          pageNumber: 2,
          totalPages: 2,
          existingIds: new Set()
        }
      ]

      const results = await processFragmentsBatch(fragmentsWithErrors)

      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(false)
    })
  })

  describe('Image Extraction Functions', () => {
    it('should extract multiple images from a single fragment', async () => {
      const multiImageInput: FragmentProcessingInput = {
        htmlFragment: `
          <div class="page-1">
            <figure data-bbox="0.1,0.1,0.5,0.4" class="page-1-figure">
              <img alt="First figure">
              <figcaption>Figure 1: First image</figcaption>
            </figure>
            <figure data-bbox="0.6,0.1,0.9,0.4" class="page-1-figure">
              <img alt="Second figure">
              <figcaption>Figure 2: Second image</figcaption>
            </figure>
            <div data-bbox="0.2,0.5,0.8,0.9" class="diagram">
              <p>Diagram content</p>
            </div>
          </div>
        `,
        pageNumber: 1,
        totalPages: 1,
        existingIds: new Set()
      }

      const result = await processHtmlFragment(multiImageInput)

      expect(result.extractedImages).toHaveLength(3)
      expect(result.extractedImages[0].elementType).toBe('figure')
      expect(result.extractedImages[1].elementType).toBe('figure')
      expect(result.extractedImages[2].elementType).toBe('diagram')
    })

    it('should handle missing or malformed bounding boxes', async () => {
      const malformedBboxInput: FragmentProcessingInput = {
        htmlFragment: `
          <figure data-bbox="0.1,0.2,invalid" class="page-1-figure">
            <img alt="Bad bbox">
          </figure>
          <figure class="page-1-figure">
            <img alt="No bbox">
          </figure>
        `,
        pageNumber: 1,
        totalPages: 1,
        existingIds: new Set()
      }

      const result = await processHtmlFragment(malformedBboxInput)

      expect(result.extractedImages).toHaveLength(0)
      expect(result.warnings).toContain(expect.stringContaining('Invalid bounding box format'))
    })
  })

  describe('Page Annotation Analysis', () => {
    it('should detect academic content sections correctly', async () => {
      const academicSectionsInput: FragmentProcessingInput = {
        htmlFragment: `
          <div class="page-1">
            <div class="abstract">Abstract content</div>
            <div class="methodology">Method description</div>
            <div class="bibliography">References</div>
          </div>
        `,
        pageNumber: 1,
        totalPages: 1,
        existingIds: new Set()
      }

      const result = await processHtmlFragment(academicSectionsInput)

      expect(result.annotations.contentSections).toContain('abstract')
      expect(result.annotations.contentSections).toContain('methodology')
      expect(result.annotations.contentSections).toContain('bibliography')
    })

    it('should analyze column layouts correctly', async () => {
      const threeColumnInput: FragmentProcessingInput = {
        htmlFragment: `
          <div class="page-1">
            <div class="column-left">Left content</div>
            <div class="column-center">Center content</div>
            <div class="column-right">Right content</div>
          </div>
        `,
        pageNumber: 1,
        totalPages: 1,
        existingIds: new Set()
      }

      const result = await processHtmlFragment(threeColumnInput)

      expect(result.annotations.columnCount).toBe(3)
    })
  })

  describe('Fragment Validation', () => {
    it('should identify structural issues in fragments', async () => {
      const problematicInput: FragmentProcessingInput = {
        htmlFragment: `
          <div class="page-1">
            <h1>Title</h1>
            <h5>Skipped heading levels</h5>
            <table></table>
            <figure></figure>
          </div>
        `,
        pageNumber: 1,
        totalPages: 1,
        existingIds: new Set()
      }

      const result = await processHtmlFragment(problematicInput)

      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.warnings).toContain(expect.stringContaining('heading hierarchy'))
    })

    it('should handle very short content appropriately', async () => {
      const shortContentInput: FragmentProcessingInput = {
        htmlFragment: '<div class="page-1"><p>Hi</p></div>',
        pageNumber: 1,
        totalPages: 1,
        existingIds: new Set()
      }

      const result = await processHtmlFragment(shortContentInput)

      expect(result.warnings).toContain(expect.stringContaining('very little text content'))
    })
  })
})