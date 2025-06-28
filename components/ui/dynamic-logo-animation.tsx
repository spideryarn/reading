'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { getRandomLogoPhrases } from '@/lib/animations/logo-phrases'

interface DynamicLogoAnimationProps {
  animationClass: string
  className?: string
}

export function DynamicLogoAnimation({ animationClass, className = '' }: DynamicLogoAnimationProps) {
  const [phrases, setPhrases] = useState<string[]>([])
  const [isClient, setIsClient] = useState(false)

  // Split "Spideryarn" into individual letters for animation (defined once)
  const letters = "Spideryarn".split("")

  const phraseCount = letters.length * 2

  const generatePhrases = useCallback(() => {
    setPhrases(getRandomLogoPhrases(phraseCount))
  }, [phraseCount])

  useEffect(() => {
    setIsClient(true)
    generatePhrases()
  }, [generatePhrases])

  // For the glossary-builder animation, we need to show dynamic phrases
  const isGlossaryBuilder = animationClass === 'glossary-builder'

  // We'll regenerate phrases on every hover for glossary-builder
  const handleMouseEnter = isGlossaryBuilder ? generatePhrases : undefined

  if (!isClient) {
    // Server-side rendering: show static version
    return (
      <div className={`flex items-center space-x-3 ${animationClass} ${className}`}>
        <Image
          src="/spideryarn-logo.png"
          alt="Spideryarn logo"
          width={32}
          height={32}
          className="h-8 w-8 logo-image"
        />
        <span className="text-xl font-semibold text-spideryarn-orange font-trebuchet logo-text">
          {letters.map((letter, index) => (
            <span key={index} className="logo-letter">
              {letter}
            </span>
          ))}
        </span>
      </div>
    )
  }

  return (
    <div 
      className={`flex items-center space-x-3 ${isGlossaryBuilder ? 'glossary-builder-dynamic' : animationClass} ${className}`}
      onMouseEnter={handleMouseEnter}
    >
      <Image
        src="/spideryarn-logo.png"
        alt="Spideryarn logo"
        width={32}
        height={32}
        className="h-8 w-8 logo-image"
      />
      <span className="text-xl font-semibold text-spideryarn-orange font-trebuchet logo-text">
        {letters.map((letter, index) => (
          <span 
            key={index} 
            className="logo-letter relative"
            style={isGlossaryBuilder ? { animationDelay: `${index * 0.1}s` } : undefined}
          >
            {letter}
            {isGlossaryBuilder && (
              <>
                {/* Primary phrase bubble */}
                {phrases[index] && (
                  <span
                    className="absolute top-[-12px] left-1/2 transform -translate-x-1/2 bg-white/95 border border-spideryarn-orange/30 rounded-md px-2 py-1 text-[9px] font-normal text-gray-700 whitespace-nowrap opacity-0 pointer-events-none z-10 shadow-md logo-phrase-primary"
                    style={{ animationDelay: `${0.5 + index * 0.2}s` }}
                  >
                    {phrases[index]}
                  </span>
                )}
                {/* Secondary phrase bubble */}
                {phrases[letters.length + index] && (
                  <span
                    className="absolute top-[-12px] left-1/2 transform -translate-x-1/2 bg-white/95 border border-spideryarn-orange/30 rounded-md px-2 py-1 text-[9px] font-normal text-gray-700 whitespace-nowrap opacity-0 pointer-events-none z-10 shadow-md logo-phrase-secondary"
                    style={{ animationDelay: `${2.1 + index * 0.3}s` }}
                  >
                    {phrases[letters.length + index]}
                  </span>
                )}
              </>
            )}
          </span>
        ))}
      </span>
    </div>
  )
}