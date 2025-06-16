/**
 * Helper utilities for working with service mocks in tests
 * 
 * This module provides convenience functions for setting up and working with
 * the automatically mocked services (AiCallService, EnhancementService, DocumentService)
 * that are configured in jest.setup.js
 */

import type { AiCallService } from '@/lib/services/database/ai-calls'
import type { EnhancementService } from '@/lib/services/database/enhancements'
import type { DocumentService } from '@/lib/services/database/documents'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Get a properly typed instance of the mocked AiCallService
 * 
 * @example
 * ```typescript
 * const aiCallService = getMockAiCallService()
 * jest.spyOn(aiCallService, 'startCallWithModelString').mockResolvedValue(mockAiCall)
 * ```
 */
export function getMockAiCallService(): AiCallService {
  // Dynamic import required for Jest mocking
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { AiCallService } = require('@/lib/services/database/ai-calls')
  return new AiCallService({} as SupabaseClient)
}

/**
 * Get a properly typed instance of the mocked EnhancementService
 * 
 * @example
 * ```typescript
 * const enhancementService = getMockEnhancementService()
 * jest.spyOn(enhancementService, 'get').mockResolvedValue(null)
 * ```
 */
export function getMockEnhancementService(): EnhancementService {
  // Dynamic import required for Jest mocking
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { EnhancementService } = require('@/lib/services/database/enhancements')
  return new EnhancementService({} as SupabaseClient)
}

/**
 * Get a properly typed instance of the mocked DocumentService
 * 
 * @example
 * ```typescript
 * const documentService = getMockDocumentService()
 * jest.spyOn(documentService, 'getById').mockResolvedValue(mockDocument)
 * ```
 */
export function getMockDocumentService(): DocumentService {
  // Dynamic import required for Jest mocking
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { DocumentService } = require('@/lib/services/database/documents')
  return new DocumentService({} as SupabaseClient)
}

/**
 * Clear all mock service data stores
 * This is automatically called in beforeEach in jest.setup.js
 * but can be manually called if needed
 */
export function clearAllMockServiceData(): void {
  // Dynamic imports required for Jest mocking
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { AiCallService } = require('@/lib/services/database/ai-calls')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { EnhancementService } = require('@/lib/services/database/enhancements')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { DocumentService } = require('@/lib/services/database/documents')
  
  AiCallService.clearMockCalls()
  EnhancementService.clearMockEnhancements()
  DocumentService.clearMockDocuments()
}

/**
 * Set up common service mock behaviors for API route tests
 * 
 * @example
 * ```typescript
 * const { aiCallService, enhancementService, documentService } = setupCommonServiceMocks()
 * 
 * // Then customize specific behaviors
 * jest.spyOn(enhancementService, 'get').mockResolvedValue(cachedEnhancement)
 * ```
 */
export function setupCommonServiceMocks() {
  const aiCallService = getMockAiCallService()
  const enhancementService = getMockEnhancementService()
  const documentService = getMockDocumentService()
  
  // Set up common default behaviors
  jest.spyOn(aiCallService, 'startCallWithModelString').mockResolvedValue({
    id: 'mock-ai-call-id',
    document_id: null,
    created_by: 'mock-user-id',
    model_string: 'anthropic:claude-3-5-haiku:20241022',
    prompt_type: 'chat',
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    completed_at: null,
    prompt_tokens: null,
    completion_tokens: null,
    total_tokens: null,
    reasoning_tokens: null,
    finish_reason: null,
    error_message: null,
    error_code: null,
    extra: {},
    prompt_input: '{}',
    prompt_template: null,
    model_id: null
  })
  
  jest.spyOn(aiCallService, 'completeCall').mockResolvedValue({
    id: 'mock-ai-call-id',
    document_id: null,
    created_by: 'mock-user-id',
    model_string: 'anthropic:claude-3-5-haiku:20241022',
    prompt_type: 'chat',
    status: 'success',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    prompt_tokens: 100,
    completion_tokens: 200,
    total_tokens: 300,
    reasoning_tokens: null,
    finish_reason: 'stop',
    error_message: null,
    error_code: null,
    extra: {},
    prompt_input: '{}',
    prompt_template: null,
    model_id: null
  })
  
  jest.spyOn(enhancementService, 'get').mockResolvedValue(null)
  jest.spyOn(enhancementService, 'upsert').mockResolvedValue({
    id: 'mock-enhancement-id',
    document_id: 'mock-document-id',
    ai_call_id: 'mock-ai-call-id',
    type: 'headings',
    subtype: 'default',
    content: {},
    extra: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })
  
  jest.spyOn(documentService, 'getById').mockResolvedValue(null)
  
  return {
    aiCallService,
    enhancementService,
    documentService
  }
}

/**
 * Helper to create a mock AI call response
 */
export function createMockAiCall(overrides?: any) {
  return {
    id: 'mock-ai-call-id',
    document_id: null,
    created_by: 'mock-user-id',
    model_string: 'anthropic:claude-3-5-haiku:20241022',
    prompt_type: 'chat',
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    completed_at: null,
    prompt_tokens: null,
    completion_tokens: null,
    total_tokens: null,
    reasoning_tokens: null,
    finish_reason: null,
    error_message: null,
    error_code: null,
    extra: {},
    prompt_input: '{}',
    prompt_template: null,
    model_id: null,
    ...overrides
  }
}

/**
 * Helper to create a mock enhancement
 */
export function createMockEnhancement(overrides?: any) {
  return {
    id: 'mock-enhancement-id',
    document_id: 'mock-document-id',
    ai_call_id: 'mock-ai-call-id',
    type: 'headings',
    subtype: 'default',
    content: {},
    extra: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }
}

/**
 * Helper to create a mock document
 */
export function createMockDocument(overrides?: any) {
  return {
    id: 'mock-document-id',
    title: 'Mock Document',
    original_url: null,
    url_source: null,
    created_by: 'mock-user-id',
    html_content: '<p>Mock content</p>',
    plaintext_content: 'Mock content',
    word_count: 2,
    is_public: false,
    storage_path: null,
    original_file_type: null,
    upload_metadata: null,
    upload_ai_call_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }
}