import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DeleteDocumentButton } from '@/components/delete-document-button'
import { TooltipOrPopover } from '@/components/ui/tooltip-or-popover'
import { FileText, Clock, Globe, Lock } from '@phosphor-icons/react/dist/ssr'
import type { Document } from '@/lib/types/database'

interface DocumentListProps {
  documents: Document[]
  emptyStateMessage: string
  showDeleteActions?: boolean
  currentUserId?: string
  className?: string
}

export function DocumentList({
  documents,
  emptyStateMessage,
  showDeleteActions = false,
  currentUserId,
  className = '',
}: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <FileText size={48} className="mx-auto text-gray-400 mb-4" />
        <p className="text-gray-600 mb-4">{emptyStateMessage}</p>
        <Link href="/upload">
          <Button variant="orange">Upload Your First Document</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {documents.map((document) => {
        const canDelete = showDeleteActions && currentUserId && document.created_by === currentUserId
        
        return (
          <Card 
            key={document.id} 
            className="p-0 overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              {/* Main clickable area */}
              <Link
                href={`/read/${document.slug}`}
                className="flex-1 min-w-0 p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Title */}
                    <h3 className="font-medium text-gray-900 hover:text-orange-600 transition-colors leading-tight">
                      {document.title}
                    </h3>
                    
                    
                    {/* Metadata row */}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      {/* Creation date */}
                      {document.created_at && (
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                          {new Date(document.created_at).toLocaleDateString('en-GB')}
                        </div>
                      )}
                      
                      {/* Word count */}
                      {document.word_count && (
                        <div>{document.word_count.toLocaleString()} words</div>
                      )}
                      
                      {/* Language indicator for non-English */}
                      {document.language_code && document.language_code !== 'en' && (
                        <div>{document.language_code.toUpperCase()}</div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
              
              {/* Action buttons area */}
              <div className="px-4 py-4 flex items-center gap-2 flex-shrink-0 border-l border-gray-100">
                {/* Public/Private indicator with tooltip */}
                <TooltipOrPopover
                  content={
                    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                      <div className="text-sm text-gray-700">
                        {document.is_public === true ? (
                          <>This document is <strong>public</strong> and can be viewed by anyone with the link.</>
                        ) : (
                          <>This document is <strong>private</strong> and can only be viewed by you.</>
                        )}
                      </div>
                    </div>
                  }
                  side="top"
                  align="center"
                  sideOffset={8}
                  showIndicator={false}
                  contentClassName="p-0 bg-transparent border-0 shadow-none"
                >
                  <div className="p-1">
                    {document.is_public === true ? (
                      <Globe size={16} className="text-green-600" />
                    ) : (
                      <Lock size={16} className="text-gray-500" />
                    )}
                  </div>
                </TooltipOrPopover>
                
                {/* Delete button - only shown if user can delete */}
                {canDelete && (
                  <DeleteDocumentButton
                    documentId={document.id}
                    documentTitle={document.title}
                  />
                )}
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}