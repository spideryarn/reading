// Common types for test mocks to avoid using 'any'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

// Mock Supabase client type
export type MockSupabaseClient = Partial<SupabaseClient<Database>>

// Mock service types
export interface MockAiCallService {
  startCallWithModelString: jest.Mock
  completeCall: jest.Mock
}

export interface MockEnhancementService {
  get: jest.Mock
  storeHeadings: jest.Mock
  delete: jest.Mock
  storeGlossary?: jest.Mock
  storeSummary?: jest.Mock
}

export interface MockDocumentService {
  getById: jest.Mock
  getElements: jest.Mock
  create?: jest.Mock
  update?: jest.Mock
  delete?: jest.Mock
}

// Mock data types for AI calls
export interface MockAiCall {
  id: string
  created_at?: string
  updated_at?: string
  completed_at?: string | null
  [key: string]: unknown
}

// Mock request types
export interface MockFileArrayBuffer extends File {
  arrayBuffer: jest.Mock
}

export interface MockFormDataRequest extends Request {
  formData: jest.Mock
}

// Type guard functions
export function isMockFileWithArrayBuffer(file: File): file is MockFileArrayBuffer {
  return 'arrayBuffer' in file && typeof (file as MockFileArrayBuffer).arrayBuffer === 'function'
}

export function isMockRequestWithFormData(request: Request): request is MockFormDataRequest {
  return 'formData' in request && typeof (request as MockFormDataRequest).formData === 'function'
}