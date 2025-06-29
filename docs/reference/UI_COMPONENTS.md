# UI Components Reference

This document describes the UI component system used in Spideryarn Reading, based on shadcn/ui with custom modifications.

## Overview

The project uses a hybrid approach combining:
- **shadcn/ui components** for interactive, complex UI elements
- **Raw Tailwind CSS** for simple layouts and spacing
- **Custom components** for domain-specific functionality

## References

- `docs/reference/UI_INTERFACE.md`
- `docs/reference/DESIGN_SHADCN_UI_REFERENCE.md`
- `docs/reference/DESIGN_LOADING.md` - loading states and spinner components (Spinner, Loading, LoadingPage)
- `docs/reference/DESIGN_MOBILE_PLATFORM_DETECTION.md` - mobile responsive design patterns affecting component behavior


## Component Library: shadcn/ui

Built on Radix UI primitives with copy-paste philosophy. Components are copied to `components/ui/` and can be fully customised.

### Core Principles
- **Accessible by default** - ARIA compliance, keyboard navigation
- **Customisable** - Full control over styling and behaviour
- **Type-safe** - TypeScript definitions included
- **Theme-consistent** - Unified design system

### Theme Configuration

Primary colour: **Spideryarn Orange** (`#DB8A45`)
- CSS custom property: `hsl(30 62% 57%)`
- Used for primary buttons, focus states, brand elements

## Available Components

### Button (`components/ui/button.tsx`)

**Variants:**
- `default` - Primary action (Spideryarn orange background)
- `destructive` - Dangerous actions (red)
- `outline` - Secondary actions with border
- `secondary` - Subtle actions (grey background)
- `ghost` - Minimal styling, hover effects only
- `link` - Text-only, underlined on hover

**Custom Variants:**
- `orange` - Explicit orange styling
- `warning` - Yellow/amber warning state
- `blue` - Blue accent colour
- `ghost-orange` - Ghost variant with orange hover

**Sizes:**
- `sm` - Small buttons
- `default` - Standard size
- `lg` - Large buttons
- `icon` - Square icon-only buttons
- `icon-sm` - Small icon buttons
- `icon-xs` - Extra small icon buttons
- `full` - Full width buttons

**Usage:**
```tsx
import { Button } from '@/components/ui/button'

<Button variant="default" size="sm">Save</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline" size="icon">
  <Icon size={16} />
</Button>
```

### Alert (`components/ui/alert.tsx`)

Error and warning message display with consistent styling.

**Variants:**
- `default` - Neutral information
- `destructive` - Error states

**Usage:**
```tsx
import { Alert, AlertDescription } from '@/components/ui/alert'

<Alert variant="destructive">
  <AlertDescription>
    Operation failed. Please try again.
  </AlertDescription>
</Alert>
```

### Loading (`components/ui/loading.tsx`)

Standardised loading indicators with spinning animation.

**Variants:**
- `default` - Standard loading state
- `inline` - Inline with text
- `overlay` - Full overlay loading

**Sizes:**
- `sm` - Small spinner (12px)
- `default` - Standard spinner (16px)
- `lg` - Large spinner (24px)

**Usage:**
```tsx
import { Loading } from '@/components/ui/loading'

<Loading variant="default" size="sm" />
<Loading variant="inline" text="Generating summary..." />
```

### Spinner (`components/ui/spinner.tsx`)

Basic animated spinner component using Phosphor CircleNotch icon.

**Usage:**
```tsx
import { Spinner } from '@/components/ui/spinner'

<Spinner size={16} className="text-blue-500" />
```

### Select (`components/ui/select.tsx`)

**Status:** Installed but not currently used (YAGNI principle)

Dropdown selection component based on Radix UI Select primitive.

### Checkbox (`components/ui/checkbox.tsx`)

**Status:** Installed but not currently used (YAGNI principle)

Checkbox input component with proper accessibility.

### Command (`components/ui/command.tsx`)

**Status:** ✅ **Active** - Core component for command palette implementation

shadcn/ui Command component built on cmdk library provides searchable command interface functionality.

**Sub-components:**
- `CommandDialog` - Modal wrapper for command palette
- `CommandInput` - Search input with placeholder text  
- `CommandList` - Scrollable list of command results
- `CommandEmpty` - Empty state when no results found
- `CommandGroup` - Category grouping with headings
- `CommandItem` - Individual command with icon, text, and shortcut
- `CommandShortcut` - Keyboard shortcut display component

**Usage:**
Used exclusively by `components/command-palette.tsx` for the main command palette interface. Provides keyboard navigation, fuzzy search, and proper accessibility support.

**See:** 
- `docs/reference/COMMAND_PALETTE_KEYBOARD_INTERFACE.md` for complete command palette implementation details
- `docs/reference/COMMAND_PALETTE_FUZZY_SEARCH_CMDK.md` for fuzzy search configuration and algorithm tuning with cmdk library

## Page-Level Components

### AppHeader (`components/app-header.tsx`)

**Status:** Standard page header component for flexible page-level header system

Replaces the old fixed global header approach with page-controlled headers for maximum flexibility.

**Props:**
- `title?` - Page title displayed in header
- `titleLink?` - Makes title clickable (link destination)
- `backLink?` - URL for back navigation
- `backText?` - Text for back button (default: "Back")
- `actions?` - React node for header action buttons
- `className?` - Additional CSS classes

**Features:**
- Spideryarn branding with logo and orange styling
- Sticky positioning with backdrop blur
- Responsive design with truncation
- Uses CSS custom property `--header-height` for consistent sizing
- Accessible navigation and aria labels

**Usage:**
```tsx
import { AppHeader } from '@/components/app-header'

// Basic usage
<AppHeader title="Document Title" />

// With navigation
<AppHeader 
  title="Tweet Thread" 
  backLink="/read/example"
  backText="Back to Document"
/>

// With actions
<AppHeader 
  title="Design Reference"
  actions={
    <Button variant="outline" size="sm">
      Export
    </Button>
  }
/>

// Custom styling
<AppHeader 
  title="Settings"
  className="bg-gray-100"
/>
```

**Design Principles:**
- **Page Responsibility**: Each page controls its own header content
- **Consistency**: Standard Spideryarn branding and styling
- **Flexibility**: Fully customisable while maintaining visual consistency
- **No Overlap**: Eliminates content overlap issues from fixed headers

### Footer (`components/footer.tsx`)

**Status:** Standard page footer component for page-level footer implementation

Simple footer component that pages can include to provide consistent branding and navigation.

**Features:**
- Spideryarn branding and description
- Navigation links to Home and Design Reference
- Responsive layout (stacked on mobile, horizontal on desktop)
- Subtle styling with gray background and borders

**Usage:**
```tsx
import { Footer } from '@/components/footer'

// Add to any page that needs a footer
export default function MyPage() {
  return (
    <div>
      <AppHeader title="Page Title" />
      <main>
        {/* Page content */}
      </main>
      <Footer />
    </div>
  )
}
```

**Implementation Notes:**
- Moved from conditional rendering in ClientLayout to page-level inclusion
- Prevents hydration mismatch errors
- Pages can choose whether to include footer or not
- Consistent spacing with `mt-12` top margin

## Custom Components

### CommandPalette (`components/command-palette.tsx`)

**Status:** ✅ **Active** - Core application feature for keyboard-driven navigation

Comprehensive command palette implementation providing rapid access to all application functionality through Cmd+K/Ctrl+K trigger.

**Features:**
- 12 commands across 4 categories (Navigation, Document Actions, App Navigation, Account)
- Platform-specific keyboard shortcuts (Cmd on Mac, Ctrl on Windows/Linux)
- Fuzzy search with category organization
- Authentication-dependent commands
- DocumentCommunicationContext integration for navigation
- Visual integration with vertical navigation rail

**Dependencies:**
- shadcn/ui Command component (cmdk library)
- DocumentCommunicationContext for navigation actions
- AuthContext for conditional commands
- Next.js router for page navigation

**Usage:**
```tsx
// Integrated into main layout
<CommandPalette />

// With external state control
<CommandPalette 
  open={isCommandPaletteOpen} 
  onOpenChange={setIsCommandPaletteOpen} 
/>
```

**See:** 
- `docs/reference/COMMAND_PALETTE_KEYBOARD_INTERFACE.md` for complete implementation guide
- `docs/reference/COMMAND_PALETTE_FUZZY_SEARCH_CMDK.md` for fuzzy search algorithm configuration and performance tuning

### Dialog (`components/dialog.tsx`)

**Status:** Custom implementation retained for API compatibility

The existing custom dialog component is kept because it uses a different API pattern:
- Props: `isOpen`, `onClose`, `title`
- Incompatible with shadcn/ui Dialog patterns

### Tab Container (`components/tab-container.tsx`)

**Status:** Custom implementation, future migration candidate

Reusable tab component for multi-pane interface. Could potentially migrate to shadcn/ui Tabs in the future.

## Installation Guide

### Adding New Components

```bash
# Non-interactive installation (recommended for AI/automation)
printf "\\n" | npx shadcn@latest add [component-name]

# For React 19 compatibility issues
printf "\\n" | npx shadcn@latest add [component-name] --force
```

### Common Components to Consider

**Forms:** Input, Textarea, Form, Label
**Navigation:** Tabs, Breadcrumb, Pagination  
**Layout:** Card, Separator, Sheet
**Feedback:** Toast, Progress, Skeleton
**Data:** Table, DataTable

**Note:** Follow YAGNI principle - only install components when actually needed.

## Authentication Components

### AuthenticationForms (`components/auth/`)

**Status:** Complete authentication system with email/password and OAuth

The authentication system provides comprehensive user management with multiple sign-in methods and profile management.

#### LoginForm (`components/auth/login-form.tsx`)

**Features:**
- Email/password authentication with Zod validation
- Error handling with Alert component display
- "Remember me" functionality for session persistence
- Password reset link integration
- Redirect handling for protected routes

**Dependencies:**
- `react-hook-form` with `zodResolver` for form validation
- Supabase Auth for authentication service
- shadcn/ui components: Button, Input, Alert, Form primitives

#### SignupForm (`components/auth/signup-form.tsx`)

**Features:**
- Account creation with email confirmation
- Password strength validation
- Terms of service acknowledgment
- Email verification workflow integration
- Automatic redirect to confirmation page

#### ProfileDropdown (`components/auth/profile-dropdown.tsx`)

**Features:**
- User profile display with avatar and email
- Dropdown menu with profile management links
- Sign-out functionality with loading states
- Click-outside-to-close behavior
- Proper accessibility with dropdown navigation

**UI Elements:**
- User icon and caret indicator
- Card-based dropdown design
- Button variants for actions
- Loading states during sign-out

#### OAuthButton (`components/auth/oauth-button.tsx`)

**Features:**
- Google OAuth integration via Supabase Auth
- Customizable provider support (currently Google)
- Loading states and error handling
- Redirect URL management
- Reusable button wrapper with provider branding

#### GoogleIcon (`components/auth/google-icon.tsx`)

**Features:**
- SVG-based Google brand icon
- Consistent sizing and styling
- Proper accessibility attributes
- Brand guideline compliance

### Authentication Integration

**Usage Patterns:**
```tsx
import { LoginForm } from '@/components/auth/login-form'
import { ProfileDropdown } from '@/components/auth/profile-dropdown'
import { OAuthButton } from '@/components/auth/oauth-button'

// Login page
<LoginForm />

// In app header with authenticated user
{user ? <ProfileDropdown user={user} /> : <LoginButton />}

// OAuth sign-in
<OAuthButton provider="google">
  Sign in with Google
</OAuthButton>
```

**Route Integration:**
- Login: `/auth/login`
- Signup: `/auth/signup`  
- Profile: `/auth/profile`
- Password reset: `/auth/reset-password`
- OAuth callback: `/auth/callback`

**Styling:**
- Consistent with shadcn/ui design system
- Spideryarn orange theme integration
- Responsive form layouts
- Proper spacing and typography

## Voice Input Components ✅

### SpeechToTextInput (`components/speech/`)

**Status:** Complete voice input system with OpenAI Whisper integration

The voice input system provides speech-to-text functionality for the chatbot interface with comprehensive error handling and browser compatibility.

#### SpeechToTextInput (`components/speech/SpeechToTextInput.tsx`)

**Features:**
- Click to start/stop or hold to record interaction modes
- Visual feedback during recording (red state with pulsing animation)
- Processing indicator during transcription
- Browser compatibility checking and graceful degradation
- Authentication requirement enforcement
- Comprehensive error handling with recovery guidance

**Dependencies:**
- OpenAI Whisper API for transcription
- MediaRecorder API for browser audio recording
- Permissions API for microphone access checking
- Phosphor Icons for microphone button states

#### useSpeechToText Hook (`components/speech/use-speech-to-text.ts`)

**Features:**
- MediaRecorder API integration with MIME type detection
- Permission state management and browser-specific guidance
- Audio processing and format optimization
- Network retry logic and error recovery
- Resource cleanup and memory management
- HTTPS requirement checking for secure contexts

**Browser Support:**
- Chrome/Chromium 47+ (recommended)
- Firefox 29+
- Safari 14.1+
- Edge 79+
- Requires HTTPS for microphone access

#### Voice Input Integration

**Usage Pattern in Chat Interface:**
```tsx
import { SpeechToTextInput } from '@/components/speech/SpeechToTextInput';

// In chat composer next to send button
<SpeechToTextInput
  onTranscription={(text) => {
    // Use ThreadPrimitive.Suggestion for auto-send
    handleSendMessage(text);
  }}
  disabled={!isAuthenticated || isProcessing}
  className="flex-shrink-0"
/>
```

**Error Handling:**
- Microphone permission denied with browser-specific recovery instructions
- Network failures with retry suggestions
- Authentication required prompts
- HTTPS requirement warnings for localhost development
- Rate limiting with wait time guidance

**Visual States:**
- Idle: Gray microphone icon (Phosphor Microphone)
- Recording: Red microphone with pulsing animation
- Processing: Spinner indicating transcription in progress
- Error: Clear error messaging with recovery instructions

See `docs/reference/TOOL_VOICE_INPUT_SPEECH_TO_TEXT.md` for complete implementation details and troubleshooting guide.

## Best Practices

### When to Use shadcn/ui
- Interactive components requiring state management
- Form elements with validation
- Complex accessibility requirements
- Consistent design system compliance

### When to Use Raw Tailwind
- Simple static layouts
- Basic spacing and typography
- One-off styling needs
- Container and grid systems

### Component Customisation

1. **Theme colours** - Update `app/globals.css` CSS custom properties
2. **Component styling** - Modify copied components in `components/ui/`
3. **Variant additions** - Add new variants to existing components
4. **Size modifications** - Extend size options as needed

### Type Safety

All shadcn/ui components include proper TypeScript definitions:
- Component props are fully typed
- Variant and size options are type-checked
- Integration with existing codebase types

## Testing

Component tests are located in `components/__tests__/`:
- Button component: 5 comprehensive tests covering all variants and interactions
- CommandPalette component: 25 comprehensive tests covering command execution, keyboard shortcuts, authentication states, and context integration
- Focus on user interactions and accessibility
- Jest + React Testing Library setup

## Migration Status

**Completed:**
- ✅ Button - All instances migrated (25+ across 9 files)
- ✅ Loading states - Standardised across application
- ✅ Error states - Using Alert component
- ✅ Command - Complete command palette implementation with comprehensive testing

**Pending:**
- Dialog - Custom implementation retained for compatibility
- Form components - Will be added when forms are actually needed
- Tab system - Future enhancement candidate

**YAGNI Applied:**
- Select and Checkbox installed but unused until requirements emerge
- Form validation components deferred
- Complex layout components not needed yet

## Design Reference

Visit `/design` for a live, interactive design reference page showcasing all components, colours, typography, and usage guidelines in context.

## Related Documentation

- `docs/reference/COMMAND_PALETTE_KEYBOARD_INTERFACE.md` - Complete command palette implementation guide
- `docs/reference/COMMAND_PALETTE_FUZZY_SEARCH_CMDK.md` - cmdk library fuzzy search configuration for improving command discoverability
- `docs/reference/KEYBOARD_SHORTCUTS.md` - Keyboard shortcut patterns and platform detection
- `docs/reference/DESIGN_SHADCN_UI_REFERENCE.md` - Installation and technical reference
- `docs/reference/DESIGN_OVERVIEW.md` - Overall styling configuration and theme
- `planning/250530a_shadcn_ui_adoption.md` - Implementation planning and decisions
- `CLAUDE.md` - Quick reference for AI agents
- `/design` - Live design reference and style guide