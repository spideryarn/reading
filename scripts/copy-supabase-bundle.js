const fs = require('fs')
const path = require('path')

// Source: pre-built UMD bundle shipped with supabase-js
const possibleSources = [
    path.join(__dirname, '..', 'node_modules', '@supabase', 'supabase-js', 'dist', 'supabase.min.js'),
    path.join(__dirname, '..', 'node_modules', '@supabase', 'supabase-js', 'dist', 'umd', 'supabase.js'),
]

const src = possibleSources.find(p => fs.existsSync(p))

if (!src) {
    console.warn('⚠️  Supabase bundle not found in expected locations. Skipping copy.')
    process.exit(0)
}

// Destination inside the Next.js public folder (served under /vendor)
const destDir = path.join(__dirname, '..', 'public', 'vendor')
const dest = path.join(destDir, 'supabase.min.js')

try {
    fs.mkdirSync(destDir, { recursive: true })
    fs.copyFileSync(src, dest)
    // eslint-disable-next-line no-console
    console.log(`✅ Supabase bundle copied to ${dest}`)
} catch (err) {
    // eslint-disable-next-line no-console
    console.warn('⚠️  Unable to copy Supabase bundle for E2E tests:', err.message)
    process.exit(0) // Do not fail install; tests will warn if missing
} 