#!/usr/bin/env npx tsx

import { execSync } from 'node:child_process'
import path from 'node:path'

try {
  console.log('📦  Applying local storage.objects ownership fix…')

  const migrationPath = path.resolve(__dirname, '../supabase/migrations/local/000_fix_storage_owner_local.sql')

  execSync(`supabase db psql < "${migrationPath}"`, {
    stdio: 'inherit',
  })

  console.log('✅  Ownership fix applied (or skipped if not needed).')
} catch (error) {
  console.error('❌  Failed to apply ownership fix:', (error as Error).message)
  process.exit(1)
} 