import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { executePrompt } from '@/lib/prompts/types'
import { summarisePrompt, getMaxTokensForGranularity, getGranularityInstruction } from '@/lib/prompts/templates/summarise'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

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
    
    const summary = await executePrompt(anthropic, templateWithTokens, { 
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