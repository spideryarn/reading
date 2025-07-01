# Mobile Architecture

Spideryarn Reading provides a mobile-optimised Progressive Web App (PWA) experience with responsive design patterns and device-specific features for enhanced usability on mobile devices.

## See also

- `docs/reference/ARCHITECTURE_OVERVIEW.md` - Complete system architecture overview
- `docs/reference/DESIGN_MOBILE_PLATFORM_DETECTION.md` - Technical implementation of device detection, breakpoints, and responsive patterns (complementary implementation guide)
- `docs/reference/UI_INTERFACE.md` - Multi-pane layout and tabbed navigation interface
- `public/site.webmanifest` - PWA manifest configuration
- `app/layout.tsx` - iOS-specific meta tags for PWA functionality
- `docs/reference/DESIGN_OVERVIEW.md` - CSS configuration and theme settings
- [PWA Documentation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps) - MDN Progressive Web App standards
- [Apple Web App Configuration](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html) - iOS-specific PWA features

## Key Architectural Decisions

### Progressive Web App Implementation ✓

Spideryarn Reading implements PWA standards to provide native app-like behaviour on mobile devices:

- **Address Bar Hiding**: PWA manifest with `"display": "standalone"` removes browser chrome when installed
- **Home Screen Installation**: Users can install the app to their device home screen for quick access
- **Responsive Design**: Tailwind CSS breakpoints provide optimal layouts across screen sizes
- **Touch Optimisation**: Interface elements sized appropriately for touch interaction

### Mobile-Specific Features

#### PWA Configuration ✓

**Manifest File** (`public/site.webmanifest`):
```json
{
  "name": "Spideryarn Reading",
  "short_name": "Spideryarn",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "theme_color": "#DB8A45",
  "background_color": "#FFFFFF",
  "orientation": "any"
}
```

**iOS-Specific Meta Tags** (`app/layout.tsx`):
```typescript
other: {
  'apple-mobile-web-app-capable': 'yes',
  'apple-mobile-web-app-status-bar-style': 'black-translucent',
  'theme-color': '#DB8A45',
}
```

#### Device Detection and Responsive Behaviour ✓

- **Platform Detection**: react-responsive library provides reactive device detection (see `docs/reference/DESIGN_MOBILE_PLATFORM_DETECTION.md`)
- **Touch Interface**: Optimised touch targets and gesture-friendly interactions
- **Viewport Configuration**: Proper viewport meta tags for consistent rendering
- **Icon Assets**: Multiple icon sizes (192x192, 512x512) for various device densities

## Mobile User Experience Patterns

### Interface Adaptations

#### Navigation and Content Adaptations 📋

**Strategic Approach**: Unified interface that scales gracefully across device types rather than separate mobile/desktop experiences.

- **Left Pane**: Auto-collapse on mobile (≤640px) with modal-style overlays for space efficiency
- **Content Display**: Responsive typography and tool interfaces that adapt to mobile constraints
- **AI Features**: Touch-optimised chatbot and analysis tools with device-appropriate interaction patterns

**Implementation Details**: See `docs/reference/DESIGN_MOBILE_PLATFORM_DETECTION.md` for specific breakpoints and component-level responsive behaviour.

### Installation and Usage Flow

#### PWA Installation Process ✓

1. **Browser Prompt**: Users see "Add to Home Screen" prompt on supported browsers
2. **Manual Installation**: Available through browser menu options
3. **Home Screen Icon**: App appears with custom Spideryarn branding
4. **Standalone Launch**: Opens without browser chrome (address bar hidden)

#### Cross-Platform Compatibility ✓

- **iOS Safari**: Full PWA support with iOS-specific enhancements
- **Android Chrome**: Native PWA installation and standalone mode
- **Desktop Browsers**: PWA features available but optional

## Technical Implementation

### Responsive Design System ✓

Built on Tailwind CSS v4 with mobile-first approach and comprehensive device detection.

**Implementation**: See `docs/reference/DESIGN_MOBILE_PLATFORM_DETECTION.md` for detailed breakpoint definitions, detection logic, and component-level responsive patterns.

### Performance Optimisations 📋

- **Code Splitting**: Next.js automatic code splitting for mobile performance
- **Image Optimisation**: Next.js Image component for responsive images
- **Service Worker**: Planned for offline functionality and caching strategies
- **Bundle Size**: Optimised dependencies and lazy loading for mobile networks

### Mobile-Specific API Usage 📋

Future mobile enhancement opportunities:
- **Touch Gestures**: Swipe navigation and pinch-to-zoom for documents
- **Device APIs**: File system access, share functionality, notification support
- **Offline Mode**: Service worker implementation for offline document access
- **Background Sync**: Document processing continuation when network restored

## Current Status and Limitations

### Implemented Features ✓

- PWA manifest with proper metadata and icons
- iOS-specific meta tags for standalone mode
- Responsive design foundation with Tailwind CSS
- Mobile-optimised typography and spacing
- Touch-friendly interface elements

### Known Limitations ⚠️

- **Address Bar**: Only hidden when app is installed as PWA, not in browser
- **iOS Constraints**: Apple's restrictions on PWA features vs native apps
- **Installation Discovery**: Users must manually discover and install PWA
- **Cross-Platform Variations**: Different PWA capabilities across browsers

### Planned Enhancements 📋

- Service worker implementation for offline functionality
- Enhanced mobile navigation patterns
- Touch gesture support for document interaction
- Mobile-specific AI feature optimisations
- Push notification integration for document processing completion

## Best Practices for Mobile Development

### Testing Approach

- **Real Device Testing**: Test on actual mobile devices, not just browser dev tools
- **PWA Installation**: Verify installation flow and standalone mode functionality
- **Cross-Browser Testing**: Ensure compatibility across iOS Safari, Android Chrome
- **Performance Monitoring**: Monitor Core Web Vitals on mobile networks

### Development Considerations

- **Touch Targets**: Minimum 44px tap targets for accessibility
- **Network Awareness**: Optimise for slower mobile connections
- **Battery Efficiency**: Consider computational load of AI features on mobile
- **Storage Constraints**: Efficient caching strategies for mobile storage limits

## Architecture Decisions Rationale

### PWA Over Native Apps

**Decision**: Implement PWA rather than native mobile applications

**Rationale**:
- **Single Codebase**: Maintain one codebase for web and mobile
- **Instant Updates**: No app store approval process for updates
- **Lower Barrier**: Users can access immediately without app store installation
- **AI Integration**: Easier to integrate with web-based AI services
- **Development Speed**: Leverages existing web development expertise

### Responsive Design Over Mobile-Specific UI

**Decision**: Use responsive design patterns rather than separate mobile interface

**Rationale**:
- **Consistency**: Unified experience across all device types
- **Maintenance**: Single UI codebase reduces complexity
- **Progressive Enhancement**: Features scale gracefully across screen sizes
- **User Familiarity**: Consistent interface reduces learning curve

## Future Mobile Architecture Considerations

### Advanced PWA Features 📋

- **Web App Install Banners**: Custom installation prompts
- **Background Sync**: Offline operation with sync when online
- **Push Notifications**: Document processing completion alerts
- **File System Access**: Direct file upload from mobile file systems

### Native App Evaluation 📋

Consider native app development if:
- PWA limitations significantly impact user experience
- Platform-specific features become essential
- Performance requirements exceed web capabilities
- App store distribution becomes strategically important