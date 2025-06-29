# Analytics Architecture

Analytics tracking for user behaviour analysis and application performance monitoring through hybrid integration: Google Analytics 4 (via @next/third-parties) and Hotjar (via Next.js Script component) with Next.js App Router.

## See also

- `app/layout.tsx` - Root layout with Google Analytics and Hotjar tracking implementation
- `next.config.ts` - Content Security Policy configuration for analytics providers
- `.env.local` - Analytics configuration and environment variables
- `docs/reference/SITE_ORGANISATION_WEBSITE_STRUCTURE.md` - Complete application architecture
- `docs/reference/ARCHITECTURE_OVERVIEW.md` - System architecture implementation
- [Next.js @next/third-parties Documentation](https://nextjs.org/docs/app/building-your-application/optimizing/third-party-libraries) - Official Google Analytics integration guide
- [Hotjar Documentation](https://help.hotjar.com/hc/en-us/articles/115009336727-How-to-Install-Your-Hotjar-Tracking-Code) - Official installation guide

## Principles and Key Decisions

- **Privacy-conscious**: Only track user behaviour, not sensitive document content
- **Environment-based**: Analytics only loads when configured (production environments)
- **Best practices compliance**: Uses official Next.js approaches (@next/third-parties for GA4, Script component for Hotjar)
- **Hybrid tracking approach**: Google Analytics for traffic/conversion analysis, Hotjar for user behaviour insights
- **Performance optimised**: Both tracking solutions use optimal loading strategies to prevent render blocking

## Current Implementation ✓

### Google Analytics 4 (GA4) Integration

**Configuration**: Environment variable in `.env.local`:
```bash
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-8JFKZ95T84
```

**Implementation**: Uses official @next/third-parties package (`app/layout.tsx`):
```typescript
import { GoogleAnalytics } from '@next/third-parties/google';

// In JSX:
{process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
  <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
)}
```

**Key Benefits**:
- Official Next.js integration with automatic optimisations
- Performance-optimised script loading
- Automatic pageview tracking for client-side navigation
- Built-in support for Core Web Vitals measurement

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
**Analytics-specific CSP directives** (configured in `next.config.ts`):

**Google Analytics 4**:
```typescript
"script-src": "https://www.googletagmanager.com"
"connect-src": "https://www.google-analytics.com https://analytics.google.com"
```

**Hotjar**:
```typescript
"script-src": "https://static.hotjar.com https://script.hotjar.com"
"style-src": "https://*.hotjar.com"
"font-src": "https://script.hotjar.com"
"connect-src": "https://*.hotjar.com https://*.hotjar.io wss://*.hotjar.com"
```

**Security compliance**: CSP configuration follows both Google Analytics and Hotjar official requirements while maintaining strict security policies for other resources.

### Production Deployment
- **Domain configuration**: Configured for www.spideryarn.com production domain
- **Environment variables**: Managed through Vercel deployment settings
  - `NEXT_PUBLIC_GA_MEASUREMENT_ID` for Google Analytics
  - `NEXT_PUBLIC_HOTJAR_ID` and `NEXT_PUBLIC_HOTJAR_VERSION` for Hotjar
- **HTTPS requirement**: Automatically satisfied by production deployment
- **CSP implementation**: Comprehensive Content Security Policy includes all required Google Analytics and Hotjar domains

## Future Enhancements 📋

### Additional Analytics Providers
- **PostHog**: For advanced product analytics and feature flagging
- **Mixpanel**: For detailed event tracking and user lifecycle analysis
- **Amplitude**: For advanced user behaviour analysis and cohort tracking

### Advanced Tracking Features
- **Custom GA4 events**: AI feature usage, document processing completion using `sendGAEvent`
- **Enhanced ecommerce tracking**: Subscription conversions, upgrade funnels
- **User segmentation**: New vs returning users, document upload patterns
- **Conversion funnels**: Registration to first document upload tracking
- **Cross-platform attribution**: Mobile web and desktop usage patterns

### Privacy and Compliance
- **Cookie consent management**: GDPR and CCPA compliance implementation
- **Data retention policies**: Configurable retention periods for different data types
- **User opt-out mechanisms**: Privacy controls in user settings

## Troubleshooting

### Common Issues
1. **GA4 tracking not working**: Verify `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set correctly
2. **Hotjar tracking not working**: Verify `NEXT_PUBLIC_HOTJAR_ID` is set correctly
3. **Development environment**: Both analytics providers require HTTPS, so local testing may not work
4. **Script loading errors**: Check browser console for Content Security Policy issues
5. **Missing events**: Verify CSP allows connections to Google Analytics and Hotjar domains

### Verification
- Visit production site at www.spideryarn.com
- Check browser developer tools Network tab for both Google Analytics and Hotjar script loading
- Verify in Google Analytics dashboard (GA4) that real-time data is being received
- Verify in Hotjar dashboard that session data is being received

### Development Testing
```bash
# Check environment configuration
echo $NEXT_PUBLIC_GA_MEASUREMENT_ID
echo $NEXT_PUBLIC_HOTJAR_ID

# Enable analytics in development (if needed for testing)
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-8JFKZ95T84 NEXT_PUBLIC_HOTJAR_ID=6448124 npm run dev
```

## Implementation Notes

### Google Analytics 4
- **Measurement ID**: G-8JFKZ95T84 (configured in Google Analytics dashboard)
- **Integration**: @next/third-parties package for optimised performance
- **Package version**: ^15.3.4 (matches Next.js version)
- **Automatic features**: Pageview tracking, Core Web Vitals, enhanced measurement

### Hotjar
- **Site ID**: 6448124 (configured in Hotjar dashboard)
- **Version**: Currently using Hotjar tracking version 6
- **Integration**: Next.js Script component with manual implementation

### Deployment
- **Platform**: Automatically deployed with Next.js application via Vercel
- **Monitoring**: Track analytics in both Google Analytics 4 and Hotjar dashboards for comprehensive user insights and optimisation opportunities
- **Performance**: Both tracking solutions load asynchronously to prevent blocking page rendering