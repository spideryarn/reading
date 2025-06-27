'use client'

// Extracted tab components from TableOfContents for use in unified left pane
// See docs/UNIFIED_LEFT_PANE_TABBED_NAVIGATION.md for architecture and usage patterns
// See docs/TOOL_SUMMARISE.md for tooltip summarisation feature details
// See docs/MUTATIONS_DOCUMENT_CONTENT_REVERSIBLE_TRANSFORMS.md for document mutation system

import { MultiSummaryPane } from './multi-summary-pane'

// Shared types
interface BaseTabProps {
  content: string
  elements?: DocumentElement[]
  onHeadingClick?: (headingText: string, headingId?: string) => void
  documentId: string
  markdownContent?: string
  headingVisibility?: Map<string, 'visible' | 'not-visible'>
}



/**
 * Document Summary Tab Component
 * Displays an AI-generated summary of the entire document
 */
export function DocumentSummaryTab({ markdownContent, documentId }: BaseTabProps) {
  return <MultiSummaryPane content={markdownContent || ""} documentId={documentId} autoActivate />
}