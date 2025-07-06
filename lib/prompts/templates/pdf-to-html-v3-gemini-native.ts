import { z } from 'zod'
import { loadMultimodalPromptTemplateFromCaller } from '@/lib/prompts/types'

// Schema for v3 Gemini native PDF to HTML conversion input
export const pdfToHtmlV3GeminiNativePromptInputSchema = z.object({
  pdfBuffer: z.instanceof(Buffer).describe('PDF buffer for native Gemini processing'),
  fileName: z.string().optional().describe('Optional filename for context'),
  singlePageOnly: z.boolean().default(false).describe('Process only the first page for cost control')
})

// Schema for the expected HTML output with bounding boxes
export const pdfToHtmlV3GeminiNativeOutputSchema = z.string().min(1).describe('Clean semantic HTML with bounding box coordinates (0-1000 scale)')

// Create v3 PDF to HTML prompt template specifically for Gemini
export function createPdfToHtmlV3GeminiNativePrompt() {
  // Always use Gemini for v3 as it's the only model with native bounding box support
  const modelString = 'google:gemini-2.5-pro:latest'
  
  return loadMultimodalPromptTemplateFromCaller(
    'pdf-to-html-v3-gemini-native.njk',
    pdfToHtmlV3GeminiNativePromptInputSchema,
    {
      model: modelString,
      temperature: 0, // Deterministic for accurate coordinate extraction
      maxTokens: 64000, // High limit for complex PDFs with many visual elements
    }
  )
}

// Default export
export const pdfToHtmlV3GeminiNativePrompt = createPdfToHtmlV3GeminiNativePrompt()