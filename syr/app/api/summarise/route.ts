// AI Summarisation API endpoint with configurable granularity
// See docs/AI_SUMMARISE.md for architecture and usage patterns

import { NextRequest, NextResponse } from 'next/server'
import { executePrompt } from '@/lib/prompts/types'
import { summarisePrompt, getMaxTokensForGranularity, getGranularityInstruction } from '@/lib/prompts/templates/summarise'

export async function POST(request: NextRequest) {
  try {
    const { content, granularity } = await request.json()
    
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required and must be a string' },
        { status: 400 }
      )
    }
    
    // Create a template with granularity-specific maxTokens
    const templateWithTokens = {
      ...summarisePrompt,
      modelConfig: {
        ...summarisePrompt.modelConfig,
        maxTokens: granularity ? getMaxTokensForGranularity(granularity) : 200
      }
    }
    
    const summary = await executePrompt(templateWithTokens, { 
      content, 
      granularity: getGranularityInstruction(granularity)
    })
    
    return NextResponse.json({ summary })
  } catch (error) {
    console.error('Error generating summary:', error)
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    )
  }
}