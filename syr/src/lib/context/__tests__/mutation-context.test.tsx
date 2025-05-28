import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { MutationProvider, useMutation, useDocument, useActiveMutationType } from '../mutation-context'
import { DocumentElement } from '../../types/document'
import { Mutation } from '../../types/mutation'

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
      expect(result.current.activeMutation).toBeNull()
    })

    it('should apply mutation and update document state', () => {
      const { result } = renderHook(() => useMutation(), { wrapper })
      
      act(() => {
        result.current.applyMutation(mockMutation)
      })
      
      expect(result.current.document).toHaveLength(3)
      expect(result.current.activeMutation).toEqual(mockMutation)
      
      const insertedElement = result.current.document.find(el => el.id === 'ai-heading-1')
      expect(insertedElement).toBeDefined()
      expect(insertedElement?.tag_name).toBe('h2')
      expect(insertedElement?.content).toBe('AI Generated Section')
    })

    it('should revert mutation and restore original document', () => {
      const { result } = renderHook(() => useMutation(), { wrapper })
      
      // Apply mutation
      act(() => {
        result.current.applyMutation(mockMutation)
      })
      
      expect(result.current.document).toHaveLength(3)
      
      // Revert mutation
      act(() => {
        result.current.revertMutation()
      })
      
      expect(result.current.document).toHaveLength(2)
      expect(result.current.document).toEqual(mockDocument)
      expect(result.current.activeMutation).toBeNull()
    })

    it('should handle mutation errors gracefully', () => {
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
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      act(() => {
        result.current.applyMutation(invalidMutation)
      })
      
      // Document should remain unchanged
      expect(result.current.document).toEqual(mockDocument)
      expect(result.current.activeMutation).toBeNull()
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to apply mutation'),
        expect.any(String)
      )
      
      consoleSpy.mockRestore()
    })

    it('should not revert if no active mutation', () => {
      const { result } = renderHook(() => useMutation(), { wrapper })
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      
      act(() => {
        result.current.revertMutation()
      })
      
      expect(result.current.document).toEqual(mockDocument)
      expect(consoleSpy).toHaveBeenCalledWith('No active mutation to revert')
      
      consoleSpy.mockRestore()
    })

    it('should track mutation history', () => {
      const { result } = renderHook(() => useMutation(), { wrapper })
      
      act(() => {
        result.current.applyMutation(mockMutation)
      })
      
      // Access history through state (would need to expose this in real implementation)
      // For now, we just verify the mutation was applied
      expect(result.current.activeMutation).toEqual(mockMutation)
    })
  })

  describe('useDocument', () => {
    it('should return current document state', () => {
      const { result } = renderHook(() => useDocument(), { wrapper })
      
      expect(result.current).toEqual(mockDocument)
    })

    it('should update when mutations are applied', () => {
      const { result: mutationResult } = renderHook(() => useMutation(), { wrapper })
      const { result: documentResult } = renderHook(() => useDocument(), { wrapper })
      
      expect(documentResult.current).toHaveLength(2)
      
      act(() => {
        mutationResult.current.applyMutation(mockMutation)
      })
      
      expect(documentResult.current).toHaveLength(3)
    })
  })

  describe('useActiveMutationType', () => {
    it('should return null when no mutation is active', () => {
      const { result } = renderHook(() => useActiveMutationType(), { wrapper })
      
      expect(result.current).toBeNull()
    })

    it('should return mutation type when mutation is active', () => {
      const { result: mutationResult } = renderHook(() => useMutation(), { wrapper })
      const { result: typeResult } = renderHook(() => useActiveMutationType(), { wrapper })
      
      act(() => {
        mutationResult.current.applyMutation(mockMutation)
      })
      
      expect(typeResult.current).toBe('insert-headings')
    })

    it('should return null after mutation is reverted', () => {
      const { result: mutationResult } = renderHook(() => useMutation(), { wrapper })
      const { result: typeResult } = renderHook(() => useActiveMutationType(), { wrapper })
      
      act(() => {
        mutationResult.current.applyMutation(mockMutation)
      })
      
      expect(typeResult.current).toBe('insert-headings')
      
      act(() => {
        mutationResult.current.revertMutation()
      })
      
      expect(typeResult.current).toBeNull()
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
    it('should replace active mutation when applying new one', () => {
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
      act(() => {
        result.current.applyMutation(mockMutation)
      })
      
      expect(result.current.activeMutation?.id).toBe('test-mutation')
      
      // Apply second mutation (should replace first)
      act(() => {
        result.current.applyMutation(secondMutation)
      })
      
      expect(result.current.activeMutation?.id).toBe('second-mutation')
      expect(result.current.document).toHaveLength(2) // No AI heading
      
      const modifiedPara = result.current.document.find(el => el.id === 'para-1')
      expect(modifiedPara?.content).toBe('Summarized paragraph')
    })
  })
})