'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { ArrowLeft } from '@phosphor-icons/react'

const resetPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: '',
    },
  })

  const onSubmit = async (data: ResetPasswordForm) => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth/reset-password/confirm`,
      })

      if (error) {
        setError(error.message)
      } else {
        setEmailSent(true)
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Check your email
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              We've sent a password reset link to <strong>{form.getValues('email')}</strong>
            </p>
          </div>
          
          <div className="mt-8 bg-white py-8 px-6 shadow rounded-lg sm:px-10">
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-600">
                Click the link in the email to reset your password. 
                The link will expire in 1 hour.
              </p>
              
              <div className="space-y-2">
                <Link href="/auth/login">
                  <Button variant="outline" size="full">
                    Back to Login
                  </Button>
                </Link>
                
                <button
                  onClick={() => {
                    setEmailSent(false)
                    form.reset()
                  }}
                  className="text-sm text-orange-600 hover:text-orange-700 transition-colors"
                >
                  Send another email
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <Link 
            href="/auth/login"
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-700 transition-colors mb-6"
          >
            <ArrowLeft size={16} />
            Back to Login
          </Link>
          
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Reset your password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>
        </div>
        
        <div className="mt-8 bg-white py-8 px-6 shadow rounded-lg sm:px-10">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  {error}
                </Alert>
              )}

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email address</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter your email"
                        autoComplete="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                size="full"
                variant="orange"
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : 'Send reset link'}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  )
}