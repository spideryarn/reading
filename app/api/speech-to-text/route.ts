/**
 * Speech-to-Text API endpoint using OpenAI Whisper
 * 
 * Accepts audio file uploads via FormData and returns transcribed text.
 * Supports WebM, MP3, WAV, M4A formats with a 25MB file size limit.
 * 
 * Route: /api/speech-to-text
 * Method: POST
 */

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { requireAuth } from '@/lib/auth/server-auth'
import { createRequestLogger, generateCorrelationId, createTimer } from '@/lib/services/logger'
import { createProblemDetail } from '@/lib/api/error-utils'

// Supported audio formats as per OpenAI Whisper API documentation
const SUPPORTED_FORMATS = ['audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/mp4']
const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB as per OpenAI limits

/**
 * POST handler - transcribe audio to text using OpenAI Whisper
 */
export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId()
  const logger = createRequestLogger('POST /api/speech-to-text', correlationId)
  const timer = createTimer()
  
  try {
    // Validate authentication
    const authUser = await requireAuth()
    
    logger.info({
      userId: authUser.id,
      correlationId
    }, 'Processing speech-to-text request')
    
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
    
    if (!process.env.OPENAI_API_KEY) {
      logger.error('OpenAI API key not configured')
      return createProblemDetail({
        type: 'https://www.spideryarn.com/probs/speech-to-text-not-configured',
        title: 'Speech-to-text service unavailable',
        status: 500,
        detail: 'The speech-to-text service is not configured on the server. Please contact support.',
        correlationId
      })
    }
    
    // Parse FormData
    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      logger.warn('Failed to parse FormData')
      return createProblemDetail({
        type: 'https://www.spideryarn.com/probs/invalid-input',
        title: 'Invalid request format',
        status: 400,
        detail: 'Expected multipart/form-data with audio file.',
        correlationId
      })
    }
    
    // Extract audio file
    const audioFile = formData.get('audio') as File
    if (!audioFile) {
      return createProblemDetail({
        type: 'https://www.spideryarn.com/probs/invalid-input',
        title: 'Audio file required',
        status: 400,
        detail: 'Include an audio file in the "audio" form field.',
        correlationId
      })
    }
    
    // Validate file size
    if (audioFile.size > MAX_FILE_SIZE) {
      logger.warn({
        fileSize: audioFile.size,
        maxSize: MAX_FILE_SIZE,
        fileName: audioFile.name
      }, 'Audio file too large')
      
      return createProblemDetail({
        type: 'https://www.spideryarn.com/probs/file-too-large',
        title: 'Audio file too large',
        status: 413,
        detail: `Maximum allowed size is ${Math.round(MAX_FILE_SIZE / 1024 / 1024)} MB.`,
        correlationId,
        retryable: false
      })
    }
    
    // Validate file format
    if (!SUPPORTED_FORMATS.includes(audioFile.type) && audioFile.type !== '') {
      logger.warn({
        fileType: audioFile.type,
        fileName: audioFile.name,
        supportedFormats: SUPPORTED_FORMATS
      }, 'Unsupported audio format')
      
      return createProblemDetail({
        type: 'https://www.spideryarn.com/probs/unsupported-media-type',
        title: 'Unsupported audio format',
        status: 400,
        detail: 'Supported formats: WebM, MP3, WAV, M4A',
        correlationId
      })
    }
    
    logger.info({
      fileName: audioFile.name,
      fileSize: audioFile.size,
      fileType: audioFile.type,
      userId: authUser.id
    }, 'Starting audio transcription')
    
    // Start transcription timer
    const transcriptionTimer = createTimer()
    
    try {
      // Call OpenAI Whisper API
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'en',
        response_format: 'json'
      })
      
      const transcriptionDuration = transcriptionTimer.elapsed()
      
      logger.info({
        transcriptionLength: transcription.text.length,
        duration: transcriptionDuration,
        fileName: audioFile.name,
        userId: authUser.id,
        correlationId
      }, 'Audio transcription completed successfully')
      
      return NextResponse.json({
        success: true,
        text: transcription.text
      })
      
    } catch (error) {
      const transcriptionDuration = transcriptionTimer.elapsed()
      
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: transcriptionDuration,
        fileName: audioFile.name,
        userId: authUser.id
      }, 'OpenAI Whisper API error')
      
      // Handle specific OpenAI errors
      if (error instanceof Error) {
        // API key errors
        if (error.message.includes('API key') || error.message.includes('401')) {
          return createProblemDetail({
            type: 'https://www.spideryarn.com/probs/api-auth-error',
            title: 'Speech-to-text authentication failed',
            status: 500,
            detail: 'Unable to authenticate with speech-to-text provider.',
            correlationId
          })
        }
        
        // Rate limit errors
        if (error.message.includes('rate limit') || error.message.includes('429')) {
          return createProblemDetail({
            type: 'https://www.spideryarn.com/probs/rate-limit',
            title: 'Rate limit exceeded',
            status: 429,
            detail: 'Too many speech-to-text requests. Please wait and try again.',
            correlationId,
            retryable: true
          })
        }
        
        // File format errors
        if (error.message.includes('format') || error.message.includes('invalid')) {
          return createProblemDetail({
            type: 'https://www.spideryarn.com/probs/invalid-input',
            title: 'Invalid audio file',
            status: 400,
            detail: 'Audio format is invalid or file is corrupted.',
            correlationId
          })
        }
        
        // Model or service errors
        if (error.message.includes('model') || error.message.includes('whisper')) {
          return createProblemDetail({
            type: 'https://www.spideryarn.com/probs/service-unavailable',
            title: 'Speech-to-text unavailable',
            status: 503,
            detail: 'The speech-to-text provider is temporarily unavailable. Please try again later.',
            correlationId,
            retryable: true
          })
        }
      }
      
      // Generic API error
      return createProblemDetail({
        type: 'https://www.spideryarn.com/probs/transcription-failed',
        title: 'Audio transcription failed',
        status: 500,
        detail: 'An unexpected error occurred while transcribing the audio.',
        correlationId
      })
    }
    
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      executionTime: timer.elapsed()
    }, 'Speech-to-text request failed')
    
    // Handle authentication errors
    if (error instanceof Error && 
        (error.message.includes('Authentication failed') || 
         error.message.includes('User not authenticated'))) {
      return createProblemDetail({
        type: 'https://www.spideryarn.com/probs/auth-required',
        title: 'Authentication required',
        status: 401,
        detail: 'Please sign in to use the speech-to-text service.'
      })
    }
    
    // Generic server error
    return createProblemDetail({
      type: 'https://www.spideryarn.com/probs/internal-server-error',
      title: 'Internal server error',
      status: 500,
      detail: 'An unexpected error occurred while processing the request.',
      correlationId
    })
  }
}

/**
 * OPTIONS handler for CORS support
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}