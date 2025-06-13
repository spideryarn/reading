/**
 * Tests for test isolation utilities
 */

import {
  getTestNamespace,
  createTestEmail,
  initTestTracking,
  trackTestData,
  getTrackedData,
  clearTestTracking,
  createTestId,
  createTestMetadata,
  createTestUser,
  createTestDocument,
  getCleanupFunctions
} from '../test-isolation-utils'

describe('Test Isolation Utilities', () => {
  describe('getTestNamespace', () => {
    it('should generate unique namespaces', () => {
      const ns1 = getTestNamespace('auth-test')
      const ns2 = getTestNamespace('auth-test')
      
      expect(ns1).toMatch(/^test_auth-test_\d+_[a-f0-9]{8}$/)
      expect(ns2).toMatch(/^test_auth-test_\d+_[a-f0-9]{8}$/)
      expect(ns1).not.toBe(ns2)
    })
    
    it('should include the test name in namespace', () => {
      const namespace = getTestNamespace('my-special-test')
      expect(namespace).toContain('my-special-test')
    })
  })
  
  describe('createTestEmail', () => {
    it('should create email with namespace', () => {
      const namespace = 'test_auth_123_abc'
      const email = createTestEmail(namespace)
      
      expect(email).toBe('user_test_auth_123_abc@test.local')
    })
    
    it('should accept custom prefix', () => {
      const namespace = 'test_auth_123_abc'
      const email = createTestEmail(namespace, 'admin')
      
      expect(email).toBe('admin_test_auth_123_abc@test.local')
    })
  })
  
  describe('Test Data Tracking', () => {
    const namespace = 'test_tracking_123'
    
    beforeEach(() => {
      clearTestTracking(namespace)
    })
    
    it('should initialize tracking for namespace', () => {
      initTestTracking(namespace)
      const tracker = getTrackedData(namespace)
      
      expect(tracker).toBeDefined()
      expect(tracker?.documents).toEqual([])
      expect(tracker?.users).toEqual([])
    })
    
    it('should track test data by type', () => {
      initTestTracking(namespace)
      
      trackTestData(namespace, 'documents', 'doc-123')
      trackTestData(namespace, 'users', 'user-456')
      trackTestData(namespace, 'documents', 'doc-789')
      
      const tracker = getTrackedData(namespace)
      expect(tracker?.documents).toEqual(['doc-123', 'doc-789'])
      expect(tracker?.users).toEqual(['user-456'])
    })
    
    it('should throw error if namespace not initialized', () => {
      expect(() => {
        trackTestData('uninitialized', 'documents', 'doc-123')
      }).toThrow('Test namespace uninitialized not initialized')
    })
    
    it('should clear tracking data', () => {
      initTestTracking(namespace)
      trackTestData(namespace, 'documents', 'doc-123')
      
      clearTestTracking(namespace)
      
      expect(getTrackedData(namespace)).toBeUndefined()
    })
  })
  
  describe('createTestId', () => {
    it('should create valid UUID', () => {
      const id = createTestId('test_namespace')
      
      // UUID v4 format
      expect(id).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/)
    })
  })
  
  describe('createTestMetadata', () => {
    it('should create metadata with namespace', () => {
      const namespace = 'test_meta_123'
      const metadata = createTestMetadata(namespace)
      
      expect(metadata.test_namespace).toBe(namespace)
      expect(metadata.is_test_data).toBe(true)
      expect(metadata.test_created_at).toBeDefined()
      expect(new Date(metadata.test_created_at)).toBeInstanceOf(Date)
    })
    
    it('should merge additional metadata', () => {
      const namespace = 'test_meta_123'
      const metadata = createTestMetadata(namespace, {
        custom_field: 'value',
        number: 42
      })
      
      expect(metadata.test_namespace).toBe(namespace)
      expect(metadata.custom_field).toBe('value')
      expect(metadata.number).toBe(42)
    })
  })
  
  describe('createTestUser', () => {
    const namespace = 'test_user_123'
    
    beforeEach(() => {
      clearTestTracking(namespace)
    })
    
    it('should create user with namespace', () => {
      const user = createTestUser(namespace)
      
      expect(user.id).toBeDefined()
      expect(user.email).toContain(namespace)
      expect(user.full_name).toContain(namespace)
      expect(user.metadata.test_namespace).toBe(namespace)
      expect(user.metadata.is_test_data).toBe(true)
    })
    
    it('should accept overrides', () => {
      const user = createTestUser(namespace, {
        email: 'custom@test.local',
        fullName: 'Custom Name',
        metadata: { role: 'admin' }
      })
      
      expect(user.email).toBe('custom@test.local')
      expect(user.full_name).toBe('Custom Name')
      expect(user.metadata.role).toBe('admin')
      expect(user.metadata.test_namespace).toBe(namespace)
    })
    
    it('should initialize tracking automatically', () => {
      createTestUser(namespace)
      expect(getTrackedData(namespace)).toBeDefined()
    })
  })
  
  describe('createTestDocument', () => {
    const namespace = 'test_doc_123'
    
    beforeEach(() => {
      clearTestTracking(namespace)
    })
    
    it('should create document with namespace', () => {
      const doc = createTestDocument(namespace)
      
      expect(doc.id).toBeDefined()
      expect(doc.title).toContain(namespace)
      expect(doc.html_content).toContain(namespace)
      expect(doc.plaintext_content).toContain(namespace)
      expect(doc.metadata.test_namespace).toBe(namespace)
    })
    
    it('should strip HTML from plaintext content', () => {
      const doc = createTestDocument(namespace, {
        content: '<p>Hello <strong>world</strong></p>'
      })
      
      expect(doc.html_content).toBe('<p>Hello <strong>world</strong></p>')
      expect(doc.plaintext_content).toBe('Hello world')
    })
  })
  
  describe('getCleanupFunctions', () => {
    const namespace = 'test_cleanup_123'
    
    // Mock Supabase client
    const mockSupabase = {
      from: jest.fn(() => ({
        delete: jest.fn(() => ({
          in: jest.fn(() => ({ error: null }))
        }))
      }))
    }
    
    beforeEach(() => {
      clearTestTracking(namespace)
      jest.clearAllMocks()
    })
    
    it('should return cleanup functions', () => {
      const cleanup = getCleanupFunctions(namespace, mockSupabase)
      
      expect(cleanup.documents).toBeDefined()
      expect(cleanup.users).toBeDefined()
      expect(cleanup.threads).toBeDefined()
      expect(cleanup.all).toBeDefined()
    })
    
    it('should cleanup tracked documents', async () => {
      initTestTracking(namespace)
      trackTestData(namespace, 'documents', 'doc-1')
      trackTestData(namespace, 'documents', 'doc-2')
      
      const cleanup = getCleanupFunctions(namespace, mockSupabase)
      await cleanup.documents()
      
      expect(mockSupabase.from).toHaveBeenCalledWith('documents')
    })
    
    it('should not attempt cleanup if no data tracked', async () => {
      initTestTracking(namespace)
      
      const cleanup = getCleanupFunctions(namespace, mockSupabase)
      await cleanup.documents()
      
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })
    
    it('should cleanup all data types in correct order', async () => {
      initTestTracking(namespace)
      trackTestData(namespace, 'documents', 'doc-1')
      trackTestData(namespace, 'users', 'user-1')
      trackTestData(namespace, 'threads', 'thread-1')
      trackTestData(namespace, 'messages', 'msg-1')
      trackTestData(namespace, 'enhancements', 'enh-1')
      trackTestData(namespace, 'aiCalls', 'call-1')
      
      const cleanup = getCleanupFunctions(namespace, mockSupabase)
      await cleanup.all()
      
      // Verify cleanup order (reverse dependency)
      const calls = mockSupabase.from.mock.calls.map(call => call[0])
      expect(calls).toEqual([
        'chat_messages',
        'document_enhancements',
        'ai_calls',
        'chat_threads',
        'documents',
        'profiles'
      ])
      
      // Verify tracking was cleared
      expect(getTrackedData(namespace)).toBeUndefined()
    })
    
    it('should throw error if cleanup fails', async () => {
      const errorSupabase = {
        from: jest.fn(() => ({
          delete: jest.fn(() => ({
            in: jest.fn(() => ({ error: new Error('Database error') }))
          }))
        }))
      }
      
      initTestTracking(namespace)
      trackTestData(namespace, 'documents', 'doc-1')
      
      const cleanup = getCleanupFunctions(namespace, errorSupabase)
      
      await expect(cleanup.documents()).rejects.toThrow('Database error')
    })
  })
})