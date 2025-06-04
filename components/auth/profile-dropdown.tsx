'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { User as UserIcon, SignOut, CaretDown } from '@phosphor-icons/react'

interface ProfileDropdownProps {
  user: User
}

export function ProfileDropdown({ user }: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const router = useRouter()

  const handleSignOut = async () => {
    setIsLoggingOut(true)
    
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Sign out error:', error)
    } finally {
      setIsLoggingOut(false)
      setIsOpen(false)
    }
  }

  // Get user initials for avatar
  const getInitials = (email: string) => {
    return email
      .split('@')[0]
      .split('.')
      .map(part => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2)
  }

  return (
    <div className="relative">
      {/* Dropdown Trigger */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 max-w-48"
      >
        {/* User Avatar */}
        <div className="w-6 h-6 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-xs font-medium">
          {getInitials(user.email || '')}
        </div>
        
        {/* Email (truncated) */}
        <span className="truncate text-sm">
          {user.email}
        </span>
        
        {/* Dropdown Arrow */}
        <CaretDown 
          size={14} 
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Content */}
          <Card className="absolute right-0 top-full mt-2 w-64 z-20 p-4 shadow-lg">
            <div className="space-y-4">
              {/* User Info */}
              <div className="pb-3 border-b border-gray-200">
                <p className="text-sm text-gray-600">Logged in as</p>
                <p className="font-medium text-gray-900 truncate">{user.email}</p>
              </div>
              
              {/* Menu Items */}
              <div className="space-y-2">
                <Link 
                  href="/auth/profile"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                >
                  <UserIcon size={16} />
                  Profile
                </Link>
                
                <button
                  onClick={handleSignOut}
                  disabled={isLoggingOut}
                  className="flex items-center gap-3 w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <SignOut size={16} />
                  {isLoggingOut ? 'Logging out...' : 'Log out'}
                </button>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}