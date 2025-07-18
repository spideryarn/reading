import path from 'node:path/posix'
import { load } from 'cheerio'
import { sanitizeDocumentTitle } from '@/lib/utils/document-title'

/**
 * Derive a human-friendly title for a remote resource identified by `url`.
 *
 * Priority:
 *   1. `providedTitle` if specified by the caller
 *   2. <title> text found in `htmlContent` (if supplied)
 *   3. First <h1> text in `htmlContent`
 *   4. "{domain-with-dashes}-{file-stem}" (e.g. "www-sas-upenn-edu-nagel-bat")
 *   5. "Document from {domain}"
 */
export function deriveTitleFromUrl (
  url: string,
  {
    providedTitle,
    htmlContent,
  }: { providedTitle?: string; htmlContent?: string } = {}
): string {
  // 1. explicit override ----------------------------------------------------
  if (providedTitle && providedTitle.trim()) {
    return sanitizeDocumentTitle(providedTitle)
  }

  // 2 & 3. attempt to scrape HTML if available ------------------------------
  if (htmlContent) {
    const $ = load(htmlContent)

    const htmlTitle = $('title').first().text().trim()
    if (htmlTitle) {
      return sanitizeDocumentTitle(htmlTitle)
    }

    const h1 = $('h1').first().text().trim()
    if (h1) {
      return sanitizeDocumentTitle(h1)
    }
  }

  // 4. build from domain + pathname ----------------------------------------
  const u = new URL(url)
  const domainPart = u.hostname.replace(/\./g, '-') // dots → dashes

  const stem = path.parse(u.pathname).name // empty string if no filename
  if (stem) {
    return sanitizeDocumentTitle(`${domainPart}-${stem}`)
  }

  // 5. final fallback -------------------------------------------------------
  return sanitizeDocumentTitle(`Document from ${u.hostname}`)
}

/**
 * Derive a title from a file that the user uploaded from disk.
 * If the caller supplies an explicit title, that value wins.
 * Otherwise we use the file-stem (filename without extension).
 */
export function deriveTitleFromFilename (
  filename: string,
  providedTitle?: string
): string {
  if (providedTitle && providedTitle.trim()) {
    return sanitizeDocumentTitle(providedTitle)
  }

  const stem = path.parse(filename).name
  if (stem) {
    return sanitizeDocumentTitle(stem)
  }

  return 'Untitled Document'
} 