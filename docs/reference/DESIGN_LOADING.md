# Loading States and Spinner Design

Comprehensive guide to loading states, spinners, and async operation handling in the Spideryarn Reading application. Covers full-page loading screens, component-level loading states, and UX best practices for async operations.

## See also

- `docs/reference/DESIGN_OVERVIEW.md` - Overall styling and CSS configuration
- `docs/reference/UI_COMPONENTS.md` - shadcn/ui component library and usage patterns
- `docs/reference/DESIGN_ICONS.md` - Phosphor Icons usage (our spinner uses CircleNotch icon)
- `docs/reference/DESIGN_SHADCN_UI_REFERENCE.md` - Button component configuration and variants
- `components/ui/spinner.tsx` - Core spinner component implementation
- `components/ui/loading.tsx` - Inline loading component with text
- `components/ui/loading-page.tsx` - Full-page loading screen component
- `app/read/[slug]/loading.tsx` - Next.js route-level loading implementation
- `components/chat-ui-states.tsx` - Chat-specific loading state components

## Principles, key decisions

- **Consistent visual language**: All loading states use Phosphor's CircleNotch icon with `animate-spin` for consistency
- **Context-appropriate sizing**: Different spinner sizes for different contexts (16px inline, 32px full-page)
- **Disable during loading**: Buttons are disabled during async operations to prevent duplicate submissions
- **Meaningful messaging**: Loading text provides context about what's happening ("Loading document...", "Thinking...")
- **Time-based guidelines**: Use spinners for operations under 10 seconds, consider progress indicators for longer operations
- **Component-scoped loading**: Loading states target specific UI sections rather than blocking entire interface when possible

## Core Loading Components

### Spinner Component
The foundation component used across all loading states.

**File**: `components/ui/spinner.tsx`

```tsx
import { CircleNotch } from "@phosphor-icons/react/dist/ssr/CircleNotch"
import { cn } from "@/lib/utils"

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number
  className?: string
}

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ size = 16, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("inline-flex items-center justify-center", className)}
        {...props}
      >
        <CircleNotch 
          size={size} 
          className="animate-spin"
          weight="bold"
        />
      </div>
    )
  }
)
```

**Key features**:
- Uses Phosphor's CircleNotch icon with SSR compatibility
- Configurable size (defaults to 16px)
- Bold weight for better visibility
- Built-in Tailwind `animate-spin` animation

### Inline Loading Component
For loading states within content areas, forms, and components.

**File**: `components/ui/loading.tsx`

```tsx
import { Loading } from "@/components/ui/loading"

// Basic usage
<Loading text="Loading..." />

// With variants
<Loading variant="orange" size="lg" text="Processing..." />
<Loading variant="blue" size="sm" text="Saving..." />
```

**Features**:
- Three color variants: `default` (gray), `orange`, `blue` 
- Three sizes: `sm`, `default`, `lg`
- Customisable loading text
- Configurable spinner size
- Combines spinner + text in horizontal layout

### Full-Page Loading Screen
For route transitions and initial page loads.

**File**: `components/ui/loading-page.tsx`

```tsx
import { LoadingPage } from "@/components/ui/loading-page"

export default function Loading() {
  return (
    <LoadingPage 
      title="Loading document..."
      description="Preparing your reading experience"
      spinnerSize={32}
    />
  )
}
```

**Features**:
- Full viewport height with centered content
- Larger spinner (32px default) for visibility
- Optional title and description text
- Uses Spideryarn orange theme colour
- Consistent with overall app background (gray-50)

## Loading Patterns by Context

### Route-Level Loading (Next.js)
Next.js automatically shows loading.tsx during route transitions.

**File**: `app/read/[slug]/loading.tsx`
```tsx
import { LoadingPage } from "@/components/ui/loading-page"

export default function Loading() {
  return (
    <LoadingPage 
      title="Loading document..."
      description="Preparing your reading experience"
    />
  )
}
```

### Button Loading States
Buttons should be disabled during async operations with loading indicators.

**Pattern used in codebase**:
```tsx
const [isLoading, setIsLoading] = useState(false)

const handleSubmit = async () => {
  setIsLoading(true)
  try {
    await performAsyncOperation()
  } finally {
    setIsLoading(false)
  }
}

return (
  <Button
    onClick={handleSubmit}
    disabled={isLoading}
  >
    {isLoading ? 'Processing...' : 'Submit'}
  </Button>
)
```

**Example from OAuth button** (`components/auth/oauth-button.tsx`):
```tsx
<Button
  type="button"
  variant="outline"
  size="full"
  onClick={handleOAuthSignIn}
  disabled={disabled || isLoading}
  className="flex items-center justify-center gap-2"
>
  {isLoading ? (
    'Connecting...'
  ) : (
    <>
      <GoogleIcon size={20} />
      {children}
    </>
  )}
</Button>
```

### Chat and AI Loading States
Specific loading states for AI operations and chat interactions.

**File**: `components/chat-ui-states.tsx`
```tsx
export function ChatLoadingState({ 
  message = "Thinking...", 
  className = "" 
}: LoadingStateProps) {
  return (
    <div className={`flex items-center gap-2 text-gray-500 py-2 ${className}`}>
      <CircleNotch 
        size={16} 
        className="animate-spin" 
        weight="bold"
      />
      <span className="text-sm">{message}</span>
    </div>
  )
}
```

### Tooltip Loading States
For async tooltip content loading.

**Example from document list** (`components/document-list.tsx`):
```tsx
const [isLoadingTooltip, setIsLoadingTooltip] = useState(false)

const loadTooltipData = useCallback(async () => {
  if (tooltipData || isLoadingTooltip) return
  
  setIsLoadingTooltip(true)
  try {
    const response = await fetch(`/api/read/${document.slug}/tooltip-info`)
    // ... handle response
  } finally {
    setIsLoadingTooltip(false)
  }
}, [])

// Tooltip shows loading state
{isLoadingTooltip && (
  <div className="flex items-center gap-2 text-gray-500">
    <CircleNotch size={14} className="animate-spin" />
    <span>Loading preview...</span>
  </div>
)}
```

## UX Best Practices

### Time-Based Guidelines
- **Under 1 second**: No loading indicator needed (distracting)
- **1-2 seconds**: Simple spinner with minimal text
- **2-10 seconds**: Spinner with descriptive text explaining the action
- **Over 10 seconds**: Consider progress bars or skeleton screens instead

### Loading Message Guidelines
- **Be specific**: "Verifying login" instead of "Loading"
- **Use action verbs**: "Processing document", "Generating summary"
- **Set expectations**: "This may take a few moments"
- **Avoid generic**: Replace "Loading..." with context-specific messages

### Button Loading States
- **Always disable** buttons during async operations
- **Show loading text** that indicates the action in progress
- **Prevent double-clicks** by immediately setting loading state
- **Consider consequences**: Disable cancel buttons for irreversible actions

### Component-Scoped Loading
- **Target specific areas**: Don't block entire interface for partial updates
- **Maintain context**: Keep related UI elements accessible during loading
- **Position appropriately**: Center spinner in the loading content area

### Visual Hierarchy
- **Size matters**: Larger spinners (32px) for full-page, smaller (16px) for inline
- **Colour consistency**: Use theme colours (Spideryarn orange for prominence)
- **Spacing**: Adequate space around loading indicators for readability

## Advanced Loading Patterns

### Skeleton Screens (Future Enhancement)
Based on modern UX research, skeleton screens are preferred for full-page loading scenarios:

- **Immediate visual feedback**: Shows content structure while loading
- **Sets expectations**: Users see the layout they'll receive
- **Reduces perceived loading time**: More engaging than simple spinners
- **Better for complex layouts**: Especially useful for document viewer interface

**Recommendation**: Consider implementing skeleton screens for:
- Document loading (before content appears)
- Tool panel loading (before AI analysis completes)
- Summary generation (before text appears)

### Progressive Loading
For long-running operations:

- **Show intermediate steps**: "Loading document... Analyzing content... Generating summary..."
- **Provide progress indication**: When operation stages are known
- **Allow cancellation**: For operations that can be safely interrupted

### Error State Integration
Loading states should gracefully transition to error states:

```tsx
// Pattern used in codebase
const [isLoading, setIsLoading] = useState(false)
const [error, setError] = useState<string | null>(null)

const handleOperation = async () => {
  setIsLoading(true)
  setError(null)
  
  try {
    await performOperation()
  } catch (err) {
    setError('Operation failed. Please try again.')
  } finally {
    setIsLoading(false)
  }
}
```

## Technical Implementation Notes

### Animation Performance
- Use CSS `animate-spin` class for optimal performance
- Avoid JavaScript-based animations for simple rotations
- Consider `will-change: transform` for complex animations

### Accessibility Considerations
- Include `aria-live` regions for screen readers during loading
- Ensure loading states have sufficient colour contrast
- Provide keyboard navigation during loading states where appropriate

### Next.js Integration
- Route-level loading files automatically shown during navigation
- Suspense boundaries can be used for component-level loading
- Consider using React's `useTransition` for smooth state updates

## Common Pitfalls to Avoid

1. **Generic loading messages**: "Loading..." tells users nothing about what's happening
2. **Full-page spinners for small operations**: Blocks entire interface unnecessarily  
3. **Missing disabled states**: Allows duplicate submissions and errors
4. **Inconsistent spinner styles**: Different icons/animations across the app
5. **No timeout handling**: Infinite loading states with no error fallback
6. **Ignoring user expectations**: Not providing feedback for operations users expect to be instant

## Future Enhancements

### Planned Improvements
- **Skeleton screen components**: For better perceived performance
- **Progress bars**: For operations with known duration/stages
- **Smart loading thresholds**: Dynamic loading indicators based on operation time
- **Loading state analytics**: Track which operations need better feedback

### Research Areas
- **Perceived performance optimization**: Techniques to make loading feel faster
- **Context-aware loading**: Different strategies based on user actions
- **Micro-interactions**: Subtle animations to improve loading experience