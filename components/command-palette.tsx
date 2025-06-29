'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Command,
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
  Trash,
} from '@phosphor-icons/react'

// Component to show what matched (enhanced with quality)
function MatchIndicator({ matchInfo }: { matchInfo?: Command['matchInfo'] }) {
  if (!matchInfo) return null
  
  let qualityIcon: string
  let qualityColorClass: string
  let qualityLabel: string
  
  if (matchInfo.score >= 0.8) {
    qualityIcon = '🎯'
    qualityColorClass = 'text-green-600'
    qualityLabel = 'Excellent match'
  } else if (matchInfo.score >= 0.6) {
    qualityIcon = '✨'
    qualityColorClass = 'text-blue-600'
    qualityLabel = 'Good match'
  } else if (matchInfo.score >= 0.4) {
    qualityIcon = '🔍'
    qualityColorClass = 'text-orange-600'
    qualityLabel = 'Partial match'
  } else if (matchInfo.score >= 0.2) {
    qualityIcon = '💭'
    qualityColorClass = 'text-gray-500'
    qualityLabel = 'Fuzzy match'
  } else {
    qualityIcon = '❓'
    qualityColorClass = 'text-gray-400'
    qualityLabel = 'Weak match'
  }
  
  return (
    <div className="flex items-center gap-1">
      <span className={`text-xs ${qualityColorClass}`} title={qualityLabel}>
        {qualityIcon}
      </span>
      {(() => {
        switch (matchInfo.type) {
          case 'exact':
            return <span className="text-green-600 text-xs font-medium">[exact match]</span>
          case 'prefix':
            return <span className="text-blue-600 text-xs font-medium">[starts with]</span>
          case 'keyword':
            return <span className="text-orange-600 text-xs">via &quot;{matchInfo.matchedKeyword}&quot;</span>
          case 'fuzzy':
            return <span className="text-gray-500 text-xs">via &quot;{matchInfo.matchedKeyword}&quot;</span>
          default:
            return null
        }
      })()}
    </div>
  )
}

// Component for visual separation between quality groups
function QualitySeparator({ label }: { label: string }) {
  return (
    <div className="px-2 py-1 border-t border-gray-200">
      <span className="text-xs text-gray-500 font-medium">{label}</span>
    </div>
  )
}

import { generateCommandsFromRegistry } from '@/lib/tools/command-generation'
import { getAllTools } from '@/lib/tools/registry'
import { createClient } from '@/lib/supabase/client'
import { useDeleteDocument, type DocumentMetadata } from '@/lib/hooks/use-delete-document'

// Command definition interfaces
interface Command {
  id: string
  name: string
  keywords?: string[] | undefined
  shortcut?: string[] | undefined
  category: CommandCategory
  action: () => void | Promise<void>
  condition?: (() => boolean) | undefined
  icon?: React.ComponentType<{ size?: number; className?: string }> | undefined
  // Add this new property
  matchInfo?: {
    type: 'exact' | 'prefix' | 'keyword' | 'fuzzy'
    matchedText: string
    matchedKeyword?: string
    score: number
  } | undefined
}

interface CommandCategory {
  id: string
  name: string
  priority: number
}

// Command categories with priorities for ordering
// const NAVIGATION_CATEGORY: CommandCategory = {
//   id: 'navigation',
//   name: 'Navigation',
//   priority: 1,
// }

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

let _hasLoggedCommandOrder = false

export function CommandPalette({ open: externalOpen, onOpenChange }: CommandPaletteProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [search, setSearch] = useState('')
  
  // Use external control if provided, otherwise use internal state
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen
  const documentSlug = useDocumentSlug()
  const router = useRouter()
  const { user, signOut } = useAuth()
  const navigateToTab = useNavigateToTab() as (tabId: string) => void

  // Global delete dialog state
  const [deleteMetadata, setDeleteMetadata] = useState<DocumentMetadata | null>(null)
  const { triggerDelete, DeleteDialog } = useDeleteDocument(deleteMetadata || {
    id: '',
    title: '',
  })

  // Function to handle delete command from command palette
  const handleDeleteCommand = useCallback(async () => {
    if (!documentSlug) return

    try {
      const supabase = createClient()
      const { data: document, error } = await supabase
        .from('documents')
        .select('id, title, created_at, upload_metadata, word_count')
        .eq('slug', documentSlug)
        .single()

      if (error || !document) {
        console.error('Failed to fetch document for deletion:', error)
        throw new Error('Could not load document information')
      }

      // Prepare metadata for enhanced dialog
      const metadata: DocumentMetadata = {
        id: document.id,
        title: document.title,
        uploadDate: document.created_at,
        fileSizeKB: document.upload_metadata?.content_size_kb,
        wordCount: document.word_count,
      }

      setDeleteMetadata(metadata)
      triggerDelete()
    } catch (error) {
      console.error('Delete command error:', error)
      alert('Failed to load document information. Please try again.')
    }
  }, [documentSlug, triggerDelete])

  // Platform detection for keyboard shortcuts
  const isMac = typeof window !== 'undefined' && 
               /Mac|iPod|iPhone|iPad/.test(window.navigator.platform)

  // Start-of-word prefix filter: every search token must be the prefix of at
  // least one word in the command value.  Keeps matching strict ("del" matches
  // "Delete Document" but NOT "Models"), yet still allows multi-word initials
  // like "v o" → "View Original".
  const startWordFilter = useCallback((value: string, search: string) => {
    const query = search.trim().toLowerCase()
    if (!query) return 1 // show all when no query

    const tokens = query.split(/\s+/)
    const words = value.toLowerCase().split(/\s+/)

    const allTokensMatch = tokens.every(token =>
      words.some(word => word.startsWith(token))
    )

    return allTokensMatch ? 1 : 0
  }, [])

  // Detect what matched for highlighting
  const detectMatch = useCallback((
    command: Command,
    search: string
  ): Command['matchInfo'] | null => {
    const searchLower = search.toLowerCase().trim()
    const nameLower = command.name.toLowerCase()
    
    if (!searchLower) return null
    
    // Exact match
    if (nameLower === searchLower) {
      return {
        type: 'exact',
        matchedText: command.name,
        score: 1.0
      }
    }
    
    // Prefix match
    if (nameLower.startsWith(searchLower)) {
      return {
        type: 'prefix', 
        matchedText: searchLower,
        score: 0.9
      }
    }
    
    // Keyword exact match
    const exactKeyword = command.keywords?.find(k => 
      k.toLowerCase() === searchLower
    )
    if (exactKeyword) {
      return {
        type: 'keyword',
        matchedText: searchLower,
        matchedKeyword: exactKeyword,
        score: 0.8
      }
    }
    
    // Fuzzy keyword match
    const fuzzyKeyword = command.keywords?.find(k =>
      k.toLowerCase().includes(searchLower)
    )
    if (fuzzyKeyword) {
      return {
        type: 'fuzzy',
        matchedText: searchLower,
        matchedKeyword: fuzzyKeyword,
        score: 0.6
      }
    }
    
    return null
  }, [])

  // Group commands by quality for better organization
  const groupCommandsByQuality = useCallback((commands: Command[]) => {
    const withSearch = commands.filter(cmd => cmd.matchInfo && search.trim())
    const withoutSearch = commands.filter(cmd => !cmd.matchInfo || !search.trim())
    
    if (!search.trim()) {
      return { highQuality: withoutSearch, lowQuality: [] }
    }
    
    // Sort by score descending
    const sortedMatches = withSearch.sort((a, b) => {
      const scoreA = a.matchInfo?.score ?? 0
      const scoreB = b.matchInfo?.score ?? 0
      return scoreB - scoreA
    })
    
    const highQuality = sortedMatches.filter(cmd => (cmd.matchInfo?.score ?? 0) >= 0.6)
    const lowQuality = sortedMatches.filter(cmd => (cmd.matchInfo?.score ?? 0) < 0.6)
    
    return { highQuality, lowQuality }
  }, [search])

  // Generate dynamic tool commands from registry
  const generateToolCommands = useCallback((): Command[] => {
    try {
      const tools = getAllTools()
      const generatedCommands = generateCommandsFromRegistry(tools, {
        getNavigateToTab: () => navigateToTab,
        getCurrentDocument: () => documentSlug ? { id: documentSlug } : null,
        isMac,
      })

      if (
        process.env.NODE_ENV === 'development' &&
        !_hasLoggedCommandOrder
      ) {
        console.debug(
          '🔍 Command Palette – Final command order:',
          generatedCommands.map(c => c.id.replace('nav-', ''))
        )
        _hasLoggedCommandOrder = true
      }

      // Convert GeneratedCommand to Command format
      return generatedCommands.map(genCmd => ({
        id: genCmd.id,
        name: genCmd.name,
        keywords: genCmd.keywords || undefined,
        shortcut: genCmd.shortcut || undefined,
        category: {
          id: genCmd.category.id,
          name: genCmd.category.name,
          priority: genCmd.category.priority,
        },
        action: genCmd.action,
        condition: genCmd.condition || undefined,
        icon: genCmd.icon || undefined,
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

  // Commands definition moved inside useMemo to prevent dependency issues

  // Enhance commands with match information based on current search
  const enhancedCommands: Command[] = useMemo(() => {
    // Define all commands inside useMemo to prevent dependency issues
    const baseCommands: Command[] = [
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
        {
          id: 'doc-delete',
          name: 'Delete Document',
          keywords: ['delete', 'remove', 'trash', 'destroy'],
          category: DOCUMENT_ACTIONS_CATEGORY,
          action: handleDeleteCommand,
          icon: Trash,
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
    
    return baseCommands.map(command => ({
      ...command,
      matchInfo: detectMatch(command, search) || undefined
    }))
  }, [search, detectMatch, generateToolCommands, documentSlug, isMac, navigateWithErrorHandling, handleDeleteCommand, user, handleLogout])

  // Filter commands based on conditions
  const availableCommands = enhancedCommands.filter(
    command => !command.condition || command.condition()
  )

  // Group commands by category AND quality
  const commandsByCategory = availableCommands.reduce((acc, command) => {
    if (!acc[command.category.id]) {
      acc[command.category.id] = {
        category: command.category,
        commands: [],
      }
    }
    acc[command.category.id]!.commands.push(command)
    return acc
  }, {} as Record<string, { category: CommandCategory; commands: Command[] }>)

  // Apply quality-based sorting within each category
  Object.values(commandsByCategory).forEach(categoryGroup => {
    const { highQuality, lowQuality } = groupCommandsByQuality(categoryGroup.commands)
    
    // Sort high quality by score (descending), then low quality by score
    categoryGroup.commands = [
      ...highQuality.sort((a, b) => (b.matchInfo?.score ?? 0) - (a.matchInfo?.score ?? 0)),
      ...lowQuality.sort((a, b) => (b.matchInfo?.score ?? 0) - (a.matchInfo?.score ?? 0))
    ]
  })

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

  // Global shortcut handlers for non-tool commands
  useEffect(() => {
    const handleGlobalShortcuts = (event: KeyboardEvent) => {
      const correctModifier = isMac ? event.metaKey : event.ctrlKey
      
      if (!correctModifier) return

      // Handle non-tool shortcuts only (tool shortcuts are handled by command generation)
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

    document.addEventListener('keydown', handleGlobalShortcuts)
    return () => document.removeEventListener('keydown', handleGlobalShortcuts)
  }, [isMac, navigateWithErrorHandling])

  return (
    <>
      {/*
        Adjust positioning so the dialog sits higher up on small screens (e.g. mobile
        where the on-screen keyboard can otherwise cover the lower half when the
        palette is vertically centred). We keep the original centred positioning
        for ≥sm breakpoints so desktop behaviour is unchanged.
        The arbitrary values (30%) were chosen empirically to provide enough
        clearance while still looking visually centred on typical phone viewports.
      */}
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        className="top-[20%] translate-y-[-20%] sm:top-[50%] sm:translate-y-[-50%]"
      >
        <Command filter={startWordFilter}>
          <CommandInput 
            placeholder="Type a command or search..." 
            onValueChange={setSearch}
            value={search}
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            
            {sortedCategories.map(({ category, commands: categoryCommands }) => {
              const { highQuality, lowQuality } = groupCommandsByQuality(categoryCommands || [])
              const showQualitySeparation = search.trim() && highQuality.length > 0 && lowQuality.length > 0
              
              return (
                <CommandGroup key={category.id} heading={category.name}>
                  {/* High quality results */}
                  {(showQualitySeparation ? highQuality : categoryCommands).map(command => {
                    const Icon = command.icon
                    return (
                      <CommandItem
                        key={command.id}
                        value={[command.name, ...(command.keywords ?? [])].join(' ')}
                        onSelect={() => executeCommand(command)}
                        className="flex items-center gap-2"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          {Icon && <Icon size={16} className="text-gray-500" />}
                          <span>{command.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MatchIndicator matchInfo={command.matchInfo} />
                          {command.shortcut && (
                            <CommandShortcut>
                              {command.shortcut.join('+')}
                            </CommandShortcut>
                          )}
                        </div>
                      </CommandItem>
                    )
                  })}
                  
                  {/* Quality separator and low quality results */}
                  {showQualitySeparation && (
                    <>
                      <QualitySeparator label="Partial matches" />
                      {lowQuality.map(command => {
                        const Icon = command.icon
                        return (
                          <CommandItem
                            key={command.id}
                            value={[command.name, ...(command.keywords ?? [])].join(' ')}
                            onSelect={() => executeCommand(command)}
                            className="flex items-center gap-2 opacity-75"
                          >
                            <div className="flex items-center gap-2 flex-1">
                              {Icon && <Icon size={16} className="text-gray-500" />}
                              <span>{command.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MatchIndicator matchInfo={command.matchInfo} />
                              {command.shortcut && (
                                <CommandShortcut>
                                  {command.shortcut.join('+')}
                                </CommandShortcut>
                              )}
                            </div>
                          </CommandItem>
                        )
                      })}
                    </>
                  )}
                </CommandGroup>
              )
            })}
          </CommandList>
        </Command>
      </CommandDialog>
      
      <DeleteDialog />
    </>
  )
}