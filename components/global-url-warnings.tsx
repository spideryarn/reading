'use client'

// Quick-and-dirty global URL validation warnings
// Simple toast notifications for invalid URL parameters

import { useState, useEffect } from 'react'
import { Warning } from "@phosphor-icons/react/dist/ssr/Warning"
import { X } from "@phosphor-icons/react/dist/ssr/X"
import type { ValidationError } from '@/lib/tools/url-validation'

// Global state for warnings
let globalSetWarnings: ((warnings: ValidationError[]) => void) | null = null

// Function to show warnings from anywhere in the app
export function showUrlValidationWarnings(errors: ValidationError[]) {
  if (globalSetWarnings && errors.length > 0) {
    globalSetWarnings(errors)
  }
}

export function GlobalUrlWarnings() {
  const [warnings, setWarnings] = useState<ValidationError[]>([])
  const [isVisible, setIsVisible] = useState(false)

  // Register this component as the global handler
  useEffect(() => {
    globalSetWarnings = setWarnings
    return () => {
      globalSetWarnings = null
    }
  }, [])

  // Show/hide based on warnings
  useEffect(() => {
    setIsVisible(warnings.length > 0)
    
    // Auto-hide after 5 seconds
    if (warnings.length > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(() => setWarnings([]), 300) // Clear after fade
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [warnings.length])

  const handleDismiss = () => {
    setIsVisible(false)
    setTimeout(() => setWarnings([]), 300)
  }

  if (warnings.length === 0) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className={`transform transition-all duration-300 ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}>
        <div className="bg-orange-50 border border-orange-200 rounded-lg shadow-lg p-3">
          <div className="flex items-start gap-2">
            <Warning 
              size={16} 
              weight="bold" 
              className="text-orange-600 mt-0.5 flex-shrink-0" 
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-orange-800 mb-1">
                Invalid URL Parameters
              </div>
              <div className="text-xs text-orange-700">
                {warnings.length === 1 
                  ? `"${warnings[0].parameter}" parameter was corrected`
                  : `${warnings.length} parameters were corrected`
                }
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-orange-400 hover:text-orange-600 transition-colors p-0.5"
              aria-label="Dismiss"
            >
              <X size={14} weight="bold" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}