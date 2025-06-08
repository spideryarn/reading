/**
 * Normalize semantic search query for consistent caching
 * Only trims leading/trailing whitespace - preserves case and punctuation
 * @param query - The raw query string from user input
 * @returns The normalized query string
 */
export function normalizeSemanticSearchQuery(query: string): string {
  return query.trim()
}