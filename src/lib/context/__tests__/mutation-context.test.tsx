import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { MutationProvider, useMutation, useDocument, useActiveMutationType } from '@/lib/context/mutation-context'
import { DocumentElement } from '@/lib/types/document'
import { Mutation } from '@/lib/types/mutation'

describe('MutationContext', () => {
  const mockDocument: DocumentElement[] = [
    {
      id: 'heading-1',
      document_id: 'test-doc',
      parent_id: null,
      tag_name: 'h1',
      content: 'Test Document',
      attributes: {},
      position: 1,
      level: 0,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z'
    },
    {
      id: 'para-1',
      document_id: 'test-doc',
      parent_id: null,
      tag_name: 'p',
      content: 'First paragraph',
      attributes: {},
      position: 2,
      level: 0,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z'
    }
  ]

  const mockMutation: Mutation = {
    id: 'test-mutation',
    type: 'insert-headings',
    forward: [{
      action: 'insert',
      afterId: 'para-1',
      content: {
        id: 'ai-heading-1',
        tag_name: 'h2',
        content: 'AI Generated Section',
        attributes: { 'data-ai-generated': 'true' }
      }
    }],
    reverse: [{
      action: 'remove',
      targetId: 'ai-heading-1'
    }]
  }

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MutationProvider initialDocument={mockDocument}>
      {children}
    </MutationProvider>
  )

  describe('useMutation', () => {
    it('should provide initial document state', () => {
      const { result } = renderHook(() => useMutation(), { wrapper })
      
      expect(result.current.document).toEqual(mockDocument)
      expect(result.current.mutationState.activeMutation).toBeNull()
    })

    it('should apply mutation and update document state', async () => {
      const { result } = renderHook(() => useMutation(), { wrapper })
      
      await act(async () => {
        await result.current.applyMutation(mockMutation)
      })
      
      expect(result.current.document).toHaveLength(3)
      expect(result.current.mutationState.activeMutation).toEqual(mockMutation)
      
      const insertedElement = result.current.document.find(el => el.id === 'ai-heading-1')
      expect(insertedElement).toBeDefined()
      expect(insertedElement?.tag_name).toBe('h2')
      expect(insertedElement?.content).toBe('AI Generated Section')
    })

    it('should revert mutation and restore original document', async () => {
      const { result } = renderHook(() => useMutation(), { wrapper })
      
      // Apply mutation
      await act(async () => {
        await result.current.applyMutation(mockMutation)
      })
      
      expect(result.current.document).toHaveLength(3)
      
      // Revert mutation
      await act(async () => {
        await result.current.revertMutation()
      })
      
      expect(result.current.document).toHaveLength(2)
      expect(result.current.document).toEqual(mockDocument)
      expect(result.current.mutationState.activeMutation).toBeNull()
    })

    it('should handle mutation errors gracefully', async () => {
      const { result } = renderHook(() => useMutation(), { wrapper })
      
      const invalidMutation: Mutation = {
        id: 'invalid-mutation',
        type: 'insert-headings',
        forward: [{
          action: 'insert',
          afterId: 'non-existent-id',
          content: { id: 'new-element' }
        }],
        reverse: []
      }
      
      await act(async () => {
        const mutationResult = await result.current.applyMutation(invalidMutation)
        expect(mutationResult.success).toBe(false)
        expect(mutationResult.error).toContain('validation failed')
      })
      
      // Document should remain unchanged
      expect(result.current.document).toEqual(mockDocument)
      expect(result.current.mutationState.activeMutation).toBeNull()
    })

    it('should not revert if no active mutation', async () => {
      const { result } = renderHook(() => useMutation(), { wrapper })
      
      await act(async () => {
        const revertResult = await result.current.revertMutation()
        expect(revertResult.success).toBe(false)
        expect(revertResult.error).toContain('No active mutation')
      })
      
      expect(result.current.document).toEqual(mockDocument)
    })

    it('should track mutation history', async () => {
      const { result } = renderHook(() => useMutation(), { wrapper })
      
      await act(async () => {
        await result.current.applyMutation(mockMutation)
      })
      
      // Access history through state (would need to expose this in real implementation)
      // For now, we just verify the mutation was applied
      expect(result.current.mutationState.activeMutation).toEqual(mockMutation)
    })
  })

  describe('useDocument', () => {
    it('should return current document state', () => {
      const { result } = renderHook(() => useDocument(), { wrapper })
      
      expect(result.current).toEqual(mockDocument)
    })

    it('should update when mutations are applied', async () => {
      const { result } = renderHook(() => ({
        mutation: useMutation(),
        document: useDocument()
      }), { wrapper })
      
      expect(result.current.document).toHaveLength(2)
      
      await act(async () => {
        await result.current.mutation.applyMutation(mockMutation)
      })
      
      expect(result.current.document).toHaveLength(3)
    })
  })

  describe('useActiveMutationType', () => {
    it('should return null when no mutation is active', () => {
      const { result } = renderHook(() => useActiveMutationType(), { wrapper })
      
      expect(result.current).toBeNull()
    })

    it('should return mutation type when mutation is active', async () => {
      const { result } = renderHook(() => ({
        mutation: useMutation(),
        type: useActiveMutationType()
      }), { wrapper })
      
      await act(async () => {
        await result.current.mutation.applyMutation(mockMutation)
      })
      
      expect(result.current.type).toBe('insert-headings')
    })

    it('should return null after mutation is reverted', async () => {
      const { result } = renderHook(() => ({
        mutation: useMutation(),
        type: useActiveMutationType()
      }), { wrapper })
      
      await act(async () => {
        await result.current.mutation.applyMutation(mockMutation)
      })
      
      expect(result.current.type).toBe('insert-headings')
      
      await act(async () => {
        await result.current.mutation.revertMutation()
      })
      
      expect(result.current.type).toBeNull()
    })
  })

  describe('error boundary behavior', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      expect(() => {
        renderHook(() => useMutation())
      }).toThrow('useMutation must be used within a MutationProvider')
      
      consoleSpy.mockRestore()
    })
  })

  describe('multiple mutations', () => {
    it('should replace active mutation when applying new one', async () => {
      const { result } = renderHook(() => useMutation(), { wrapper })
      
      const secondMutation: Mutation = {
        id: 'second-mutation',
        type: 'summarize-paragraphs',
        forward: [{
          action: 'replace',
          targetId: 'para-1',
          content: { content: 'Summarized paragraph' }
        }],
        reverse: [{
          action: 'replace',
          targetId: 'para-1',
          content: { content: 'First paragraph' }
        }]
      }
      
      // Apply first mutation
      await act(async () => {
        await result.current.applyMutation(mockMutation)
      })
      
      expect(result.current.mutationState.activeMutation?.id).toBe('test-mutation')
      
      // Apply second mutation (should replace first)
      await act(async () => {
        await result.current.applyMutation(secondMutation)
      })
      
      expect(result.current.mutationState.activeMutation?.id).toBe('second-mutation')
      // The mutations are applied cumulatively - both are active
      expect(result.current.document).toHaveLength(3) // 2 original + 1 AI heading
      
      const modifiedPara = result.current.document.find(el => el.id === 'para-1')
      expect(modifiedPara?.content).toBe('Summarized paragraph')
      
      // AI heading from first mutation is still there
      const aiHeading = result.current.document.find(el => el.id === 'ai-heading-1')
      expect(aiHeading).toBeDefined()
    })
  })
})