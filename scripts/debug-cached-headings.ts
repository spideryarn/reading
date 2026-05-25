#!/usr/bin/env npx tsx

import { Cli, Command, Option } from 'clipanion'
import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import { DocumentParser } from '../lib/services/document-parser'
import { headingOperationsToMutation } from '../lib/services/heading-operations-mutation'
import { MutationEngine } from '../lib/services/mutation-engine'
import { headingOperationSchema } from '../lib/prompts/schemas/headings'
import type { Database } from '../lib/types/database-auto-generated'

/**
 * debug-cached-headings.ts  –  Diagnose cached AI-generated heading operations
 *
 * This CLI helper fetches the latest `headings` enhancement row for a document,
 * validates the stored operations schema, and runs MutationEngine validation so
 * you can quickly see if the cache is malformed or fails to apply.
 *
 * Usage examples:
 *   npx tsx scripts/debug-cached-headings.ts --slug my-doc-slug
 *   npx tsx scripts/debug-cached-headings.ts --doc 1234-uuid
 */

class DebugHeadingsCommand extends Command {
  static paths = [["debug-cached-headings"], Command.Default]

  static usage = Command.Usage({
    description: 'Validate cached AI heading operations for a document',
    examples: [[
      'By slug',
      'debug-cached-headings --slug some-document-slug'
    ], [
      'By document id',
      'debug-cached-headings --doc 123e4567-e89b-12d3-a456-426614174000'
    ]]
  })

  slug = Option.String('--slug', {
    description: 'Document slug (mutually exclusive with --doc)'
  })

  documentId = Option.String('--doc', {
    description: 'Document UUID (mutually exclusive with --slug)'
  })

  verbose = Option.Boolean('-v,--verbose', false, {
    description: 'Enable verbose output'
  })

  async execute(): Promise<number> {
    try {
      // Load env vars so local dev works out-of-the-box
      config({ path: resolve(process.cwd(), '.env.local') })

      if (!this.slug && !this.documentId) {
        this.context.stderr.write('❌ You must supply either --slug or --doc\n')
        return 1
      }

      if (this.slug && this.documentId) {
        this.context.stderr.write('❌ Provide only one of --slug or --doc, not both\n')
        return 1
      }

      const supabase = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      )

      // Resolve document id if we only have slug
      let docId = this.documentId
      if (!docId) {
        const { data: docRow, error } = await supabase
          .from('documents')
          .select('id')
          .eq('slug', this.slug!)
          .maybeSingle()
        if (error || !docRow) {
          this.context.stderr.write(`❌ Document not found for slug '${this.slug}'\n`)
          return 1
        }
        docId = docRow.id as string
      }

      this.context.stdout.write(`📄 Document id: ${docId}\n`)

      // Fetch headings enhancement row
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

      // Extract operations and validate JSON schema
      const opsRaw: unknown = (enhancement.content as any).operations
      const operations = Array.isArray(opsRaw) ? opsRaw : JSON.parse(opsRaw as string)

      try {
        headingOperationSchema.array().parse(operations)
      } catch (schemaErr) {
        this.context.stderr.write(`❌ Operations schema validation failed: ${(schemaErr as Error).message}\n`)
        return 1
      }
      this.context.stdout.write(`🔢 Loaded ${operations.length} heading operations (schema valid)\n`)

      // Run MutationEngine validation if HTML available
      const { data: docFull } = await supabase
        .from('documents')
        .select('html_content')
        .eq('id', docId)
        .maybeSingle()

      if (!docFull?.html_content) {
        this.context.stderr.write('⚠️  Document has no HTML content – skipping mutation validation\n')
        return 0
      }

      const parser = new DocumentParser()
      const elements = parser.parse(docFull.html_content, docId)

      const mutation = headingOperationsToMutation({ documentId: docId, operations })
      const validation = MutationEngine.validateMutation(elements, mutation)

      if (!validation.valid) {
        this.context.stderr.write(`❌ Mutation validation failed (${validation.errors.length} errors)\n`)
        validation.errors.forEach(e => this.context.stderr.write(`   • ${e}\n`))
        return 1
      }

      this.context.stdout.write('✅ Mutation validation succeeded – operations can be applied cleanly\n')
      return 0

    } catch (error) {
      this.context.stderr.write(`❌ Unexpected error: ${(error as Error).message}\n`)
      return 1
    }
  }
}

const cli = new Cli({ binaryName: 'debug-cached-headings' })
cli.register(DebugHeadingsCommand)
cli.runExit(process.argv.slice(2)) 