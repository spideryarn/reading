// Mock Chat API endpoint for testing assistant-ui integration
// This endpoint simulates AI responses with artificial delay before real LLM integration

import { NextRequest, NextResponse } from 'next/server'

// Mock responses for common document analysis questions
const mockResponses = [
  "I can help you analyze this document. What specific aspects would you like me to explore?",
  "Based on the document content, this appears to discuss key concepts around [topic]. Would you like me to summarize specific sections?",
  "That's an interesting question about the document. Let me think through the relevant passages...",
  "I notice this document covers several important themes. Which area would you like to focus on?",
  "Looking at the document structure, I can provide insights on [concept]. What would be most helpful?",
  "This document presents some complex ideas. I'd be happy to break down any particular section for you.",
  "Based on my analysis of the text, here are the key points that stand out...",
  "That's a thoughtful question. The document suggests several perspectives on this topic.",
]

// Simulate error conditions occasionally for testing error handling
const shouldSimulateError = () => Math.random() < 0.1 // 10% chance of error

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, documentContext } = body
    
    // Validate input
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      )
    }
    
    // Simulate processing delay (1.5 seconds)
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Simulate occasional errors for testing error handling
    if (shouldSimulateError()) {
      return NextResponse.json(
        { error: 'Simulated API error for testing' },
        { status: 500 }
      )
    }
    
    // Select a mock response based on message content or randomly
    let response: string
    const lowerMessage = message.toLowerCase()
    
    if (lowerMessage.includes('summarize') || lowerMessage.includes('summary')) {
      response = "I can provide a summary of this document. The main themes appear to be [key concepts]. Would you like me to focus on any particular section?"
    } else if (lowerMessage.includes('explain') || lowerMessage.includes('what')) {
      response = "Let me explain that concept from the document. Based on the text, it refers to [explanation]. Does this help clarify things?"
    } else if (lowerMessage.includes('question') || lowerMessage.includes('help')) {
      response = "I'm here to help you understand this document better. You can ask me to summarize sections, explain concepts, or discuss the main arguments presented."
    } else {
      // Random response for other queries
      response = mockResponses[Math.floor(Math.random() * mockResponses.length)]
    }
    
    // Include document context acknowledgment if provided
    if (documentContext) {
      response = `I can see the document context has been loaded. ${response}`
    }
    
    return NextResponse.json({ 
      response,
      timestamp: new Date().toISOString(),
      mockApi: true // Flag to indicate this is a mock response
    })
    
  } catch (error) {
    console.error('Error in chat API:', error)
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    )
  }
}