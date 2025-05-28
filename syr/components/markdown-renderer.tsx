import React from 'react'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  // Simple markdown to JSX converter for basic formatting
  // This handles the most common cases without needing a full markdown library
  
  const renderMarkdown = (text: string): React.ReactNode => {
    // Handle empty content
    if (!text) return null
    
    // Split by markdown patterns but keep the delimiters
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|`[^`]+`)/g)
    
    return parts.map((part, index) => {
      // Bold text **text**
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>
      }
      
      // Italic text *text* or _text_
      if ((part.startsWith('*') && part.endsWith('*')) || 
          (part.startsWith('_') && part.endsWith('_'))) {
        return <em key={index}>{part.slice(1, -1)}</em>
      }
      
      // Inline code `code`
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={index} className="font-mono text-sm bg-gray-100 px-1 py-0.5 rounded">
            {part.slice(1, -1)}
          </code>
        )
      }
      
      // Regular text
      return part
    })
  }
  
  return <span className={className}>{renderMarkdown(content)}</span>
}