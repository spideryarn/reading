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

/**
 * Generate a safe filename for storing HTML content based on URL
 * Follows the pattern: {domain-name-and-path-slugified}.html
 * 
 * @param url - The source URL to generate filename from
 * @returns Safe filename for HTML storage
 * 
 * @example
 * generateHtmlFilename('https://arxiv.org/abs/2024.12345')
 * // Returns: 'arxiv-org-abs-2024-12345.html'
 * 
 * generateHtmlFilename('https://ieeexplore.ieee.org/document/9876543')
 * // Returns: 'ieeexplore-ieee-org-document-9876543.html'
 */
export function generateHtmlFilename(url: string): string {
  try {
    const urlObj = new URL(url)
    
    // Combine hostname and pathname, remove leading slash
    const fullPath = urlObj.hostname + urlObj.pathname
    
    // Remove common file extensions and clean up the path
    const cleanPath = fullPath
      .replace(/\.(html|htm|php|aspx?)$/i, '') // Remove web extensions
      .replace(/\/$/, '') // Remove trailing slash
    
    // Generate slug and ensure it's not too long (max 200 chars for filesystem compatibility)
    const slugified = generateSlug(cleanPath)
    const truncated = slugified.length > 200 ? slugified.substring(0, 200) : slugified
    
    return `${truncated}.html`
  } catch (error) {
    // Fallback for invalid URLs - use a generic filename with timestamp
    console.warn('Failed to parse URL for filename generation:', url, error)
    const timestamp = Date.now()
    return `webpage-${timestamp}.html`
  }
}