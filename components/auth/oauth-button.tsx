'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getRedirectUrl } from '@/lib/auth/client-utils'
import { Button } from '@/components/ui/button'
import { GoogleIcon } from './google-icon'

interface OAuthButtonProps {
  provider: 'google'
  children: React.ReactNode
  disabled?: boolean
}

export function OAuthButton({ provider, children, disabled }: OAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = getRedirectUrl(searchParams, '/')

  const handleOAuthSignIn = async () => {
    setIsLoading(true)

    try {
      const supabase = createClient()
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectUrl)}`,
        },
      })

      if (error) {
        console.error(`${provider} OAuth error:`, error)
        // The error will be handled by the callback route
      }
    } catch (err) {
      console.error(`${provider} OAuth error:`, err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="full"
      onClick={handleOAuthSignIn}
      disabled={disabled || isLoading}
      className="flex items-center justify-center gap-2"
    >
      {isLoading ? (
        'Connecting...'
      ) : (
        <>
          <GoogleIcon size={20} />
          {children}
        </>
      )}
    </Button>
  )
}