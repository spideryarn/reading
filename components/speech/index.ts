/**
 * Speech component exports
 * 
 * Centralizes exports for speech-related components
 */

// Export the new react-media-recorder based component
export { VoiceInputRecorder } from './voice-input-recorder';
export type { SpeechToTextInputProps, SpeechToTextResponse } from './types';

// Temporary alias for backward compatibility during migration
export { VoiceInputRecorder as SpeechToTextInput } from './voice-input-recorder';