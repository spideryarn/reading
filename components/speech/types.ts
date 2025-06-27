/**
 * Types for Speech-to-Text components
 * 
 * Defines interfaces for state management and component props
 * for reusable voice input functionality.
 */

export interface SpeechToTextState {
  /** Whether audio is currently being recorded */
  isRecording: boolean;
  /** Whether audio is being processed/transcribed */
  isProcessing: boolean;
  /** Current error message, null if no error */
  error: string | null;
  /** Whether speech recognition is supported in browser */
  isSupported: boolean;
  /** Whether microphone permission has been granted (null = not requested) */
  hasPermission: boolean | null;
  /** Current permission state from Permissions API */
  permissionState: 'granted' | 'denied' | 'prompt' | 'unknown';
}

export interface SpeechToTextInputProps {
  /** Callback fired when transcription is complete */
  onTranscription: (text: string) => void;
  /** Optional callback for error handling */
  onError?: (error: string) => void;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Additional CSS classes for styling */
  className?: string;
}

/**
 * API response format from /api/speech-to-text endpoint
 */
export interface SpeechToTextResponse {
  success: boolean;
  text?: string;
  error?: string;
}

/**
 * Recording configuration options
 */
export interface RecordingConfig {
  /** Audio format constraints for MediaRecorder */
  mimeType: string;
  /** Sample rate for audio recording */
  audioBitsPerSecond?: number;
  /** Maximum recording duration in milliseconds */
  maxDuration?: number;
}