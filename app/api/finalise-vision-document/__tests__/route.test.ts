/**
 * Tests for finalise-vision-document API endpoint
 */

import { NextRequest } from 'next/server'
import { POST } from '../route'
import { requireAuth } from '@/lib/auth/server-auth'
import { documentAssetsService } from '@/lib/services/database/document-assets'
import { DocumentService } from '@/lib/services/database/documents'
import { processHtmlToDocument } from '@/lib/services/html-document-processor'

// Mock dependencies
jest.mock('@/lib/auth/server-auth')
jest.mock('@/lib/services/database/document-assets')
jest.mock('@/lib/services/database/documents')
jest.mock('@/lib/services/html-document-processor')
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({})
}))

const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>
const mockProcessHtmlToDocument = processHtmlToDocument as jest.MockedFunction<typeof processHtmlToDocument>

describe('POST /api/finalise-vision-document', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' }
  const mockDocumentId = '550e8400-e29b-41d4-a716-446655440000'
  
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireAuth.mockResolvedValue(mockUser)
    
    // Mock document assets service
    ;(documentAssetsService.getByDocumentIdAndType as jest.Mock).mockResolvedValue([
      { id: 'asset-1', document_id: mockDocumentId, type: 'image', filename: 'image1.png' },
      { id: 'asset-2', document_id: mockDocumentId, type: 'image', filename: 'image2.png' }
    ])
    ;(documentAssetsService.getDocumentAssetStats as jest.Mock).mockResolvedValue({
      totalAssets: 2,
      assetsByType: { image: 2 },
      totalStorageSize: 200000
    })
  })

  const createRequest = (body: any) => {
    return new NextRequest('http://localhost:3000/api/finalise-vision-document', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  }

  it('should successfully finalise a vision document', async () => {
    const mockDocument = {
      id: mockDocumentId,
      title: 'Test Document',
      slug: 'test-document',
      word_count: 1000,
      created_at: new Date().toISOString()
    }
    
    // Mock document doesn't exist yet
    const mockDocumentService = {
      getById: jest.fn().mockResolvedValue(null)
    }
    ;(DocumentService as jest.Mock).mockImplementation(() => mockDocumentService)
    
    mockProcessHtmlToDocument.mockResolvedValue({
      document: mockDocument,
      storageResult: null
    })

    const request = createRequest({
      documentId: mockDocumentId,
      html: '<p>Test HTML content</p>',
      pageCount: 2,
      title: 'Test Document',
      filename: 'test.pdf',
      isPublic: false
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data).toEqual({
      success: true,
      document: {
        id: mockDocumentId,
        title: 'Test Document',
        slug: 'test-document',
        word_count: 1000,
        created_at: mockDocument.created_at
      },
      assets: {
        total: 2,
        images: 2,
        totalSizeBytes: 200000
      },
      processing: {
        method: 'vision-phase2-finalisation',
        pageCount: 2,
        correlationId: expect.any(String)
      }
    })

    expect(mockProcessHtmlToDocument).toHaveBeenCalledWith(
      '<p>Test HTML content</p>',
      {
        title: 'Test Document',
        sourceUrl: null,
        isPublic: false,
        originalFile: undefined,
        filename: 'test.pdf',
        provider: 'vision-pipeline',
        correlationId: expect.any(String),
        aiCallId: undefined,
        documentId: mockDocumentId
      },
      expect.objectContaining({
        extractionMethod: 'vision-ai-phase2',
        uploadSource: 'pdf',
        userId: 'user-123'
      }),
      expect.objectContaining({
        page_count: 2,
        assets_uploaded: 2,
        image_assets: 2,
        total_storage_bytes: 200000
      })
    )
  })

  it('should validate request body schema', async () => {
    const request = createRequest({
      // Missing required fields
      html: '<p>Test</p>'
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid request data')
    expect(data.details).toBeDefined()
  })

  it('should require authentication', async () => {
    mockRequireAuth.mockRejectedValue(new Error('User not authenticated'))

    const request = createRequest({
      documentId: mockDocumentId,
      html: '<p>Test</p>',
      pageCount: 1,
      title: 'Test',
      filename: 'test.pdf'
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Authentication required')
  })

  it('should prevent duplicate finalisation', async () => {
    const mockDocumentService = {
      getById: jest.fn().mockResolvedValue({
        id: mockDocumentId,
        created_at: '2024-01-01T00:00:00Z'
      })
    }
    ;(DocumentService as jest.Mock).mockImplementation(() => mockDocumentService)

    const request = createRequest({
      documentId: mockDocumentId,
      html: '<p>Test</p>',
      pageCount: 1,
      title: 'Test',
      filename: 'test.pdf'
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.error).toBe('Document has already been finalised')
    expect(data.documentId).toBe(mockDocumentId)
  })

  it('should handle cases where no assets were uploaded', async () => {
    // Mock no assets found
    ;(documentAssetsService.getByDocumentIdAndType as jest.Mock).mockResolvedValue([])
    ;(documentAssetsService.getDocumentAssetStats as jest.Mock).mockResolvedValue({
      totalAssets: 0,
      assetsByType: {},
      totalStorageSize: 0
    })

    const mockDocumentService = {
      getById: jest.fn().mockResolvedValue(null)
    }
    ;(DocumentService as jest.Mock).mockImplementation(() => mockDocumentService)
    
    mockProcessHtmlToDocument.mockResolvedValue({
      document: {
        id: mockDocumentId,
        title: 'Test Document',
        slug: 'test-document',
        word_count: 1000,
        created_at: new Date().toISOString()
      },
      storageResult: null
    })

    const request = createRequest({
      documentId: mockDocumentId,
      html: '<p>Test content with <img src="test.png"> image</p>',
      pageCount: 1,
      title: 'Test Document',
      filename: 'test.pdf'
    })

    const response = await POST(request)
    const data = await response.json()

    // Should still succeed, even if no assets were uploaded
    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.assets.total).toBe(0)
  })

  it('should handle document asset service errors', async () => {
    ;(documentAssetsService.getByDocumentIdAndType as jest.Mock).mockRejectedValue(
      new Error('Failed to get document assets')
    )

    const request = createRequest({
      documentId: mockDocumentId,
      html: '<p>Test</p>',
      pageCount: 1,
      title: 'Test',
      filename: 'test.pdf'
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to validate document assets')
  })

  it('should handle sanitization errors', async () => {
    const mockDocumentService = {
      getById: jest.fn().mockResolvedValue(null)
    }
    ;(DocumentService as jest.Mock).mockImplementation(() => mockDocumentService)
    
    mockProcessHtmlToDocument.mockRejectedValue(
      new Error('Content sanitization failed: Content too large')
    )

    const request = createRequest({
      documentId: mockDocumentId,
      html: '<p>Test</p>',
      pageCount: 1,
      title: 'Test',
      filename: 'test.pdf'
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(413)
    expect(data.error).toContain('too large')
  })

  it('should validate document ID format', async () => {
    const request = createRequest({
      documentId: 'not-a-uuid',
      html: '<p>Test</p>',
      pageCount: 1,
      title: 'Test',
      filename: 'test.pdf'
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid request data')
    expect(data.details[0].message).toContain('Invalid document ID format')
  })

  it('should validate positive page count', async () => {
    const request = createRequest({
      documentId: mockDocumentId,
      html: '<p>Test</p>',
      pageCount: 0,
      title: 'Test',
      filename: 'test.pdf'
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid request data')
    expect(data.details[0].message).toContain('positive integer')
  })
})