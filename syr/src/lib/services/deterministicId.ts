import { v5 as uuidv5 } from 'uuid';
import { load } from 'cheerio';

// Fixed namespace for Spideryarn Reading app
const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

/**
 * Generate a deterministic 8-character ID for an HTML element
 * based on its position, tag, attributes, and content
 */
function generateElementId(
  element: cheerio.Element,
  $: cheerio.CheerioAPI,
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
 * assigning deterministic IDs
 */
function processElement(
  element: cheerio.Element,
  $: cheerio.CheerioAPI,
  parentPath: string = ''
): void {
  if (element.type !== 'tag') return;
  
  const children = $(element).children().toArray();
  
  children.forEach((child, index) => {
    if (child.type !== 'tag') return;
    
    const id = generateElementId(child, $, index, parentPath);
    $(child).attr('id', `syr-${id}`);
    
    // Recurse into children
    const newPath = `${parentPath}/${child.name.toLowerCase()}[${index}]`;
    processElement(child, $, newPath);
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
    decodeEntities: true
  });
  
  // Process all elements in body
  const body = $('body')[0];
  if (body) {
    processElement(body, $);
  }
  
  return $.html();
}

/**
 * Get the body content with deterministic IDs
 * Useful for testing - returns just the body HTML
 */
export function getBodyWithIds(html: string): string {
  const $ = load(html, {
    xml: false,
    decodeEntities: true
  });
  
  const body = $('body')[0];
  if (body) {
    processElement(body, $);
    return $('body').html() || '';
  }
  
  return '';
}