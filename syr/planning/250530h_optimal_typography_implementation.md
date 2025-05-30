# Optimal Typography Implementation for Academic Reading

## Goal

Implement the most critical typography recommendations from `docs/OPTIMAL_TEXT_FORMATTING.md` to enhance reading comprehension and comfort for academic documents in Spideryarn Reading. The goal is to establish research-backed text formatting as a competitive advantage for academic reading, prioritising comprehension over scanning speed.

**Target outcome**: Users experience demonstrably better reading comfort and comprehension when reading complex academic papers, policy documents, and philosophy articles through Spideryarn compared to standard web reading experiences.

## Context

Based on comprehensive research synthesis documented in `docs/OPTIMAL_TEXT_FORMATTING.md`, we have concrete recommendations for:
- Line length: 60-65 characters optimal for academic comprehension
- Typography: Georgia font at 17px for optimal screen reading
- Line spacing: 1.4× ratio for academic content  
- Color schemes: Light mode with high contrast ratios (WCAG AAA standards)
- Device responsiveness: Viewing distance compensation across devices

Current state: Spideryarn uses basic web typography without research-based optimizations. We have the shadcn/ui system in place for consistent components, but document text rendering uses default browser/framework styling.

## References

- `docs/OPTIMAL_TEXT_FORMATTING.md` - Complete research synthesis with implementation details
- `docs/STYLING.md` - Current CSS and visual styling configuration  
- `app/globals.css` - Current CSS implementation that will be enhanced
- `components/document-viewer.tsx` - Main document rendering component requiring typography updates
- `docs/CODING_PRINCIPLES.md` - Development approach emphasising simplicity and rapid prototyping
- `docs/SHADCN_UI_REFERENCE.md` - Component system for consistent design implementation

## Principles and Key Decisions

**Research-driven approach**: All typography decisions must be backed by academic research cited in the formatting guide. No aesthetic-only changes without performance justification.

**Academic reading priority**: Optimise for sustained reading of complex material (30+ minutes) over quick scanning. Comprehension and eye comfort take precedence over reading speed.

**Progressive enhancement strategy**: Start with core typography foundations, then layer in user customization and advanced features. Ensure robust fallbacks for older browsers.

**WCAG AAA compliance**: Target 7:1 contrast ratios for extended academic reading sessions, exceeding standard AA requirements.

**Performance considerations**: Typography improvements must not degrade page load performance. Font loading strategy critical for good user experience.

## Actions

### Stage: Core Typography Foundation
- [ ] Audit current typography implementation in `app/globals.css`
  - [ ] Document current font stack, sizes, line heights, and spacing
  - [ ] Measure current line lengths in main document view
  - [ ] Test current contrast ratios using WebAIM Contrast Checker
  - [ ] Identify components that need typography updates

- [ ] Implement research-backed CSS typography system
  - [ ] Create CSS custom properties for typography scale following the complete system in OPTIMAL_TEXT_FORMATTING.md
  - [ ] Set Georgia as primary font with proper fallback stack
  - [ ] Implement 17px base font size with responsive scaling
  - [ ] Set 1.4 line-height for academic content
  - [ ] Configure 65ch max-width for optimal line length
  - [ ] Add rhythm unit system for consistent vertical spacing

- [ ] Update document viewer component
  - [ ] Apply new typography classes to `.document-viewer` and related components
  - [ ] Ensure content-specific adjustments work (scientific papers vs philosophy articles)
  - [ ] Test reading experience across different document types
  - [ ] Verify responsive scaling on mobile/tablet/desktop

- [ ] Implement color scheme with high contrast
  - [ ] Set up light mode with #1a1a1a text on #fafafa background (16.8:1 contrast)
  - [ ] Add dark mode support with research-backed color combinations
  - [ ] Implement CSS media queries for user preference detection
  - [ ] Test contrast ratios meet WCAG AAA standards

- [ ] Write automated tests for typography system
  - [ ] Test CSS custom properties are properly set
  - [ ] Test responsive font scaling works correctly
  - [ ] Test contrast ratios programmatically
  - [ ] Test line length calculations in different containers

- [ ] Manual testing and verification
  - [ ] Load academic papers and test reading comfort
  - [ ] Compare reading experience with/without new typography
  - [ ] Test across Safari, Chrome, Firefox on Mac/Windows
  - [ ] Test mobile responsiveness and readability

- [ ] Git commit: "feat: implement research-backed typography foundation for academic reading"

### Stage: User Customization (MVP)
- [ ] Design user settings interface
  - [ ] Create TypeScript interfaces for typography settings based on CoreSettings in formatting guide
  - [ ] Design settings panel with font size, line spacing, and color scheme controls
  - [ ] Create preset profiles: Academic, Accessibility, Evening Mode, Compact

- [ ] Implement font size scaling
  - [ ] Add font size slider (16-24px range with 1px increments)
  - [ ] Ensure 200% zoom capability per WCAG requirements
  - [ ] Update all related spacing proportionally
  - [ ] Persist user preferences in localStorage

- [ ] Implement line spacing adjustment
  - [ ] Add line spacing controls (1.2-2.0× range with 0.1 increments)
  - [ ] Update vertical rhythm calculations dynamically
  - [ ] Ensure accessibility-friendly spacing options

- [ ] Implement color scheme selection
  - [ ] Add toggle for light/dark/high-contrast/sepia modes
  - [ ] Ensure all modes meet contrast requirements
  - [ ] Respect system color scheme preferences
  - [ ] Smooth transitions between schemes

- [ ] Add reading mode presets
  - [ ] Implement one-click preset switching
  - [ ] Allow users to customize and save their own presets
  - [ ] Add clear preset descriptions explaining use cases

- [ ] Write tests for customization features
  - [ ] Test settings persistence across browser sessions
  - [ ] Test preset switching functionality
  - [ ] Test edge cases (minimum/maximum values)
  - [ ] Test accessibility compliance across all settings

- [ ] User testing and feedback collection
  - [ ] Test with sample academic documents
  - [ ] Gather feedback on preset effectiveness
  - [ ] Validate customization range adequacy

- [ ] Git commit: "feat: add user typography customization with research-backed presets"

### Stage: Performance Optimization
- [ ] Implement font loading strategy
  - [ ] Add font preloading for Georgia (system font, should be fast)
  - [ ] Implement font-display: swap for any web fonts
  - [ ] Test font loading performance on slow connections
  - [ ] Ensure FOUC (Flash of Unstyled Content) prevention

- [ ] Add CSS containment for large documents
  - [ ] Implement layout containment for article sections
  - [ ] Add content-visibility: auto for performance
  - [ ] Test performance with long academic papers
  - [ ] Measure and document performance improvements

- [ ] Optimize responsive typography
  - [ ] Use CSS clamp() for fluid typography scaling
  - [ ] Minimize layout shifts during responsive changes
  - [ ] Test performance across device types

- [ ] Performance testing and validation
  - [ ] Measure Core Web Vitals impact
  - [ ] Test with large documents (10,000+ words)
  - [ ] Validate performance targets from formatting guide
  - [ ] Document performance characteristics

- [ ] Git commit: "perf: optimize typography rendering for large academic documents"

### Stage: Content-Specific Optimizations
- [ ] Implement scientific paper formatting
  - [ ] Handle equations and formulas with appropriate spacing
  - [ ] Optimize citation and reference formatting
  - [ ] Test with mathematical content and special characters
  - [ ] Ensure technical terminology remains readable

- [ ] Implement philosophy article formatting
  - [ ] Optimize blockquote styling for extended quotations
  - [ ] Enhance argument structure presentation
  - [ ] Test with complex philosophical texts

- [ ] Implement policy document formatting
  - [ ] Optimize legal language presentation
  - [ ] Enhance section numbering and navigation
  - [ ] Test with legal documents and government papers

- [ ] Add content-aware typography adjustments
  - [ ] Implement automatic line length adjustment based on content type
  - [ ] Add document type detection if not already available
  - [ ] Test automatic adjustments across document types

- [ ] Git commit: "feat: add content-specific typography optimizations for academic materials"

### Stage: Accessibility Enhancement
- [ ] Implement WCAG 2.2 Level AA compliance features
  - [ ] Add keyboard navigation for settings
  - [ ] Implement screen reader support for typography controls
  - [ ] Add focus indicators for interactive elements
  - [ ] Test with screen readers (VoiceOver, NVDA)

- [ ] Add dyslexia-friendly features
  - [ ] Implement enhanced spacing options
  - [ ] Add alternative font options for dyslexic users
  - [ ] Test with dyslexia accessibility guidelines

- [ ] Implement vision accessibility features
  - [ ] Enhanced high-contrast modes
  - [ ] Support for magnification tools
  - [ ] Large text mode optimization

- [ ] Accessibility testing and validation
  - [ ] Run automated accessibility tests (axe-core, Lighthouse)
  - [ ] Manual testing with accessibility tools
  - [ ] Validate against WCAG 2.2 checkpoints

- [ ] Git commit: "feat: enhance typography accessibility for diverse reading needs"

### Stage: Documentation and Testing
- [ ] Update implementation documentation
  - [ ] Document new CSS architecture in `docs/STYLING.md`
  - [ ] Update component documentation with typography usage
  - [ ] Add developer guide for typography customization

- [ ] Create comprehensive test suite
  - [ ] Add integration tests for typography across document types
  - [ ] Test cross-browser compatibility
  - [ ] Add performance regression tests

- [ ] User acceptance testing
  - [ ] Test with actual academic users
  - [ ] Gather quantitative feedback on reading experience
  - [ ] Document user satisfaction improvements

- [ ] Git commit: "docs: comprehensive typography implementation documentation and testing"

### Stage: Final Integration and Polish
- [ ] Integration testing across the application
  - [ ] Test typography with all existing features (ToC, glossary, summaries)
  - [ ] Ensure consistent typography across all panes
  - [ ] Test printing functionality with new typography

- [ ] Performance validation and optimization
  - [ ] Final performance testing and optimization
  - [ ] Validate Core Web Vitals metrics
  - [ ] Document performance characteristics

- [ ] Final user experience review
  - [ ] Complete reading experience test with academic materials
  - [ ] Validate typography improvements against research goals
  - [ ] Document measurable improvements in reading comfort

- [ ] Update evergreen documentation
  - [ ] Update `docs/OPTIMAL_TEXT_FORMATTING.md` with implementation status
  - [ ] Add implementation learnings and edge cases discovered
  - [ ] Update `docs/STYLING.md` with complete typography system documentation

- [ ] Git commit: "feat: complete optimal typography implementation for academic reading"

- [ ] Move this planning doc to `planning/finished/` and commit

## Appendix

### Research Priority Justification
The selected features prioritize the highest-impact recommendations from the research:

1. **Line length (60-65 characters)**: 12% comprehension improvement over longer lines
2. **Georgia font**: 15% faster reading speed vs Times New Roman on screens  
3. **1.4 line height**: Optimal balance of readability and space efficiency
4. **High contrast ratios**: Critical for extended reading sessions

### Performance Considerations
Typography changes must maintain current page load performance:
- Georgia is a system font on most platforms (no web font loading delay)
- CSS custom properties enable efficient responsive scaling
- CSS containment prevents layout thrashing with large documents

### User Experience Validation
Success metrics for this implementation:
- Reduced eye strain during extended reading sessions
- Improved reading comprehension on complex academic material
- Positive user feedback on reading comfort
- Maintained or improved page load performance

### Alternative Approaches Considered
**Web fonts vs system fonts**: Chose Georgia (system font) over web fonts like Merriweather for performance. Georgia has research backing and wide availability.

**CSS-in-JS vs CSS custom properties**: Chose CSS custom properties for better performance and easier user customization.

**Fixed vs fluid typography**: Chose CSS clamp() for fluid scaling to accommodate diverse viewing preferences and devices.

### Technical Implementation Notes
- CSS custom properties enable runtime typography adjustments
- System font stack provides reliable fallbacks
- Media queries ensure accessibility compliance
- Performance targets align with Core Web Vitals standards