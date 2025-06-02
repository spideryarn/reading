import { getRedirectUrl } from '../client-utils'

describe('Client Auth Utilities', () => {
  describe('getRedirectUrl', () => {
    it('should return the next parameter when it is a valid relative URL', () => {
      const searchParams = new URLSearchParams('next=/documents/test-doc')
      const result = getRedirectUrl(searchParams)

      expect(result).toBe('/documents/test-doc')
    })

    it('should return fallback when no next parameter is provided', () => {
      const searchParams = new URLSearchParams('')
      const result = getRedirectUrl(searchParams)

      expect(result).toBe('/')
    })

    it('should return custom fallback when no next parameter is provided', () => {
      const searchParams = new URLSearchParams('')
      const result = getRedirectUrl(searchParams, '/dashboard')

      expect(result).toBe('/dashboard')
    })

    it('should accept deep relative paths', () => {
      const searchParams = new URLSearchParams('next=/documents/test-doc/tweets')
      const result = getRedirectUrl(searchParams)

      expect(result).toBe('/documents/test-doc/tweets')
    })

    it('should accept paths with query parameters', () => {
      const searchParams = new URLSearchParams('next=/documents/test-doc?tab=summary')
      const result = getRedirectUrl(searchParams)

      expect(result).toBe('/documents/test-doc?tab=summary')
    })

    it('should accept paths with fragments', () => {
      const searchParams = new URLSearchParams('next=/documents/test-doc#section-1')
      const result = getRedirectUrl(searchParams)

      expect(result).toBe('/documents/test-doc#section-1')
    })

    it('should accept root path', () => {
      const searchParams = new URLSearchParams('next=/')
      const result = getRedirectUrl(searchParams)

      expect(result).toBe('/')
    })

    describe('Security: Open redirect prevention', () => {
      it('should reject absolute URLs with http protocol', () => {
        const searchParams = new URLSearchParams('next=http://malicious.com/steal-data')
        const result = getRedirectUrl(searchParams)

        expect(result).toBe('/')
      })

      it('should reject absolute URLs with https protocol', () => {
        const searchParams = new URLSearchParams('next=https://malicious.com/steal-data')
        const result = getRedirectUrl(searchParams)

        expect(result).toBe('/')
      })

      it('should reject URLs starting with double slash (protocol-relative)', () => {
        const searchParams = new URLSearchParams('next=//malicious.com/steal-data')
        const result = getRedirectUrl(searchParams)

        expect(result).toBe('/')
      })

      it('should reject triple slash URLs', () => {
        const searchParams = new URLSearchParams('next=///malicious.com/steal-data')
        const result = getRedirectUrl(searchParams)

        expect(result).toBe('/')
      })

      it('should reject URLs with other protocols', () => {
        const searchParams = new URLSearchParams('next=ftp://malicious.com')
        const result = getRedirectUrl(searchParams)

        expect(result).toBe('/')
      })

      it('should reject javascript: URLs', () => {
        const searchParams = new URLSearchParams('next=javascript:alert("xss")')
        const result = getRedirectUrl(searchParams)

        expect(result).toBe('/')
      })

      it('should reject data: URLs', () => {
        const searchParams = new URLSearchParams('next=data:text/html,<script>alert("xss")</script>')
        const result = getRedirectUrl(searchParams)

        expect(result).toBe('/')
      })

      it('should reject URLs with embedded credentials', () => {
        const searchParams = new URLSearchParams('next=https://user:pass@malicious.com')
        const result = getRedirectUrl(searchParams)

        expect(result).toBe('/')
      })

      it('should use custom fallback for malicious URLs', () => {
        const searchParams = new URLSearchParams('next=https://malicious.com')
        const result = getRedirectUrl(searchParams, '/safe-page')

        expect(result).toBe('/safe-page')
      })
    })

    describe('Edge cases', () => {
      it('should handle empty string in next parameter', () => {
        const searchParams = new URLSearchParams('next=')
        const result = getRedirectUrl(searchParams)

        expect(result).toBe('/')
      })

      it('should handle whitespace-only next parameter', () => {
        const searchParams = new URLSearchParams('next=   ')
        const result = getRedirectUrl(searchParams)

        expect(result).toBe('/')
      })

      it('should handle URL-encoded relative paths', () => {
        const searchParams = new URLSearchParams('next=%2Fdocuments%2Ftest-doc')
        const result = getRedirectUrl(searchParams)

        expect(result).toBe('/documents/test-doc')
      })

      it('should handle URL-encoded absolute URLs and reject them', () => {
        const searchParams = new URLSearchParams('next=https%3A%2F%2Fmalicious.com')
        const result = getRedirectUrl(searchParams)

        expect(result).toBe('/')
      })

      it('should handle mixed case protocol schemes', () => {
        const searchParams = new URLSearchParams('next=HTTP://malicious.com')
        const result = getRedirectUrl(searchParams)

        expect(result).toBe('/')
      })

      it('should handle backslash attempts', () => {
        const searchParams = new URLSearchParams('next=\\malicious.com')
        const result = getRedirectUrl(searchParams)

        // URLSearchParams automatically decodes backslashes, but they don't start with / so fallback is used
        expect(result).toBe('/')
      })

      it('should handle null bytes and special characters', () => {
        const searchParams = new URLSearchParams('next=/documents/test\x00doc')
        const result = getRedirectUrl(searchParams)

        expect(result).toBe('/documents/test\x00doc') // Browser will handle null bytes
      })

      it('should handle very long paths', () => {
        const longPath = '/documents/' + 'a'.repeat(1000)
        const searchParams = new URLSearchParams(`next=${longPath}`)
        const result = getRedirectUrl(searchParams)

        expect(result).toBe(longPath)
      })

      it('should handle paths with special characters', () => {
        const encodedPath = '/documents/test-doc%20with%20spaces'
        const searchParams = new URLSearchParams(`next=${encodedPath}`)
        const result = getRedirectUrl(searchParams)

        // URLSearchParams automatically decodes URL-encoded characters
        expect(result).toBe('/documents/test-doc with spaces')
      })

      it('should handle international characters in paths', () => {
        const internationalPath = '/documents/测试文档'
        const searchParams = new URLSearchParams(`next=${internationalPath}`)
        const result = getRedirectUrl(searchParams)

        expect(result).toBe(internationalPath)
      })
    })

    describe('Multiple query parameters', () => {
      it('should extract next parameter when other parameters are present', () => {
        const searchParams = new URLSearchParams('utm_source=google&next=/documents/test-doc&utm_medium=cpc')
        const result = getRedirectUrl(searchParams)

        expect(result).toBe('/documents/test-doc')
      })

      it('should handle multiple next parameters by using the first one', () => {
        const searchParams = new URLSearchParams('next=/documents/first&next=/documents/second')
        const result = getRedirectUrl(searchParams)

        expect(result).toBe('/documents/first')
      })

      it('should handle case sensitivity of parameter names', () => {
        const searchParams = new URLSearchParams('Next=/documents/test-doc&NEXT=/documents/other')
        const result = getRedirectUrl(searchParams)

        // Should return fallback since 'next' is case-sensitive
        expect(result).toBe('/')
      })
    })

    describe('Real-world scenarios', () => {
      it('should handle login redirect from document page', () => {
        const searchParams = new URLSearchParams('next=/documents/chalmers-consciousness-paper')
        const result = getRedirectUrl(searchParams, '/dashboard')

        expect(result).toBe('/documents/chalmers-consciousness-paper')
      })

      it('should handle login redirect from tweet thread page', () => {
        const searchParams = new URLSearchParams('next=/documents/chalmers-consciousness-paper/tweets')
        const result = getRedirectUrl(searchParams, '/dashboard')

        expect(result).toBe('/documents/chalmers-consciousness-paper/tweets')
      })

      it('should handle login redirect with query parameters', () => {
        // When the next parameter contains query params, they need to be URL-encoded
        const encodedNext = encodeURIComponent('/documents/test-doc?tab=glossary&highlight=consciousness')
        const searchParams = new URLSearchParams(`next=${encodedNext}`)
        const result = getRedirectUrl(searchParams, '/dashboard')

        expect(result).toBe('/documents/test-doc?tab=glossary&highlight=consciousness')
      })

      it('should handle unencoded query parameters correctly', () => {
        const searchParams = new URLSearchParams('next=/documents/test-doc?tab=glossary&highlight=consciousness')
        const result = getRedirectUrl(searchParams, '/dashboard')

        // URLSearchParams treats the & as a parameter separator, so we only get the first part
        // This is actually correct behavior - the next parameter value ends at the first &
        expect(result).toBe('/documents/test-doc?tab=glossary')
      })

      it('should handle settings page redirect', () => {
        const searchParams = new URLSearchParams('next=/settings')
        const result = getRedirectUrl(searchParams)

        expect(result).toBe('/settings')
      })

      it('should handle design page redirect', () => {
        const searchParams = new URLSearchParams('next=/design')
        const result = getRedirectUrl(searchParams)

        expect(result).toBe('/design')
      })
    })

    describe('URLSearchParams constructor variations', () => {
      it('should work with URLSearchParams from string', () => {
        const searchParams = new URLSearchParams('?next=/documents/test-doc')
        const result = getRedirectUrl(searchParams)

        expect(result).toBe('/documents/test-doc')
      })

      it('should work with URLSearchParams from object entries', () => {
        const searchParams = new URLSearchParams([['next', '/documents/test-doc']])
        const result = getRedirectUrl(searchParams)

        expect(result).toBe('/documents/test-doc')
      })

      it('should work with URLSearchParams from object', () => {
        const searchParams = new URLSearchParams({ next: '/documents/test-doc' })
        const result = getRedirectUrl(searchParams)

        expect(result).toBe('/documents/test-doc')
      })

      it('should work with empty URLSearchParams', () => {
        const searchParams = new URLSearchParams()
        const result = getRedirectUrl(searchParams)

        expect(result).toBe('/')
      })
    })
  })
})