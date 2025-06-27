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
 * Implements chaining logic to ensure correct ordering when multiple headings target the same insertion point.
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
  
  // Group headings by insertion point for chaining logic
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
      chainingRequired: indexes.length > 1
    }))
  })
  
  // Create forward transforms (insertions) with chaining logic
  const forward: DocumentTransform[] = headings.map((heading, index) => {
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
    headingIds.set(index, headingId)
    
    // Determine the actual insertion target for chaining
    const groupIndexes = insertionGroups.get(heading.insertNewBeforeExistingId)!
    const positionInGroup = groupIndexes.indexOf(index)
    
    let actualInsertionTarget: string
    let chainingAction: string
    if (positionInGroup === 0) {
      // First heading in group - insert before original target
      actualInsertionTarget = heading.insertNewBeforeExistingId
      chainingAction = 'first-in-group'
    } else {
      // Subsequent headings - chain to previous heading in same group
      const previousHeadingIndex = groupIndexes[positionInGroup - 1]!
      actualInsertionTarget = headingIds.get(previousHeadingIndex)!
      chainingAction = 'chained-to-previous'
    }
    
    console.log(`[HeadingMutation] Chaining decision for heading ${index}:`, {
      headingContent: content,
      headingLevel: level,
      originalTarget: heading.insertNewBeforeExistingId,
      actualTarget: actualInsertionTarget,
      positionInGroup: positionInGroup + 1,
      totalInGroup: groupIndexes.length,
      chainingAction,
      generatedId: headingId
    })
    
    return {
      action: 'insert' as const,
      insertNewBeforeExistingId: actualInsertionTarget,
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
    chainingGroupsCount: insertionGroups.size,
    chainedHeadingsCount: Array.from(insertionGroups.values()).reduce((sum, group) => sum + Math.max(0, group.length - 1), 0)
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