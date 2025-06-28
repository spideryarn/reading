import { Mutation, DocumentTransform } from '../types/mutation'
import { generateContentBasedId } from './deterministicId'

interface AIHeading {
  insertNewBeforeExistingId: string
  html: string
}

interface HeadingMutationOptions {
  headings: AIHeading[]
  documentId: string
  mutationId?: string
  isRegeneration?: boolean  // Flag to indicate this is a regeneration, not initial generation
}

/**
 * Generate a mutation that inserts AI-generated headings into a document.
 * Creates both forward transforms (insertions) and reverse transforms (removals).
 * Implements precedence-based ordering to ensure correct positioning when multiple headings target the same insertion point.
 * 
 * Uses insert-before semantics where headings appear before the content they introduce,
 * following industry standards from Google Docs, Word, and Notion. When multiple headings
 * target the same insertion point, they appear in logical order (H2 → H3 → H4 → target).
 * 
 * @param options Configuration object containing headings array, document ID, and optional mutation ID
 * @param options.headings Array of AI-generated heading objects with insertNewBeforeExistingId and html
 * @param options.documentId Unique identifier for the document being modified
 * @param options.mutationId Optional unique identifier for this mutation (auto-generated if not provided)
 * @param options.isRegeneration Optional flag indicating this is a regeneration of existing headings
 * @returns Mutation object with forward/reverse transforms for inserting/removing headings
 * @throws Error if heading HTML format is invalid or ID collision is detected
 */
export function generateHeadingMutation(options: HeadingMutationOptions): Mutation {
  const { headings, documentId, mutationId, isRegeneration = false } = options
  
  console.log(`[HeadingMutation] Starting generation for ${headings.length} headings`, {
    documentId,
    mutationId,
    isRegeneration,
    headingTitles: headings.map(h => h.html.match(/>([^<]+)</)?.[1] || 'Unknown')
  })
  
  // Track generated IDs to ensure uniqueness
  const headingIds = new Map<number, string>()
  const existingIds = new Set<string>()
  
  // Group headings by insertion point for precedence sorting
  const insertionGroups = new Map<string, number[]>()
  headings.forEach((heading, index) => {
    const targetId = heading.insertNewBeforeExistingId
    if (!insertionGroups.has(targetId)) {
      insertionGroups.set(targetId, [])
    }
    insertionGroups.get(targetId)!.push(index)
  })
  
  // Log grouping results for debugging
  console.log(`[HeadingMutation] Grouped headings by insertion point:`, {
    totalGroups: insertionGroups.size,
    groupDetails: Array.from(insertionGroups.entries()).map(([targetId, indexes]) => ({
      targetId,
      headingCount: indexes.length,
      headingTitles: indexes.map(i => headings[i]!.html.match(/>([^<]+)</)?.[1] || 'Unknown'),
      multipleHeadings: indexes.length > 1
    }))
  })
  
  // Create forward transforms (insertions) with chaining for grouped headings
  const forward: DocumentTransform[] = []
  
  // Process each insertion group to implement chaining behavior
  for (const [targetId, groupIndexes] of insertionGroups.entries()) {
    let currentInsertionTarget = targetId
    
    // Process headings in original order for this group (no reversal needed)
    // The mutation engine will handle precedence correctly
    for (const originalIndex of groupIndexes) {
      const heading = headings[originalIndex]!
      
      // Extract heading content and level from HTML
      const match = heading.html.match(/^<h(\d)[^>]*>(.*?)<\/h\d>$/i)
      if (!match) {
        throw new Error(`Invalid heading HTML format: ${heading.html}`)
      }
      
      const level = parseInt(match[1]!)
      const content = match[2]!
      
      // Generate deterministic ID for this heading including the insertion point
      // This ensures unique IDs even when heading content is identical
      // For regenerations, add a timestamp to ensure different IDs from previous generations
      const idContent = isRegeneration 
        ? `${content}:before:${heading.insertNewBeforeExistingId}:${Date.now()}`
        : `${content}:before:${heading.insertNewBeforeExistingId}`
      
      const headingId = generateContentBasedId(
        documentId, 
        'heading', 
        idContent
      )
      
      // Check for ID collision
      if (existingIds.has(headingId)) {
        throw new Error(
          `FATAL: ID collision detected! Generated ID "${headingId}" already exists. ` +
          `This indicates a serious bug in the ID generation algorithm. ` +
          `Context: AI heading "${content}" to be inserted before element "${heading.insertNewBeforeExistingId}"`
        )
      }
      
      existingIds.add(headingId)
      headingIds.set(originalIndex, headingId)
      
      // Use chaining approach: subsequent headings target the previous heading's ID
      const positionInGroup = groupIndexes.indexOf(originalIndex)
      const groupPosition = positionInGroup === 0 ? 'first-in-group' : 'chained-to-previous'
      
      console.log(`[HeadingMutation] Group position for heading ${originalIndex}:`, {
        headingContent: content,
        headingLevel: level,
        originalTarget: heading.insertNewBeforeExistingId,
        actualTarget: currentInsertionTarget,
        positionInGroup: positionInGroup + 1,
        totalInGroup: groupIndexes.length,
        groupPosition,
        generatedId: headingId
      })
      
      const transform = {
        action: 'insert' as const,
        insertNewBeforeExistingId: currentInsertionTarget,
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
      
      forward.push(transform)
      
      // Update target for next heading in this group to create chaining
      currentInsertionTarget = headingId
    }
  }
  
  // Create reverse transforms (removals)
  const reverse: DocumentTransform[] = Array.from(headingIds.values()).map(headingId => ({
    action: 'remove' as const,
    targetId: headingId
  }))
  
  const mutation = {
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
  
  console.log(`[HeadingMutation] Generation completed:`, {
    mutationId: mutation.id,
    totalHeadings: headings.length,
    totalTransforms: forward.length,
    insertionGroupsCount: insertionGroups.size,
    groupedHeadingsCount: Array.from(insertionGroups.values()).reduce((sum, group) => sum + Math.max(0, group.length - 1), 0)
  })
  
  return mutation
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