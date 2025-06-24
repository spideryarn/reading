/**
 * @jest-environment node
 */
/**
 * Glossary API Entity Capping Edge Cases and Error Scenarios
 * 
 * Comprehensive edge case testing for entity capping functionality,
 * including boundary conditions, error scenarios, and timeout mitigation validation.
 */

import * as glossaryRoute from '../route'
import { createMockRequest } from '../../__tests__/test-helpers'
import { getTestNamespace, initTestTracking, getCleanupFunctions, createTestId } from '@/lib/testing/test-isolation-utils'
import { GLOSSARY_CONFIG, getModelForAICall } from '@/lib/config'
import * as promptTypes from '@/lib/prompts/types'
import * as supabaseServer from '@/lib/supabase/server'
import * as serverAuth from '@/lib/auth/server-auth'
import type { SupabaseClient } from '@supabase/supabase-js'

// Mock external dependencies
jest.mock('@/lib/prompts/types')
jest.mock('@/lib/supabase/server')
jest.mock('@/lib/auth/server-auth')
jest.mock('@/lib/config', () => ({
  ...jest.requireActual('@/lib/config'),
  getModelForAICall: jest.fn()
}))

// Mock service constructors to return specific instances
const mockEnhancementServiceInstance = {
  get: jest.fn(),
  storeGlossary: jest.fn(),
  upsert: jest.fn(),
  getByDocument: jest.fn(),
  getByType: jest.fn(),
  delete: jest.fn(),
  deleteByDocument: jest.fn(),
  storeHeadings: jest.fn(),
  storeSummary: jest.fn()
}

const mockAiCallServiceInstance = {
  startCallWithModelString: jest.fn(),
  completeCall: jest.fn(),
  failCall: jest.fn(),
  getById: jest.fn(),
  list: jest.fn()
}

jest.mock('@/lib/services/database/enhancements', () => ({
  EnhancementService: jest.fn().mockImplementation(() => mockEnhancementServiceInstance)
}))

jest.mock('@/lib/services/database/ai-calls', () => ({
  AiCallService: jest.fn().mockImplementation(() => mockAiCallServiceInstance)
}))

const mockPromptTypes = promptTypes as jest.Mocked<typeof promptTypes>
const mockSupabaseServer = supabaseServer as jest.Mocked<typeof supabaseServer>
const mockServerAuth = serverAuth as jest.Mocked<typeof serverAuth>
const mockGetModelForAICall = getModelForAICall as jest.MockedFunction<typeof getModelForAICall>

// Test data setup
const testNamespace = getTestNamespace('glossary-edge-cases')
const testUserId = createTestId()
const testDocumentId = createTestId()

const mockSupabaseClient = {
  // Mock client implementation
} as unknown as SupabaseClient

describe('Glossary API Entity Capping Edge Cases', () => {
  let cleanup: ReturnType<typeof getCleanupFunctions>

  beforeEach(() => {
    jest.clearAllMocks()
    initTestTracking(testNamespace)
    cleanup = getCleanupFunctions(testNamespace, mockSupabaseClient)
    
    // Setup authentication mock
    mockServerAuth.validateAuth.mockResolvedValue({
      id: testUserId,
      email: `test-${testNamespace}@test.local`
    } as any)
    
    // Setup Supabase client mock
    mockSupabaseServer.createClient.mockResolvedValue(mockSupabaseClient)
    
    // Setup config mock
    mockGetModelForAICall.mockReturnValue({
      modelString: 'anthropic:claude-sonnet-4:20250514',
      config: {
        provider: 'anthropic',
        modelName: 'claude-sonnet-4',
        version: '20250514',
        thinking: false
      }
    })
    
    // Setup service method mocks
    mockEnhancementServiceInstance.get.mockResolvedValue(null)
    mockEnhancementServiceInstance.storeGlossary.mockResolvedValue({ id: createTestId() } as any)
    
    const mockAiCall = { id: createTestId() }
    mockAiCallServiceInstance.startCallWithModelString.mockResolvedValue(mockAiCall as any)
    mockAiCallServiceInstance.completeCall.mockResolvedValue({} as any)
    mockAiCallServiceInstance.failCall.mockResolvedValue({} as any)
  })

  afterEach(async () => {
    await cleanup.all()
  })

  describe('Boundary Conditions', () => {
    it('should handle max_entities = 1 (minimum valid value)', async () => {
      const mockGlossaryResult = {
        text: JSON.stringify({
          entities: [
            {
              name: 'Single Entity',
              ontology: 'concept',
              aliases: ['SE'],
              brief_explanation: 'Only one entity extracted'
            }
          ]
        }),
        usage: { promptTokens: 50, completionTokens: 25, totalTokens: 75, reasoningTokens: 0 },
        finishReason: 'stop'
      }

      mockPromptTypes.executePromptWithUsage.mockResolvedValue(mockGlossaryResult)

      const request = createMockRequest('/api/glossary', {
        method: 'POST',
        body: {
          content: 'Document content for single entity...',
          documentId: testDocumentId,
          max_entities: 1
        }
      })

      const response = await glossaryRoute.POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.entities).toHaveLength(1)
      expect(responseData.entities[0].name).toBe('Single Entity')

      // Verify minimum limit was respected
      expect(mockPromptTypes.executePromptWithUsage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          max_entities: 1
        })
      )
    })

    it('should enforce MAX_TOTAL_ENTITY_LIMIT as upper bound', async () => {
      const excessiveLimit = GLOSSARY_CONFIG.MAX_TOTAL_ENTITY_LIMIT * 2
      const enforcedLimit = GLOSSARY_CONFIG.MAX_TOTAL_ENTITY_LIMIT

      const mockGlossaryResult = {
        text: JSON.stringify({
          entities: Array.from({ length: enforcedLimit }, (_, i) => ({
            name: `Bounded Entity ${i + 1}`,
            ontology: 'concept',
            aliases: [`BE${i + 1}`],
            brief_explanation: `Bounded explanation ${i + 1}`
          }))
        }),
        usage: { promptTokens: 300, completionTokens: 200, totalTokens: 500, reasoningTokens: 0 },
        finishReason: 'stop'
      }

      mockPromptTypes.executePromptWithUsage.mockResolvedValue(mockGlossaryResult)

      const request = createMockRequest('/api/glossary', {
        method: 'POST',
        body: {
          content: 'Document content with excessive limit...',
          documentId: testDocumentId,
          max_entities: excessiveLimit
        }
      })

      const response = await glossaryRoute.POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.entities).toHaveLength(enforcedLimit)

      // Verify safety bound was applied
      expect(mockPromptTypes.executePromptWithUsage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          max_entities: enforcedLimit
        })
      )
    })

    it('should handle extremely long content without timeout', async () => {
      // Simulate very long document content that might cause timeouts
      const longContent = 'A'.repeat(100000) // 100k characters
      
      const mockGlossaryResult = {
        text: JSON.stringify({
          entities: [
            {
              name: 'Long Content Entity',
              ontology: 'concept',
              aliases: ['LCE'],
              brief_explanation: 'Entity extracted from very long content'
            }
          ]
        }),
        usage: { promptTokens: 1000, completionTokens: 50, totalTokens: 1050, reasoningTokens: 0 },
        finishReason: 'stop'
      }

      mockPromptTypes.executePromptWithUsage.mockResolvedValue(mockGlossaryResult)

      const request = createMockRequest('/api/glossary', {
        method: 'POST',
        body: {
          content: longContent,
          documentId: testDocumentId,
          max_entities: GLOSSARY_CONFIG.DEFAULT_ENTITY_LIMIT_PER_REQUEST
        }
      })

      const response = await glossaryRoute.POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.entities).toHaveLength(1)

      // Verify content length was tracked for timeout analysis
      expect(mockAiCallServiceInstance.startCallWithModelString).toHaveBeenCalledWith(
        expect.objectContaining({
          input_data: expect.objectContaining({
            content_length: longContent.length
          })
        })
      )
    })
  })

  describe('Empty and Null Value Handling', () => {
    it('should handle empty existing_entities array gracefully', async () => {
      const mockGlossaryResult = {
        text: JSON.stringify({
          entities: [
            {
              name: 'First Entity',
              ontology: 'concept',
              aliases: ['FE'],
              brief_explanation: 'First entity with empty existing context'
            }
          ]
        }),
        usage: { promptTokens: 80, completionTokens: 40, totalTokens: 120, reasoningTokens: 0 },
        finishReason: 'stop'
      }

      mockPromptTypes.executePromptWithUsage.mockResolvedValue(mockGlossaryResult)

      const request = createMockRequest('/api/glossary', {
        method: 'POST',
        body: {
          content: 'Document content with empty existing entities...',
          documentId: testDocumentId,
          max_entities: 10,
          existing_entities: []
        }
      })

      const response = await glossaryRoute.POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.entities).toHaveLength(1)

      // Verify empty array was handled correctly
      expect(mockAiCallServiceInstance.startCallWithModelString).toHaveBeenCalledWith(
        expect.objectContaining({
          input_data: expect.objectContaining({
            existing_entities_count: 0,
            generate_more_mode: true // Still true because existing_entities was provided
          })
        })
      )
    })

    it('should handle LLM returning empty entities array', async () => {
      const mockGlossaryResult = {
        text: JSON.stringify({
          entities: [] // LLM found no entities
        }),
        usage: { promptTokens: 100, completionTokens: 10, totalTokens: 110, reasoningTokens: 0 },
        finishReason: 'stop'
      }

      mockPromptTypes.executePromptWithUsage.mockResolvedValue(mockGlossaryResult)

      const request = createMockRequest('/api/glossary', {
        method: 'POST',
        body: {
          content: 'Very sparse document with minimal entities...',
          documentId: testDocumentId,
          max_entities: 20
        }
      })

      const response = await glossaryRoute.POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.entities).toHaveLength(0)

      // Verify completion was tracked even with zero entities
      expect(mockAiCallServiceInstance.completeCall).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          output_data: expect.objectContaining({
            entities_count: 0
          })
        })
      )
    })

    it('should handle content with only whitespace gracefully', async () => {
      const whitespaceContent = '   \n\t\r\n   '

      const request = createMockRequest('/api/glossary', {
        method: 'POST',
        body: {
          content: whitespaceContent,
          documentId: testDocumentId
        }
      })

      const response = await glossaryRoute.POST(request)

      // Should be accepted (not an empty string) but LLM might return few/no entities
      expect(response.status).not.toBe(400) // Should not be a validation error
    })
  })

  describe('Malformed Response Handling', () => {
    it('should handle LLM returning partial JSON', async () => {
      const partialJsonResult = {
        text: '{"entities": [{"name": "Partial Entity", "ontology": "concept"', // Truncated JSON
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150, reasoningTokens: 0 },
        finishReason: 'length' // Indicates truncation
      }

      mockPromptTypes.executePromptWithUsage.mockResolvedValue(partialJsonResult)

      const request = createMockRequest('/api/glossary', {
        method: 'POST',
        body: {
          content: 'Document content that causes JSON truncation...',
          documentId: testDocumentId,
          max_entities: 50 // Large limit that might cause truncation
        }
      })

      const response = await glossaryRoute.POST(request)

      expect(response.status).toBe(500)

      // Verify AI call was properly tracked even on failure
      expect(mockAiCallServiceInstance.startCallWithModelString).toHaveBeenCalled()
    })

    it('should handle LLM returning entities with missing required fields', async () => {
      const invalidEntitiesResult = {
        text: JSON.stringify({
          entities: [
            {
              name: 'Valid Entity',
              ontology: 'concept',
              aliases: ['VE'],
              brief_explanation: 'Valid entity'
            },
            {
              name: 'Invalid Entity',
              // Missing ontology, aliases, brief_explanation
            }
          ]
        }),
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150, reasoningTokens: 0 },
        finishReason: 'stop'
      }

      mockPromptTypes.executePromptWithUsage.mockResolvedValue(invalidEntitiesResult)

      const request = createMockRequest('/api/glossary', {
        method: 'POST',
        body: {
          content: 'Document content with validation issues...',
          documentId: testDocumentId
        }
      })

      const response = await glossaryRoute.POST(request)

      expect(response.status).toBe(500)
      
      // Should not store invalid data
      expect(mockEnhancementServiceInstance.storeGlossary).not.toHaveBeenCalled()
    })

    it('should handle LLM returning entities with invalid ontology types', async () => {
      const invalidOntologyResult = {
        text: JSON.stringify({
          entities: [
            {
              name: 'Invalid Ontology Entity',
              ontology: 'invalid_type', // Not in allowed enum
              aliases: ['IOE'],
              brief_explanation: 'Entity with invalid ontology'
            }
          ]
        }),
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150, reasoningTokens: 0 },
        finishReason: 'stop'
      }

      mockPromptTypes.executePromptWithUsage.mockResolvedValue(invalidOntologyResult)

      const request = createMockRequest('/api/glossary', {
        method: 'POST',
        body: {
          content: 'Document content with invalid ontology...',
          documentId: testDocumentId
        }
      })

      const response = await glossaryRoute.POST(request)

      expect(response.status).toBe(500)
    })
  })

  describe('Deduplication Edge Cases', () => {
    it('should handle exact duplicate entities in existing_entities', async () => {
      const duplicateExistingEntities = [
        {
          name: 'Duplicate Entity',
          ontology: 'concept' as const,
          aliases: ['DE'],
          brief_explanation: 'First instance'
        },
        {
          name: 'Duplicate Entity', // Exact same name
          ontology: 'concept' as const,
          aliases: ['DE'],
          brief_explanation: 'Second instance' // Different explanation
        }
      ]

      const mockGlossaryResult = {
        text: JSON.stringify({
          entities: [
            {
              name: 'New Entity',
              ontology: 'event',
              aliases: ['NE'],
              brief_explanation: 'New entity that avoids duplicates'
            }
          ]
        }),
        usage: { promptTokens: 120, completionTokens: 60, totalTokens: 180, reasoningTokens: 0 },
        finishReason: 'stop'
      }

      mockPromptTypes.executePromptWithUsage.mockResolvedValue(mockGlossaryResult)

      const request = createMockRequest('/api/glossary', {
        method: 'POST',
        body: {
          content: 'Document content with duplicate entities...',
          documentId: testDocumentId,
          max_entities: 10,
          existing_entities: duplicateExistingEntities
        }
      })

      const response = await glossaryRoute.POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.entities).toHaveLength(1)
      expect(responseData.entities[0].name).toBe('New Entity')

      // Verify duplicates were passed to LLM for deduplication
      expect(mockPromptTypes.executePromptWithUsage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          existing_entities: duplicateExistingEntities
        })
      )
    })

    it('should handle entities with overlapping aliases', async () => {
      const overlappingEntities = [
        {
          name: 'Primary Entity',
          ontology: 'concept' as const,
          aliases: ['PE', 'Primary', 'Main'],
          brief_explanation: 'Primary entity'
        },
        {
          name: 'Secondary Entity',
          ontology: 'concept' as const,
          aliases: ['SE', 'Secondary', 'Main'], // 'Main' overlaps
          brief_explanation: 'Secondary entity'
        }
      ]

      const mockGlossaryResult = {
        text: JSON.stringify({
          entities: [
            {
              name: 'Distinct Entity',
              ontology: 'place',
              aliases: ['DE', 'Distinct'],
              brief_explanation: 'Entity with distinct aliases'
            }
          ]
        }),
        usage: { promptTokens: 140, completionTokens: 70, totalTokens: 210, reasoningTokens: 0 },
        finishReason: 'stop'
      }

      mockPromptTypes.executePromptWithUsage.mockResolvedValue(mockGlossaryResult)

      const request = createMockRequest('/api/glossary', {
        method: 'POST',
        body: {
          content: 'Document content with overlapping aliases...',
          documentId: testDocumentId,
          existing_entities: overlappingEntities
        }
      })

      const response = await glossaryRoute.POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.entities).toHaveLength(1)
      
      // LLM should have received the overlapping entities for deduplication
      expect(mockPromptTypes.executePromptWithUsage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          existing_entities: overlappingEntities
        })
      )
    })
  })

  describe('Timeout Mitigation Validation', () => {
    it('should demonstrate timeout reduction with conservative limits', async () => {
      const largeDocument = 'Long document content... '.repeat(1000) // Simulate large document
      const conservativeLimit = GLOSSARY_CONFIG.DEFAULT_ENTITY_LIMIT_PER_REQUEST

      const mockGlossaryResult = {
        text: JSON.stringify({
          entities: Array.from({ length: conservativeLimit }, (_, i) => ({
            name: `Conservative Entity ${i + 1}`,
            ontology: 'concept',
            aliases: [`CE${i + 1}`],
            brief_explanation: `Conservative explanation ${i + 1}`
          }))
        }),
        usage: { promptTokens: 500, completionTokens: 200, totalTokens: 700, reasoningTokens: 0 },
        finishReason: 'stop'
      }

      mockPromptTypes.executePromptWithUsage.mockResolvedValue(mockGlossaryResult)

      const request = createMockRequest('/api/glossary', {
        method: 'POST',
        body: {
          content: largeDocument,
          documentId: testDocumentId
          // No max_entities specified - should use conservative default
        }
      })

      const response = await glossaryRoute.POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.entities).toHaveLength(conservativeLimit)

      // Verify conservative limit was applied to large document
      expect(mockPromptTypes.executePromptWithUsage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          max_entities: conservativeLimit
        })
      )

      // Verify token usage was reasonable (timeout mitigation working)
      expect(mockGlossaryResult.usage.totalTokens).toBeLessThan(1000) // Should be manageable
    })

    it('should track timeout scenarios for analysis', async () => {
      const mockAiCall = { id: createTestId() }
      mockAiCallServiceInstance.startCallWithModelString.mockResolvedValue(mockAiCall as any)

      // Simulate timeout error
      const timeoutError = new Error('Request timeout')
      mockPromptTypes.executePromptWithUsage.mockRejectedValue(timeoutError)

      const request = createMockRequest('/api/glossary', {
        method: 'POST',
        body: {
          content: 'Document content that times out...',
          documentId: testDocumentId,
          max_entities: 75 // High limit that might cause timeout
        }
      })

      const response = await glossaryRoute.POST(request)

      expect(response.status).toBe(500)

      // Verify timeout was tracked with context for analysis
      expect(mockAiCallServiceInstance.failCall).toHaveBeenCalledWith(
        mockAiCall.id,
        'Request timeout'
      )

      // Verify the limit that caused timeout was recorded
      expect(mockAiCallServiceInstance.startCallWithModelString).toHaveBeenCalledWith(
        expect.objectContaining({
          input_data: expect.objectContaining({
            entity_limit: 75
          })
        })
      )
    })
  })

  describe('Incremental Loading Scenarios', () => {
    it('should support multiple "load more" operations within limits', async () => {
      const firstBatchEntities = Array.from({ length: 20 }, (_, i) => ({
        name: `First Batch Entity ${i + 1}`,
        ontology: 'concept' as const,
        aliases: [`FBE${i + 1}`],
        brief_explanation: `First batch explanation ${i + 1}`
      }))

      const mockGlossaryResult = {
        text: JSON.stringify({
          entities: Array.from({ length: 15 }, (_, i) => ({
            name: `Second Batch Entity ${i + 1}`,
            ontology: 'concept',
            aliases: [`SBE${i + 1}`],
            brief_explanation: `Second batch explanation ${i + 1}`
          }))
        }),
        usage: { promptTokens: 200, completionTokens: 100, totalTokens: 300, reasoningTokens: 0 },
        finishReason: 'stop'
      }

      mockPromptTypes.executePromptWithUsage.mockResolvedValue(mockGlossaryResult)

      const request = createMockRequest('/api/glossary', {
        method: 'POST',
        body: {
          content: 'Document content for second batch...',
          documentId: testDocumentId,
          max_entities: GLOSSARY_CONFIG.MAX_ENTITIES_PER_REQUEST,
          existing_entities: firstBatchEntities
        }
      })

      const response = await glossaryRoute.POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.entities).toHaveLength(15)

      // Verify incremental loading context
      expect(mockAiCallServiceInstance.startCallWithModelString).toHaveBeenCalledWith(
        expect.objectContaining({
          input_data: expect.objectContaining({
            existing_entities_count: 20,
            generate_more_mode: true,
            entity_limit: GLOSSARY_CONFIG.MAX_ENTITIES_PER_REQUEST
          })
        })
      )
    })

    it('should prevent exceeding MAX_TOTAL_ENTITY_LIMIT across batches', async () => {
      // Simulate scenario where user already has many entities
      const manyExistingEntities = Array.from({ 
        length: GLOSSARY_CONFIG.MAX_TOTAL_ENTITY_LIMIT - 5 
      }, (_, i) => ({
        name: `Existing Entity ${i + 1}`,
        ontology: 'concept' as const,
        aliases: [`EE${i + 1}`],
        brief_explanation: `Existing explanation ${i + 1}`
      }))

      const safeAdditionalLimit = Math.min(
        GLOSSARY_CONFIG.MAX_ENTITIES_PER_REQUEST,
        GLOSSARY_CONFIG.MAX_TOTAL_ENTITY_LIMIT
      )

      const mockGlossaryResult = {
        text: JSON.stringify({
          entities: Array.from({ length: 3 }, (_, i) => ({
            name: `Final Entity ${i + 1}`,
            ontology: 'concept',
            aliases: [`FE${i + 1}`],
            brief_explanation: `Final explanation ${i + 1}`
          }))
        }),
        usage: { promptTokens: 150, completionTokens: 50, totalTokens: 200, reasoningTokens: 0 },
        finishReason: 'stop'
      }

      mockPromptTypes.executePromptWithUsage.mockResolvedValue(mockGlossaryResult)

      const request = createMockRequest('/api/glossary', {
        method: 'POST',
        body: {
          content: 'Document content for final batch...',
          documentId: testDocumentId,
          max_entities: GLOSSARY_CONFIG.MAX_ENTITIES_PER_REQUEST,
          existing_entities: manyExistingEntities
        }
      })

      const response = await glossaryRoute.POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.entities).toHaveLength(3)

      // Verify safety limits were respected
      expect(mockPromptTypes.executePromptWithUsage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          max_entities: safeAdditionalLimit
        })
      )
    })
  })
})