import { Mutation, DocumentTransform } from '../types/mutation'
import { generateContentBasedId } from './deterministicId'

interface AIHeading {
  id_of_after: string
  html: string
}

interface HeadingMutationOptions {
  headings: AIHeading[]
  documentId: string
  mutationId?: string
}

/**
 * Generate a mutation that inserts AI-generated headings into a document.
 * Creates both forward transforms (insertions) and reverse transforms (removals).
 */
export function generateHeadingMutation(options: HeadingMutationOptions): Mutation {
  const { headings, documentId, mutationId } = options
  
  // Track generated IDs to ensure uniqueness
  const headingIds = new Map<number, string>()
  const existingIds = new Set<string>()
  
  // Create forward transforms (insertions)
  const forward: DocumentTransform[] = headings.map((heading, index) => {
    // Extract heading content and level from HTML
    const match = heading.html.match(/^<h(\d)[^>]*>(.*?)<\/h\d>$/i)
    if (!match) {
      throw new Error(`Invalid heading HTML format: ${heading.html}`)
    }
    
    const level = parseInt(match[1])
    const content = match[2]
    
    // Generate deterministic ID for this heading including the insertion point
    // This ensures unique IDs even when heading content is identical
    const headingId = generateContentBasedId(
      documentId, 
      'heading', 
      `${content}:after:${heading.id_of_after}`
    )
    
    // Check for ID collision
    if (existingIds.has(headingId)) {
      throw new Error(
        `FATAL: ID collision detected! Generated ID "${headingId}" already exists. ` +
        `This indicates a serious bug in the ID generation algorithm. ` +
        `Context: AI heading "${content}" to be inserted after element "${heading.id_of_after}"`
      )
    }
    
    existingIds.add(headingId)
    headingIds.set(index, headingId)
    
    return {
      action: 'insert' as const,
      afterId: heading.id_of_after,
      content: {
        id: headingId,
        tag_name: `h${level}`,
        content: content,
        attributes: {
          'data-ai-generated': 'true',
          'data-mutation-id': mutationId || `heading-mutation-${Date.now()}`
        }
      }
    }
  })
  
  // Create reverse transforms (removals)
  const reverse: DocumentTransform[] = Array.from(headingIds.values()).map(headingId => ({
    action: 'remove' as const,
    targetId: headingId
  }))
  
  return {
    id: mutationId || `ai-headings-${Date.now()}`,
    type: 'insert-headings',
    forward,
    reverse,
    metadata: {
      description: 'AI-generated semantic headings',
      generatedHeadingCount: headings.length,
      timestamp: Date.now()
    }
  }
}

/**
 * Extract heading information from a mutation for UI display.
 * Useful for rendering AI headings in the table of contents.
 */
export function extractHeadingsFromMutation(mutation: Mutation): Array<{
  id: string
  text: string
  level: number
}> {
  if (mutation.type !== 'insert-headings') {
    return []
  }
  
  return mutation.forward
    .filter(transform => transform.action === 'insert' && transform.content)
    .map(transform => {
      const content = transform.content!
      const level = parseInt(content.tag_name?.substring(1) || '1')
      
      return {
        id: content.id || '',
        text: content.content || '',
        level
      }
    })
}