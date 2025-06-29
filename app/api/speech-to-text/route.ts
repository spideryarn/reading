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
      return NextResponse.json({
        success: false,
        error: 'Speech-to-text service not configured'
      }, { status: 500 })
    }
    
    // Parse FormData
    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      logger.warn('Failed to parse FormData')
      return NextResponse.json({
        success: false,
        error: 'Invalid request format - expected multipart/form-data'
      }, { status: 400 })
    }
    
    // Extract audio file
    const audioFile = formData.get('audio') as File
    if (!audioFile) {
      return NextResponse.json({
        success: false,
        error: 'No audio file provided - include audio file in "audio" field'
      }, { status: 400 })
    }
    
    // Validate file size
    if (audioFile.size > MAX_FILE_SIZE) {
      logger.warn({
        fileSize: audioFile.size,
        maxSize: MAX_FILE_SIZE,
        fileName: audioFile.name
      }, 'Audio file too large')
      
      return NextResponse.json({
        success: false,
        error: `Audio file too large - maximum size is ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`
      }, { status: 413 })
    }
    
    // Validate file format
    if (!SUPPORTED_FORMATS.includes(audioFile.type) && audioFile.type !== '') {
      logger.warn({
        fileType: audioFile.type,
        fileName: audioFile.name,
        supportedFormats: SUPPORTED_FORMATS
      }, 'Unsupported audio format')
      
      return NextResponse.json({
        success: false,
        error: `Unsupported audio format - supported formats: WebM, MP3, WAV, M4A`
      }, { status: 400 })
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
          return NextResponse.json({
            success: false,
            error: 'Speech-to-text service authentication failed'
          }, { status: 500 })
        }
        
        // Rate limit errors
        if (error.message.includes('rate limit') || error.message.includes('429')) {
          return NextResponse.json({
            success: false,
            error: 'Rate limit exceeded - please try again later'
          }, { status: 429 })
        }
        
        // File format errors
        if (error.message.includes('format') || error.message.includes('invalid')) {
          return NextResponse.json({
            success: false,
            error: 'Invalid audio file format or corrupted file'
          }, { status: 400 })
        }
        
        // Model or service errors
        if (error.message.includes('model') || error.message.includes('whisper')) {
          return NextResponse.json({
            success: false,
            error: 'Speech-to-text service temporarily unavailable'
          }, { status: 503 })
        }
      }
      
      // Generic API error
      return NextResponse.json({
        success: false,
        error: 'Failed to transcribe audio - please try again'
      }, { status: 500 })
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
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }
    
    // Generic server error
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
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