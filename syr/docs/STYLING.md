# Styling

CSS and visual styling configuration for the Spideryarn Reading application.

## See also

- `lib/config.ts` - UI configuration including theme settings
- `app/globals.css` - Global CSS variables and base styles
- `tailwind.config.js` - Tailwind CSS configuration (if exists)
- `docs/UI_COMPONENTS.md` - shadcn/ui component reference and usage
- `/design` - Live design reference showing all components and colours

## Principles, key decisions

- **Light mode only**: Dark mode is currently disabled via `UI_CONFIG.FORCE_LIGHT_MODE` to avoid visual inconsistencies
- **CSS custom properties**: Use CSS variables for consistent theming
- **Tailwind CSS**: Primary styling framework
- **Component-scoped styles**: Prefer component-level styling over global CSS where possible

## Theme configuration

Theme mode is controlled by `UI_CONFIG.FORCE_LIGHT_MODE` in `lib/config.ts`. Currently set to `true` to force light mode application-wide.

The CSS variables in `app/globals.css` define the colour scheme:

```css
:root {
  --background: #ffffff;
  --foreground: #171717;
  --spideryarn-orange: #DB8A45;
}
```

### Brand colours

- **Spideryarn Orange**: `#DB8A45` - Available as `text-spideryarn-orange` class

Dark mode CSS exists but is commented out until theming is properly implemented.

## Typography

- **Primary font**: Arial, Helvetica, sans-serif (set in `body` element)
- **Geist fonts**: Available via CSS variables `--font-geist-sans` and `--font-geist-mono`
- **Trebuchet MS**: Available as `font-trebuchet` class for logo/branding text
- **Monospace**: Use `font-mono` class for technical data like model IDs, API responses, and configuration values

## Third-party styling

### Tippy.js tooltips

Custom overrides in `app/globals.css` remove default Tippy.js styling:

```css
.tippy-box {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}
```

This allows tooltips to be styled consistently with the application theme.

## Icons

### Phosphor Icons

The project uses Phosphor Icons (`@phosphor-icons/react`) for consistent iconography.

**Basic usage:**
```tsx
import { ArrowRight, House, MagnifyingGlass } from '@phosphor-icons/react'

// Default (regular weight, 24px)
<ArrowRight />

// With custom size and weight
<House size={32} weight="bold" />

// With custom colour
<MagnifyingGlass size={20} color="#666" />
```

**Available weights:** `thin`, `light`, `regular`, `bold`, `fill`, `duotone`

**SSR compatibility:** For Next.js server components, use SSR imports:
```tsx
import { ArrowRight } from '@phosphor-icons/react/dist/ssr'
```

**Browse icons:** https://phosphoricons.com/

## UI Patterns

### Loading/Error Button Pattern

The application uses a consistent pattern for buttons that trigger async operations (API calls). This pattern is used throughout the app, including in the Table of Contents "Generate new headings" button and Document Viewer "Load glossary" button.

**Pattern Implementation:**
1. **Initial State**: Button shows normal text (e.g., "Generate new headings", "Load glossary")
2. **Loading State**: Button becomes disabled and shows `CircleNotch` spinner + "Loading..." text
3. **Success State**: Button disappears and is replaced with content
4. **Error State**: Button is replaced with red error message using `Warning` icon

**Key Components:**
- **Loading Icon**: `CircleNotch` from `@phosphor-icons/react` with `animate-spin` class
- **Error Icon**: `Warning` from `@phosphor-icons/react` 
- **Button States**: `disabled` attribute prevents multiple clicks during loading
- **Error Styling**: `bg-red-50 border-red-200` background with `text-red-800` text

**Example Implementation:**
```tsx
import { CircleNotch, Warning } from '@phosphor-icons/react'

// State management
const [isLoading, setIsLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
const [showContent, setShowContent] = useState(false)

// Button render logic
{!showContent ? (
  <button
    onClick={handleAction}
    disabled={isLoading}
    className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
  >
    {isLoading ? (
      <>
        <CircleNotch className="animate-spin" size={16} />
        Loading...
      </>
    ) : (
      'Action Button'
    )}
  </button>
) : error ? (
  <div className="bg-red-50 border border-red-200 rounded p-3 flex items-start gap-2">
    <Warning className="text-red-600 mt-0.5" size={20} weight="bold" />
    <div className="text-sm text-red-800">
      <div className="font-medium mb-1">Operation failed</div>
      <div className="text-xs">{error}</div>
    </div>
  </div>
) : (
  // Success content here
)}
```

**Testing APIs:**
- `/api/fake_success_delay` - Returns success after 1.5s delay
- `/api/fake_error` - Returns 500 error immediately

## Static assets

### Favicon

The favicon is served from `public/favicon.ico`. Previously there was a conflicting `app/favicon.ico` file that caused 500 errors, but this has been removed to eliminate the Next.js conflict.

## Future work

- Implement proper dark/light mode switching with context provider
- Add Tailwind dark mode configuration
- Create consistent component design system