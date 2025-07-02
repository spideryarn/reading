'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CircleNotch } from '@phosphor-icons/react/dist/ssr/CircleNotch'
import { formatDistanceToNow } from 'date-fns'

export interface DocumentMetadata {
  id: string
  title: string
  uploadDate?: string
  wordCount?: number
  fileSizeKB?: number
}

export function useDeleteDocument(metadata: DocumentMetadata) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const router = useRouter()

  const triggerDelete = () => {
    setDeleteDialogOpen(true)
    setDeleteError(null)
  }

  const handleDeleteConfirm = async () => {
    setIsDeleting(true)
    setDeleteError(null)

    try {
      // Use API route for proper storage cleanup
      const response = await fetch('/api/delete-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: metadata.id })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }))
        throw new Error(errorData.error || 'Failed to delete document')
      }

      // Close dialog and redirect
      setDeleteDialogOpen(false)
      router.push('/read')
      
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred while deleting the document.'
      setDeleteError(errorMessage)
      console.error('Delete error:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false)
    setDeleteError(null)
  }

  // Enhanced description with metadata
  const getDialogDescription = () => {
    const parts = [`Are you sure you want to delete "${metadata.title}"?`]
    
    if (metadata.uploadDate) {
      parts.push(`• Uploaded: ${formatDistanceToNow(new Date(metadata.uploadDate))} ago`)
    }
    if (metadata.fileSizeKB) {
      const sizeMB = metadata.fileSizeKB / 1024
      parts.push(`• Size: ${sizeMB >= 1 ? `${sizeMB.toFixed(1)} MB` : `${metadata.fileSizeKB.toFixed(0)} KB`}`)
    }
    if (metadata.wordCount) {
      parts.push(`• Word count: ${metadata.wordCount.toLocaleString()} words`)
    }
    
    parts.push('This action cannot be undone.')
    return parts.join('\n')
  }

  const DeleteDialog = () => (
    <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <DialogContent onKeyDown={(e) => {
        if (e.key === 'Enter' && !isDeleting) {
          e.preventDefault()
          handleDeleteConfirm()
        }
      }}>
        <DialogHeader>
          <DialogTitle>Delete Document</DialogTitle>
          <DialogDescription className="whitespace-pre-line">
            {getDialogDescription()}
          </DialogDescription>
        </DialogHeader>
        
        {deleteError && (
          <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
            <div className="font-medium mb-1">Delete failed</div>
            <div>{deleteError}</div>
          </div>
        )}
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleDeleteCancel}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  return {
    triggerDelete,
    DeleteDialog,
    isDeleting,
    deleteError
  }
}