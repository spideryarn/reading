import { NextRequest, NextResponse } from 'next/server'
import { executePromptWithUsage } from '@/lib/prompts/types'
import { readingDifficultyPrompt, parseReadingDifficultyResponse, type ReadingDifficultyOutput } from '@/lib/prompts/templates/reading-difficulty'
import { createRequestLogger, generateCorrelationId, logAIOperation, createTimer } from '@/lib/services/logger'
import { createClient } from '@/lib/supabase/server'
import { extractCleanText } from '@/lib/utils/html-text-extraction'

// SMOG fallback implementation
function calculateSMOGScore(text: string): number {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  if (sentences.length < 30) {
    // For short texts, estimate based on available sentences
    const estimatedSentences = Math.max(sentences.length, 3)
    const polysyllableWords = countPolysyllableWords(text)
    const estimatedPolysyllables = (polysyllableWords / sentences.length) * 30
    return 3.1291 + Math.sqrt(estimatedPolysyllables)
  }
  
  // Standard SMOG calculation for 30 sentences
  const thirtysentences = sentences.slice(0, 30).join(' ')
  const polysyllableWords = countPolysyllableWords(thirtysentences)
  return 3.1291 + Math.sqrt(polysyllableWords)
}

function countPolysyllableWords(text: string): number {
  const words = text.toLowerCase().match(/\b[a-z]+\b/g) || []
  return words.filter(word => countSyllables(word) >= 3).length
}

function countSyllables(word: string): number {
  if (word.length <= 3) return 1
  word = word.toLowerCase().replace(/[^a-z]/g, '')
  let count = word.match(/[aeiouy]+/g)?.length || 0
  if (word.endsWith('e')) count--
  return Math.max(count, 1)
}

function smogToAcademicLevel(smogScore: number): ReadingDifficultyOutput {
  let level: ReadingDifficultyOutput['level']
  let factors: string[]
  
  if (smogScore <= 8) {
    level = 'High school or below'
    factors = ['Simple sentence structure', 'Common vocabulary', 'Basic concepts']
  } else if (smogScore <= 12) {
    level = 'Undergraduate'  
    factors = ['Moderate sentence complexity', 'Some specialized terms', 'Academic concepts']
  } else if (smogScore <= 16) {
    level = 'Masters/PhD'
    factors = ['Complex sentence structure', 'Technical terminology', 'Advanced concepts']
  } else {
    level = 'Post-doctoral/expert'
    factors = ['Very complex sentences', 'Highly specialized vocabulary', 'Expert-level concepts']
  }
  
  return {
    level,
    confidence: 'Medium' as const,
    factors
  }
}

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId()
  const requestLogger = createRequestLogger('/api/reading-difficulty', correlationId)
  const requestTimer = createTimer(requestLogger, 'reading-difficulty-request')
  
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      requestLogger.warn({ correlationId }, 'Unauthorized reading difficulty request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { content, documentId } = body

    if (!content || typeof content !== 'string') {
      requestLogger.warn({ correlationId, userId: user.id }, 'Invalid content provided')
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    // Clean the content for analysis
    const cleanText = extractCleanText(content)
    
    if (cleanText.length < 50) {
      requestLogger.warn({ 
        correlationId, 
        userId: user.id, 
        documentId,
        contentLength: cleanText.length 
      }, 'Content too short for analysis')
      return NextResponse.json({ error: 'Content too short for reading difficulty analysis' }, { status: 400 })
    }

    requestLogger.info({
      userId: user.id,
      documentId,
      contentLength: cleanText.length,
      correlationId
    }, 'Reading difficulty analysis initiated')

    let result: ReadingDifficultyOutput
    let useLLM = true

    try {
      // Try LLM assessment first
      const llmResult = await executePromptWithUsage(readingDifficultyPrompt, {
        content: cleanText.substring(0, 8000) // Limit content length for LLM
      })

      // Log AI operation
      logAIOperation('reading-difficulty-assessment', {
        modelProvider: 'anthropic',
        tokensUsed: llmResult.usage.totalTokens,
        userId: user.id,
        documentId,
        correlationId
      }, 'success')

      result = parseReadingDifficultyResponse(llmResult.text)
      
      requestLogger.info({
        userId: user.id,
        documentId,
        level: result.level,
        confidence: result.confidence,
        tokensUsed: llmResult.usage.totalTokens,
        correlationId
      }, 'LLM reading difficulty assessment completed')

    } catch (llmError) {
      requestLogger.warn({
        userId: user.id,
        documentId,
        error: llmError instanceof Error ? llmError.message : 'Unknown LLM error',
        correlationId
      }, 'LLM assessment failed, falling back to SMOG')

      useLLM = false
      
      // Fallback to SMOG formula
      const smogScore = calculateSMOGScore(cleanText)
      result = smogToAcademicLevel(smogScore)

      requestLogger.info({
        userId: user.id,
        documentId,
        smogScore,
        level: result.level,
        correlationId
      }, 'SMOG fallback assessment completed')
    }

    requestTimer.end({ 
      userId: user.id, 
      documentId, 
      level: result.level,
      method: useLLM ? 'llm' : 'smog',
      correlationId 
    })

    return NextResponse.json({
      level: result.level,
      confidence: result.confidence,
      factors: result.factors,
      method: useLLM ? 'llm' : 'smog'
    })

  } catch (error) {
    requestLogger.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      correlationId
    }, 'Reading difficulty assessment failed')

    requestTimer.end({ 
      correlationId,
      status: 'error' 
    })

    return NextResponse.json(
      { error: 'Failed to assess reading difficulty' },
      { status: 500 }
    )
  }
}