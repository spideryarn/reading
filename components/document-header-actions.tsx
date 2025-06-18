'use client'

interface DocumentHeaderActionsProps {
  slug: string
  storagePath: string | null
  originalFileType: string | null
}

export function DocumentHeaderActions({ slug, storagePath, originalFileType }: DocumentHeaderActionsProps) {
  // Clean header with no action buttons - all functionality moved to vertical icon rail
  return null
}