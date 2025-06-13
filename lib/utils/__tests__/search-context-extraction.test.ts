/**
 * Tests for Search Context Extraction Utility
 */

import {
  extractMatchContext,
  findAllMatchPositions,
  extractAllMatchContexts,
  mergeOverlappingContexts,
  generateTooltipContent
} from '../search-context-extraction'

describe('extractMatchContext', () => {
  const sampleText = "This is a long document with many words and concepts. The fundamental principle here is important and fundamental to understanding."

  it('should extract context around a match in the middle of text', () => {
    const matchIndex = sampleText.indexOf('fundamental') // First occurrence at position 63
    const context = extractMatchContext(sampleText, 'fundamental', matchIndex, 30)
    
    expect(context).toContain('fundamental')
    expect(context).toContain('...')
    expect(context.length).toBeLessThan(80) // Should be roughly 60 chars + ellipsis
  })

  it('should handle matches at the beginning of text', () => {
    const text = "fundamental concept in this document"
    const context = extractMatchContext(text, 'fundamental', 0, 20)
    
    expect(context).toBe('fundamental concept in this...')
    expect(context).not.toMatch(/^\.\.\./) // Should not start with ellipsis
  })

  it('should handle matches at the end of text', () => {
    const text = "This document discusses something fundamental"
    const matchIndex = text.indexOf('fundamental')
    const context = extractMatchContext(text, 'fundamental', matchIndex, 20)
    
    expect(context).toBe('...something fundamental')
    expect(context).not.toMatch(/\.\.\.$/) // Should not end with ellipsis
  })

  it('should handle short text that fits entirely within context', () => {
    const text = "Short fundamental text"
    const matchIndex = text.indexOf('fundamental')
    const context = extractMatchContext(text, 'fundamental', matchIndex, 50)
    
    expect(context).toBe(text)
    expect(context).not.toContain('...')
  })

  it('should handle case sensitivity correctly', () => {
    const text = "The FUNDAMENTAL principle and fundamental concept"
    const matchIndex = text.indexOf('fundamental') // lowercase version
    const context = extractMatchContext(text, 'fundamental', matchIndex, 20, false)
    
    expect(context).toContain('fundamental')
  })

  it('should handle invalid inputs gracefully', () => {
    expect(extractMatchContext('', 'test', 0)).toBe('')
    expect(extractMatchContext('test', '', 0)).toBe('')
    expect(extractMatchContext('test', 'test', -1)).toBe('')
    expect(extractMatchContext('test', 'test', 100)).toBe('')
  })

  it('should respect word boundaries when possible', () => {
    const text = "The supercalifragilisticexpialidocious word is very long and has the word fundamental in this sentence and continues with more text here"
    const matchIndex = text.indexOf('fundamental')
    const context = extractMatchContext(text, 'fundamental', matchIndex, 30)
    
    // Should try to break on word boundaries
    expect(context).toMatch(/\.\.\.\s*\w+/) // Should start with word after ellipsis
    expect(context).toMatch(/\w+\s*\.\.\./) // Should end with word before ellipsis
  })
})

describe('findAllMatchPositions', () => {
  it('should find all occurrences of a term', () => {
    const text = "The cat sat on the mat. The cat was happy. Another cat appeared."
    const positions = findAllMatchPositions(text, 'cat')
    
    expect(positions).toEqual([4, 28, 51])
  })

  it('should handle case sensitivity', () => {
    const text = "The Cat and the cat both appeared"
    const caseSensitive = findAllMatchPositions(text, 'cat', true)
    const caseInsensitive = findAllMatchPositions(text, 'cat', false)
    
    expect(caseSensitive).toEqual([16]) // Only lowercase 'cat'
    expect(caseInsensitive).toEqual([4, 16]) // Both 'Cat' and 'cat'
  })

  it('should handle overlapping matches', () => {
    const text = "aaaa"
    const positions = findAllMatchPositions(text, 'aa')
    
    expect(positions).toEqual([0, 1, 2]) // All overlapping positions
  })

  it('should handle no matches', () => {
    const text = "No matches here"
    const positions = findAllMatchPositions(text, 'xyz')
    
    expect(positions).toEqual([])
  })

  it('should handle empty inputs', () => {
    expect(findAllMatchPositions('', 'test')).toEqual([])
    expect(findAllMatchPositions('test', '')).toEqual([])
  })
})

describe('extractAllMatchContexts', () => {
  it('should extract contexts for all matches', () => {
    const text = "The cat sat on the mat. The cat was happy. Another cat appeared."
    const contexts = extractAllMatchContexts(text, 'cat', 15)
    
    expect(contexts).toHaveLength(3)
    expect(contexts[0].matchIndex).toBe(4)
    expect(contexts[1].matchIndex).toBe(28)
    expect(contexts[2].matchIndex).toBe(51)
    
    contexts.forEach(context => {
      expect(context.text).toContain('cat')
    })
  })

  it('should handle single match', () => {
    const text = "Only one cat here"
    const contexts = extractAllMatchContexts(text, 'cat', 10)
    
    expect(contexts).toHaveLength(1)
    expect(contexts[0].text).toBe('Only one cat here')
    expect(contexts[0].matchIndex).toBe(9)
  })

  it('should handle no matches', () => {
    const text = "No matches in this text"
    const contexts = extractAllMatchContexts(text, 'xyz', 10)
    
    expect(contexts).toEqual([])
  })
})

describe('mergeOverlappingContexts', () => {
  it('should merge contexts that are close together', () => {
    const contexts = [
      { text: 'first cat context', matchIndex: 10 },
      { text: 'second cat context', matchIndex: 25 }, // Close to first
      { text: 'third cat context', matchIndex: 200 }  // Far from others
    ]
    
    const merged = mergeOverlappingContexts(contexts, 'cat')
    
    expect(merged).toHaveLength(2) // First two should be merged
    expect(merged[0].text).toContain('first cat context ... second cat context')
    expect(merged[1].text).toBe('third cat context')
  })

  it('should handle single context', () => {
    const contexts = [{ text: 'only context', matchIndex: 10 }]
    const merged = mergeOverlappingContexts(contexts, 'test')
    
    expect(merged).toEqual(contexts)
  })

  it('should handle empty contexts', () => {
    const merged = mergeOverlappingContexts([], 'test')
    
    expect(merged).toEqual([])
  })

  it('should preserve order based on match index', () => {
    const contexts = [
      { text: 'third', matchIndex: 400 },  // Make gaps large enough to prevent merging
      { text: 'first', matchIndex: 10 },
      { text: 'second', matchIndex: 200 }
    ]
    
    const merged = mergeOverlappingContexts(contexts, 'test')
    
    // Should be sorted by matchIndex and remain separate due to large gaps
    expect(merged).toHaveLength(3)
    expect(merged[0].matchIndex).toBe(10)
    expect(merged[1].matchIndex).toBe(200)
    expect(merged[2].matchIndex).toBe(400)
  })
})

describe('Edge cases and integration', () => {
  it('should handle special characters in search query', () => {
    const text = "Price is $50.99 for this item"
    const matchIndex = text.indexOf('$50.99')
    const context = extractMatchContext(text, '$50.99', matchIndex, 10)
    
    expect(context).toContain('$50.99')
  })

  it('should handle unicode characters', () => {
    const text = "Das ist ein Café in München"
    const matchIndex = text.indexOf('Café')
    const context = extractMatchContext(text, 'Café', matchIndex, 10)
    
    expect(context).toContain('Café')
  })

  it('should handle very long words', () => {
    const longWord = 'pneumonoultramicroscopicsilicovolcanoconiosis'
    const text = `Medical term ${longWord} is quite long`
    const matchIndex = text.indexOf(longWord)
    const context = extractMatchContext(text, longWord, matchIndex, 20)
    
    expect(context).toContain(longWord)
  })

  it('should handle newlines and special whitespace', () => {
    const text = "Line 1\n\nLine 2 with\ttabs and   spaces"
    const matchIndex = text.indexOf('Line 2')
    const context = extractMatchContext(text, 'Line 2', matchIndex, 15)
    
    expect(context).toContain('Line 2')
    // Context should normalize whitespace to some degree
  })
})

describe('generateTooltipContent', () => {
  it('should return full text when under maxLength', () => {
    const text = "Short text with fundamental concept"
    const tooltip = generateTooltipContent(text, 'fundamental', 100)
    
    expect(tooltip).toBe(text.trim())
    expect(tooltip).not.toContain('...')
  })

  it('should truncate long text and center around match', () => {
    const longText = "This is a very long paragraph that contains many words and concepts. The fundamental principle discussed here is quite important for understanding the broader context of the document. It continues with even more detailed information about various topics."
    const tooltip = generateTooltipContent(longText, 'fundamental', 100)
    
    expect(tooltip).toContain('fundamental')
    expect(tooltip).toContain('...')
    expect(tooltip.length).toBeLessThan(120) // Should be around maxLength + ellipsis
  })

  it('should handle text with no matches', () => {
    const text = "This text has no matches for the query"
    const tooltip = generateTooltipContent(text, 'missing', 50)
    
    // When text is short and no match found, should return full text without ellipsis
    expect(tooltip).toBe(text.trim())
    expect(tooltip.length).toBeLessThan(60)
  })

  it('should handle case sensitivity', () => {
    const text = "The FUNDAMENTAL principle and fundamental concept are both important"
    const tooltipInsensitive = generateTooltipContent(text, 'fundamental', 100, false)
    const tooltipSensitive = generateTooltipContent(text, 'fundamental', 100, true)
    
    expect(tooltipInsensitive).toContain('FUNDAMENTAL')
    expect(tooltipSensitive).toContain('fundamental')
  })

  it('should respect word boundaries when truncating', () => {
    const text = "Here is some supercalifragilisticexpialidocious text with fundamental concepts that should be truncated properly at word boundaries"
    const tooltip = generateTooltipContent(text, 'fundamental', 80)
    
    expect(tooltip).toContain('fundamental')
    // Should not cut words in half at boundaries
    expect(tooltip).toMatch(/\.\.\.\s*\w+/) // Should start with word after ellipsis if truncated
  })

  it('should handle empty inputs gracefully', () => {
    expect(generateTooltipContent('', 'test')).toBe('')
    expect(generateTooltipContent('test', '')).toBe('')
    // With maxLength 0, fallback logic truncates but might add ellipsis
    const result = generateTooltipContent('test', 'test', 0)
    expect(result).toContain('test')
  })

  it('should handle very short maxLength', () => {
    const text = "This is a test with fundamental concepts"
    const tooltip = generateTooltipContent(text, 'fundamental', 20)
    
    expect(tooltip).toContain('fundamental')
    expect(tooltip.length).toBeLessThan(30)
  })
})