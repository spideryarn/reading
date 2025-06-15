'use client'

// Simple URL validation warning toast
// Quick-and-dirty implementation for user feedback

import { useState, useEffect } from 'react'
import { AlertTriangle, X } from '@phosphor-icons/react/dist/ssr'
import type { ValidationError } from '@/lib/tools/url-validation'

interface UrlValidationWarningProps {
  errors: ValidationError[]
  onDismiss: () => void
  autoHide?: boolean
  autoHideDelay?: number
}

export function UrlValidationWarning({ 
  errors, 
  onDismiss, 
  autoHide = true, 
  autoHideDelay = 8000 
}: UrlValidationWarningProps) {
  const [isVisible, setIsVisible] = useState(errors.length > 0)

  useEffect(() => {
    setIsVisible(errors.length > 0)
  }, [errors.length])

  useEffect(() => {
    if (autoHide && isVisible && errors.length > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(onDismiss, 300) // Allow fade out animation
      }, autoHideDelay)

      return () => clearTimeout(timer)
    }
  }, [autoHide, autoHideDelay, isVisible, errors.length, onDismiss])

  const handleDismiss = () => {
    setIsVisible(false)
    setTimeout(onDismiss, 300) // Allow fade out animation
  }

  if (!isVisible || errors.length === 0) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <div className={`transform transition-all duration-300 ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
        <div className="bg-orange-50 border border-orange-200 rounded-lg shadow-lg p-4">
          <div className="flex items-start">
            <AlertTriangle 
              size={20} 
              weight="bold" 
              className="text-orange-600 mt-0.5 mr-3 flex-shrink-0" 
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-orange-800 mb-2">
                Invalid URL Parameters
              </h3>
              <p className="text-sm text-orange-700 mb-3">
                Some URL parameters were invalid and have been corrected:
              </p>
              <ul className="space-y-2">
                {errors.map((error, index) => (
                  <li key={index} className="text-sm">
                    <div className="font-medium text-orange-800">
                      {error.parameter}
                    </div>
                    <div className="text-orange-700 ml-2">
                      {error.error}
                    </div>
                    {error.fallback !== undefined && (
                      <div className="text-orange-600 ml-2 text-xs">
                        Using fallback: {String(error.fallback)}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={handleDismiss}
              className="ml-2 text-orange-400 hover:text-orange-600 transition-colors"
              aria-label="Dismiss warning"
            >
              <X size={16} weight="bold" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Simplified warning component for single parameter errors
 */
interface SimpleUrlWarningProps {
  parameter: string
  error: string
  fallback?: any
  onDismiss: () => void
}

export function SimpleUrlWarning({ 
  parameter, 
  error, 
  fallback, 
  onDismiss 
}: SimpleUrlWarningProps) {
  const validationError: ValidationError = {
    parameter,
    value: undefined, // We don't expose the invalid value in simple mode
    error,
    fallback
  }

  return (
    <UrlValidationWarning 
      errors={[validationError]} 
      onDismiss={onDismiss}
      autoHide={true}
      autoHideDelay={6000}
    />
  )
}

/**
 * Hook for managing URL validation warnings
 */
export function useUrlValidationWarnings() {
  const [warnings, setWarnings] = useState<ValidationError[]>([])

  const showWarnings = (errors: ValidationError[]) => {
    setWarnings(errors)
  }

  const clearWarnings = () => {
    setWarnings([])
  }

  const addWarning = (error: ValidationError) => {
    setWarnings(prev => [...prev, error])
  }

  return {
    warnings,
    showWarnings,
    clearWarnings,
    addWarning,
    hasWarnings: warnings.length > 0
  }
}