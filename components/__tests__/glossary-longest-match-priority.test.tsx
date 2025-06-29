/**
 * Glossary highlighting should prioritise longer phrases over shorter substrings.
 * Example: with terms ["nonreductive explanation", "nonreductive"], the
 * phrase "nonreductive explanation" in the document must be a single
 * highlight, not two nested highlights or just the word "nonreductive".
 */

import { cleanup } from '@testing-library/react'

// Use the real Mark.js implementation for this test
jest.unmock('mark.js')
import Mark from 'mark.js'

const TEST_HTML = `
  <div id="content">
    <p>blah nonreductive explanation blah</p>
    <p>Standalone nonreductive terminology here.</p>
  </div>
`

// Helper: simple longest-first highlight function mirroring production code
function highlightGlossary(container: HTMLElement, terms: string[]) {
  const markInstance = new Mark(container)

  // Clear existing marks (defensive)
  markInstance.unmark()

  // Longest first
  terms.sort((a, b) => b.length - a.length)

  for (const term of terms) {
    markInstance.mark(term, {
      accuracy: 'exactly',
      separateWordSearch: false,
      acrossElements: true,
      exclude: ['mark'],
      className: 'glossary-highlight-test'
    })
  }

  return markInstance
}

describe('Glossary longest-match priority', () => {
  afterEach(() => {
    cleanup()
    document.body.innerHTML = ''
  })

  it('highlights the full phrase before the substring', () => {
    document.body.innerHTML = TEST_HTML
    const container = document.getElementById('content')!

    highlightGlossary(container, ['nonreductive explanation', 'nonreductive'])

    // Query highlights
    const marks = container.querySelectorAll('mark.glossary-highlight-test')

    // Expect three marks:
    // 1. The full phrase "nonreductive explanation" (single mark node)
    // 2. The standalone "nonreductive" in the second paragraph
    expect(marks.length).toBe(2)

    const firstMarkText = marks[0].textContent
    expect(firstMarkText).toBe('nonreductive explanation')

    const secondMarkText = marks[1].textContent
    expect(secondMarkText).toBe('nonreductive')
  })
}) 