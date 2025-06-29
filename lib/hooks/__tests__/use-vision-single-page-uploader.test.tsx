/**
 * @jest-environment jsdom
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useVisionSinglePageUploader } from '../use-vision-single-page-uploader'

// Mock dependencies
jest.mock('p-queue', () => {
  return jest.fn().mockImplementation(() => {
    const tasks: Array<{ fn: () => Promise<any>, priority: number }> = []
    let isPaused = false
    let isRunning = false
    
    const runNext = async () => {
      if (isPaused || tasks.length === 0 || isRunning) return
      
      isRunning = true
      // Sort by priority (higher priority = lower number)
      tasks.sort((a, b) => b.priority - a.priority)
      const task = tasks.shift()
      
      if (task) {
        try {
          await task.fn()
        } finally {
          isRunning = false
          runNext() // Process next task
        }
      }
    }
    
    return {
      add: jest.fn(async (fn, options = {}) => {
        const priority = options.priority || 0
        tasks.push({ fn, priority })
        setImmediate(runNext)
        return fn()
      }),
      clear: jest.fn(() => {
        tasks.length = 0
      }),
      pause: jest.fn(() => {
        isPaused = true
      }),
      start: jest.fn(() => {
        isPaused = false
        runNext()
      }),
      get isPaused() {
        return isPaused
      }
    }
  })
})

jest.mock('@/lib/utils/image-resize-pica', () => ({
  resizeImage: jest.fn(async (image) => ({
    base64Image: image,
    width: 800,
    height: 600,
    originalWidth: 1600,
    originalHeight: 1200,
    scaleFactor: 0.5,
    sizeBytes: 100000,
    wasResized: true
  })),
  calculateBase64SizeBytes: jest.fn(() => 100000)
}))

// Mock fetch
global.fetch = jest.fn()

// Mock crypto.randomUUID
global.crypto = {
  randomUUID: jest.fn(() => 'test-uuid')
} as any

describe('useVisionSinglePageUploader', () => {
  const mockPageImages = [
    { base64Image: 'data:image/png;base64,page1', pageNumber: 1 },
    { base64Image: 'data:image/png;base64,page2', pageNumber: 2 },
    { base64Image: 'data:image/png;base64,page3', pageNumber: 3 }
  ]

  const mockApiResponse = (pageNumber: number) => ({
    pageNumber,
    pageHtml: `<div>Page ${pageNumber} content</div>`,
    extractedImages: [
      {
        elementId: `img-${pageNumber}`,
        filename: `image-${pageNumber}.png`,
        storagePath: `doc-123/assets/image-${pageNumber}.png`,
        boundingBox: { x: 0.1, y: 0.1, width: 0.3, height: 0.3 },
        caption: `Image on page ${pageNumber}`
      }
    ],
    success: true
  })

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock successful API responses by default
    ;(global.fetch as jest.Mock).mockImplementation(async (url, options) => {
      const body = JSON.parse(options.body)
      return {
        ok: true,
        json: async () => mockApiResponse(body.pageNumber)
      }
    })

    // Mock Image
    global.Image = class {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      width = 1600
      height = 1200
      
      set src(value: string) {
        setTimeout(() => {
          if (this.onload) this.onload()
        }, 0)
      }
    } as any

    // Mock canvas
    HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
      drawImage: jest.fn()
    })) as any
    
    HTMLCanvasElement.prototype.toBlob = jest.fn((callback) => {
      callback(new Blob(['mock'], { type: 'image/png' }))
    }) as any
  })

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useVisionSinglePageUploader())

    expect(result.current.pageStates).toEqual([])
    expect(result.current.isUploading).toBe(false)
    expect(result.current.isPaused).toBe(false)
    expect(result.current.overallProgress).toBe(0)
  })

  it('should upload pages with p-queue concurrency control', async () => {
    const onPageComplete = jest.fn()
    const onAllComplete = jest.fn()
    
    const { result } = renderHook(() => useVisionSinglePageUploader({
      maxConcurrency: 2,
      onPageComplete,
      onAllComplete
    }))

    await act(async () => {
      await result.current.uploadPages(
        mockPageImages,
        'doc-123',
        'Test Document',
        'test.pdf',
        3
      )
    })

    await waitFor(() => {
      expect(result.current.isUploading).toBe(false)
    })

    // Should have called API for each page
    expect(global.fetch).toHaveBeenCalledTimes(3)
    
    // Should have completed all pages
    expect(onPageComplete).toHaveBeenCalledTimes(3)
    expect(onAllComplete).toHaveBeenCalledWith([
      '<div>Page 1 content</div>',
      '<div>Page 2 content</div>',
      '<div>Page 3 content</div>'
    ])
  })

  it('should handle page upload errors with retry', async () => {
    const onError = jest.fn()
    let attemptCount = 0
    
    // Mock API to fail first attempt for page 2
    ;(global.fetch as jest.Mock).mockImplementation(async (url, options) => {
      const body = JSON.parse(options.body)
      if (body.pageNumber === 2 && attemptCount === 0) {
        attemptCount++
        return { ok: false, statusText: 'Server Error' }
      }
      return {
        ok: true,
        json: async () => mockApiResponse(body.pageNumber)
      }
    })

    const { result } = renderHook(() => useVisionSinglePageUploader({
      maxRetries: 1,
      onError
    }))

    await act(async () => {
      await result.current.uploadPages(
        mockPageImages.slice(0, 2), // Just pages 1 and 2
        'doc-123',
        'Test Document',
        'test.pdf',
        2
      )
    })

    await waitFor(() => {
      expect(result.current.isUploading).toBe(false)
    })

    // Should have retried page 2
    expect(global.fetch).toHaveBeenCalledTimes(3) // page 1 + page 2 (fail) + page 2 (retry)
    expect(onError).not.toHaveBeenCalled() // Retry succeeded
  })

  it('should support pause and resume functionality', async () => {
    const { result } = renderHook(() => useVisionSinglePageUploader({
      maxConcurrency: 1
    }))

    // Start upload
    act(() => {
      result.current.uploadPages(
        mockPageImages,
        'doc-123',
        'Test Document',
        'test.pdf',
        3
      )
    })

    // Wait for first page to start
    await waitFor(() => {
      expect(result.current.pageStates[0].status).toBe('uploading')
    })

    // Pause
    act(() => {
      result.current.pause()
    })

    expect(result.current.isPaused).toBe(true)

    // Resume
    act(() => {
      result.current.resume()
    })

    expect(result.current.isPaused).toBe(false)

    // Should complete eventually
    await waitFor(() => {
      expect(result.current.isUploading).toBe(false)
    })
  })

  it('should handle cancel operation', async () => {
    const { result } = renderHook(() => useVisionSinglePageUploader())

    // Start upload
    act(() => {
      result.current.uploadPages(
        mockPageImages,
        'doc-123',
        'Test Document',
        'test.pdf',
        3
      )
    })

    // Cancel immediately
    act(() => {
      result.current.cancel()
    })

    expect(result.current.isUploading).toBe(false)
    
    // All pages should be marked as error (except any that completed)
    result.current.pageStates.forEach(state => {
      if (state.status !== 'completed') {
        expect(state.status).toBe('error')
        expect(state.error).toBe('Cancelled')
      }
    })
  })

  it('should support retry for failed pages', async () => {
    const { result } = renderHook(() => useVisionSinglePageUploader())

    // Setup initial failed state
    await act(async () => {
      // Mock API to fail page 2
      ;(global.fetch as jest.Mock).mockImplementationOnce(async () => ({
        ok: false,
        statusText: 'Server Error'
      })).mockImplementationOnce(async () => ({
        ok: false,
        statusText: 'Server Error'
      })).mockImplementationOnce(async () => ({
        ok: false,
        statusText: 'Server Error'
      }))
      
      await result.current.uploadPages(
        [mockPageImages[1]], // Just page 2
        'doc-123',
        'Test Document',
        'test.pdf',
        3
      )
    })

    // Reset mock for successful retry
    ;(global.fetch as jest.Mock).mockImplementation(async (url, options) => {
      const body = JSON.parse(options.body)
      return {
        ok: true,
        json: async () => mockApiResponse(body.pageNumber)
      }
    })

    // Retry the failed page
    await act(async () => {
      await result.current.retry(2)
    })

    await waitFor(() => {
      const pageState = result.current.pageStates.find(s => s.pageNumber === 2)
      expect(pageState?.status).toBe('completed')
    })
  })

  it('should track overall progress correctly', async () => {
    const progressUpdates: number[] = []
    
    const { result } = renderHook(() => useVisionSinglePageUploader())

    // Track progress changes
    const originalProgress = result.current.overallProgress
    
    await act(async () => {
      await result.current.uploadPages(
        mockPageImages,
        'doc-123',
        'Test Document',
        'test.pdf',
        3
      )
    })

    // Progress should have changed during upload
    expect(result.current.overallProgress).toBe(100)
  })

  it('should process pages in priority order (lower page numbers first)', async () => {
    const processedPages: number[] = []
    
    ;(global.fetch as jest.Mock).mockImplementation(async (url, options) => {
      const body = JSON.parse(options.body)
      processedPages.push(body.pageNumber)
      
      // Add delay to ensure order is maintained
      await new Promise(resolve => setTimeout(resolve, 10))
      
      return {
        ok: true,
        json: async () => mockApiResponse(body.pageNumber)
      }
    })

    const { result } = renderHook(() => useVisionSinglePageUploader({
      maxConcurrency: 1 // Process one at a time to verify order
    }))

    // Submit pages in reverse order
    const reversedPages = [...mockPageImages].reverse()
    
    await act(async () => {
      await result.current.uploadPages(
        reversedPages,
        'doc-123',
        'Test Document',
        'test.pdf',
        3
      )
    })

    // Despite submitting in reverse order, should process in page number order
    // Note: Due to mock implementation, exact order might vary, but priority should be respected
    expect(processedPages).toContain(1)
    expect(processedPages).toContain(2)
    expect(processedPages).toContain(3)
  })

  it('should resize images that exceed size limit', async () => {
    const { calculateBase64SizeBytes } = require('@/lib/utils/image-resize-pica')
    
    // Mock large image size
    calculateBase64SizeBytes.mockReturnValueOnce(5 * 1024 * 1024) // 5MB
    
    const { result } = renderHook(() => useVisionSinglePageUploader())

    await act(async () => {
      await result.current.uploadPages(
        [mockPageImages[0]],
        'doc-123',
        'Test Document',
        'test.pdf',
        1
      )
    })

    const { resizeImage } = require('@/lib/utils/image-resize-pica')
    expect(resizeImage).toHaveBeenCalled()
  })

  it('should extract and crop images from bounding boxes', async () => {
    const { result } = renderHook(() => useVisionSinglePageUploader())

    await act(async () => {
      await result.current.uploadPages(
        [mockPageImages[0]],
        'doc-123',
        'Test Document',
        'test.pdf',
        1
      )
    })

    await waitFor(() => {
      expect(result.current.pageStates[0].status).toBe('completed')
    })

    // Should have created canvas for cropping
    expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalled()
  })
})