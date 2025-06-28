# Voice Input Speech-to-Text Feature

Voice input functionality for the chatbot interface using OpenAI Whisper API, allowing users to record voice messages that are automatically transcribed and sent as text input.

## See also

- `components/speech/` - Reusable voice input components implementation
- `app/api/speech-to-text/route.ts` - OpenAI Whisper API integration endpoint
- `docs/reference/TOOL_CHATBOT_ASSISTANT_UI_INTEGRATION.md` - Chat interface integration details
- `docs/reference/RESEARCH_ON_SPEECH_TO_TEXT.md` - Speech-to-text API research and decision rationale
- `planning/250627b_voice_input_microphone_chatbot.md` - Complete implementation planning and debrief
- [OpenAI Whisper API documentation](https://platform.openai.com/docs/guides/speech-to-text) - API reference and capabilities

## Key Features ✓

- **Microphone button integration** next to chat send button
- **Two recording modes**: Click to start/stop or hold to record
- **Visual feedback** during recording (red state, processing indicators)
- **Authentication protection** (anonymous users cannot use voice input)
- **Auto-send transcription** using existing chat machinery
- **Reusable components** for use beyond chatbot (command palette, etc.)
- **Comprehensive error handling** for permissions, network, and API failures
- **Browser compatibility** with graceful degradation

## Browser Requirements

### Supported Browsers
- **Chrome/Chromium** 47+ (recommended)
- **Firefox** 29+
- **Safari** 14.1+
- **Edge** 79+

### Security Requirements
- **HTTPS required** for microphone access (except localhost in development)
- **Secure context** needed for MediaRecorder API
- **Microphone permissions** must be granted by user

### Audio Format Support
- Primary: WebM with Opus codec
- Fallback: MP3, WAV, M4A
- Auto-detection with graceful fallback

## How to Use Voice Input

### In the Chatbot

1. **Navigate** to any document's chat tab
2. **Look for** the microphone icon next to the send button
3. **Record your message** using either mode:
   - **Click mode**: Click microphone → speak → click again to stop
   - **Hold mode**: Press and hold microphone → speak → release to stop
4. **Wait for processing** (transcription typically takes 1-3 seconds)
5. **Review and send** - transcribed text auto-populates and sends

### Visual States

- **Idle**: Gray microphone icon
- **Recording**: Red microphone with pulsing animation
- **Processing**: Spinner indicating transcription in progress
- **Error**: Red state with clear error message and recovery instructions

## Authentication & Security

### User Protection
- **Authenticated users only** - voice input disabled for anonymous users
- **API endpoint protection** using existing authentication middleware
- **Cost control** prevents anonymous abuse of transcription API
- **Privacy conscious** - audio data only sent for authenticated sessions

### Error Messages
- **Permission denied**: Browser-specific guidance for enabling microphone access
- **Authentication required**: Clear prompt to log in
- **Network errors**: Retry suggestions and connectivity troubleshooting
- **Rate limits**: Wait time guidance when API limits exceeded

## Technical Implementation

### Component Architecture
```typescript
// Reusable component in components/speech/
interface SpeechToTextInputProps {
  onTranscription: (text: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
}
```

### API Integration
- **Endpoint**: `/api/speech-to-text`
- **Method**: POST with FormData
- **Authentication**: Required using existing middleware
- **Rate limiting**: Handled with retry logic
- **File size limit**: 25MB maximum

### Browser API Usage
- **MediaRecorder API** for audio recording
- **Permissions API** for microphone access checking
- **getUserMedia()** for microphone stream access
- **FormData** for file upload to transcription endpoint

## Troubleshooting

### Common Issues

**"Microphone permission denied"**
- **Chrome/Edge**: Click camera/microphone icon in address bar → Allow
- **Firefox**: Click shield/microphone icon → Allow
- **Safari**: Preferences → Websites → Microphone → Allow for this site
- **General**: Check browser privacy settings and refresh page

**"No microphone found"**
- Ensure microphone is connected and working
- Check system audio settings
- Try a different microphone if available
- Restart browser if issue persists

**"Speech-to-text not supported"**
- Update to a modern browser version
- Ensure HTTPS connection (required for microphone access)
- Try a different browser if compatibility issues persist

**"Network error during transcription"**
- Check internet connection
- Retry after a moment
- Check for browser extensions blocking requests

### Browser-Specific Notes

**Chrome/Chromium**
- Best compatibility and performance
- Excellent WebM support
- Reliable permission handling

**Firefox**
- Good compatibility
- May require permission prompt each session
- WebM support varies by version

**Safari**
- Requires Safari 14.1+ for full compatibility
- May need different audio format fallbacks
- More restrictive permission handling

**Mobile Browsers**
- Touch-friendly interface adaptations
- May require different interaction patterns
- Test thoroughly on target devices

## Cost Considerations

### OpenAI Whisper Pricing
- **Rate**: $0.006 per minute of audio
- **Estimated usage**: 1000 minutes/month = $6/month
- **Authentication protection** prevents anonymous cost abuse
- **Monitoring**: Usage tracked for cost management

### Performance Optimization
- **File compression** optimized for quality vs. size
- **Format detection** uses most efficient supported codec
- **Resource cleanup** prevents memory leaks during recording

## Future Enhancements 📋

### Planned Improvements
- **Real-time streaming**: Azure OpenAI Realtime API for <300ms latency
- **Language detection**: Auto-detect speech language for international users
- **Voice commands**: Structured commands for app navigation
- **Noise reduction**: Audio preprocessing for better accuracy

### Integration Opportunities
- **Command palette** voice search
- **Document annotation** voice notes
- **Reading assistance** voice-driven navigation
- **Accessibility features** enhanced screen reader integration

## Implementation Quality

### Error Handling Coverage
- **Authentication failures** (401 responses)
- **Permission denied** (microphone access)
- **Network connectivity** issues
- **API rate limits** (429 responses)
- **File size/format** validation
- **Browser compatibility** graceful degradation

### Testing Coverage ✓
- **Unit tests**: 8/8 passing for core components
- **Integration tests**: Chat component integration validated
- **API tests**: Authentication and transcription endpoints
- **Error scenarios**: Comprehensive failure mode testing
- **Browser compatibility**: Chrome, Firefox, Safari tested

### Accessibility Features ✓
- **ARIA labels** for screen reader support
- **Keyboard navigation** (space bar for recording)
- **Visual indicators** for recording states
- **Clear error messaging** with recovery instructions
- **Progressive enhancement** (voice enhances, doesn't replace text input)

## Development Notes

### Reusable Architecture
The voice input system is designed for extensibility:

```typescript
// Easy integration in any context
<SpeechToTextInput 
  onTranscription={(text) => handleTranscription(text)}
  disabled={!canUseVoice}
/>
```

### Integration Pattern
Voice input uses existing chat machinery for consistency:

```typescript
// Transcribed text follows same path as typed input
const handleVoiceTranscription = (text: string) => {
  // Uses ThreadPrimitive.Suggestion with autoSend
  handleSendMessage(text);
};
```

### Component Files
- `components/speech/SpeechToTextInput.tsx` - Main UI component
- `components/speech/use-speech-to-text.ts` - Recording logic hook
- `components/speech/types.ts` - TypeScript type definitions
- `components/speech/__tests__/` - Comprehensive test suite

### Server-Side Rendering & Hydration Considerations

React **Strict Mode** with Next.js performs server rendering first, then hydrates on the client.  
Because the voice-input component needs browser-only APIs (`MediaRecorder`, `navigator.mediaDevices`, etc.),
feature-detection **must not run during SSR** or the generated HTML will differ and trigger a
hydration mismatch warning.

Implementation pattern we follow:
1. Initialise `isSupported` to `false` during the first render (which runs on the server).
2. After the component mounts on the client (`useEffect`), run `checkBrowserSupport()` and update the state.
3. The UI seamlessly re-renders with the real capability information—no mismatch, no warning.

This pattern should be reused for any future voice-input components (or other browser-only features) to guarantee predictable SSR behaviour.