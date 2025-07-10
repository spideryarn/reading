import { createRequire } from 'node:module'

/**
 * Reproduce canvas/native-addon ABI mismatch issues on the current machine.
 *
 * 1. Attempts to dynamically `import('@napi-rs/canvas')` – the preferred backend.
 * 2. Falls back to `import('canvas')` – mirrors the production fallback logic.
 *
 * Useful for iterating locally (`npx tsx scripts/tests/repro-canvas-import.ts`)
 * until both imports succeed (or the fallback is no longer needed).
 */

async function tryImport (id: string): Promise<void> {
  process.stdout.write(`Trying to import "${id}" … `)
  try {
    // Dynamic import keeps TypeScript happy without requiring typings.
    const mod = await import(id as string)
    // Touch a common export to ensure the native binding is fully initialised.
    const keys = Object.keys(mod)
    console.log('✅ success', keys.slice(0, 5).join(', ') + (keys.length > 5 ? '…' : ''))
  } catch (err) {
    console.error('\n❌ failed:', (err as any)?.message || err)
    throw err
  }
}

async function main (): Promise<void> {
  // 1️⃣ Try the N-API canvas first (what we want in production)
  try {
    await tryImport('@napi-rs/canvas')
    console.log('\n@napi-rs/canvas works – you are good to go ✅')
    return
  } catch {
    console.warn('\nFalling back to node-canvas…')
  }

  // 2️⃣ Fallback to node-canvas to replicate the server fallback path
  await tryImport('canvas')
  console.log('\nnode-canvas loaded – no ABI mismatch ⚠️')
}

main().catch(() => process.exit(1)) 