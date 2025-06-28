import { z } from 'zod'
import { loadMultimodalPromptTemplateFromCaller } from '@/lib/prompts/types'

// Schema for image caption generation input
export const imageCaptionGenerationPromptInputSchema = z.object({
  imageBase64: z.string().min(1).describe('Base64 encoded image data for vision analysis'),
  pageNumber: z.number().int().min(1).describe('1-indexed page number for context'),
  documentContext: z.string().optional().describe('Optional document context (title, subject, academic field)'),
  boundingBox: z.object({
    x1: z.number().min(0).max(1),
    y1: z.number().min(0).max(1), 
    x2: z.number().min(0).max(1),
    y2: z.number().min(0).max(1)
  }).describe('Normalized bounding box coordinates (0-1 scale)'),
  extractionPurpose: z.enum(['filename', 'alt_text', 'detailed_description']).default('filename').describe('Purpose of caption generation')
})

// Schema for expected caption output with structured data
export const imageCaptionOutputSchema = z.object({
  caption: z.string().min(1).max(100).describe('Concise descriptive caption suitable for filename generation'),
  description: z.string().min(1).max(500).describe('Detailed technical description of image content'),
  confidence: z.number().min(0).max(1).describe('AI confidence score for caption accuracy (0-1)'),
  imageType: z.enum(['figure', 'table', 'equation', 'diagram', 'chart', 'graph', 'photo', 'illustration', 'other']).describe('Categorization of image type'),
  academicRelevance: z.enum(['high', 'medium', 'low']).describe('Relevance to academic/technical content')
})

// Create image caption generation prompt template with configurable provider
export function createImageCaptionPrompt(provider: 'claude' | 'gemini' = 'gemini') {
  // Default to Gemini Flash 2.5 for speed/cost optimization
  const modelString = provider === 'gemini' 
    ? 'google:gemini-2.5-flash:latest' 
    : 'anthropic:claude-sonnet-4:20250514'
  
  return loadMultimodalPromptTemplateFromCaller(
    'image-caption-generation.njk',
    imageCaptionGenerationPromptInputSchema,
    {
      model: modelString,
      temperature: 0.1, // Low temperature for consistent academic content analysis
      maxTokens: 1000, // Moderate limit for caption generation
    }
  )
}

// Default export optimized for Gemini Flash as per requirements
export const imageCaptionPrompt = createImageCaptionPrompt('gemini')