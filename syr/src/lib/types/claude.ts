export interface ClaudeMessage {
    role: 'user' | 'assistant'
    content: string
}

export interface ClaudeRequest {
    model: string
    messages: ClaudeMessage[]
    max_tokens?: number
    temperature?: number
}

export interface ClaudeResponse {
    id: string
    type: string
    role: string
    content: Array<{
        type: string
        text: string
    }>
    model: string
    stop_reason: string | null
    stop_sequence: string | null
    usage: {
        input_tokens: number
        output_tokens: number
    }
}

// Types for our internal API endpoints
export interface SummarizeRequest {
    text: string
}

export interface SummarizeResponse {
    summary: string
    error?: string
} 