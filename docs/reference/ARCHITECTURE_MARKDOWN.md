# Markdown Architecture and Usage Guidelines

Unified guidelines for Markdown processing across the Spideryarn Reading codebase, consolidating multiple approaches into a single, consistent architecture.

## See also

- `components/chat-markdown.tsx` - Full-featured markdown for chat interface using @assistant-ui/react-markdown
- `lib/utils/markdown-processor.ts` - Unified markdown processing pipeline for HTML output
- `components/unified-left-pane.tsx` - Glossary pane using React markdown rendering
- `components/simple-document-viewer.tsx` - Tooltip markdown rendering using HTML output
- `docs/reference/TOOL_GLOSSARY.md` - Glossary feature documentation with markdown rendering
- `package.json` - Markdown dependencies: @assistant-ui/react-markdown, unified, remark-gfm

## Principles and Key Decisions

**Unified Architecture**: All Markdown processing uses the same underlying technology (unified ecosystem + remark-gfm) with different presentation layers for different contexts.

**No Regex Patterns**: Replaced fragile regex-based implementations with proper Markdown parsing to ensure reliability and feature completeness.

**Security First**: All Markdown rendering includes built-in XSS protection and sanitization.

**Performance Optimized**: Leverages existing dependencies without increasing bundle size.

## Markdown Processing Architecture

### Core Technology Stack

**Unified Ecosystem**: All Markdown processing uses the unified/remark/rehype ecosystem:
- `unified` - Core processor for syntax trees
- `remark-parse` - Markdown to AST parsing
- `remark-gfm` - GitHub Flavored Markdown support
- `remark-rehype` - Markdown AST to HTML AST transformation
- `rehype-stringify` - HTML AST to string serialization

**React Integration**: `@assistant-ui/react-markdown` provides React components built on react-markdown.

### Two Output Formats

#### 1. React JSX Output
**Use Case**: React components that need to render Markdown content
**Technology**: `@assistant-ui/react-markdown`'s `MarkdownTextPrimitive`
**Examples**: Glossary pane, document summaries, structured content

```tsx
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";

<MarkdownTextPrimitive content={markdownText} />
```

#### 2. HTML String Output
**Use Case**: Dynamic HTML content like tooltips, programmatic DOM manipulation
**Technology**: Unified pipeline with `rehype-stringify`
**Examples**: Glossary tooltips, dynamic content injection

```typescript
import { markdownToHtml } from '@/lib/utils/markdown-processor';

const htmlString = markdownToHtml(markdownText);
```

## Usage Guidelines

### When to Use Each Approach

#### React JSX Output (`MarkdownTextPrimitive`)
- ✅ **Use for**: React components, static content rendering, glossary panes
- ✅ **Benefits**: Type safety, React integration, component lifecycle
- ✅ **Security**: Built-in XSS protection, no dangerouslySetInnerHTML

#### HTML String Output (`markdownToHtml`)
- ✅ **Use for**: Tooltips, dynamic DOM manipulation, programmatic HTML generation
- ✅ **Benefits**: Direct HTML control, works with third-party DOM libraries
- ✅ **Security**: Sanitized output from unified pipeline

#### Chat Interface (Existing)
- ✅ **Use for**: Chat messages, full-featured markdown
- ✅ **Technology**: `@assistant-ui/react-markdown` with full feature set
- ✅ **Features**: Links, images, code blocks, tables

### Supported Markdown Features

Both approaches support:
- **Basic formatting**: bold, italic, code spans
- **GitHub Flavored Markdown**: strikethrough, tables, task lists
- **Line breaks**: Proper paragraph and line break handling
- **Security**: XSS protection and content sanitization

### Migration from Legacy Implementations

#### Old Regex-Based Approach ⚠️ (Deprecated)
```typescript
// OLD - Don't use
const html = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
```

#### New Unified Approach ✅
```typescript
// NEW - Recommended
import { markdownToHtml } from '@/lib/utils/markdown-processor';
const html = markdownToHtml(text);
```

## Implementation Details

### React Component Integration

**Standard Pattern**:
```tsx
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";

function MyComponent({ content }: { content: string }) {
  return (
    <div className="markdown-content">
      <MarkdownTextPrimitive content={content} />
    </div>
  );
}
```

### HTML String Generation

**Standard Pattern**:
```typescript
import { markdownToHtml } from '@/lib/utils/markdown-processor';

function createTooltip(content: string) {
  const htmlContent = markdownToHtml(content);
  tooltip.innerHTML = htmlContent;
}
```

### Error Handling

Both approaches handle malformed Markdown gracefully:
- Invalid syntax renders as plain text
- Empty content returns empty output
- Null/undefined content handled safely

## Current Implementation Status

- ✅ **HTML String Pipeline**: `lib/utils/markdown-processor.ts` implemented and tested
- ✅ **React JSX Integration**: Using `@assistant-ui/react-markdown`
- ✅ **Glossary Tooltips**: Migrated to unified pipeline
- ✅ **Glossary Pane**: Migrated to React markdown rendering
- ✅ **Chat Interface**: Already using full-featured markdown
- ✅ **Legacy Cleanup**: Old regex implementations removed (`markdown-to-html.ts` deleted)

## Performance Considerations

**Bundle Size**: No additional dependencies required - leverages existing unified ecosystem and @assistant-ui/react-markdown.

**Runtime Performance**: 
- React JSX: Optimized component rendering with memoization
- HTML String: Efficient string processing with caching potential

**Memory Usage**: Unified AST processing is memory-efficient for typical document content.

## Security Considerations

**XSS Protection**: All Markdown rendering includes built-in sanitization to prevent script injection.

**Content Validation**: Unified pipeline validates Markdown syntax and structure.

**HTML Output**: Generated HTML is safe for innerHTML usage without additional sanitization.

## Troubleshooting

### Common Issues

**Styling Not Applied**: Ensure Tailwind classes are included in your build configuration for markdown content.

**React Hydration Errors**: Use consistent Markdown processing between server and client rendering.

**Tooltip Positioning**: HTML string output may require manual styling for dynamic content.

### Debug Tips

**Check AST**: Use unified's debug utilities to inspect parsed Markdown structure.

**Content Validation**: Verify Markdown syntax if rendering appears incorrect.

**Bundle Analysis**: Monitor bundle size impact when adding new markdown features.

## Future Enhancements

### Planned Features 📋
- **Caching**: Implement markdown processing cache for frequently used content
- **Custom Renderers**: Add custom renderers for specific document elements
- **Advanced Features**: Support for math, diagrams, and specialized notation

### Extension Points
- **Plugin System**: Unified's plugin architecture allows easy feature additions
- **Custom Components**: React markdown can use custom component renderers
- **Preprocessing**: Add content preprocessing before markdown parsing

## Examples

### Glossary Entity Rendering
```tsx
// Before (regex-based)
<div>{entity.long_explanation || entity.brief_explanation}</div>

// After (unified markdown)
<MarkdownTextPrimitive content={entity.long_explanation || entity.brief_explanation} />
```

### Tooltip Content Generation
```typescript
// Before (regex-based)
let tooltipContent = longExplanation || explanation;
tooltipContent = tooltipContent.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

// After (unified markdown)
const tooltipContent = markdownToHtml(longExplanation || explanation);
```

### Chat Message Rendering (Existing)
```tsx
// Already implemented - full-featured markdown
<MarkdownText content={message.content} />
```