/**
 * @jest-environment node
 */

/**
 * DEPRECATED: Row Level Security (RLS) Policy Testing
 * 
 * This test file is DEPRECATED and should not be used for new development.
 * 
 * REPLACEMENT: Use `/lib/services/database/__tests__/rls-policies-real.test.ts` instead.
 * 
 * REASON FOR DEPRECATION:
 * - This file uses a simulation-based approach that doesn't actually test real RLS policies
 * - It relies on deprecated infrastructure in `/lib/testing/rls-test-context.ts`
 * - The simulation approach provides false confidence - it doesn't test actual database security
 * - Real RLS testing discovered critical security vulnerabilities that these simulations missed
 * 
 * PROBLEMS WITH SIMULATION APPROACH:
 * - Uses mock user contexts that don't represent real authentication states
 * - Doesn't actually test RLS policy SQL logic at the database level
 * - Complex infrastructure that's hard to maintain and debug
 * - Slower execution time and prone to infrastructure failures
 * 
 * MIGRATION PATH:
 * - Replace any usage of this file with the new real RLS testing patterns
 * - Use `RLSTestDatabase` class for real database-level RLS testing
 * - See `docs/reference/TESTING_DATABASE.md` for comprehensive examples
 * - New approach is faster, more reliable, and provides genuine security validation
 * 
 * This file is kept temporarily for reference but will be removed in a future cleanup.
 * 
 * @deprecated Use rls-policies-real.test.ts instead
 */

import { createClient } from '@/lib/supabase/client'
import { DocumentService } from '../documents'
import { AiCallService } from '../ai-calls'
import { ProfileService } from '../profiles'
import { 
  withUserContext, 
  withUserA, 
  withUserB, 
  testUserIsolation,
  cleanupRLSTestContext,
  TEST_USER_IDS
} from '@/lib/testing/rls-test-context'
import { 
  SECURITY_TEST_DOCUMENTS,
  SECURITY_ASSERTIONS
} from '@/lib/testing/security-fixtures'

describe.skip('DEPRECATED: RLS Policy Testing', () => {
  let supabase: ReturnType<typeof createClient>
  let documentService: DocumentService
  let aiCallService: AiCallService
  let profileService: ProfileService

  beforeEach(() => {
    // Clean up any previous test context
    cleanupRLSTestContext()
    
    // Create fresh service instances (client-side doesn't need await)
    supabase = createClient()
    documentService = new DocumentService(supabase)
    aiCallService = new AiCallService(supabase)
    profileService = new ProfileService(supabase)
  })

  afterEach(() => {
    cleanupRLSTestContext()
  })

  describe('Document RLS Policies', () => {
    test('User A cannot access User B documents', async () => {
      await testUserIsolation(
        // User A creates document
        async () => {
          const doc = await documentService.createForUser(
            TEST_USER_IDS.USER_A, 
            SECURITY_TEST_DOCUMENTS.USER_A_DOCUMENT
          )
          return doc
        },
        // User B tries to access document
        async (document) => {
          const result = await documentService.getById(document.id)
          return result
        },
        'null' // User B should see null due to RLS
      )
    })

    test('User B cannot access User A documents', async () => {
      await testUserIsolation(
        // User B creates document
        async () => {
          const doc = await documentService.createForUser(
            TEST_USER_IDS.USER_B,
            SECURITY_TEST_DOCUMENTS.USER_B_DOCUMENT
          )
          return doc
        },
        // User A tries to access document
        async (document) => {
          const result = await documentService.getById(document.id)
          return result
        },
        'null' // User A should see null due to RLS
      )
    })

    test('Users can access their own documents', async () => {
      const document = await withUserA(async () => {
        return await documentService.createForUser(
          TEST_USER_IDS.USER_A,
          SECURITY_TEST_DOCUMENTS.USER_A_DOCUMENT
        )
      })

      const retrievedDoc = await withUserA(async () => {
        return await documentService.getById(document.id)
      })

      SECURITY_ASSERTIONS.assertAccessible(retrievedDoc, document.id)
      SECURITY_ASSERTIONS.assertOwnership(retrievedDoc, TEST_USER_IDS.USER_A)
    })

    test('Document listing respects user isolation', async () => {
      // Create documents for both users
      const userADoc = await withUserA(async () => {
        return await documentService.createForUser(
          TEST_USER_IDS.USER_A,
          SECURITY_TEST_DOCUMENTS.USER_A_DOCUMENT
        )
      })

      const userBDoc = await withUserB(async () => {
        return await documentService.createForUser(
          TEST_USER_IDS.USER_B,
          SECURITY_TEST_DOCUMENTS.USER_B_DOCUMENT
        )
      })

      // User A should only see their own documents
      const userADocs = await withUserA(async () => {
        return await documentService.getByUserId(TEST_USER_IDS.USER_A)
      })

      expect(userADocs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: userADoc.id })
        ])
      )
      expect(userADocs).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: userBDoc.id })
        ])
      )

      // User B should only see their own documents
      const userBDocs = await withUserB(async () => {
        return await documentService.getByUserId(TEST_USER_IDS.USER_B)
      })

      expect(userBDocs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: userBDoc.id })
        ])
      )
      expect(userBDocs).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: userADoc.id })
        ])
      )
    })

    test('Document deletion respects ownership', async () => {
      const document = await withUserA(async () => {
        return await documentService.createForUser(
          TEST_USER_IDS.USER_A,
          SECURITY_TEST_DOCUMENTS.USER_A_DOCUMENT
        )
      })

      // User B should not be able to delete User A's document
      const deleteResult = await withUserB(async () => {
        return await documentService.deleteById(document.id)
      })

      expect(deleteResult).toBe(false) // Should fail to delete

      // Verify document still exists (as User A)
      const stillExists = await withUserA(async () => {
        return await documentService.getById(document.id)
      })

      SECURITY_ASSERTIONS.assertAccessible(stillExists, document.id)

      // User A should be able to delete their own document
      const ownerDeleteResult = await withUserA(async () => {
        return await documentService.deleteById(document.id)
      })

      expect(ownerDeleteResult).toBe(true) // Should successfully delete
    })
  })

  describe('Document Enhancement RLS Policies', () => {
    test('Enhancements follow document ownership', async () => {
      await testUserIsolation(
        // User A creates document and enhancement
        async () => {
          const doc = await documentService.createForUser(
            TEST_USER_IDS.USER_A,
            SECURITY_TEST_DOCUMENTS.USER_A_DOCUMENT
          )
          
          // Create enhancement for the document
          const enhancement = await supabase
            .from('document_enhancements')
            .insert({
              document_id: doc.id,
              enhancement_type: 'ai_headings',
              enhancement_data: { headings: [] },
              status: 'completed'
            })
            .select()
            .single()

          return { document: doc, enhancement: enhancement.data }
        },
        // User B tries to access enhancement
        async ({ enhancement }) => {
          const result = await supabase
            .from('document_enhancements')
            .select('*')
            .eq('id', enhancement.id)
            .single()

          return result.data
        },
        'null' // User B should not see enhancement due to RLS
      )
    })
  })

  describe('AI Calls RLS Policies', () => {
    test('AI calls follow document ownership', async () => {
      await testUserIsolation(
        // User A creates document and AI call
        async () => {
          const doc = await documentService.createForUser(
            TEST_USER_IDS.USER_A,
            SECURITY_TEST_DOCUMENTS.USER_A_DOCUMENT
          )
          
          const aiCall = await aiCallService.startCall({
            provider: 'anthropic',
            modelId: 'claude-3-haiku',
            prompt_type: 'test',
            input_data: { test: true },
            document_id: doc.id
          })

          return { document: doc, aiCall }
        },
        // User B tries to access AI call
        async ({ aiCall }) => {
          const result = await supabase
            .from('ai_calls')
            .select('*')
            .eq('id', aiCall.id)
            .single()

          return result.data
        },
        'null' // User B should not see AI call due to RLS
      )
    })

    test('Document-independent AI calls are accessible to creator', async () => {
      const aiCall = await withUserA(async () => {
        return await aiCallService.startCall({
          provider: 'anthropic',
          modelId: 'claude-3-haiku',
          prompt_type: 'test',
          input_data: { test: true },
          // No document_id - independent call
        })
      })

      // User A should be able to access their own AI call
      const result = await withUserA(async () => {
        const call = await supabase
          .from('ai_calls')
          .select('*')
          .eq('id', aiCall.id)
          .single()
        
        return call.data
      })

      SECURITY_ASSERTIONS.assertAccessible(result, aiCall.id)
      SECURITY_ASSERTIONS.assertOwnership(result, TEST_USER_IDS.USER_A)

      // User B should not be able to access User A's AI call
      const userBResult = await withUserB(async () => {
        const call = await supabase
          .from('ai_calls')
          .select('*')
          .eq('id', aiCall.id)
          .single()
        
        return call.data
      })

      SECURITY_ASSERTIONS.assertInaccessible(userBResult)
    })
  })

  describe('Profile RLS Policies', () => {
    test('Users can only access their own profile', async () => {
      // Create profiles for both users
      const userAProfile = await withUserA(async () => {
        return await profileService.getByUserId(TEST_USER_IDS.USER_A)
      })

      const userBProfile = await withUserB(async () => {
        return await profileService.getByUserId(TEST_USER_IDS.USER_B)
      })

      // User A should not be able to access User B's profile
      await testUserIsolation(
        async () => userBProfile,
        async (profile) => {
          const result = await profileService.getByUserId(profile.user_id)
          return result
        },
        'null'
      )

      // User B should not be able to access User A's profile
      await testUserIsolation(
        async () => userAProfile,
        async (profile) => {
          const result = await profileService.getByUserId(profile.user_id)
          return result
        },
        'null'
      )
    })
  })

  describe('Cross-Table RLS Integration', () => {
    test('Complete document ecosystem respects ownership', async () => {
      // Test the full chain: Document → Enhancement → AI Call
      const ecosystem = await withUserA(async () => {
        // Create document
        const doc = await documentService.createForUser(
          TEST_USER_IDS.USER_A,
          SECURITY_TEST_DOCUMENTS.USER_A_DOCUMENT
        )

        // Create AI call for document
        const aiCall = await aiCallService.startCall({
          provider: 'anthropic',
          modelId: 'claude-3-haiku',
          prompt_type: 'headings',
          input_data: { document_id: doc.id },
          document_id: doc.id
        })

        // Create enhancement linked to AI call
        const enhancement = await supabase
          .from('document_enhancements')
          .insert({
            document_id: doc.id,
            enhancement_type: 'ai_headings',
            enhancement_data: { headings: [] },
            status: 'completed',
            ai_call_id: aiCall.id
          })
          .select()
          .single()

        return { doc, aiCall, enhancement: enhancement.data }
      })

      // User B should not be able to access any part of the ecosystem
      await withUserB(async () => {
        // Cannot access document
        const docResult = await documentService.getById(ecosystem.doc.id)
        SECURITY_ASSERTIONS.assertInaccessible(docResult)

        // Cannot access AI call
        const aiCallResult = await supabase
          .from('ai_calls')
          .select('*')
          .eq('id', ecosystem.aiCall.id)
          .single()
        SECURITY_ASSERTIONS.assertInaccessible(aiCallResult.data)

        // Cannot access enhancement
        const enhancementResult = await supabase
          .from('document_enhancements')
          .select('*')
          .eq('id', ecosystem.enhancement.id)
          .single()
        SECURITY_ASSERTIONS.assertInaccessible(enhancementResult.data)
      })

      // User A should be able to access all parts
      await withUserA(async () => {
        const docResult = await documentService.getById(ecosystem.doc.id)
        SECURITY_ASSERTIONS.assertAccessible(docResult)

        const aiCallResult = await supabase
          .from('ai_calls')
          .select('*')
          .eq('id', ecosystem.aiCall.id)
          .single()
        SECURITY_ASSERTIONS.assertAccessible(aiCallResult.data)

        const enhancementResult = await supabase
          .from('document_enhancements')
          .select('*')
          .eq('id', ecosystem.enhancement.id)
          .single()
        SECURITY_ASSERTIONS.assertAccessible(enhancementResult.data)
      })
    })
  })

  describe('Edge Cases and Security Boundaries', () => {
    test('Invalid user IDs are handled securely', async () => {
      const document = await withUserA(async () => {
        return await documentService.createForUser(
          TEST_USER_IDS.USER_A,
          SECURITY_TEST_DOCUMENTS.USER_A_DOCUMENT
        )
      })

      // Try to access with malformed user context
      const result = await withUserContext(null, async () => {
        return await documentService.getById(document.id)
      })

      SECURITY_ASSERTIONS.assertInaccessible(result)
    })

    test('Direct database queries respect RLS', async () => {
      const document = await withUserA(async () => {
        return await documentService.createForUser(
          TEST_USER_IDS.USER_A,
          SECURITY_TEST_DOCUMENTS.USER_A_DOCUMENT
        )
      })

      // Try direct Supabase query as User B
      const directResult = await withUserB(async () => {
        const result = await supabase
          .from('documents')
          .select('*')
          .eq('id', document.id)
          .single()

        return result.data
      })

      SECURITY_ASSERTIONS.assertInaccessible(directResult)
    })
  })
})