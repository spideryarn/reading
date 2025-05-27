# Styling

CSS and visual styling configuration for the Spideryarn Reading application.

## See also

- `lib/config.ts` - UI configuration including theme settings
- `app/globals.css` - Global CSS variables and base styles
- `tailwind.config.js` - Tailwind CSS configuration (if exists)

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

## Static assets

### Favicon

The favicon is served from `public/favicon.ico`. Previously there was a conflicting `app/favicon.ico` file that caused 500 errors, but this has been removed to eliminate the Next.js conflict.

## Future work

- Implement proper dark/light mode switching with context provider
- Add Tailwind dark mode configuration
- Create consistent component design system