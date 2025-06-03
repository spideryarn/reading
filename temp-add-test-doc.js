// Temporary script to add a test document to the database
import { createClient } from './lib/supabase/server.js'
import { DocumentService } from './lib/services/database/documents.js'

const supabase = createClient()
const documentService = new DocumentService(supabase)

const testDoc = await documentService.create({
  title: 'Test Document',
  slug: 'test-document', 
  htmlContent: '<h1>Test Document</h1><p>This is a test document with some content for testing AI summarization features.</p><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>',
  plaintextContent: 'Test Document. This is a test document with some content for testing AI summarization features. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  createdBy: '00000000-0000-0000-0000-000000000001',
  isPublic: true
})

console.log('Created test document:', testDoc.id, testDoc.title)