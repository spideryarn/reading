'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { User as UserIcon, SignOut, CaretDown } from '@phosphor-icons/react'

interface ProfileDropdownProps {
  user: User
}

export function ProfileDropdown({ user }: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen])

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
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded-lg transition-colors"
      >
        {/* User Avatar */}
        <div className="w-8 h-8 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-sm font-medium">
          {getInitials(user.email || '')}
        </div>
        
        {/* Dropdown Arrow */}
        <CaretDown 
          size={14} 
          className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
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
      )}
    </div>
  )
}