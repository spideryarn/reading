# Goal

Fix Phosphor Icons SSR compatibility issues and optimize bundle size to resolve /design page server-side rendering failures while maintaining existing icon choices and shadcn/ui integration.

## Context

The design reference page (/design) is failing with SSR errors because UI components (Alert, Spinner, Dialog) import Phosphor icons from the main module that doesn't support server-side rendering. This prevents the design guide from being SSR-compatible.

Current error:
```
TypeError: createContext is not a function
at components/ui/alert.tsx:3:0 (Phosphor icon imports)
```

Research shows Phosphor Icons work well with shadcn/ui and provide better React 19 compatibility than Lucide, making it the preferred choice for this codebase.

## References

- `docs/SOUNDING_BOARD_MODE.md` - Discussion mode for planning decisions
- `planning/250530a_shadcn_ui_adoption.md` - Recent shadcn/ui integration completion
- `app/design/page.tsx` - Failing design reference page
- `components/ui/alert.tsx`, `components/ui/spinner.tsx` - UI components with SSR issues
- Phosphor React documentation - `/dist/ssr/` import pattern for SSR compatibility
- Next.js documentation - `optimizePackageImports` for bundle optimization

## Principles & Key Decisions

1. **Maintain existing icon choices** - Don't force migration to different icons
2. **Preserve shadcn/ui integration** - Keep current component architecture 
3. **Enable SSR for design guide** - Make all UI components server-compatible
4. **Optimize bundle size** - Prevent compilation of unused icon modules
5. **Minimal breaking changes** - Fix imports without changing component APIs

## Actions

### Stage 1: Analysis & Configuration

- [x] Research Phosphor Icons SSR support and shadcn/ui compatibility
- [x] Identify all components with SSR-incompatible Phosphor imports
- [x] Document current import patterns and required changes
- [ ] Add Next.js bundle optimization configuration
  - Add `optimizePackageImports: ["@phosphor-icons/react"]` to `next.config.ts`
  - Test that configuration reduces development compilation time

### Stage 2: Fix UI Component SSR Imports

Components requiring SSR-compatible imports (used in server components):

- [ ] `components/ui/alert.tsx`
  - Change: `import { Warning, Info, CheckCircle } from "@phosphor-icons/react"`
  - To: Individual `/dist/ssr/` imports for each icon
  
- [ ] `components/ui/spinner.tsx`
  - Change: `import { CircleNotch } from "@phosphor-icons/react"`
  - To: `import { CircleNotch } from "@phosphor-icons/react/dist/ssr/CircleNotch"`
  
- [ ] `components/ui/dialog.tsx`
  - Change: `import { X } from "@phosphor-icons/react"`
  - To: `import { X } from "@phosphor-icons/react/dist/ssr/X"`

### Stage 3: Verify Client Component Imports

Components that can remain as client-side imports (already have 'use client'):

- [ ] `components/footer.tsx` - Already has 'use client', no changes needed
- [ ] `components/assistant-chat.tsx` - Client component, maintain current imports
- [ ] `components/simple-chat.tsx` - Client component, maintain current imports
- [ ] `components/chat-ui-states.tsx` - Client component, maintain current imports

Components to verify client directive status:

- [ ] `components/heading-tree.tsx` - Check if needs 'use client' or SSR imports
- [ ] `components/document-header.tsx` - Check if needs 'use client' or SSR imports  
- [ ] `components/dialog.tsx` - Check if needs 'use client' or SSR imports
- [ ] `components/table-of-contents.tsx` - Check if needs 'use client' or SSR imports
- [ ] `components/document-viewer.tsx` - Check if needs 'use client' or SSR imports

### Stage 4: Test SSR Functionality

- [ ] Verify /design page loads without SSR errors
- [ ] Test all UI components render correctly with SSR imports
- [ ] Confirm icon styling and properties work with SSR imports
- [ ] Check TypeScript compilation succeeds (ignore editor autocomplete issues)
- [ ] Verify client-side hydration works properly

### Stage 5: Bundle Size Verification

- [ ] Run development server and verify faster compilation times
- [ ] Build production bundle and analyze icon module inclusion
- [ ] Confirm only used icons are included in final bundle
- [ ] Document bundle size improvements if measurable

### Stage 6: Update Documentation

- [ ] Update `CLAUDE.md` with Phosphor SSR import patterns
- [ ] Add note about `/dist/ssr/` imports for server components
- [ ] Document Next.js optimization configuration
- [ ] Update any icon usage examples in documentation

## Technical Notes

### SSR Import Pattern
```javascript
// Server components (SSR-compatible)
import { Warning } from "@phosphor-icons/react/dist/ssr/Warning"
import { Info } from "@phosphor-icons/react/dist/ssr/Info"

// Client components (can use Context API)
import { Warning, Info } from "@phosphor-icons/react"
```

### Next.js Configuration
```javascript
// next.config.ts
const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react"],
  },
}
```

### Known Limitations
- SSR imports don't support IconContext.Provider for global styling
- TypeScript autocomplete may not work properly with SSR import paths
- Each icon requires individual import path (more verbose)

## Success Criteria

1. `/design` page loads successfully with server-side rendering
2. All shadcn/ui components with Phosphor icons work in SSR environment
3. Development compilation time improves with Next.js optimization
4. Production bundle only includes used icon modules
5. Existing functionality preserved (no breaking changes to component APIs)
6. TypeScript compilation passes without errors

## Risk Assessment

**Low Risk** - This is primarily an import path migration with established patterns:
- Phosphor Icons officially supports SSR with documented `/dist/ssr/` pattern
- Next.js `optimizePackageImports` is a standard optimization
- Changes are isolated to import statements, not component logic
- Fallback: Can revert to 'use client' directives if SSR imports fail

**Rollback Plan**: If SSR imports cause issues, add 'use client' directives to problematic components as immediate fix while investigating.