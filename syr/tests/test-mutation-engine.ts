import { DocumentElement } from '../lib/types/document'
import { Mutation } from '../lib/types/mutation'
import { MutationEngine } from '../lib/services/mutation-engine'

// Sample document for testing
const createTestDocument = (): DocumentElement[] => [
  {
    id: 'title-1',
    document_id: 'doc-1',
    parent_id: null,
    tag_name: 'h1',
    content: 'Test Document',
    attributes: {},
    position: 0,
    level: 0,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'para-1',
    document_id: 'doc-1',
    parent_id: null,
    tag_name: 'p',
    content: 'This is the first paragraph.',
    attributes: {},
    position: 1,
    level: 0,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'para-2',
    document_id: 'doc-1',
    parent_id: null,
    tag_name: 'p',
    content: 'This is the second paragraph.',
    attributes: { class: 'highlight' },
    position: 2,
    level: 0,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  }
]

// Test mutations
const insertHeadingMutation: Mutation = {
  id: 'mutation-1',
  type: 'insert-headings',
  forward: [
    {
      action: 'insert',
      afterId: 'para-1',
      content: {
        id: 'ai-heading-1',
        tag_name: 'h2',
        content: 'AI Generated Section'
      }
    }
  ],
  reverse: [
    {
      action: 'remove',
      targetId: 'ai-heading-1'
    }
  ],
  metadata: {
    description: 'Test AI heading insertion'
  }
}

const replaceParagraphMutation: Mutation = {
  id: 'mutation-2',
  type: 'summarize-paragraphs',
  forward: [
    {
      action: 'replace',
      targetId: 'para-2',
      content: {
        content: 'Summary: Second paragraph about highlights.',
        attributes: { class: 'summary' }
      },
      originalContent: {
        content: 'This is the second paragraph.',
        attributes: { class: 'highlight' }
      }
    }
  ],
  reverse: [
    {
      action: 'replace',
      targetId: 'para-2',
      content: {
        content: 'This is the second paragraph.',
        attributes: { class: 'highlight' }
      }
    }
  ]
}

describe('MutationEngine', () => {
  it('should add element after specified ID with insert transform', () => {
    const doc = createTestDocument()
    const result = MutationEngine.applyMutation(doc, insertHeadingMutation)
    
    expect(result.success).toBe(true)
    expect(result.document!.length).toBe(4)
    expect(result.document![2].id).toBe('ai-heading-1')
    expect(result.document![2].content).toBe('AI Generated Section')
    expect(result.changes!.inserted).toBe(1)
  })

  it('should fail insert transform with non-existent afterId', () => {
    const doc = createTestDocument()
    const badMutation: Mutation = {
      ...insertHeadingMutation,
      forward: [{
        action: 'insert',
        afterId: 'non-existent',
        content: { id: 'test', content: 'Test' }
      }]
    }
    
    const result = MutationEngine.applyMutation(doc, badMutation)
    expect(result.success).toBe(false)
    expect(result.error!).toContain('element not found')
  })

  it('should update element content with replace transform', () => {
    const doc = createTestDocument()
    const result = MutationEngine.applyMutation(doc, replaceParagraphMutation)
    
    expect(result.success).toBe(true)
    expect(result.document!.length).toBe(3)
    expect(result.document![2].content).toBe('Summary: Second paragraph about highlights.')
    expect(result.document![2].attributes.class).toBe('summary')
    expect(result.changes!.replaced).toBe(1)
  })

  it('should delete element with remove transform', () => {
    const doc = createTestDocument()
    const removeMutation: Mutation = {
      id: 'remove-1',
      type: 'test',
      forward: [{ action: 'remove', targetId: 'para-1' }],
      reverse: []
    }
    
    const result = MutationEngine.applyMutation(doc, removeMutation)
    expect(result.success).toBe(true)
    expect(result.document!.length).toBe(2)
    expect(result.document!.find(el => el.id === 'para-1')).toBeUndefined()
    expect(result.changes!.removed).toBe(1)
  })

  it('should update element attributes with modify transform', () => {
    const doc = createTestDocument()
    const modifyMutation: Mutation = {
      id: 'modify-1',
      type: 'test',
      forward: [{
        action: 'modify',
        targetId: 'para-1',
        attributes: { class: 'modified', 'data-test': 'value' }
      }],
      reverse: []
    }
    
    const result = MutationEngine.applyMutation(doc, modifyMutation)
    expect(result.success).toBe(true)
    expect(result.document![1].attributes.class).toBe('modified')
    expect(result.document![1].attributes['data-test']).toBe('value')
    expect(result.changes!.modified).toBe(1)
  })

  it('should restore original state when mutation is reverted', () => {
    const doc = createTestDocument()
    
    // Apply mutation
    const applyResult = MutationEngine.applyMutation(doc, insertHeadingMutation)
    expect(applyResult.success).toBe(true)
    expect(applyResult.document!.length).toBe(4)
    
    // Revert mutation
    const revertResult = MutationEngine.revertMutation(applyResult.document!, insertHeadingMutation)
    expect(revertResult.success).toBe(true)
    expect(revertResult.document!.length).toBe(3)
    expect(revertResult.document!.map(el => el.id)).toEqual(['title-1', 'para-1', 'para-2'])
  })

  it('should detect invalid references during validation', () => {
    const doc = createTestDocument()
    const invalidMutation: Mutation = {
      id: 'invalid-1',
      type: 'test',
      forward: [
        { action: 'insert', afterId: 'non-existent', content: { content: 'Test' } },
        { action: 'remove', targetId: 'also-non-existent' }
      ],
      reverse: []
    }
    
    const validation = MutationEngine.validateMutation(doc, invalidMutation)
    expect(validation.valid).toBe(false)
    expect(validation.errors.length).toBe(2)
  })

  it('should apply complex mutation sequence correctly', () => {
    const doc = createTestDocument()
    const complexMutation: Mutation = {
      id: 'complex-1',
      type: 'test',
      forward: [
        { action: 'insert', afterId: 'title-1', content: { id: 'new-1', content: 'New paragraph' } },
        { action: 'modify', targetId: 'para-1', attributes: { class: 'updated' } },
        { action: 'replace', targetId: 'para-2', content: { content: 'Replaced content' } }
      ],
      reverse: []
    }
    
    const result = MutationEngine.applyMutation(doc, complexMutation)
    expect(result.success).toBe(true)
    expect(result.document!.length).toBe(4)
    expect(result.document![1].id).toBe('new-1')
    expect(result.document![2].attributes.class).toBe('updated')
    expect(result.document![3].content).toBe('Replaced content')
  })
})