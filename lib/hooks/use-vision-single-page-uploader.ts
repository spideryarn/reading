'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { z } from 'zod'
import PQueue from 'p-queue'
// Dynamic import for browser-only image resize utilities
let imageResizeUtils: {
  resizeImage: typeof import('@/lib/utils/image-resize-pica').resizeImage
  calculateBase64SizeBytes: typeof import('@/lib/utils/image-resize-pica').calculateBase64SizeBytes
} | null = null

async function getImageResizeUtils() {
  if (!imageResizeUtils && typeof window !== 'undefined') {
    const imageResizeModule = await import('@/lib/utils/image-resize-pica')
    imageResizeUtils = {
      resizeImage: imageResizeModule.resizeImage,
      calculateBase64SizeBytes: imageResizeModule.calculateBase64SizeBytes
    }
  }
  return imageResizeUtils
}
import { uploadImageAssetWithRetry, ClientStorageError } from '@/lib/services/storage-client'
import { createClient } from '@/lib/supabase/client'

// Schema matching the API response
const SinglePageVisionResponseSchema = z.object({
  pageNumber: z.number(),
  pageHtml: z.string(),
  extractedImages: z.array(z.object({
    elementId: z.string(),
    filename: z.string(),
    storagePath: z.string(),
    boundingBox: z.object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number()
    }),
    caption: z.string().optional(),
    altText: z.string().optional()
  })),
  success: z.boolean(),
  error: z.string().optional()
})

type SinglePageVisionResponse = z.infer<typeof SinglePageVisionResponseSchema>

export interface PageUploadState {
  pageNumber: number
  status: 'pending' | 'uploading' | 'processing' | 'cropping' | 'storing' | 'completed' | 'error'
  progress: number // 0-100
  error?: string
  result?: SinglePageVisionResponse
  htmlFragment?: string // Final HTML with patched image URLs
}

interface ExtractedImageWithData {
  elementId: string
  filename: string
  storagePath: string
  boundingBox: { x: number; y: number; width: number; height: number }
  caption?: string
  altText?: string
  blob?: Blob // Added after cropping
  uploadUrl?: string // Signed URL for upload
}

interface UseVisionSinglePageUploaderOptions {
  maxConcurrency?: number
  maxRetries?: number
  onProgress?: (pageNumber: number, progress: number, status: PageUploadState['status']) => void
  onPageComplete?: (pageNumber: number, htmlFragment: string) => void
  onError?: (pageNumber: number, error: string) => void
  onAllComplete?: (htmlFragments: string[]) => void
}

interface UseVisionSinglePageUploaderReturn {
  uploadPages: (
    pageImages: Array<{ base64Image: string; pageNumber: number }>,
    documentId: string,
    documentTitle: string,
    fileName: string,
    totalPages: number
  ) => Promise<void>
  pageStates: PageUploadState[]
  isUploading: boolean
  overallProgress: number
  cancel: () => void
  pause: () => void
  resume: () => void
  isPaused: boolean
  retry: (pageNumber: number) => Promise<void>
  getCompletedHtml: () => string[]
}

export function useVisionSinglePageUploader(
  options: UseVisionSinglePageUploaderOptions = {}
): UseVisionSinglePageUploaderReturn {
  const {
    maxConcurrency = 3,
    maxRetries = 2,
    onProgress,
    onPageComplete,
    onError,
    onAllComplete
  } = options

  const [pageStates, setPageStates] = useState<PageUploadState[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const queueRef = useRef<PQueue | null>(null)
  const pageImagesRef = useRef<Map<number, string>>(new Map()) // Store page images for retry
  const documentMetadataRef = useRef<{
    documentId: string
    documentTitle: string
    fileName: string
    totalPages: number
  } | null>(null)
  const pageStatesRef = useRef<PageUploadState[]>([])

  // Initialize pageStatesRef whenever pageStates changes
  useEffect(() => {
    pageStatesRef.current = pageStates
  }, [pageStates])

  // Update page state
  const updatePageState = useCallback((pageNumber: number, updates: Partial<PageUploadState>) => {
    setPageStates(prev => {
      const newStates = prev.map(state => 
        state.pageNumber === pageNumber 
          ? { ...state, ...updates }
          : state
      )
      
      // Call progress callback if provided
      if (updates.progress !== undefined || updates.status !== undefined) {
        const state = newStates.find(s => s.pageNumber === pageNumber)
        if (state) {
          onProgress?.(pageNumber, updates.progress ?? state.progress, updates.status ?? state.status)
        }
      }
      
      // Update ref with latest states
      pageStatesRef.current = newStates
      return newStates
    })
  }, [onProgress])

  // Process a single page
  const processPage = useCallback(async (
    pageImage: string,
    pageNumber: number,
    totalPages: number,
    documentId: string,
    documentTitle: string,
    fileName: string,
    retryCount = 0
  ): Promise<void> => {
    try {
      // Update status to uploading
      updatePageState(pageNumber, { status: 'uploading', progress: 10 })

      // Check if image needs resizing (4MB limit with some buffer)
      const utils = await getImageResizeUtils()
      if (!utils) {
        throw new Error('Image resize utilities not available (not in browser environment)')
      }
      
      const currentSize = utils.calculateBase64SizeBytes(pageImage)
      const maxSize = 3.8 * 1024 * 1024 // 3.8MB to leave buffer for JSON overhead
      
      let finalPageImage = pageImage
      if (currentSize > maxSize) {
        console.log(`Page ${pageNumber} image is ${(currentSize / 1024 / 1024).toFixed(2)}MB, resizing...`)
        const resizeResult = await utils.resizeImage(pageImage, {
          maxSizeBytes: maxSize,
          format: 'jpeg',
          quality: 0.85,
          maxDimension: 1500 // Reasonable for most documents
        })
        finalPageImage = resizeResult.base64Image
        console.log(`Resized to ${(resizeResult.sizeBytes / 1024 / 1024).toFixed(2)}MB (${resizeResult.width}x${resizeResult.height})`)
      }

      // Step 1: Upload page image to API
      const response = await fetch('/api/upload-pdf-single-page-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pageImage: finalPageImage,
          pageNumber,
          totalPages,
          documentId,
          documentTitle,
          fileName
        }),
        signal: abortControllerRef.current?.signal || null
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }

      const data = await response.json()
      const result = SinglePageVisionResponseSchema.parse(data)

      if (!result.success) {
        throw new Error(result.error || 'Processing failed')
      }

      updatePageState(pageNumber, { 
        status: 'processing', 
        progress: 40,
        result
      })

      // Step 2: Crop images based on bounding boxes
      updatePageState(pageNumber, { status: 'cropping', progress: 50 })
      
      const croppedImages: ExtractedImageWithData[] = []
      
      for (const imageData of result.extractedImages) {
        try {
          // Decode base64 page image for cropping (use original, not resized)
          const img = new Image()
          const loadPromise = new Promise<void>((resolve, reject) => {
            img.onload = () => resolve()
            img.onerror = () => reject(new Error('Failed to load image'))
          })
          img.src = pageImage // Use original image for cropping
          await loadPromise

          // Create canvas for cropping
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          if (!ctx) throw new Error('Failed to get canvas context')

          // Calculate actual pixel coordinates from normalized bbox
          const cropX = Math.floor(imageData.boundingBox.x * img.width)
          const cropY = Math.floor(imageData.boundingBox.y * img.height)
          const cropWidth = Math.floor(imageData.boundingBox.width * img.width)
          const cropHeight = Math.floor(imageData.boundingBox.height * img.height)

          // Set canvas size and crop
          canvas.width = cropWidth
          canvas.height = cropHeight
          ctx.drawImage(
            img,
            cropX, cropY, cropWidth, cropHeight,
            0, 0, cropWidth, cropHeight
          )

          // Convert to blob
          const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(
              (blob) => {
                if (blob) resolve(blob)
                else reject(new Error('Failed to create blob'))
              },
              'image/png'
            )
          })

          const croppedImage: ExtractedImageWithData = {
            elementId: imageData.elementId,
            filename: imageData.filename,
            storagePath: imageData.storagePath,
            boundingBox: {
              x: imageData.boundingBox.x,
              y: imageData.boundingBox.y,
              width: imageData.boundingBox.width,
              height: imageData.boundingBox.height
            },
            blob
          }
          if (imageData.caption !== undefined) {
            croppedImage.caption = imageData.caption
          }
          if (imageData.altText !== undefined) {
            croppedImage.altText = imageData.altText
          }
          croppedImages.push(croppedImage)
        } catch (cropError) {
          console.error(`Failed to crop image ${imageData.elementId}:`, cropError)
          // Continue with other images even if one fails
        }
      }

      updatePageState(pageNumber, { status: 'storing', progress: 70 })

      // Step 3: Upload cropped images to Supabase Storage
      const uploadedImages: ExtractedImageWithData[] = []
      const failedUploads: string[] = []
      
      for (const croppedImage of croppedImages) {
        try {
          const uploadResult = await uploadImageAssetWithRetry(
            croppedImage.blob!,
            documentId,
            croppedImage.filename,
            'image/png',
            {
              maxRetries: 3,
              retryDelay: 1000,
              onRetry: (attempt, error) => {
                console.log(`Retrying upload for ${croppedImage.filename} (attempt ${attempt}/3):`, error.message)
              }
            }
          )
          
          uploadedImages.push({
            ...croppedImage,
            uploadUrl: uploadResult.publicUrl
          })

          // NEW: record the asset in the document_assets table via RLS-protected browser client
          try {
            const { error: insertError } = await createClient()
              .from('document_assets')
              .insert({
                document_id: documentId,
                type: 'image',
                filename: croppedImage.filename,
                storage_path: uploadResult.path,
                caption: croppedImage.caption ?? null,
                extraction_confidence: null,
                metadata: {
                  bounding_box: {
                    x1: croppedImage.boundingBox.x,
                    y1: croppedImage.boundingBox.y,
                    x2: croppedImage.boundingBox.x + croppedImage.boundingBox.width,
                    y2: croppedImage.boundingBox.y + croppedImage.boundingBox.height
                  },
                  page_number: pageNumber,
                  file_size: uploadResult.size,
                  extraction_method: 'client_crop',
                  element_id: croppedImage.elementId
                }
              })

            if (insertError) {
              console.error('document_assets insert failed:', insertError.message)
            }
          } catch (metaErr) {
            console.error('Unexpected error inserting document_assets row:', metaErr)
          }
        } catch (uploadError) {
          console.error(`Failed to upload image ${croppedImage.filename} after retries:`, uploadError)
          failedUploads.push(croppedImage.filename)
          
          // If it's a permission error, fail the entire page
          if (uploadError instanceof ClientStorageError && uploadError.code === 'PERMISSION_DENIED') {
            throw new Error(`Storage permission denied: ${uploadError.message}`)
          }
          // For other errors, continue with remaining images
        }
      }
      
      // Update progress
      updatePageState(pageNumber, { status: 'storing', progress: 85 })
      
      // ADD_CHECK_ALL_UPLOADS_FAILED
      if (result.extractedImages.length > 0 && uploadedImages.length === 0) {
        throw new Error('All image uploads failed for this page')
      }
      
      // Step 4: Patch HTML with final storage URLs
      let patchedHtml = result.pageHtml
      
      // Replace placeholder image paths with actual uploaded URLs
      for (const uploadedImage of uploadedImages) {
        if (uploadedImage.uploadUrl) {
          // Replace the placeholder src with the actual URL
          // The API returns paths like "documents/{documentId}/assets/{filename}"
          // We need to replace with the actual public URL
          const placeholderPattern = new RegExp(
            `src=["']documents/${documentId}/assets/${uploadedImage.filename}["']`,
            'g'
          )
          patchedHtml = patchedHtml.replace(
            placeholderPattern,
            `src="${uploadedImage.uploadUrl}"`
          )
          
          // Also update any data-storage-path attributes
          const dataPathPattern = new RegExp(
            `data-storage-path=["']${uploadedImage.storagePath}["']`,
            'g'
          )
          patchedHtml = patchedHtml.replace(
            dataPathPattern,
            `data-storage-path="${uploadedImage.storagePath}" data-public-url="${uploadedImage.uploadUrl}"`
          )
        }
      }
      
      // If any uploads failed, include a comment in the HTML
      if (failedUploads.length > 0) {
        patchedHtml = `<!-- Warning: Failed to upload ${failedUploads.length} image(s): ${failedUploads.join(', ')} -->\n${patchedHtml}`
      }
      
      // NEW: Wrap the fragment in an explicit page wrapper to preserve ordering
      const wrappedHtml = `<section data-page-number="${pageNumber}" class="pdf-page page-${pageNumber}">\n${patchedHtml}\n</section>`
      
      updatePageState(pageNumber, { 
        status: 'completed', 
        progress: 100,
        htmlFragment: wrappedHtml
      })

      onPageComplete?.(pageNumber, wrappedHtml)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      if (retryCount < maxRetries) {
        // Retry the page
        console.log(`Retrying page ${pageNumber} (attempt ${retryCount + 1}/${maxRetries})`)
        await processPage(
          pageImage,
          pageNumber,
          totalPages,
          documentId,
          documentTitle,
          fileName,
          retryCount + 1
        )
      } else {
        updatePageState(pageNumber, { 
          status: 'error', 
          error: errorMessage,
          progress: 0
        })
        onError?.(pageNumber, errorMessage)
      }
    }
  }, [updatePageState, onPageComplete, onError, maxRetries])


  // Main upload function
  const uploadPages = useCallback(async (
    pageImages: Array<{ base64Image: string; pageNumber: number }>,
    documentId: string,
    documentTitle: string,
    fileName: string,
    totalPages: number
  ) => {
    // Reset state
    abortControllerRef.current = new AbortController()
    setIsUploading(true)
    setIsPaused(false)
    
    // Store page images and document metadata for retry functionality
    pageImagesRef.current.clear()
    pageImages.forEach(({ base64Image, pageNumber }) => {
      pageImagesRef.current.set(pageNumber, base64Image)
    })
    
    documentMetadataRef.current = {
      documentId,
      documentTitle,
      fileName,
      totalPages
    }
    
    // Initialize page states
    const initialStates: PageUploadState[] = pageImages.map(({ pageNumber }) => ({
      pageNumber,
      status: 'pending' as const,
      progress: 0
    }))
    setPageStates(initialStates)

    // Create p-queue instance with configuration
    const queue = new PQueue({ 
      concurrency: maxConcurrency,
      throwOnTimeout: true,
      timeout: 300000 // 5 minutes per page
    })
    queueRef.current = queue

    // Add tasks to queue with priority (lower page numbers = higher priority)
    const promises = pageImages.map(({ base64Image, pageNumber }) => 
      queue.add(
        () => processPage(
          base64Image,
          pageNumber,
          totalPages,
          documentId,
          documentTitle,
          fileName
        ),
        { priority: -pageNumber } // Negative so lower page numbers have higher priority
      )
    )

    // Wait for all uploads to complete
    try {
      await Promise.all(promises)
    } catch (error) {
      console.error('Error processing pages:', error)
    } finally {
      setIsUploading(false)
      
      // Get all completed HTML fragments in order
      const completedFragments = pageStatesRef.current
        .filter(state => state.status === 'completed')
        .sort((a, b) => a.pageNumber - b.pageNumber)
        .map(state => state.htmlFragment!)
        
      onAllComplete?.(completedFragments)
    }
  }, [processPage, onAllComplete, maxConcurrency, pageStates])

  // Cancel all uploads
  const cancel = useCallback(() => {
    abortControllerRef.current?.abort()
    queueRef.current?.clear() // Clear p-queue
    queueRef.current?.pause() // Pause queue
    setIsUploading(false)
    setPageStates(prev => prev.map(state => {
      if (state.status === 'completed') {
        return state
      }
      return {
        ...state,
        status: 'error' as const,
        error: 'Cancelled'
      }
    }))
  }, [])

  // Retry a specific page
  const retry = useCallback(async (pageNumber: number) => {
    const pageImage = pageImagesRef.current.get(pageNumber)
    const metadata = documentMetadataRef.current
    
    if (!pageImage || !metadata) {
      console.error(`Cannot retry page ${pageNumber}: missing data`)
      return
    }

    // Reset the page state
    updatePageState(pageNumber, { 
      status: 'pending', 
      progress: 0
    })

    // If there's an active queue, add the retry to it
    if (queueRef.current && !queueRef.current.isPaused) {
      await queueRef.current.add(
        () => processPage(
          pageImage,
          pageNumber,
          metadata.totalPages,
          metadata.documentId,
          metadata.documentTitle,
          metadata.fileName
        ),
        { priority: -pageNumber }
      )
    } else {
      // Process immediately if no active queue
      await processPage(
        pageImage,
        pageNumber,
        metadata.totalPages,
        metadata.documentId,
        metadata.documentTitle,
        metadata.fileName
      )
    }
  }, [processPage, updatePageState])

  // Pause uploads
  const pause = useCallback(() => {
    if (queueRef.current) {
      queueRef.current.pause()
      setIsPaused(true)
    }
  }, [])

  // Resume uploads
  const resume = useCallback(() => {
    if (queueRef.current) {
      queueRef.current.start()
      setIsPaused(false)
    }
  }, [])

  // Get completed HTML fragments
  const getCompletedHtml = useCallback(() => {
    return pageStates
      .filter(state => state.status === 'completed' && state.htmlFragment)
      .sort((a, b) => a.pageNumber - b.pageNumber)
      .map(state => state.htmlFragment!)
  }, [pageStates])

  // Calculate overall progress
  const overallProgress = pageStates.length > 0
    ? Math.round(
        pageStates.reduce((sum, state) => sum + state.progress, 0) / pageStates.length
      )
    : 0

  return {
    uploadPages,
    pageStates,
    isUploading,
    overallProgress,
    cancel,
    pause,
    resume,
    isPaused,
    retry,
    getCompletedHtml
  }
}