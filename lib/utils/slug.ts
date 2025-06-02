import slug from 'slug'

/**
 * Generate a URL-friendly slug from text using the `slug` library.
 * 
 * This provides consistent slug generation across the application,
 * with proper handling of Unicode characters, special characters,
 * and edge cases.
 * 
 * @param text - The text to convert to a slug
 * @returns URL-friendly slug string
 * 
 * @example
 * generateSlug('Hello World! This is a Test')
 * // Returns: 'hello-world-this-is-a-test'
 * 
 * generateSlug('Café & Restaurant München')
 * // Returns: 'cafe-restaurant-munchen'
 */
export function generateSlug(text: string): string {
  return slug(text)
}

/**
 * Find a document by matching its title against a slug.
 * Used for mapping slug-based URLs to database documents.
 * 
 * @param documents - Array of documents to search
 * @param targetSlug - The slug to match against
 * @returns Matching document or null if not found
 */
export function findDocumentBySlug<T extends { title: string }>(
  documents: T[],
  targetSlug: string
): T | null {
  return documents.find(doc => {
    const docSlug = generateSlug(doc.title)
    return docSlug === targetSlug
  }) || null
}