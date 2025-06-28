# Clipboard Library Integration

This document describes the recommended approach for implementing clipboard operations in Spideryarn Reading, specifically for copying error details and other text content to the clipboard.

## See also

- `app/error.tsx` - Error page where clipboard functionality will be implemented
- `docs/reference/UI_COMPONENTS.md` - Available UI components including Button variants
- `docs/reference/DESIGN_SHADCN_UI_REFERENCE.md` - shadcn/ui component integration patterns
- [usehooks-ts useCopyToClipboard](https://usehooks-ts.com/react-hook/use-copy-to-clipboard) - Official documentation for the recommended hook
- [MDN Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText) - Browser API documentation

## Recommended Solution: usehooks-ts Library

For clipboard operations in Spideryarn Reading, we recommend the **usehooks-ts** library's `useCopyToClipboard` hook as the primary solution. This library provides a robust, TypeScript-native implementation that aligns with our development principles.

### Key Benefits

- **TypeScript Native**: Written in TypeScript with full type definitions
- **Modern Clipboard API**: Uses `navigator.clipboard.writeText()` with proper error handling
- **Tree-shakable**: ESM imports mean only used hooks are bundled
- **Actively Maintained**: Popular library with good community support (GitHub: juliencrn/usehooks-ts)
- **Zero Dependencies**: Lightweight implementation using only React primitives
- **Consistent with Project**: Follows React hooks patterns already used throughout the codebase

## Installation

```bash
npm install usehooks-ts
```

## Implementation Example

### Basic Usage for Error Page

```tsx
'use client'

import { useCopyToClipboard } from 'usehooks-ts'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface ErrorDetailsProps {
  error: Error
}

export function ErrorDetails({ error }: ErrorDetailsProps) {
  const [copiedText, copy] = useCopyToClipboard()
  const [showCopied, setShowCopied] = useState(false)

  const handleCopyError = async () => {
    const errorDetails = `Error: ${error.message}\n\nStack Trace:\n${error.stack}`
    const success = await copy(errorDetails)
    
    if (success) {
      setShowCopied(true)
      setTimeout(() => setShowCopied(false), 2000)
    }
  }

  return (
    <details className="mt-4">
      <summary className="cursor-pointer text-sm font-medium">
        Error Details (Development)
      </summary>
      <div className="mt-2 space-y-2">
        <pre className="whitespace-pre-wrap text-xs bg-gray-100 p-2 rounded">
          {error.message}
          {error.stack && `\n\n${error.stack}`}
        </pre>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleCopyError}
          className="text-xs"
        >
          {showCopied ? 'Copied!' : 'Copy Error Details'}
        </Button>
      </div>
    </details>
  )
}
```

### TypeScript Types

The `useCopyToClipboard` hook provides full type safety:

```typescript
type CopiedValue = string | null
type CopyFn = (text: string) => Promise<boolean>

// Hook returns tuple:
const [copiedText, copy]: [CopiedValue, CopyFn] = useCopyToClipboard()
```

## Browser Support & Fallbacks

### Modern Browser Support
The Clipboard API (`navigator.clipboard.writeText`) is supported in:
- Chrome/Chromium 66+
- Firefox 63+
- Safari 13.1+
- Edge 79+

### Security Requirements
- **HTTPS Required**: Clipboard API only works in secure contexts (HTTPS or localhost)
- **User Interaction**: Must be triggered by user action (click, keypress)
- **Permissions**: Some browsers may prompt for clipboard permissions

### Built-in Error Handling

The `usehooks-ts` implementation includes appropriate error handling:

```typescript
// Hook implementation handles these cases:
if (!navigator?.clipboard) {
  console.warn('Clipboard not supported')
  return false
}

try {
  await navigator.clipboard.writeText(text)
  return true
} catch (error) {
  console.warn('Copy failed', error)
  return false
}
```

## Alternative Approaches

### Native Clipboard API (Direct Implementation)
For simple cases, you could use the native API directly:

```typescript
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.error('Copy failed:', error)
    return false
  }
}
```

**Pros**: No dependencies, minimal code
**Cons**: Manual error handling, no state tracking, less reusable

### Legacy react-copy-to-clipboard
The older `react-copy-to-clipboard` library (5.1.0) is available but:
- **Not recommended**: Last updated 3 years ago
- **Outdated patterns**: Uses legacy clipboard techniques
- **Missing TypeScript**: Requires separate @types package

## Integration with Spideryarn Components

### Button Variants
Use appropriate shadcn/ui Button variants for clipboard actions:

```tsx
// Primary copy action
<Button variant="outline" size="sm" onClick={handleCopy}>
  Copy
</Button>

// Inline copy within content
<Button variant="ghost" size="icon-xs" onClick={handleCopy}>
  <CopyIcon size={12} />
</Button>

// Success state feedback
<Button variant="ghost" size="sm" disabled>
  ✓ Copied!
</Button>
```

### Icon Integration
Use Phosphor icons for visual feedback:

```tsx
import { Copy, Check } from '@phosphor-icons/react'

<Button variant="outline" size="sm" onClick={handleCopy}>
  {showCopied ? (
    <>
      <Check size={16} className="mr-1" />
      Copied!
    </>
  ) : (
    <>
      <Copy size={16} className="mr-1" />
      Copy
    </>
  )}
</Button>
```

## Implementation Guidelines

### Error Handling Strategy
Follow the project's "raise errors early, clearly & fatally" principle:

1. **Feature Detection**: Check for Clipboard API support
2. **User Feedback**: Provide clear success/failure feedback
3. **Graceful Degradation**: Show helpful error messages for unsupported browsers
4. **No Silent Failures**: Always inform users of copy results

### State Management
- Use the hook's built-in `copiedText` state for success tracking
- Implement temporary success feedback (2-3 seconds)
- Clear success state appropriately to avoid confusion

### Accessibility Considerations
- Ensure copy buttons are keyboard accessible
- Provide screen reader feedback for copy operations
- Use appropriate ARIA labels and descriptions

## Future Enhancements

### Rich Content Copying
For advanced use cases, the Clipboard API supports rich content:

```typescript
// HTML content (requires different API)
await navigator.clipboard.write([
  new ClipboardItem({
    'text/html': new Blob([htmlContent], { type: 'text/html' }),
    'text/plain': new Blob([plainText], { type: 'text/plain' })
  })
])
```

### Keyboard Shortcuts
Consider adding Cmd+C/Ctrl+C support for copy actions within specific contexts using the keyboard shortcut patterns from `docs/reference/KEYBOARD_SHORTCUTS.md`.

## Status

📋 **Planned** - Ready for implementation in error page copy functionality