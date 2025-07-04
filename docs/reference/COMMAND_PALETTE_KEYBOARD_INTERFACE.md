# Command Palette Reference

The command palette provides keyboard-driven navigation and actions for power users through a searchable interface triggered by Cmd+K (Mac) or Ctrl+K (Windows/Linux).

## See Also

- `components/command-palette.tsx` - Core implementation with TypeScript interfaces and command definitions
- `docs/reference/COMMAND_PALETTE_FUZZY_SEARCH_CMDK.md` - Fuzzy search configuration and tuning with cmdk library
- `docs/planning/finished/250608e_command_palette_implementation.md` - Complete implementation planning and decision rationale
- `docs/reference/KEYBOARD_SHORTCUTS.md` - Platform detection patterns and shortcut conventions
- `docs/reference/UI_COMPONENTS.md` - shadcn/ui Command component integration and usage patterns
- `docs/reference/CROSS_PANE_COMMUNICATION_MESSAGING_ARCHITECTURE.md` - DocumentCommunicationContext integration for navigation actions
- `components/vertical-icon-nav.tsx` - Visual command palette access and icon integration
- `components/resizable-document-layout.tsx` - Layout integration and keyboard shortcut handling

## Overview

The command palette provides rapid access to all application navigation modes, document actions, and app-level functionality through fuzzy search and keyboard shortcuts. It's designed to complement the existing vertical icon navigation while offering a faster interaction paradigm for experienced users.

**Status**: ✅ **Implemented** - Core functionality complete with comprehensive testing

## User Interface

### Activation

**Primary Trigger**: `Cmd+K` (Mac) / `Ctrl+K` (Windows/Linux)  
**Visual Access**: Terminal icon in vertical navigation rail (second position)  
**Behaviour**: Toggle open/closed state with same keyboard shortcut

### Search and Navigation

- **Fuzzy Search**: Type partial command names to find relevant results
- **Keyboard Navigation**: Arrow keys to navigate, Enter to execute, Escape to close
- **Category Organization**: Commands grouped by type (Navigation, Document Actions, App Navigation, Account)
- **Visual Shortcuts**: Keyboard shortcuts displayed next to commands for discoverability

### Command Categories

#### Navigation Commands
Switch between document viewing modes with numbered shortcuts:
- Original Document (`Cmd/Ctrl+1`)
- AI-Generated Document (`Cmd/Ctrl+2`) 
- Summary (`Cmd/Ctrl+3`)
- Chat (`Cmd/Ctrl+4`)
- Glossary (`Cmd/Ctrl+5`)
- Search (`Cmd/Ctrl+6`)

#### Document Actions (Context-Dependent)
Available only when viewing a document:
- View as Tweet Thread (`Cmd/Ctrl+T`)
- View Original (`Cmd/Ctrl+O`) - Opens raw document in new tab

#### App Navigation
Page-level navigation with standard shortcuts:
- Documents List (`Cmd/Ctrl+D`)
- Upload Document (`Cmd/Ctrl+U`)
- Settings (`Cmd/Ctrl+,`)

#### Account Commands (Authentication-Dependent)
**Authenticated Users**:
- Profile - Navigate to user profile page
- Sign Out - Logout with error handling

**Unauthenticated Users**:
- Sign In - Navigate to login page
- Sign Up - Navigate to signup page

## Implementation Architecture

### Core Components

**CommandPalette Component** (`components/command-palette.tsx`):
- Main React component implementing the command palette interface
- Built on shadcn/ui Command component (based on cmdk library)
- Handles keyboard shortcuts, command execution, and visual rendering

**Command Definition Interface**:
```typescript
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
```

**Category Structure**:
```typescript
interface CommandCategory {
  id: string
  name: string
  priority: number // For display ordering
}
```

### Integration Patterns

#### Context Integration
Commands use DocumentCommunicationContext for navigation actions:
```typescript
const { actions } = useDocumentCommunication()

// Navigation command example
{
  id: 'nav-summary',
  name: 'Summary',
  action: () => actions.setActiveTab('summary'),
  // ...
}
```

#### Router Integration
App navigation uses Next.js router with error handling:
```typescript
const router = useRouter()

const navigateWithErrorHandling = useCallback(async (path: string) => {
  try {
    router.push(path)
  } catch (error) {
    console.error('Navigation error:', error)
  }
}, [router])
```

#### Authentication Integration
Conditional commands based on user authentication state:
```typescript
const { user } = useAuth()

// Example: Show profile command only for authenticated users
{
  id: 'account-profile',
  name: 'Profile',
  condition: () => !!user,
  // ...
}
```

### Platform Detection

Keyboard shortcuts adapt to platform conventions using established patterns:
```typescript
const isMac = typeof window !== 'undefined' && 
            /Mac|iPod|iPhone|iPad/.test(window.navigator.platform)

// Event handling
const correctModifier = isMac ? event.metaKey : event.ctrlKey
```

## Developer Guide

### Adding New Commands

1. **Define Command Object**:
```typescript
const newCommand: Command = {
  id: 'unique-command-id',
  name: 'Display Name',
  keywords: ['search', 'terms'],
  shortcut: [isMac ? '⌘' : 'Ctrl', 'X'],
  category: APPROPRIATE_CATEGORY,
  action: () => handleCommandAction(),
  icon: PhosphorIcon,
  condition: () => shouldShowCommand(), // Optional
}
```

2. **Add to Commands Array**:
Insert into the appropriate section of the `commands` array in `components/command-palette.tsx`.

3. **Implement Action Handler**:
- Use existing context methods for navigation: `actions.setActiveTab()`
- Use router for page navigation: `navigateWithErrorHandling()`
- Add error handling for async operations

4. **Add Keyboard Shortcut (Optional)**:
If adding a global keyboard shortcut, extend the `handleNumberedShortcuts` function.

### Command Categories

**When to Create New Category**:
- Logical grouping of 3+ related commands
- Distinct user workflow or feature area
- Different privilege levels or contexts

**Category Naming**: Use clear, action-oriented names (e.g., "Document Actions" not "Document")

**Priority Ordering**: Lower numbers appear first (Navigation=1, Document Actions=2, etc.)

### Conditional Commands

Use the `condition` function for context-dependent commands:
```typescript
// Authentication-based
condition: () => !!user

// Document context-based  
condition: () => !!documentSlug

// Feature flag-based
condition: () => process.env.NEXT_PUBLIC_FEATURE_X === 'enabled'
```

### Testing New Commands

1. **Unit Tests**: Add tests to `components/__tests__/command-palette.test.tsx`
2. **Integration Tests**: Verify keyboard shortcuts work in context
3. **Accessibility**: Test with keyboard-only navigation
4. **Error Handling**: Test failure scenarios for async actions

## Accessibility

### Keyboard Navigation
- **Full keyboard support**: No mouse interaction required
- **Standard navigation**: Arrow keys, Enter, Escape following WCAG guidelines
- **Focus management**: Proper focus trapping within modal
- **Screen reader support**: ARIA labels and live regions

### Platform Compatibility
- **Consistent shortcuts**: Cmd on Mac, Ctrl on Windows/Linux
- **Visual indicators**: Platform-appropriate shortcut display
- **Browser compatibility**: Tested across major browsers

### Alternative Access
All command palette actions remain available through:
- Vertical icon navigation (visual alternative)
- Direct URL navigation (bookmark-friendly)
- Tab interface (mouse/touch interaction)

## Performance Characteristics

### Search Performance
- **Client-side search**: Immediate response, no API calls
- **Fuzzy matching**: Built into cmdk library (8kb gzipped)
- **Selective rendering**: Only visible commands rendered

### Memory Management
- **Event listener cleanup**: Automatic cleanup on component unmount
- **Context optimization**: Memoized actions prevent unnecessary re-renders
- **Bundle impact**: Minimal size increase (~8kb for cmdk dependency)

### User Experience
- **Immediate response**: Command palette opens within 100ms
- **Smooth animations**: Built-in transitions for open/close
- **No layout shifts**: Positioned outside main content flow

## Visual Integration

### Vertical Navigation Rail
The command palette icon is positioned strategically in the vertical navigation:
- **Position**: Second item (after expand/collapse button)
- **Visual Design**: Terminal icon with tooltip showing "Command Palette (Cmd+K/Ctrl+K)"
- **Interaction**: Click to toggle, consistent with keyboard shortcut

### Design System Integration
- **shadcn/ui components**: Uses Command, CommandDialog, CommandItem
- **Phosphor icons**: Consistent with application icon system
- **Spideryarn theming**: Orange accent colours and proper spacing
- **Responsive design**: Hidden on mobile (touch devices)

## Future Enhancements

### Planned Features (Not Yet Implemented)

#### Enhanced Search
- **Document content search**: Integration with existing search functionality
- **Fuzzy search improvements**: Better ranking and highlighting
- **Recent commands**: Command history and frequency-based ranking

#### LLM-Powered Commands
- **Natural language parsing**: "Find all mentions of X in document"
- **AI action triggers**: "Generate summary for current section"
- **Context-aware suggestions**: Commands based on document content

#### Rich Text Commands
- **Pattern-based commands**: "search for X" → trigger search with query
- **Multi-step workflows**: Command selection → parameter input
- **Parameter completion**: Auto-complete for headings, glossary terms

### Migration Path
Future enhancements will follow established patterns:
1. **Command interface extensions**: Add new fields as needed
2. **Category additions**: New logical groupings for AI features
3. **Context integration**: Leverage DocumentCommunicationContext for state
4. **Backwards compatibility**: Maintain existing command structure

## Troubleshooting

### Common Issues

**Command Palette Won't Open**:
- Check browser console for JavaScript errors
- Verify keyboard shortcut detection: `isMac` platform detection
- Ensure no other elements capturing keyboard events

**Commands Not Executing**:
- Check action functions for errors
- Verify context providers (DocumentCommunicationContext, AuthContext)
- Test navigation error handling

**Search Not Finding Commands**:
- Verify command `keywords` arrays include relevant terms
- Check `condition` functions aren't filtering commands unexpectedly
- Test with exact command names first

### Development Debugging

**Console Logging**: Development mode includes automatic logging:
```typescript
// Automatic in development
if (process.env.NODE_ENV === 'development') {
  console.log('[CommandPalette] Command executed:', command.name)
}
```

**React DevTools**: Command palette state visible in component tree under CommandDialog

**Browser DevTools**: 
- Event listeners visible in Elements tab
- Console errors for action execution failures
- Network tab for navigation requests

### Testing Commands

**Manual Testing Checklist**:
- [ ] Keyboard shortcut opens/closes palette
- [ ] Search filters commands correctly
- [ ] All command actions execute without errors
- [ ] Authentication-dependent commands show/hide correctly
- [ ] Document-dependent commands appear only in document context
- [ ] Keyboard navigation works (arrows, Enter, Escape)

## Related Documentation

- `docs/reference/KEYBOARD_SHORTCUTS.md` - Complete keyboard shortcut reference (updated to include command palette)
- `docs/reference/UI_COMPONENTS.md` - shadcn/ui component usage patterns
- `docs/reference/CROSS_PANE_COMMUNICATION_MESSAGING_ARCHITECTURE.md` - Context-based communication system
- `docs/reference/ARCHITECTURE_OVERVIEW.md` - Overall application architecture
- `docs/planning/finished/250608e_command_palette_implementation.md` - Complete implementation history and decisions

---

*Last updated: 9 June 2025*  
*Status: ✅ Implemented with comprehensive testing*  
*Command count: 12 commands across 4 categories*