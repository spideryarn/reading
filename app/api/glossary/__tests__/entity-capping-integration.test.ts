/**
 * @jest-environment node
 */
/**
 * Glossary API Entity Capping Integration Tests
 * 
 * Integration tests verifying the entity capping functionality for timeout mitigation.
 * Tests the complete workflow from API request through LLM prompt generation to response validation.
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
const testNamespace = getTestNamespace('glossary-entity-capping')
const testUserId = createTestId()
const testDocumentId = createTestId()

const mockSupabaseClient = {
  // Mock client implementation
} as unknown as SupabaseClient

describe('Glossary API Entity Capping Integration', () => {
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
    mockEnhancementServiceInstance.get.mockResolvedValue(null) // No cached glossary by default
    mockEnhancementServiceInstance.storeGlossary.mockResolvedValue({ id: createTestId() } as any)
    
    const mockAiCall = { id: createTestId() }
    mockAiCallServiceInstance.startCallWithModelString.mockResolvedValue(mockAiCall as any)
    mockAiCallServiceInstance.completeCall.mockResolvedValue({} as any)
  })

  afterEach(async () => {
    await cleanup.all()
  })

  describe('Entity Limit Enforcement', () => {
    it('should apply default entity limit when max_entities not specified', async () => {
      const mockGlossaryResult = {
        text: JSON.stringify({
          entities: Array.from({ length: GLOSSARY_CONFIG.DEFAULT_ENTITY_LIMIT_PER_REQUEST }, (_, i) => ({
            name: `Entity ${i + 1}`,
            ontology: 'concept',
            aliases: [`E${i + 1}`],
            brief_explanation: `Explanation for entity ${i + 1}`
          }))
        }),
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150, reasoningTokens: 0 },
        finishReason: 'stop'
      }

      mockPromptTypes.executePromptWithUsage.mockResolvedValue(mockGlossaryResult)

      const request = createMockRequest('/api/glossary', {
        method: 'POST',
        body: {
          content: 'Document content for entity extraction...',
          documentId: testDocumentId
        }
      })

      const response = await glossaryRoute.POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.entities).toHaveLength(GLOSSARY_CONFIG.DEFAULT_ENTITY_LIMIT_PER_REQUEST)

      // Verify AI call was started with default limit
      expect(mockAiCallServiceInstance.startCallWithModelString).toHaveBeenCalledWith(
        expect.objectContaining({
          input_data: expect.objectContaining({
            entity_limit: GLOSSARY_CONFIG.DEFAULT_ENTITY_LIMIT_PER_REQUEST,
            generate_more_mode: false
          })
        })
      )

      // Verify prompt was called with default limit
      expect(mockPromptTypes.executePromptWithUsage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          max_entities: GLOSSARY_CONFIG.DEFAULT_ENTITY_LIMIT_PER_REQUEST
        })
      )
    })

    it('should respect custom max_entities parameter', async () => {
      const customLimit = 15
      const mockGlossaryResult = {
        text: JSON.stringify({
          entities: Array.from({ length: customLimit }, (_, i) => ({
            name: `Custom Entity ${i + 1}`,
            ontology: 'concept',
            aliases: [`CE${i + 1}`],
            brief_explanation: `Custom explanation ${i + 1}`
          }))
        }),
        usage: { promptTokens: 80, completionTokens: 40, totalTokens: 120, reasoningTokens: 0 },
        finishReason: 'stop'
      }

      mockPromptTypes.executePromptWithUsage.mockResolvedValue(mockGlossaryResult)

      const request = createMockRequest('/api/glossary', {
        method: 'POST',
        body: {
          content: 'Document content for custom entity extraction...',
          documentId: testDocumentId,
          max_entities: customLimit
        }
      })

      const response = await glossaryRoute.POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.entities).toHaveLength(customLimit)

      // Verify custom limit was used
      expect(mockPromptTypes.executePromptWithUsage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          max_entities: customLimit
        })
      )
    })

    it('should enforce maximum entity limit safety bound', async () => {
      const excessiveLimit = GLOSSARY_CONFIG.MAX_TOTAL_ENTITY_LIMIT + 50
      const safeLimit = GLOSSARY_CONFIG.MAX_TOTAL_ENTITY_LIMIT

      const mockGlossaryResult = {
        text: JSON.stringify({
          entities: Array.from({ length: safeLimit }, (_, i) => ({
            name: `Safe Entity ${i + 1}`,
            ontology: 'concept',
            aliases: [`SE${i + 1}`],
            brief_explanation: `Safe explanation ${i + 1}`
          }))
        }),
        usage: { promptTokens: 200, completionTokens: 100, totalTokens: 300, reasoningTokens: 0 },
        finishReason: 'stop'
      }

      mockPromptTypes.executePromptWithUsage.mockResolvedValue(mockGlossaryResult)

      const request = createMockRequest('/api/glossary', {
        method: 'POST',
        body: {
          content: 'Document content with excessive entity limit...',
          documentId: testDocumentId,
          max_entities: excessiveLimit
        }
      })

      const response = await glossaryRoute.POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.entities).toHaveLength(safeLimit)

      // Verify safety bound was enforced
      expect(mockPromptTypes.executePromptWithUsage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          max_entities: safeLimit // Should be clamped to MAX_TOTAL_ENTITY_LIMIT
        })
      )

      // Verify AI call tracked the safe limit
      expect(mockAiCallServiceInstance.startCallWithModelString).toHaveBeenCalledWith(
        expect.objectContaining({
          input_data: expect.objectContaining({
            entity_limit: safeLimit
          })
        })
      )
    })
  })

  describe('Generate More Mode', () => {
    const existingEntities = [
      {
        name: 'Existing Entity 1',
        ontology: 'concept' as const,
        aliases: ['EE1'],
        brief_explanation: 'First existing entity'
      },
      {
        name: 'Existing Entity 2',
        ontology: 'person' as const,
        aliases: ['EE2'],
        brief_explanation: 'Second existing entity',
        long_explanation: 'Detailed explanation of second entity'
      }
    ]

    it('should support generate more mode with existing_entities', async () => {
      const additionalEntities = [
        {
          name: 'New Entity 1',
          ontology: 'event' as const,
          aliases: ['NE1'],
          brief_explanation: 'First new entity'
        },
        {
          name: 'New Entity 2',
          ontology: 'place' as const,
          aliases: ['NE2'],
          brief_explanation: 'Second new entity'
        }
      ]

      const mockGlossaryResult = {
        text: JSON.stringify({ entities: additionalEntities }),
        usage: { promptTokens: 150, completionTokens: 75, totalTokens: 225, reasoningTokens: 0 },
        finishReason: 'stop'
      }

      mockPromptTypes.executePromptWithUsage.mockResolvedValue(mockGlossaryResult)

      const request = createMockRequest('/api/glossary', {
        method: 'POST',
        body: {
          content: 'Document content for additional entities...',
          documentId: testDocumentId,
          max_entities: 10,
          existing_entities: existingEntities
        }
      })

      const response = await glossaryRoute.POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.entities).toHaveLength(2)
      expect(responseData.entities[0].name).toBe('New Entity 1')
      expect(responseData.entities[1].name).toBe('New Entity 2')

      // Verify generate more mode was properly tracked
      expect(mockAiCallServiceInstance.startCallWithModelString).toHaveBeenCalledWith(
        expect.objectContaining({
          input_data: expect.objectContaining({
            existing_entities_count: 2,
            generate_more_mode: true
          })
        })
      )

      // Verify existing entities were passed to prompt
      expect(mockPromptTypes.executePromptWithUsage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          existing_entities: existingEntities,
          max_entities: 10
        })
      )
    })

    it('should handle empty existing_entities array', async () => {
      const mockGlossaryResult = {
        text: JSON.stringify({
          entities: [
            {
              name: 'First Entity',
              ontology: 'concept',
              aliases: ['FE'],
              brief_explanation: 'First entity in empty context'
            }
          ]
        }),
        usage: { promptTokens: 90, completionTokens: 45, totalTokens: 135, reasoningTokens: 0 },
        finishReason: 'stop'
      }

      mockPromptTypes.executePromptWithUsage.mockResolvedValue(mockGlossaryResult)

      const request = createMockRequest('/api/glossary', {
        method: 'POST',
        body: {
          content: 'Document content with empty existing entities...',
          documentId: testDocumentId,
          existing_entities: []
        }
      })

      const response = await glossaryRoute.POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.entities).toHaveLength(1)

      // Verify empty existing entities were handled
      expect(mockAiCallServiceInstance.startCallWithModelString).toHaveBeenCalledWith(
        expect.objectContaining({
          input_data: expect.objectContaining({
            existing_entities_count: 0,
            generate_more_mode: true // Still generate more mode because existing_entities was provided
          })
        })
      )
    })
  })

  describe('Deduplication and Content Quality', () => {
    it('should pass through LLM deduplication logic via template', async () => {
      const existingEntities = [
        {
          name: 'Duplicate Test Entity',
          ontology: 'concept' as const,
          aliases: ['DTE', 'Duplicate'],
          brief_explanation: 'An entity that should not be duplicated'
        }
      ]

      // LLM should return entities that don't duplicate existing ones
      const nonDuplicateEntities = [
        {
          name: 'Unique New Entity',
          ontology: 'event' as const,
          aliases: ['UNE'],
          brief_explanation: 'A new entity that doesn\'t duplicate existing ones'
        }
      ]

      const mockGlossaryResult = {
        text: JSON.stringify({ entities: nonDuplicateEntities }),
        usage: { promptTokens: 120, completionTokens: 60, totalTokens: 180, reasoningTokens: 0 },
        finishReason: 'stop'
      }

      mockPromptTypes.executePromptWithUsage.mockResolvedValue(mockGlossaryResult)

      const request = createMockRequest('/api/glossary', {
        method: 'POST',
        body: {
          content: 'Document content that might contain duplicate entities...',
          documentId: testDocumentId,
          existing_entities: existingEntities
        }
      })

      const response = await glossaryRoute.POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      
      // Verify the prompt received existing entities for deduplication
      expect(mockPromptTypes.executePromptWithUsage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          existing_entities: existingEntities
        })
      )

      // Verify response contains only non-duplicate entities
      expect(responseData.entities).toHaveLength(1)
      expect(responseData.entities[0].name).toBe('Unique New Entity')
    })
  })

  describe('API Validation', () => {
    it('should reject invalid max_entities parameter', async () => {
      const request = createMockRequest('/api/glossary', {
        method: 'POST',
        body: {
          content: 'Document content...',
          documentId: testDocumentId,
          max_entities: -5 // Invalid negative value
        }
      })

      const response = await glossaryRoute.POST(request)

      expect(response.status).toBe(400)
      const responseData = await response.json()
      expect(responseData.error).toBe('Invalid request body')
      expect(responseData.details).toBeDefined()
    })

    it('should reject invalid existing_entities parameter', async () => {
      const request = createMockRequest('/api/glossary', {
        method: 'POST',
        body: {
          content: 'Document content...',
          documentId: testDocumentId,
          existing_entities: [
            {
              name: 'Valid Entity',
              ontology: 'concept',
              aliases: ['Valid'],
              brief_explanation: 'Valid entity'
            },
            {
              // Missing required fields
              name: 'Invalid Entity'
            }
          ]
        }
      })

      const response = await glossaryRoute.POST(request)

      expect(response.status).toBe(400)
      const responseData = await response.json()
      expect(responseData.error).toBe('Invalid request body')
    })

    it('should accept valid entity capping parameters', async () => {
      const mockGlossaryResult = {
        text: JSON.stringify({
          entities: [
            {
              name: 'Valid Entity',
              ontology: 'concept',
              aliases: ['VE'],
              brief_explanation: 'A valid entity'
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
          content: 'Document content for validation...',
          documentId: testDocumentId,
          max_entities: 15,
          existing_entities: [
            {
              name: 'Existing Entity',
              ontology: 'concept' as const,
              aliases: ['EE'],
              brief_explanation: 'Existing entity'
            }
          ]
        }
      })

      const response = await glossaryRoute.POST(request)

      expect(response.status).toBe(200)
      
      // Verify all parameters were properly validated and passed through
      expect(mockPromptTypes.executePromptWithUsage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          max_entities: 15,
          existing_entities: expect.arrayContaining([
            expect.objectContaining({
              name: 'Existing Entity'
            })
          ])
        })
      )
    })
  })

  describe('Error Handling with Entity Capping', () => {
    it('should handle LLM timeout errors and track entity limit context', async () => {
      const mockAiCall = { id: createTestId() }
      mockAiCallServiceInstance.startCallWithModelString.mockResolvedValue(mockAiCall as any)
      mockAiCallServiceInstance.failCall.mockResolvedValue({} as any)

      // Mock LLM timeout error
      const timeoutError = new Error('Request timeout: Token generation exceeded time limit')
      mockPromptTypes.executePromptWithUsage.mockRejectedValue(timeoutError)

      const request = createMockRequest('/api/glossary', {
        method: 'POST',
        body: {
          content: 'Very long document content that might cause timeout...',
          documentId: testDocumentId,
          max_entities: 50
        }
      })

      const response = await glossaryRoute.POST(request)

      expect(response.status).toBe(500)

      // Verify AI call was marked as failed with timeout context
      expect(mockAiCallServiceInstance.failCall).toHaveBeenCalledWith(
        mockAiCall.id,
        'Request timeout: Token generation exceeded time limit'
      )

      // Verify the AI call tracked the entity limit that caused timeout
      expect(mockAiCallServiceInstance.startCallWithModelString).toHaveBeenCalledWith(
        expect.objectContaining({
          input_data: expect.objectContaining({
            entity_limit: 50
          })
        })
      )
    })

    it('should handle malformed LLM response in generate more mode', async () => {
      const mockGlossaryResult = {
        text: 'Not valid JSON at all',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150, reasoningTokens: 0 },
        finishReason: 'stop'
      }

      mockPromptTypes.executePromptWithUsage.mockResolvedValue(mockGlossaryResult)

      const request = createMockRequest('/api/glossary', {
        method: 'POST',
        body: {
          content: 'Document content...',
          documentId: testDocumentId,
          max_entities: 10,
          existing_entities: [
            {
              name: 'Existing Entity',
              ontology: 'concept' as const,
              aliases: ['EE'],
              brief_explanation: 'Existing entity'
            }
          ]
        }
      })

      const response = await glossaryRoute.POST(request)

      expect(response.status).toBe(500)
      
      // Verify generate more mode was attempted
      expect(mockPromptTypes.executePromptWithUsage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          existing_entities: expect.arrayContaining([
            expect.objectContaining({ name: 'Existing Entity' })
          ])
        })
      )
    })
  })

  describe('Cache Behavior with Entity Capping', () => {
    it('should return cached glossary without applying entity limits', async () => {
      const cachedGlossary = {
        id: createTestId(),
        content: {
          entities: Array.from({ length: 50 }, (_, i) => ({
            name: `Cached Entity ${i + 1}`,
            ontology: 'concept',
            aliases: [`CE${i + 1}`],
            brief_explanation: `Cached explanation ${i + 1}`
          })),
          metadata: {
            content_length: 5000,
            entities_count: 50,
            model_used: 'anthropic:claude-3-5-haiku:20241022'
          }
        }
      }

      mockEnhancementServiceInstance.get.mockResolvedValue(cachedGlossary as any)

      const request = createMockRequest('/api/glossary', {
        method: 'POST',
        body: {
          content: 'Document content...',
          documentId: testDocumentId,
          max_entities: 10 // Should be ignored for cached results
        }
      })

      const response = await glossaryRoute.POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.cached).toBe(true)
      expect(responseData.entities).toHaveLength(50) // Full cached result, not limited to 10
      
      // Verify no AI call was made
      expect(mockAiCallServiceInstance.startCallWithModelString).not.toHaveBeenCalled()
      expect(mockPromptTypes.executePromptWithUsage).not.toHaveBeenCalled()
    })
  })
})