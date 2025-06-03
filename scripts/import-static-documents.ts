#!/usr/bin/env tsx

/**
 * Import Static Documents to Database
 * 
 * This script imports all documents from static/examples/ into the Supabase database.
 * It processes HTML files, extracts plaintext content, and stores them in the documents table.
 * 
 * Usage:
 *   npm run import-documents
 *   or
 *   npx tsx scripts/import-static-documents.ts
 */

import { readFile, readdir } from 'fs/promises'
import { join } from 'path'
import { createClient } from '@supabase/supabase-js'
import { DocumentParser } from '../lib/services/document-parser'
import type { Database } from '../lib/types/database'

// Load environment variables
import { config } from 'dotenv'
config({ path: '.env.local' })

const STATIC_EXAMPLES_PATH = join(process.cwd(), 'static', 'examples')

interface ImportResult {
  filename: string
  title: string
  documentId: string | null
  status: 'success' | 'error'
  error?: string
  wordCount?: number
}

class DocumentImporter {
  private supabase: ReturnType<typeof createClient<Database>>
  private parser: DocumentParser

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables. Please check .env.local')
    }

    this.supabase = createClient<Database>(supabaseUrl, supabaseKey)
    this.parser = new DocumentParser()
  }

  /**
   * Get all HTML files from static/examples directory
   */
  async getStaticDocuments(): Promise<{ filename: string; title: string }[]> {
    try {
      const files = await readdir(STATIC_EXAMPLES_PATH)
      
      return files
        .filter(file => file.endsWith('.html'))
        .map(filename => ({
          filename,
          title: filename.replace('.html', '')
        }))
    } catch (error) {
      console.error('Error reading static examples directory:', error)
      throw error
    }
  }

  /**
   * Generate URL-friendly slug from filename (for reference/logging)
   */
  private generateSlug(filename: string): string {
    return filename
      .replace('.html', '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }

  /**
   * Import a single document into the database
   */
  async importDocument(filename: string, title: string): Promise<ImportResult> {
    const result: ImportResult = {
      filename,
      title,
      documentId: null,
      status: 'error'
    }

    try {
      // Read HTML file
      const filePath = join(STATIC_EXAMPLES_PATH, filename)
      const htmlContent = await readFile(filePath, 'utf-8')
      
      // Parse HTML to get plaintext content
      const plaintextContent = this.parser.convertToMarkdown(htmlContent)
      
      // Calculate word count
      const wordCount = plaintextContent.trim().split(/\s+/).length

      // Check if document already exists (by title)
      const { data: existingDocs } = await this.supabase
        .from('documents')
        .select('id, title')
        .eq('title', title)
        .limit(1)

      if (existingDocs && existingDocs.length > 0) {
        console.log(`📄 Document "${title}" already exists with ID: ${existingDocs[0].id}`)
        result.documentId = existingDocs[0].id
        result.status = 'success'
        return result
      }

      // Generate slug from title
      const slug = this.generateSlug(filename)

      // Insert new document
      const { data: newDoc, error } = await this.supabase
        .from('documents')
        .insert({
          title,
          slug,
          html_content: htmlContent,
          plaintext_content: plaintextContent,
          word_count: wordCount,
          language_code: 'en',
          is_public: true,
          // Note: created_by is optional for now (no auth)
          // source_url could be added later if we track origins
        })
        .select('id')
        .single()

      if (error) {
        result.error = `Database error: ${error.message}`
        return result
      }

      result.documentId = newDoc.id
      result.status = 'success'
      result.wordCount = wordCount
      
      console.log(`✅ Imported: "${title}" (${wordCount} words) -> ID: ${newDoc.id}`)
      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      result.error = errorMessage
      console.error(`❌ Failed to import "${title}": ${errorMessage}`)
      return result
    }
  }

  /**
   * Import all static documents
   */
  async importAllDocuments(): Promise<ImportResult[]> {
    console.log('🚀 Starting document import from static/examples/')
    console.log(`📁 Source directory: ${STATIC_EXAMPLES_PATH}`)
    
    const staticDocs = await this.getStaticDocuments()
    console.log(`📋 Found ${staticDocs.length} HTML files to import`)
    
    if (staticDocs.length === 0) {
      console.log('⚠️  No HTML files found in static/examples/')
      return []
    }

    const results: ImportResult[] = []
    
    // Import documents sequentially to avoid overwhelming the database
    for (const { filename, title } of staticDocs) {
      const result = await this.importDocument(filename, title)
      results.push(result)
      
      // Small delay between imports
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return results
  }

  /**
   * Print summary of import results
   */
  printSummary(results: ImportResult[]): void {
    const successful = results.filter(r => r.status === 'success')
    const failed = results.filter(r => r.status === 'error')
    const totalWords = successful.reduce((sum, r) => sum + (r.wordCount || 0), 0)

    console.log('\n📊 Import Summary:')
    console.log(`✅ Successful: ${successful.length}`)
    console.log(`❌ Failed: ${failed.length}`)
    console.log(`📝 Total words imported: ${totalWords.toLocaleString()}`)

    if (successful.length > 0) {
      console.log('\n✅ Successfully imported documents:')
      successful.forEach(r => {
        const slug = this.generateSlug(r.filename)
        console.log(`   • "${r.title}" (${r.wordCount} words) - ID: ${r.documentId}`)
        console.log(`     Former slug: ${slug}`)
      })
    }

    if (failed.length > 0) {
      console.log('\n❌ Failed imports:')
      failed.forEach(r => {
        console.log(`   • "${r.title}": ${r.error}`)
      })
    }

    console.log('\n🔗 Next steps:')
    console.log('   1. Update document loading code to use database IDs instead of file slugs')
    console.log('   2. Test document pages with new database-loaded content')
    console.log('   3. Consider removing static files once migration is complete')
  }
}

async function main() {
  try {
    const importer = new DocumentImporter()
    const results = await importer.importAllDocuments()
    importer.printSummary(results)

    // Exit with error code if any imports failed
    const hasFailures = results.some(r => r.status === 'error')
    process.exit(hasFailures ? 1 : 0)

  } catch (error) {
    console.error('💥 Import script failed:', error)
    process.exit(1)
  }
}

// Run the script if called directly
if (require.main === module) {
  main()
}