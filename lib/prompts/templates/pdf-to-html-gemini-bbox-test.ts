import { z } from 'zod'
import { loadMultimodalPromptTemplateFromCaller } from '@/lib/prompts/types'

// Schema for Gemini bbox test input
export const geminiBboxTestInputSchema = z.object({
  pdfBuffer: z.instanceof(Buffer).describe('PDF buffer for Gemini processing'),
  fileName: z.string().optional().describe('Optional filename for context')
})

// Create Gemini bbox test prompt template
export function createGeminiBboxTestPrompt() {
  return loadMultimodalPromptTemplateFromCaller(
    'pdf-to-html-gemini-bbox-test.njk',
    geminiBboxTestInputSchema,
    {
      modelString: 'google:gemini-2.5-pro:latest',
      temperature: 0, // Deterministic for accurate bbox extraction
      maxTokens: 32000, // Sufficient for test
    }
  )
}

export const geminiBboxTestPrompt = createGeminiBboxTestPrompt()