/**
 * Profile-Document Integration Tests
 * 
 * Tests the integration between ProfileService and DocumentService,
 * focusing on user ownership and the relationship between profiles and documents.
 * 
 * These tests verify that:
 * - Documents can be properly associated with user profiles
 * - Document ownership validation works correctly
 * - Profile deletion scenarios are handled properly
 * - User-scoped document operations work with real profiles
 */

import { createClient } from '@/lib/supabase/client'
import { ProfileService } from '../profiles'
import { DocumentService } from '../documents'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Profile } from '@/lib/types/database'

// Skip tests if Supabase environment variables are not set
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const skipTests = !SUPABASE_URL || !SUPABASE_ANON_KEY

// Conditionally run tests based on environment
const describeIfEnv = skipTests ? describe.skip : describe

if (skipTests) {
  console.log('⚠️  Profile-Document integration tests skipped: Supabase environment variables not set')
  console.log('   Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to run these tests')
}

describeIfEnv('Profile-Document Integration Tests', () => {
  let supabase: SupabaseClient<Database>
  let profileService: ProfileService
  let documentService: DocumentService
  
  // Test data tracking
  const testUserIds: string[] = []
  const createdDocumentIds: string[] = []
  
  beforeAll(async () => {
    supabase = createClient()
    profileService = new ProfileService(supabase)
    documentService = new DocumentService(supabase)
  })

  afterAll(async () => {
    // Clean up all test data
    console.log('Cleaning up test data...')
    
    // Delete documents first (they may reference profiles)
    for (const docId of createdDocumentIds) {
      try {
        await documentService.delete(docId)
      } catch (error) {
        console.warn(`Failed to clean up document ${docId}:`, error)
      }
    }
    
    // Then delete profiles
    for (const userId of testUserIds) {
      try {
        await profileService.deleteByUserId(userId)
      } catch (error) {
        console.warn(`Failed to clean up profile ${userId}:`, error)
      }
    }
  })

  describe('Profile-Document Lifecycle Integration', () => {
    let testUserId: string
    let testProfile: Profile

    beforeEach(() => {
      // Generate unique test user ID
      testUserId = `test-${Date.now()}-${Math.random().toString(36).substring(2)}`
      testUserIds.push(testUserId)
    })

    it('should create profile and associate documents correctly', async () => {
      // 1. Create user profile
      testProfile = await profileService.create({
        user_id: testUserId,
        preferences: { theme: 'dark', language: 'en' }
      })

      expect(testProfile).toBeTruthy()
      expect(testProfile.user_id).toBe(testUserId)

      // 2. Create document for user
      const document = await documentService.createForUser(testUserId, {
        title: 'User Test Document',
        html_content: '<h1>Test Document</h1><p>Content for integration test</p>',
        plaintext_content: 'Test Document\nContent for integration test',
        slug: `test-doc-${Date.now()}`,
        is_public: false
      })

      expect(document).toBeTruthy()
      expect(document.created_by).toBe(testUserId)
      expect(document.title).toBe('User Test Document')
      createdDocumentIds.push(document.id)

      // 3. Verify ownership
      const isOwned = await documentService.isOwnedByUser(document.id, testUserId)
      expect(isOwned).toBe(true)

      // 4. Verify document appears in user's document list
      const userDocs = await documentService.getByUserId(testUserId)
      expect(userDocs.documents.length).toBeGreaterThanOrEqual(1)
      expect(userDocs.documents.some(doc => doc.id === document.id)).toBe(true)

      // 5. Verify profile preferences are still accessible
      const preferences = await profileService.getPreferences(testUserId)
      expect(preferences.theme).toBe('dark')
      expect(preferences.language).toBe('en')
    })

    it('should handle multiple documents per user', async () => {
      // Create profile
      testProfile = await profileService.create({
        user_id: testUserId,
        preferences: { theme: 'light' }
      })

      // Create multiple documents
      const documentData = [
        {
          title: 'First Document',
          html_content: '<h1>First</h1>',
          plaintext_content: 'First',
          slug: `first-doc-${Date.now()}`
        },
        {
          title: 'Second Document', 
          html_content: '<h1>Second</h1>',
          plaintext_content: 'Second',
          slug: `second-doc-${Date.now()}`
        },
        {
          title: 'Third Document',
          html_content: '<h1>Third</h1>',
          plaintext_content: 'Third',
          slug: `third-doc-${Date.now()}`
        }
      ]

      const documents = []
      for (const data of documentData) {
        const doc = await documentService.createForUser(testUserId, data)
        documents.push(doc)
        createdDocumentIds.push(doc.id)
      }

      // Verify all documents are owned by the user
      for (const doc of documents) {
        const isOwned = await documentService.isOwnedByUser(doc.id, testUserId)
        expect(isOwned).toBe(true)
      }

      // Verify user document list contains all documents
      const userDocs = await documentService.getByUserId(testUserId)
      expect(userDocs.documents.length).toBeGreaterThanOrEqual(3)
      
      for (const doc of documents) {
        expect(userDocs.documents.some(userDoc => userDoc.id === doc.id)).toBe(true)
      }
    })

    it('should handle document ownership transfer', async () => {
      // Create two users
      const secondUserId = `test-${Date.now()}-second-${Math.random().toString(36).substring(2)}`
      testUserIds.push(secondUserId)

      // Create profiles for both users
      await profileService.create({
        user_id: testUserId,
        preferences: { theme: 'dark' }
      })

      await profileService.create({
        user_id: secondUserId,
        preferences: { theme: 'light' }
      })

      // Create document for first user
      const document = await documentService.createForUser(testUserId, {
        title: 'Transfer Test Document',
        html_content: '<h1>Transfer Test</h1>',
        plaintext_content: 'Transfer Test',
        slug: `transfer-doc-${Date.now()}`
      })
      createdDocumentIds.push(document.id)

      // Verify initial ownership
      expect(await documentService.isOwnedByUser(document.id, testUserId)).toBe(true)
      expect(await documentService.isOwnedByUser(document.id, secondUserId)).toBe(false)

      // Transfer ownership
      const updatedDocument = await documentService.updateOwnership(document.id, secondUserId)
      expect(updatedDocument).toBeTruthy()
      expect(updatedDocument!.created_by).toBe(secondUserId)

      // Verify ownership transfer
      expect(await documentService.isOwnedByUser(document.id, testUserId)).toBe(false)
      expect(await documentService.isOwnedByUser(document.id, secondUserId)).toBe(true)

      // Verify document lists are updated
      const firstUserDocs = await documentService.getByUserId(testUserId)
      const secondUserDocs = await documentService.getByUserId(secondUserId)

      expect(firstUserDocs.documents.some(doc => doc.id === document.id)).toBe(false)
      expect(secondUserDocs.documents.some(doc => doc.id === document.id)).toBe(true)
    })

    it('should maintain profile preferences during document operations', async () => {
      // Create profile with initial preferences
      testProfile = await profileService.create({
        user_id: testUserId,
        preferences: { 
          theme: 'dark', 
          language: 'es',
          notifications: true,
          ui: { sidebarCollapsed: true }
        }
      })

      // Create document
      const document = await documentService.createForUser(testUserId, {
        title: 'Preferences Test Document',
        html_content: '<h1>Test</h1>',
        plaintext_content: 'Test',
        slug: `prefs-doc-${Date.now()}`
      })
      createdDocumentIds.push(document.id)

      // Update preferences
      await profileService.updatePreferences(testUserId, {
        theme: 'light',
        language: 'fr',
        notifications: false,
        ui: { sidebarCollapsed: false, fontSize: 'large' }
      })

      // Verify preferences updated correctly
      const preferences = await profileService.getPreferences(testUserId)
      expect(preferences.theme).toBe('light')
      expect(preferences.language).toBe('fr')
      expect(preferences.notifications).toBe(false)
      expect(preferences.ui.sidebarCollapsed).toBe(false)
      expect(preferences.ui.fontSize).toBe('large')

      // Verify document ownership is unaffected by preference changes
      expect(await documentService.isOwnedByUser(document.id, testUserId)).toBe(true)

      // Verify document list is unaffected
      const userDocs = await documentService.getByUserId(testUserId)
      expect(userDocs.documents.some(doc => doc.id === document.id)).toBe(true)
    })
  })

  describe('Cross-User Isolation', () => {
    let user1Id: string
    let user2Id: string
    let user1Docs: string[]
    let user2Docs: string[]

    beforeEach(() => {
      user1Id = `test-user1-${Date.now()}-${Math.random().toString(36).substring(2)}`
      user2Id = `test-user2-${Date.now()}-${Math.random().toString(36).substring(2)}`
      testUserIds.push(user1Id, user2Id)
      user1Docs = []
      user2Docs = []
    })

    it('should properly isolate documents between users', async () => {
      // Create profiles for both users
      await profileService.create({
        user_id: user1Id,
        preferences: { theme: 'dark' }
      })

      await profileService.create({
        user_id: user2Id,
        preferences: { theme: 'light' }
      })

      // Create documents for each user
      const user1Doc = await documentService.createForUser(user1Id, {
        title: 'User 1 Document',
        html_content: '<h1>User 1 Content</h1>',
        plaintext_content: 'User 1 Content',
        slug: `user1-doc-${Date.now()}`
      })
      user1Docs.push(user1Doc.id)
      createdDocumentIds.push(user1Doc.id)

      const user2Doc = await documentService.createForUser(user2Id, {
        title: 'User 2 Document',
        html_content: '<h1>User 2 Content</h1>',
        plaintext_content: 'User 2 Content',
        slug: `user2-doc-${Date.now()}`
      })
      user2Docs.push(user2Doc.id)
      createdDocumentIds.push(user2Doc.id)

      // Verify ownership isolation
      expect(await documentService.isOwnedByUser(user1Doc.id, user1Id)).toBe(true)
      expect(await documentService.isOwnedByUser(user1Doc.id, user2Id)).toBe(false)
      expect(await documentService.isOwnedByUser(user2Doc.id, user1Id)).toBe(false)
      expect(await documentService.isOwnedByUser(user2Doc.id, user2Id)).toBe(true)

      // Verify document list isolation
      const user1DocList = await documentService.getByUserId(user1Id)
      const user2DocList = await documentService.getByUserId(user2Id)

      expect(user1DocList.documents.some(doc => doc.id === user1Doc.id)).toBe(true)
      expect(user1DocList.documents.some(doc => doc.id === user2Doc.id)).toBe(false)
      expect(user2DocList.documents.some(doc => doc.id === user1Doc.id)).toBe(false)
      expect(user2DocList.documents.some(doc => doc.id === user2Doc.id)).toBe(true)
    })

    it('should handle profile deletion scenarios', async () => {
      // Create profiles and documents
      await profileService.create({
        user_id: user1Id,
        preferences: { theme: 'dark' }
      })

      const document = await documentService.createForUser(user1Id, {
        title: 'Document Before Profile Deletion',
        html_content: '<h1>Test</h1>',
        plaintext_content: 'Test',
        slug: `before-deletion-${Date.now()}`
      })
      createdDocumentIds.push(document.id)

      // Verify initial state
      expect(await profileService.getByUserId(user1Id)).toBeTruthy()
      expect(await documentService.isOwnedByUser(document.id, user1Id)).toBe(true)

      // Delete profile
      await profileService.deleteByUserId(user1Id)

      // Verify profile is deleted
      expect(await profileService.getByUserId(user1Id)).toBeNull()

      // Document should still exist (orphaned documents scenario)
      // Note: In a real application, you might want cascading deletes
      const orphanedDoc = await documentService.getById(document.id)
      expect(orphanedDoc).toBeTruthy()
      expect(orphanedDoc!.created_by).toBe(user1Id) // Still references deleted user

      // But ownership check should still work for comparison purposes
      expect(await documentService.isOwnedByUser(document.id, user1Id)).toBe(true)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    let testUserId: string

    beforeEach(() => {
      testUserId = `test-error-${Date.now()}-${Math.random().toString(36).substring(2)}`
      testUserIds.push(testUserId)
    })

    it('should handle document creation without profile', async () => {
      // Create document for user without profile
      const document = await documentService.createForUser(testUserId, {
        title: 'Document Without Profile',
        html_content: '<h1>No Profile</h1>',
        plaintext_content: 'No Profile',
        slug: `no-profile-${Date.now()}`
      })
      createdDocumentIds.push(document.id)

      expect(document).toBeTruthy()
      expect(document.created_by).toBe(testUserId)

      // Verify ownership works even without profile
      expect(await documentService.isOwnedByUser(document.id, testUserId)).toBe(true)

      // But getting preferences should fail
      await expect(profileService.getPreferences(testUserId))
        .rejects.toThrow('Profile not found')
    })

    it('should handle invalid user IDs consistently across services', async () => {
      const invalidUserId = 'not-a-valid-uuid'

      // ProfileService should handle invalid UUIDs
      expect(await profileService.getByUserId(invalidUserId)).toBeNull()
      
      await expect(profileService.updateByUserId(invalidUserId, { preferences: {} }))
        .rejects.toThrow('Invalid user ID format')

      // DocumentService should handle invalid UUIDs  
      const userDocs = await documentService.getByUserId(invalidUserId)
      expect(userDocs.documents).toEqual([])

      await expect(documentService.createForUser(invalidUserId, {
        title: 'Test',
        html_content: '<h1>Test</h1>',
        plaintext_content: 'Test',
        slug: 'test'
      })).rejects.toThrow('Invalid user ID format')

      expect(await documentService.isOwnedByUser('valid-doc-id', invalidUserId)).toBe(false)
    })

    it('should handle concurrent operations gracefully', async () => {
      // Create profile
      await profileService.create({
        user_id: testUserId,
        preferences: { theme: 'dark' }
      })

      // Create multiple documents concurrently
      const documentPromises = Array.from({ length: 5 }, (_, i) =>
        documentService.createForUser(testUserId, {
          title: `Concurrent Document ${i}`,
          html_content: `<h1>Document ${i}</h1>`,
          plaintext_content: `Document ${i}`,
          slug: `concurrent-${i}-${Date.now()}`
        })
      )

      const documents = await Promise.all(documentPromises)
      
      // Track for cleanup
      documents.forEach(doc => createdDocumentIds.push(doc.id))

      // Verify all documents were created successfully
      expect(documents).toHaveLength(5)
      documents.forEach(doc => {
        expect(doc.created_by).toBe(testUserId)
      })

      // Verify ownership for all documents
      const ownershipChecks = await Promise.all(
        documents.map(doc => documentService.isOwnedByUser(doc.id, testUserId))
      )
      
      expect(ownershipChecks.every(isOwned => isOwned)).toBe(true)

      // Verify all appear in user's document list
      const userDocs = await documentService.getByUserId(testUserId)
      expect(userDocs.documents.length).toBeGreaterThanOrEqual(5)
      
      documents.forEach(doc => {
        expect(userDocs.documents.some(userDoc => userDoc.id === doc.id)).toBe(true)
      })
    })

    it('should maintain data consistency during rapid profile updates', async () => {
      // Create profile
      await profileService.create({
        user_id: testUserId,
        preferences: { theme: 'dark', counter: 0 }
      })

      // Create document
      const document = await documentService.createForUser(testUserId, {
        title: 'Consistency Test Document',
        html_content: '<h1>Consistency</h1>',
        plaintext_content: 'Consistency',
        slug: `consistency-${Date.now()}`
      })
      createdDocumentIds.push(document.id)

      // Perform rapid preference updates
      const updatePromises = Array.from({ length: 10 }, (_, i) =>
        profileService.updatePreferences(testUserId, { 
          theme: i % 2 === 0 ? 'dark' : 'light',
          counter: i 
        })
      )

      await Promise.all(updatePromises)

      // Verify final state is consistent
      const finalPreferences = await profileService.getPreferences(testUserId)
      expect(typeof finalPreferences.counter).toBe('number')
      expect(['dark', 'light']).toContain(finalPreferences.theme)

      // Verify document ownership is unaffected
      expect(await documentService.isOwnedByUser(document.id, testUserId)).toBe(true)
    })
  })
})