# Date Formatting Policy

**Status**: ✅ Stable and implemented  
**Last Updated**: 2025-Jun-28  
**Implementation**: [`lib/utils/date-formatting.ts`](../../lib/utils/date-formatting.ts)

## Overview

This document defines the consistent date formatting policy for user-facing dates across the Spideryarn Reading application. All date displays should use human-readable relative dates with unambiguous absolute dates in tooltips.

## Policy

### User-Facing Format
- **Display**: Human-readable relative dates (e.g., "2 days ago", "yesterday")
- **Tooltips**: Unambiguous absolute dates in format `YYYY-MMM-DD HH:MM` (e.g., "2025-Jun-28 14:30")
- **HTML**: Semantic `<time>` elements with `dateTime` attribute for accessibility

### Internal/Developer Format
- **File naming and documentation**: Use alphanumerically sortable format `YYMMDD[x]_` (e.g., "250628a_", "250628b_")
- **Script**: Use `scripts/generate-sequential-datetime-prefix.ts` for sequential prefixes
- **Examples**: Planning docs, conversation logs, internal documentation
- **Benefits**: Files naturally sort chronologically in file explorers

### Implementation

Use the utilities from `lib/utils/date-formatting.ts`:

```tsx
import { formatUserDate } from '@/lib/utils/date-formatting';

// For general user-facing dates
const { relative, absolute, iso } = formatUserDate(document.created_at);

<time dateTime={iso} title={absolute}>
  {relative}
</time>
```

### Context-Specific Functions

1. **`formatUserDate()`**: General user-facing dates (document lists, activity feeds)
   - Display: Relative time ("2 days ago")
   - Tooltip: Absolute format ("2025-Jun-28 14:30")

2. **`formatProfileDate()`**: Profile and settings contexts
   - Display: Formal date format ("2025-Jun-28")
   - Tooltip: With time ("2025-Jun-28 14:30")

3. **`formatMetadataDate()`**: Metadata panels
   - Display: Relative time ("2 days ago")
   - Additional: Full date for secondary display ("28 Jun 2025")

## Implementation Examples

### Document Lists
```tsx
// ✅ Correct
<time 
  dateTime={formatUserDate(document.created_at).iso}
  title={formatUserDate(document.created_at).absolute}
>
  {formatUserDate(document.created_at).relative}
</time>

// ❌ Incorrect - old format
{new Date(document.created_at).toLocaleDateString('en-GB')}
```

### Profile Pages
```tsx
// ✅ Correct
<time 
  dateTime={formatProfileDate(user.created_at).iso}
  title={formatProfileDate(user.created_at).absolute}
>
  {formatProfileDate(user.created_at).relative}
</time>
```

## Benefits

1. **Consistency**: Unified date display across all components
2. **Accessibility**: Semantic HTML with proper `dateTime` attributes
3. **User Experience**: Human-readable at-a-glance with precise details on hover
4. **Internationalisation Ready**: Uses `date-fns` library for future locale support

## Dependencies

- **date-fns**: For robust date formatting and manipulation
- **Existing Integration**: Already installed and used in MetadataPanel

## Components Updated

- [`components/document-list.tsx`](../../components/document-list.tsx) - Document creation dates
- [`app/auth/profile/page.tsx`](../../app/auth/profile/page.tsx) - Profile registration dates

## See Also

- [`lib/utils/date-formatting.ts`](../../lib/utils/date-formatting.ts) - User-facing date implementation
- [`scripts/generate-sequential-datetime-prefix.ts`](../../scripts/generate-sequential-datetime-prefix.ts) - Internal date prefix generation
- [`docs/reference/UI_COMPONENTS.md`](./UI_COMPONENTS.md) - General UI component guidelines
- [`docs/reference/DESIGN_OVERVIEW.md`](./DESIGN_OVERVIEW.md) - Design system patterns