# Voice Input Microphone for Chatbot Interface

## Goal & Context

Implement voice input functionality for the chatbot interface using OpenAI Whisper API, with a microphone button next to the current send button. The feature will allow users to record voice messages that are automatically transcribed and sent as text input, providing a seamless voice-to-text experience that integrates with the existing chat system.

**Key Requirements:**
- Microphone icon next to the chat send button 
- Two recording modes: click to start/stop, or hold to record
- Visual feedback during recording (red recording state)
- Authentication protection (anonymous users cannot use voice input)
- Auto-send transcribed text using existing chat machinery
- Reusable recording components for future use (e.g., command palette)

## User Stories & Acceptance Criteria

### Primary User Story
**As a user**, I want to record voice messages in the chatbot so that I can interact with the AI using speech instead of typing.

### Acceptance Criteria

#### Recording Interface
- [ ] Microphone icon appears next to the send button in chat composer
- [ ] Click microphone → enters red recording mode, click again → stops recording
- [ ] Hold microphone → records while held, releases → stops recording
- [ ] Visual feedback during recording (red state, animation/pulse)
- [ ] Clear visual indication when processing transcription

#### Authentication & Security
- [ ] Voice input only available to authenticated users
- [ ] Anonymous users see disabled microphone or authentication prompt
- [ ] API endpoint protected with proper authentication middleware

#### Transcription & Integration
- [ ] Recording sent to OpenAI Whisper API via `/api/speech-to-text` endpoint
- [ ] Transcribed text automatically sent as chat message
- [ ] Uses existing chat machinery (same as typing + pressing send)
- [ ] Error handling for transcription failures

#### User Experience
- [ ] Smooth transition between recording states
- [ ] Loading indicator during transcription processing
- [ ] Error messages for microphone access denied
- [ ] Graceful fallback if browser doesn't support audio recording

#### Reusability
- [ ] Voice recording logic separated into reusable components
- [ ] Can be easily integrated into other contexts (command palette, etc.)
- [ ] Consistent API for voice input across the application

## References

- `docs/reference/RESEARCH_ON_SPEECH_TO_TEXT.md` - Speech-to-text API research and decision rationale
- `docs/reference/TOOL_CHATBOT_ASSISTANT_UI_INTEGRATION.md` - Current chatbot implementation using assistant-ui
- `docs/reference/DESIGN_ICONS.md` - Icon system using Phosphor Icons
- `docs/reference/LLM_PROMPT_TEMPLATES.md` - AI API integration patterns
- `components/assistant-chat.tsx` - Current chat component implementation
- `app/api/chat/route.ts` - Existing chat API endpoint

## Principles & Key Decisions

### Technical Approach
- **OpenAI Whisper API**: Selected for best accuracy (8.06% WER) and cost-effectiveness ($0.006/minute)
- **File-based transcription**: Record → upload → transcribe approach (simpler than streaming)
- **Browser MediaRecorder API**: Native browser recording capabilities
- **Reusable architecture**: Components designed for use beyond chatbot

### UX Design Principles
- **Progressive enhancement**: Voice input enhances but doesn't replace text input
- **Clear affordances**: Obvious visual cues for recording states
- **Fail gracefully**: Clear error messages and fallback options
- **Consistent integration**: Feels native to existing chat interface

### Authentication Strategy
- **User protection**: Only authenticated users can use voice features
- **Cost control**: Prevents anonymous abuse of transcription API
- **Privacy conscious**: Audio data only sent for authenticated sessions

### Integration Philosophy
- **Reuse existing machinery**: Transcribed text uses same path as typed input
- **Minimal disruption**: No changes to core chat logic required
- **Future extensibility**: Architecture supports voice input in other contexts

## Stages & Actions

### Stage: Setup and Research
- [ ] Run `./scripts/sync-worktrees.ts` in subagent to sync latest changes from main
- [ ] Review current chatbot component structure in `components/assistant-chat.tsx`
- [ ] Examine existing icon patterns in `docs/reference/DESIGN_ICONS.md`
- [ ] Study authentication middleware patterns in existing API routes

### Stage: Core Voice Recording Component
- [ ] Create `/api/speech-to-text` endpoint with OpenAI Whisper integration
  - Add OpenAI API key configuration and error handling
  - Implement file upload handling for audio data (WebM/MP3/WAV formats)
  - Add authentication middleware to protect endpoint
  - Return transcribed text with proper error responses
- [ ] Build reusable `SpeechToTextInput` component in `components/speech/`
  - Implement MediaRecorder API for browser audio recording
  - Add click-to-toggle and hold-to-record interaction modes
  - Create visual states: idle, recording, processing, error
  - Handle microphone permissions and browser compatibility
  - Include proper TypeScript types and error boundaries

### Stage: Chatbot Integration
- [ ] Add microphone button to existing chat composer in `components/assistant-chat.tsx`
  - Position microphone icon next to send button using Phosphor Icons
  - Integrate `SpeechToTextInput` component with chat context
  - Auto-send transcribed text using existing `onTranscription` callback
  - Ensure voice input respects authentication state
- [ ] Update chat composer layout and styling
  - Maintain visual balance with new microphone button
  - Add responsive design for mobile devices
  - Include loading states and visual feedback
  - Test interaction with existing send button functionality

### Stage: Authentication & Security
- [ ] Implement authentication checks in `/api/speech-to-text`
  - Add authentication middleware using existing patterns
  - Return appropriate error messages for unauthenticated requests
  - Test with authenticated and anonymous user sessions
- [ ] Add client-side authentication awareness
  - Show/hide microphone button based on auth state
  - Display appropriate messages for unauthenticated users
  - Handle auth state changes gracefully

### Stage: Error Handling & UX Polish
- [ ] Implement comprehensive error handling
  - Microphone access denied scenarios
  - Network failures during transcription
  - Whisper API rate limits or errors
  - Audio recording failures or browser incompatibility
- [ ] Add visual feedback and loading states
  - Recording animation/pulse effect using CSS or Phosphor Icons
  - Processing spinner during transcription
  - Success/error toast messages
  - Clear recovery actions for error states
- [ ] Test edge cases and browser compatibility
  - Different audio formats (WebM, MP3, WAV)
  - Various browser environments (Chrome, Safari, Firefox)
  - Mobile device recording capabilities
  - Network connectivity issues

### Stage: Testing & Documentation
- [ ] Write tests for voice input functionality
  - Unit tests for `SpeechToTextInput` component
  - Integration tests for chat component integration
  - API endpoint tests for authentication and transcription
  - Use subagent for test implementation to avoid verbose output
- [ ] Create comprehensive user documentation following `docs/instructions/WRITE_EVERGREEN_DOC.md`
  - Voice input user guide with browser requirements
  - Troubleshooting guide for common issues
  - Developer documentation for reusing voice components
- [ ] Run health checks and validation
  - `npm run check:health` for TypeScript and ESLint validation
  - `npm run test` for test suite validation
  - Browser testing across different environments

### Stage: Final Polish & Deployment
- [ ] Performance optimization and final testing
  - Audio compression and format optimization
  - Bundle size analysis for new dependencies
  - Accessibility testing for screen reader compatibility
  - Mobile responsive testing and interaction patterns
- [ ] Final health check and validation
  - `npm run build` - ensure TypeScript compilation succeeds
  - `npm run lint` - verify code quality standards
  - `npm test` - confirm all tests pass
- [ ] Update related documentation
  - Update `docs/reference/TOOL_CHATBOT_ASSISTANT_UI_INTEGRATION.md` with voice input section
  - Add voice input patterns to `docs/reference/UI_COMPONENTS.md`
  - Document reusable components for future use

# Appendix

## Technical Implementation Notes

### OpenAI Whisper Integration
```typescript
// /app/api/speech-to-text/route.ts
export async function POST(request: Request) {
  const formData = await request.formData();
  const audio = formData.get('audio') as File;
  
  const transcription = await openai.audio.transcriptions.create({
    file: audio,
    model: 'whisper-1',
    language: 'en',
    response_format: 'json'
  });
  
  return Response.json({ text: transcription.text });
}
```

### Reusable Component Architecture
```typescript
// components/speech/SpeechToTextInput.tsx
interface SpeechToTextInputProps {
  onTranscription: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

export function SpeechToTextInput({ onTranscription, disabled }: SpeechToTextInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Implementation details...
}
```

### Chat Integration Pattern
```typescript
// In components/assistant-chat.tsx
<SpeechToTextInput 
  onTranscription={(text) => {
    // Use existing chat machinery
    handleSendMessage(text);
  }}
  disabled={!isAuthenticated || isLoading}
/>
```

## Browser Compatibility Notes

- **HTTPS requirement**: Microphone access only works over HTTPS in production
- **Safari limitations**: May require different audio format handling
- **Mobile considerations**: Touch-friendly recording interface needed
- **Permission handling**: Graceful degradation when microphone access denied

## Cost Considerations

- **Whisper pricing**: $0.006/minute of audio
- **Estimated usage**: 1000 minutes/month = $6/month cost
- **Authentication protection**: Prevents anonymous usage and cost abuse
- **Monitoring**: Track usage for cost management and optimization

## Future Enhancement Opportunities

- **Real-time streaming**: Upgrade to Azure OpenAI Realtime API for <300ms latency
- **Language detection**: Auto-detect speech language for international users
- **Voice commands**: Structured voice commands for app navigation
- **Noise reduction**: Audio preprocessing for better accuracy in noisy environments