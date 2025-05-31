// Test file to verify UnifiedLeftPane renders correctly
// This is a basic test to ensure the component structure works

import React from 'react'
import { UnifiedLeftPane } from '../components/unified-left-pane'
import type { DocumentElement } from '../lib/types/document'

// Mock data
const mockElements: DocumentElement[] = [
  {
    id: 'syr-1',
    parent_id: null,
    tag_name: 'h1',
    content: 'Test Document',
    position: 0,
    attributes: {}
  },
  {
    id: 'syr-2',
    parent_id: null,
    tag_name: 'p',
    content: 'This is a test paragraph.',
    position: 1,
    attributes: {}
  }
]

const mockGlossaryEntities = [
  {
    name: 'Test Term',
    ontology: 'concept' as const,
    aliases: ['test', 'example'],
    brief_explanation: 'A test term for demonstration',
    long_explanation: 'This is a longer explanation of the test term.'
  }
]

function TestUnifiedLeftPane() {
  return (
    <div style={{ height: '100vh', width: '400px', border: '1px solid #ccc' }}>
      <UnifiedLeftPane
        content="<h1>Test Document</h1><p>This is a test paragraph.</p>"
        elements={mockElements}
        documentId="test-doc-1"
        markdownContent="# Test Document\n\nThis is a test paragraph."
        headingVisibility={new Map([['syr-1', 'visible']])}
        glossaryEntities={mockGlossaryEntities}
        isLoadingGlossary={false}
        showGlossary={true}
        glossaryError={null}
        onHeadingClick={(text, id) => console.log('Heading clicked:', text, id)}
        onLoadGlossary={() => console.log('Load glossary')}
        onScrollToEntity={(id) => console.log('Scroll to entity:', id)}
        documentContext="This is a test document context for the chat."
      />
    </div>
  )
}

export default TestUnifiedLeftPane