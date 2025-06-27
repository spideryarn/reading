# Document Listing Component

The `DocumentList` component provides a reusable, consistent interface for displaying collections of documents across multiple pages. It handles document metadata display, user permissions, and contextual actions like deletion.

## See also

- `components/document-list.tsx` - Main component implementation
- `app/auth/profile/page.tsx` - Profile page usage showing user's personal documents
- `app/read/page.tsx` - Read page usage showing all accessible documents
- `docs/reference/DATABASE_SCHEMA.md` - Document table schema and available metadata fields
- `docs/reference/AUTHENTICATION_OVERVIEW.md` - User authentication and permission system
- `docs/reference/DESIGN_TOOLTIPS.md` - Tooltip implementation patterns used for privacy status indicators
- `docs/reference/UI_COMPONENTS.md` - Available UI components and usage patterns
- `lib/services/database/document-service.ts` - Document data access layer
- `lib/types/database.ts` - TypeScript interfaces for document data structures

## Principles, key decisions

- **Reusable across contexts**: Single component serves both personal document lists (/auth/profile) and public document browsing (/read)
- **Permission-aware**: Deletion actions and privacy indicators adapt based on user permissions and document ownership
- **Consistent metadata display**: Standardised information hierarchy (title, date, word count, language) across all usage contexts
- **Accessible design**: Proper semantic markup, keyboard navigation, and screen reader support
- **Database-driven**: Leverages rich document metadata while maintaining clean UI presentation

## Component Architecture

### Props Interface

```typescript
interface DocumentListProps {
  documents: Document[]           // Array of document objects to display
  emptyStateMessage: string       // Custom message when no documents available
  showDeleteActions?: boolean     // Whether to show delete buttons (default: true)
  currentUserId?: string          // User ID for ownership validation
  className?: string              // Additional CSS classes
}
```

### Component Structure

Each document is rendered as a `Card` with two main sections:
1. **Main content area** - Clickable link to document reader
2. **Actions area** - Privacy indicator and delete button (if permitted)

```tsx
<Card>
  <div className="flex items-center">
    {/* Main clickable area */}
    <Link href={`/read/${document.slug}`}>
      <div>
        <h3>{document.title}</h3>
        <div className="metadata-row">
          <Clock icon + creation date />
          <Word count />
          <Language code (if non-English) />
        </div>
      </div>
    </Link>
    
    {/* Action buttons area */}
    <div className="border-l">
      <TooltipOrPopover> {/* Privacy indicator */}
      <DeleteDocumentButton /> {/* If user can delete */}
    </div>
  </div>
</Card>
```

## Usage Patterns

### Profile Page Usage ✓

**Purpose**: Personal document management for authenticated users

```tsx
// app/auth/profile/page.tsx
<DocumentList
  documents={documents}
  emptyStateMessage="Upload your first document to get started with AI-powered reading assistance."
  showDeleteActions={true}
  currentUserId={user.id}
/>
```

**Characteristics**:
- Limited to user's own documents (10 most recent)
- Full deletion permissions
- Personalised empty state messaging
- User-scoped data via `DocumentService.getByUserId()`

### Read Page Usage ✓

**Purpose**: Document browsing and discovery interface

```tsx
// app/read/page.tsx
<DocumentList
  documents={documents}
  emptyStateMessage="No documents available."
  showDeleteActions={true}
  currentUserId={userId}
/>
```

**Characteristics**:
- Shows all accessible documents (up to 1000)
- Respects Row Level Security policies
- Conditional deletion based on ownership
- Admin users see all documents in system
- Regular users see their own + public documents

## Displayed Information

### Primary Metadata

**Document Title**: Clickable link to full document reader (`/read/${document.slug}`)

**Creation Date**: Formatted UK date with clock icon
- Uses `formatDate()` utility for consistent formatting
- Displays document creation timestamp

**Word Count**: Formatted with locale-appropriate number separators
- Calculated field from document processing
- Helps users estimate reading time

**Language Code**: Shown only for non-English documents
- Uppercase 2-letter code (e.g., "ES", "FR")
- Helps users identify language before opening

### Visual Indicators

**Privacy Status** (with tooltip):
- **Globe icon** (text-green-600) - Public documents
- **Lock icon** (text-gray-500) - Private documents
- **Rich tooltip content**: Explains privacy implications and sharing status

**Delete Action**:
- Visible only when `document.created_by === currentUserId`
- Confirmation dialog prevents accidental deletion
- Removes document and associated files from storage

## Data Sources and Permissions

### Database Integration

**Document fields utilised**:
- `title`, `slug`, `created_at`, `word_count`, `language_code`
- `is_public`, `created_by` (for permission logic)
- Additional metadata available but not currently displayed

**Permission Logic**:
- **Visibility**: Controlled by Row Level Security policies
- **Deletion**: `document.created_by === currentUserId`
- **Admin override**: Available in read page for system-wide access

### Service Layer Integration

**Profile page**: `DocumentService.getByUserId(userId)` - User's documents only
**Read page**: `DocumentService.list()` - All accessible documents via RLS

Both services return documents sorted by creation date (newest first) with automatic user scoping.

## Styling and Layout

### Card Layout

Uses shadcn/ui `Card` component with:
- Clean borders and subtle shadows
- Responsive padding and spacing
- Hover states for interactive elements

### Metadata Row

Horizontal layout with:
- Clock icon + formatted date
- Word count with appropriate separators
- Language code (conditional display)
- Consistent spacing and typography

### Action Area

Separated by left border:
- Privacy status tooltip
- Delete button (conditional)
- Aligned to right edge

## Responsive Behavior

- **Mobile**: Maintains layout integrity with touch-friendly target sizes
- **Desktop**: Hover states and precise cursor interactions
- **Tooltips**: Cross-device compatibility via `TooltipOrPopover` component

## Future Enhancements 📋

### Planned Features

1. **Enhanced tooltips** - Document summaries, reading time estimates, source information
2. **Sort and filter options** - Date, word count, language, privacy status
3. **Pagination** - For large document collections
4. **Bulk actions** - Multiple document operations
5. **Reading progress indicators** - Track user engagement

### Database Integration Opportunities

The component could leverage additional database fields:
- `source_url` - Show original web source
- `upload_metadata` - Processing method and file type
- `original_file_type` - PDF vs HTML indicators
- `document_users.background` - Personal reading context

## Troubleshooting

### Common Issues

1. **Permission errors**: Ensure `currentUserId` prop is provided for authenticated contexts
2. **Empty states**: Verify `emptyStateMessage` is appropriate for context
3. **Deletion failures**: Check database permissions and file storage access
4. **Tooltip rendering**: Ensure `TooltipProvider` is available in component tree

### Debugging Tips

- Use browser dev tools to inspect document data structure
- Check network tab for API calls to document services
- Verify user authentication status for permission-dependent features
- Test responsive behavior across device sizes

## Implementation Notes

The component is designed to be stateless and receive all data via props, making it easily testable and reusable. All business logic for data fetching, permission checking, and user actions is handled by the parent components and service layer.

The clean separation between data presentation and business logic allows the same component to serve different use cases while maintaining consistent UX patterns across the application.