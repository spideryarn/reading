/**
 * Image Filename Generation Utility
 * 
 * Generates descriptive, filename-safe names for extracted image assets
 * using a hierarchical fallback strategy: AI captions → alt-text → deterministic UUIDs.
 * 
 * Part of the vision-based PDF processing pipeline Stage 2.
 */

import { z } from 'zod'
import { v5 as uuidv5 } from 'uuid'
import type { BoundingBox } from '@/lib/services/html-fragment-processor'

// Fixed namespace for filename generation (same as deterministic ID system)
const FILENAME_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'

// Schema for filename generation input
export const filenameGenerationInputSchema = z.object({
  aiCaption: z.string().optional().describe('AI-generated caption from image analysis'),
  altText: z.string().optional().describe('Existing alt text from HTML element'),
  pageNumber: z.number().int().min(1).describe('1-indexed page number'),
  boundingBox: z.object({
    x1: z.number().min(0).max(1),
    y1: z.number().min(0).max(1),
    x2: z.number().min(0).max(1),
    y2: z.number().min(0).max(1)
  }).describe('Normalized bounding box coordinates'),
  elementId: z.string().optional().describe('HTML element ID if available'),
  imageFormat: z.enum(['png', 'jpeg', 'jpg']).default('png').describe('Image file format'),
  maxLength: z.number().int().min(10).max(100).default(50).describe('Maximum filename length (excluding extension)')
})

// Schema for filename generation result
export const filenameGenerationResultSchema = z.object({
  filename: z.string().min(1).describe('Generated filename with extension'),
  source: z.enum(['ai_caption', 'alt_text', 'deterministic_uuid']).describe('Source of filename'),
  originalText: z.string().optional().describe('Original text before slugification'),
  conflictResolution: z.object({
    hadConflict: z.boolean(),
    suffix: z.string().optional()
  }).describe('Conflict resolution details')
})

export type FilenameGenerationInput = z.infer<typeof filenameGenerationInputSchema>
export type FilenameGenerationResult = z.infer<typeof filenameGenerationResultSchema>

/**
 * Error thrown when filename generation fails
 */
export class FilenameGenerationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FilenameGenerationError'
  }
}

/**
 * Convert text to filename-safe slug
 * 
 * @param text - Input text to convert
 * @param maxLength - Maximum length of the slug
 * @returns Filename-safe slug
 */
function textToSlug(text: string, maxLength: number = 50): string {
  if (!text || text.trim().length === 0) {
    return ''
  }
  
  return text
    .trim()
    .toLowerCase()
    // Replace non-alphanumeric characters with hyphens
    .replace(/[^a-z0-9]+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Collapse multiple hyphens
    .replace(/-+/g, '-')
    // Truncate to max length
    .substring(0, maxLength)
    // Remove trailing hyphen if truncation created one
    .replace(/-$/, '')
}

/**
 * Extract meaningful parts from AI caption
 * 
 * @param caption - AI-generated caption
 * @returns Processed caption optimized for filenames
 */
function processAICaption(caption: string): string {
  if (!caption || caption.trim().length === 0) {
    return ''
  }
  
  // Remove common prefix patterns
  let processed = caption
    .replace(/^(figure|table|chart|graph|diagram|image|equation|photo)\s*\d*:?\s*/i, '')
    .replace(/^(fig|tab|eq)\s*\.?\s*\d*:?\s*/i, '')
    .trim()
  
  // If removal left us with too little, use the original
  if (processed.length < 5) {
    processed = caption.trim()
  }
  
  return processed
}

/**
 * Generate deterministic UUID-based filename
 * 
 * @param pageNumber - Page number
 * @param boundingBox - Bounding box coordinates
 * @param elementId - Optional element ID for additional uniqueness
 * @returns Deterministic UUID-based filename (without extension)
 */
function generateDeterministicFilename(
  pageNumber: number,
  boundingBox: BoundingBox,
  elementId?: string
): string {
  // Create unique fingerprint from page and bounding box
  const fingerprint = [
    `page-${pageNumber}`,
    `bbox-${boundingBox.x1.toFixed(3)}-${boundingBox.y1.toFixed(3)}-${boundingBox.x2.toFixed(3)}-${boundingBox.y2.toFixed(3)}`,
    elementId ? `element-${elementId}` : ''
  ].filter(Boolean).join('|')
  
  // Generate UUID v5 and use first 8 characters for readability
  const uuid = uuidv5(fingerprint, FILENAME_NAMESPACE)
  return `img-${uuid.substring(0, 8)}`
}

/**
 * Resolve filename conflicts by adding numeric suffix
 * 
 * @param baseFilename - Base filename (without extension)
 * @param extension - File extension (with dot)
 * @param existingFilenames - Set of already-used filenames
 * @returns Conflict-free filename with resolution details
 */
function resolveFilenameConflict(
  baseFilename: string,
  extension: string,
  existingFilenames: Set<string>
): { filename: string; hadConflict: boolean; suffix?: string } {
  const fullFilename = `${baseFilename}${extension}`
  
  // Check if original filename is available
  if (!existingFilenames.has(fullFilename)) {
    return { filename: fullFilename, hadConflict: false }
  }
  
  // Try numeric suffixes
  for (let i = 2; i <= 999; i++) {
    const suffix = `-${i}`
    const conflictFilename = `${baseFilename}${suffix}${extension}`
    
    if (!existingFilenames.has(conflictFilename)) {
      return { 
        filename: conflictFilename, 
        hadConflict: true, 
        suffix: suffix 
      }
    }
  }
  
  // If we can't resolve the conflict, throw an error
  throw new FilenameGenerationError(`Unable to resolve filename conflict for: ${baseFilename}${extension}`)
}

/**
 * Generate filename for image asset using hierarchical fallback strategy
 * 
 * @param input - Filename generation parameters
 * @param existingFilenames - Set of already-used filenames for conflict detection
 * @returns Promise resolving to generated filename with metadata
 */
export function generateImageFilename(
  input: FilenameGenerationInput,
  existingFilenames: Set<string> = new Set()
): FilenameGenerationResult {
  // Validate input
  const validatedInput = filenameGenerationInputSchema.parse(input)
  
  const extension = validatedInput.imageFormat === 'jpeg' ? '.jpg' : `.${validatedInput.imageFormat}`
  let baseFilename = ''
  let source: FilenameGenerationResult['source'] = 'deterministic_uuid' // Default fallback
  let originalText: string | undefined
  
  // Strategy 1: Try AI-generated caption
  if (validatedInput.aiCaption && validatedInput.aiCaption.trim().length > 0) {
    const processedCaption = processAICaption(validatedInput.aiCaption)
    const slug = textToSlug(processedCaption, validatedInput.maxLength)
    
    if (slug.length >= 5) { // Minimum viable filename length
      baseFilename = slug
      source = 'ai_caption'
      originalText = validatedInput.aiCaption
    }
  }
  
  // Strategy 2: Fall back to alt text
  if (!baseFilename && validatedInput.altText && validatedInput.altText.trim().length > 0) {
    const slug = textToSlug(validatedInput.altText, validatedInput.maxLength)
    
    if (slug.length >= 5) {
      baseFilename = slug
      source = 'alt_text'
      originalText = validatedInput.altText
    }
  }
  
  // Strategy 3: Fall back to deterministic UUID
  if (!baseFilename) {
    baseFilename = generateDeterministicFilename(
      validatedInput.pageNumber,
      validatedInput.boundingBox,
      validatedInput.elementId
    )
    source = 'deterministic_uuid'
    originalText = undefined
  }
  
  // Resolve any filename conflicts
  const { filename, hadConflict, suffix } = resolveFilenameConflict(
    baseFilename,
    extension,
    existingFilenames
  )
  
  // Add to existing filenames set to prevent future conflicts
  existingFilenames.add(filename)
  
  return filenameGenerationResultSchema.parse({
    filename,
    source,
    originalText,
    conflictResolution: {
      hadConflict,
      suffix
    }
  })
}

/**
 * Generate filenames for multiple images in batch
 * 
 * @param inputs - Array of filename generation inputs
 * @param existingFilenames - Set of already-used filenames
 * @returns Array of generated filenames with metadata
 */
export function generateBatchFilenames(
  inputs: FilenameGenerationInput[],
  existingFilenames: Set<string> = new Set()
): FilenameGenerationResult[] {
  const results: FilenameGenerationResult[] = []
  const workingSet = new Set(existingFilenames)
  
  for (const input of inputs) {
    try {
      const result = generateImageFilename(input, workingSet)
      results.push(result)
    } catch (error) {
      // Per coding principles: fail fast for any individual failure
      throw new FilenameGenerationError(
        `Batch filename generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
  
  return results
}

/**
 * Validate filename for filesystem compatibility
 * 
 * @param filename - Filename to validate
 * @returns Validation result with any issues
 */
export function validateFilename(filename: string): { valid: boolean; issues: string[] } {
  const issues: string[] = []
  
  // Check basic requirements
  if (!filename || filename.trim().length === 0) {
    issues.push('Filename cannot be empty')
    return { valid: false, issues }
  }
  
  // Check length
  if (filename.length > 255) {
    issues.push('Filename too long (max 255 characters)')
  }
  
  // Check for invalid characters (common across filesystems)
  const invalidChars = /[<>:"/\\|?*\x00-\x1f]/
  if (invalidChars.test(filename)) {
    issues.push('Filename contains invalid characters')
  }
  
  // Check for reserved names (Windows)
  const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i
  if (reservedNames.test(filename)) {
    issues.push('Filename uses reserved system name')
  }
  
  // Check for leading/trailing spaces or dots
  if (filename.startsWith(' ') || filename.endsWith(' ') || filename.startsWith('.') || filename.endsWith('.')) {
    issues.push('Filename cannot start or end with spaces or dots')
  }
  
  return {
    valid: issues.length === 0,
    issues
  }
}

/**
 * Sanitize filename to ensure filesystem compatibility
 * 
 * @param filename - Filename to sanitize
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || filename.trim().length === 0) {
    return 'unnamed-image.png'
  }
  
  return filename
    // Remove invalid characters
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '-')
    // Handle reserved names by adding prefix
    .replace(/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i, 'file-$1$2')
    // Remove leading/trailing spaces and dots
    .replace(/^[\s.]+|[\s.]+$/g, '')
    // Ensure it's not empty after sanitization
    || 'sanitized-image.png'
}

/**
 * Get recommended filename generation options based on use case
 */
export function getRecommendedFilenameOptions(useCase: 'descriptive' | 'short' | 'technical'): Partial<FilenameGenerationInput> {
  switch (useCase) {
    case 'descriptive':
      return {
        maxLength: 80,
        imageFormat: 'png'
      }
    case 'short':
      return {
        maxLength: 30,
        imageFormat: 'jpg'
      }
    case 'technical':
      return {
        maxLength: 50,
        imageFormat: 'png'
      }
    default:
      return {
        maxLength: 50,
        imageFormat: 'png'
      }
  }
}