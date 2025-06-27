/**
 * Logo Animation Definitions
 * 
 * Single source of truth for all logo animations used in:
 * - RandomLogoAnimation component (header logo)
 * - Logo playground page (/design/logoplay)
 * 
 * Add/remove/modify animations here to change both implementations.
 */

export interface LogoAnimation {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly cssClass: string
}

export const LOGO_ANIMATIONS: readonly LogoAnimation[] = [
  {
    id: 'highlight-sweep',
    name: 'Highlight Sweep',
    description: 'Highlighter effect sweeps across text like marking important passages during research',
    cssClass: 'highlight-sweep-animation'
  },
  {
    id: 'scanner-line',
    name: 'Scanner Line', 
    description: 'OCR-style scanning line moves across logo and text like document analysis in progress',
    cssClass: 'scanner-line-animation'
  },
  {
    id: 'elastic-stretch',
    name: 'Elastic Stretch',
    description: 'Letters randomly stretch and snap back with different intensities - like yarn being pulled and released',
    cssClass: 'elastic-stretch'
  },
  {
    id: 'warm-glow-pulse',
    name: 'Warm Glow Pulse',
    description: 'Sophisticated pulsing glow with subtle orange warmth - perfect for premium academic software',
    cssClass: 'glow-pulse-animation'
  },
  {
    id: 'silk-shimmer-sweep',
    name: 'Silk Shimmer Sweep',
    description: 'Refined gradient shimmer that flows like premium silk - understated elegance for professionals',
    cssClass: 'shimmer-sweep-animation'
  },
  {
    id: 'strand-pulse',
    name: 'Strand Pulse',
    description: 'Radiating pulses from logo like plucked web strings - captures the essence of spider yarn vibrations',
    cssClass: 'strand-pulse'
  },
  {
    id: 'web-threading',
    name: 'Web Threading',
    description: 'Lines connecting logo to letters like spinning new threads - shows the web-making process',
    cssClass: 'web-threading'
  },
  {
    id: 'entity-highlight',
    name: 'Entity Highlight',
    description: 'Letters light up in sequence like key terms being identified and categorised for glossary creation',
    cssClass: 'entity-highlight'
  },
  {
    id: 'glossary-builder',
    name: 'Glossary Builder',
    description: 'Definition bubbles appear around letters showing the glossary generation process in action',
    cssClass: 'glossary-builder'
  },
  {
    id: 'document-parse',
    name: 'Document Parse',
    description: 'Scanning lines analyse structure while elements organize - like AI parsing academic papers',
    cssClass: 'document-parse'
  },
  {
    id: 'format-convert',
    name: 'Format Convert',
    description: 'Elements transform between formats with processing effects - PDF to HTML conversion',
    cssClass: 'format-convert'
  },
  {
    id: 'semantic-search',
    name: 'Semantic Search',
    description: 'Letters light up in search patterns while ID tags appear - finding key insights in text',
    cssClass: 'semantic-search'
  },
  {
    id: 'letter-shuffle',
    name: 'Letter Shuffle',
    description: 'Letters randomly shuffle and reorganise back to original - like AI processing and reconstituting text',
    cssClass: 'letter-shuffle'
  },
  {
    id: 'content-cascade',
    name: 'Content Cascade',
    description: 'Data flows from logo through letters in intelligent waves - representing AI processing and hierarchical understanding',
    cssClass: 'content-cascade'
  },
  {
    id: 'granularity-shift',
    name: 'Granularity Shift',
    description: 'Elements shift between different detail levels showing AI summary generation at multiple granularities',
    cssClass: 'granularity-shift'
  }
] as const

export type LogoAnimationId = typeof LOGO_ANIMATIONS[number]['id']
export type LogoAnimationCssClass = typeof LOGO_ANIMATIONS[number]['cssClass']

/**
 * Get a random logo animation
 */
export function getRandomLogoAnimation(): LogoAnimation {
  const randomIndex = Math.floor(Math.random() * LOGO_ANIMATIONS.length)
  return LOGO_ANIMATIONS[randomIndex]
}

/**
 * Get animation by ID
 */
export function getLogoAnimationById(id: LogoAnimationId): LogoAnimation | undefined {
  return LOGO_ANIMATIONS.find(anim => anim.id === id)
}

/**
 * Get all animation CSS classes (for validation)
 */
export function getAllAnimationCssClasses(): LogoAnimationCssClass[] {
  return LOGO_ANIMATIONS.map(anim => anim.cssClass)
}