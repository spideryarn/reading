/**
 * Test to verify glossary entity highlighting respects word boundaries
 * This test ensures "AI" doesn't match within "brain" when separateWordSearch is true
 */

import { cleanup } from '@testing-library/react'

// We need to test with actual Mark.js, not the mock for this specific test
// Unmock mark.js for this test file
jest.unmock('mark.js')
import Mark from 'mark.js'

// Mock test content with problematic cases
const TEST_HTML = `
  <div id="test-content">
    <p>The human brain is an amazing organ.</p>
    <p>AI technology is advancing rapidly.</p>
    <p>Artificial intelligence and machine learning are related.</p>
    <p>The strain on society is increasing.</p>
  </div>
`

// Mock glossary entities that could cause false matches
const MOCK_ENTITIES = [
  {
    id: '1',
    name: 'AI',
    aliases: [],
    brief_explanation: 'Artificial Intelligence',
    long_explanation: 'A field of computer science focused on creating intelligent machines.'
  },
  {
    id: '2', 
    name: 'artificial intelligence',
    aliases: ['AI', 'machine intelligence'],
    brief_explanation: 'Computer systems that can perform tasks requiring human intelligence',
    long_explanation: 'The simulation of human intelligence in machines.'
  }
]

describe('Glossary Word Boundary Matching', () => {
  let container: HTMLElement
  let markInstance: Mark

  beforeEach(() => {
    // Set up DOM
    document.body.innerHTML = TEST_HTML
    container = document.getElementById('test-content')!
    markInstance = new Mark(container)
  })

  afterEach(() => {
    // Clean up highlights
    if (markInstance) {
      markInstance.unmark()
    }
    cleanup()
  })

  describe('with separateWordSearch: false (current problematic behavior)', () => {
    test('incorrectly matches "AI" within "brain"', (done) => {
      let matchCount = 0

      markInstance.mark('AI', {
        separateWordSearch: false, // Current problematic setting
        acrossElements: true,
        caseSensitive: false,
        className: 'test-highlight',
        each: () => {
          matchCount++
        },
        done: () => {
          // With separateWordSearch: false, "AI" matches within "brain"
          expect(matchCount).toBeGreaterThan(1) // Should match both "brain" and "AI"
          
          // Verify the problematic match exists
          const brainParagraph = container.querySelector('p')!
          const highlightedText = brainParagraph.innerHTML
          expect(highlightedText).toContain('br<mark class="test-highlight">ai</mark>n')
          
          done()
        }
      })
    })
  })

  describe('with separateWordSearch: true (proposed fix)', () => {
    test('correctly matches only whole words', (done) => {
      let matchCount = 0
      const matches: string[] = []

      markInstance.mark('AI', {
        separateWordSearch: true, // Proposed fix
        acrossElements: true,
        caseSensitive: false,
        className: 'test-highlight',
        each: (element) => {
          matchCount++
          matches.push(element.textContent || '')
        },
        done: () => {
          // With separateWordSearch: true, should only match standalone "AI"
          expect(matchCount).toBe(1) // Only the standalone "AI" should match
          expect(matches).toEqual(['AI'])
          
          // Verify "brain" is NOT highlighted
          const brainParagraph = container.querySelector('p')!
          expect(brainParagraph.innerHTML).not.toContain('br<mark')
          expect(brainParagraph.innerHTML).toContain('brain') // Should be unhighlighted
          
          // Verify standalone "AI" IS highlighted
          const aiParagraph = container.querySelectorAll('p')[1]!
          expect(aiParagraph.innerHTML).toContain('<mark class="test-highlight">AI</mark>')
          
          done()
        }
      })
    })

    test('still matches multi-word phrases correctly', (done) => {
      let matchCount = 0
      const matches: string[] = []

      markInstance.mark('artificial intelligence', {
        separateWordSearch: true,
        acrossElements: true,
        caseSensitive: false,
        className: 'test-highlight',
        each: (element) => {
          matchCount++
          matches.push(element.textContent || '')
        },
        done: () => {
          // Should match the full phrase "artificial intelligence"
          expect(matchCount).toBe(1)
          expect(matches).toEqual(['artificial intelligence'])
          
          // Verify the phrase is highlighted
          const aiParagraph = container.querySelectorAll('p')[2]!
          expect(aiParagraph.innerHTML).toContain('<mark class="test-highlight">artificial intelligence</mark>')
          
          done()
        }
      })
    })

    test('handles multiple terms correctly with word boundaries', (done) => {
      // Test multiple terms in sequence
      let aiMatchCount = 0
      let totalMatchCount = 0

      // First mark "AI"
      markInstance.mark('AI', {
        separateWordSearch: true,
        acrossElements: true,
        caseSensitive: false,
        className: 'test-highlight-ai',
        each: () => {
          aiMatchCount++
          totalMatchCount++
        },
        done: () => {
          // Then mark "artificial intelligence" 
          markInstance.mark('artificial intelligence', {
            separateWordSearch: true,
            acrossElements: true,
            caseSensitive: false,
            className: 'test-highlight-phrase',
            each: () => {
              totalMatchCount++
            },
            done: () => {
              // Should match "AI" (1) + "artificial intelligence" (1) = 2 total matches
              expect(aiMatchCount).toBe(1) // Only standalone "AI"
              expect(totalMatchCount).toBe(2) // AI + artificial intelligence
              
              // Verify no false matches in "brain" or "strain"
              const brainParagraph = container.querySelector('p')!
              const strainParagraph = container.querySelectorAll('p')[3]!
              
              expect(brainParagraph.innerHTML).not.toContain('br<mark')
              expect(strainParagraph.innerHTML).not.toContain('str<mark')
              
              done()
            }
          })
        }
      })
    })
  })

  describe('edge cases', () => {
    test('handles punctuation boundaries correctly', () => {
      document.body.innerHTML = `
        <div id="test-content">
          <p>Is AI the future? Yes, AI is transformative.</p>
        </div>
      `
      container = document.getElementById('test-content')!
      markInstance = new Mark(container)

      return new Promise<void>((resolve) => {
        let matchCount = 0

        markInstance.mark('AI', {
          separateWordSearch: true,
          acrossElements: true,
          caseSensitive: false,
          className: 'test-highlight',
          each: () => {
            matchCount++
          },
          done: () => {
            // Should match both instances of "AI" despite punctuation
            expect(matchCount).toBe(2)
            resolve()
          }
        })
      })
    })

    test('handles case insensitivity with word boundaries', () => {
      document.body.innerHTML = `
        <div id="test-content">
          <p>Both ai and AI should match, but not brain.</p>
        </div>
      `
      container = document.getElementById('test-content')!
      markInstance = new Mark(container)

      return new Promise<void>((resolve) => {
        let matchCount = 0

        markInstance.mark('AI', {
          separateWordSearch: true,
          acrossElements: true,
          caseSensitive: false,
          className: 'test-highlight',
          each: () => {
            matchCount++
          },
          done: () => {
            // Should match both "ai" and "AI" but not "brain"
            expect(matchCount).toBe(2)
            resolve()
          }
        })
      })
    })
  })
})