#!/usr/bin/env node

/**
 * Delete a document by slug
 * Usage: npm run cleanup:document -- my-document-slug
 */

import { createClient } from '@supabase/supabase-js';
import { DocumentService } from '../lib/services/database/documents';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const slug = process.argv[2];
if (!slug) {
  console.error('Usage: npm run cleanup:document -- <slug>');
  console.error('Example: npm run cleanup:document -- my-document-title');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const documentService = new DocumentService(supabase);

async function main() {
  const document = await documentService.getBySlug(slug);
  
  if (!document) {
    console.error(`❌ Document not found: ${slug}`);
    process.exit(1);
  }

  console.log(`🗑️  Deleting "${document.title}"...`);
  const success = await documentService.deleteWithStorage(document.id);
  
  if (success) {
    console.log('✅ Deleted');
  } else {
    console.error('❌ Failed');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});