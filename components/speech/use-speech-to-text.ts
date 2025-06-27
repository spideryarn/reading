'use client';

/**
 * Custom hook for speech-to-text functionality using MediaRecorder API
 * 
 * Provides audio recording, transcription via OpenAI Whisper API, and
 * comprehensive error handling with browser compatibility detection.
 * 
 * Features:
 * - MediaRecorder API integration with format fallback
 * - Permission handling for microphone access
 * - Audio processing and API transcription
 * - Proper resource cleanup and error handling
 * - Support for both click-to-toggle and hold-to-record modes
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { SpeechToTextState, SpeechToTextResponse, RecordingConfig } from './types';

interface UseSpeechToTextReturn {
  state: SpeechToTextState;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  toggleRecording: () => Promise<void>;
  clearError: () => void;
}

/**
 * Detect the best supported MIME type for MediaRecorder
 */
function getSupportedMimeType(): string {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/mpeg',
    'audio/wav'
  ];
  
  for (const type of types) {
    if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  
  // Fallback - modern browsers should support this
  return 'audio/webm';
}

/**
 * Check if speech-to-text is supported in the current browser
 */
function checkBrowserSupport(): boolean {
  return !!(
    navigator?.mediaDevices?.getUserMedia &&
    window.MediaRecorder &&
    typeof MediaRecorder.isTypeSupported === 'function'
  );
}

/**
 * Convert audio blob to appropriate format for API
 */
function prepareAudioForUpload(blob: Blob, mimeType: string): Blob {
  // If already in a supported format, use as-is
  const supportedTypes = ['audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/mp4'];
  if (supportedTypes.includes(blob.type) || supportedTypes.includes(mimeType)) {
    return blob;
  }
  
  // Create blob with supported type
  return new Blob([blob], { type: mimeType });
}

export function useSpeechToText(
  onTranscription: (text: string) => void,
  onError?: (error: string) => void
): UseSpeechToTextReturn {
  const [state, setState] = useState<SpeechToTextState>({
    isRecording: false,
    isProcessing: false,
    error: null,
    isSupported: checkBrowserSupport(),
    hasPermission: null
  });

  // Refs for MediaRecorder and audio stream
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  /**
   * Update state helper
   */
  const updateState = useCallback((updates: Partial<SpeechToTextState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Handle errors with consistent logging and callbacks
   */
  const handleError = useCallback((error: string, context?: { [key: string]: any }) => {
    const logEntry = {
      component: 'SpeechToText',
      error,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      isSupported: state.isSupported,
      hasPermission: state.hasPermission
    };
    
    console.warn('[SpeechToText]', error, logEntry);
    updateState({ error, isRecording: false, isProcessing: false });
    onError?.(error);
  }, [updateState, onError, state.isSupported, state.hasPermission]);

  /**
   * Clean up audio resources
   */
  const cleanup = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
  }, []);

  /**
   * Request microphone permission and initialize MediaRecorder
   */
  const initializeRecording = useCallback(async (): Promise<MediaRecorder> => {
    if (!state.isSupported) {
      throw new Error('Speech-to-text is not supported in this browser');
    }

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      });

      streamRef.current = stream;
      updateState({ hasPermission: true, error: null });

      // Create MediaRecorder with best supported format
      const mimeType = getSupportedMimeType();
      const config: RecordingConfig = {
        mimeType,
        audioBitsPerSecond: 128000,
        maxDuration: 60000 // 60 seconds max
      };

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: config.mimeType,
        audioBitsPerSecond: config.audioBitsPerSecond
      });

      // Reset audio chunks
      audioChunksRef.current = [];

      // Handle data collection
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Handle recording completion
      mediaRecorder.onstop = async () => {
        updateState({ isRecording: false, isProcessing: true });
        
        try {
          if (audioChunksRef.current.length === 0) {
            throw new Error('No audio data recorded');
          }

          // Create audio blob
          const audioBlob = new Blob(audioChunksRef.current, { type: config.mimeType });
          const processedBlob = prepareAudioForUpload(audioBlob, config.mimeType);

          // Upload for transcription
          await transcribeAudio(processedBlob);
        } catch (error) {
          handleError(error instanceof Error ? error.message : 'Failed to process recording');
        } finally {
          cleanup();
        }
      };

      // Handle recording errors
      mediaRecorder.onerror = (event) => {
        const error = (event as any).error;
        handleError(`Recording failed: ${error?.message || 'Unknown error'}`);
        cleanup();
      };

      mediaRecorderRef.current = mediaRecorder;
      return mediaRecorder;

    } catch (error) {
      updateState({ hasPermission: false });
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          const permissionError = new Error('Microphone permission denied. Please allow microphone access and try again.');
          (permissionError as any).context = { errorName: error.name, errorType: 'permission' };
          throw permissionError;
        } else if (error.name === 'NotFoundError') {
          const micError = new Error('No microphone found. Please connect a microphone and try again.');
          (micError as any).context = { errorName: error.name, errorType: 'hardware' };
          throw micError;
        } else if (error.name === 'NotSupportedError') {
          const supportError = new Error('Audio recording not supported in this browser.');
          (supportError as any).context = { errorName: error.name, errorType: 'browserSupport' };
          throw supportError;
        }
      }
      
      const genericError = new Error('Failed to access microphone. Please check permissions and try again.');
      (genericError as any).context = { errorType: 'microphoneAccess', originalError: error };
      throw genericError;
    }
  }, [state.isSupported, updateState, handleError, cleanup]);

  /**
   * Upload audio to transcription API
   */
  const transcribeAudio = useCallback(async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch('/api/speech-to-text', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        
        // Create error with status information for better handling
        const error = new Error(errorMessage);
        (error as any).status = response.status;
        throw error;
      }

      const data: SpeechToTextResponse = await response.json();

      if (!data.success || !data.text) {
        throw new Error(data.error || 'Transcription failed');
      }

      // Clear processing state and call success callback
      updateState({ isProcessing: false, error: null });
      onTranscription(data.text.trim());

    } catch (error) {
      updateState({ isProcessing: false });
      
      if (error instanceof Error) {
        // Handle specific API errors based on status code first, then message
        const status = (error as any).status;
        
        if (status === 401 || error.message.includes('401')) {
          handleError('Authentication required. Please log in and try again.', { 
            httpStatus: status, 
            apiEndpoint: '/api/speech-to-text',
            errorType: 'authentication'
          });
        } else if (status === 429 || error.message.includes('429')) {
          handleError('Rate limit exceeded. Please wait a moment and try again.', {
            httpStatus: status,
            apiEndpoint: '/api/speech-to-text',
            errorType: 'rateLimit'
          });
        } else if (status === 413 || error.message.includes('413')) {
          handleError('Recording too long. Please try a shorter recording.', {
            httpStatus: status,
            apiEndpoint: '/api/speech-to-text',
            errorType: 'fileSize'
          });
        } else if (error.message.includes('Network') || error.name === 'NetworkError') {
          handleError('Network error. Please check your connection and try again.', {
            errorType: 'network',
            errorName: error.name
          });
        } else {
          handleError(`Transcription failed: ${error.message}`, {
            httpStatus: status,
            errorType: 'api',
            originalMessage: error.message
          });
        }
      } else {
        handleError('Failed to transcribe audio. Please try again.');
      }
    }
  }, [updateState, handleError, onTranscription]);

  /**
   * Start audio recording
   */
  const startRecording = useCallback(async () => {
    if (state.isRecording || state.isProcessing) {
      return;
    }

    try {
      updateState({ error: null });
      const mediaRecorder = await initializeRecording();
      
      mediaRecorder.start(1000); // Collect data every second
      updateState({ isRecording: true });
      
    } catch (error) {
      const context = error instanceof Error ? (error as any).context : undefined;
      handleError(error instanceof Error ? error.message : 'Failed to start recording', context);
    }
  }, [state.isRecording, state.isProcessing, updateState, initializeRecording, handleError]);

  /**
   * Stop audio recording
   */
  const stopRecording = useCallback(async () => {
    if (!state.isRecording || !mediaRecorderRef.current) {
      return;
    }

    try {
      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    } catch (error) {
      handleError('Failed to stop recording');
      cleanup();
    }
  }, [state.isRecording, handleError, cleanup]);

  /**
   * Toggle recording state
   */
  const toggleRecording = useCallback(async () => {
    if (state.isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  }, [state.isRecording, startRecording, stopRecording]);

  /**
   * Clear current error
   */
  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    state,
    startRecording,
    stopRecording,
    toggleRecording,
    clearError
  };
}