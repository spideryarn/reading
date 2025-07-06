import { NextResponse } from 'next/server'

/**
 * Lightweight health-check endpoint.
 * Returns immediately with 200 OK so dev/E2E tooling can verify that
 * the Next.js dev server has compiled routes and is accepting requests.
 */
export async function GET() {
  return NextResponse.json({ status: 'ok' })
}

// Allow HEAD for curl-style probes without body
export const runtime = 'edge' 