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