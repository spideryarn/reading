/**
 * TypeScript test to validate multi-worktree browser automation isolation
 * This validates Stage 2 implementation using actual TypeScript utilities
 */

import { 
  getCurrentEnvironmentId,
  getEnvironmentName,
  getCurrentEnvironmentTestUser,
  validateEnvironmentSetup,
  getCurrentEnvironmentPaths,
  worktreeAuthUtils,
  getWorktreeTestNamespace,
  createWorktreeTestEmail
} from '../worktree-auth-helpers'

import { 
  getWorktreeTestNamespace as getWorktreeTestNamespaceFromIsolation,
  createTestUser,
  createTestDocument,
  initTestTracking,
  createTestMetadata
} from '../test-isolation-utils'

describe('Multi-Worktree Isolation Validation', () => {
  
  describe('Environment Detection', () => {
    test('should correctly detect worktree6 environment', () => {
      const envId = getCurrentEnvironmentId()
      const envName = getEnvironmentName(envId)
      const testUser = getCurrentEnvironmentTestUser()
      
      console.log('🔍 Environment Detection Results:')
      console.log(`  Environment ID: ${envId}`)
      console.log(`  Environment Name: ${envName}`)
      console.log(`  Test User Email: ${testUser.email}`)
      console.log(`  PORT: ${process.env.PORT}`)
      
      expect(envId).toBe(6)
      expect(envName).toBe('worktree6')
      expect(testUser.email).toBe('test-user6@spideryarn.com')
      expect(testUser.password).toBe('ASDFasdf1')
    })
    
    test('should validate environment setup correctly', () => {
      const validation = validateEnvironmentSetup()
      
      console.log('🔍 Environment Validation Results:')
      console.log(`  Valid: ${validation.isValid}`)
      console.log(`  Port: ${validation.port}`)
      console.log(`  Environment: ${validation.envName} (ID: ${validation.envId})`)
      console.log(`  Test User: ${validation.testUser}`)
      console.log(`  Errors: ${validation.errors.join(', ') || 'none'}`)
      
      expect(validation.envId).toBe(6)
      expect(validation.envName).toBe('worktree6')
      expect(validation.port).toBe(3006)
      expect(validation.testUser).toBe('test-user6@spideryarn.com')
      expect(validation.isValid).toBe(true)
    })
  })
  
  describe('File Path Generation', () => {
    test('should generate correct environment-specific paths', () => {
      const paths = getCurrentEnvironmentPaths()
      
      console.log('🔍 File Path Results:')
      console.log(`  Auth File: ${paths.authFile}`)
      console.log(`  Screenshot Dir: ${paths.screenshotDir}`)
      console.log(`  Test Results Dir: ${paths.testResultsDir}`)
      
      expect(paths.envName).toBe('worktree6')
      expect(paths.authFile).toBe('playwright/.auth/worktree6-user.json')
      expect(paths.screenshotDir).toBe('playwright/screenshots/worktree6/')
      expect(paths.testResultsDir).toBe('playwright/test-results/worktree6/')
    })
  })
  
  describe('Namespace Isolation', () => {
    test('should generate worktree-aware namespaces', () => {
      const namespace1 = getWorktreeTestNamespace('auth-test')
      const namespace2 = getWorktreeTestNamespace('browser-test')
      const namespace3 = getWorktreeTestNamespace('isolation-test')
      
      console.log('🔍 Namespace Generation Results:')
      console.log(`  Namespace 1: ${namespace1}`)
      console.log(`  Namespace 2: ${namespace2}`)
      console.log(`  Namespace 3: ${namespace3}`)
      
      // All namespaces should follow the pattern: test-wt6-{testname}-{timestamp}-{uuid}
      const expectedPattern = /^test-wt6-.+-\d+-[a-z0-9]{8}$/
      
      expect(namespace1).toMatch(expectedPattern)
      expect(namespace2).toMatch(expectedPattern)
      expect(namespace3).toMatch(expectedPattern)
      
      // Should include wt6 prefix
      expect(namespace1).toContain('wt6')
      expect(namespace2).toContain('wt6')
      expect(namespace3).toContain('wt6')
      
      // Should include test names
      expect(namespace1).toContain('auth-test')
      expect(namespace2).toContain('browser-test')
      expect(namespace3).toContain('isolation-test')
    })
    
    test('should generate consistent namespaces from both utilities', () => {
      const fromWorktreeHelper = getWorktreeTestNamespace('consistency-test')
      const fromIsolationUtils = getWorktreeTestNamespaceFromIsolation('consistency-test')
      
      console.log('🔍 Namespace Consistency Results:')
      console.log(`  From worktree helper: ${fromWorktreeHelper}`)
      console.log(`  From isolation utils: ${fromIsolationUtils}`)
      
      // Both should follow the same pattern
      const expectedPattern = /^test-wt6-.+-\d+-[a-z0-9]{8}$/
      
      expect(fromWorktreeHelper).toMatch(expectedPattern)
      expect(fromIsolationUtils).toMatch(expectedPattern)
      
      // Both should contain wt6 prefix
      expect(fromWorktreeHelper).toContain('wt6')
      expect(fromIsolationUtils).toContain('wt6')
    })
  })
  
  describe('Test Data Creation', () => {
    test('should create properly namespaced test data', () => {
      const namespace = getWorktreeTestNamespace('data-creation-test')
      
      console.log('🔍 Test Data Creation Results:')
      console.log(`  Using namespace: ${namespace}`)
      
      // Initialize tracking
      initTestTracking(namespace)
      
      // Create test user
      const testUser = createTestUser(namespace, {
        email: 'custom@test.local',
        fullName: 'Test User for Validation'
      })
      
      console.log(`  Test User Created:`)
      console.log(`    Email: ${testUser.email}`)
      console.log(`    Full Name: ${testUser.full_name}`)
      console.log(`    Is Test Data: ${testUser.metadata.is_test_data}`)
      console.log(`    Test Namespace: ${testUser.metadata.test_namespace}`)
      
      expect(testUser.email).toBe('custom@test.local')
      expect(testUser.full_name).toBe('Test User for Validation')
      expect(testUser.metadata.is_test_data).toBe(true)
      expect(testUser.metadata.test_namespace).toBe(namespace)
      
      // Create test document
      const testDoc = createTestDocument(namespace, {
        title: 'Validation Test Document',
        content: '<h1>Test Content</h1><p>This is test content.</p>'
      })
      
      console.log(`  Test Document Created:`)
      console.log(`    Title: ${testDoc.title}`)
      console.log(`    HTML Content: ${testDoc.html_content.substring(0, 50)}...`)
      console.log(`    Is Test Data: ${testDoc.metadata.is_test_data}`)
      console.log(`    Test Namespace: ${testDoc.metadata.test_namespace}`)
      
      expect(testDoc.title).toBe('Validation Test Document')
      expect(testDoc.html_content).toBe('<h1>Test Content</h1><p>This is test content.</p>')
      expect(testDoc.metadata.is_test_data).toBe(true)
      expect(testDoc.metadata.test_namespace).toBe(namespace)
    })
    
    test('should create custom metadata with worktree context', () => {
      const namespace = getWorktreeTestNamespace('metadata-test')
      
      const metadata = createTestMetadata(namespace, {
        test_type: 'isolation_validation',
        environment: 'worktree6',
        validation_stage: 'stage_2'
      })
      
      console.log('🔍 Custom Metadata Results:')
      console.log(`  Test Namespace: ${metadata.test_namespace}`)
      console.log(`  Test Type: ${metadata.test_type}`)
      console.log(`  Environment: ${metadata.environment}`)
      console.log(`  Validation Stage: ${metadata.validation_stage}`)
      console.log(`  Is Test Data: ${metadata.is_test_data}`)
      
      expect(metadata.test_namespace).toBe(namespace)
      expect(metadata.test_type).toBe('isolation_validation')
      expect(metadata.environment).toBe('worktree6')
      expect(metadata.validation_stage).toBe('stage_2')
      expect(metadata.is_test_data).toBe(true)
    })
  })
  
  describe('Utility Integration', () => {
    test('should provide complete environment info through utils', () => {
      const currentEnv = worktreeAuthUtils.getCurrentEnv()
      
      console.log('🔍 Utility Integration Results:')
      console.log(`  Environment ID: ${currentEnv.id}`)
      console.log(`  Environment Name: ${currentEnv.name}`)
      console.log(`  Test User Email: ${currentEnv.testUser.email}`)
      console.log(`  Mock User ID: ${currentEnv.mockUser.id}`)
      console.log(`  Mock User Environment: ${currentEnv.mockUser.user_metadata.environment}`)
      console.log(`  Auth File Path: ${currentEnv.paths.authFile}`)
      
      expect(currentEnv.id).toBe(6)
      expect(currentEnv.name).toBe('worktree6')
      expect(currentEnv.testUser.email).toBe('test-user6@spideryarn.com')
      expect(currentEnv.mockUser.user_metadata.environment).toBe('worktree6')
      expect(currentEnv.mockUser.user_metadata.worktree_id).toBe(6)
      expect(currentEnv.paths.authFile).toBe('playwright/.auth/worktree6-user.json')
    })
    
    test('should create namespaces through utility helper', () => {
      const namespace = worktreeAuthUtils.createNamespace('utility-test')
      
      console.log('🔍 Utility Namespace Creation:')
      console.log(`  Created namespace: ${namespace}`)
      
      const expectedPattern = /^test-wt6-.+-\d+-[a-z0-9]{8}$/
      expect(namespace).toMatch(expectedPattern)
      expect(namespace).toContain('wt6')
      expect(namespace).toContain('utility-test')
    })
  })
  
  describe('Email Generation', () => {
    test('should create worktree-aware test emails', () => {
      const namespace = getWorktreeTestNamespace('email-test')
      const email1 = createWorktreeTestEmail(namespace)
      const email2 = createWorktreeTestEmail(namespace, 'admin')
      
      console.log('🔍 Email Generation Results:')
      console.log(`  Namespace: ${namespace}`)
      console.log(`  Default email: ${email1}`)
      console.log(`  Admin email: ${email2}`)
      
      expect(email1).toBe(`user_${namespace}@test.local`)
      expect(email2).toBe(`admin_${namespace}@test.local`)
      
      // Should contain worktree info
      expect(email1).toContain('wt6')
      expect(email2).toContain('wt6')
    })
  })
})