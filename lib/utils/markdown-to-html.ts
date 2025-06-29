/**
 * Lightweight markdown to HTML converter for tooltips and dynamic content.
 * 
 * This utility provides a simple conversion from basic markdown patterns to HTML,
 * matching the functionality of the MarkdownRenderer component but for use in
 * dynamic HTML contexts like tooltips.
 */

export function markdownToHtml(text: string): string {
  if (!text) return ''
  
  // Handle basic markdown patterns
  let html = text
  
  // Bold text **text**
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  
  // Italic text *text* or _text_
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>')
  
  // Inline code `code`
  html = html.replace(/`([^`]+)`/g, '<code class="font-mono text-sm bg-gray-100 px-1 py-0.5 rounded">$1</code>')
  
  // Convert line breaks
  html = html.replace(/\n/g, '<br>')
  
  return html
}