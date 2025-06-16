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
import { Trash } from '@phosphor-icons/react/dist/ssr/Trash'
import { CircleNotch } from '@phosphor-icons/react/dist/ssr/CircleNotch'

interface DeleteDocumentButtonProps {
  documentId: string
  documentTitle: string
  className?: string
  variant?: 'icon' | 'text'
}

export function DeleteDocumentButton({ 
  documentId, 
  documentTitle, 
  className,
  variant = 'icon'
}: DeleteDocumentButtonProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const router = useRouter()

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true)
    setDeleteError(null)
  }

  const handleDeleteConfirm = async () => {
    setIsDeleting(true)
    setDeleteError(null)

    try {
      const supabase = createClient()
      
      // Delete document using Supabase client - RLS handles authorization
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId)
      
      if (error) {
        throw new Error(error.message || 'Failed to delete document')
      }

      // Close dialog
      setDeleteDialogOpen(false)
      
      // Redirect to /read page
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

  return (
    <>
      <Button
        variant={variant === 'icon' ? 'ghost' : 'destructive'}
        size={variant === 'icon' ? 'icon-sm' : 'default'}
        onClick={handleDeleteClick}
        className={variant === 'icon' 
          ? `text-red-600 hover:text-red-700 hover:bg-red-50 ${className || ''}` 
          : className || ''
        }
        title={`Delete "${documentTitle}"`}
      >
        {variant === 'icon' ? (
          <Trash size={16} />
        ) : (
          <>
            <Trash size={16} className="mr-2" />
            Delete
          </>
        )}
      </Button>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent onKeyDown={(e) => {
          if (e.key === 'Enter' && !isDeleting) {
            e.preventDefault()
            handleDeleteConfirm()
          }
        }}>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{documentTitle}&rdquo;? This action cannot be undone.
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
    </>
  )
}