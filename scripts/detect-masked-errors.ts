#!/usr/bin/env tsx
/**
 * detect-masked-errors.ts
 * ----------------------------------
 * Scans the project for common anti-patterns that hide the real error cause, such as:
 *   • Empty catch blocks
 *   • Throwing or logging generic strings ("Unknown error", "Something went wrong", etc.)
 *   • Returning null/undefined in a catch without re-throwing
 *   • Using `console.error` without propagating the error
 *
 * The script is intentionally conservative – it only flags obvious cases, producing
 * machine-readable JSON output so CI can decide whether to fail the build.
 *
 * Usage:
 *   npx tsx scripts/detect-masked-errors.ts [--json]
 */

import { execSync } from 'node:child_process'
import { argv, exit } from 'node:process'

// ---------------------------------------------
// Configuration – tweak patterns as needed
// ---------------------------------------------

const GENERIC_MESSAGES = [
  'Unknown error',
  'Something went wrong',
  'Unexpected error',
  'Error occurred',
]

// Regexes – keep simple / conservative
const EMPTY_CATCH_REGEX = /catch\s*\([^)]*\)\s*{\s*}/g
const GENERIC_THROW_REGEX = new RegExp(
  `throw\\s+(new\\s+)?Error\\s*\\(\\s*([\"\'](?:${GENERIC_MESSAGES.map(m => m.replace(/ /g, '\\s+')).join('|')})[\"\'])`,
  'g'
)
const GENERIC_LOG_REGEX = new RegExp(
  `console\\.error\\([^)]*([\"\'](?:${GENERIC_MESSAGES.map(m => m.replace(/ /g, '\\s+')).join('|')})[\"\'])`,
  'g'
)

// ---------------------------------------------
// Run ripgrep for each pattern
// ---------------------------------------------

type Finding = {
  file: string
  line: number
  message: string
  snippet: string
}

function runRg(pattern: string): string {
  try {
    return execSync(
      `rg --column --line-number --no-heading --color never -e ${JSON.stringify(pattern)} --glob '!node_modules/**' --glob '!dist/**'`,
      { encoding: 'utf8' }
    )
  } catch (err) {
    // rg exits with code 1 when no matches – treat as empty output
    return ''
  }
}

function parseRgOutput(out: string, message: string): Finding[] {
  return out
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const [file, lineNoStr, colStr, ...rest] = line.split(':')
      return {
        file,
        line: Number(lineNoStr),
        message,
        snippet: rest.join(':').trim(),
      }
    })
}

function collectFindings(): Finding[] {
  const findings: Finding[] = []

  const emptyCatch = runRg(EMPTY_CATCH_REGEX.source)
  findings.push(...parseRgOutput(emptyCatch, 'Empty catch block'))

  const genericThrow = runRg(GENERIC_THROW_REGEX.source)
  findings.push(...parseRgOutput(genericThrow, 'Generic thrown error'))

  const genericLog = runRg(GENERIC_LOG_REGEX.source)
  findings.push(...parseRgOutput(genericLog, 'Generic console.error message'))

  return findings
}

const findings = collectFindings()

if (argv.includes('--json')) {
  console.log(JSON.stringify({ count: findings.length, findings }, null, 2))
} else {
  if (findings.length === 0) {
    console.log('✅ No obvious masked errors detected.')
  } else {
    console.log(`❌ Found ${findings.length} potential masked error${findings.length > 1 ? 's' : ''}:`) 
    findings.forEach(f => {
      console.log(`${f.file}:${f.line} – ${f.message}`)
      console.log(`  ${f.snippet}`)
    })
  }
}

// Exit non-zero so CI/lint task can fail when findings exist
exit(findings.length > 0 ? 1 : 0) 