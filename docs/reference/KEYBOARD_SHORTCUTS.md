# Keyboard Shortcuts

Comprehensive reference for keyboard shortcuts in the Spideryarn Reading application.

## Table of Contents

- [Navigation Shortcuts](#navigation-shortcuts)
- [Implementation Patterns](#implementation-patterns)
- [Platform Differences](#platform-differences)
- [Accessibility Considerations](#accessibility-considerations)
- [Future Shortcuts](#future-shortcuts)

## Navigation Shortcuts

### Sidebar Toggle

**Shortcut**: `Cmd+B` (Mac) / `Ctrl+B` (Windows/Linux)  
**Function**: Toggle left pane collapse/expand  
**Component**: `ResizableDocumentLayout`  
**Implementation**: `components/resizable-document-layout.tsx` lines 235-251

When the left pane is collapsed, the vertical icon navigation rail appears. When expanded, the text-based tab navigation is shown.

## Implementation Patterns

### Platform Detection

All keyboard shortcuts use platform-specific modifier keys following web standards:

```typescript
// Platform detection utility
const isMac = typeof window !== 'undefined' && 
            /Mac|iPod|iPhone|iPad/.test(window.navigator.platform)

// Event handler pattern
const handleKeydown = (event: KeyboardEvent) => {
  const correctModifier = isMac ? event.metaKey : event.ctrlKey
  
  if (correctModifier && event.key.toLowerCase() === 'b') {
    event.preventDefault()
    // Handle shortcut action
  }
}
```

### Event Listener Setup

Keyboard shortcuts are implemented using `useEffect` hooks with proper cleanup:

```typescript
useEffect(() => {
  const handleKeydown = (event: KeyboardEvent) => {
    // Shortcut logic here
  }
  
  document.addEventListener('keydown', handleKeydown)
  return () => document.removeEventListener('keydown', handleKeydown)
}, [dependencies])
```

### Visual Indicators

Shortcuts are displayed in tooltips and UI elements using platform-specific text:

```typescript
// In components
const shortcutText = isMac ? 'Cmd+B' : 'Ctrl+B'

// In tooltip content
<div className="text-xs text-gray-500 font-mono">
  Press {shortcutText} to toggle sidebar
</div>
```

## Platform Differences

### Modifier Keys

| Platform | Primary Modifier | Meta Key | Alt Key |
|----------|-----------------|----------|---------|
| **macOS** | `Cmd` (metaKey) | `Cmd` | `Option` |
| **Windows** | `Ctrl` (ctrlKey) | `Windows` | `Alt` |
| **Linux** | `Ctrl` (ctrlKey) | `Super` | `Alt` |

### Key Detection

The application uses `event.metaKey` on Mac and `event.ctrlKey` on Windows/Linux to ensure consistent behaviour across platforms.

### Browser Conflicts

- `Ctrl+B` (Windows/Linux): May conflict with browser bold formatting in some contexts
- `Cmd+B` (Mac): Generally safe as browsers use different shortcuts

## Accessibility Considerations

### WCAG 2.1 Compliance

1. **Keyboard Navigation**: All interactive elements remain accessible via Tab navigation
2. **Focus Management**: Shortcuts don't trap keyboard focus
3. **Screen Reader Support**: Shortcuts are announced through ARIA labels and tooltips
4. **Alternative Access**: All shortcut actions are available through UI controls

### Conflict Prevention

- Always call `event.preventDefault()` to prevent browser default actions
- Use specific key combinations that are unlikely to conflict with assistive technology
- Provide tooltip indicators so users know shortcuts are available

### Testing Guidelines

- Test with keyboard-only navigation
- Verify screen reader announces shortcut availability
- Test with various assistive technologies (NVDA, JAWS, VoiceOver)
- Ensure shortcuts work across different browsers

## Future Shortcuts

### Planned Additions

- `Cmd/Ctrl+K`: Command palette (planned for later implementation)
- `Cmd/Ctrl+F`: Focus search input (when search tab is active)
- Arrow keys: Navigate between icon rail items (accessibility enhancement)
- `Escape`: Return focus to document from navigation

### Implementation Notes

When adding new shortcuts:

1. **Follow platform conventions**: Use standard patterns from VSCode, browser devtools, etc.
2. **Document in tooltips**: Include shortcut text in relevant UI elements
3. **Test accessibility**: Ensure shortcuts don't break screen reader navigation
4. **Update this documentation**: Add new shortcuts to this reference

### Command Palette Integration

Future command palette implementation should follow these patterns:

- `Cmd/Ctrl+K`: Open command palette
- `Cmd/Ctrl+Shift+P`: Alternative command palette trigger
- Type-ahead search within palette
- Fuzzy matching for command names
- Show shortcuts next to command names

## Related Documentation

- `docs/reference/UI_INTERFACE.md` - UI component interactions
- `docs/reference/ACCESSIBILITY.md` - Accessibility guidelines (if exists)
- `components/resizable-document-layout.tsx` - Main keyboard shortcut implementation
- `components/vertical-icon-nav.tsx` - Icon navigation with tooltip shortcuts

## Notes

- Keyboard shortcuts follow industry standards established by VSCode, GitHub, and other professional development tools
- Platform detection uses `navigator.platform` for broad compatibility
- All shortcuts include `preventDefault()` to avoid browser conflicts
- Tooltip text uses `font-mono` class for consistent shortcut key display

---

*Last updated: 8 June 2025*  
*Shortcut count: 1 (Sidebar Toggle)*