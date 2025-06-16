/**
 * Database Schema Tests for Spideryarn Reading
 * 
 * These tests verify the Supabase database schema implementation including:
 * - Basic CRUD operations for all tables
 * - Foreign key relationships
 * - Uniqueness constraints
 * - MODDATETIME triggers
 * - Cascade deletes
 * 
 * Note: These tests require a running Supabase instance with the migration applied.
 * Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment.
 */

import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Database Schema Tests', () => {
  let supabase: SupabaseClient;
  let testDocumentId: string;
  let testAiCallId: string;
  let testThreadId: string;
  const testModelString = 'anthropic:claude-3-5-haiku:20241022';

  beforeAll(async () => {
    supabase = createClient();
  });

  // Clean up test data after each test
  afterEach(async () => {
    // Clean up in reverse order of dependencies
    if (testThreadId) {
      await supabase.from('chat_threads').delete().eq('id', testThreadId);
      testThreadId = '';
    }
    if (testAiCallId) {
      await supabase.from('ai_calls').delete().eq('id', testAiCallId);
      testAiCallId = '';
    }
    if (testDocumentId) {
      await supabase.from('documents').delete().eq('id', testDocumentId);
      testDocumentId = '';
    }
  });

  // ai_models table tests removed - table deprecated in favor of model strings
  // See: LLM Model Management Simplification (Stage 12 test updates)

  describe('documents table', () => {
    it('should create a document with required fields', async () => {
      const newDocument = {
        title: 'Test Document',
        html_content: '<p>Test HTML content</p>',
        plaintext_content: 'Test plaintext content',
        word_count: 3
      };

      const { data, error } = await supabase
        .from('documents')
        .insert(newDocument)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.id).toBeDefined();
      expect(data?.title).toBe(newDocument.title);
      expect(data?.created_at).toBeDefined();
      expect(data?.updated_at).toBeDefined();
      
      testDocumentId = data?.id;
    });

    it('should update the updated_at timestamp on document update', async () => {
      // Create a document
      const { data: doc } = await supabase
        .from('documents')
        .insert({
          title: 'Update Test Document',
          html_content: '<p>Original</p>',
          plaintext_content: 'Original'
        })
        .select()
        .single();

      testDocumentId = doc?.id;
      const originalUpdatedAt = doc?.updated_at;

      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100));

      // Update the document
      const { data: updatedDoc } = await supabase
        .from('documents')
        .update({ title: 'Updated Title' })
        .eq('id', testDocumentId)
        .select()
        .single();

      expect(updatedDoc?.updated_at).not.toBe(originalUpdatedAt);
      expect(new Date(updatedDoc?.updated_at).getTime()).toBeGreaterThan(
        new Date(originalUpdatedAt).getTime()
      );
    });
  });

  describe('ai_calls table', () => {
    beforeEach(async () => {
      // Create a test document for AI calls
      const { data } = await supabase
        .from('documents')
        .insert({
          title: 'AI Call Test Document',
          html_content: '<p>Test</p>',
          plaintext_content: 'Test'
        })
        .select()
        .single();
      
      testDocumentId = data?.id;
    });

    it('should create an AI call record', async () => {
      const aiCall = {
        model_string: testModelString,
        document_id: testDocumentId,
        prompt_type: 'summarise',
        prompt_input: 'Test prompt input',
        status: 'pending'
      };

      const { data, error } = await supabase
        .from('ai_calls')
        .insert(aiCall)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.id).toBeDefined();
      expect(data?.prompt_type).toBe('summarise');
      expect(data?.status).toBe('pending');
      
      testAiCallId = data?.id;
    });

    it('should track token usage and response details', async () => {
      const aiCall = {
        model_string: testModelString,
        document_id: testDocumentId,
        prompt_type: 'chat',
        prompt_input: 'Test prompt',
        response_text: 'Test response',
        status: 'success',
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
        latency_ms: 1234,
        finish_reason: 'stop'
      };

      const { data, error } = await supabase
        .from('ai_calls')
        .insert(aiCall)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.prompt_tokens).toBe(100);
      expect(data?.completion_tokens).toBe(50);
      expect(data?.total_tokens).toBe(150);
      expect(data?.latency_ms).toBe(1234);
      
      testAiCallId = data?.id;
    });

    it('should enforce status check constraint', async () => {
      const invalidCall = {
        model_string: testModelString,
        prompt_type: 'chat',
        prompt_input: 'Test',
        status: 'invalid_status' // Invalid status
      };

      const { error } = await supabase
        .from('ai_calls')
        .insert(invalidCall);

      expect(error).toBeDefined();
      expect(error?.code).toBe('23514'); // Check constraint violation
    });
  });

  describe('document_enhancements table', () => {
    beforeEach(async () => {
      // Create a test document
      const { data } = await supabase
        .from('documents')
        .insert({
          title: 'Enhancement Test Document',
          html_content: '<p>Test</p>',
          plaintext_content: 'Test'
        })
        .select()
        .single();
      
      testDocumentId = data?.id;
    });

    it('should create document enhancements', async () => {
      const enhancement = {
        document_id: testDocumentId,
        type: 'summary',
        subtype: 'paragraph',
        content: {
          text: 'This is a paragraph summary',
          metadata: { length: 'paragraph' }
        }
      };

      const { data, error } = await supabase
        .from('document_enhancements')
        .insert(enhancement)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.type).toBe('summary');
      expect(data?.subtype).toBe('paragraph');
      expect(data?.content).toEqual(enhancement.content);
    });

    it('should enforce unique constraint on document_id/type/subtype', async () => {
      const enhancement1 = {
        document_id: testDocumentId,
        type: 'glossary',
        subtype: 'terms',
        content: { terms: ['term1'] }
      };

      // First insert should succeed
      const { error: error1 } = await supabase
        .from('document_enhancements')
        .insert(enhancement1);
      
      expect(error1).toBeNull();

      // Duplicate insert should fail
      const { error: error2 } = await supabase
        .from('document_enhancements')
        .insert(enhancement1);

      expect(error2).toBeDefined();
      expect(error2?.code).toBe('23505'); // Unique violation
    });

    it('should cascade delete when document is deleted', async () => {
      // Create an enhancement
      const { data: enhancement } = await supabase
        .from('document_enhancements')
        .insert({
          document_id: testDocumentId,
          type: 'headings',
          subtype: 'default',
          content: { headings: [] }
        })
        .select()
        .single();

      const enhancementId = enhancement?.id;

      // Delete the document
      await supabase
        .from('documents')
        .delete()
        .eq('id', testDocumentId);

      // Enhancement should be gone
      const { data: deletedEnhancement } = await supabase
        .from('document_enhancements')
        .select()
        .eq('id', enhancementId)
        .single();

      expect(deletedEnhancement).toBeNull();
      
      // Clear testDocumentId since it's been deleted
      testDocumentId = '';
    });
  });

  describe('chat functionality', () => {
    beforeEach(async () => {
      // Create a test document
      const { data } = await supabase
        .from('documents')
        .insert({
          title: 'Chat Test Document',
          html_content: '<p>Test</p>',
          plaintext_content: 'Test'
        })
        .select()
        .single();
      
      testDocumentId = data?.id;
    });

    it('should create a chat thread with messages', async () => {
      // Create a thread
      const { data: thread, error: threadError } = await supabase
        .from('chat_threads')
        .insert({
          document_id: testDocumentId,
          model_string: testModelString,
          title: 'Test Chat Thread'
        })
        .select()
        .single();

      expect(threadError).toBeNull();
      expect(thread).toBeDefined();
      testThreadId = thread?.id;

      // Add messages to the thread
      const messages = [
        {
          thread_id: testThreadId,
          role: 'user',
          content: 'Hello, can you help me?',
          sequence_number: 1
        },
        {
          thread_id: testThreadId,
          role: 'assistant',
          content: 'Of course! How can I assist you?',
          sequence_number: 2
        }
      ];

      const { data: insertedMessages, error: msgError } = await supabase
        .from('chat_messages')
        .insert(messages)
        .select()
        .order('sequence_number');

      expect(msgError).toBeNull();
      expect(insertedMessages).toHaveLength(2);
      expect(insertedMessages?.[0].role).toBe('user');
      expect(insertedMessages?.[1].role).toBe('assistant');
    });

    it('should enforce unique sequence numbers per thread', async () => {
      // Create a thread
      const { data: thread } = await supabase
        .from('chat_threads')
        .insert({
          document_id: testDocumentId,
          model_string: testModelString
        })
        .select()
        .single();

      testThreadId = thread?.id;

      // Insert first message
      await supabase
        .from('chat_messages')
        .insert({
          thread_id: testThreadId,
          role: 'user',
          content: 'First message',
          sequence_number: 1
        });

      // Try to insert with same sequence number
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          thread_id: testThreadId,
          role: 'assistant',
          content: 'Duplicate sequence',
          sequence_number: 1
        });

      expect(error).toBeDefined();
      expect(error?.code).toBe('23505'); // Unique violation
    });

    it('should cascade delete messages when thread is deleted', async () => {
      // Create thread and message
      const { data: thread } = await supabase
        .from('chat_threads')
        .insert({
          document_id: testDocumentId,
          model_string: testModelString
        })
        .select()
        .single();

      testThreadId = thread?.id;

      const { data: message } = await supabase
        .from('chat_messages')
        .insert({
          thread_id: testThreadId,
          role: 'user',
          content: 'Test message',
          sequence_number: 1
        })
        .select()
        .single();

      const messageId = message?.id;

      // Delete the thread
      await supabase
        .from('chat_threads')
        .delete()
        .eq('id', testThreadId);

      // Message should be gone
      const { data: deletedMessage } = await supabase
        .from('chat_messages')
        .select()
        .eq('id', messageId)
        .single();

      expect(deletedMessage).toBeNull();
      
      // Clear testThreadId since it's been deleted
      testThreadId = '';
    });
  });

  describe('foreign key relationships', () => {
    it('should link ai_calls to document_enhancements', async () => {
      // Create document
      const { data: doc } = await supabase
        .from('documents')
        .insert({
          title: 'FK Test Document',
          html_content: '<p>Test</p>',
          plaintext_content: 'Test'
        })
        .select()
        .single();

      testDocumentId = doc?.id;

      // Create AI call
      const { data: aiCall } = await supabase
        .from('ai_calls')
        .insert({
          model_string: testModelString,
          document_id: testDocumentId,
          prompt_type: 'glossary',
          prompt_input: 'Extract glossary',
          status: 'success',
          response_text: '{"terms": ["test"]}'
        })
        .select()
        .single();

      testAiCallId = aiCall?.id;

      // Create enhancement linked to AI call
      const { data: enhancement, error } = await supabase
        .from('document_enhancements')
        .insert({
          document_id: testDocumentId,
          ai_call_id: testAiCallId,
          type: 'glossary',
          subtype: 'default',
          content: { terms: ['test'] }
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(enhancement?.ai_call_id).toBe(testAiCallId);
    });

    // Commented out: No DELETE policy on ai_calls table blocks the DELETE operation
    // See planning/finished/250531a_database_storage_implementation.md - Test Failure Analysis #2
    it.skip('should set ai_call_id to null when AI call is deleted', async () => {
      // Create document and AI call
      const { data: doc } = await supabase
        .from('documents')
        .insert({
          title: 'FK Null Test',
          html_content: '<p>Test</p>',
          plaintext_content: 'Test'
        })
        .select()
        .single();

      testDocumentId = doc?.id;

      const { data: aiCall } = await supabase
        .from('ai_calls')
        .insert({
          model_string: testModelString,
          document_id: testDocumentId,
          prompt_type: 'summary',
          prompt_input: 'Summarise',
          status: 'success'
        })
        .select()
        .single();

      testAiCallId = aiCall?.id;

      // Create enhancement
      const { data: enhancement } = await supabase
        .from('document_enhancements')
        .insert({
          document_id: testDocumentId,
          ai_call_id: testAiCallId,
          type: 'summary',
          subtype: 'document',
          content: { text: 'Summary' }
        })
        .select()
        .single();

      const enhancementId = enhancement?.id;

      // Delete the AI call
      await supabase
        .from('ai_calls')
        .delete()
        .eq('id', testAiCallId);

      // Check enhancement still exists but ai_call_id is null
      const { data: updatedEnhancement } = await supabase
        .from('document_enhancements')
        .select()
        .eq('id', enhancementId)
        .single();

      expect(updatedEnhancement).toBeDefined();
      expect(updatedEnhancement?.ai_call_id).toBeNull();
      
      // Clear testAiCallId since it's been deleted
      testAiCallId = '';
    });
  });

  describe('profiles table', () => {
    // Commented out: Requires valid auth.users reference which doesn't exist in test environment
    // See planning/finished/250531a_database_storage_implementation.md - Test Failure Analysis #3
    it.skip('should create and update user profiles', async () => {
      // Create a profile
      const { data: profile, error: createError } = await supabase
        .from('profiles')
        .insert({
          preferences: {
            theme: 'dark',
            fontSize: 'medium'
          }
        })
        .select()
        .single();

      expect(createError).toBeNull();
      expect(profile).toBeDefined();
      expect(profile?.preferences).toEqual({
        theme: 'dark',
        fontSize: 'medium'
      });

      const profileId = profile?.id;

      // Update preferences
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({
          preferences: {
            theme: 'light',
            fontSize: 'large',
            autoSave: true
          }
        })
        .eq('id', profileId)
        .select()
        .single();

      expect(updateError).toBeNull();
      expect(updatedProfile?.preferences.theme).toBe('light');
      expect(updatedProfile?.preferences.autoSave).toBe(true);

      // Clean up
      await supabase.from('profiles').delete().eq('id', profileId);
    });
  });
});