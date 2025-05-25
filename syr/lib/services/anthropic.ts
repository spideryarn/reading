import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function generateSummary(content: string, context?: string): Promise<string> {
  const prompt = context 
    ? `Context: ${context}\n\nPlease summarize the following content:\n\n${content}`
    : `Please summarize the following content:\n\n${content}`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-0',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ]
  })

  return response.content[0].type === 'text' ? response.content[0].text : ''
}