/**
 * Utility for detecting which document elements belong to a heading's section.
 * Extracted from table-of-contents.tsx tooltip feature for reusability.
 */

import type { DocumentElement } from '@/lib/types/document'

/**
 * Find all elements that belong to a heading's section.
 * A section includes all elements between the heading and the next heading of equal or higher level.
 * 
 * @param headingElement - The heading element to find the section for
 * @param allElements - All document elements, sorted by position
 * @returns Array of elements that belong to this heading's section (not including the heading itself)
 */
export function getHeadingSectionElements(
  headingElement: DocumentElement,
  allElements: DocumentElement[]
): DocumentElement[] {
  if (!headingElement.tag_name.match(/^h[1-6]$/i)) {
    throw new Error('Element must be a heading (h1-h6)')
  }

  const headingLevel = parseInt(headingElement.tag_name.substring(1))
  const headingPosition = headingElement.position
  const sectionElements: DocumentElement[] = []

  // Find all elements that belong to this heading's section
  for (let i = 0; i < allElements.length; i++) {
    const element = allElements[i]
    
    // Skip elements before this heading (including the heading itself)
    if (!element || element.position <= headingPosition) continue
    
    // Stop at next heading of equal or higher level
    if (element.tag_name.match(/^h[1-6]$/i)) {
      const elementLevel = parseInt(element.tag_name.substring(1))
      if (elementLevel <= headingLevel) {
        break
      }
    }
    
    // Include this element - even if it has no content, it's part of the structure
    sectionElements.push(element)
  }

  return sectionElements
}

/**
 * Get all elements related to a heading (the heading itself plus its section).
 * Useful for visibility tracking where we need to check both the heading and its content.
 * 
 * @param headingElement - The heading element
 * @param allElements - All document elements, sorted by position
 * @returns Array containing the heading element followed by its section elements
 */
export function getHeadingAndSectionElements(
  headingElement: DocumentElement,
  allElements: DocumentElement[]
): DocumentElement[] {
  const sectionElements = getHeadingSectionElements(headingElement, allElements)
  return [headingElement, ...sectionElements]
}

/**
 * Find the heading element that a given element belongs to.
 * Returns the nearest preceding heading of any level.
 * 
 * @param element - The element to find the parent heading for
 * @param allElements - All document elements, sorted by position
 * @returns The parent heading element, or null if the element is before any headings
 */
export function findParentHeading(
  element: DocumentElement,
  allElements: DocumentElement[]
): DocumentElement | null {
  let parentHeading: DocumentElement | null = null

  for (let i = 0; i < allElements.length; i++) {
    const candidate = allElements[i]
    if (!candidate) continue
    
    // Stop when we reach the target element
    if (candidate.position >= element.position) break
    
    // Update parent heading if this is a heading
    if (candidate.tag_name.match(/^h[1-6]$/i)) {
      parentHeading = candidate
    }
  }

  return parentHeading
}

/**
 * Get all heading elements from a document, optionally filtered by AI-generated status.
 * 
 * @param elements - All document elements
 * @param filterAiGenerated - Optional filter: true for only AI headings, false for only original, undefined for all
 * @returns Array of heading elements
 */
export function extractHeadingElements(
  elements: DocumentElement[],
  filterAiGenerated?: boolean
): DocumentElement[] {
  return elements.filter(el => {
    // Must be a heading element
    if (!el.tag_name.match(/^h[1-6]$/i)) return false
    
    // Apply AI-generated filter if specified
    if (filterAiGenerated !== undefined) {
      const isAiGenerated = el.attributes?.['data-ai-generated'] === 'true'
      return isAiGenerated === filterAiGenerated
    }
    
    return true
  })
}