/**
 * Dual slider controls for multi-dimensional summary selection
 * Provides discrete sliders for expertise level and summary length
 */

'use client'

import { useState, useEffect } from 'react'
import { CaretDown, CaretUp } from '@phosphor-icons/react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { ExpertiseLevel, LengthLevel } from '@/lib/prompts/templates/multi-summarise'

interface DualSummarySlidersProps {
  expertiseLevel: ExpertiseLevel
  lengthLevel: LengthLevel
  onExpertiseChange: (level: ExpertiseLevel) => void
  onLengthChange: (level: LengthLevel) => void
  className?: string
}

const EXPERTISE_OPTIONS: { value: ExpertiseLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'expert', label: 'Expert' }
]

const LENGTH_OPTIONS: { value: LengthLevel; label: string }[] = [
  { value: 'sentence_or_two', label: 'Brief' },
  { value: 'single_short_paragraph', label: 'Standard' },
  { value: 'page', label: 'Detailed' }
]

export function DualSummarySliders({
  expertiseLevel,
  lengthLevel,
  onExpertiseChange,
  onLengthChange,
  className = ''
}: DualSummarySlidersProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  
  // Responsive behavior: collapse on small screens
  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)')
    
    const handleScreenChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsExpanded(!e.matches) // Collapse on small screens
    }
    
    handleScreenChange(mediaQuery) // Set initial state
    mediaQuery.addEventListener('change', handleScreenChange)
    
    return () => mediaQuery.removeEventListener('change', handleScreenChange)
  }, [])
  
  // Get current indices for slider positioning
  const expertiseIndex = EXPERTISE_OPTIONS.findIndex(opt => opt.value === expertiseLevel)
  const lengthIndex = LENGTH_OPTIONS.findIndex(opt => opt.value === lengthLevel)
  
  // Handle expertise slider changes
  const handleExpertiseSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const index = parseInt(event.target.value)
    const newLevel = EXPERTISE_OPTIONS[index]?.value
    if (newLevel) {
      onExpertiseChange(newLevel)
    }
  }
  
  // Handle length slider changes
  const handleLengthSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const index = parseInt(event.target.value)
    const newLevel = LENGTH_OPTIONS[index]?.value
    if (newLevel) {
      onLengthChange(newLevel)
    }
  }
  
  // Handle discrete position clicks for expertise
  const handleExpertiseClick = (level: ExpertiseLevel) => {
    onExpertiseChange(level)
  }
  
  // Handle discrete position clicks for length
  const handleLengthClick = (level: LengthLevel) => {
    onLengthChange(level)
  }
  
  return (
    <div className={`flex-shrink-0 bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200 ${className}`}>
      <div className="px-3 py-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between hover:bg-gray-100 rounded-md px-2 py-1 transition-colors"
        >
          <span className="text-xs font-semibold text-gray-700">
            {EXPERTISE_OPTIONS[expertiseIndex]?.label} · {LENGTH_OPTIONS[lengthIndex]?.label}
          </span>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                {isExpanded ? (
                  <CaretUp size={16} className="text-gray-500 hover:text-gray-700" />
                ) : (
                  <CaretDown size={16} className="text-gray-500 hover:text-gray-700" />
                )}
              </TooltipTrigger>
              <TooltipContent 
                side="top" 
                className="bg-white border border-gray-200 text-gray-700 text-sm px-3 py-2 rounded-lg shadow-lg"
                sideOffset={4}
              >
                {isExpanded ? 'Collapse' : 'Expand'}
              </TooltipContent>
            </Tooltip>
          </div>
        </button>
      </div>
      
      {isExpanded && (
        <div className="px-3 pb-3 space-y-4">
          {/* Expertise Level Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600">Expertise Level</label>
              <span className="text-xs text-gray-500 font-medium">{EXPERTISE_OPTIONS[expertiseIndex]?.label}</span>
            </div>
            
            {/* Discrete click options */}
            <div className="flex justify-between mb-2">
              {EXPERTISE_OPTIONS.map((option, index) => (
                <button
                  key={option.value}
                  onClick={() => handleExpertiseClick(option.value)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${ 
                    expertiseIndex === index
                      ? 'bg-blue-100 text-blue-800 font-medium'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            
            {/* Visual slider */}
            <div className="relative">
              <input
                type="range"
                min="0"
                max={EXPERTISE_OPTIONS.length - 1}
                value={expertiseIndex}
                onChange={handleExpertiseSliderChange}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-modern"
                style={{
                  background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${(expertiseIndex / (EXPERTISE_OPTIONS.length - 1)) * 100}%, #E5E7EB ${(expertiseIndex / (EXPERTISE_OPTIONS.length - 1)) * 100}%, #E5E7EB 100%)`
                }}
              />
            </div>
          </div>
          
          {/* Length Level Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600">Summary Length</label>
              <span className="text-xs text-gray-500 font-medium">{LENGTH_OPTIONS[lengthIndex]?.label}</span>
            </div>
            
            {/* Discrete click options */}
            <div className="flex justify-between mb-2">
              {LENGTH_OPTIONS.map((option, index) => (
                <button
                  key={option.value}
                  onClick={() => handleLengthClick(option.value)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${ 
                    lengthIndex === index
                      ? 'bg-green-100 text-green-800 font-medium'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            
            {/* Visual slider */}
            <div className="relative">
              <input
                type="range"
                min="0"
                max={LENGTH_OPTIONS.length - 1}
                value={lengthIndex}
                onChange={handleLengthSliderChange}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-modern"
                style={{
                  background: `linear-gradient(to right, #10B981 0%, #10B981 ${(lengthIndex / (LENGTH_OPTIONS.length - 1)) * 100}%, #E5E7EB ${(lengthIndex / (LENGTH_OPTIONS.length - 1)) * 100}%, #E5E7EB 100%)`
                }}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Slider styling */}
      <style jsx>{`
        .slider-modern::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3B82F6;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          border: 2px solid white;
        }
        .slider-modern::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);
        }
        .slider-modern::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3B82F6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  )
}