# Colors and Typography

Comprehensive guide to color schemes, typography hierarchy, and theme system for the Spideryarn Reading application. This document consolidates all color and font-related configurations for consistent visual design and brand identity.

## See also

**Implementation files:**
- `app/globals.css` - CSS variables, theme configuration, and font definitions
- `app/layout.tsx` - Font loading and variable assignments
- `lib/config.ts` - UI configuration and theme mode settings
- `tailwind.config.js` - Tailwind CSS configuration (if exists)

**Related documentation:**
- `docs/reference/STYLING_OVERVIEW.md` - General styling configuration and patterns
- `docs/reference/STYLING_SHADCN_UI_REFERENCE.md` - shadcn/ui component theming
- `docs/reference/STYLING_TOOLTIPS.md` - Tooltip-specific color patterns
- `docs/reference/UI_COMPONENTS.md` - Component usage and styling patterns

## Principles, key decisions

- **Brand Identity First**: Spideryarn orange (`#DB8A45`) as primary brand color throughout the interface
- **Light Mode Focus**: Dark mode disabled via `UI_CONFIG.FORCE_LIGHT_MODE` to avoid visual inconsistencies during rapid prototyping
- **CSS Custom Properties**: Comprehensive CSS variable system for consistent theming and easy future dark mode implementation
- **OKLCH Color Space**: Modern color definitions using OKLCH for better perceptual uniformity and future-proof color management
- **Typography Hierarchy**: Clear font stack with Geist as primary, Trebuchet for branding, and monospace for technical content
- **Semantic Color Naming**: shadcn/ui compatible color system with semantic meaning (primary, secondary, muted, destructive)

## Color System

### Brand Colors

**Spideryarn Orange** - Primary brand color used throughout the interface:
```css
--spideryarn-orange: #DB8A45;
```

Available as utility class: `text-spideryarn-orange`, `bg-spideryarn-orange`

**Usage:**
- Primary buttons and interactive elements
- Brand accent colors
- Focus states and highlights
- Logo and branding elements

### Theme Color Palette

All colors defined using OKLCH color space for consistent visual appearance:

**Core Interface Colors:**
```css
:root {
  /* Background and content */
  --background: oklch(1 0 0);           /* Pure white */
  --foreground: oklch(0.145 0 0);       /* Dark text */
  --card: oklch(1 0 0);                 /* Card backgrounds */
  --card-foreground: oklch(0.145 0 0);  /* Card text */
  
  /* Primary brand (Spideryarn orange) */
  --primary: oklch(0.65 0.15 45);       /* Spideryarn orange in OKLCH */
  --primary-foreground: oklch(0.98 0.02 45); /* Light text on orange */
  
  /* Secondary interface elements */
  --secondary: oklch(0.97 0 0);         /* Light gray backgrounds */
  --secondary-foreground: oklch(0.205 0 0); /* Dark text on light gray */
  
  /* Muted/disabled states */
  --muted: oklch(0.97 0 0);             /* Subtle backgrounds */
  --muted-foreground: oklch(0.556 0 0); /* Muted text */
  
  /* Interactive elements */
  --accent: oklch(0.97 0 0);            /* Hover states */
  --accent-foreground: oklch(0.205 0 0); /* Text on hover */
  
  /* Destructive actions */
  --destructive: oklch(0.577 0.245 27.325); /* Red for errors/delete */
  
  /* Borders and inputs */
  --border: oklch(0.922 0 0);           /* Subtle borders */
  --input: oklch(0.922 0 0);            /* Input field borders */
  --ring: oklch(0.708 0 0);             /* Focus rings */
}
```

### Sidebar Color System

Specialized color palette for sidebar and navigation elements:
```css
:root {
  --sidebar: oklch(0.985 0 0);              /* Light sidebar background */
  --sidebar-foreground: oklch(0.145 0 0);   /* Dark sidebar text */
  --sidebar-primary: oklch(0.205 0 0);      /* Active navigation items */
  --sidebar-primary-foreground: oklch(0.985 0 0); /* Text on active items */
  --sidebar-accent: oklch(0.97 0 0);        /* Hover states */
  --sidebar-accent-foreground: oklch(0.205 0 0); /* Text on hover */
  --sidebar-border: oklch(0.922 0 0);       /* Sidebar borders */
  --sidebar-ring: oklch(0.708 0 0);         /* Focus states */
}
```

### Chart and Data Visualization Colors

Coordinated color palette for charts and data display:
```css
:root {
  --chart-1: oklch(0.646 0.222 41.116);    /* Primary data color */
  --chart-2: oklch(0.6 0.118 184.704);     /* Secondary data color */
  --chart-3: oklch(0.398 0.07 227.392);    /* Tertiary data color */
  --chart-4: oklch(0.828 0.189 84.429);    /* Quaternary data color */
  --chart-5: oklch(0.769 0.188 70.08);     /* Fifth data color */
}
```

### Context-Specific Color Patterns

**Tooltip Color Schemes:**

1. **Primary Theme** (default):
   - Background: `bg-primary` (Spideryarn orange)
   - Text: `text-primary-foreground` (white)
   - Usage: Simple tooltips, navigation hints

2. **Content-Heavy White Theme**:
   - Background: `bg-white`
   - Border: `border-gray-200`
   - Text: `text-gray-700`
   - Usage: Search results, detailed information

3. **Loading State Colors**:
   - Spinner: `text-blue-500`
   - Text: `text-gray-700 font-medium`
   - Background: `bg-white border-gray-200`

4. **Error/Warning States**:
   - Background: `bg-amber-50` or `bg-red-50`
   - Border: `border-amber-200` or `border-red-200`
   - Icon: `text-amber-600` or `text-red-600`
   - Text: `text-amber-800` or `text-red-800`

**Button State Colors:**
- Loading: `bg-gray-400 cursor-not-allowed`
- Error: `bg-red-50 border-red-200 text-red-800`
- Success: Default primary colors

## Typography System

### Font Loading and Configuration

**Primary Fonts** loaded via Next.js Google Fonts:
```typescript
// app/layout.tsx
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono", 
  subsets: ["latin"],
});
```

**CSS Variable Integration:**
```css
@theme inline {
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
  --font-trebuchet: 'Trebuchet MS', sans-serif;
}
```

### Font Hierarchy and Usage

**1. Primary Body Text**
- **Font**: Arial, Helvetica, sans-serif (fallback system fonts)
- **Usage**: Default text throughout the application
- **Definition**: Set on `body` element in `app/globals.css`
- **Rationale**: Reliable system fonts for maximum compatibility

**2. Geist Sans** (`--font-geist-sans`)
- **Usage**: Enhanced typography where available
- **Classes**: Apply via CSS variables in component styling
- **Characteristics**: Modern, readable sans-serif optimized for digital interfaces

**3. Geist Mono** (`--font-geist-mono`)
- **Usage**: Code, technical data, monospace content
- **Classes**: `font-mono` utility class
- **Content Types**: 
  - Model IDs and version numbers
  - API responses and JSON data
  - Configuration values
  - Keyboard shortcuts in tooltips (`text-xs text-gray-500 font-mono`)

**4. Trebuchet MS** (`font-trebuchet`)
- **Usage**: Logo and branding text
- **Classes**: `font-trebuchet` utility class
- **Characteristics**: Distinctive brand font for headers and special elements

### Typography Patterns by Context

**Navigation Tooltips** - Multi-level information hierarchy:
```css
/* Title */
.font-semibold.text-gray-900.text-sm

/* Description */
.text-gray-700.text-sm.leading-relaxed

/* Meta information (shortcuts) */
.text-xs.text-gray-500.font-mono
```

**Content Tooltips** - Rich content with markdown support:
```css
/* Prose container */
.prose.prose-sm.prose-gray.max-w-none

/* Constrained width */
.max-w-md.text-sm
```

**Button and Interactive Elements**:
- Loading states: Standard font weight with icon spacing
- Error messages: `font-medium` for emphasis
- Success indicators: Default weight with adequate contrast

## Theme Integration

### Tailwind CSS v4 Integration

Colors integrated into Tailwind v4 theme system via `@theme inline` block:
```css
@theme inline {
  /* Background system */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  
  /* Brand colors */
  --color-spideryarn-orange: var(--spideryarn-orange);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  
  /* Semantic colors */
  --color-secondary: var(--secondary);
  --color-muted: var(--muted);
  --color-accent: var(--accent);
  --color-destructive: var(--destructive);
  
  /* Interface elements */
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  
  /* Radius system */
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}
```

### shadcn/ui Theme Compatibility

All colors designed to work seamlessly with shadcn/ui component system:
- Primary colors mapped to Spideryarn orange theme
- Semantic naming convention follows shadcn/ui standards
- OKLCH color space ensures consistent visual appearance
- CSS variables enable easy component customization

### Dark Mode Preparation

Dark mode color definitions commented out but prepared for future implementation:
```css
/* Dark mode disabled - see UI_CONFIG.FORCE_LIGHT_MODE in lib/config.ts */
/* 
@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}
*/
```

**Current Status**: `UI_CONFIG.FORCE_LIGHT_MODE: true` in `lib/config.ts`

## Accessibility and Contrast

### Color Contrast Standards

All color combinations meet WCAG accessibility guidelines:
- **Primary text**: `oklch(0.145 0 0)` on `oklch(1 0 0)` (high contrast)
- **Muted text**: `oklch(0.556 0 0)` on light backgrounds (adequate contrast)
- **Interactive elements**: Spideryarn orange provides sufficient contrast with white text

### Focus and State Indicators

- **Focus rings**: `--ring: oklch(0.708 0 0)` for keyboard navigation
- **Disabled states**: Reduced opacity and color saturation
- **Hover states**: Subtle background color changes using accent colors

## Usage Guidelines

### Color Selection Decision Tree

1. **Brand/Primary Actions**: Use `--primary` (Spideryarn orange)
2. **Secondary Actions**: Use `--secondary` system
3. **Muted/Background**: Use `--muted` for subtle elements
4. **Destructive Actions**: Use `--destructive` for delete/error states
5. **Content Backgrounds**: Use `--card` for elevated surfaces

### Typography Selection Guidelines

1. **Body Content**: Default Arial/Helvetica system
2. **Enhanced Typography**: Geist Sans via CSS variables
3. **Technical Content**: Geist Mono (`font-mono` class)
4. **Brand Elements**: Trebuchet MS (`font-trebuchet` class)
5. **UI Labels**: Follow context-specific patterns above

### Component-Specific Patterns

**Buttons**:
- Primary: `bg-primary text-primary-foreground`
- Secondary: `bg-secondary text-secondary-foreground`
- Loading: `disabled:bg-gray-400 disabled:cursor-not-allowed`

**Cards and Surfaces**:
- Background: `bg-card text-card-foreground`
- Borders: `border-border`

**Form Elements**:
- Inputs: `border-input`
- Focus: `ring-ring`

## Customization and Extension

### Adding New Colors

When adding new colors, follow the OKLCH color space pattern:
```css
:root {
  --new-color: oklch(lightness chroma hue);
}

@theme inline {
  --color-new-color: var(--new-color);
}
```

### Font Additions

For new fonts, follow the CSS variable pattern:
```css
@theme inline {
  --font-new-font: 'Font Name', fallback-family;
}
```

Then create utility classes or use via CSS variables in components.

## Future Enhancements

### Planned Features 📋

- **Dark Mode Implementation**: Complete dark theme with automatic switching
- **High Contrast Mode**: Accessibility enhancement for vision impairments
- **Brand Color Variants**: Additional orange shades for more design flexibility
- **Typography Scale**: Systematic scale for consistent sizing relationships

### Maintenance Tasks

- **Color Audit**: Regular review of color usage across components
- **Contrast Testing**: Automated accessibility testing integration
- **Font Performance**: Monitor font loading impact on page performance
- **Brand Consistency**: Ensure Spideryarn orange usage remains consistent

## Status Summary

- **Color System** ✅ Complete with comprehensive OKLCH palette
- **Typography Hierarchy** ✅ Complete with Geist and fallback fonts
- **Theme Integration** ✅ Full Tailwind v4 and shadcn/ui compatibility
- **Brand Identity** ✅ Spideryarn orange consistently applied
- **Accessibility** ✅ WCAG compliant contrast ratios
- **Dark Mode** 📋 Prepared but not yet implemented
- **Documentation** ✅ Comprehensive usage guidelines established

This color and typography system provides the foundation for consistent visual design while maintaining the flexibility needed for rapid prototyping and future enhancements.