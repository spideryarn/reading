/**
 * Tests for HTML Document Assembly Service
 * 
 * Tests the stitching of processed HTML fragments into complete documents
 * with proper cross-page element handling and document structure.
 */

import {
  assembleDocument,
  quickAssembleFragments,
  type AssemblyConfig
} from '../html-assembler'
import { type ProcessedFragment } from '../html-fragment-processor'

// Mock the logger
jest.mock('@/lib/services/logger', () => ({
  createRequestLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  })
}))

describe('HTML Document Assembly Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // Mock processed fragments for testing
  const createMockFragment = (pageNumber: number, htmlContent: string, crossPageElements: string[] = []): ProcessedFragment => ({
    pageNumber,
    htmlFragment: htmlContent,
    extractedImages: [],
    annotations: {
      pageNumber,
      columnCount: 1,
      contentSections: [],
      crossPageElements
    },
    assignedIds: [`page-${pageNumber}-element-1`, `page-${pageNumber}-element-2`],
    processingTimeMs: 100,
    success: true,
    errors: [],
    warnings: []
  })

  const mockFragments: ProcessedFragment[] = [
    createMockFragment(1, `
      <div class="page-1">
        <h1>Document Title</h1>
        <div class="abstract">
          <h2>Abstract</h2>
          <p>This paper presents novel findings in the field of research.</p>
        </div>
      </div>
    `),
    createMockFragment(2, `
      <div class="page-2">
        <h2>Introduction</h2>
        <p>Academic research has shown that this topic is important...</p>
        <figure data-bbox="0.1,0.2,0.9,0.6" class="page-2-figure">
          <img alt="Research diagram">
          <figcaption>Figure 1: Research methodology overview</figcaption>
        </figure>
      </div>
    `),
    createMockFragment(3, `
      <div class="page-3">
        <h2>Methodology</h2>
        <p>Our approach consists of several key steps...</p>
        <table>
          <thead><tr><th>Step</th><th>Description</th></tr></thead>
          <tbody><tr><td>1</td><td>Data collection</td></tr></tbody>
        </table>
      </div>
    `)
  ]

  describe('assembleDocument', () => {
    it('should successfully assemble a complete document from fragments', async () => {
      const config: AssemblyConfig = {
        preservePageBreaks: true,
        mergeTableRows: true,
        unifyParagraphs: true,
        generateToc: false,
        sanitizeOutput: false,
        validateStructure: true
      }

      const result = await assembleDocument(mockFragments, config)

      expect(result.success).toBe(true)
      expect(result.htmlDocument).toContain('<!DOCTYPE html>')
      expect(result.htmlDocument).toContain('<html lang="en">')
      expect(result.htmlDocument).toContain('Document Title')
      expect(result.htmlDocument).toContain('Abstract')
      expect(result.htmlDocument).toContain('Introduction')
      expect(result.htmlDocument).toContain('Methodology')
    })

    it('should include document metadata with correct statistics', async () => {
      const result = await assembleDocument(mockFragments)

      expect(result.documentMetadata).toMatchObject({
        totalPages: 3,
        successfulPages: 3,
        failedPages: [],
        totalElements: expect.any(Number)
      })

      expect(result.documentMetadata.documentStructure.headingCount).toBeGreaterThan(0)
      expect(result.documentMetadata.documentStructure.paragraphCount).toBeGreaterThan(0)
      expect(result.documentMetadata.documentStructure.tableCount).toBe(1)
      expect(result.documentMetadata.documentStructure.figureCount).toBe(1)
    })

    it('should preserve page breaks when configured', async () => {
      const config: AssemblyConfig = { preservePageBreaks: true }
      const result = await assembleDocument(mockFragments, config)

      expect(result.htmlDocument).toContain('class="page-break"')
      expect(result.htmlDocument).toContain('data-page="2"')
      expect(result.htmlDocument).toContain('data-page="3"')
    })

    it('should handle fragments with missing pages', async () => {
      const incompleteFragments = [
        mockFragments[0], // Page 1
        mockFragments[2]  // Page 3 (missing page 2)
      ]

      const result = await assembleDocument(incompleteFragments)

      expect(result.success).toBe(false) // Should fail due to missing page
      expect(result.errors).toContain(expect.stringContaining('Missing fragments for pages: 2'))
    })

    it('should handle failed fragments gracefully', async () => {
      const fragmentsWithFailure: ProcessedFragment[] = [
        mockFragments[0],
        {
          ...mockFragments[1],
          success: false,
          errors: ['Processing failed'],
          htmlFragment: ''
        },
        mockFragments[2]
      ]

      const result = await assembleDocument(fragmentsWithFailure)

      expect(result.success).toBe(true) // Should succeed despite one failure
      expect(result.documentMetadata.successfulPages).toBe(2)
      expect(result.documentMetadata.failedPages).toEqual([2])
      expect(result.warnings).toContain(expect.stringContaining('Failed pages will be skipped: 2'))
    })

    it('should extract document title from first page', async () => {
      const result = await assembleDocument(mockFragments)

      expect(result.htmlDocument).toContain('<title>Document Title</title>')
    })

    it('should handle cross-page table continuation', async () => {
      const crossPageFragments: ProcessedFragment[] = [
        createMockFragment(1, `
          <table>
            <thead><tr><th>Column 1</th><th>Column 2</th></tr></thead>
            <tbody><tr><td>Row 1 Data</td><td>More data</td></tr></tbody>
          </table>
          <!-- table-continues-on-next-page -->
        `, ['table-continues-on-next-page']),
        createMockFragment(2, `
          <!-- table-continues-from-previous-page -->
          <table>
            <tbody><tr><td>Row 2 Data</td><td>Continued data</td></tr></tbody>
          </table>
        `, ['table-continues-from-previous-page'])
      ]

      const config: AssemblyConfig = { mergeTableRows: true }
      const result = await assembleDocument(crossPageFragments, config)

      expect(result.success).toBe(true)
      expect(result.documentMetadata.crossPageMerges).toHaveLength(1)
      expect(result.documentMetadata.crossPageMerges[0].elementType).toBe('table')
      expect(result.htmlDocument).toContain('TABLE_CONTINUES_ON_NEXT_PAGE')
      expect(result.htmlDocument).toContain('TABLE_CONTINUES_FROM_PREVIOUS_PAGE')
    })

    it('should handle cross-page paragraph continuation', async () => {
      const crossPageFragments: ProcessedFragment[] = [
        createMockFragment(1, `
          <p>This is a paragraph that continues across pages...</p>
          <!-- continues-on-next-page: paragraph-content -->
        `, ['continues-on-next-page: paragraph-content']),
        createMockFragment(2, `
          <!-- continues-from-previous-page: paragraph-content -->
          <p>...and this is the continuation of that paragraph.</p>
        `, ['continues-from-previous-page: paragraph-content'])
      ]

      const config: AssemblyConfig = { unifyParagraphs: true }
      const result = await assembleDocument(crossPageFragments, config)

      expect(result.success).toBe(true)
      expect(result.documentMetadata.crossPageMerges).toHaveLength(1)
      expect(result.documentMetadata.crossPageMerges[0].elementType).toBe('paragraph')
      expect(result.htmlDocument).toContain('PARAGRAPH_CONTINUES_ON_NEXT_PAGE')
      expect(result.htmlDocument).toContain('PARAGRAPH_CONTINUES_FROM_PREVIOUS_PAGE')
    })

    it('should validate final document structure when enabled', async () => {
      const config: AssemblyConfig = { validateStructure: true }
      const result = await assembleDocument(mockFragments, config)

      expect(result.success).toBe(true)
      // Should have no critical structural errors
      expect(result.errors.filter(e => e.includes('missing'))).toEqual([])
    })

    it('should handle empty fragment list', async () => {
      const result = await assembleDocument([])

      expect(result.success).toBe(false)
      expect(result.errors).toContain(expect.stringContaining('No fragments provided'))
    })

    it('should include comprehensive assembly notes', async () => {
      const crossPageFragments: ProcessedFragment[] = [
        createMockFragment(1, '<p>Page 1 content</p>', ['continues-on-next-page: test']),
        createMockFragment(2, '<p>Page 2 content</p>', ['continues-from-previous-page: test'])
      ]

      const result = await assembleDocument(crossPageFragments)

      expect(result.assemblyNotes).toContain(expect.stringContaining('cross-page elements for merging'))
      expect(result.assemblyNotes.length).toBeGreaterThan(0)
    })

    it('should handle assembly errors gracefully', async () => {
      // Create fragment with malformed HTML that might cause parsing issues
      const problematicFragment: ProcessedFragment = {
        ...mockFragments[0],
        htmlFragment: '<div><p>Unclosed paragraph and malformed structure'
      }

      const result = await assembleDocument([problematicFragment])

      // Should not crash, should handle gracefully
      expect(result).toBeDefined()
      expect(result.success).toBeDefined()
    })
  })

  describe('Cross-Page Element Identification', () => {
    it('should identify table continuations correctly', async () => {
      const tableFragments: ProcessedFragment[] = [
        createMockFragment(1, '<table>Table start</table>', ['table-continues-on-next-page']),
        createMockFragment(2, '<table>Table end</table>', ['table-continues-from-previous-page'])
      ]

      const result = await assembleDocument(tableFragments)

      expect(result.documentMetadata.crossPageMerges).toHaveLength(1)
      expect(result.documentMetadata.crossPageMerges[0]).toMatchObject({
        elementType: 'table',
        sourcePageNumber: 1,
        targetPageNumber: 2,
        confidence: expect.any(Number)
      })
    })

    it('should identify multiple cross-page elements', async () => {
      const multiCrossPageFragments: ProcessedFragment[] = [
        createMockFragment(1, '<content>', [
          'table-continues-on-next-page',
          'continues-on-next-page: section-header'
        ]),
        createMockFragment(2, '<content>', [
          'table-continues-from-previous-page',
          'continues-from-previous-page: section-header'
        ])
      ]

      const result = await assembleDocument(multiCrossPageFragments)

      expect(result.documentMetadata.crossPageMerges).toHaveLength(2)
      expect(result.documentMetadata.crossPageMerges.map(m => m.elementType))
        .toContain('table')
      expect(result.documentMetadata.crossPageMerges.map(m => m.elementType))
        .toContain('section')
    })

    it('should handle unmatched continuation markers', async () => {
      const unmatchedFragments: ProcessedFragment[] = [
        createMockFragment(1, '<content>', ['continues-on-next-page: orphaned']),
        createMockFragment(2, '<content>', []) // No matching continues-from-previous-page
      ]

      const result = await assembleDocument(unmatchedFragments)

      expect(result.documentMetadata.crossPageMerges).toHaveLength(1)
      // Should still identify the element even if unmatched
      expect(result.documentMetadata.crossPageMerges[0].mergeInstruction)
        .toBe('continues-on-next-page: orphaned')
    })
  })

  describe('Document Structure Analysis', () => {
    it('should correctly count document elements', async () => {
      const result = await assembleDocument(mockFragments)

      const { documentStructure } = result.documentMetadata
      
      expect(documentStructure.headingCount).toBeGreaterThan(0)
      expect(documentStructure.paragraphCount).toBeGreaterThan(0)
      expect(documentStructure.tableCount).toBe(1)
      expect(documentStructure.figureCount).toBe(1)
      expect(documentStructure.listCount).toBe(0)
    })

    it('should detect missing document title', async () => {
      const fragmentsWithoutTitle = mockFragments.map(f => ({
        ...f,
        htmlFragment: f.htmlFragment.replace('<h1>Document Title</h1>', '')
      }))

      const result = await assembleDocument(fragmentsWithoutTitle)

      expect(result.htmlDocument).toContain('<title>Assembled Document</title>')
    })

    it('should handle complex academic document structure', async () => {
      const academicFragments: ProcessedFragment[] = [
        createMockFragment(1, `
          <h1>Research Paper Title</h1>
          <div class="abstract"><p>Abstract content</p></div>
        `),
        createMockFragment(2, `
          <h2>1. Introduction</h2>
          <p>Introduction paragraph</p>
          <h3>1.1 Background</h3>
          <p>Background information</p>
        `),
        createMockFragment(3, `
          <h2>2. Methodology</h2>
          <ul><li>Step 1</li><li>Step 2</li></ul>
          <h2>3. Results</h2>
          <table><tr><td>Data</td></tr></table>
        `)
      ]

      const result = await assembleDocument(academicFragments)

      expect(result.documentMetadata.documentStructure.headingCount).toBe(5)
      expect(result.documentMetadata.documentStructure.listCount).toBe(1)
      expect(result.documentMetadata.documentStructure.tableCount).toBe(1)
    })
  })

  describe('quickAssembleFragments', () => {
    it('should quickly assemble fragments without complex processing', async () => {
      const quickResult = await quickAssembleFragments(mockFragments)

      expect(quickResult).toContain('<!DOCTYPE html>')
      expect(quickResult).toContain('Document Title')
      expect(quickResult).toContain('class="page-break"')
      expect(quickResult).toContain('Abstract')
      expect(quickResult).toContain('Introduction')
      expect(quickResult).toContain('Methodology')
    })

    it('should handle failed fragments in quick assembly', async () => {
      const fragmentsWithFailure = [
        mockFragments[0],
        { ...mockFragments[1], success: false },
        mockFragments[2]
      ]

      const quickResult = await quickAssembleFragments(fragmentsWithFailure)

      expect(quickResult).toContain('Document Title')
      expect(quickResult).toContain('Methodology')
      expect(quickResult).not.toContain('Introduction') // Failed fragment excluded
    })

    it('should extract title for quick assembly', async () => {
      const quickResult = await quickAssembleFragments(mockFragments)

      expect(quickResult).toContain('<title>Document Title</title>')
    })

    it('should handle empty fragments list in quick assembly', async () => {
      const quickResult = await quickAssembleFragments([])

      expect(quickResult).toContain('<!DOCTYPE html>')
      expect(quickResult).toContain('<title>Document</title>')
    })
  })

  describe('Configuration Options', () => {
    it('should disable page breaks when configured', async () => {
      const config: AssemblyConfig = { preservePageBreaks: false }
      const result = await assembleDocument(mockFragments, config)

      expect(result.htmlDocument).not.toContain('class="page-break"')
    })

    it('should disable table merging when configured', async () => {
      const crossPageFragments: ProcessedFragment[] = [
        createMockFragment(1, '<table>Table start</table>', ['table-continues-on-next-page']),
        createMockFragment(2, '<table>Table end</table>', ['table-continues-from-previous-page'])
      ]

      const config: AssemblyConfig = { mergeTableRows: false }
      const result = await assembleDocument(crossPageFragments, config)

      expect(result.htmlDocument).not.toContain('TABLE_CONTINUES')
    })

    it('should disable paragraph merging when configured', async () => {
      const crossPageFragments: ProcessedFragment[] = [
        createMockFragment(1, '<p>Paragraph start</p>', ['continues-on-next-page: paragraph']),
        createMockFragment(2, '<p>Paragraph end</p>', ['continues-from-previous-page: paragraph'])
      ]

      const config: AssemblyConfig = { unifyParagraphs: false }
      const result = await assembleDocument(crossPageFragments, config)

      expect(result.htmlDocument).not.toContain('PARAGRAPH_CONTINUES')
    })

    it('should disable structure validation when configured', async () => {
      const config: AssemblyConfig = { validateStructure: false }
      const result = await assembleDocument(mockFragments, config)

      expect(result.success).toBe(true)
      // Should not perform additional validation checks
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed HTML gracefully', async () => {
      const malformedFragment: ProcessedFragment = {
        ...mockFragments[0],
        htmlFragment: '<div><p>Unclosed tags and broken structure<span>'
      }

      const result = await assembleDocument([malformedFragment])

      expect(result).toBeDefined()
      expect(result.success).toBeDefined()
      // Should not throw errors
    })

    it('should provide meaningful error messages', async () => {
      const result = await assembleDocument([])

      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('No fragments provided')
    })

    it('should handle fragments with missing required fields', async () => {
      const incompleteFragment = {
        pageNumber: 1,
        htmlFragment: '<div>Content</div>',
        // Missing other required fields
      } as ProcessedFragment

      const result = await assembleDocument([incompleteFragment])

      // Should handle gracefully even with incomplete fragment data
      expect(result).toBeDefined()
    })
  })
})