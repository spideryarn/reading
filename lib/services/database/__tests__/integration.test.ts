/**
 * Integration Tests for Database Service Layer
 * 
 * These tests verify the database service utilities work correctly together
 * including DocumentService, AiCallService, EnhancementService, and ChatService.
 * 
 * Note: These tests require a running Supabase instance with the migration applied.
 * Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment.
 */

import { createClient } from '@/lib/supabase/client'
import { DocumentService } from '../documents'
import { AiCallService } from '../ai-calls'
import { EnhancementService } from '../enhancements'
import { ChatService } from '../chat'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

// Skip tests if Supabase environment variables are not set
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const skipTests = !SUPABASE_URL || !SUPABASE_ANON_KEY

// Conditionally run tests based on environment
const describeIfEnv = skipTests ? describe.skip : describe

if (skipTests) {
  console.log('⚠️  Database integration tests skipped: Supabase environment variables not set')
  console.log('   Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to run these tests')
}

describeIfEnv('Database Service Integration Tests', () => {
  let supabase: SupabaseClient<Database>
  let documentService: DocumentService
  let aiCallService: AiCallService
  let enhancementService: EnhancementService
  let chatService: ChatService
  
  let testModelId: string
  let createdDocIds: string[] = []
  let createdAiCallIds: string[] = []
  let createdThreadIds: string[] = []

  beforeAll(async () => {
    supabase = createClient()
    documentService = new DocumentService(supabase)
    aiCallService = new AiCallService(supabase)
    enhancementService = new EnhancementService(supabase)
    chatService = new ChatService(supabase)

    // Get a test AI model ID
    const { data: model } = await supabase
      .from('ai_models')
      .select('id')
      .eq('model_id', 'claude-3-5-haiku-20241022')
      .single()
    
    testModelId = model?.id || ''
  })

  afterAll(async () => {
    // Clean up all test data
    for (const threadId of createdThreadIds) {
      await chatService.deleteThread(threadId)
    }
    for (const docId of createdDocIds) {
      await documentService.delete(docId)
    }
  })

  describe('Document Service', () => {
    it('should create, update, and retrieve documents', async () => {
      // Create
      const doc = await documentService.create({
        title: 'Integration Test Document',
        html_content: '<h1>Test</h1><p>Content</p>',
        plaintext_content: 'Test\nContent',
        source_url: 'https://example.com/test',
        language_code: 'en',
        word_count: 2,
        is_public: false
      })

      expect(doc).toBeTruthy()
      expect(doc?.id).toBeDefined()
      createdDocIds.push(doc!.id)

      // Update
      const updated = await documentService.update(doc!.id, {
        title: 'Updated Integration Test'
      })

      expect(updated?.title).toBe('Updated Integration Test')

      // Retrieve
      const retrieved = await documentService.getById(doc!.id)
      expect(retrieved?.id).toBe(doc!.id)
      expect(retrieved?.title).toBe('Updated Integration Test')
    })

    it('should search documents by content', async () => {
      const doc = await documentService.create({
        title: 'Machine Learning Document',
        html_content: '<p>Neural networks and deep learning algorithms</p>',
        plaintext_content: 'Neural networks and deep learning algorithms',
        word_count: 6
      })

      createdDocIds.push(doc!.id)

      const results = await documentService.search('neural networks')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some(d => d.id === doc!.id)).toBe(true)
    })

    it('should list documents with pagination', async () => {
      // Create multiple documents
      const docs = await Promise.all([
        documentService.create({
          title: 'Doc 1',
          html_content: '<p>1</p>',
          plaintext_content: '1'
        }),
        documentService.create({
          title: 'Doc 2',
          html_content: '<p>2</p>',
          plaintext_content: '2'
        }),
        documentService.create({
          title: 'Doc 3',
          html_content: '<p>3</p>',
          plaintext_content: '3'
        })
      ])

      docs.forEach(doc => doc && createdDocIds.push(doc.id))

      const page1 = await documentService.list({ limit: 2 })
      expect(page1.documents.length).toBeLessThanOrEqual(2)
      expect(page1.hasMore).toBeDefined()

      if (page1.hasMore) {
        const page2 = await documentService.list({ limit: 2, offset: 2 })
        expect(page2.documents.length).toBeGreaterThan(0)
      }
    })
  })

  describe('AI Call Service', () => {
    let testDocId: string

    beforeAll(async () => {
      const doc = await documentService.create({
        title: 'AI Call Test Document',
        html_content: '<p>Test content for AI processing</p>',
        plaintext_content: 'Test content for AI processing'
      })
      testDocId = doc!.id
      createdDocIds.push(testDocId)
    })

    it('should track AI call lifecycle', async () => {
      // Start call
      const call = await aiCallService.startCall({
        documentId: testDocId,
        modelId: testModelId,
        promptType: 'summarise',
        promptInput: 'Summarise this test content',
        promptTemplate: 'summarise.njk'
      })

      expect(call).toBeTruthy()
      expect(call?.status).toBe('pending')
      createdAiCallIds.push(call!.id)

      // Complete call
      const completed = await aiCallService.completeCall(
        call!.id,
        'This is a test document with sample content.',
        {
          promptTokens: 50,
          completionTokens: 10,
          totalTokens: 60,
          latencyMs: 500
        }
      )

      expect(completed?.status).toBe('success')
      expect(completed?.total_tokens).toBe(60)
      expect(completed?.response_text).toBe('This is a test document with sample content.')
    })

    it('should handle failed AI calls', async () => {
      const call = await aiCallService.startCall({
        modelId: testModelId,
        promptType: 'chat',
        promptInput: 'Test failure'
      })

      createdAiCallIds.push(call!.id)

      const failed = await aiCallService.failCall(
        call!.id,
        'Rate limit exceeded',
        'rate_limit_error'
      )

      expect(failed?.status).toBe('failed')
      expect(failed?.error_message).toBe('Rate limit exceeded')
      expect(failed?.error_code).toBe('rate_limit_error')
    })

    it('should calculate document usage statistics', async () => {
      // Create some AI calls
      await Promise.all([
        aiCallService.startCall({
          documentId: testDocId,
          modelId: testModelId,
          promptType: 'glossary',
          promptInput: 'Extract glossary'
        }).then(call => 
          aiCallService.completeCall(call!.id, 'Glossary extracted', {
            promptTokens: 100,
            completionTokens: 200,
            totalTokens: 300,
            latencyMs: 1000
          })
        ),
        aiCallService.startCall({
          documentId: testDocId,
          modelId: testModelId,
          promptType: 'headings',
          promptInput: 'Generate headings'
        }).then(call =>
          aiCallService.completeCall(call!.id, 'Headings generated', {
            promptTokens: 80,
            completionTokens: 120,
            totalTokens: 200,
            latencyMs: 800
          })
        )
      ])

      const stats = await aiCallService.getDocumentUsageStats(testDocId)
      
      expect(stats.totalCalls).toBeGreaterThanOrEqual(2)
      expect(stats.totalTokens).toBeGreaterThanOrEqual(500) // Previous + new calls
      expect(stats.byPromptType).toBeDefined()
    })
  })

  describe('Enhancement Service', () => {
    let testDocId: string
    let testAiCallId: string

    beforeAll(async () => {
      const doc = await documentService.create({
        title: 'Enhancement Test Document',
        html_content: '<p>Content to enhance</p>',
        plaintext_content: 'Content to enhance'
      })
      testDocId = doc!.id
      createdDocIds.push(testDocId)

      const aiCall = await aiCallService.startCall({
        documentId: testDocId,
        modelId: testModelId,
        promptType: 'summarise',
        promptInput: 'Summarise content'
      })
      testAiCallId = aiCall!.id
      createdAiCallIds.push(testAiCallId)
    })

    it('should store and retrieve summaries', async () => {
      const summary = await enhancementService.storeSummary(
        testDocId,
        testAiCallId,
        {
          text: 'This document contains content that needs enhancement.',
          keyPoints: ['Content present', 'Enhancement needed'],
          metadata: { confidence: 0.95 }
        },
        'paragraph'
      )

      expect(summary).toBeTruthy()
      expect(summary?.type).toBe('summary')
      expect(summary?.subtype).toBe('paragraph')

      const retrieved = await enhancementService.get(testDocId, 'summary', 'paragraph')
      expect(retrieved?.content).toEqual({
        text: 'This document contains content that needs enhancement.',
        keyPoints: ['Content present', 'Enhancement needed'],
        metadata: { confidence: 0.95 }
      })
    })

    it('should store and retrieve glossaries', async () => {
      const glossary = await enhancementService.storeGlossary(
        testDocId,
        testAiCallId,
        {
          entries: [
            {
              term: 'Enhancement',
              definition: 'The act of improving or augmenting something',
              category: 'General'
            },
            {
              term: 'Document',
              definition: 'A written or digital record',
              category: 'General',
              aliases: ['Doc', 'Record']
            }
          ],
          metadata: { version: 1 }
        }
      )

      expect(glossary).toBeTruthy()
      expect(glossary?.type).toBe('glossary')
      
      const content = glossary?.content as any
      expect(content.entries).toHaveLength(2)
      expect(content.entries[0].term).toBe('Enhancement')
    })

    it('should store and retrieve AI-generated headings', async () => {
      const headings = await enhancementService.storeHeadings(
        testDocId,
        testAiCallId,
        {
          items: [
            {
              id: 'h1',
              text: 'Introduction',
              level: 1
            },
            {
              id: 'h2',
              text: 'Main Content',
              level: 2,
              parentId: 'h1'
            }
          ],
          metadata: { algorithm: 'hierarchical' }
        }
      )

      expect(headings).toBeTruthy()
      expect(headings?.type).toBe('headings')
      
      const content = headings?.content as any
      expect(content.items).toHaveLength(2)
      expect(content.items[1].parentId).toBe('h1')
    })

    it('should enforce uniqueness and support upsert', async () => {
      // First insert
      const first = await enhancementService.upsert({
        documentId: testDocId,
        aiCallId: testAiCallId,
        type: 'tweet-thread',
        content: {
          tweets: [
            { id: '1', text: 'First tweet' }
          ]
        }
      })

      expect(first).toBeTruthy()

      // Upsert with new content
      const second = await enhancementService.upsert({
        documentId: testDocId,
        aiCallId: testAiCallId,
        type: 'tweet-thread',
        content: {
          tweets: [
            { id: '1', text: 'First tweet updated' },
            { id: '2', text: 'Second tweet' }
          ]
        }
      })

      expect(second).toBeTruthy()
      // Note: Due to different ai_call_id, the record is updated but gets a new ID
      // The unique constraint is on (document_id, type, subtype) so it's still an upsert
      
      const content = second?.content as any
      expect(content.tweets).toHaveLength(2)
      expect(content.tweets[0].text).toBe('First tweet updated')
    })

    it('should get enhancement statistics', async () => {
      const stats = await enhancementService.getDocumentStats(testDocId)
      
      expect(stats.totalEnhancements).toBeGreaterThanOrEqual(4) // summary, glossary, headings, tweets
      expect(stats.byType.summary).toBeGreaterThanOrEqual(1)
      expect(stats.byType.glossary).toBeGreaterThanOrEqual(1)
      expect(stats.byType.headings).toBeGreaterThanOrEqual(1)
      expect(stats.byType['tweet-thread']).toBeGreaterThanOrEqual(1)
      expect(stats.lastUpdated).toBeTruthy()
    })
  })

  describe('Chat Service', () => {
    let testDocId: string

    beforeAll(async () => {
      const doc = await documentService.create({
        title: 'Chat Test Document',
        html_content: '<p>Document for chat testing</p>',
        plaintext_content: 'Document for chat testing'
      })
      testDocId = doc!.id
      createdDocIds.push(testDocId)
    })

    it('should create threads and messages', async () => {
      // Create thread
      const thread = await chatService.createThread({
        documentId: testDocId,
        modelId: testModelId,
        title: 'Test Chat Thread'
      })

      expect(thread).toBeTruthy()
      expect(thread?.title).toBe('Test Chat Thread')
      createdThreadIds.push(thread!.id)

      // Add messages
      const userMsg = await chatService.addMessage({
        threadId: thread!.id,
        role: 'user',
        content: 'Hello, can you help me understand this document?'
      })

      expect(userMsg).toBeTruthy()
      expect(userMsg?.sequence_number).toBe(1)

      // Create AI call for assistant response
      const aiCall = await aiCallService.startCall({
        documentId: testDocId,
        modelId: testModelId,
        promptType: 'chat',
        promptInput: 'Hello, can you help me understand this document?'
      })

      const assistantMsg = await chatService.addMessage({
        threadId: thread!.id,
        role: 'assistant',
        content: 'Of course! This document appears to be about chat testing.',
        aiCallId: aiCall?.id
      })

      expect(assistantMsg).toBeTruthy()
      expect(assistantMsg?.sequence_number).toBe(2)
      expect(assistantMsg?.ai_call_id).toBe(aiCall?.id)

      // Get thread with messages
      const { thread: retrievedThread, messages } = await chatService.getThreadWithMessages(thread!.id)
      
      expect(retrievedThread?.id).toBe(thread!.id)
      expect(messages).toHaveLength(2)
      expect(messages[0].role).toBe('user')
      expect(messages[1].role).toBe('assistant')
    })

    it('should auto-generate thread titles', async () => {
      const thread = await chatService.createThread({
        documentId: testDocId,
        modelId: testModelId,
        title: 'New Chat'
      })

      createdThreadIds.push(thread!.id)

      await chatService.addMessage({
        threadId: thread!.id,
        role: 'user',
        content: 'What are the key concepts in machine learning?'
      })

      const updatedThread = await chatService.autoUpdateThreadTitle(thread!.id)
      
      expect(updatedThread?.title).toBe('What are the key concepts in machine learning?')
    })

    it('should list threads by document', async () => {
      // Create multiple threads
      const threads = await Promise.all([
        chatService.createThread({
          documentId: testDocId,
          modelId: testModelId,
          title: 'Thread 1'
        }),
        chatService.createThread({
          documentId: testDocId,
          modelId: testModelId,
          title: 'Thread 2'
        })
      ])

      threads.forEach(thread => thread && createdThreadIds.push(thread.id))

      const docThreads = await chatService.listThreadsByDocument(testDocId)
      
      expect(docThreads.length).toBeGreaterThanOrEqual(2)
      expect(docThreads.some(t => t.title === 'Thread 1')).toBe(true)
      expect(docThreads.some(t => t.title === 'Thread 2')).toBe(true)
    })

    it('should get recent threads across all documents', async () => {
      const recent = await chatService.getRecentThreads({ limit: 5 })
      
      expect(recent).toBeDefined()
      expect(recent.length).toBeLessThanOrEqual(5)
      
      if (recent.length > 0) {
        expect(recent[0]).toHaveProperty('id')
        expect(recent[0]).toHaveProperty('title')
        expect(recent[0]).toHaveProperty('document_id')
      }
    })
  })

  describe('Cross-service integration', () => {
    it('should handle complete document workflow', async () => {
      // 1. Create document
      const doc = await documentService.create({
        title: 'Complete Workflow Test',
        html_content: '<h1>Introduction</h1><p>This is a comprehensive test document.</p>',
        plaintext_content: 'Introduction\nThis is a comprehensive test document.',
        word_count: 7
      })
      createdDocIds.push(doc!.id)

      // 2. Generate summary
      const summaryCall = await aiCallService.startCall({
        documentId: doc!.id,
        modelId: testModelId,
        promptType: 'summarise',
        promptInput: doc!.plaintext_content
      })

      await aiCallService.completeCall(
        summaryCall!.id,
        'A comprehensive test document with introduction.',
        {
          promptTokens: 20,
          completionTokens: 8,
          totalTokens: 28,
          latencyMs: 300
        }
      )

      await enhancementService.storeSummary(
        doc!.id,
        summaryCall!.id,
        {
          text: 'A comprehensive test document with introduction.',
          keyPoints: ['Test document', 'Has introduction']
        },
        'sentence'
      )

      // 3. Create chat thread
      const thread = await chatService.createThread({
        documentId: doc!.id,
        modelId: testModelId,
        title: 'Discussion about workflow test'
      })
      createdThreadIds.push(thread!.id)

      // 4. Add chat interaction
      await chatService.addMessage({
        threadId: thread!.id,
        role: 'user',
        content: 'Can you explain this document?'
      })

      const chatCall = await aiCallService.startCall({
        documentId: doc!.id,
        modelId: testModelId,
        promptType: 'chat',
        promptInput: 'Can you explain this document?'
      })

      await chatService.addMessage({
        threadId: thread!.id,
        role: 'assistant',
        content: 'This is a test document designed to verify our complete workflow.',
        aiCallId: chatCall?.id
      })

      // 5. Verify everything is connected
      const fullDoc = await documentService.getById(doc!.id)
      const enhancements = await enhancementService.getByDocument(doc!.id)
      const threads = await chatService.listThreadsByDocument(doc!.id)
      const aiCalls = await aiCallService.list({ documentId: doc!.id })

      expect(fullDoc).toBeTruthy()
      expect(enhancements.length).toBeGreaterThanOrEqual(1)
      expect(threads.length).toBeGreaterThanOrEqual(1)
      expect(aiCalls.length).toBeGreaterThanOrEqual(2) // summary + chat
    })
  })

  describe('Error handling and edge cases', () => {
    it('should handle non-existent documents gracefully', async () => {
      const doc = await documentService.getById('non-existent-id')
      expect(doc).toBeNull()

      const updated = await documentService.update('non-existent-id', { title: 'New' })
      expect(updated).toBeNull()

      const deleted = await documentService.delete('non-existent-id')
      expect(deleted).toBe(false)
    })

    it('should handle invalid AI call completion', async () => {
      const completed = await aiCallService.completeCall(
        'non-existent-call',
        'Response',
        {
          promptTokens: 10,
          completionTokens: 5,
          totalTokens: 15,
          latencyMs: 100
        }
      )
      expect(completed).toBeNull()
    })

    it('should handle enhancement retrieval for missing data', async () => {
      const enhancement = await enhancementService.get('non-existent-doc', 'summary')
      expect(enhancement).toBeNull()

      const exists = await enhancementService.exists('non-existent-doc', 'summary')
      expect(exists).toBe(false)
    })

    it('should handle thread operations with invalid IDs', async () => {
      const thread = await chatService.getThread('non-existent-thread')
      expect(thread).toBeNull()

      const messages = await chatService.getThreadMessages('non-existent-thread')
      expect(messages).toEqual([])

      // deleteThread returns void, so we just verify it doesn't throw
      await expect(chatService.deleteThread('non-existent-thread')).resolves.not.toThrow()
    })
  })

  describe('Slug Functionality', () => {
    let testDocId: string

    beforeEach(async () => {
      // Create a test document for slug testing
      const doc = await documentService.create({
        title: 'Test Document for Slug Testing',
        html_content: '<h1>Test Document</h1><p>This is a test document.</p>',
        plaintext_content: 'Test Document\n\nThis is a test document.',
        is_public: true
      })

      testDocId = doc.id
      createdDocIds.push(testDocId)
    })

    it('should retrieve document by slug', async () => {
      // The document should have a slug auto-generated from its title
      const document = await documentService.getById(testDocId)
      expect(document?.slug).toBe('test-document-for-slug-testing')

      // Test getBySlug method
      const documentBySlug = await documentService.getBySlug('test-document-for-slug-testing')
      expect(documentBySlug).toBeTruthy()
      expect(documentBySlug?.id).toBe(testDocId)
      expect(documentBySlug?.title).toBe('Test Document for Slug Testing')
    })

    it('should return null for non-existent slug', async () => {
      const document = await documentService.getBySlug('non-existent-slug')
      expect(document).toBeNull()
    })

    it('should handle empty or invalid slug input', async () => {
      const testCases = ['', '   ', null as any, undefined as any]
      
      for (const testCase of testCases) {
        const document = await documentService.getBySlug(testCase)
        expect(document).toBeNull()
      }
    })

    it('should auto-generate unique slugs for documents', async () => {
      // Create multiple documents with similar titles
      const doc1 = await documentService.create({
        title: 'Similar Title Document',
        html_content: '<h1>Doc 1</h1>',
        plaintext_content: 'Doc 1',
        is_public: true
      })
      createdDocIds.push(doc1.id)

      const doc2 = await documentService.create({
        title: 'Similar Title Document', // Same title
        html_content: '<h1>Doc 2</h1>',
        plaintext_content: 'Doc 2',
        is_public: true
      })
      createdDocIds.push(doc2.id)

      // Both should have valid slugs (though the second one might need unique handling)
      expect(doc1.slug).toBeTruthy()
      expect(doc2.slug).toBeTruthy()
      
      // They should be retrievable by their respective slugs
      const retrieved1 = await documentService.getBySlug(doc1.slug)
      const retrieved2 = await documentService.getBySlug(doc2.slug)
      
      expect(retrieved1?.id).toBe(doc1.id)
      expect(retrieved2?.id).toBe(doc2.id)
    })
  })
})