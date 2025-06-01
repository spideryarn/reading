import Link from 'next/link'
import { readdirSync } from 'fs'
import { join } from 'path'
import { AppHeader } from '@/components/app-header'
import { Footer } from '@/components/footer'

interface Document {
  filename: string
  title: string
  slug: string
}

function getDocuments(): Document[] {
  const examplesDir = join(process.cwd(), 'static', 'examples')
  const files = readdirSync(examplesDir)
  
  return files
    .filter(file => file.endsWith('.html'))
    .map(filename => {
      // Remove .html extension and clean up title
      const title = filename.replace('.html', '')
      
      // Create URL-friendly slug from filename
      const slug = filename
        .replace('.html', '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      
      return { filename, title, slug }
    })
    .sort((a, b) => a.title.localeCompare(b.title))
}

export default function DocumentsPage() {
  const documents = getDocuments()
  
  return (
    <div className="min-h-screen">
      <AppHeader title="Documents" />
      
      <div className="pb-16 px-8">
        <div className="max-w-4xl mx-auto text-center py-16">
          <h1 className="text-5xl font-bold mb-4 text-gray-900">Spideryarn Reading</h1>
          <p className="text-xl text-gray-600">
            AI-assisted document reading and analysis application
          </p>
        </div>
      </div>
      
      <main className="max-w-4xl mx-auto px-8">
        
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Sample Documents</h2>
          <div className="grid gap-4">
            {documents.map(doc => (
              <Link
                key={doc.slug}
                href={`/documents/${doc.slug}`}
                className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <h3 className="font-medium">{doc.title}</h3>
                <p className="text-sm text-gray-500">Document: {doc.filename}</p>
              </Link>
            ))}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  )
}