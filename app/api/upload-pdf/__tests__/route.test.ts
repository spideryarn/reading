/**
 * Tests for PDF upload API route with token limit checking
 * 
 * Tests the critical fix for detecting and handling token limit exhaustion
 * to prevent silent data truncation.
 * 
 * @jest-environment node
 */

// Load test environment with cheaper model
require('dotenv').config({ path: '.env.test' })

// Mock dependencies
jest.mock('@/lib/auth/server-auth')
jest.mock('@/lib/supabase/server')
jest.mock('@/lib/services/logger', () => ({
  createRequestLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  })),
  generateCorrelationId: jest.fn(() => 'test-correlation-id'),
  logAIOperation: jest.fn(),
  createTimer: jest.fn(() => ({
    end: jest.fn()
  }))
}))
jest.mock('@/lib/prompts/types')
jest.mock('@/lib/services/html-document-processor')
jest.mock('@/lib/utils/pdf-validation')
jest.mock('@/lib/prompts/templates/pdf-to-html-direct', () => ({
  createPdfToHtmlPrompt: jest.fn(() => ({
    name: 'pdf-to-html-direct',
    template: 'test template'
  }))
}))
jest.mock('@/lib/config', () => ({
  getModelForAICall: jest.fn(() => ({
    modelString: 'anthropic:claude-3-5-haiku:20241022',
    config: { model: 'claude-3-5-haiku-20241022' }
  })),
  UPLOAD_LIMITS: {
    PDF_MAX_PAGES: 200
  }
}))

// Create mock AiCallService instance
const mockAiCallService = {
  startCallWithModelString: jest.fn(),
  completeCall: jest.fn()
}

// Mock the AiCallService class
jest.mock('@/lib/services/database/ai-calls', () => ({
  AiCallService: jest.fn(() => mockAiCallService)
}))

import { NextRequest, NextResponse } from 'next/server'
import { POST } from '../route'
import { requireAuth } from '@/lib/auth/server-auth'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { executeMultimodalPromptWithUsage } from '@/lib/prompts/types'
import { processHtmlToDocument } from '@/lib/services/html-document-processor'
import { validatePdfPageCountFromBuffer } from '@/lib/utils/pdf-validation'

const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>
const mockGetSupabaseServerClient = getSupabaseServerClient as jest.MockedFunction<typeof getSupabaseServerClient>
const mockExecuteMultimodalPromptWithUsage = executeMultimodalPromptWithUsage as jest.MockedFunction<typeof executeMultimodalPromptWithUsage>
const mockProcessHtmlToDocument = processHtmlToDocument as jest.MockedFunction<typeof processHtmlToDocument>
const mockValidatePdfPageCountFromBuffer = validatePdfPageCountFromBuffer as jest.MockedFunction<typeof validatePdfPageCountFromBuffer>

describe('PDF Upload API - Token Limit Checking', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com'
  }

  const mockPdfBuffer = Buffer.from('%PDF-1.4 test content')
  const mockFormData = new FormData()
  
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default mocks
    mockRequireAuth.mockResolvedValue(mockUser)
    mockGetSupabaseServerClient.mockResolvedValue({} as any)
    mockValidatePdfPageCountFromBuffer.mockResolvedValue({
      isValid: true,
      pageCount: 10
    })
    
    // Reset AI Call Service mocks
    mockAiCallService.startCallWithModelString.mockResolvedValue({ id: 'test-ai-call-id' })
    mockAiCallService.completeCall.mockResolvedValue(undefined)
  })

  const createMockRequest = (formData: FormData) => {
    const request = new NextRequest('http://localhost:3000/api/upload-pdf', {
      method: 'POST',
      body: formData as any
    })
    
    // Mock formData method
    request.formData = jest.fn().mockResolvedValue(formData)
    
    return request
  }

  describe('Token Limit Exhaustion Handling', () => {
    it('should throw error when finishReason is "length" indicating token limit exhaustion', async () => {
      // Arrange
      const file = new File([mockPdfBuffer], 'test.pdf', { type: 'application/pdf' })
      mockFormData.append('pdf', file)
      mockFormData.append('provider', 'claude')
      mockFormData.append('title', 'Test Document')
      
      const mockHtmlResult = {
        text: '<h1>Partial content...</h1>',
        usage: {
          promptTokens: 50000,
          completionTokens: 150000,
          totalTokens: 200000
        },
        finishReason: 'length' // Indicates token limit reached
      }
      
      mockExecuteMultimodalPromptWithUsage.mockResolvedValue(mockHtmlResult)
      
      // Act
      const request = createMockRequest(mockFormData)
      const response = await POST(request)
      
      // Assert
      expect(response.status).toBe(413) // Payload Too Large
      const responseText = await response.text()
      expect(responseText).toContain('Document too large for processing')
      expect(responseText).toContain('token limit')
      expect(responseText).toContain('10-page PDF')
      
      // Verify AI call was completed with error metadata
      expect(mockAiCallService.completeCall).toHaveBeenCalledWith(
        'test-ai-call-id',
        expect.objectContaining({
          output_data: expect.objectContaining({
            error: 'Token limit exhausted'
          }),
          finishReason: 'length'
        })
      )
      
      // Verify document processing was NOT attempted
      expect(mockProcessHtmlToDocument).not.toHaveBeenCalled()
    })

    it('should process normally when finishReason is "stop" indicating successful completion', async () => {
      // Arrange
      const file = new File([mockPdfBuffer], 'test.pdf', { type: 'application/pdf' })
      mockFormData.append('pdf', file)
      mockFormData.append('provider', 'claude')
      mockFormData.append('title', 'Test Document')
      
      const mockHtmlResult = {
        text: '<h1>Complete content</h1><p>All pages processed successfully.</p>',
        usage: {
          promptTokens: 5000,
          completionTokens: 10000,
          totalTokens: 15000
        },
        finishReason: 'stop' // Indicates successful completion
      }
      
      mockExecuteMultimodalPromptWithUsage.mockResolvedValue(mockHtmlResult)
      
      const mockDocument = {
        id: 'doc-123',
        title: 'Test Document',
        slug: 'test-document',
        html_content: mockHtmlResult.text,
        plaintext_content: 'Complete content. All pages processed successfully.',
        word_count: 6,
        storage_path: 'uploads/doc-123/test.pdf',
        original_file_type: 'application/pdf',
        created_at: new Date().toISOString()
      }
      
      mockProcessHtmlToDocument.mockResolvedValue({
        document: mockDocument,
        storageResult: {
          path: 'uploads/doc-123/test.pdf',
          size: mockPdfBuffer.length,
          mimeType: 'application/pdf'
        }
      })
      
      // Act
      const request = createMockRequest(mockFormData)
      const response = await POST(request)
      
      // Assert
      expect(response.status).toBe(201) // Created
      const responseData = await response.json()
      expect(responseData.success).toBe(true)
      expect(responseData.document.id).toBe('doc-123')
      
      // Verify AI call was completed successfully
      expect(mockAiCallService.completeCall).toHaveBeenCalledWith(
        'test-ai-call-id',
        expect.objectContaining({
          output_data: expect.not.objectContaining({
            error: expect.any(String)
          }),
          finishReason: 'stop'
        })
      )
      
      // Verify document processing was attempted
      expect(mockProcessHtmlToDocument).toHaveBeenCalled()
    })

    it('should handle other finish reasons appropriately', async () => {
      // Arrange
      const file = new File([mockPdfBuffer], 'test.pdf', { type: 'application/pdf' })
      mockFormData.append('pdf', file)
      mockFormData.append('provider', 'gemini')
      mockFormData.append('title', 'Test Document')
      
      const mockHtmlResult = {
        text: '<h1>Content</h1>',
        usage: {
          promptTokens: 1000,
          completionTokens: 2000,
          totalTokens: 3000
        },
        finishReason: 'unknown' // Some other finish reason
      }
      
      mockExecuteMultimodalPromptWithUsage.mockResolvedValue(mockHtmlResult)
      mockProcessHtmlToDocument.mockResolvedValue({
        document: {
          id: 'doc-456',
          title: 'Test Document',
          slug: 'test-document',
          html_content: mockHtmlResult.text,
          plaintext_content: 'Content',
          word_count: 1,
          created_at: new Date().toISOString()
        } as any,
        storageResult: null
      })
      
      // Act
      const request = createMockRequest(mockFormData)
      const response = await POST(request)
      
      // Assert
      expect(response.status).toBe(201) // Should still succeed
      
      // Verify finish reason was still recorded
      expect(mockAiCallService.completeCall).toHaveBeenCalledWith(
        'test-ai-call-id',
        expect.objectContaining({
          finishReason: 'unknown'
        })
      )
    })
  })

  describe('Error Message Quality', () => {
    it('should provide clear, actionable error message for token limit exhaustion', async () => {
      // Arrange
      const file = new File([mockPdfBuffer], 'large-document.pdf', { type: 'application/pdf' })
      mockFormData.append('pdf', file)
      mockFormData.append('provider', 'claude')
      
      mockValidatePdfPageCountFromBuffer.mockResolvedValue({
        isValid: true,
        pageCount: 150 // Large document
      })
      
      mockExecuteMultimodalPromptWithUsage.mockResolvedValue({
        text: '<h1>Truncated...</h1>',
        usage: {
          promptTokens: 180000,
          completionTokens: 20000,
          totalTokens: 200000
        },
        finishReason: 'length'
      })
      
      // Act
      const request = createMockRequest(mockFormData)
      const response = await POST(request)
      
      // Assert
      expect(response.status).toBe(413)
      const responseText = await response.text()
      
      // Check for key elements of a good error message
      expect(responseText).toContain('150-page PDF') // Specific page count
      expect(responseText).toContain('shorter document') // Actionable advice
      expect(responseText).toContain('vision pipeline') // Alternative solution
      expect(responseText).not.toContain('undefined') // No technical artifacts
      expect(responseText).not.toContain('null') // No technical artifacts
    })
  })
})