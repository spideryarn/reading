// Upload limits configuration - safe for both client and server
// Note: These constants are safe to use in client-side code as they don't contain sensitive information

export const UPLOAD_LIMITS = {
  // PDF file upload limits
  PDF_MAX_SIZE_BYTES: 50 * 1024 * 1024,                    // 50MB - Supabase storage limit (free tier)
  PDF_CLAUDE_API_PROCESSING_LIMIT: 32 * 1024 * 1024,       // 32MB - Claude API can process this size
  PDF_GEMINI_API_PROCESSING_LIMIT: 20 * 1024 * 1024,       // 20MB - Gemini direct API limit (smaller than Claude)
  PDF_GEMINI_FILE_API_LIMIT: 2 * 1024 * 1024 * 1024,       // 2GB - Gemini File API limit (temporary storage)
  PDF_MAX_PAGES: 100,                                       // Maximum pages allowed in PDF (business rule)
  
  // HTML file upload limits
  HTML_FILE_UPLOAD_MAX_SIZE_BYTES: 10 * 1024 * 1024,       // 10MB - for direct HTML file uploads
  
  // General file upload limit (fallback)
  GENERAL_MAX_SIZE_BYTES: 50 * 1024 * 1024,                // 50MB - matches Supabase free tier limit
} as const

// Helper functions for display purposes
export const getUploadLimitMB = (limitInBytes: number): number => {
  return Math.round(limitInBytes / 1024 / 1024)
}

export const formatUploadLimitMessage = (limitInBytes: number): string => {
  return `${getUploadLimitMB(limitInBytes)}MB`
}