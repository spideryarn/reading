import { readFileSync } from 'fs'
import { join } from 'path'
import { DocumentParser } from '../lib/services/document-parser'

const html = readFileSync(join(__dirname, 'test-inline-elements.html'), 'utf-8')
const parser = new DocumentParser()
const elements = parser.parse(html, 'test-doc')

console.log('Total elements:', elements.length)
console.log('\nElements breakdown:')

elements.forEach((el, index) => {
  console.log(`\n[${index}] ${el.tag_name} (id: ${el.id.substring(0, 10)}...)`)
  console.log(`  Parent: ${el.parent_id ? el.parent_id.substring(0, 10) + '...' : 'null'}`)
  console.log(`  Content: "${el.content.substring(0, 100)}${el.content.length > 100 ? '...' : ''}"`)
})

// Check specific elements
const paragraphs = elements.filter(el => el.tag_name === 'p')
console.log('\n\nParagraph count:', paragraphs.length)

const technicalNote = paragraphs.find(p => p.content.includes('technical note'))
if (technicalNote) {
  console.log('\nTechnical note paragraph:')
  console.log('Contains "conceptual":', technicalNote.content.includes('conceptual'))
  console.log('Contains "a posteriori":', technicalNote.content.includes('a posteriori'))
  console.log('Contains "explanatory":', technicalNote.content.includes('explanatory'))
  console.log('Contains "explanatorily":', technicalNote.content.includes('explanatorily'))
}

// Check for any em or i elements (should be none)
const inlineElements = elements.filter(el => ['em', 'i', 'strong', 'b', 'code'].includes(el.tag_name))
console.log('\n\nInline elements found:', inlineElements.length)
if (inlineElements.length > 0) {
  console.log('WARNING: Found inline elements that should have been included in parent text:')
  inlineElements.forEach(el => {
    console.log(`  - ${el.tag_name}: "${el.content}"`)
  })
}