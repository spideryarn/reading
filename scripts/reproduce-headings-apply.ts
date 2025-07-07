#!/usr/bin/env npx tsx
/*
  Reproduce and debug the AI-headings cache re-apply path for a single document.

  Usage:
    npx ts-node scripts/reproduce-headings-apply.ts --slug <document-slug>

  Defaults to the Chalmers 1995 test document if no slug supplied.

  The script will:
    1. Fetch the document and its AI-generated headings enhancement row
    2. Parse the HTML into DocumentElement[]
    3. Attempt to re-apply the cached heading operations sequentially –
       mirroring the current StructurePanel behaviour (expected to fail)
    4. Apply the same operations in a single batched mutation – expected to succeed
*/

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { DocumentParser } from '../lib/services/document-parser'
import { headingOperationsToMutation } from '../lib/services/heading-operations-mutation'
import { MutationEngine } from '../lib/services/mutation-engine'
import { HeadingOperation } from '../lib/prompts/schemas/headings'
import type { DocumentElement } from '../lib/types/document'
import type { Database } from '../lib/types/database-auto-generated'

dotenv.config({ path: '.env.local' })

type DocRow = Database['public']['Tables']['documents']['Row']

(async function main() {
  // Very small arg parser – look for --slug <value>
  let slug = 'chalmers-1995-facing-up-to-the-problem-of-consciousness'
  const slugFlagIdx = process.argv.indexOf('--slug')
  if (slugFlagIdx !== -1 && slugFlagIdx + 1 < process.argv.length) {
    slug = process.argv[slugFlagIdx + 1]
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
    // use service-role if available for guaranteed read access
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
  )

  console.log(`🔍 Looking up document with slug '${slug}'`)
  const { data: doc, error: docErr } = await supabase
    .from('documents')
    .select('*')
    .eq('slug', slug)
    .maybeSingle<DocRow>()

  if (docErr || !doc) {
    throw new Error(`Document not found: ${docErr?.message}`)
  }
  console.log(`📄 Document id = ${doc.id}`)

  // Fetch headings enhancement row
  const { data: enh, error: enhErr } = await supabase
    .from('document_enhancements')
    .select('*')
    .eq('document_id', doc.id)
    .eq('type', 'headings')
    .eq('subtype', 'default')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (enhErr || !enh) {
    throw new Error(`No headings enhancement row found: ${enhErr?.message}`)
  }
  console.log(`✨ Enhancement id = ${enh.id}`)

  // Parse operations (handle legacy string storage)
  const ops: HeadingOperation[] = Array.isArray((enh.content as any).operations)
    ? (enh.content as any).operations
    : JSON.parse((enh.content as any).operations)
  console.log(`🔢 ${ops.length} operations loaded from DB`)

  // Parse HTML into elements
  const parser = new DocumentParser()
  const originalElements: DocumentElement[] = parser.parse(doc.html_content, doc.id)
  console.log(`📑 Parsed document into ${originalElements.length} elements`)

  // Helper: deep clone of elements array
  const cloneElements = (els: DocumentElement[]) => els.map(el => ({ ...el }))

  /* ------------------------------------------------------------------ */
  /* Phase A – sequential re-apply (expected to fail mid-way)           */
  /* ------------------------------------------------------------------ */
  let sequentialOk = true
  let seqElements = cloneElements(originalElements)
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i]
    const mut = headingOperationsToMutation({ documentId: doc.id, operations: [op] })
    const res = MutationEngine.applyMutation(seqElements, mut)
    if (!res.success) {
      console.error(`❌ Sequential apply failed at op ${i + 1}/${ops.length}:`, res.error)
      sequentialOk = false
      break
    }
    seqElements = res.document!
  }
  if (sequentialOk) {
    console.log('✅ Sequential replay unexpectedly succeeded')
  } else {
    console.log('⚠️  Sequential replay failed – this matches the UI bug')
  }

  /* ------------------------------------------------------------------ */
  /* Phase B – batched apply (expected success)                         */
  /* ------------------------------------------------------------------ */
  const batchMut = headingOperationsToMutation({ documentId: doc.id, operations: ops })
  const batchRes = MutationEngine.applyMutation(cloneElements(originalElements), batchMut)
  if (!batchRes.success) {
    throw new Error(`Batched apply failed: ${batchRes.error}`)
  }
  console.log(`✅ Batched apply succeeded. Inserted: ${batchRes.changes?.inserted}, Replaced: ${batchRes.changes?.replaced}, Removed: ${batchRes.changes?.removed}`)

  // Show the new headings text for quick visual confirmation
  const newH = batchRes.document!.filter(el => el.tag_name.match(/^h[1-6]$/i))
  console.log('\nNew heading outline:')
  newH.forEach(el => console.log(`  ${el.tag_name.toUpperCase()}  ${el.content}`))

  console.log('\n🎉 Reproduction script completed.')
})() 