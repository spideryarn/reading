# Tweet Thread View

> **⚠️ DEPRECATED**: This tool has been removed from the application. The Tweet Thread button has been removed from the Document Header, and this feature is no longer available in the unified tool system. This documentation is preserved for historical reference only.

The tweet thread feature converts academic documents into Twitter-style thread format, making research papers and long-form content accessible for social media sharing.

## See also

- `components/tweet-thread-view.tsx` - Main tweet thread component
- `components/tweet-card.tsx` - Individual tweet display component
- `app/api/tweet-thread/route.ts` - API endpoint for thread generation
- `app/documents/[slug]/tweets/page.tsx` - Tweet thread page routing
- `lib/prompts/templates/tweet-thread.njk` - Thread generation prompt template
- `docs/reference/LLM_PROMPT_TEMPLATES.md` - Prompt template system documentation
- `docs/planning/finished/250530d_tweet_thread_view.md` - Implementation planning

## Key Features

### AI-Powered Thread Generation
- Converts document content to engaging Twitter thread format
- Maintains academic accuracy while improving accessibility
- Generates thread summary and individual tweet content
- Supports multiple LLM providers (Claude, Gemini)

### Copy-to-Clipboard Integration
- One-click copying of complete thread in Markdown format
- Includes thread summary and Spideryarn attribution
- Preserves tweet numbering and formatting
- Visual feedback with success states

### Planned Social Integration
- Bluesky posting integration (coming soon)
- Direct social media sharing capabilities
- Platform-specific formatting optimization

## Implementation Architecture

### Auto-Generation Pattern
Following the established pattern from glossary feature:
- Automatically generates when tab becomes active
- Shows loading state during generation
- Caches results until document changes
- Error handling with retry options

### Component Structure
```typescript
interface Tweet {
  text: string;
  number: number;
}

interface TweetThreadResponse {
  tweets: Tweet[];
  summary: string;
  metadata: {
    tweet_count: number;
    content_length: number;
    truncated: boolean;
  };
}
```

### State Management
- Loading states with progress indicators
- Error boundaries with user-friendly messages
- Success states with interaction feedback
- Parent component communication via callbacks

## UI/UX Design

### Visual Hierarchy
- Twitter-style blue gradient header with thread icon
- Clean card-based layout for individual tweets
- Metadata display (tweet count, character counts)
- Action buttons for copy and future social posting

### Responsive Layout
- Optimized for mobile and desktop viewing
- Smooth scrolling and navigation
- Accessible design patterns
- Loading states with branded styling

### Copy Functionality
- Formats thread as numbered Markdown list
- Includes Spideryarn attribution and document URL
- Visual confirmation with icon state changes
- Clipboard integration with error handling

## Content Generation

### Prompt Template System
Uses standardized Nunjucks + Zod template approach:
- Document content analysis for key themes
- Academic-to-social tone conversion
- Thread coherence and engagement optimization
- Character limit compliance per tweet

### Thread Structure
- Opening tweet that hooks readers
- Content tweets that build narrative
- Summary tweets that conclude themes
- Appropriate hashtags and mentions
- Maintains academic integrity

## Performance Considerations

### Lazy Loading
- Generates content only when tab is accessed
- Prevents unnecessary API calls
- Caches results for session duration
- Efficient re-rendering patterns

### Content Limits
- Handles document truncation for very large files
- Graceful degradation for edge cases
- Error messages for content processing failures

## Future Enhancements

### Social Media Integration
- Direct posting to Twitter/X
- Bluesky integration (UI already implemented)
- Platform-specific optimization
- Scheduling and draft management

### Thread Customization
- User-adjustable thread length
- Tone and style preferences
- Hashtag customization options
- Manual tweet editing capabilities

### Analytics and Tracking
- Thread performance metrics
- Engagement tracking integration
- A/B testing for different formats
- Usage analytics and optimization