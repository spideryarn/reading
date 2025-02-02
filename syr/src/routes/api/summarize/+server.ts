import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { summarizeText } from '$lib/services/claude'
import type { SummarizeRequest } from '$lib/types/claude'
import { ClaudeError } from '$lib/services/claude'

export const POST: RequestHandler = async ({ request }) => {
    try {
        const body = await request.json() as SummarizeRequest
        
        if (!body.text) {
            return json({ error: 'Missing text parameter' }, { status: 400 })
        }

        const summary = await summarizeText(body.text)
        return json({ summary })
    } catch (error) {
        console.error('Error in summarize endpoint:', error)
        
        if (error instanceof ClaudeError) {
            return json({ error: error.message }, { status: 500 })
        }
        
        return json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        )
    }
} 