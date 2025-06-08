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

// Test helpers
interface TestDocumentData {
  title: string
  html_content: string
  plaintext_content: string
  source_url?: string
  language_code?: string
  word_count?: number
  is_public?: boolean
}

interface TestAiCallOptions {
  documentId?: string
  provider?: string
  modelId?: string
  prompt_type: string
  content: string
}

interface MockTokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  latencyMs: number
}

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
  
  const createdDocIds: string[] = []
  const createdAiCallIds: string[] = []
  const createdThreadIds: string[] = []

  // Test configuration
  const TEST_PROVIDER = 'anthropic'
  const TEST_MODEL_ID = 'claude-3-5-haiku-20241022'

  beforeAll(async () => {
    supabase = createClient()
    documentService = new DocumentService(supabase)
    aiCallService = new AiCallService(supabase)
    enhancementService = new EnhancementService(supabase)
    chatService = new ChatService(supabase)
  })

  // Helper functions
  const createTestDocument = async (overrides: Partial<TestDocumentData> = {}): Promise<{ id: string; title: string; html_content: string; plaintext_content: string; slug: string }> => {
    const defaults: TestDocumentData = {
      title: 'Test Document',
      html_content: '<h1>Test</h1><p>Content</p>',
      plaintext_content: 'Test\nContent',
      word_count: 2,
      is_public: false
    }
    
    const data = { ...defaults, ...overrides }
    // Generate slug from title if not provided
    const { generateSlug } = await import('@/lib/utils/slug')
    const slug = generateSlug(data.title)
    
    const doc = await documentService.create({ ...data, slug })
    if (!doc) throw new Error('Failed to create test document')
    
    createdDocIds.push(doc.id)
    return doc
  }

  const createTestAiCall = async (options: TestAiCallOptions) => {
    const call = await aiCallService.startCall({
      documentId: options.documentId,
      provider: (options.provider || TEST_PROVIDER) as 'anthropic' | 'google',
      modelId: options.modelId || TEST_MODEL_ID,
      prompt_type: options.prompt_type,
      input_data: { content: options.content }
    })
    
    if (!call) throw new Error('Failed to create test AI call')
    createdAiCallIds.push(call.id)
    return call
  }

  const completeAiCall = async (callId: string, response: string, usage: MockTokenUsage) => {
    return await aiCallService.completeCall(callId, {
      output_data: {
        text: response,
        usage: usage
      }
    })
  }

  const createTestChatThread = async (documentId: string, title: string = 'Test Chat Thread') => {
    const thread = await chatService.createThread({
      documentId,
      modelId: TEST_MODEL_ID,
      title
    })
    
    if (!thread) throw new Error('Failed to create test chat thread')
    createdThreadIds.push(thread.id)
    return thread
  }

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
    it('should handle CRUD operations and search functionality', async () => {
      // Create document with searchable content
      const doc = await createTestDocument({
        title: 'Machine Learning Integration Test',
        html_content: '<h1>Neural Networks</h1><p>Deep learning algorithms and artificial intelligence</p>',
        plaintext_content: 'Neural Networks\nDeep learning algorithms and artificial intelligence',
        source_url: 'https://example.com/ml-test',
        language_code: 'en',
        word_count: 8
      })

      expect(doc.id).toBeDefined()
      expect(doc.title).toBe('Machine Learning Integration Test')

      // Update document
      const updated = await documentService.update(doc.id, {
        title: 'Updated ML Integration Test'
      })
      expect(updated?.title).toBe('Updated ML Integration Test')

      // Retrieve by ID
      const retrieved = await documentService.getById(doc.id)
      expect(retrieved?.id).toBe(doc.id)
      expect(retrieved?.title).toBe('Updated ML Integration Test')

      // Search functionality
      const searchResults = await documentService.search('neural networks')
      expect(searchResults.length).toBeGreaterThan(0)
      expect(searchResults.some(d => d.id === doc.id)).toBe(true)

      // Test slug functionality
      expect(retrieved?.slug).toBe('machine-learning-integration-test')
      const bySlug = await documentService.getBySlug(retrieved!.slug)
      expect(bySlug?.id).toBe(doc.id)
    })

    it('should handle pagination and listing', async () => {
      // Create multiple test documents
      await Promise.all([
        createTestDocument({ title: 'List Test Doc 1' }),
        createTestDocument({ title: 'List Test Doc 2' }),
        createTestDocument({ title: 'List Test Doc 3' })
      ])

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
      const doc = await createTestDocument({
        title: 'AI Call Test Document',
        html_content: '<p>Test content for AI processing</p>',
        plaintext_content: 'Test content for AI processing'
      })
      testDocId = doc.id
    })

    it('should handle complete AI call lifecycle and statistics', async () => {
      // Test successful call lifecycle
      const call = await createTestAiCall({
        documentId: testDocId,
        prompt_type: 'summarise',
        content: 'Summarise this test content'
      })

      expect(call.status).toBe('pending')
      expect(call.provider).toBe(TEST_PROVIDER)
      expect(call.model_id).toBe(TEST_MODEL_ID)

      // Complete the call
      const completed = await completeAiCall(call.id, 'Test summary generated successfully', {
        promptTokens: 50,
        completionTokens: 15,
        totalTokens: 65,
        latencyMs: 500
      })

      expect(completed?.status).toBe('success')
      expect(completed?.output_data?.text).toBe('Test summary generated successfully')

      // Test failure handling
      const failCall = await createTestAiCall({
        documentId: testDocId,
        prompt_type: 'chat',
        content: 'Test failure scenario'
      })

      const failed = await aiCallService.failCall(
        failCall.id,
        'Rate limit exceeded',
        'rate_limit_error'
      )

      expect(failed?.status).toBe('failed')
      expect(failed?.error_message).toBe('Rate limit exceeded')
      expect(failed?.error_code).toBe('rate_limit_error')

      // Create additional calls for statistics testing
      const glossaryCall = await createTestAiCall({
        documentId: testDocId,
        prompt_type: 'glossary',
        content: 'Extract key terms'
      })
      
      await completeAiCall(glossaryCall.id, 'Glossary extracted', {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
        latencyMs: 800
      })

      const headingsCall = await createTestAiCall({
        documentId: testDocId,
        prompt_type: 'headings',
        content: 'Generate section headings'
      })
      
      await completeAiCall(headingsCall.id, 'Headings generated', {
        promptTokens: 80,
        completionTokens: 40,
        totalTokens: 120,
        latencyMs: 600
      })

      // Verify usage statistics
      const stats = await aiCallService.getDocumentUsageStats(testDocId)
      expect(stats.totalCalls).toBeGreaterThanOrEqual(3)
      expect(stats.totalTokens).toBeGreaterThanOrEqual(335) // 65 + 150 + 120
      expect(stats.byPromptType).toBeDefined()
      expect(stats.byPromptType.summarise).toBeGreaterThanOrEqual(1)
      expect(stats.byPromptType.glossary).toBeGreaterThanOrEqual(1)
      expect(stats.byPromptType.headings).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Enhancement Service', () => {
    let testDocId: string
    let testAiCallId: string

    beforeAll(async () => {
      const doc = await createTestDocument({
        title: 'Enhancement Test Document',
        html_content: '<p>Content to enhance with AI-generated features</p>',
        plaintext_content: 'Content to enhance with AI-generated features'
      })
      testDocId = doc.id

      const aiCall = await createTestAiCall({
        documentId: testDocId,
        prompt_type: 'summarise',
        content: 'Analyse and enhance this content'
      })
      testAiCallId = aiCall.id
    })

    it('should store and retrieve all enhancement types', async () => {
      // Test summary storage
      const summary = await enhancementService.storeSummary(
        testDocId,
        testAiCallId,
        {
          text: 'Document analysis shows content suitable for AI enhancement.',
          keyPoints: ['AI enhancement ready', 'Multiple features supported'],
          metadata: { confidence: 0.95 }
        },
        'paragraph'
      )
      expect(summary?.type).toBe('summary')
      expect(summary?.subtype).toBe('paragraph')

      // Test glossary storage
      const glossary = await enhancementService.storeGlossary(
        testDocId,
        testAiCallId,
        {
          entities: [
            {
              name: 'AI Enhancement',
              ontology: 'Technology',
              aliases: ['Enhancement', 'AI Improvement'],
              brief_explanation: 'Process of improving content using artificial intelligence',
              long_explanation: 'A comprehensive approach to enhancing document content through AI-powered analysis and augmentation'
            },
            {
              name: 'Document Analysis',
              ontology: 'Process',
              aliases: ['Content Analysis', 'Doc Review'],
              brief_explanation: 'Systematic examination of document content and structure',
              long_explanation: 'The methodical study of document elements including text, structure, and metadata'
            }
          ],
          metadata: { extractionMethod: 'llm-based', version: 1 }
        }
      )
      expect(glossary?.type).toBe('glossary')
      const glossaryContent = glossary?.content as { entities: Array<{ name: string }> }
      expect(glossaryContent.entities).toHaveLength(2)
      expect(glossaryContent.entities[0].name).toBe('AI Enhancement')

      // Test headings storage
      const headings = await enhancementService.storeHeadings(
        testDocId,
        testAiCallId,
        {
          items: [
            { id: 'intro', text: 'Introduction to Enhancement', level: 1 },
            { id: 'methods', text: 'Enhancement Methods', level: 2, parentId: 'intro' },
            { id: 'ai-tools', text: 'AI Tools and Techniques', level: 3, parentId: 'methods' }
          ],
          metadata: { algorithm: 'hierarchical', confidence: 0.92 }
        }
      )
      expect(headings?.type).toBe('headings')
      const headingsContent = headings?.content as { items: Array<{ parentId?: string }> }
      expect(headingsContent.items).toHaveLength(3)
      expect(headingsContent.items[2].parentId).toBe('methods')

      // Test retrieval
      const retrievedSummary = await enhancementService.get(testDocId, 'summary', 'paragraph')
      expect(retrievedSummary?.content).toMatchObject({
        text: 'Document analysis shows content suitable for AI enhancement.',
        keyPoints: ['AI enhancement ready', 'Multiple features supported']
      })

      const retrievedGlossary = await enhancementService.get(testDocId, 'glossary', 'default')
      expect(retrievedGlossary?.type).toBe('glossary')

      const retrievedHeadings = await enhancementService.get(testDocId, 'headings', 'default')
      expect(retrievedHeadings?.type).toBe('headings')
    })

    it('should handle upsert operations and document statistics', async () => {
      // Test upsert functionality
      const tweetThread = await enhancementService.upsert({
        documentId: testDocId,
        aiCallId: testAiCallId,
        type: 'tweet-thread',
        subtype: 'default',
        content: {
          tweets: [
            { id: '1', text: 'AI enhancement transforms document analysis 🧠' },
            { id: '2', text: 'Multiple AI features work together seamlessly ⚡' }
          ],
          metadata: { threadLength: 2, style: 'informative' }
        }
      })
      expect(tweetThread?.type).toBe('tweet-thread')

      // Update the same tweet thread
      const updatedTweetThread = await enhancementService.upsert({
        documentId: testDocId,
        aiCallId: testAiCallId,
        type: 'tweet-thread',
        subtype: 'default',
        content: {
          tweets: [
            { id: '1', text: 'Enhanced: AI analysis revolutionizes documents 🚀' },
            { id: '2', text: 'Seamless integration of multiple AI features ⚡' },
            { id: '3', text: 'Future of intelligent document processing 🔮' }
          ],
          metadata: { threadLength: 3, style: 'promotional' }
        }
      })
      
      const updatedContent = updatedTweetThread?.content as { tweets: Array<{ text: string }> }
      expect(updatedContent.tweets).toHaveLength(3)
      expect(updatedContent.tweets[0].text).toContain('Enhanced:')

      // Test document statistics
      const stats = await enhancementService.getDocumentStats(testDocId)
      expect(stats.totalEnhancements).toBeGreaterThanOrEqual(4) // summary, glossary, headings, tweet-thread
      expect(stats.byType.summary).toBeGreaterThanOrEqual(1)
      expect(stats.byType.glossary).toBeGreaterThanOrEqual(1)
      expect(stats.byType.headings).toBeGreaterThanOrEqual(1)
      expect(stats.byType['tweet-thread']).toBeGreaterThanOrEqual(1)
      expect(stats.lastUpdated).toBeTruthy()

      // Test existence checks
      expect(await enhancementService.exists(testDocId, 'summary')).toBe(true)
      expect(await enhancementService.exists(testDocId, 'glossary')).toBe(true)
      expect(await enhancementService.exists(testDocId, 'nonexistent')).toBe(false)
    })
  })

  describe('Chat Service', () => {
    let testDocId: string

    beforeAll(async () => {
      const doc = await createTestDocument({
        title: 'Chat Integration Test Document',
        html_content: '<p>Document for comprehensive chat testing and AI interaction</p>',
        plaintext_content: 'Document for comprehensive chat testing and AI interaction'
      })
      testDocId = doc.id
    })

    it('should handle complete chat workflow with AI integration', async () => {
      // Create chat thread
      const thread = await createTestChatThread(testDocId, 'AI Discussion Thread')
      expect(thread.title).toBe('AI Discussion Thread')
      expect(thread.document_id).toBe(testDocId)

      // Add user message
      const userMsg = await chatService.addMessage({
        threadId: thread.id,
        role: 'user',
        content: 'Can you help me understand the key concepts in this document about AI integration?'
      })
      expect(userMsg?.sequence_number).toBe(1)
      expect(userMsg?.role).toBe('user')

      // Create AI call for assistant response
      const aiCall = await createTestAiCall({
        documentId: testDocId,
        prompt_type: 'chat',
        content: 'Can you help me understand the key concepts in this document about AI integration?'
      })

      // Add assistant response
      const assistantMsg = await chatService.addMessage({
        threadId: thread.id,
        role: 'assistant',
        content: 'This document focuses on AI integration for chat systems, covering real-time interaction patterns and intelligent response generation.',
        aiCallId: aiCall.id
      })
      expect(assistantMsg?.sequence_number).toBe(2)
      expect(assistantMsg?.role).toBe('assistant')
      expect(assistantMsg?.ai_call_id).toBe(aiCall.id)

      // Test thread retrieval with messages
      const { thread: retrievedThread, messages } = await chatService.getThreadWithMessages(thread.id)
      expect(retrievedThread?.id).toBe(thread.id)
      expect(messages).toHaveLength(2)
      expect(messages[0].content).toContain('key concepts')
      expect(messages[1].content).toContain('AI integration')

      // Test auto-title generation
      const updatedThread = await chatService.autoUpdateThreadTitle(thread.id)
      expect(updatedThread?.title).toBe('Can you help me understand the key concepts in this document about AI integration?')
    })

    it('should handle multiple threads and listing operations', async () => {
      // Create additional threads for testing
      const threads = await Promise.all([
        createTestChatThread(testDocId, 'Technical Discussion'),
        createTestChatThread(testDocId, 'Feature Planning'),
        createTestChatThread(testDocId, 'Implementation Details')
      ])

      // Add messages to threads to make them more realistic
      await Promise.all(threads.map(async (thread, index) => {
        await chatService.addMessage({
          threadId: thread.id,
          role: 'user',
          content: `Question ${index + 1} about the document content`
        })
      }))

      // Test listing threads by document
      const docThreads = await chatService.listThreadsByDocument(testDocId)
      expect(docThreads.length).toBeGreaterThanOrEqual(3)
      
      const threadTitles = docThreads.map(t => t.title)
      expect(threadTitles).toContain('Technical Discussion')
      expect(threadTitles).toContain('Feature Planning')
      expect(threadTitles).toContain('Implementation Details')

      // Test getting recent threads across all documents
      const recent = await chatService.getRecentThreads({ limit: 10 })
      expect(recent).toBeDefined()
      expect(recent.length).toBeLessThanOrEqual(10)
      
      if (recent.length > 0) {
        expect(recent[0]).toHaveProperty('id')
        expect(recent[0]).toHaveProperty('title')
        expect(recent[0]).toHaveProperty('document_id')
        expect(recent[0]).toHaveProperty('created_at')
      }
    })
  })

  describe('Cross-service integration', () => {
    it('should handle complete document processing workflow', async () => {
      // 1. Create comprehensive test document
      const doc = await createTestDocument({
        title: 'Complete AI Workflow Integration Test',
        html_content: '<h1>AI Document Processing</h1><p>This document tests the complete integration of AI services including summarization, glossary extraction, heading generation, and interactive chat capabilities.</p><h2>Key Features</h2><p>Multiple AI enhancement types working together seamlessly.</p>',
        plaintext_content: 'AI Document Processing\n\nThis document tests the complete integration of AI services including summarization, glossary extraction, heading generation, and interactive chat capabilities.\n\nKey Features\n\nMultiple AI enhancement types working together seamlessly.',
        word_count: 28,
        is_public: true
      })

      // 2. Generate multiple AI enhancements
      // Summary generation
      const summaryCall = await createTestAiCall({
        documentId: doc.id,
        prompt_type: 'summarise',
        content: doc.plaintext_content
      })
      
      await completeAiCall(summaryCall.id, 'Document covers AI workflow integration with multiple enhancement features including summarization, glossary, headings, and chat.', {
        promptTokens: 80,
        completionTokens: 25,
        totalTokens: 105,
        latencyMs: 700
      })

      await enhancementService.storeSummary(doc.id, summaryCall.id, {
        text: 'Document covers AI workflow integration with multiple enhancement features including summarization, glossary, headings, and chat.',
        keyPoints: ['AI workflow integration', 'Multiple enhancements', 'Seamless operation'],
        metadata: { confidence: 0.94, extractionMethod: 'comprehensive' }
      }, 'document')

      // Glossary extraction
      const glossaryCall = await createTestAiCall({
        documentId: doc.id,
        prompt_type: 'glossary',
        content: doc.plaintext_content
      })
      
      await completeAiCall(glossaryCall.id, 'Glossary extracted with key AI and document processing terms.', {
        promptTokens: 90,
        completionTokens: 45,
        totalTokens: 135,
        latencyMs: 800
      })

      await enhancementService.storeGlossary(doc.id, glossaryCall.id, {
        entities: [
          {
            name: 'AI Workflow',
            ontology: 'Process',
            aliases: ['Workflow', 'AI Process'],
            brief_explanation: 'Systematic process of applying artificial intelligence to document analysis and enhancement'
          },
          {
            name: 'Enhancement Integration',
            ontology: 'Technology',
            aliases: ['Feature Integration', 'AI Enhancement'],
            brief_explanation: 'Coordinated use of multiple AI features to improve document utility'
          }
        ],
        metadata: { extractionConfidence: 0.91, termCount: 2 }
      })

      // Heading generation
      const headingsCall = await createTestAiCall({
        documentId: doc.id,
        prompt_type: 'headings',
        content: doc.plaintext_content
      })
      
      await completeAiCall(headingsCall.id, 'Hierarchical headings generated for improved document navigation.', {
        promptTokens: 75,
        completionTokens: 30,
        totalTokens: 105,
        latencyMs: 600
      })

      await enhancementService.storeHeadings(doc.id, headingsCall.id, {
        items: [
          { id: 'main', text: 'AI Document Processing Overview', level: 1 },
          { id: 'integration', text: 'Service Integration Testing', level: 2, parentId: 'main' },
          { id: 'features', text: 'Enhanced Feature Set', level: 2, parentId: 'main' }
        ],
        metadata: { generationMethod: 'hierarchical', confidence: 0.89 }
      })

      // 3. Create and test chat interaction
      const thread = await createTestChatThread(doc.id, 'Workflow Integration Discussion')
      
      await chatService.addMessage({
        threadId: thread.id,
        role: 'user',
        content: 'Can you explain how all these AI features work together in this document?'
      })

      const chatCall = await createTestAiCall({
        documentId: doc.id,
        prompt_type: 'chat',
        content: 'Can you explain how all these AI features work together in this document?'
      })
      
      await completeAiCall(chatCall.id, 'This document demonstrates a comprehensive AI workflow where summarization, glossary extraction, heading generation, and interactive chat work together to create an enhanced reading experience.', {
        promptTokens: 120,
        completionTokens: 35,
        totalTokens: 155,
        latencyMs: 900
      })

      await chatService.addMessage({
        threadId: thread.id,
        role: 'assistant',
        content: 'This document demonstrates a comprehensive AI workflow where summarization, glossary extraction, heading generation, and interactive chat work together to create an enhanced reading experience.',
        aiCallId: chatCall.id
      })

      // 4. Comprehensive verification of integrated workflow
      const retrievedDoc = await documentService.getById(doc.id)
      const allEnhancements = await enhancementService.getByDocument(doc.id)
      const documentThreads = await chatService.listThreadsByDocument(doc.id)
      const allAiCalls = await aiCallService.list({ documentId: doc.id })
      const usageStats = await aiCallService.getDocumentUsageStats(doc.id)
      const enhancementStats = await enhancementService.getDocumentStats(doc.id)

      // Verify document integrity
      expect(retrievedDoc).toBeTruthy()
      expect(retrievedDoc?.title).toBe('Complete AI Workflow Integration Test')
      expect(retrievedDoc?.slug).toBe('complete-ai-workflow-integration-test')

      // Verify all enhancement types present
      expect(allEnhancements.length).toBeGreaterThanOrEqual(3)
      const enhancementTypes = allEnhancements.map(e => e.type)
      expect(enhancementTypes).toContain('summary')
      expect(enhancementTypes).toContain('glossary')
      expect(enhancementTypes).toContain('headings')

      // Verify chat functionality
      expect(documentThreads.length).toBeGreaterThanOrEqual(1)
      expect(documentThreads[0].title).toBe('Workflow Integration Discussion')

      // Verify AI call tracking
      expect(allAiCalls.length).toBeGreaterThanOrEqual(4) // summary, glossary, headings, chat
      expect(usageStats.totalCalls).toBeGreaterThanOrEqual(4)
      expect(usageStats.totalTokens).toBeGreaterThanOrEqual(500) // Sum of all token usage
      expect(usageStats.byPromptType.summarise).toBeGreaterThanOrEqual(1)
      expect(usageStats.byPromptType.glossary).toBeGreaterThanOrEqual(1)
      expect(usageStats.byPromptType.headings).toBeGreaterThanOrEqual(1)
      expect(usageStats.byPromptType.chat).toBeGreaterThanOrEqual(1)

      // Verify enhancement statistics
      expect(enhancementStats.totalEnhancements).toBeGreaterThanOrEqual(3)
      expect(enhancementStats.byType.summary).toBeGreaterThanOrEqual(1)
      expect(enhancementStats.byType.glossary).toBeGreaterThanOrEqual(1)
      expect(enhancementStats.byType.headings).toBeGreaterThanOrEqual(1)

      // Verify data relationships
      const summaryEnhancement = await enhancementService.get(doc.id, 'summary', 'document')
      const glossaryEnhancement = await enhancementService.get(doc.id, 'glossary', 'default')
      const headingsEnhancement = await enhancementService.get(doc.id, 'headings', 'default')
      
      expect(summaryEnhancement?.ai_call_id).toBe(summaryCall.id)
      expect(glossaryEnhancement?.ai_call_id).toBe(glossaryCall.id)
      expect(headingsEnhancement?.ai_call_id).toBe(headingsCall.id)

      // Verify thread message content and AI call linkage
      const { messages } = await chatService.getThreadWithMessages(thread.id)
      expect(messages).toHaveLength(2)
      expect(messages[1].ai_call_id).toBe(chatCall.id)
      expect(messages[1].content).toContain('comprehensive AI workflow')
    })
  })

  describe('Error handling and edge cases', () => {
    it('should handle various error scenarios gracefully', async () => {
      // Document service error handling
      expect(await documentService.getById('non-existent-id')).toBeNull()
      expect(await documentService.getBySlug('non-existent-slug')).toBeNull()
      expect(await documentService.update('non-existent-id', { title: 'New' })).toBeNull()
      expect(await documentService.delete('non-existent-id')).toBe(false)

      // AI call service error handling
      expect(await aiCallService.completeCall('non-existent-call', {
        output_data: { text: 'Response' }
      })).toBeNull()

      // Enhancement service error handling
      expect(await enhancementService.get('non-existent-doc', 'summary')).toBeNull()
      expect(await enhancementService.exists('non-existent-doc', 'summary')).toBe(false)
      expect(await enhancementService.getByDocument('non-existent-doc')).toEqual([])

      // Chat service error handling
      expect(await chatService.getThread('non-existent-thread')).toBeNull()
      expect(await chatService.getThreadMessages('non-existent-thread')).toEqual([])
      expect(await chatService.listThreadsByDocument('non-existent-doc')).toEqual([])
      
      // Verify deleteThread doesn't throw on non-existent ID
      await expect(chatService.deleteThread('non-existent-thread')).resolves.not.toThrow()

      // Test invalid input handling
      expect(await documentService.getBySlug('')).toBeNull()
      expect(await documentService.getBySlug('   ')).toBeNull()
      expect(await documentService.getBySlug(null as unknown as string)).toBeNull()
      expect(await documentService.getBySlug(undefined as unknown as string)).toBeNull()
    })
  })

  // Note: Slug functionality is already tested in the main Document Service test above
  // This consolidation removes redundant slug testing while maintaining coverage
})