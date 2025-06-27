'use client'

import { useState, useCallback } from 'react'
import { getRandomLogoAnimation, type LogoAnimationCssClass } from '@/lib/animations/logo-animations'

interface RandomLogoAnimationProps {
  children: React.ReactNode
  className?: string
}

export function RandomLogoAnimation({ children, className = '' }: RandomLogoAnimationProps) {
  const [currentAnimation, setCurrentAnimation] = useState<LogoAnimationCssClass | ''>('')
  const [isHovering, setIsHovering] = useState(false)

  const handleMouseEnter = useCallback(() => {
    // Pick a random animation from the shared definitions
    const randomAnimation = getRandomLogoAnimation()
    
    setCurrentAnimation(randomAnimation.cssClass)
    setIsHovering(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false)
    // Keep the animation class but it will stop due to CSS hover selectors
  }, [])

  const combinedClassName = `${className} ${isHovering ? currentAnimation : ''} random-logo-animation`.trim()

  return (
    <div
      className={combinedClassName}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  )
}