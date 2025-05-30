'use client'

import { useEffect, useRef } from 'react'
import { X } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

interface DialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function Dialog({ isOpen, onClose, title, children }: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.addEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
      <div 
        ref={dialogRef}
        className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[calc(100vh-2rem)] overflow-y-auto my-auto"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <Button
            onClick={onClose}
            variant="ghost-gray"
            size="icon-sm"
            aria-label="Close dialog"
          >
            <X size={20} />
          </Button>
        </div>
        
        <div className="p-4">
          {children}
        </div>
        
        <div className="flex justify-end p-4 border-t bg-gray-50">
          <Button
            onClick={onClose}
            variant="blue"
          >
            OK
          </Button>
        </div>
      </div>
    </div>
  )
}