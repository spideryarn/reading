import { ANTHROPIC_API_KEY } from '$env/static/private'
import type { ClaudeRequest, ClaudeResponse } from '$lib/types/claude'
import { getSummarizePrompt } from '$lib/prompts/summarize'

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-3-5-sonnet-20241022'

export class ClaudeError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'ClaudeError'
    }
}

export async function callClaude(messages: ClaudeRequest['messages']): Promise<string> {
    if (!ANTHROPIC_API_KEY) {
        throw new ClaudeError('Missing Anthropic API key')
    }

    const request: ClaudeRequest = {
        model: MODEL,
        messages,
        max_tokens: 1024,
        temperature: 0.0,
    }

    try {
        const response = await fetch(CLAUDE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(request)
        })

        if (!response.ok) {
            const error = await response.text()
            throw new ClaudeError(`API error: ${error}`)
        }

        const data = await response.json() as ClaudeResponse
        return data.content[0].text
    } catch (error) {
        if (error instanceof ClaudeError) {
            throw error
        }
        throw new ClaudeError(`Failed to call Claude API: ${error instanceof Error ? error.message : String(error)}`)
    }
}

export async function summarizeText(text: string): Promise<string> {
    const messages = [
        {
            role: 'user' as const,
            content: getSummarizePrompt({ text })
        }
    ]

    return callClaude(messages)
} 