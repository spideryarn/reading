'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command'
import { useDocumentSlug } from '@/lib/context/document-communication-context'
import { useNavigateToTab } from '@/lib/tools/hooks/use-tool-url-state'
import { type TabValue } from '@/lib/tools/url-state-types'
import { useAuth } from '@/lib/context/auth-context'
import {
  House,
  Upload,
  User,
  SignIn,
  UserPlus,
  SignOut,
  TwitterLogo,
  FileText,
  Robot,
} from '@phosphor-icons/react'
import { generateCommandsFromRegistry } from '@/lib/tools/command-generation'
import { getAllTools } from '@/lib/tools/registry'

// Command definition interfaces
interface Command {
  id: string
  name: string
  keywords?: string[]
  shortcut?: string[]
  category: CommandCategory
  action: () => void | Promise<void>
  condition?: () => boolean
  icon?: React.ComponentType<{ size?: number; className?: string }>
}

interface CommandCategory {
  id: string
  name: string
  priority: number
}

// Command categories with priorities for ordering
const NAVIGATION_CATEGORY: CommandCategory = {
  id: 'navigation',
  name: 'Navigation',
  priority: 1,
}

const DOCUMENT_ACTIONS_CATEGORY: CommandCategory = {
  id: 'document-actions',
  name: 'Document Actions',
  priority: 2,
}

const APP_NAVIGATION_CATEGORY: CommandCategory = {
  id: 'app-navigation',
  name: 'App Navigation',
  priority: 3,
}

const ACCOUNT_CATEGORY: CommandCategory = {
  id: 'account',
  name: 'Account',
  priority: 4,
}

interface CommandPaletteProps {
  className?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function CommandPalette({ open: externalOpen, onOpenChange }: CommandPaletteProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  
  // Use external control if provided, otherwise use internal state
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen
  const documentSlug = useDocumentSlug()
  const router = useRouter()
  const { user, signOut } = useAuth()
  const navigateToTab = useNavigateToTab()

  // Platform detection for keyboard shortcuts
  const isMac = typeof window !== 'undefined' && 
               /Mac|iPod|iPhone|iPad/.test(window.navigator.platform)

  // Generate dynamic tool commands from registry
  const generateToolCommands = useCallback((): Command[] => {
    try {
      const tools = getAllTools()
      const generatedCommands = generateCommandsFromRegistry(tools, {
        getNavigateToTab: () => navigateToTab,
        getCurrentDocument: () => documentSlug ? { id: documentSlug } : null,
        isMac,
      })

      // Convert GeneratedCommand to Command format
      return generatedCommands.map(genCmd => ({
        id: genCmd.id,
        name: genCmd.name,
        keywords: genCmd.keywords,
        shortcut: genCmd.shortcut,
        category: {
          id: genCmd.category.id,
          name: genCmd.category.name,
          priority: genCmd.category.priority,
        },
        action: genCmd.action,
        condition: genCmd.condition,
        icon: genCmd.icon,
      }))
    } catch (error) {
      console.error('Failed to generate tool commands:', error)
      return [] // Graceful fallback
    }
  }, [navigateToTab, documentSlug, isMac])

  // Enhanced navigation with error handling
  const navigateWithErrorHandling = useCallback(async (path: string) => {
    try {
      router.push(path)
    } catch (error) {
      console.error('Navigation error:', error)
      // Could add toast notification here in the future
    }
  }, [router])

  // Handle logout
  const handleLogout = useCallback(async () => {
    try {
      const { error } = await signOut()
      if (error) {
        console.error('Logout error:', error)
        return
      }
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }, [signOut, router])

  // --- New: close palette on Escape once the input is already empty ---
  const handleGlobalEscape = useCallback(
    (event: KeyboardEvent) => {
      if (!open) return
      if (event.key === 'Escape') {
        // If focus is inside the CommandInput, only close when the input is empty.
        event.preventDefault()
        setOpen(false)
      }
    },
    [open, setOpen]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleGlobalEscape)
    return () => window.removeEventListener('keydown', handleGlobalEscape)
  }, [handleGlobalEscape])
  // --- End new code ---

  // Define all commands
  const commands: Command[] = [
    // Dynamic tool commands from registry
    ...generateToolCommands(),

    // Document-specific commands (only show when viewing a document)
    ...(documentSlug ? [
      {
        id: 'doc-tweet-thread',
        name: 'View as Tweet Thread',
        keywords: ['tweet', 'thread', 'twitter', 'social', 'x'],
        shortcut: [isMac ? '⌘' : 'Ctrl', 'T'],
        category: DOCUMENT_ACTIONS_CATEGORY,
        action: () => navigateWithErrorHandling(`/read/${documentSlug}/tweets`),
        icon: TwitterLogo,
      },
      {
        id: 'doc-view-original',
        name: 'View Original',
        keywords: ['original', 'view', 'source', 'html'],
        shortcut: [isMac ? '⌘' : 'Ctrl', 'O'],
        category: DOCUMENT_ACTIONS_CATEGORY,
        action: () => {
          // Open in new tab like the existing View Original button
          window.open(`/api/read/${documentSlug}/original`, '_blank', 'noopener,noreferrer')
        },
        icon: FileText,
      },
    ] as Command[] : []),

    // App navigation commands
    {
      id: 'app-documents',
      name: 'Documents List',
      keywords: ['documents', 'list', 'library', 'home'],
      shortcut: [isMac ? '⌘' : 'Ctrl', 'D'],
      category: APP_NAVIGATION_CATEGORY,
      action: () => navigateWithErrorHandling('/read'),
      icon: House,
    },
    {
      id: 'app-upload',
      name: 'Upload Document',
      keywords: ['upload', 'add', 'new', 'document'],
      shortcut: [isMac ? '⌘' : 'Ctrl', 'U'],
      category: APP_NAVIGATION_CATEGORY,
      action: () => navigateWithErrorHandling('/upload'),
      icon: Upload,
    },
    {
      id: 'app-models',
      name: 'Models',
      keywords: ['models', 'ai', 'llm', 'settings', 'config'],
      shortcut: [isMac ? '⌘' : 'Ctrl', ','],
      category: APP_NAVIGATION_CATEGORY,
      action: () => navigateWithErrorHandling('/settings'),
      icon: Robot,
    },

    // Account commands (conditional based on auth state)
    {
      id: 'account-profile',
      name: 'Profile',
      keywords: ['profile', 'account', 'user'],
      category: ACCOUNT_CATEGORY,
      action: () => navigateWithErrorHandling('/auth/profile'),
      icon: User,
      condition: () => !!user, // Show only for authenticated users
    },
    {
      id: 'account-logout',
      name: 'Sign Out',
      keywords: ['logout', 'sign', 'out', 'exit'],
      category: ACCOUNT_CATEGORY,
      action: handleLogout,
      icon: SignOut,
      condition: () => !!user, // Show only for authenticated users
    },
    {
      id: 'account-login',
      name: 'Sign In',
      keywords: ['login', 'sign', 'in', 'auth'],
      category: ACCOUNT_CATEGORY,
      action: () => navigateWithErrorHandling('/auth/login'),
      icon: SignIn,
      condition: () => !user, // Show only for unauthenticated users
    },
    {
      id: 'account-signup',
      name: 'Sign Up',
      keywords: ['signup', 'register', 'create', 'account'],
      category: ACCOUNT_CATEGORY,
      action: () => navigateWithErrorHandling('/auth/signup'),
      icon: UserPlus,
      condition: () => !user, // Show only for unauthenticated users
    },
  ]

  // Filter commands based on conditions
  const availableCommands = commands.filter(
    command => !command.condition || command.condition()
  )

  // Group commands by category
  const commandsByCategory = availableCommands.reduce((acc, command) => {
    if (!acc[command.category.id]) {
      acc[command.category.id] = {
        category: command.category,
        commands: [],
      }
    }
    acc[command.category.id].commands.push(command)
    return acc
  }, {} as Record<string, { category: CommandCategory; commands: Command[] }>)

  // Sort categories by priority
  const sortedCategories = Object.values(commandsByCategory).sort(
    (a, b) => a.category.priority - b.category.priority
  )

  // Handle command execution
  const executeCommand = useCallback(async (command: Command) => {
    setOpen(false)
    await command.action()
  }, [setOpen])

  // Keyboard shortcut handler for Cmd+K (Mac) / Ctrl+K (Windows/Linux)
  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      const correctModifier = isMac ? event.metaKey : event.ctrlKey
      
      if (correctModifier && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(!open)
      }
    }
    
    document.addEventListener('keydown', handleKeydown)
    return () => document.removeEventListener('keydown', handleKeydown)
  }, [isMac, setOpen, open])

  // Individual shortcut handlers for numbered navigation
  useEffect(() => {
    const handleNumberedShortcuts = (event: KeyboardEvent) => {
      const correctModifier = isMac ? event.metaKey : event.ctrlKey
      
      if (!correctModifier) return

      // Handle numbered shortcuts (1-8 for navigation)
      const number = parseInt(event.key)
      if (number >= 1 && number <= 8) {
        event.preventDefault()
        const tabIds = ['original', 'ai-generated', 'summary', 'chat', 'glossary', 'search', 'highlights', 'metadata']
        const tabId = tabIds[number - 1]
        if (tabId) {
          navigateToTab(tabId as TabValue)
        }
      }

      // Handle other shortcuts
      switch (event.key.toLowerCase()) {
        case 'd':
          event.preventDefault()
          navigateWithErrorHandling('/read')
          break
        case 'u':
          event.preventDefault()
          navigateWithErrorHandling('/upload')
          break
        case ',':
          event.preventDefault()
          navigateWithErrorHandling('/settings')
          break
      }
    }

    document.addEventListener('keydown', handleNumberedShortcuts)
    return () => document.removeEventListener('keydown', handleNumberedShortcuts)
  }, [isMac, navigateToTab, navigateWithErrorHandling])

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        {sortedCategories.map(({ category, commands: categoryCommands }) => (
          <CommandGroup key={category.id} heading={category.name}>
            {categoryCommands.map(command => {
              const Icon = command.icon
              return (
                <CommandItem
                  key={command.id}
                  onSelect={() => executeCommand(command)}
                  className="flex items-center gap-2"
                >
                  {Icon && <Icon size={16} className="text-gray-500" />}
                  <span className="flex-1">{command.name}</span>
                  {command.shortcut && (
                    <CommandShortcut>
                      {command.shortcut.join('+')}
                    </CommandShortcut>
                  )}
                </CommandItem>
              )
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  )
}