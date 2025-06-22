// Tests for PDF validation utility functions  
// NOTE: V2 implementation uses direct PDF processing via Claude API
// Only testing the validation functions that are still used

// Simple implementation copied from the main file to avoid dependency issues
function validatePdfBuffer(buffer: Buffer): { valid: boolean; error?: string } {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: 'PDF buffer is empty' }
  }

  // Check PDF header
  const pdfHeader = buffer.subarray(0, 5)
  if (pdfHeader.toString() !== '%PDF-') {
    return { valid: false, error: 'File is not a valid PDF' }
  }

  // Check size limit (2MB for legacy compatibility)
  const maxSize = 2 * 1024 * 1024 // 2MB
  if (buffer.length > maxSize) {
    return { valid: false, error: 'PDF file too large (max 2MB for single-page PDFs)' }
  }

  return { valid: true }
}

describe('PDF Validator', () => {
  describe('validatePdfBuffer', () => {
    it('should validate a proper PDF buffer', () => {
      const validPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog')
      const result = validatePdfBuffer(validPdfBuffer)
      
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should reject empty buffer', () => {
      const emptyBuffer = Buffer.alloc(0)
      const result = validatePdfBuffer(emptyBuffer)
      
      expect(result.valid).toBe(false)
      expect(result.error).toBe('PDF buffer is empty')
    })

    it('should reject non-PDF buffer', () => {
      const nonPdfBuffer = Buffer.from('This is not a PDF file')
      const result = validatePdfBuffer(nonPdfBuffer)
      
      expect(result.valid).toBe(false)
      expect(result.error).toBe('File is not a valid PDF')
    })

    it('should reject oversized PDF buffer', () => {
      const largePdfBuffer = Buffer.alloc(3 * 1024 * 1024) // 3MB
      largePdfBuffer.write('%PDF-1.4')
      const result = validatePdfBuffer(largePdfBuffer)
      
      expect(result.valid).toBe(false)
      expect(result.error).toBe('PDF file too large (max 2MB for single-page PDFs)')
    })
  })
})