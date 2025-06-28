# Analytics Architecture

Analytics tracking for user behaviour analysis and application performance monitoring through Hotjar integration with Next.js App Router.

## See also

- `app/layout.tsx` - Root layout with Hotjar tracking implementation
- `.env.local` - Analytics configuration and environment variables
- `docs/reference/SITE_ORGANISATION_WEBSITE_STRUCTURE.md` - Complete application architecture
- `docs/reference/ARCHITECTURE_OVERVIEW.md` - System architecture implementation
- [Hotjar Documentation](https://help.hotjar.com/hc/en-us/articles/115009336727-How-to-Install-Your-Hotjar-Tracking-Code) - Official installation guide

## Principles and Key Decisions

- **Privacy-conscious**: Only track user behaviour, not sensitive document content
- **Environment-based**: Analytics only loads when configured (production environments)
- **Best practices compliance**: Uses Next.js Script component with proper loading strategy
- **Single tracking solution**: Hotjar chosen for comprehensive user behaviour insights (heatmaps, session recordings, user feedback)

## Current Implementation ✓

### Hotjar Integration

**Configuration**: Environment variables in `.env.local`:
```bash
NEXT_PUBLIC_HOTJAR_ID=6448124
NEXT_PUBLIC_HOTJAR_VERSION=6
```

**Implementation**: Root layout script injection (`app/layout.tsx`):
```typescript
{process.env.NEXT_PUBLIC_HOTJAR_ID && (
  <Script
    id="hotjar-tracking"
    strategy="afterInteractive"
    dangerouslySetInnerHTML={{
      __html: `
        (function(h,o,t,j,a,r){
          h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
          h._hjSettings={hjid:${process.env.NEXT_PUBLIC_HOTJAR_ID},hjsv:${process.env.NEXT_PUBLIC_HOTJAR_VERSION || 6}};
          a=o.getElementsByTagName('head')[0];
          r=o.createElement('script');r.async=1;
          r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
          a.appendChild(r);
        })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
      `
    }}
  />
)}
```

### Key Features

**Automatic Coverage**: 
- Tracks all application routes automatically via root layout placement
- Includes authentication flows, document viewer, upload workflow, and settings pages
- No additional configuration required for new pages

**Environment Safety**:
- Only loads when `NEXT_PUBLIC_HOTJAR_ID` is configured
- Conditional rendering prevents tracking in development unless explicitly enabled
- Production-ready with HTTPS requirement automatically handled

**Performance Optimisation**:
- Uses `afterInteractive` loading strategy for non-blocking initialisation
- Asynchronous script loading to prevent render delays
- Minimal impact on Core Web Vitals metrics

## Tracking Scope

### Pages Tracked
- **Public routes**: Homepage, landing pages
- **Authentication flows**: Login, signup, profile, password reset
- **Document management**: Upload workflow, document library, viewer interface
- **AI features**: Chat interactions, summary generation, glossary usage
- **Settings**: User preferences, configuration pages

### Data Collected
- **User interactions**: Clicks, form submissions, navigation patterns
- **Session recordings**: User journey analysis and usability insights
- **Heatmaps**: Visual interaction patterns on key pages
- **Performance metrics**: Page load times and user experience indicators

### Privacy Considerations
- **No sensitive content**: Document text content is not transmitted to Hotjar
- **User-scoped data**: Tracking respects user authentication boundaries
- **Compliance ready**: GDPR-compliant data collection patterns

## Integration Architecture

### Next.js App Router Compatibility
- **Server-side rendering**: Script injection works correctly with SSR
- **Client hydration**: Tracking initialises properly after React hydration
- **Route transitions**: Continues tracking across Next.js client-side navigation

### Content Security Policy (CSP) Configuration
**Hotjar-specific CSP directives** (configured in `next.config.ts`):
```typescript
"script-src": "https://static.hotjar.com https://script.hotjar.com"
"style-src": "https://*.hotjar.com"
"font-src": "https://script.hotjar.com"
"connect-src": "https://*.hotjar.com https://*.hotjar.io wss://*.hotjar.com"
```

**Security compliance**: CSP configuration follows Hotjar's official requirements while maintaining strict security policies for other resources.

### Production Deployment
- **Domain configuration**: Configured for www.spideryarn.com production domain
- **Environment variables**: Managed through Vercel deployment settings
- **HTTPS requirement**: Automatically satisfied by production deployment
- **CSP implementation**: Comprehensive Content Security Policy includes all required Hotjar domains

## Future Enhancements 📋

### Additional Analytics Providers
- **Google Analytics**: For detailed traffic and conversion analysis
- **PostHog**: For advanced product analytics and feature flagging
- **Mixpanel**: For detailed event tracking and user lifecycle analysis

### Advanced Tracking Features
- **Custom event tracking**: AI feature usage, document processing completion
- **User segmentation**: New vs returning users, document upload patterns
- **Conversion funnels**: Registration to first document upload tracking

### Privacy and Compliance
- **Cookie consent management**: GDPR and CCPA compliance implementation
- **Data retention policies**: Configurable retention periods for different data types
- **User opt-out mechanisms**: Privacy controls in user settings

## Troubleshooting

### Common Issues
1. **Tracking not working**: Verify `NEXT_PUBLIC_HOTJAR_ID` is set correctly
2. **Development environment**: Hotjar requires HTTPS, so local testing may not work
3. **Script loading errors**: Check browser console for Content Security Policy issues

### Verification
- Visit production site at www.spideryarn.com
- Check browser developer tools Network tab for hotjar script loading
- Verify in Hotjar dashboard that data is being received

### Development Testing
```bash
# Check environment configuration
echo $NEXT_PUBLIC_HOTJAR_ID

# Enable Hotjar in development (if needed for testing)
NEXT_PUBLIC_HOTJAR_ID=6448124 npm run dev
```

## Implementation Notes

- **Site ID**: 6448124 (configured in Hotjar dashboard)
- **Version**: Currently using Hotjar tracking version 6
- **Deployment**: Automatically deployed with Next.js application via Vercel
- **Monitoring**: Track analytics in Hotjar dashboard for user insights and optimisation opportunities