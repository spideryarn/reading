import { z } from 'zod'
import { loadMultimodalPromptTemplateFromCaller } from '@/lib/prompts/types'

// Schema for direct PDF to HTML conversion input
export const pdfToHtmlDirectPromptInputSchema = z.object({
  pdfBuffer: z.instanceof(Buffer).describe('PDF buffer for direct processing by Claude API'),
  fileName: z.string().optional().describe('Optional filename for context'),
  singlePageOnly: z.boolean().default(false).describe('Process only the first page for cost control')
})

// Schema for the expected HTML output (for validation if needed)
export const pdfToHtmlDirectOutputSchema = z.string().min(1).describe('Clean semantic HTML converted from PDF')

// Load the direct PDF to HTML prompt template
export const pdfToHtmlDirectPrompt = loadMultimodalPromptTemplateFromCaller(
  'pdf-to-html-direct.njk',
  pdfToHtmlDirectPromptInputSchema,
  {
    model: 'anthropic-balanced', // Use Claude 4 Sonnet for maximum accuracy
    temperature: 0, // Deterministic for academic content conversion
    maxTokens: 8000, // Allow for longer HTML output from multi-page PDFs
  }
)