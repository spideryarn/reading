/**
 * Test utilities for generating unique document slugs
 * 
 * Provides functions to ensure unique slugs in test environments,
 * preventing database constraint violations during parallel test execution.
 */

/**
 * Generate a unique slug suffix using timestamp and random digits
 * 
 * Format: {timestamp}-{random}
 * Example: "1736184562345-a7b3c"
 * 
 * @returns A unique suffix string for appending to test slugs
 */
export function generateUniqueSlugSuffix(): string {
  const timestamp = Date.now()
  const randomPart = Math.random().toString(36).substring(2, 7) // 5 random alphanumeric chars
  return `${timestamp}-${randomPart}`
}

/**
 * Create a unique test slug by appending timestamp and random suffix
 * 
 * @param baseSlug - The base slug to make unique
 * @returns A unique slug suitable for test documents
 * 
 * @example
 * createUniqueTestSlug('test-document')
 * // Returns: 'test-document-1736184562345-a7b3c'
 */
export function createUniqueTestSlug(baseSlug: string): string {
  return `${baseSlug}-${generateUniqueSlugSuffix()}`
}

/**
 * Create a unique test document title that will generate a unique slug
 * 
 * @param baseTitle - The base title to make unique
 * @returns A unique title suitable for test documents
 * 
 * @example
 * createUniqueTestTitle('Test Document')
 * // Returns: 'Test Document (1736184562345-a7b3c)'
 */
export function createUniqueTestTitle(baseTitle: string): string {
  return `${baseTitle} (${generateUniqueSlugSuffix()})`
}