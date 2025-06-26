'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertWithIcon } from '@/components/ui/alert'
import { CircleNotch } from '@phosphor-icons/react'

interface BackgroundFormProps {
  initialBackground: string
}

export function BackgroundForm({ initialBackground }: BackgroundFormProps) {
  const [background, setBackground] = useState(initialBackground || '')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()

  const saveBackground = async () => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/profile/background', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          background: background.trim(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update background')
      }

      setSuccess('Background updated successfully')
      router.refresh() // Refresh to show updated data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await saveBackground()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      saveBackground()
    }
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Background Information</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            {error}
          </Alert>
        )}
        
        {success && (
          <AlertWithIcon
            variant="success"
            description={success}
          />
        )}

        <div>
          <label htmlFor="background" className="text-sm font-medium text-gray-600 block mb-2">
            Tell us about yourself (optional)
          </label>
          <Textarea
            id="background"
            value={background}
            onChange={(e) => setBackground(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Share any relevant background information that might help personalise your reading experience..."
            rows={4}
            className="resize-none"
            disabled={isLoading}
          />
          <p className="text-xs text-gray-500 mt-1">
            This information helps provide more personalised AI-generated summaries and insights.{' '}
            <span className="font-medium">Press Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux) to save.</span>
          </p>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isLoading}
            className="px-6"
          >
            {isLoading ? (
              <>
                <CircleNotch className="animate-spin mr-2" size={16} />
                Saving...
              </>
            ) : (
              'Save Background'
            )}
          </Button>
        </div>
      </form>
    </Card>
  )
}