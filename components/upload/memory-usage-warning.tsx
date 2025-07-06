'use client'

import { useEffect, useState } from 'react'
import { Warning } from '@phosphor-icons/react'

interface MemoryUsageWarningProps {
  pageCount: number
  fileSize: number // in bytes
  isVisible: boolean
}

export function MemoryUsageWarning({ pageCount, fileSize, isVisible }: MemoryUsageWarningProps) {
  const [estimatedMemoryUsage, setEstimatedMemoryUsage] = useState<number>(0)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Detect mobile device
    const checkMobile = () => {
      setIsMobile(
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        window.innerWidth < 768
      )
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    // Estimate memory usage based on file size and page count
    // Each page image is approximately 2-3x the average page size when converted to PNG
    const avgPageSize = fileSize / pageCount
    const estimatedImageSize = avgPageSize * 2.5
    // Add overhead for processing (Canvas, cropping, etc.)
    const processingOverhead = estimatedImageSize * 0.5
    const totalPerPage = estimatedImageSize + processingOverhead
    setEstimatedMemoryUsage(totalPerPage * pageCount)
  }, [pageCount, fileSize])

  if (!isVisible) return null

  const memoryMB = estimatedMemoryUsage / (1024 * 1024)
  const isHighRisk = memoryMB > 500 || (isMobile && memoryMB > 200)
  const isMediumRisk = memoryMB > 300 || (isMobile && memoryMB > 100)

  if (!isMediumRisk && !isHighRisk) return null

  return (
    <div className={`rounded-lg p-4 mb-4 ${
      isHighRisk ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'
    }`}>
      <div className="flex items-start space-x-3">
        <Warning 
          size={20} 
          className={isHighRisk ? 'text-red-600 mt-0.5' : 'text-amber-600 mt-0.5'} 
        />
        <div className="flex-1">
          <h3 className={`font-medium text-sm ${
            isHighRisk ? 'text-red-900' : 'text-amber-900'
          }`}>
            {isHighRisk ? 'High Memory Usage Warning' : 'Memory Usage Notice'}
          </h3>
          <p className={`text-sm mt-1 ${
            isHighRisk ? 'text-red-700' : 'text-amber-700'
          }`}>
            Processing this {pageCount}-page PDF (approximately {memoryMB.toFixed(0)}MB) may use significant browser memory
            {isMobile && ' on your mobile device'}.
            {isHighRisk && ' This could cause your browser to slow down or crash.'}
          </p>
          {isHighRisk && (
            <p className={`text-sm mt-2 ${isHighRisk ? 'text-red-700' : 'text-amber-700'}`}>
              Consider:
              <ul className="list-disc list-inside mt-1 ml-2">
                <li>Using a desktop computer instead of mobile device</li>
                <li>Closing other browser tabs to free memory</li>
                <li>Using AI Transcription (v3) instead of Vision AI</li>
                <li>Splitting the PDF into smaller sections</li>
              </ul>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}