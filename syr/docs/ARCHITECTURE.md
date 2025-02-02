# Spideryarn Reading Architecture

see README.md for more information

## Overview

Spideryarn Reading is a web application for AI-assisted document reading and analysis. The initial implementation focuses on HTML documents with Claude AI integration.

## System Architecture

![Architecture Diagram](architecture.png)

[Source Diagram](architecture.mmd)

Run `scripts/generate-diagram.sh`

## Key Components

### Frontend (Svelte + TypeScript)

1. **Document Reader**
   - Displays HTML content
   - Handles text selection
   - Manages reading position

2. **AI features**
   - Automatically run parsing/summarisation when the document loads
   - We need a simple MVP way of caching those parsing/summarisation results
   - Basic UI controls for triggering specific AI analysis
   - Display AI analysis results inline with the document

3. **Annotation Layer**
   - Overlays annotations on document
   - Links AI responses to document sections

### State Management

1. **Document Store**
   - Current document content
   - Reading position
   - Selection state

2. **AI Chat Store**
   - Conversation history
   - Active queries
   - Response status

### Services

1. **Document Parser**
   - Processes HTML content
   - Extracts structure and metadata

2. **AI Service**
   - Handles Claude API communication
   - Manages prompt construction
   - Processes AI responses

## Initial MVP Scope

- Single page application
- Dark theme only
- A single hard-coded HTML document
- Basic Claude integration
- Automatic document analysis on load
- Essential reading features only

## Future Considerations

- AI chat interface
- Supabase/Postgres integration
- Multi-document support
- User authentication
- Persistent annotations
- Advanced AI features
- Light/dark theme toggle
