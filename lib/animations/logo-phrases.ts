/**
 * Logo Animation Phrases
 * 
 * Collection of inspiring 2-word phrases for the glossary-builder animation.
 * These phrases draw from science, philosophy, public policy, poetry, and more.
 */

import { LOGO_PHRASES } from './logo-phrases-data'

/**
 * Get all logo animation phrases (immutable copy)
 */
export function getLogoPhrases(): string[] {
  return [...LOGO_PHRASES]
}

/**
 * Get a random phrase from the collection
 */
export function getRandomLogoPhrase(): string {
  const phrases = getLogoPhrases()
  const randomIndex = Math.floor(Math.random() * phrases.length)
  return phrases[randomIndex] as string
}

/**
 * Get a specified number of random phrases (without duplicates in the same call)
 */
export function getRandomLogoPhrases(count: number): string[] {
  const phrases = getLogoPhrases()
  const shuffled = [...phrases].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, phrases.length))
}