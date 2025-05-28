import { readFile } from 'fs/promises'
import { readdirSync } from 'fs'
import { join } from 'path'
import { NextRequest } from 'next/server'

/**
 * API route to serve original HTML documents without any Spideryarn modifications.
 * 
 * This is implemented as an API route rather than a page route because Next.js's 
 * layout system makes it difficult to serve completely unmodified HTML. Page routes
 * always inherit the root layout (which includes the Spideryarn header), and there's
 * no clean way to bypass this. API routes, however, can return raw HTML with proper
 * Content-Type headers, allowing the browser to render the original document exactly
 * as it would appear when opened directly in a browser.
 */

function findDocumentBySlug(slug: string): { filename: string; title: string } | null {
  const examplesDir = join(process.cwd(), 'static', 'examples')
  const files = readdirSync(examplesDir)
  
  // Find the file that matches this slug
  const matchingFile = files.find(file => {
    if (!file.endsWith('.html')) return false
    
    const fileSlug = file
      .replace('.html', '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    
    return fileSlug === slug
  })
  
  if (!matchingFile) return null
  
  return {
    filename: matchingFile,
    title: matchingFile.replace('.html', '')
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const doc = findDocumentBySlug(slug)
  
  if (!doc) {
    return new Response('Document not found', { status: 404 })
  }

  const filePath = join(process.cwd(), 'static', 'examples', doc.filename)
  const html = await readFile(filePath, 'utf-8')
  
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  })
}