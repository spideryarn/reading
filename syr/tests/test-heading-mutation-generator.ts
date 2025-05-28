import { generateHeadingMutation, extractHeadingsFromMutation } from '../lib/services/heading-mutation-generator'

// Test data
const testHeadings = [
  {
    id_of_after: 'para-123',
    html: '<h2>Introduction to Testing</h2>'
  },
  {
    id_of_after: 'para-456',
    html: '<h3>Unit Testing Basics</h3>'
  },
  {
    id_of_after: 'para-789',
    html: '<h2>Advanced Concepts</h2>'
  }
]

describe('HeadingMutationGenerator', () => {
  it('should create valid forward transforms', () => {
    const mutation = generateHeadingMutation({
      headings: testHeadings,
      documentId: 'test-doc-1'
    })
    
    expect(mutation.type).toBe('insert-headings')
    expect(mutation.forward.length).toBe(3)
    
    // Check first transform
    const firstTransform = mutation.forward[0]
    expect(firstTransform.action).toBe('insert')
    expect(firstTransform.afterId).toBe('para-123')
    expect(firstTransform.content?.tag_name).toBe('h2')
    expect(firstTransform.content?.content).toBe('Introduction to Testing')
    expect(firstTransform.content?.attributes?.['data-ai-generated']).toBe('true')
  })

  it('should create valid reverse transforms', () => {
    const mutation = generateHeadingMutation({
      headings: testHeadings,
      documentId: 'test-doc-1'
    })
    
    expect(mutation.reverse.length).toBe(3)
    
    // All reverse transforms should be removals
    mutation.reverse.forEach(transform => {
      expect(transform.action).toBe('remove')
      expect(typeof transform.targetId).toBe('string')
      expect(transform.targetId!.length).toBeGreaterThan(0)
    })
  })

  it('should include proper metadata', () => {
    const mutation = generateHeadingMutation({
      headings: testHeadings,
      documentId: 'test-doc-1'
    })
    
    expect(mutation.metadata?.description).toBe('AI-generated semantic headings')
    expect(mutation.metadata?.generatedHeadingCount).toBe(3)
    expect(typeof mutation.metadata?.timestamp).toBe('number')
  })

  it('should extract headings in correct format', () => {
    const mutation = generateHeadingMutation({
      headings: testHeadings,
      documentId: 'test-doc-1'
    })
    
    const extracted = extractHeadingsFromMutation(mutation)
    
    expect(extracted.length).toBe(3)
    expect(extracted[0].text).toBe('Introduction to Testing')
    expect(extracted[0].level).toBe(2)
    expect(extracted[1].text).toBe('Unit Testing Basics')
    expect(extracted[1].level).toBe(3)
    expect(extracted[2].text).toBe('Advanced Concepts')
    expect(extracted[2].level).toBe(2)
  })

  it('should use custom mutation ID when provided', () => {
    const mutation = generateHeadingMutation({
      headings: testHeadings,
      documentId: 'test-doc-1',
      mutationId: 'custom-mutation-123'
    })
    
    expect(mutation.id).toBe('custom-mutation-123')
  })

  it('should throw error for invalid heading HTML', () => {
    expect(() => {
      generateHeadingMutation({
        headings: [{
          id_of_after: 'para-123',
          html: '<p>Not a heading</p>'  // Invalid - not a heading tag
        }],
        documentId: 'test-doc-1'
      })
    }).toThrow('Invalid heading HTML format')
  })

  it('should handle non-heading mutations gracefully', () => {
    const nonHeadingMutation = {
      id: 'test-1',
      type: 'summarize-paragraphs',
      forward: [],
      reverse: []
    }
    
    const extracted = extractHeadingsFromMutation(nonHeadingMutation)
    expect(extracted.length).toBe(0)
  })
})