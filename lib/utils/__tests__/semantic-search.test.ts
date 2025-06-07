import { normalizeSemanticSearchQuery } from '../semantic-search'

describe('normalizeSemanticSearchQuery', () => {
  it('should trim leading and trailing spaces', () => {
    expect(normalizeSemanticSearchQuery('  hello world  ')).toBe('hello world')
    expect(normalizeSemanticSearchQuery(' consciousness ')).toBe('consciousness')
  })

  it('should trim tabs and newlines', () => {
    expect(normalizeSemanticSearchQuery('\thello\t')).toBe('hello')
    expect(normalizeSemanticSearchQuery('\nhello\n')).toBe('hello')
    expect(normalizeSemanticSearchQuery('\r\nhello\r\n')).toBe('hello')
    expect(normalizeSemanticSearchQuery(' \t\n hello world \n\t ')).toBe('hello world')
  })

  it('should preserve case sensitivity', () => {
    expect(normalizeSemanticSearchQuery('  Consciousness  ')).toBe('Consciousness')
    expect(normalizeSemanticSearchQuery('  HELLO WORLD  ')).toBe('HELLO WORLD')
    expect(normalizeSemanticSearchQuery('  CamelCase Query  ')).toBe('CamelCase Query')
  })

  it('should preserve punctuation', () => {
    expect(normalizeSemanticSearchQuery('  what is consciousness?  ')).toBe('what is consciousness?')
    expect(normalizeSemanticSearchQuery('  "quoted phrase"  ')).toBe('"quoted phrase"')
    expect(normalizeSemanticSearchQuery("  it's important!  ")).toBe("it's important!")
    expect(normalizeSemanticSearchQuery('  semi-colon; and comma, preserved  ')).toBe('semi-colon; and comma, preserved')
  })

  it('should preserve internal whitespace', () => {
    expect(normalizeSemanticSearchQuery('  multiple   spaces   inside  ')).toBe('multiple   spaces   inside')
    expect(normalizeSemanticSearchQuery('  tab\there  ')).toBe('tab\there')
  })

  it('should handle edge cases', () => {
    expect(normalizeSemanticSearchQuery('')).toBe('')
    expect(normalizeSemanticSearchQuery('   ')).toBe('')
    expect(normalizeSemanticSearchQuery('\t\n')).toBe('')
    expect(normalizeSemanticSearchQuery('a')).toBe('a')
  })

  it('should handle unicode and special characters', () => {
    expect(normalizeSemanticSearchQuery('  café  ')).toBe('café')
    expect(normalizeSemanticSearchQuery('  🧠 consciousness  ')).toBe('🧠 consciousness')
    expect(normalizeSemanticSearchQuery('  日本語  ')).toBe('日本語')
  })

  it('should handle very long queries', () => {
    const longQuery = '  ' + 'a'.repeat(1000) + '  '
    expect(normalizeSemanticSearchQuery(longQuery)).toBe('a'.repeat(1000))
  })

  it('should be idempotent', () => {
    const query = '  hello world  '
    const normalized = normalizeSemanticSearchQuery(query)
    expect(normalizeSemanticSearchQuery(normalized)).toBe(normalized)
  })
})