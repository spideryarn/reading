/**
 * Utility functions for document title validation and sanitization
 * Used consistently across document import and editing
 */

export const MAX_TITLE_LENGTH = 255

/**
 * Sanitize document title by normalizing whitespace and enforcing length limit
 * Note: We allow most special characters as they can be useful in titles
 */
export function sanitizeDocumentTitle(title: string): string {
  // Normalize whitespace
  let sanitized = title.trim()
  sanitized = sanitized.replace(/\s+/g, ' ')
  
  // Enforce maximum length
  if (sanitized.length > MAX_TITLE_LENGTH) {
    sanitized = sanitized.substring(0, MAX_TITLE_LENGTH)
  }
  
  return sanitized
}

/**
 * Validate document title
 * @returns Error message if invalid, null if valid
 */
export function validateDocumentTitle(title: string): string | null {
  if (!title || title.trim().length === 0) {
    return 'Title cannot be empty'
  }
  
  if (title.length > MAX_TITLE_LENGTH) {
    return `Title must be ${MAX_TITLE_LENGTH} characters or less`
  }
  
  // No character restrictions - allow all characters including : ? < > " * / \ |
  // These can be useful in titles like "Q: What is consciousness?" or "Part 1/3"
  
  return null
}