import { v5 as uuidv5 } from 'uuid';
import { load, type CheerioAPI } from 'cheerio';
import type { Element } from 'domhandler';

// Fixed namespace for Spideryarn Reading app
const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

/**
 * Validates that an ID is unique within the existing set of IDs.
 * Throws a fatal error if a collision is detected.
 * 
 * @param id - The ID to validate
 * @param existingIds - Set of already-used IDs
 * @param context - Additional context for error messages (e.g., element path, type)
 * @throws Error if ID already exists
 */
function validateIdUniqueness(id: string, existingIds: Set<string>, context: string): void {
  if (existingIds.has(id)) {
    throw new Error(
      `FATAL: ID collision detected! Generated ID "${id}" already exists. ` +
      `This indicates a serious bug in the ID generation algorithm. ` +
      `Context: ${context}`
    );
  }
  existingIds.add(id);
}

/**
 * Generate a deterministic 8-character ID for an HTML element
 * based on its position in the DOM tree, tag, attributes, and content.
 * 
 * This position-based approach ensures stable IDs that only change when
 * the document structure changes significantly.
 * 
 * @returns 8-character ID (without 'syr-' prefix)
 */
function generatePositionBasedId(
  element: Element,
  $: CheerioAPI,
  index: number,
  parentPath: string = ''
): string {
  // Build hierarchical path
  const tagName = element.name.toLowerCase();
  const path = `${parentPath}/${tagName}[${index}]`;
  
  // Extract key attributes for fingerprinting
  const $el = $(element);
  const className = $el.attr('class') || '';
  const dataAttrs = Object.entries(element.attribs || {})
    .filter(([key]) => key.startsWith('data-'))
    .map(([key, value]) => `${key}=${value}`)
    .join(',');
  const role = $el.attr('role') || '';
  const type = $el.attr('type') || '';
  
  // Get text content (first 100 chars, trimmed)
  const textContent = $el.text().trim().substring(0, 100);
  
  // Create fingerprint
  const fingerprint = [
    path,
    className,
    dataAttrs,
    role,
    type,
    textContent
  ].filter(Boolean).join('|');
  
  // Generate UUID v5 and take first 8 chars
  const uuid = uuidv5(fingerprint, NAMESPACE);
  return uuid.substring(0, 8);
}

/**
 * Process an element and all its children recursively,
 * assigning deterministic IDs with uniqueness validation
 */
function processElement(
  element: Element,
  $: CheerioAPI,
  parentPath: string = '',
  existingIds: Set<string> = new Set()
): void {
  if (element.type !== 'tag') return;
  
  const children = $(element).children().toArray();
  
  children.forEach((child: Element, index: number) => {
    if (child.type !== 'tag') return;
    
    const id = generatePositionBasedId(child, $, index, parentPath);
    const fullId = `syr-${id}`;
    
    // Validate uniqueness
    const elementPath = `${parentPath}/${child.name.toLowerCase()}[${index}]`;
    validateIdUniqueness(fullId, existingIds, `Element: <${child.name}> at path "${elementPath}"`);
    
    $(child).attr('id', fullId);
    
    // Recurse into children
    processElement(child, $, elementPath, existingIds);
  });
}

/**
 * Assign deterministic IDs to all elements in an HTML document body
 * @param html - The HTML string to process
 * @returns The processed HTML with IDs assigned
 */
export function assignDeterministicIds(html: string): string {
  // Load HTML with Cheerio (automatically handles malformed HTML)
  const $ = load(html, {
    xml: false, // Use HTML mode for better malformed HTML handling
  });
  
  // Process all elements in body
  const body = $('body')[0];
  if (body) {
    const existingIds = new Set<string>();
    processElement(body, $, '', existingIds);
  }
  
  return $.html();
}

/**
 * Get the body content with deterministic IDs
 * Useful for testing - returns just the body HTML
 */
export function getBodyWithIds(html: string): string {
  const $ = load(html, {
    xml: false
  });
  
  const body = $('body')[0];
  if (body) {
    const existingIds = new Set<string>();
    processElement(body, $, '', existingIds);
    return $('body').html() || '';
  }
  
  return '';
}

/**
 * Generates a deterministic UUID v5 for dynamically-created content (e.g., AI-generated headings).
 * 
 * This content-based approach is used for elements that don't exist in the original document
 * and therefore can't use position-based IDs. The full UUID is returned (not truncated) to
 * distinguish these IDs from position-based ones, making it clear which generation method was used.
 * 
 * Unlike position-based IDs which are 8 characters, this returns the full 36-character UUID,
 * making it visually distinct and easier to identify the generation method during debugging.
 *
 * @param docId - The ID of the document
 * @param elementType - The type of the element (e.g., 'heading', 'paragraph')
 * @param textContent - The text content of the element
 * @returns A full UUID v5 string prefixed with 'syr-' (40 characters total)
 */
export function generateContentBasedId(docId: string, elementType: string, textContent: string): string {
  const inputString = `${docId}:${elementType}:${textContent}`;
  return `syr-${uuidv5(inputString, NAMESPACE)}`;
}

/**
 * Generate page-aware deterministic ID for an HTML element
 * 
 * This specialized version for vision-based PDF processing includes page context
 * to ensure IDs are unique across pages but deterministic within the same page.
 * 
 * @param element - The Cheerio element to generate ID for
 * @param $ - Cheerio instance
 * @param index - Element index within its parent
 * @param pageNumber - 1-indexed page number
 * @param parentPath - Path to parent element
 * @returns 8-character ID (without 'syr-' prefix)
 */
function generatePageAwareId(
  element: Element,
  $: CheerioAPI,
  index: number,
  pageNumber: number,
  parentPath: string = ''
): string {
  // Build hierarchical path with page context
  const tagName = element.name.toLowerCase();
  const path = `page-${pageNumber}/${parentPath}/${tagName}[${index}]`;
  
  // Extract key attributes for fingerprinting
  const $el = $(element);
  const className = $el.attr('class') || '';
  const dataAttrs = Object.entries(element.attribs || {})
    .filter(([key]) => key.startsWith('data-'))
    .map(([key, value]) => `${key}=${value}`)
    .join(',');
  const role = $el.attr('role') || '';
  const type = $el.attr('type') || '';
  
  // Get text content (first 100 chars, trimmed)
  const textContent = $el.text().trim().substring(0, 100);
  
  // Create fingerprint with page context
  const fingerprint = [
    path,
    className,
    dataAttrs,
    role,
    type,
    textContent
  ].filter(Boolean).join('|');
  
  // Generate UUID v5 and take first 8 chars
  const uuid = uuidv5(fingerprint, NAMESPACE);
  return uuid.substring(0, 8);
}

/**
 * Process page fragment HTML and assign page-aware deterministic IDs
 * 
 * This function is specifically designed for vision-based PDF processing where
 * each page fragment needs IDs that are unique across the entire document.
 * 
 * @param htmlFragment - HTML fragment from page processing
 * @param pageNumber - 1-indexed page number for context
 * @param existingIds - Set of IDs already used across all pages
 * @returns Processed HTML fragment with page-aware IDs
 */
export function assignPageAwareIds(
  htmlFragment: string,
  pageNumber: number,
  existingIds: Set<string> = new Set()
): string {
  // Load HTML fragment with Cheerio
  const $ = load(htmlFragment, {
    xml: false, // Use HTML mode for better fragment handling
  });
  
  // Process all elements in the fragment
  const processPageElement = (
    element: Element,
    parentPath: string = '',
    index: number = 0
  ): void => {
    if (element.type !== 'tag') return;
    
    const id = generatePageAwareId(element, $, index, pageNumber, parentPath);
    const fullId = `syr-${id}`;
    
    // Validate uniqueness
    const elementPath = `page-${pageNumber}/${parentPath}/${element.name.toLowerCase()}[${index}]`;
    validateIdUniqueness(fullId, existingIds, `Page ${pageNumber} Element: <${element.name}> at path "${elementPath}"`);
    
    $(element).attr('id', fullId);
    
    // Recurse into children
    const children = $(element).children().toArray();
    children.forEach((child: Element, childIndex: number) => {
      if (child.type === 'tag') {
        processPageElement(child, elementPath, childIndex);
      }
    });
  };
  
  // Process all top-level elements
  $.root().children().each((index, element) => {
    if (element.type === 'tag') {
      processPageElement(element as Element, '', index);
    }
  });
  
  return $.html();
}

/**
 * Generate cross-page reference ID for elements that span pages
 * 
 * Used for tables, figures, or sections that continue across multiple pages.
 * 
 * @param docId - Document ID for context
 * @param elementType - Type of spanning element (e.g., 'table', 'figure', 'section')
 * @param startPage - First page number where element appears
 * @param identifier - Unique identifier for the element (e.g., table caption, figure number)
 * @returns Full UUID for cross-page element
 */
export function generateCrossPageId(
  docId: string,
  elementType: string,
  startPage: number,
  identifier: string
): string {
  const inputString = `${docId}:${elementType}:page-${startPage}:${identifier}`;
  return `syr-${uuidv5(inputString, NAMESPACE)}`;
}

/**
 * Generate batch of page-aware IDs for multiple fragments
 * 
 * Processes multiple page fragments while maintaining ID uniqueness across all pages.
 * 
 * @param fragments - Array of {htmlFragment, pageNumber} objects
 * @param docId - Document ID for cross-page elements
 * @returns Array of processed HTML fragments with consistent IDs
 */
export function assignBatchPageIds(
  fragments: Array<{ htmlFragment: string; pageNumber: number }>,
  docId?: string
): Array<{ htmlFragment: string; pageNumber: number; processedHtml: string }> {
  const globalIds = new Set<string>();
  
  return fragments.map(({ htmlFragment, pageNumber }) => {
    const processedHtml = assignPageAwareIds(htmlFragment, pageNumber, globalIds);
    
    return {
      htmlFragment,
      pageNumber,
      processedHtml
    };
  });
}