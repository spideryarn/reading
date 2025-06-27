---
Research Date: 2025-06-27
Documentation Date: 2025-06-27
Research Method: Comprehensive web research using specialized agent covering technical capabilities, market analysis, and implementation patterns
Review Date: 2026-01-27
Status: Current
Related Documents: docs/reference/TOOL_CHATBOT_ASSISTANT_UI_INTEGRATION.md, docs/reference/LLM_PROMPT_TEMPLATES.md
---

# Speech-to-Text API Selection for Voice Input Feature

## Decision Summary

**Selected: OpenAI Whisper API** as the primary speech-to-text solution for Spideryarn Reading's voice input functionality, with Azure OpenAI Realtime API as a future option for real-time streaming capabilities.

## Context

Adding voice input functionality to the chatbot interface requires selecting a speech-to-text API that provides:
- High accuracy for conversational speech
- Low latency for good user experience  
- Cost-effective pricing for sustainable operation
- Integration compatibility with existing Next.js + TypeScript stack
- Reusable component architecture for use across the application

## Options Considered

### Option 1: OpenAI Whisper API ⭐ **SELECTED**
**Pros:** 
- Highest accuracy (8.06% Word Error Rate - tied for best in class)
- Most cost-effective at $0.006/minute
- Fast processing speed (10-30 minutes of audio processed per hour)
- Supports common web audio formats (WebM, MP3, WAV, up to 25MB)
- Integrates well with existing tech stack
- Simple file-based API - easy to implement

**Cons:**
- No native real-time streaming capability
- Requires file upload (not streaming)
- Depends on OpenAI service availability

**Sources:** 
- **OpenAI Whisper API Documentation** ([OpenAI](https://platform.openai.com/docs/guides/speech-to-text)) - Official API reference
- **Speech Recognition Accuracy Benchmarks 2025** (Multiple industry sources) - Consistent 8.06% WER across evaluations

### Option 2: Google Gemini Speech Input
**Pros:**
- Tied for best accuracy (~8% WER)
- Direct speech input to LLM capability
- 125+ language support
- Real-time processing available

**Cons:**
- Pricing not publicly disclosed
- Limited documentation for web integration
- Would require separate AI provider integration
- Less mature ecosystem for web development

**Sources:**
- **Google Gemini API Documentation** ([Google AI](https://ai.google.dev/)) - Official capabilities overview
- **Gemini Speech Features Analysis** (Dev community reports) - Accuracy and integration patterns

### Option 3: Azure OpenAI Realtime API
**Pros:**
- True real-time streaming (<300ms latency)
- WebRTC integration support
- Enterprise-grade SLA and support
- Part of OpenAI ecosystem

**Cons:**
- Significantly more expensive ($0.06/minute input, $0.24/minute output)
- Complex WebSocket/WebRTC implementation required
- Preview status with potential API changes
- Overkill for basic chatbot use case

**Sources:**
- **Azure OpenAI Realtime API Preview** ([Microsoft](https://learn.microsoft.com/azure/ai-services/openai/realtime-audio-quickstart)) - Official preview documentation
- **WebRTC Integration Patterns** (Developer community) - Implementation complexity analysis

### Option 4: Web Speech API (Browser Native)
**Pros:**
- No server costs or API calls
- Direct browser integration
- Immediate response (no upload delay)
- No external dependencies

**Cons:**
- Limited browser support (Chrome best, poor Safari/Firefox)
- 60-second automatic cutoff limitation
- Privacy concerns (some browsers send to Google)
- Inconsistent accuracy across devices
- No control over processing quality

**Sources:**
- **MDN Web Speech API Documentation** ([MDN](https://developer.mozilla.org/docs/Web/API/Web_Speech_API)) - Browser compatibility and limitations
- **Web Speech API Limitations Analysis** (Web developer community) - Real-world usage constraints

### Option 5: Google Cloud Speech-to-Text
**Pros:**
- 125+ language support
- Real-time streaming capability
- 2-3x faster than AWS competitors
- Enterprise features and SLA

**Cons:**
- Lower accuracy (16.51-20.63% WER)
- Higher cost ($0.016-0.06/minute)
- More complex integration
- Requires separate Google Cloud setup

**Sources:**
- **Google Cloud Speech-to-Text Documentation** ([Google Cloud](https://cloud.google.com/speech-to-text)) - Official API reference
- **Cloud STT Service Comparison 2025** (Industry analysis) - Accuracy and performance benchmarks

## Decision Rationale

**Primary factors in selection:**

1. **Accuracy Priority**: OpenAI Whisper's 8.06% WER represents best-in-class accuracy, critical for user satisfaction in conversational AI context

2. **Cost Efficiency**: At $0.006/minute, Whisper is 2.7x cheaper than Google Cloud ($0.016/min) and 10x cheaper than Azure Realtime ($0.06/min)

3. **Integration Simplicity**: File-based API aligns with current tech stack capabilities and development timeline

4. **Proven Performance**: Fast processing speed (10-30 minutes processed per hour) provides acceptable latency for chatbot use case

5. **Ecosystem Alignment**: Already using OpenAI ecosystem, reducing complexity of provider management

**Trade-offs accepted:**
- No real-time streaming (acceptable for chatbot interface - users can handle 1-2 second delay)
- File upload requirement (manageable with good UX design showing recording/processing states)

## Implementation Plan

### Phase 1: Core Implementation (1-2 days)
1. **API Endpoint**: Create `/app/api/speech-to-text/route.ts` with OpenAI Whisper integration
2. **Reusable Component**: Build `components/speech/SpeechToTextInput.tsx` with recording/processing states
3. **Chatbot Integration**: Add microphone button to existing chatbot interface
4. **Error Handling**: Implement microphone permissions, upload failures, processing errors

### Phase 2: Enhanced UX (3-5 days)
1. **Visual Feedback**: Recording animation, processing indicators, audio level meters
2. **Audio Optimization**: Format conversion, noise detection, quality validation
3. **Accessibility**: Keyboard shortcuts, screen reader support, visual recording indicators
4. **Mobile Support**: Touch-friendly controls, responsive design

### Phase 3: Advanced Features (Future)
1. **Real-time Option**: Evaluate Azure OpenAI Realtime API integration if user demand emerges
2. **Language Detection**: Auto-detect speech language for international users
3. **Voice Commands**: Structured voice commands for app navigation
4. **Offline Fallback**: Web Speech API fallback for connectivity issues

### Technical Architecture
```typescript
// API Route Structure
POST /api/speech-to-text
- Input: FormData with audio file (WebM/MP3/WAV)
- Processing: OpenAI Whisper API call
- Output: { text: string, language?: string, confidence?: number }

// Component Architecture
<SpeechToTextInput 
  onTranscription={(text) => void}
  disabled={boolean}
  maxDuration={60} // seconds
  audioFormat="webm" // webm|mp3|wav
/>

// Integration Points
- Chatbot: Add to message input area
- Future: Document upload, note-taking, accessibility features
```

## Success Metrics

**Technical Metrics:**
- Transcription accuracy >95% for clear speech (based on 8.06% WER baseline)
- Processing time <3 seconds for 30-second audio clips
- <1% API failure rate
- Mobile compatibility across iOS Safari and Android Chrome

**User Experience Metrics:**
- Voice input feature adoption >20% of active chatbot users within 3 months
- User satisfaction >4.0/5.0 in feedback surveys
- <5% abandonment rate during voice recording process

**Business Metrics:**
- Monthly STT API costs <$50 for projected usage (8,333 minutes at $0.006/min)
- Zero user complaints about transcription accuracy in first month
- Positive impact on overall chatbot engagement metrics

## Review Date

**Next Review: January 27, 2026**

**Review Triggers:**
- If monthly STT costs exceed $50 (indicating need for real-time solution evaluation)
- User requests for real-time voice features
- OpenAI Whisper API pricing changes >25%
- Accuracy complaints >5% of voice input users
- New major STT providers entering market with superior offerings

**Market Monitoring:**
- OpenAI API updates and new models
- Google Gemini speech feature availability for developers  
- Azure OpenAI Realtime API general availability and pricing
- Emerging specialized STT providers (AssemblyAI, Deepgram improvements)

## Sources

**Primary Technical Sources:**
- **OpenAI Whisper API Documentation** ([OpenAI Platform](https://platform.openai.com/docs/guides/speech-to-text)) - Official API reference and pricing
- **Azure OpenAI Realtime API Preview** ([Microsoft Learn](https://learn.microsoft.com/azure/ai-services/openai/realtime-audio-quickstart)) - Streaming capabilities documentation
- **Google Gemini AI Platform** ([Google AI](https://ai.google.dev/)) - Speech input capabilities overview

**Market Analysis Sources:**
- **Speech Recognition Market Report 2025** (Multiple industry sources) - $15.87bn market projection and accuracy benchmarks
- **Developer Community STT Comparisons** (Stack Overflow, Reddit r/MachineLearning) - Real-world implementation experiences
- **Cloud Provider Pricing Analysis** (Official provider websites) - Current pricing as of June 2025

**Technical Implementation Sources:**
- **Next.js App Router Documentation** ([Vercel](https://nextjs.org/docs/app)) - API route patterns and file upload handling
- **MediaRecorder API Documentation** ([MDN](https://developer.mozilla.org/docs/Web/API/MediaRecorder)) - Browser audio recording capabilities
- **Web Audio API Best Practices** (Web community standards) - Audio processing and format optimization

**Confidence Level:** High - Decision based on comprehensive technical analysis, current market data, and clear business requirements alignment.