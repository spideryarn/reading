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
import { useDocumentCommunication } from '@/lib/context/document-communication-context'
import {
  Article,
  Robot,
  ListBullets,
  ChatCircle,
  BookOpen,
  MagnifyingGlass,
  House,
  Upload,
  Gear,
  User,
  SignIn,
  UserPlus,
} from '@phosphor-icons/react'

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

const APP_NAVIGATION_CATEGORY: CommandCategory = {
  id: 'app-navigation',
  name: 'App Navigation',
  priority: 2,
}

const ACCOUNT_CATEGORY: CommandCategory = {
  id: 'account',
  name: 'Account',
  priority: 3,
}

interface CommandPaletteProps {
  className?: string
}

export function CommandPalette({ }: CommandPaletteProps) {
  const [open, setOpen] = useState(false)
  const { actions } = useDocumentCommunication()
  const router = useRouter()

  // Platform detection for keyboard shortcuts
  const isMac = typeof window !== 'undefined' && 
               /Mac|iPod|iPhone|iPad/.test(window.navigator.platform)

  // Define all commands
  const commands: Command[] = [
    // Navigation commands matching existing tabs
    {
      id: 'nav-original',
      name: 'Original Document',
      keywords: ['document', 'original', 'source', 'raw'],
      shortcut: [isMac ? '⌘' : 'Ctrl', '1'],
      category: NAVIGATION_CATEGORY,
      action: () => actions.setActiveTab('original'),
      icon: Article,
    },
    {
      id: 'nav-ai-generated',
      name: 'AI-Generated Document',
      keywords: ['ai', 'generated', 'enhanced', 'headings'],
      shortcut: [isMac ? '⌘' : 'Ctrl', '2'],
      category: NAVIGATION_CATEGORY,
      action: () => actions.setActiveTab('ai-generated'),
      icon: Robot,
    },
    {
      id: 'nav-summary',
      name: 'Summary',
      keywords: ['summary', 'summarize', 'overview', 'brief'],
      shortcut: [isMac ? '⌘' : 'Ctrl', '3'],
      category: NAVIGATION_CATEGORY,
      action: () => actions.setActiveTab('summary'),
      icon: ListBullets,
    },
    {
      id: 'nav-chat',
      name: 'Chat',
      keywords: ['chat', 'ask', 'question', 'discuss'],
      shortcut: [isMac ? '⌘' : 'Ctrl', '4'],
      category: NAVIGATION_CATEGORY,
      action: () => actions.setActiveTab('chat'),
      icon: ChatCircle,
    },
    {
      id: 'nav-glossary',
      name: 'Glossary',
      keywords: ['glossary', 'terms', 'definitions', 'concepts'],
      shortcut: [isMac ? '⌘' : 'Ctrl', '5'],
      category: NAVIGATION_CATEGORY,
      action: () => actions.setActiveTab('glossary'),
      icon: BookOpen,
    },
    {
      id: 'nav-search',
      name: 'Search',
      keywords: ['search', 'find', 'locate', 'text'],
      shortcut: [isMac ? '⌘' : 'Ctrl', '6'],
      category: NAVIGATION_CATEGORY,
      action: () => actions.setActiveTab('search'),
      icon: MagnifyingGlass,
    },

    // App navigation commands
    {
      id: 'app-documents',
      name: 'Documents List',
      keywords: ['documents', 'list', 'library', 'home'],
      shortcut: [isMac ? '⌘' : 'Ctrl', 'D'],
      category: APP_NAVIGATION_CATEGORY,
      action: () => router.push('/documents'),
      icon: House,
    },
    {
      id: 'app-upload',
      name: 'Upload Document',
      keywords: ['upload', 'add', 'new', 'document'],
      shortcut: [isMac ? '⌘' : 'Ctrl', 'U'],
      category: APP_NAVIGATION_CATEGORY,
      action: () => router.push('/upload'),
      icon: Upload,
    },
    {
      id: 'app-settings',
      name: 'Settings',
      keywords: ['settings', 'preferences', 'config'],
      shortcut: [isMac ? '⌘' : 'Ctrl', ','],
      category: APP_NAVIGATION_CATEGORY,
      action: () => router.push('/settings'),
      icon: Gear,
    },

    // Account commands (conditional based on auth state)
    {
      id: 'account-profile',
      name: 'Profile',
      keywords: ['profile', 'account', 'user'],
      category: ACCOUNT_CATEGORY,
      action: () => router.push('/auth/profile'),
      icon: User,
      // TODO: Add condition for authenticated users
    },
    {
      id: 'account-login',
      name: 'Sign In',
      keywords: ['login', 'sign', 'in', 'auth'],
      category: ACCOUNT_CATEGORY,
      action: () => router.push('/auth/login'),
      icon: SignIn,
      // TODO: Add condition for unauthenticated users
    },
    {
      id: 'account-signup',
      name: 'Sign Up',
      keywords: ['signup', 'register', 'create', 'account'],
      category: ACCOUNT_CATEGORY,
      action: () => router.push('/auth/signup'),
      icon: UserPlus,
      // TODO: Add condition for unauthenticated users
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
  }, [])

  // Keyboard shortcut handler for Cmd+K (Mac) / Ctrl+K (Windows/Linux)
  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      const correctModifier = isMac ? event.metaKey : event.ctrlKey
      
      if (correctModifier && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(prev => !prev)
      }
    }
    
    document.addEventListener('keydown', handleKeydown)
    return () => document.removeEventListener('keydown', handleKeydown)
  }, [isMac])

  // Individual shortcut handlers for numbered navigation
  useEffect(() => {
    const handleNumberedShortcuts = (event: KeyboardEvent) => {
      const correctModifier = isMac ? event.metaKey : event.ctrlKey
      
      if (!correctModifier) return

      // Handle numbered shortcuts (1-6 for navigation)
      const number = parseInt(event.key)
      if (number >= 1 && number <= 6) {
        event.preventDefault()
        const tabIds = ['original', 'ai-generated', 'summary', 'chat', 'glossary', 'search']
        const tabId = tabIds[number - 1]
        if (tabId) {
          actions.setActiveTab(tabId)
        }
      }

      // Handle other shortcuts
      switch (event.key.toLowerCase()) {
        case 'd':
          event.preventDefault()
          router.push('/documents')
          break
        case 'u':
          event.preventDefault()
          router.push('/upload')
          break
        case ',':
          event.preventDefault()
          router.push('/settings')
          break
      }
    }

    document.addEventListener('keydown', handleNumberedShortcuts)
    return () => document.removeEventListener('keydown', handleNumberedShortcuts)
  }, [isMac, actions, router])

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