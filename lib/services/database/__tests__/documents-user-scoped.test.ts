/**
 * DocumentService User-Scoped Methods Tests
 * 
 * Tests for the new user-scoped methods added to DocumentService including:
 * - createForUser
 * - getByUserId  
 * - isOwnedByUser
 * - updateOwnership
 * 
 * These tests focus on user ownership functionality and UUID validation.
 */

import { createClient } from '@/lib/supabase/client'
import { DocumentService } from '../documents'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Document } from '@/lib/types/database'

// Mock Supabase client for unit tests
const mockSupabaseClient = {
  from: jest.fn(() => mockSupabaseClient),
  select: jest.fn(() => mockSupabaseClient),
  insert: jest.fn(() => mockSupabaseClient),
  update: jest.fn(() => mockSupabaseClient),
  delete: jest.fn(() => mockSupabaseClient),
  eq: jest.fn(() => mockSupabaseClient),
  range: jest.fn(() => mockSupabaseClient),
  order: jest.fn(() => mockSupabaseClient),
  single: jest.fn(),
} as unknown as SupabaseClient<Database>

// Test data
const testUserId = '123e4567-e89b-12d3-a456-426614174000'
const otherUserId = '987fcdeb-51a2-43d7-8765-123456789abc'
const testDocumentId = '456e7890-e89b-12d3-a456-426614174000'
const invalidUserId = 'invalid-uuid'
const invalidDocumentId = 'invalid-doc-id'

const testDocument: Document = {
  id: testDocumentId,
  title: 'Test Document',
  html_content: '<h1>Test</h1><p>Content</p>',
  plaintext_content: 'Test\nContent',
  slug: 'test-document',
  created_by: testUserId,
  is_public: false,
  language_code: 'en',
  source_url: null,
  word_count: 2,
  storage_path: null,
  original_file_type: null,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z'
}

describe('DocumentService User-Scoped Methods', () => {
  let documentService: DocumentService

  beforeEach(() => {
    jest.clearAllMocks()
    documentService = new DocumentService(mockSupabaseClient)
  })

  describe('createForUser', () => {
    const documentData = {
      title: 'User Document',
      html_content: '<h1>User Content</h1>',
      plaintext_content: 'User Content',
      slug: 'user-document'
    }

    it('should create document with user ownership', async () => {
      const expectedDocument = { ...testDocument, ...documentData, created_by: testUserId }
      
      mockSupabaseClient.single = jest.fn().mockResolvedValue({
        data: expectedDocument,
        error: null
      })

      const result = await documentService.createForUser(testUserId, documentData)

      expect(result).toEqual(expectedDocument)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('documents')
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith({
        ...documentData,
        created_by: testUserId
      })
      expect(mockSupabaseClient.select).toHaveBeenCalled()
      expect(mockSupabaseClient.single).toHaveBeenCalled()
    })

    it('should throw error for invalid user ID format', async () => {
      await expect(documentService.createForUser(invalidUserId, documentData))
        .rejects.toThrow('Invalid user ID format')

      expect(mockSupabaseClient.from).not.toHaveBeenCalled()
    })

    it('should handle creation failure', async () => {
      mockSupabaseClient.single = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Creation failed' }
      })

      await expect(documentService.createForUser(testUserId, documentData))
        .rejects.toThrow('Failed to create document: Creation failed')
    })

    it('should create document with minimal required fields', async () => {
      const minimalData = {
        title: 'Minimal Doc',
        html_content: '<p>Minimal</p>',
        plaintext_content: 'Minimal',
        slug: 'minimal-doc'
      }

      const expectedDocument = { ...testDocument, ...minimalData, created_by: testUserId }
      
      mockSupabaseClient.single = jest.fn().mockResolvedValue({
        data: expectedDocument,
        error: null
      })

      const result = await documentService.createForUser(testUserId, minimalData)

      expect(result).toEqual(expectedDocument)
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith({
        ...minimalData,
        created_by: testUserId
      })
    })

    it('should preserve all optional fields when provided', async () => {
      const fullData = {
        title: 'Full Document',
        html_content: '<h1>Full Content</h1>',
        plaintext_content: 'Full Content',
        slug: 'full-document',
        is_public: true,
        language_code: 'es',
        source_url: 'https://example.com',
        word_count: 10,
        storage_path: '/path/to/file.pdf',
        original_file_type: 'pdf'
      }

      const expectedDocument = { ...testDocument, ...fullData, created_by: testUserId }
      
      mockSupabaseClient.single = jest.fn().mockResolvedValue({
        data: expectedDocument,
        error: null
      })

      const result = await documentService.createForUser(testUserId, fullData)

      expect(result).toEqual(expectedDocument)
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith({
        ...fullData,
        created_by: testUserId
      })
    })

    it('should validate various invalid UUID formats', async () => {
      const invalidUUIDs = [
        '',
        '123',
        '123-456-789',
        '123e4567-e89b-12d3-a456-42661417400',  // too short
        '123e4567-e89b-12d3-a456-4266141740000', // too long
        '123g4567-e89b-12d3-a456-426614174000',  // invalid character
        '123e4567_e89b_12d3_a456_426614174000',  // wrong separators
        'not-a-uuid-at-all'
      ]

      for (const invalidUUID of invalidUUIDs) {
        await expect(documentService.createForUser(invalidUUID, documentData))
          .rejects.toThrow('Invalid user ID format')
      }
    })
  })

  describe('getByUserId', () => {
    it('should return documents owned by user', async () => {
      const userDocuments = [testDocument, { ...testDocument, id: 'another-doc-id' }]
      
      mockSupabaseClient.order = jest.fn().mockResolvedValue({
        data: userDocuments,
        error: null,
        count: 2
      })

      const result = await documentService.getByUserId(testUserId)

      expect(result.documents).toEqual(userDocuments)
      expect(result.hasMore).toBe(false)
    })

    it('should return empty array for invalid user ID', async () => {
      const result = await documentService.getByUserId(invalidUserId)

      expect(result.documents).toEqual([])
      expect(result.hasMore).toBe(false)
      expect(mockSupabaseClient.from).not.toHaveBeenCalled()
    })

    it('should handle pagination correctly', async () => {
      const manyDocuments = Array.from({ length: 15 }, (_, i) => ({
        ...testDocument,
        id: `doc-${i}`,
        title: `Document ${i}`
      }))

      // Mock first page request
      mockSupabaseClient.order = jest.fn().mockResolvedValue({
        data: manyDocuments.slice(0, 10),
        error: null,
        count: 15
      })

      const result = await documentService.getByUserId(testUserId, { limit: 10 })

      expect(result.documents).toHaveLength(10)
      expect(result.hasMore).toBe(true)
    })

    it('should pass through options to list method', async () => {
      // Spy on the list method to verify it receives correct parameters
      const listSpy = jest.spyOn(documentService, 'list').mockResolvedValue({
        documents: [testDocument],
        hasMore: false
      })

      await documentService.getByUserId(testUserId, {
        includePublic: true,
        limit: 5,
        offset: 10
      })

      expect(listSpy).toHaveBeenCalledWith({
        createdBy: testUserId,
        limit: 5,
        offset: 10
      })

      listSpy.mockRestore()
    })

    it('should handle empty result set', async () => {
      mockSupabaseClient.order = jest.fn().mockResolvedValue({
        data: [],
        error: null,
        count: 0
      })

      const result = await documentService.getByUserId(testUserId)

      expect(result.documents).toEqual([])
      expect(result.hasMore).toBe(false)
    })

    it('should handle database errors in list method', async () => {
      const listSpy = jest.spyOn(documentService, 'list').mockRejectedValue(
        new Error('Database connection failed')
      )

      await expect(documentService.getByUserId(testUserId))
        .rejects.toThrow('Database connection failed')

      listSpy.mockRestore()
    })
  })

  describe('isOwnedByUser', () => {
    it('should return true when user owns document', async () => {
      mockSupabaseClient.single = jest.fn().mockResolvedValue({
        data: { created_by: testUserId },
        error: null
      })

      const result = await documentService.isOwnedByUser(testDocumentId, testUserId)

      expect(result).toBe(true)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('documents')
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('created_by')
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', testDocumentId)
      expect(mockSupabaseClient.single).toHaveBeenCalled()
    })

    it('should return false when user does not own document', async () => {
      mockSupabaseClient.single = jest.fn().mockResolvedValue({
        data: { created_by: otherUserId },
        error: null
      })

      const result = await documentService.isOwnedByUser(testDocumentId, testUserId)

      expect(result).toBe(false)
    })

    it('should return false when document not found', async () => {
      mockSupabaseClient.single = jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Document not found' }
      })

      const result = await documentService.isOwnedByUser(testDocumentId, testUserId)

      expect(result).toBe(false)
    })

    it('should return false when database error occurs', async () => {
      mockSupabaseClient.single = jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST500', message: 'Database error' }
      })

      const result = await documentService.isOwnedByUser(testDocumentId, testUserId)

      expect(result).toBe(false)
    })

    it('should return false for invalid document ID format', async () => {
      const result = await documentService.isOwnedByUser(invalidDocumentId, testUserId)

      expect(result).toBe(false)
      expect(mockSupabaseClient.from).not.toHaveBeenCalled()
    })

    it('should return false for invalid user ID format', async () => {
      const result = await documentService.isOwnedByUser(testDocumentId, invalidUserId)

      expect(result).toBe(false)
      expect(mockSupabaseClient.from).not.toHaveBeenCalled()
    })

    it('should return false when both IDs are invalid', async () => {
      const result = await documentService.isOwnedByUser(invalidDocumentId, invalidUserId)

      expect(result).toBe(false)
      expect(mockSupabaseClient.from).not.toHaveBeenCalled()
    })

    it('should handle null created_by field', async () => {
      mockSupabaseClient.single = jest.fn().mockResolvedValue({
        data: { created_by: null },
        error: null
      })

      const result = await documentService.isOwnedByUser(testDocumentId, testUserId)

      expect(result).toBe(false)
    })

    it('should be case-sensitive for user ID comparison', async () => {
      const uppercaseUserId = testUserId.toUpperCase()
      
      mockSupabaseClient.single = jest.fn().mockResolvedValue({
        data: { created_by: testUserId },
        error: null
      })

      const result = await documentService.isOwnedByUser(testDocumentId, uppercaseUserId)

      // Should return false because UUIDs are case-sensitive in comparison
      expect(result).toBe(false)
    })
  })

  describe('updateOwnership', () => {
    it('should update document ownership successfully', async () => {
      const updatedDocument = { ...testDocument, created_by: otherUserId }
      
      // Mock the update method
      const updateSpy = jest.spyOn(documentService, 'update').mockResolvedValue(updatedDocument)

      const result = await documentService.updateOwnership(testDocumentId, otherUserId)

      expect(result).toEqual(updatedDocument)
      expect(updateSpy).toHaveBeenCalledWith(testDocumentId, { created_by: otherUserId })

      updateSpy.mockRestore()
    })

    it('should throw error for invalid document ID format', async () => {
      await expect(documentService.updateOwnership(invalidDocumentId, testUserId))
        .rejects.toThrow('Invalid ID format')
    })

    it('should throw error for invalid user ID format', async () => {
      await expect(documentService.updateOwnership(testDocumentId, invalidUserId))
        .rejects.toThrow('Invalid ID format')
    })

    it('should throw error when both IDs are invalid', async () => {
      await expect(documentService.updateOwnership(invalidDocumentId, invalidUserId))
        .rejects.toThrow('Invalid ID format')
    })

    it('should handle document not found', async () => {
      const updateSpy = jest.spyOn(documentService, 'update').mockResolvedValue(null)

      const result = await documentService.updateOwnership(testDocumentId, otherUserId)

      expect(result).toBeNull()
      updateSpy.mockRestore()
    })

    it('should handle update failures', async () => {
      const updateSpy = jest.spyOn(documentService, 'update').mockRejectedValue(
        new Error('Update failed')
      )

      await expect(documentService.updateOwnership(testDocumentId, otherUserId))
        .rejects.toThrow('Update failed')

      updateSpy.mockRestore()
    })

    it('should handle transferring ownership to same user', async () => {
      // Document already owned by testUserId, transferring to same user
      const updateSpy = jest.spyOn(documentService, 'update').mockResolvedValue(testDocument)

      const result = await documentService.updateOwnership(testDocumentId, testUserId)

      expect(result).toEqual(testDocument)
      expect(updateSpy).toHaveBeenCalledWith(testDocumentId, { created_by: testUserId })

      updateSpy.mockRestore()
    })

    it('should validate UUID format strictly', async () => {
      // Test edge cases of UUID validation
      const edgeCaseUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000', // valid
        '123E4567-E89B-12D3-A456-426614174000', // valid uppercase
        '123e4567-e89b-12d3-a456-426614174000 ', // trailing space - invalid
        ' 123e4567-e89b-12d3-a456-426614174000', // leading space - invalid
        '123e4567-e89b-12d3-a456-426614174000\n', // newline - invalid
        '123e4567e89b12d3a456426614174000', // no dashes - invalid
      ]

      const validUUIDs = edgeCaseUUIDs.slice(0, 2)
      const invalidUUIDs = edgeCaseUUIDs.slice(2)

      // Valid UUIDs should work
      for (const validUUID of validUUIDs) {
        const updateSpy = jest.spyOn(documentService, 'update').mockResolvedValue(testDocument)
        
        const result = await documentService.updateOwnership(validUUID, validUUID)
        expect(result).toEqual(testDocument)
        
        updateSpy.mockRestore()
      }

      // Invalid UUIDs should throw error
      for (const invalidUUID of invalidUUIDs) {
        await expect(documentService.updateOwnership(invalidUUID, testUserId))
          .rejects.toThrow('Invalid ID format')
        
        await expect(documentService.updateOwnership(testDocumentId, invalidUUID))
          .rejects.toThrow('Invalid ID format')
      }
    })
  })

  describe('UUID validation edge cases across all methods', () => {
    it('should handle mixed case UUIDs consistently', async () => {
      const mixedCaseUserId = '123E4567-e89b-12D3-a456-426614174000'
      const mixedCaseDocId = '456E7890-e89b-12D3-a456-426614174000'

      // createForUser should accept mixed case
      mockSupabaseClient.single = jest.fn().mockResolvedValue({
        data: testDocument,
        error: null
      })

      await expect(documentService.createForUser(mixedCaseUserId, {
        title: 'Test',
        html_content: '<p>Test</p>',
        plaintext_content: 'Test',
        slug: 'test'
      })).resolves.toBeTruthy()

      // isOwnedByUser should accept mixed case
      mockSupabaseClient.single = jest.fn().mockResolvedValue({
        data: { created_by: testUserId },
        error: null
      })

      const ownership = await documentService.isOwnedByUser(mixedCaseDocId, mixedCaseUserId)
      expect(ownership).toBe(false) // Different case should not match

      // updateOwnership should accept mixed case
      const updateSpy = jest.spyOn(documentService, 'update').mockResolvedValue(testDocument)
      
      await expect(documentService.updateOwnership(mixedCaseDocId, mixedCaseUserId))
        .resolves.toBeTruthy()

      updateSpy.mockRestore()
    })

    it('should reject UUIDs with various whitespace issues', async () => {
      const whitespaceVariants = [
        ` ${testUserId}`,      // leading space
        `${testUserId} `,      // trailing space
        ` ${testUserId} `,     // both spaces
        `${testUserId}\t`,     // tab
        `${testUserId}\n`,     // newline
        `\t${testUserId}`,     // leading tab
      ]

      for (const variant of whitespaceVariants) {
        // Should reject in getByUserId
        const result = await documentService.getByUserId(variant)
        expect(result.documents).toEqual([])

        // Should reject in createForUser
        await expect(documentService.createForUser(variant, {
          title: 'Test',
          html_content: '<p>Test</p>',
          plaintext_content: 'Test',
          slug: 'test'
        })).rejects.toThrow('Invalid user ID format')

        // Should reject in isOwnedByUser
        const ownership = await documentService.isOwnedByUser(testDocumentId, variant)
        expect(ownership).toBe(false)

        // Should reject in updateOwnership
        await expect(documentService.updateOwnership(testDocumentId, variant))
          .rejects.toThrow('Invalid ID format')
      }
    })
  })
})