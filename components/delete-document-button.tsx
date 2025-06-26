'use client'

import { Button } from '@/components/ui/button'
import { Trash } from '@phosphor-icons/react/dist/ssr/Trash'
import { useDeleteDocument, type DocumentMetadata } from '@/lib/hooks/use-delete-document'

interface DeleteDocumentButtonProps {
  documentId: string
  documentTitle: string
  className?: string
  variant?: 'icon' | 'text'
  // Optional metadata for enhanced dialog
  uploadDate?: string
  wordCount?: number
  fileSizeKB?: number
}

export function DeleteDocumentButton({ 
  documentId, 
  documentTitle, 
  className,
  variant = 'icon',
  uploadDate,
  wordCount,
  fileSizeKB
}: DeleteDocumentButtonProps) {
  const metadata: DocumentMetadata = {
    id: documentId,
    title: documentTitle,
    uploadDate,
    wordCount,
    fileSizeKB
  }

  const { triggerDelete, DeleteDialog } = useDeleteDocument(metadata)

  return (
    <>
      <Button
        variant={variant === 'icon' ? 'ghost' : 'destructive'}
        size={variant === 'icon' ? 'icon-sm' : 'default'}
        onClick={triggerDelete}
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

      <DeleteDialog />
    </>
  )
}