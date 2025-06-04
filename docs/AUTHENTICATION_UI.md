# Authentication User Interface

Authentication UI components, forms, and pages built with shadcn/ui components and React Hook Form for type-safe form handling.

## See also

- `docs/AUTHENTICATION_OVERVIEW.md` - High-level authentication system architecture and flows
- `docs/AUTHENTICATION_SETUP.md` - Configuration and setup instructions for development and production
- `docs/AUTHENTICATION_DATABASE.md` - Database integration and user profile data handling
- `docs/AUTHENTICATION_SECURITY.md` - Security patterns and route protection implementation
- `components/auth/` - Authentication UI component implementations
- `app/auth/` - Authentication page layouts and routing
- `docs/SHADCN_UI_REFERENCE.md` - Component library installation and usage patterns

## Component Architecture

**Authentication Components**:
- `components/auth/login-form.tsx` - Email/password login form
- `components/auth/signup-form.tsx` - User registration form  
- `components/auth/oauth-button.tsx` - Reusable OAuth provider button
- `components/auth/profile-dropdown.tsx` - User profile navigation dropdown

**Authentication Pages**:
- `app/auth/login/page.tsx` - Login page layout
- `app/auth/signup/page.tsx` - Signup page layout
- `app/auth/profile/page.tsx` - User profile management
- `app/auth/reset-password/page.tsx` - Password reset request
- `app/auth/reset-password/confirm/page.tsx` - Password reset form
- `app/auth/callback/route.ts` - OAuth callback handler
- `app/auth/logout/route.ts` - Logout route handler

## Form Components

### Login Form ✅

**Location**: `components/auth/login-form.tsx`

**Features**:
- Email and password validation using Zod schema
- Error handling with shadcn/ui Alert component
- Loading states during authentication
- Google OAuth integration with visual separator
- "Forgot password?" link to password reset flow
- Automatic redirect to originally requested page

**Form Schema**:
```typescript
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})
```

### Signup Form ✅

**Location**: `components/auth/signup-form.tsx`

**Features**:
- Email, password, and password confirmation validation
- Password strength requirements (minimum 6 characters)
- Password confirmation matching validation
- Google OAuth registration option
- Immediate login after successful registration
- Error handling and loading states

**Form Schema**:
```typescript
const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})
```

### OAuth Button Component ✅

**Location**: `components/auth/oauth-button.tsx`

**Features**:
- Reusable OAuth provider button (currently Google)
- Loading states with "Connecting..." text
- Proper redirect URL handling with next parameter
- Error handling for OAuth failures
- Google branding compliance

### Profile Dropdown ✅

**Location**: `components/auth/profile-dropdown.tsx`

**Features**:
- User avatar with initials from email address
- Dropdown menu with "Logged in as [email]", Profile, and Logout options
- Click-away functionality to close dropdown
- Keyboard navigation support
- Responsive design for mobile devices
- Loading states during logout process

**User Avatar Logic**:
```typescript
const getInitials = (email: string) => {
  return email
    .split('@')[0]
    .split('.')
    .map(part => part.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2)
}
```

## Page Layouts

### Authentication Page Pattern

All authentication pages follow a consistent layout structure:

```typescript
// Common authentication page layout
<div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
  <div className="max-w-md w-full space-y-8">
    <div>
      {/* Page header with title and description */}
    </div>
    
    <div className="mt-8 bg-white py-8 px-6 shadow rounded-lg sm:px-10">
      {/* Form content */}
    </div>
  </div>
</div>
```

### Login Page ✅

**Route**: `/auth/login`
**Features**:
- Clean, centered layout with Spideryarn branding
- Login form with email/password fields
- Google OAuth button with visual separator
- "Forgot password?" link
- Link to signup page for new users
- Handles `next` parameter for post-login redirects

### Signup Page ✅

**Route**: `/auth/signup`
**Features**:
- Matching design to login page
- Registration form with password confirmation
- Google OAuth signup option
- Link to login page for existing users

### Profile Page ✅

**Route**: `/auth/profile`
**Features**:
- User account information display (email, display name, join date)
- List of user's documents with metadata
- Navigation links to view/share documents
- Document count and ownership statistics
- "Back to Home" navigation button

### Password Reset Pages ✅

**Reset Request Page**: `/auth/reset-password`
- Email input form with validation
- "Send reset link" action
- Confirmation message after email sent
- Back to login navigation

**Reset Confirmation Page**: `/auth/reset-password/confirm`
- New password form with confirmation
- Session validation for reset token
- Password strength requirements
- Automatic login after successful reset

## Header Integration

### App Header Updates ✅

**Location**: `components/app-header.tsx`

**Authentication States**:
- **Unauthenticated**: Shows "Log in" and "Register" buttons
- **Authenticated**: Displays profile dropdown with user avatar
- **Loading**: Shows loading placeholder during auth state resolution

**Integration Pattern**:
```typescript
// Conditional rendering based on authentication state
{!loading && (
  user ? (
    <ProfileDropdown user={user} />
  ) : (
    <div className="auth-buttons">
      <Button asChild variant="ghost" size="sm">
        <Link href="/auth/login">Log in</Link>
      </Button>
      <Button asChild variant="orange" size="sm">
        <Link href="/auth/signup">Register</Link>
      </Button>
    </div>
  )
)}
```

## Styling and Visual Design

### Design Principles

- **Light Mode Only**: Single theme focus for simplicity
- **Spideryarn Orange Theme**: Primary color `hsl(30 62% 57%)` for buttons and accents
- **Clean, Professional**: Minimal design with clear visual hierarchy
- **Responsive**: Works across desktop, tablet, and mobile devices
- **Accessible**: Proper contrast ratios and keyboard navigation

### Component Styling Patterns

**Form Components**:
- shadcn/ui components with consistent spacing
- Error states using destructive Alert variant
- Loading states with disabled form fields
- Focus states with orange accent colors

**Button Styling**:
- Primary actions use `variant="orange"`
- Secondary actions use `variant="outline"`
- OAuth buttons use `variant="outline"` with provider branding

## Form Validation and Error Handling

### Validation Strategy

**Client-Side Validation**:
- Real-time validation using React Hook Form with Zod
- Field-level validation with immediate feedback
- Form-level validation before submission
- Custom validation messages for better UX

**Server-Side Error Handling**:
- Supabase auth error mapping to user-friendly messages
- Network error handling with retry suggestions
- Rate limiting and abuse prevention feedback

### Common Error Messages

**Authentication Errors**:
- "Invalid email or password" - Login failures
- "This email is already registered" - Signup conflicts
- "Please enter a valid email address" - Format validation
- "Passwords don't match" - Confirmation validation
- "Password must be at least 6 characters" - Strength requirements

**OAuth Errors**:
- "Authentication was cancelled" - User cancellation
- "OAuth provider error" - Provider-side failures
- "Unable to connect to Google" - Network issues

## Accessibility Features

### Keyboard Navigation

- **Tab Order**: Logical tab progression through form fields
- **Enter Submission**: Forms submit on Enter key press
- **Escape Handling**: Dropdown menus close on Escape key
- **Focus Management**: Proper focus trapping in modal components

### Screen Reader Support

- **Semantic HTML**: Proper form labels and fieldset groupings
- **ARIA Labels**: Descriptive labels for complex interactions
- **Error Announcements**: Screen reader announcements for validation errors
- **State Changes**: Accessible feedback for loading and success states

### Visual Accessibility

- **Color Contrast**: WCAG AA compliance for text and background colors
- **Focus Indicators**: Clear visual focus states for keyboard navigation
- **Error Indication**: Multiple indicators beyond color (icons, text)
- **Responsive Design**: Accessible across different screen sizes and zoom levels

## Future UI Enhancements

### Planned Visual Polish ⚠️

- **Enhanced Animations**: Smooth page transitions and micro-interactions
- **Loading Skeletons**: Better perceived performance during auth operations
- **Toast Notifications**: Success/error feedback with dismissible toasts
- **Mobile Optimization**: Enhanced mobile-specific interactions and layouts

### Advanced Features 📋

- **Multi-Factor Authentication UI**: TOTP input forms and QR code display
- **Account Settings**: Extended user preference management
- **Team Collaboration UI**: Document sharing and permission management
- **Social Login Expansion**: Additional OAuth providers (GitHub, Apple)

---

*Last updated: 6 June 2025*  
*Implementation Status: Core UI Complete ✅, Visual Polish Planned 📋*  
*Next review: After visual polish implementation*