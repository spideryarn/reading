#!/usr/bin/env npx tsx
/*
  reapply-headings-cache.ts - Reproduce and verify cached AI-generated heading operations

  This script loads a document's cached `headings` enhancement row, replays the
  operations with the MutationEngine and demonstrates the bug that occurred
  when operations were applied **one-by-one** (validation failure), then shows
  that applying the same operations in a **single batched mutation** succeeds.

  Usage examples:
    reapply-headings-cache                         # default slug
    reapply-headings-cache --slug my-doc-slug      # specific document slug
    reapply-headings-cache --doc 1234-uuid         # use document id directly

  The script exits non-zero if the batched application fails (regression).
*/

import { Cli, Command, Option } from 'clipanion'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { DocumentParser } from '../lib/services/document-parser'
import { headingOperationsToMutation } from '../lib/services/heading-operations-mutation'
import { MutationEngine } from '../lib/services/mutation-engine'
import type { HeadingOperation } from '../lib/prompts/schemas/headings'
import type { DocumentElement } from '../lib/types/document'
import type { Database } from '../lib/types/database-auto-generated'
import { resolve } from 'path'

class ReapplyHeadingsCommand extends Command {
  static paths = [[`reapply-headings-cache`], Command.Default]

  static usage = Command.Usage({
    description: 'Replay cached AI-generated heading operations and verify application flow',
    examples: [
      ['Default document (Chalmers 1995)', 'reapply-headings-cache'],
      ['Specific slug', 'reapply-headings-cache --slug my-doc'],
      ['Specific document id', 'reapply-headings-cache --doc 1234-uuid']
    ]
  })

  slug = Option.String('--slug', 'chalmers-1995-facing-up-to-the-problem-of-consciousness', {
    description: 'Document slug to load (ignored if --doc passed)'
  })

  documentId = Option.String('--doc', {
    description: 'Document id (UUID) – bypass slug lookup'
  })

  verbose = Option.Boolean('-v,--verbose', false, {
    description: 'Verbose output'
  })

  async execute(): Promise<number> {
    try {
      config({ path: resolve(process.cwd(), '.env.local') })

      const supabase = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      )

      // 1. Resolve document id
      let docId = this.documentId
      if (!docId) {
        const { data: docRow, error } = await supabase
          .from('documents')
          .select('id')
          .eq('slug', this.slug)
          .maybeSingle()
        if (error || !docRow) {
          this.context.stderr.write(`❌ Document not found for slug '${this.slug}'\n`)
          return 1
        }
        docId = docRow.id as string
      }
      this.context.stdout.write(`📄 Document id: ${docId}\n`)

      // 2. Fetch headings enhancement row
      const { data: enhancement, error: enhErr } = await supabase
        .from('document_enhancements')
        .select('*')
        .eq('document_id', docId)
        .eq('type', 'headings')
        .eq('subtype', 'default')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (enhErr || !enhancement) {
        this.context.stderr.write('❌ No headings enhancement row found\n')
        return 1
      }
      this.context.stdout.write(`✨ Enhancement row id: ${enhancement.id}\n`)

      // 3. Extract operations
      const opsRaw: unknown = (enhancement.content as any).operations
      const operations: HeadingOperation[] = Array.isArray(opsRaw) ? opsRaw : JSON.parse(opsRaw as string)
      this.context.stdout.write(`🔢 Loaded ${operations.length} heading operations\n`)

      // 4. Parse HTML
      const { data: docRowFull } = await supabase
        .from('documents')
        .select('html_content')
        .eq('id', docId)
        .maybeSingle()

      if (!docRowFull?.html_content) {
        this.context.stderr.write('❌ Failed to retrieve html_content\n')
        return 1
      }
      const parser = new DocumentParser()
      const originalElements: DocumentElement[] = parser.parse(docRowFull.html_content, docId)
      this.context.stdout.write(`📑 Document parsed into ${originalElements.length} elements\n`)

      // Helper for cloning
      const clone = (els: DocumentElement[]) => els.map(el => ({ ...el }))

      /* ---- Phase A: sequential replay (should fail previously) ---- */
      let seqElements = clone(originalElements)
      let sequentialOk = true
      for (let i = 0; i < operations.length; i++) {
        const mut = headingOperationsToMutation({ documentId: docId, operations: [operations[i]] })
        const res = MutationEngine.applyMutation(seqElements, mut)
        if (!res.success) {
          this.context.stdout.write(`⚠️  Sequential replay failed at op ${i + 1}: ${res.error}\n`)
          sequentialOk = false
          break
        }
        seqElements = res.document!
      }
      if (sequentialOk) {
        this.context.stdout.write('✅ Sequential replay succeeded (no bug)\n')
      }

      /* ---- Phase B: batched replay ---- */
      const batchedMutation = headingOperationsToMutation({ documentId: docId, operations })
      const batchRes = MutationEngine.applyMutation(clone(originalElements), batchedMutation)
      if (!batchRes.success) {
        this.context.stderr.write(`❌ Batched apply failed: ${batchRes.error}\n`)
        return 1
      }
      this.context.stdout.write(`✅ Batched apply succeeded (inserted ${batchRes.changes?.inserted}, replaced ${batchRes.changes?.replaced})\n`)

      // Print outline if verbose
      if (this.verbose) {
        const newHeadings = batchRes.document!.filter(el => el.tag_name.match(/^h[1-6]$/i))
        this.context.stdout.write('\nNew heading outline (batched):\n')
        newHeadings.forEach(el => this.context.stdout.write(`  ${el.tag_name.toUpperCase()}  ${el.content}\n`))
      }

      this.context.stdout.write('\n🎉 Script completed without errors\n')
      return 0
    } catch (err: any) {
      this.context.stderr.write(`❌ Unexpected error: ${err.message}\n`)
      return 1
    }
  }
}

const cli = new Cli({
  binaryLabel: 'AI-Heading Cache Replayer',
  binaryName: 'reapply-headings-cache',
  binaryVersion: '1.0.0'
})
cli.register(ReapplyHeadingsCommand)
cli.runExit(process.argv.slice(2)) 